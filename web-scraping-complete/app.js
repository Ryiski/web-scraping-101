const express = require('express');
const path = require('path');
const exphbs  = require('express-handlebars');
const fetch = require('node-fetch');
const cheerio = require('cheerio')
const fs = require('fs');
const url = require('url');
const data = require('./data.json');

const app = express();
const PORT = process.env.PORT || 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/* GET home page. */
app.get('/', function(req, res) {
  res.render('home.handlebars', { data });
});

app.post('/get-preview',async (req, res) => {

  const { previewUrl, id } = req.body;
  
  try{

    const resp = await fetch(previewUrl);
    const html = await resp.text();
    const $ = cheerio.load(html);

    const getMetatag = (name) =>  {
      return(
        $(`meta[name=${name}]`).attr('content') ||  
        $(`meta[name="og:${name}"]`).attr('content') ||  
        $(`meta[name="twitter:${name}"]`).attr('content')
      )
    }

    const metaTags = {
      id,
      url: previewUrl,
      domain: url.parse(previewUrl).hostname,
      title: getMetatag('title') || $(`h1`).text(),
      img: getMetatag('image') || './images/no-image.png',
      description: getMetatag('description') || $(`p`).text() || 'No description available',
    }

    let { description } = metaTags;

    // avoiding description to be more then 200 chars
    if(description.length > 200){
      metaTags.description = description.substring(0,200) + '...';
    }

    // add to start of array
    data.unshift(metaTags);

    // rewrite new data array to data.json
    fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));
    
    // respond back with the new added data
    res.status(201).json(data.shift());
    

  }catch(err){

    console.log(err);
    res.status(400).end();
    
  }
});

app.post('/remove/:id', (req, res) => {

  const id = req.params.id;

  // array of ids from data.json
  const dataIds = data.map(d => d.id);

  // index of the data in the data.json array
  const index = dataIds.indexOf(id);

  // remove data from list
  data.splice(index,1);

  // rewrite new data array to data.json
  fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));

  res.status(200).end();
})





app.listen(PORT,() => console.log(`Server running on http://localhost:${PORT}/`));