// dependencies
var CRUD = require ("./crud")
  , ObjectId = require ("mongodb").ObjectID
  , templates = [
        {
            name: "map"
          , id: "534ffc85f607d65614ad00e4"
        }
      , {
            name: "marker"
          , id:   "534ffe16f607d65614ad00e5"
        }
      , {
            name: "infowin"
          , id: "534ffe16f607d65614ad00e6"
        }
      , {
            name: "icon"
          , id: "534fffd7f607d65614ad00f7"
        }
    ]
  ;

/*
 *  Function generator for APIS
 *
 * */
function generateApiSet (templateId) {
    return {
        create: function (options, callback) {

            // force data to be an object and attach _tp field
            options.data = Object (options.data);
            options.data._tp = [ ObjectId (templateId) ];

            CRUD.create ({
                templateId: templateId
              , data: options.data
              , options: options.options
              , callback: callback
            });
        }
      , read: function (options, callback) {
            CRUD.read ({
                templateId: templateId
              , noJoins: options.noJoins
              , query: options.query
              , options: options.options
              , callback: callback
            });
        }
      , update: function (options, callback) {
            CRUD.update ({
                templateId: templateId
              , query: options.query
              , data: options.data
              , options: options.options
              , callback: callback
            });
        }
      , delete: function (options, callback) {
            CRUD.delete ({
                templateId: templateId
              , query: options.query
              , options: options.options
              , callback: callback
            });
        }
    };
};

// this object will be exported
var Api = {};

// each template
for (var i = 0; i < templates.length; ++i) {

    // get the current template
    var cTemplate = templates[i];

    // generate methods for this template
    Api[cTemplate.name] = generateApiSet (cTemplate.id);
}

// exports the module
module.exports = Api;
