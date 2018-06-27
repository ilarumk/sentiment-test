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
const table = dataset.table('sentimentsx');

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
      id: 'sentimentsx',
      schema: 'TEXT, CREATED:TIMESTAMP, SCORE:FLOAT:, MAGNITUDE:FLOAT, EMOTION, ENTITY'
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

  var sentimentPromise = new Promise(function(resolve, reject) {
    client.analyzeSentiment({document: document})
      .then(results => {
      const sentences = results[0].sentences;
      //console.log(`Sentiments:`);
      sentences.forEach(sentence => {
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

        var row = {
          text: sentence.text.content,
          score: score,
          magnitude: magnitude,
          emotion: emotion_data
        };
        resolve(row);
      });
    });
  });

  var entityPromise = new Promise(function(resolve, reject) {
     var entityData = [];
     client.analyzeEntities({document: document})
          .then(results => {
            const entities = results[0].entities;
            entities.forEach(entity => {
              if (entity.type == 'PERSON') {
                  entityData.push({
                    'entityname': entity.name,
                    'entitytype': entity.type
                  })
              }
              
            });
            resolve(entityData);
          })
          .catch(err => {
            console.error('ERROR:', err);
       });
  });

  Promise.all([sentimentPromise, entityPromise])
        .then(function([sentimentResult, entityResult]) {
            //respond to client
            //console.log(entityResult);
            //if (!empty(entityResult[0]['entityname'])) { 
              sentimentResult['entity'] = entityResult[0]['entityname'];
            //}
            //console.log(sentimentResult);
             table.insert(sentimentResult)
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
        })
        .catch(function(error) {
            //catch an error generated from either request
  })
  console.log('-----');
  // Detects sentiment of entities in the document
});