// dependencies
var Api = require ("../apis/api")
  , ObjectId = require ("mongodb").ObjectID
  ;

/**
 *  This function validates the post data and
 *  returns true if data is valid
 *
 */
function validateFormData (operation, data, link) {

    // operation validators
    var validators = {

        // template names
        _validTypes: ["map", "marker", "infowin", "icon"]
      , _validateObject: function (obj, name) {

            // validate data
            if (!obj || obj.constructor !== Object) {
                return link.send (400, name + " must be an object.");
            }

            return true;
        }

        /*
         *  Create operation validator
         * */
      , create: function () {

            // type
            if (!data.type || data.type.constructor !== String) {
                return link.send (400, "type field must be a non empty string.");
            }

            // validate type
            if (validators._validTypes.indexOf(data.type) === -1) {
                return link.send (400, "Invalid type.");
            }

            // validate data
            return validators._validateObject (data.data, "Data");
        }

        /*
         *  Read operation validator
         * */
      , read: function () {

            // validate query
            return validators._validateObject (data.query, "Query");
        }

        /*
         *  Update operation validator
         * */
      , update: function () {

            // type
            if (!data.type || data.type.constructor !== String) {
                return link.send (400, "type field must be a non empty string.");
            }

            // validate type
            if (validators._validTypes.indexOf(data.type) === -1) {
                return link.send (400, "Invalid type.");
            }

            // validate query and data
            if (validators._validateObject (data.query, "Query") === true) {
                return validators._validateObject (data.data, "Data");
            }

            return true;
        }

        /*
         *  Delete operation validator
         * */
      , delete: function () {

            // type
            if (!data.type || data.type.constructor !== String) {
                return link.send (400, "type field must be a non empty string.");
            }

            // validate type
            if (validators._validTypes.indexOf(data.type) === -1) {
                return link.send (400, "Invalid type.");
            }

            // validate query
            if (!data.query || data.query.constructor !== Object) {
                return link.send (400, "Query must be an object.");
            }

            return true;
        }
      , embed: function () {

            // validate map id
            if (!data.mapId || data.mapId.constructor !== String) {
                return link.send (400, "Missing or invalid map id.");
            }

            return true;
        }
    }

    // is the user logged in?
    if (operation !== "embed") {
        if (!link.session || !link.session.userId || !link.session.userId.toString()) {
            return link.session (403, "You are not logged in.");
        }
    }

    // call validators
    if (validators[operation]() === true) {

        // add owner types
        switch (operation) {
            case "create":
                data.data.owner = link.session.userId.toString();
                return true;
            case "read":
                data.query.owner = link.session.userId.toString();
                return true;
            case "update":

                // no $set operator
                if (!data.data.$set) {
                    data.data.$set = data.data;
                }

                // _id provided, but is a string
                if (data.query._id && data.query._id.constructor === String) {
                    data.query._id = ObjectId (data.query._id);
                }

                data.query.owner = link.session.userId.toString();
                return true;
            case "delete":
                data.query.owner = link.session.userId.toString();
                return true;
            case "embed":
                return true;
            default:
                link.send (200, "Invalid operation");
                return false;
        }
    }
}

/**
 *  This function is called when the response
 *  from CRUD comes
 *
 * */
function handleResponse (link, err, data) {

    // handle error
    if (err) {
        return link.send (400, err);
    }

    // send success
    link.send (200, data);
}

/**
 *  mono-maps#create
 *  Create a new map/marker/infowin/icon
 *
 */
exports.create = function (link) {

    // get data, params
    var data = Object(link.data);

    // validate data
    if (validateFormData ("create", data, link) !== true) {
        return;
    }

    // create map, marker, infowindow or icon
    Api[data.type].create ({
        data: data.data
    }, function (err, data) {
        handleResponse (link, err, data);
    });
};

/**
 *  mono-maps#read
 *  Read maps/markers/infowins/icons
 *
 */
exports.read = function (link) {

    // get data
    var data = Object(link.data);

    // validate data
    if (validateFormData ("read", data, link) !== true) {
        return;
    }

    // read map
    Api[data.type].read ({
        query: data.query
      , noJoins: true
    }, function (err, data) {
        handleResponse (link, err, data);
    });
};

/**
 *  mono-maps#update
 *  Update a map/marker/infowin/icon
 *
 */
exports.update = function (link) {

    // get data
    var data = Object (link.data);

    // validate data
    if (validateFormData ("update", data, link) !== true) {
        return;
    }

    // create map, marker, infowindow or icon
    Api[data.type].update ({
        query: data.query
      , data: data.data
    }, function (err, data) {
        handleResponse (link, err, data);
    });
};

/**
 *  mono-maps#delete
 *  Delete a map
 *
 */
exports.delete = function (link) {

    // get data
    var data = Object (link.data);

    // validate data
    if (validateFormData ("delete", data, link) !== true) {
        return;
    }

    // create map, marker, infowindow or icon
    Api[data.type].delete ({
        query: data.query
    }, function (err, data) {
        handleResponse (link, err, data);
    });
};

/**
 *  mono-maps#embed
 *  Embeds a map
 *
 */
exports.embed = function (link) {

    // get data, params
    var data = Object (link.data);

    // validate data
    if (validateFormData ("embed", data, link) !== true) {
        return;
    }

    try {
        data.mapId = ObjectId (data.mapId)
    } catch (e) {
        return handleResponse (link, "Invalid map id.");
    }

    // read map
    Api.map.read ({
        query: {
            _id: data.mapId
        }
    }, function (err, data) {


        // handle crud errors
        if (err) {
            console.error (err);
            err = "Internal server error.";
        // no maps
        } else if (!data || !data.length) {
            err = "No map found with this id.";
        }

        if (err) {
            return handleResponse (link, err, map);
        }

        // TODO This should be fixed in CRUD.
        // get map
        var map = data[0]
          , markers = map.markers || []
          , howManyRequests = 0
          , complete = 0
          ;

        function handleComplete () {
            if (++complete === howManyRequests) {
                handleResponse (link, err, map);
            }
        }

        // each marker
        for (var i = 0; i < markers.length; ++i) {
            (function (cMarker) {

                // icon
                if (cMarker.icon) {
                    ++howManyRequests;
                    Api.icon.read ({
                        query: {
                            _id: cMarker.icon
                        }
                    }, function (err, data) {

                        if (err) {
                            console.error (err);
                            delete cMarker.icon;
                        } else if (!data || !data.length) {
                            delete cMarker.icon;
                        }

                        cMarker.icon = data[0];

                        handleComplete();
                    });
                }

                // infowin
                if (cMarker.infowin) {
                    ++howManyRequests;
                    Api.infowin.read ({
                        query: {
                            _id: cMarker.infowin
                        }
                    }, function (err, data) {

                        if (err) {
                            console.error (err);
                            delete cMarker.infowin;
                        } else if (!data || !data.length) {
                            delete cMarker.infowin;
                        }

                        cMarker.infowin = data[0];
                        handleComplete();
                    });
                }
            })(markers[i]);
        }

        // no other requests
        if (!howManyRequests) {
            handleResponse (link, err, map);
        }
    });
};
