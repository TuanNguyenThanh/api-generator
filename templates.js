const pjson = require('./package.json');

const packageTemplate = (appName) => {
  return (
`{
  "name": "${appName}",
  "version": "1.0.0",
  "description": "${appName}",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "echo 'Error: no test specified' && exit 1"
  },
  "author": "node-init",
  "license": "ISC",
  "dependencies": {
    "body-parser": "*",
    "dotenv": "*",
    "express": "*",
    "mongoose": "*",
    "morgan": "*",
    "express-swagger-generator": "*"
  }
}`
  );
}

const serverjsTemplate = (mongoURL,models,port) => {
  let rs = getRoutesDependencies(models);
  let useRoutes = getUseRoutes(models);
  return (
`// Dependencies
const express = require('express');
const app = express();
const expressSwagger = require('express-swagger-generator')(app);
const mongoose = require('mongoose');
const logger = require('morgan');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const homeRoute = require('./api/routes/homeRoute');

${rs}
// Load dotenv variables
dotenv.load();

//express swagger documents
let options = {
  swaggerDefinition: {
      info: {
          description: 'Documents api',
          title: 'Documents',
          version: '${pjson.version}',
      },
      host: 'localhost:${port}',
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
const PORT = process.env.PORT || ${port};

// Connect to Database
mongoose.connect('${mongoURL}', { useNewUrlParser: true });

// Use body parser to parse post requests
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Logger middleware
app.use(logger('dev'));

// Use Routes
app.use('/', homeRoute);
${useRoutes}
// Listen for HTTP Requests
app.listen(PORT, () => {
  console.log('Server running is port ' + PORT);
});
`
  );
}

const controllerTemplate = model => {
  return (
    `// Dependencies
const { ${capitalizeFirst(model)} } = require('./../models/${model}Model');
const { ObjectId } = require('mongodb');

// Get All ${model}
const getAll${capitalizeFirst(model)} = callback => {
  ${capitalizeFirst(model)}.find({}, (err, success) => {
    return callback(err, success);
  })
}

// Get A Particular ${model}
const get${capitalizeFirst(model)} = (${model}Id, callback) => {
  if(!ObjectId.isValid(${model}Id))
    return callback('Invalid ${model} Id', 400, null);
  
  ${capitalizeFirst(model)}.findOne({_id: ${model}Id}, (err, data) => {
    if(err)
      return callback(err, 500, null);
    else if(!data)
      return callback('${capitalizeFirst(model)} Not Found', 404, null);
    else
      return callback(null, 200, data);
  });
}

// Add a ${model}
const add${capitalizeFirst(model)} = (data, callback) => {
  let ${model} = new ${capitalizeFirst(model)}(data);

  ${model}.save((err, success) => {
    if(err)
      return callback(err, 500, null);
    else
      return callback(null, 200, success);
  });
}

// Modify a ${model}
const modify${capitalizeFirst(model)} = (${model}Id, data, callback) => {
  if(!ObjectId.isValid(${model}Id))
    return callback('Invalid ${capitalizeFirst(model)} Id', 400, null);
  
  ${capitalizeFirst(model)}.findOne({_id: ${model}Id}, (err, success) => {
    if(err)
      return callback(err, 500, null);
    else if(!success)
      return callback('${capitalizeFirst(model)} Not Found', 404, null);
    else{
      ${capitalizeFirst(model)}.update({_id: ${model}Id}, data, (err, success) => {
        if(err)
          return callback(err, 500, null);
        else
          return callback(null, 200, success);
      });
    }
  });
}

// Delete a ${model}
const delete${capitalizeFirst(model)} = (${model}Id, callback) => {
  if(!ObjectId.isValid(${model}Id))
    return callback('Invalid ${capitalizeFirst(model)} Id', 400, null);
  
  ${capitalizeFirst(model)}.findOne({_id: ${model}Id}, (err, success) => {
    if(err)
      return callback(err, 500, null);
    else if(!success)
      return callback('${capitalizeFirst(model)} Not Found', 404, null);
    else{
      ${capitalizeFirst(model)}.remove({_id: ${model}Id}, (err, success) => {
        if(err)
          return callback(err, 500, null);
        else
          return callback(null, 200, success);
      })
    }
  })
}

module.exports = {
  getAll${capitalizeFirst(model)},
  get${capitalizeFirst(model)},
  add${capitalizeFirst(model)},
  modify${capitalizeFirst(model)},
  delete${capitalizeFirst(model)}
}
    `
  );
}

const homeRouteTemplate = () => {
  return (
    `// Dependencies
const express = require('express');
const router = express.Router();

// Enable CORS
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept, X-Access-Token, X-Key");
  next();
});

/**
 * @route GET /
 * @group Home
 * @returns {string} get api version
 */

router.get('/', (req, res, next) => {
  res.send('API running version ${pjson.version}');
});

module.exports = router;
    `
  );
}

const routesTemplate = (model, attributes, types) => {
  let modelDefinitions = ` * @typedef ${capitalizeFirst(model)}
`;
  for (var i=0;i<attributes.length;i++){
    modelDefinitions += 
` * @property {${swaggerType(types[i])}} ${attributes[i]}.required
`
};  
  return (
    `// Dependencies
const express = require('express');
const router = express.Router();
const ${model}Controller = require('./../controllers/${model}Controller');

// Enable CORS
router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept, X-Access-Token, X-Key");
  next();
});

/**
${modelDefinitions} */

/**
 * @route GET /${model}
 * @group ${capitalizeFirst(model)}
 * @returns {Array.<${capitalizeFirst(model)}>} get all ${model}
 */

// GET '/${model}' Route to get all ${model}
router.get('/', (req, res, next) => {
  ${model}Controller.getAll${capitalizeFirst(model)}((err, success) => {
    if(err)
      res.status(500).json({err: err, data: null});
    else
      res.status(200).json({err: null, data: success});
  });
});

/**
 * @route GET /${model}/{${model}Id}
 * @group ${capitalizeFirst(model)}
 * @param {string} ${model}.path.required 
 * @returns {Array.<${capitalizeFirst(model)}>} get all ${model}
 */

// GET '/${model}/:${model}Id' Route to get a particular ${model}
router.get('/:${model}Id', (req, res, next) => {
  ${model}Controller.get${capitalizeFirst(model)}(req.params.${model}Id, (err, status, data) => {
    res.status(status).json({err: err, data: data});
  });
});

/**
 * @route POST /${model}
 * @group ${capitalizeFirst(model)}
 * @param {${capitalizeFirst(model)}.model} ${model}.body.required
 * @returns {Array.<${capitalizeFirst(model)}>} post a  ${model}
 */

// POST '/${model}' Route to add new ${model}
router.post('/', (req, res, next) => {
  ${model}Controller.add${capitalizeFirst(model)}(req.body, (err, status, data) => {
    res.status(status).json({err: err, data: data});
  });
});

/**
 * @route PUT /${model}/{${model}Id}
 * @group ${capitalizeFirst(model)}
 * @param {string} ${model}Id.path.required 
 * @param {${capitalizeFirst(model)}.model} ${model}.body.required
 * @returns {Array.<${capitalizeFirst(model)}>} get one ${model}
 */

// PUT '/${model}/:${model}Id' Route to modify ${model}
router.put('/:${model}Id', (req, res, next) => {
  ${model}Controller.modify${capitalizeFirst(model)}(req.params.${model}Id, req.body, (err, status, data) => {
    res.status(status).json({err: err, data: data});
  });
});

/**
 * @route DELETE /${model}/{${model}Id}
 * @group ${capitalizeFirst(model)}
 * @param {string} ${model}Id.path.required 
 * @returns {Array.<${capitalizeFirst(model)}>} get one {${model}
 */

// DELETE '/${model}/:${model}Id' Route to delete ${model}
router.delete('/:${model}Id', (req, res, next) => {
  ${model}Controller.delete${capitalizeFirst(model)}(req.params.${model}Id, (err, status, data) => {
    res.status(status).json({err: err, data: data});
  })
});

module.exports = router;
    `
  );
}

const modelsTemplate = (model, attributes, types) => {
  let schemaAttributes = '';
  for (var i=0;i<attributes.length;i++){
    schemaAttributes += 
` ${attributes[i]}: {
    type: ${types[i]},
    required: true,
  },
`
};  
  return (
    `// Dependencies
const mongoose = require('mongoose');

const ${model}Schema = new mongoose.Schema({
${schemaAttributes} createdAt: {
    type: Date,
    default: Date.now
  }
});
module.exports = {
  ${capitalizeFirst(model)} : mongoose.model('${capitalizeFirst(model)}', ${model}Schema),
}
    `
  );
}

//Loop all routes dependencies
//Lặp để lấy về tất cả routes dependencies
const getRoutesDependencies = (models) => {
  let routes = '';
  for(var i=3;i<models.length;i++)
    routes += `const ${models[i]}Route = require('./api/routes/${models[i]}Route');
`;
  return routes;
}

//Loop use all routes
//Lặp để dùng routes
const getUseRoutes = models => {
  let use = '';

  for(var i=3;i<models.length;i++)
    use += `app.use('/${models[i]}', ${models[i]}Route);
`;
  return use;
}

//Capitalize first character
//Viết hoa chữ cái đầu tiên
const capitalizeFirst = (word) => {
  return word[0].toUpperCase()+word.substr(1, word.length);
}

//Chuyển kiểu dữ liệu mongoose sang swagger
const swaggerType = (type) => {
  if(type == 'String') return 'string';
  if(type == 'Number') return 'integer';
}

module.exports = {
  packageTemplate,
  serverjsTemplate,
  controllerTemplate,
  homeRouteTemplate,
  routesTemplate,
  modelsTemplate
}