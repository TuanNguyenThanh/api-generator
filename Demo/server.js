// Dependencies
const express = require('express');
const app = express();
const expressSwagger = require('express-swagger-generator')(app);
const mongoose = require('mongoose');
const logger = require('morgan');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const homeRoute = require('./api/routes/homeRoute');

const postsRoute = require('./api/routes/postsRoute');
const commentsRoute = require('./api/routes/commentsRoute');

// Load dotenv variables
dotenv.load();

//express swagger documents
let options = {
  swaggerDefinition: {
      info: {
          description: 'Documents api',
          title: 'Documents',
          version: '0.0.2',
      },
      host: 'localhost:2308',
      basePath: '',
      produces: [
          "application/json",
          "application/xml"
      ],
      schemes: ['http', 'https'],
  securityDefinitions: {
          JWT: {
              type: 'apiKey',
              in: 'header',
              name: 'Authorization',
              description: "",
          }
      }
  },
  basedir: __dirname, //app absolute path
  files: ['./api/routes/*.js'] //Path to the API handle folder
};

expressSwagger(options)
// Define PORT
const PORT = process.env.PORT || 2308;

// Connect to Database
mongoose.connect('mongodb://Test123:Test123@ds145299.mlab.com:45299/dbtest123', { useNewUrlParser: true });

// Use body parser to parse post requests
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Logger middleware
app.use(logger('dev'));

// Use Routes
app.use('/', homeRoute);
app.use('/posts', postsRoute);
app.use('/comments', commentsRoute);

// Listen for HTTP Requests
app.listen(PORT, () => {
  console.log('Server running is port ' + PORT);
});
