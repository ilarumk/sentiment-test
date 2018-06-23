const express = require('express');
const bodyParser = require('body-parser');
//const config = require('./config');
const hbs = require('express-hbs');
const path = require('path');
// Imports the Google Cloud client library
const BigQuery = require('@google-cloud/bigquery');
const bq = new BigQuery();
const dataset = bq.dataset('optreviews');
const table = dataset.table('sentiments');

const app = express();

app.engine('hbs', hbs.express4({
  partialsDir: __dirname + '/views/partials'
}));

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views/layout');
app.use(express.static(path.join(__dirname, 'public')));


app.get('/total', function(req, res, next) {
    app.use(bodyParser.json());
    query = 'SELECT count(emotion) as total FROM `optreviews.sentiments`';
    bq.createQueryStream(query)
      .on('error', console.error)
      .on('data', function(row) {
        res.json(row);
      })
      .on('end', function() {
        // All rows retrieved.
    });
});



app.get('/sentiments', function(req, res, next) {
    app.use(bodyParser.json());
    query = 'SELECT emotion,count(emotion) as count FROM optreviews.sentiments group by emotion order by count desc;';
    var dataFromBigQuery = [];
    bq.createQueryStream(query)
    .on('error', console.error)
    .on('data', function(row) {
        dataFromBigQuery.push(
          {
              emotion: row.emotion,
              count: row.count
          }
        );
    })
    .on('end', function() {
      res.send(dataFromBigQuery);
    });
});


app.get('/entries', function(req, res, next) {
    app.use(bodyParser.json());
    query = 'SELECT text, score, magnitude, emotion FROM optreviews.sentiments limit 10;';
    var dataFromBigQuery = [];
    bq.createQueryStream(query)
    .on('error', console.error)
    .on('data', function(row) {
        dataFromBigQuery.push(
          {
              text: row.text,
              score: row.score,
              magnitude: row.magnitude,
              emotion: row.emotion
          }
        );
    })
    .on('end', function() {
      res.send(dataFromBigQuery);
    });
});

//app.get('/', getTotal, getEmotions, renderData);


app.get('/', function(req, res, next) {
    res.render('index');
  });

app.listen(3000, () => console.log('Example app listening on port 3000!'))