// processing status:

// -3 conversion failed
// -2 unsupported file type
// -1 upload failed

// 0 created upload object
// 1 uploaded object to s3
// 2 message added to upload queue
// 3 message received from upload queue
// 4 downloaded from s3
// 5 conversion okay
// 6 tiles made okay

// 7 image approved

// 10 image published


// Globals 
var map;
var tlpoint;
var brpoint;
var drawnItems;
var geojsonLayer;
var activeFigure;
var imageHeight;
var imageWidth;

var resetMap = function()
{
     map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
}

var zoomToGlobal = function(index)
{
  window.appModel.zoomTo(index);
}

var highlightMapGlobal = function(index)
{
    window.appModel.highlightMap(index);
}

var moveItemUpGlobal = function(index)
{
  window.appModel.moveItemUp(index);
}

var moveItemDownGlobal = function(index)
{
  window.appModel.moveItemDown(index);
}

var clearHighLightsGlobal = function()
{
    geojsonLayer.clearLayers();
}

var deleteViewAtIndexGlobal = function(index)
{
  window.appModel.deleteViewAtIndex(index);
}

$(window).resize(function() {
  $("#map").height(window.innerHeight - 100);
    $("#viewContainer").height(window.innerHeight - 540);


});

var loadMapFromFigureObject = function(figureobject)
{
    L.TileLayer.Common = L.TileLayer.extend({
        initialize: function (options) {
          L.TileLayer.prototype.initialize.call(this, this.url, options);
        }
    });

    L.Projection.NoWrap = {
        project: function (latlng) {
            return new L.Point(latlng.lng, latlng.lat);
        },

        unproject: function (point, unbounded) {
            return new L.LatLng(point.y, point.x, true);
        }
    };

    L.CRS.Direct = L.Util.extend({}, L.CRS, {
        code: 'Direct',
        projection: L.Projection.NoWrap,
        transformation: new L.Transformation(1, 0, 1, 0)
    });

    var useProxy = true;
    var ImagePropertiesPath;
    var tilepath;

    if (useProxy)
    {
        ImagePropertiesPath = figureobject.get("imagePropertiesLocation");
        tilepath = figureobject.get("tileLocation");
    }
    else
    {
        ImagePropertiesPath = figureobject.get("s3imagePropertiesLocation");
        tilepath = figureobject.get("s3tileLocation");
    }


    $.ajax({  
        type: "GET",  
        url: ImagePropertiesPath,  
        dataType: "xml",  
        success: parseXml  
    });



    function parseXml(xml) {

        $imgxml = $(xml).find("IMAGE_PROPERTIES");
        
        var height = $imgxml.attr("HEIGHT");
        var width = $imgxml.attr("WIDTH");    

        imageHeight = height;
        imageWidth = width;

        var maxRows = height / 256;
        var maxCols = width / 256;

        var maxLOD = Math.ceil(Math.log ( Math.max(width, height) / 256 ) / Math.log(2.0));

        $("#map").height(window.innerHeight - 100);
        $("#viewContainer").height(window.innerHeight - 540);


        map = new L.Map('map', {
            crs: L.CRS.Direct,
            center: new L.LatLng(0, 0),
            zoom: maxLOD,
            minZoom: 1,
            worldCopyJump: false,
            attributionControl: false
        });

        $('#activityView')
            .hide()  // hide it initially
            .ajaxStart(function() {
                $(this).show();
            })
            .ajaxStop(function() {
                $(this).hide();
            })
        ;

        var fullScreen = new L.Control.FullScreen(); 
        map.addControl(fullScreen);

        var MyControl = L.Control.extend({
            options: {
                position: 'topright'
            },

            _createButton: function (title, className, container, fn, context) {
              var link = L.DomUtil.create('a', className, container);
              link.href = '#';
              link.title = title;

              L.DomEvent
                .addListener(link, 'click', L.DomEvent.stopPropagation)
                .addListener(link, 'click', L.DomEvent.preventDefault)
                .addListener(link, 'click', fn, context);

              return link;
            },

            onAdd: function (map) {
                // create the control container with a particular class name
                var container = L.DomUtil.create('div', 'leaflet-control-draw');

                  this._createButton(
                    'reset zoom',
                    'leaflet-control-draw-zoom',
                    container,
                    resetMap,
                    window
                    // this.handlers.marker
                  );
                // ... initialize other DOM elements, add listeners, etc.

                return container;
            }
        });

        map.addControl(new MyControl());

        var drawControl = new L.Control.Draw({
            position: 'topleft',
            rectangle: {
                shapeOptions: {
                    color: '#0099ff',
                    opacity: 0.5,
                    weight: 2,
                    fillColor: '#0099ff',
                    fillOpacity: 0.2,
                    dashArray: "5, 5"
                }
            },
            polyline: false,
            circle: false,
            polygon: false,
            marker: false
        });
        map.addControl(drawControl);

        // map.setView(map.layerPointToLatLng(new L.Point(770, 600)), maxLOD, true); // bounds of container 1004/748
        map.setView(map.layerPointToLatLng(new L.Point($("#map").width(), $("#map").height())), maxLOD, true); // bounds of container 1004/748

        L.TileLayer.FigureZero = L.TileLayer.Common.extend({
        url: tilepath + "TileGroup0/{z}-{x}-{y}.jpg",
        options: {
                noWrap: true, 
                maxZoom: maxLOD
                }
        });

        var defaultLayer = new L.TileLayer.FigureZero;
        map.addLayer(defaultLayer);

        tlpoint = map.layerPointToLatLng(new L.Point(0, height));
        tlpoint.lat *= 0.1;

        brpoint = map.layerPointToLatLng(new L.Point(width, 0));
        brpoint.lng *= 0.1;

        map.fitBounds(new L.LatLngBounds(
            tlpoint, 
            brpoint
        ));

        drawnItems = new L.LayerGroup();
        // map.on('draw:poly-created', function (e) {
        //     drawnItems.clearLayers();
        //     drawnItems.addLayer(e.poly);
        // });
        map.on('draw:rectangle-created', function (e) {
            drawnItems.clearLayers();

            // EXPERIMENTAL edit polygon 
            // e.rect.editing.enable();
            // END EXPERIMENTAL

            drawnItems.addLayer(e.rect);
        });
        // map.on('draw:circle-created', function (e) {
        //     drawnItems.clearLayers();
        //     drawnItems.addLayer(e.circ);
        // });
        // map.on('draw:marker-created', function (e) {
        //     drawnItems.clearLayers();
        //     drawnItems.addLayer(e.marker);
        // });
        map.addLayer(drawnItems);

        window.appModel.addAllView();




    }

}



var layerToGeometry = function(layer) {
    var json, type, latlng, latlngs = [], i;

    if (L.Marker && (layer instanceof L.Marker)) {
        type = 'Point';
        latlng = LatLngToCoords(layer._latlng);
        return ({"type": type, "coordinates": latlng});

    } else if (L.Polygon && (layer instanceof L.Polygon)) {
        type = 'Polygon';
        latlngs = LatLngsToCoords(layer._latlngs, 1);
        return ({"type": type, "coordinates": [latlngs]});

    } else if (L.Polyline && (layer instanceof L.Polyline)) {
        type = 'LineString';
        latlngs = LatLngsToCoords(layer._latlngs);
        return ({"type": type, "coordinates": latlngs});
    }
}

var LatLngToCoords = function (LatLng, reverse) { // (LatLng, Boolean) -> Array
    var lat = parseFloat(reverse ? LatLng.lng : LatLng.lat),
        lng = parseFloat(reverse ? LatLng.lat : LatLng.lng);

    return [lng,lat];
}

var LatLngsToCoords = function (LatLngs, levelsDeep, reverse) { // (LatLngs, Number, Boolean) -> Array
    var coord,
        coords = [],
        i, len;

    for (i = 0, len = LatLngs.length; i < len; i++) {
        coord = levelsDeep ?
                LatLngToCoords(LatLngs[i], levelsDeep - 1, reverse) :
                LatLngToCoords(LatLngs[i], reverse);
        coords.push(coord);
    }

    return coords;
}

function onEachRectFeature(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.title) {

        var tlpoint = new L.LatLng(feature.geometry.coordinates[0][3][1], feature.geometry.coordinates[0][3][0]);
        var brpoint = new L.LatLng(feature.geometry.coordinates[0][1][1], feature.geometry.coordinates[0][1][0]);
    }
}

$(function() {

  Parse.$ = jQuery;
  Parse.initialize("nY5yXtyaq5zJ1TnCfGOBDa6vu9IX9WwhDJTxx6eu","2HnPlp2kBNpS66dsPdVHRlec1b8BVzKnbZc5XknC");

  var FigureObject = Parse.Object.extend("UploadObject",
  {
      initialize: function() {
        // console.log("initialized FZ object");
      },
      toggle: function() {
        // console.log("called Toggle");
      }
  });

  var FigureList = Parse.Collection.extend({
    model: FigureObject
  });

  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  var rectViewView = Parse.View.extend({

    tagName:  "div",
    template: _.template($('#view-template').html()),
    events: {},

    initialize: function() {
      _.bindAll(this, 'render');
    },

    render: function() {
      $(this.el).html(this.template(this.model));
      return this;
    }
  });

  // The Application
  // ---------------

  // The main view that lets a user manage their todo items
  var ManageTodosView = Parse.View.extend({

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "click #logoutButton": "logOut",
      "click #resetviewbutton" : "reloadImageView",
      "click #save-model-button" : "saveModelButtonClick",
      "click #save-next-button" : "nextViewButton",
      "click #add-view-button": "saveCurrentView",
      "click #reload-model-button": "reloadActiveFigure"
      // "click #approveFigure" : "approveFigure",
      // "click #conversionError" : "conversionError",
    },

    el: ".content",

    initialize: function() {
      var self = this;

      _.bindAll(this, 'render', 'logOut', 'moveItemUp', 'moveItemDown', 'reloadImageView', 'reloadActiveFigure', 'deleteViewAtIndex', 'zoomTo', 'highlightMap', 'saveCurrentView', 'addAllView', 'saveModelButtonClick', 'nextViewButton');

      this.$el.html(_.template($("#manage-todos-template").html()));      
      this.activeFigureID = $("#parseID").html();
      
      // this.activeFigure = new FigureObject();
      this.query = new Parse.Query(FigureObject); 

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {
          
          activeFigure = $.extend(true, {}, figureobject);
          var fojson = figureobject.toJSON();
          if (fojson.stat >= 7)
          {
            // $('#_filename').fadeOut(500, function() {
            //   $(this).text(fojson.originalFilename).fadeIn(500);
            // });

            // $('#_filesize').fadeOut(500, function() {
            //   $(this).text(fojson.originalFileSize + " bytes").fadeIn(500);
            // });

            // $('#_procstatus').fadeOut(500, function() {
            //   $(this).text(fojson.stat).fadeIn(500);
            // });

            // $('#_imagesize').fadeOut(500, function() {
            //   $(this).text(fojson.originalImageSize).fadeIn(500);
            // });

            loadMapFromFigureObject(figureobject);
            self.addAllView();
          }
        },
        error: function(object, error) {

          alert('figure not available - it may not be public');
          console.log(error);
          
        }
      });
    },
    reloadActiveFigure: function()
    {
      var self = this;

      // $('#activityView').show();

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {
          
          activeFigure = $.extend(true, {}, figureobject);
          var fojson = figureobject.toJSON();
          if (fojson.stat >= 7)
          {
            // $('#_filename').fadeOut(500, function() {
            //   $(this).text(fojson.originalFilename).fadeIn(500);
            // });

            // $('#_filesize').fadeOut(500, function() {
            //   $(this).text(fojson.originalFileSize + " bytes").fadeIn(500);
            // });

            // $('#_procstatus').fadeOut(500, function() {
            //   $(this).text(fojson.stat).fadeIn(500);
            // });

            // $('#_imagesize').fadeOut(500, function() {
            //   $(this).text(fojson.originalImageSize).fadeIn(500);
            // });

            self.addAllView();
          }

          // $('#activityView').fadeOut(500);
        },
        error: function(object, error) {

          // alert('figure not available - it may not be public');
          // $('#activityView').fadeOut(500);
          window.location = "/library";
          // console.log(error);
          
        }

      });

    },
    zoomTo: function(index)
    {
        var self = this;
        var regionObj = activeFigure.get('viewArray')[index];
        var tlpoint = new L.LatLng(regionObj.geometry.coordinates[1][3][1], regionObj.geometry.coordinates[1][3][0]);
        var brpoint = new L.LatLng(regionObj.geometry.coordinates[1][1][1], regionObj.geometry.coordinates[1][1][0]);   
        map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
    },
    highlightMap: function(index)
    {
      var self = this;
      var myStyle = {
            "color": "#000000",
            "weight": 2,
            "opacity": 0.8,
            "fillColor": "#000000",
            "fillOpacity": 0.75
      };

      geojsonLayer = L.geoJson(activeFigure.get('viewArray')[index], {
            style: myStyle,
            onEachFeature: onEachRectFeature
      }).addTo(map);

    },

    moveItemUp: function(index)
    {
      if(index > 0)
      {
        //dont touch top view
        activeFigure.get('viewArray')[index -1]= activeFigure.get('viewArray').splice(index, 1, activeFigure.get('viewArray')[ index -1 ])[0];

        geojsonLayer.clearLayers();

        this.addAllView();

        $('#save-model-button').removeClass("disabled");
      }
    },
    moveItemDown: function(index)
    {
      if(index < activeFigure.get('viewArray').length -1)
      {
        // don't touch if bottom view moving down
        activeFigure.get('viewArray')[index]= activeFigure.get('viewArray').splice(index + 1, 1, activeFigure.get('viewArray')[ index ])[0];
        geojsonLayer.clearLayers();
        this.addAllView();

        $('#save-model-button').removeClass("disabled");

      }

    },
    deleteViewAtIndex: function(index)
    {
      
      var r=confirm("Confirm delete of ROI #" + index);
      var self = this;
      if (r==true)
      {

          activeFigure.get('viewArray').splice(index,1);

          geojsonLayer.clearLayers();
          activeFigure.save({
            success: function(object) {
              console.log('save successful');
      
              $('#save-model-button').addClass("disabled");

            },
            error: function(object, error) {
            }
          });
          
        self.addAllView();

      }

    },
    nextViewButton: function(e)
    {

    },
    saveModelButtonClick: function(e)
    {

      if(! $('#save-model-button').hasClass("disabled") )
      {

          $('#activityView').show();

          activeFigure.save({
            
            success: function(object) {

              $('#activityView').fadeOut(500);
              $('#save-model-button').addClass("disabled");
              // console.log('save successful');
              // console.log(object);
              
            },

            error: function(object, error) {
                $('#activityView').fadeOut(500);
                // console.log(error);
                // alert('well shit');

            }
          });

      }
      else
      {
          // console.log('disabled');
      }

    },

    saveCurrentView: function(e)
    {

      var self = this;
      var view_title = this.$("#view-title").val();
      var view_description = this.$("#view-description").val();

      // var geom;
      var geojsonobj = {};

      if(view_title.length > 0)
      {

        drawnItems.eachLayer(function (layer) {        
          
          var currentBounds = new L.LatLngBounds(brpoint, tlpoint);

          var outerRect = [];
          outerRect.push([currentBounds._southWest.lat, currentBounds._southWest.lng]);
          outerRect.push([currentBounds._southWest.lat, currentBounds._northEast.lat]);
          outerRect.push([currentBounds._northEast.lng, currentBounds._northEast.lat]);
          outerRect.push([currentBounds._northEast.lng, currentBounds._southWest.lng]);
          outerRect.push([currentBounds._southWest.lat, currentBounds._southWest.lng]);

          geojsonobj.geometry = layerToGeometry(layer);
          geojsonobj.geometry.coordinates.unshift(outerRect);

          // brpoint: lat min, long max
          // tlpoint: lat max, long min
          var latdif = tlpoint.lat - brpoint.lat;
          var lngdif = brpoint.lng - tlpoint.lng;
          var blcood = geojsonobj.geometry.coordinates[1][0];
          var trcood = geojsonobj.geometry.coordinates[1][2];

          var realWidth = imageWidth * ((trcood[0] -  blcood[0] ) / lngdif);
          var realHeight = imageHeight * ((trcood[1] -  blcood[1]) / latdif);

          var realX = imageWidth* blcood[0] / lngdif;
          if(realX > imageWidth)
          {
            realX = imageWidth;
          }
          else if(realX < 0)
          {
            realX = 0;
          }

          var realY = imageHeight* blcood[1] / latdif;
          if(realY > imageHeight)
          {
            realY = imageHeight;
          }
          else if(realY < 0)
          {
            realY = 0;
          }

          var nativeArray = [realX, realY, realWidth, realHeight];        
          cutDict = {
            ipxml: activeFigure.get('imagePropertiesLocation'),
            path: activeFigure.get('localPath'),
            origin: [realX, realY],
            size: [realWidth, realHeight],

            output: [512, 512]
          }

          $.ajax({
              type: "POST",
              url: "/cut/",
              // The key needs to match your method's input parameter (case-sensitive).
              data: JSON.stringify(cutDict),
              contentType: "application/json; charset=utf-8",
              dataType: "json",
              success: function(data){
                
                

                propertyDict = {
                  title: view_title,
                  description: view_description,
                  nativeCoords: nativeArray,
                  thumburl: data.thumburl,
                  viewurl: data.viewurl,
                  qrURL: data.qrURL,
                  bitlyurl: data.bitlyurl
                };



                var viewThumb = 'http://figurezero.com/' + data.thumburl
                
                geojsonobj.properties = propertyDict;
                geojsonobj.type = 'Feature';
                
                activeFigure.get('viewArray').push(geojsonobj);
        
                activeFigure.save({
                  success: function(object) {
                    console.log('save successful');

                    self.addAllView();

                  },
                  error: function(object, error) {

                    console.log('error saving figure object, verify connectivity')
                  }
                });
              },
              failure: function(errMsg) {
                  
                  console.log(errMsg)
                  alert('Something went wrong on our end. Please try again. ');
              }
          });
        });


        drawnItems.clearLayers();
        this.$("#view-title").val("");
        this.$("#view-description").val("");

      }
      else
      {
        self.$("#saveViewError").html("Title cannot be blank.").show().fadeOut(5000);
      }
      
      return false;
    },

    addAllView: function(e) {
      
      if (map)
      {

        this.$("#viewContainer").html("");

        _.each(activeFigure.get('viewArray'), function(geojsonobj, index) {
          
          geojsonobj.index = index;
          var rectview = new rectViewView({model: geojsonobj});
          
          this.$("#viewContainer").append(rectview.render().el);
        });
      }
    },

    reloadImageView: function(e)
    {
      resetMap();
    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      
      var self = this;
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete self;

    },

    render: function() {

      this.delegateEvents();

    }

  });

  var LogInView = Parse.View.extend({
    events: {
      "submit form.login-form": "logIn",
      "submit form.signup-form": "signUp"
    },

    el: ".content",
    
    initialize: function() {
      _.bindAll(this, "logIn", "signUp");
      this.render();
    },

    logIn: function(e) {
      var self = this;

            var username = this.$("#signup-username").val().toLowerCase();
      var email = this.$("#signup-email").val();
      var password = this.$("#signup-password").val();
      
      var user = new Parse.User();
      user.set("username", username);
      user.set("password", password);
      user.set("email", email);
      user.set("ACL", new Parse.ACL());


      user.signUp(null, {
        success: function(user) {
          // Hooray! Let them use the app now.
          window.appModel = new MainApplicationView();
          self.undelegateEvents();
          delete self;
        },
        error: function(user, error) {
          // Show the error message somewhere and let the user try again.
          // alert("Error: " + error.code + " " + error.message);
          self.$(".signup-form .error").html(error.message).show();
          this.$(".signup-form button").removeAttr("disabled");
        }
      });
      
      // var username = this.$("#login-username").val();
      // var password = this.$("#login-password").val();
      
      // Parse.User.logIn(username, password, {
      //   success: function(user) {
      //     window.appModel = new ManageTodosView();
      //     self.undelegateEvents();
      //     delete self;
      //   },

      //   error: function(user, error) {
      //     self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
      //     this.$(".login-form button").removeAttr("disabled");
      //   }
      // });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    signUp: function(e) {
      var self = this;
      var username = this.$("#signup-username").val();
      var password = this.$("#signup-password").val();
      
      Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
        success: function(user) {
          window.appModel = new ManageTodosView();
          self.undelegateEvents();
          delete self;


        },

        error: function(user, error) {
          self.$(".signup-form .error").html(error.message).show();
          this.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login-template").html()));
      
      $("#login-username").focus();

      this.delegateEvents();


    }
  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      if (Parse.User.current()) {
        window.appModel = new ManageTodosView();


      } else {
        new LogInView();
      }
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
    },

    all: function() {
      state.set({ filter: "all" });
    },

    active: function() {
      state.set({ filter: "active" });
    },

    completed: function() {
      state.set({ filter: "completed" });
    }
  });

  var state = new AppState;

  new AppRouter;
  new AppView;
  Parse.history.start();
});
