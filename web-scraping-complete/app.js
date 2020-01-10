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

/*Post meta data*/
app.post('/get-preview',async (req, res) => {

  const { previewUrl, id } = req.body;
  
  const resp = await fetch(previewUrl);
  const html = await resp.text();
  const $ = cheerio.load(html);

  const getMetaTag = (name) =>  {
    return(
      $(`meta[name=${name}]`).attr('content') ||  
      $(`meta[name="og:${name}"]`).attr('content') ||  
      $(`meta[name="twitter:${name}"]`).attr('content') ||
      $(`meta[property=${name}]`).attr('content') ||  
      $(`meta[property="og:${name}"]`).attr('content') ||  
      $(`meta[property="twitter:${name}"]`).attr('content')
    )
  }

  const metaTagData = {
    id:id,
    url: previewUrl,
    domain: url.parse(previewUrl).hostname,
    title: getMetaTag('title') || $(`h1`).text(),
    img: getMetaTag('image') || './images/no-image.png',
    description: getMetaTag('description') || $(`p`).text() || 'No description available',
  }

  let { description } = metaTagData;

  // avoiding description to be more then 200 chars
  if(description.length > 200){
    metaTagData.description = description.substring(0,200) + '...';
  }

  // add to start of array
  data.unshift(metaTagData);

  // rewrite new data array to data.json
  fs.writeFile("./data.json", JSON.stringify(data, null, 2),()=>{
    
    // respond back with the new added data
    res.status(201).json(data.shift());

  });
});


app.post('/remove/:id', (req, res) => {

  const { id } = req.params.id;

  // index of the data to remove from data.json
  const indexOfId = data.map(dataId => dataId.id)
    .indexOf(id);

  // remove the data from list
  data.splice(indexOfId,1);

  // rewrite new data array to data.json
  fs.writeFile("./data.json", JSON.stringify(data, null, 2), () => (
    
    res.status(200).end()

  ));
});




app.listen(PORT,() => console.log(`Server running on http://localhost:${PORT}/`));