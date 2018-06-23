// Imports the Google Cloud client library
const language = require('@google-cloud/language');
// Imports the Google Cloud client library
const BigQuery = require('@google-cloud/bigquery');
// const storage = require('@google-cloud/storage')();
// const Datastore = require('@google-cloud/datastore');
const readline = require('readline');
const fs = require('fs');

var createNiceNumber = function(num){
  var x = parseInt(num);
  x = (num).toFixed(2);
  return x;
}

// Creates a client
const client = new language.LanguageServiceClient();
// Creates a client
const bq = new BigQuery({
});
const dataset = bq.dataset('optreviews');
const table = dataset.table('sentiments');

//If the dataset doesn't exist, let's create it.
dataset.exists(function(err, exists) {
  if(!exists){
    dataset.create({
      id: 'optreviews'
    }).then(function(data) {
      console.log("dataset created");
    });
  }
});

//If the table doesn't exist, let's create it.
//Note the schema that we will pass in.
table.exists(function(err, exists) {
  if(!exists){
    table.create({
      id: 'sentiments',
      schema: 'TEXT, CREATED:TIMESTAMP, SCORE:FLOAT:, MAGNITUDE:FLOAT, EMOTION'
    }).then(function(data) {
      console.log("table created");
    });
  }
});



const rl = readline.createInterface({
  input: fs.createReadStream('../data/training.txt')
});

let document;

rl.on('line', (line) => {
  //console.log('Line from file:', line);
  var item = line.split('\t');
  document = {
    content: item[1],
    language: 'en',
    type: 'PLAIN_TEXT',
  };
  // Detects sentiment of entities in the document
  client
    .analyzeSentiment({document: document})
    .then(results => {
      //console.log(results);
      const sentences = results[0].sentences;
      //const sentiment = results[0].documentSentiment;
      console.log(`Sentiments:`);
      sentences.forEach(sentence => {
        // console.log(` Text: ${sentence.text.content}`);
        // console.log(` Score: ${sentence.sentiment.score}`);
        // console.log(` Score: ${sentence.sentiment.magnitude}`);
        let emotion_data = 'Mixed';
        let score = createNiceNumber(sentence.sentiment.score);
        let magnitude = createNiceNumber(sentence.sentiment.magnitude);

        if (score >= 0.5 && magnitude >= 0.6) {
          emotion_data = 'Positive';
        }

        if (score <= -0.20 && magnitude >= 0.0) {
          emotion_data = 'Neutral';
        }

        if (score <= -0.50 && magnitude > 0.5) {
          emotion_data = 'Negative';
        }



        // if (score >= 0.1 && magnitude < 4.0) {
        //   emotion_data = 'Mixed';
        // }

        var row = {
          text: sentence.text.content,
          score: score,
          magnitude: magnitude,
          emotion: emotion_data
        };
        console.log(row);
        table.insert(row)
          .then(() => {
            console.log(`Inserted rows`);
          })
          .catch(err => {
            if (err && err.name === 'PartialFailureError') {
              if (err.errors && err.errors.length > 0) {
                console.log('Insert errors:');
                err.errors.forEach(err => console.error(err));
              }
            } else {
              console.error('ERROR:', err);
            }
          });
      });

      // const entities = results[0].entities;
      // entities.forEach(entity => {
      //   console.log(`  Text: ${document.content}`);
      //   console.log(`  Name: ${entity.name}`);
      //   console.log(`  Type: ${entity.type}`);
      //   console.log(`  Score: ${entity.sentiment.score}`);
      //   console.log(`  Magnitude: ${entity.sentiment.magnitude}`);
      // });
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
});