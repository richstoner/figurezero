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

var pubmedLayer;

var dxLayer;
var ytLayer;
var vimLayer;
var urlLayer;


var geojsonViewLayer;
var refhighlightLayer;

var activeFigure;


var resetMap = function () {
    map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
}

var zoomToGlobal = function (index) {
    window.appModel.zoomTo(index);
}

var highlightMapGlobal = function (index) {
    window.appModel.highlightMap(index);
}

var clearHighLightsGlobal = function () {
  geojsonViewLayer.clearLayers();
}

var highlightRefGlobal = function (index) {
    window.appModel.highlightRef(index);
}

var clearRefHighLightsGlobal = function () {
  refhighlightLayer.clearLayers();
}

var zoomRefGlobal = function (index) {
  window.appModel.zoomRef(index);
}

var starFigureGlobal = function (parseID) {
  window.appModel.starFigure(parseID);
}

$(window).resize(function () {
  // $("#map").height(window.innerHeight - 130);
          if(window.innerWidth < 500)
        {   
          $("#map").height( window.innerHeight - 80);         
          $(".tab-content").height( window.innerHeight - 100);         
        }
        else
        {
          $("#map").height(window.innerHeight - 115);  
          // $(".tab-content").height( window.innerHeight - 200);         
        }

  // $("#viewContainer").height(window.innerHeight - 150);
  // $("#referenceContainer").height(window.innerHeight - 150);
});


/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/


var loadMapFromFigureObject = function(figureobject){
    
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
        var minZoom = 1;
        
        if(window.innerWidth < 500)
        {   
          $("#map").height( window.innerHeight - 80);   
          $(".tab-content").height( window.innerHeight - 100);               
          // minZoom = 0; 
        }
        else
        {
          $("#map").height(window.innerHeight - 115);  
          $(".tab-content").height( window.innerHeight - 200);         
        }

        
  // $("#viewContainer").height(window.innerHeight - 150);
  // $("#referenceContainer").height(window.innerHeight - 150);

        map = new L.Map('map', {
            crs: L.CRS.Direct,
            center: new L.LatLng(0, 0),
            zoom: maxLOD,
            minZoom: minZoom,
            scrollWheelZoom: true,
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

        // regionArray = $("#initialRegion").val().split(',');
        // console.log(regionArray);

        map.fitBounds(new L.LatLngBounds(
            tlpoint, 
            brpoint
        ));

        console.log("Hi dan");

        // if(regionArray.length < 3)
        // {

        //   console.log('loading default');

        //   map.fitBounds(new L.LatLngBounds(
        //       tlpoint, 
        //       brpoint
        //   ));

        // }
        // else
        // {

        //     console.log('loading initial rect');
        //     var tlp = new L.LatLng(regionArray[0], regionArray[1]);
        //     var brp = new L.LatLng(regionArray[2], regionArray[3]); 

        //     console.log(tlpoint);
        //     console.log(tlp);

        //     map.fitBounds(new L.LatLngBounds(tlp, brp));
        // }



      // 
      

      // 

      // console.log('set initial zoom')
      // console.log(tlp);



        var pubmedIcon = L.icon({
          iconUrl: '/static/css/images/pubmed-marker.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
          popupAnchor: [0, -28]
        });
        

        var dxIcon = L.icon({
          iconUrl: '/static/css/images/doi-marker.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
          popupAnchor: [0, -28]
        });

        var vimeoIcon = L.icon({
          iconUrl: '/static/css/images/vim-marker.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
          popupAnchor: [0, -28]
        });


        var ytIcon = L.icon({
          iconUrl: '/static/css/images/yt-marker.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
          popupAnchor: [0, -28]
        });

        var otherIcon = L.icon({
          iconUrl: '/static/css/images/other-marker.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
          popupAnchor: [0, -28]
        });        
        
        var highlighticon = L.icon({
          iconUrl: '/static/css/images/highlight-marker.png',
          iconSize: [32, 37],
          iconAnchor: [16, 37],
          popupAnchor: [0, -28]
        });        

        var myStyle = {
              "color": "#0099ff",
              "weight": 2,
              "opacity": 0.8,
              "fillColor": "#000000",
              "fillOpacity": 0.75
        };
          

        geojsonViewLayer = L.geoJson(null, {
              onEachFeature: onEachRectFeature,
              style: myStyle
            }
          ).addTo(map);

        

        pubmedLayer = L.geoJson(null, {
              pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: pubmedIcon});
              },
              onEachFeature: onEachPointFeature
            }
          ).addTo(map);


        dxLayer = L.geoJson(null, {
              pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: dxIcon});
              },
              onEachFeature: onEachPointFeature
            }
          ).addTo(map);

        ytLayer = L.geoJson(null, {
              pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: ytIcon});
              },
              onEachFeature: onEachPointFeature
            }
          ).addTo(map);

        vimLayer = L.geoJson(null, {
              pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: vimeoIcon});
              },
              onEachFeature: onEachPointFeature
            }
          ).addTo(map);

        urlLayer = L.geoJson(null, {
              pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: otherIcon});
              },
              onEachFeature: onEachPointFeature
            }
          ).addTo(map);

        refhighlightLayer = L.geoJson(null, {
              pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {icon: highlighticon});
              },
              onEachFeature: onEachPointFeature
            }
          ).addTo(map);

        window.appModel.addAllRefs();
        window.appModel.addAllView();
        window.appModel.addFigureInfo();



    }

}


/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/



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


// function onEachPointFeature(feature, layer) {
//     if (feature.properties && feature.properties.title) {
        
//         layer.on('click', function(e) { 
//             layer.bindPopup('<p id="customViewTitle"> <a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed?term=' + feature.properties.id + ' "><i class="icon-share"></i></a> <span class="heavier">' + feature.properties.title + '</span>  <br>' + feature.properties.authors + '</p>');
//             var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
//             map.panTo(brpoint);
//             layer.openPopup();
//         });

//     }
// }

function onEachPointFeature(feature, layer ) {
    
  if(feature.properties.reftype == 'Pubmed ID')
  {

    if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 

            if(window.innerWidth < 500)
            {
              layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed?term=' + feature.properties.id + ' ">Pubmed Link</a></p>', {maxWidth:250});
            }
            else
            {
             layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed?term=' + feature.properties.id + ' ">Pubmed Link</a></p>', {maxWidth:500}); 
            }
            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }
  else if(feature.properties.reftype == 'Vimeo ID')
  {
    if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 

          
            if(window.innerWidth < 500)
            {
              layer.bindPopup('<iframe src="http://player.vimeo.com/video/' + feature.properties.id + '" width="320" height="240" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>', {maxWidth:250});
            }
            else
            {
             layer.bindPopup('<iframe src="http://player.vimeo.com/video/' + feature.properties.id + '" width="320" height="240" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>', {maxWidth:500}); 
            }
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }
  else if(feature.properties.reftype == 'DX.DOI')
  {
        if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 

            if(window.innerWidth < 500)
            {
              layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="' + feature.properties.id + ' ">DOI Link</a></p>', {maxWidth:320});
            }
            else
            {
                layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="' + feature.properties.id + ' ">DOI Link</a></p>', {maxWidth:500});

            }
            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }
  else if(feature.properties.reftype == 'Youtube ID')
  {
    if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 

// <iframe id="ytplayer" type="text/html" width="640" height="390"
//   src="http://www.youtube.com/embed/u1zgFlCw8Aw?autoplay=1&origin=http://example.com"
//   frameborder="0"/>

            if(window.innerWidth < 500)
            {
                layer.bindPopup('<iframe id="ytplayer" type="text/html" width="320" height="240" src="http://www.youtube.com/embed/' +  feature.properties.id + '?autoplay=1&origin=http://figurezero.com" frameborder="0"/>', {maxWidth:320});
            }
            else
            {
                layer.bindPopup('<iframe id="ytplayer" type="text/html" width="320" height="240" src="http://www.youtube.com/embed/' +  feature.properties.id + '?autoplay=1&origin=http://figurezero.com" frameborder="0"/>', {maxWidth:500});
            }

            
            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }
  else if(feature.properties.reftype == 'Other URL')
  {
    if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 
          if(window.innerWidth < 500)
          {
            layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br>' + feature.properties.authors + '<br>' + feature.properties.description + '</p><p><a target="_blank" href="' + feature.properties.id + ' ">Original URL</a></p>', {maxWidth:250});
          }
          else
          {
           

            if(feature.properties.title.indexOf("iframe") != -1)
            {
                layer.bindPopup('<iframe id="ytplayer" type="text/html" width="500" height="500" src="'+ feature.properties.id + '" frameborder="0"/>', {maxWidth:500});
            }
            else
            {
                layer.bindPopup('<h3><a target="_blank" href="' + feature.properties.id + ' "><span class="heavier">' + feature.properties.title + '</span></a></h3><br>' + feature.properties.authors + '</p>', {maxWidth:500});  
            }
            



          }


            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }


}


/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/


$(function() {

  Parse.$ = jQuery;
  Parse.initialize("nY5yXtyaq5zJ1TnCfGOBDa6vu9IX9WwhDJTxx6eu","2HnPlp2kBNpS66dsPdVHRlec1b8BVzKnbZc5XknC");

  var FigureObject = Parse.Object.extend("UploadObject",
  {
      initialize: function() {
        console.log("initialized FZ object");
      },
      toggle: function() {
        console.log("called Toggle");
      }
  });

  var FigureList = Parse.Collection.extend({
    model: FigureObject
  });


/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/


  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  /********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/



  var pointView = Parse.View.extend({

    tagName:  "div",
    template: _.template($('#reference-template').html()),
  
    events: {},

    initialize: function() {
      _.bindAll(this, 'render');
    },

    render: function() {
      // console.log(this.model);
      $(this.el).html(this.template(this.model));
      return this;
    }
  });


/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/


  var rectView = Parse.View.extend({

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


/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/


  // The Application
  var PublishAppView = Parse.View.extend({

    events: {
      "click #signinButton": "signInUser",
      "click #logoutButton": "logOut",
      "click #unpublishButton": "unpublishPublish",
      "click #editTextButton": "showEditText",
      "click #reload-text-button": "reloadText",
      "click #save-text-button": "saveCurrentText",
      "click #signin-button" : "signinPressed",
      "keypress #signup-password" : "signinPressed",
      "click #createaccount-button" : "createAccountPressed",
      "keypress #signup-email" : "createAccountPressed"
    },

    el: ".content",

    initialize: function() {
      
      var self = this;

      _.bindAll(this, 
        'render', 
        'zoomTo', 
        'zoomRef',
        'highlightMap', 
        'highlightRef',
        'addFigureInfo', 
        'addAllView', 
        'addAllRefs',
        'signInUser',
        'logOut',
        'starFigure',
        'unpublishPublish',
        'showEditText',
        'reloadText',
        'saveCurrentText',
        'signinPressed',
        'createAccountPressed',
        'setInitialZoom');

      this.activeFigureID = $("#parseID").html();

      // console.log($("#initialRegion").val());

      $(this.el).html(_.template($("#publish-app-template").html()));     

      this.query = new Parse.Query(FigureObject); 

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {
          
          $('#activityView').hide();

          $('#myTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#dropDownButton').dropdown();
          $('#dropDownLogin input').click(function(e) {
            e.stopPropagation();
          });

          $('#dropDownLogin button').click(function(e) {
            e.stopPropagation();
            window.appModel.signInUser();
          });

          activeFigure = $.extend(true, {}, figureobject);

          var fojson = figureobject.toJSON();
          if (fojson.stat >= 7)
          {
            loadMapFromFigureObject(figureobject);
          }


        },
        error: function(object, error) {
          console.log('error');

          $('#activityView').hide();

          $('#myTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          $('#dropDownButton').dropdown();
          $('#dropDownLogin input').click(function(e) {
            e.stopPropagation();
          });

          $('#dropDownLogin button').click(function(e) {
            e.stopPropagation();
            window.appModel.signInUser();
          });

          alert('figure not available - it may not be public?');
        }
      });

      


    },

    setInitialZoom: function(e)
    {

      // regionArray = $("#initialRegion").val().split(',');
      // var tlp = new L.LatLng(regionArray[0], regionArray[1]);
      // var brp = new L.LatLng(regionArray[2], regionArray[3]);

      // map.fitBounds(new L.LatLngBounds(tlp, brp));

      // console.log('set initial zoom')
      // console.log(tlp);

    },

    signinPressed: function(e) 
    {
      if (e.keyCode == 13 || e.type == 'click')
      {

        var self = this;
        var username = this.$("#signup-username").val().toLowerCase();
        var password = this.$("#signup-password").val();
        
        Parse.User.logIn(username, password, {
          success: function(user) {


            $("#myModal").modal('hide');

            // var self = this;
            window.appModel.undelegateEvents();
            window.appModel = new PublishAppView();
            
            delete self;  

          },

          error: function(user, error) {
            $("#error").text("Invalid username or password. Please try again.").show();
            
          }
        });
      }
      else
      {

      }

    },

    createAccountPressed: function(e)
    {
      if (e.keyCode == 13 || e.type == 'click')
      {
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

            $("#myModal").modal('hide');
            // var self = this;
            window.appModel.undelegateEvents();
            window.appModel = new PublishAppView();
            delete self;  
          },
          error: function(user, error) {
            $("#error").text(error.message).show();
          }
        });
      }
      else
      {

      }
    },

    signInUser: function()
    {


      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();

      Parse.User.logIn(username, password, {
        success: function(user) {

          $('#dropDownButton').dropdown('toggle');
          window.appModel = new PublishAppView();
          self.undelegateEvents();
          delete self;

        },
        error: function(user, error) {

          this.$("#login-username").val("");
          this.$("#login-password").val("");
          
        }
      });



    },
    reloadText: function(e) {

      var self = this;

      // $('#activityView').show();

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {

          activeFigure.fetch();

          var figureTitle = activeFigure.get('figureTitleEDIT');
          var authorList = activeFigure.get('authorList');
          var tagarray = activeFigure.get('tag');
          
          self.$('.text-core').remove();
          self.$("#textareacontainer").html('<textarea id="textarea" style="max-width:200px;" rows="1"></textarea>');
          self.$("#figureTitleEDIT").val(figureTitle);
          self.$("#figureAuthor").val(authorList)
          self.$("#figureDescriptionEDIT").val(activeFigure.get('figureDescription'));
          
          self.$('#textarea').textext({
              plugins : 'tags prompt focus autocomplete ajax arrow',
              tagsItems : tagarray,
              prompt : 'tags',
              ajax : {
                  url : '/api/tags.json',
                  dataType : 'json',
                  cacheResults : true
            }
          });          

          // $('#activityView').fadeOut(500);
        },
        error: function(object, error) {

          alert('figure retrieve error');
          // $('#activityView').fadeOut(500);
          
        }

      });

    },
    showEditText: function()
    {
        console.log('here');

        $('#myTab a[href="#edit"]').tab('show');
    },

    starFigure: function(idToStar)
    {
      // var starArray = .get('starArray');
      var self = this;
      var currentUser = Parse.User.current();
      var starURL = '/star/' + idToStar + '/' + currentUser.id 
      var unstarURL = '/unstar/' + idToStar + '/' + currentUser.id 
      

      if(currentUser.has('starArray'))
      {
        var inArrayInd = $.inArray(idToStar, currentUser.get('starArray'));

        console.log(inArrayInd);
        if (inArrayInd >= 0)
        {  
           $.get(unstarURL, function(data) {
              console.log(data);
            });
            currentUser.get('starArray').splice(inArrayInd, 1);
            currentUser.save(null, {
              success: function(user)
              {
                // console.log('figure unstarred');
                var unstarredString = '<a class="btn btn-small" onclick="starFigureGlobal(\''+ activeFigure.id + '\')"><span class="icon-star"></span></a>';
                $("#starSpan").html(unstarredString)

              }
            });
        }
        else
        {
            $.get(starURL, function(data) {
              console.log(data);
            });
            currentUser.get('starArray').push(idToStar);
            currentUser.save(null, {
              success: function(user)
              {
                // console.log('figure starred');
                var starredString = '<a class="btn btn-warning btn-small" onclick="starFigureGlobal(\''+ activeFigure.id + '\')"><span class="icon-star icon-white"></span></a>';
                $("#starSpan").html(starredString)

              }
            });
        }
      }
      else
      {
        $.get(starURL, function(data) {
            console.log(data);
        });        
  
        var starArray = [];
        starArray.push(idToStar);
        currentUser.set('starArray', starArray);
        currentUser.save(null, {
          success: function(user)
          {
            // console.log('figure starred');
            var starredString = '<a class="btn btn-warning btn-small" onclick="starFigureGlobal(\''+ activeFigure.id + '\')"><span class="icon-star icon-white"></span></a>';
            $("#starSpan").html(starredString)

          }
        });

      }

    },

    // pan to the selected reference
    zoomRef: function(index)
    {
        var self = this;
        var regionObj = activeFigure.get('referenceArray')[index];
        var brpoint = new L.LatLng(regionObj.geometry.coordinates[1], regionObj.geometry.coordinates[0]);
        map.panTo(brpoint);
    },

    // pan to the selected region
    zoomTo: function(index)
    {
        var self = this;
        var regionObj = activeFigure.get('viewArray')[index];
        var tlpoint = new L.LatLng(regionObj.geometry.coordinates[1][3][1], regionObj.geometry.coordinates[1][3][0]);
        var brpoint = new L.LatLng(regionObj.geometry.coordinates[1][1][1], regionObj.geometry.coordinates[1][1][0]);   
        map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
    },

    // show the highlighted region for the selected region
    highlightMap: function(index)
    {
      var self = this;
      geojsonViewLayer.addData(activeFigure.get('viewArray')[index]);
    },

    // show the highlighted marker for the selected region
    highlightRef: function(index)
    {
      var self = this;
      refhighlightLayer.addData(activeFigure.get('referenceArray')[index]);
    },

    // populate the figure text and metadata contents
    addFigureInfo: function(e)
    {

        var tagarray = activeFigure.get('tag');
        tag_html = '';
        tag_str = '';
        _.each(tagarray, function(object, index) { 
          tag_html += '<a href="/library/#/tag/' + object + '" >' + object  + '</a>, ';
          tag_str += object.replace(/(\r\n|\n|\r)/gm,"") + ', ';
        });

        var shortTitle = activeFigure.get('figureTitle');

        if(shortTitle.length > 60)
        {
          shortTitle = '@figurezero ' + shortTitle.substr(0,57) + '... ' + tag_str;
        }

        shortURL = activeFigure.get("shortenedURL");
        addthis.button("#at-box", {} , {url: shortURL, title: shortTitle, "data_track_addressbar":false});

        this.$("#figureTitle").html(activeFigure.get('figureTitle'));
        this.$("#figureAuthor").html(activeFigure.get('authorList'));
        this.$("#figureDescription").html(activeFigure.get('figureDescription'));

        document.title = activeFigure.get('figureTitle');


            
        var originalname = '<a target="_blank" href="http://figurezero.com/local/' + activeFigure.get('rootID') + '/' + activeFigure.get('imageID') + activeFigure.get('originalExtension') + '">' + activeFigure.get('originalFilename') + '</a>';
        var shorturl = activeFigure.get('shortenedURL');
        var qrcode = activeFigure.get('qrLinkURL');


        this.$("#figureTags").html(tag_html);
        this.$("#figureExternal").html('<a target="_blank" href="' + activeFigure.get('figureExternal') + '">' + activeFigure.get('figureExternal') + '</a>');  
        this.$("#qrcode").html('<a target="_blank" href="' + qrcode + ' "><img style="width:200px; height:200px;" src="' + qrcode + '"/></a>' )
        this.$("#shortLinkURL").html('<a target="_blank" href="' + shorturl + ' ">' + shorturl + '</a>' )

        // !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");



        // var figureTitle = activeFigure.get('figureTitleEDIT');
        // var tagedit = activeFigure.get('tag');
            
        self.$('.text-core').remove();
        self.$("#textareacontainer").html('<textarea id="textarea" style="max-width:200px;" rows="1"></textarea>');
        self.$("#figureTitleEDIT").val(activeFigure.get('figureTitle'));
        self.$("#figureDescriptionEDIT").val(activeFigure.get('figureDescription'));
        this.$("#figureExternalEDIT").html(activeFigure.get('figureExternal'));  

        self.$('#textarea').textext({
            plugins : 'tags prompt focus autocomplete ajax arrow',
            tagsItems : tagarray,
            prompt : 'tags',
            ajax : {
                url : '/api/tags.json',
                dataType : 'json',
                cacheResults : true
          }
        });    


          var currUser = Parse.User.current();
          var keys = Object.keys(activeFigure.getACL().permissionsById);
          var userFromACL = '';

          _.each(keys, function(key){       
              if (key == '*') {} else { userFromACL = key; }
          });

          if (currUser)
          {
            if(currUser.id == userFromACL)
            {

                // console.log('this is my figure');
                if (!activeFigure.get('published'))
                {
                  // console.log('setting edit buttons');
                  this.$("#publishButton").html('<div class="btn-group pull-right"><button class="btn btn-primary btn-small">Unpublished</button><button class="btn btn-success btn-small dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"><li><a id="unpublishButton" href="#">Publish figure</a></li></ul></div>');        

                  var editRefHTML = '<div class="btn-group pull-right" style="margin-right:30px"><a href="/ref/' + activeFigure.id + '" id="editRefButton" class="btn btn-small btn-primary"><i class="icon-edit icon-white"></i>  Edit references</a></div>';
                  var editROIHTML = '<div class="btn-group pull-right" style="margin-right:30px"><a href="/roi/' + activeFigure.id + '" id="editROIButton" class="btn btn-small  btn-primary"><i class="icon-edit icon-white"></i>  Edit regions</a></div>';
                  var editTextHTML = '<div class="btn-group pull-right" style="margin-right:30px"><button id="editTextButton" class="btn btn-small btn-primary"><i class="icon-edit icon-white"></i>  Edit text</button></div><div class="clearfix"></div>';
                  $("#editReferenceSpan").html(editRefHTML);
                  $("#editRegionSpan").html(editROIHTML);
                  $("#editTextSpan").html(editTextHTML);
                }
                else
                {
                  this.$("#publishButton").html('<div class="btn-group pull-right"><button class="btn btn-success btn-small">Published</button><button class="btn btn-primary btn-small dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"><li><a id="unpublishButton" href="#">Unpublish figure</a></li></ul></div>');        
                  
                  $("#editTextSpan").html("<div class='clearfix'></div>");
                $("#editRegionSpan").html("<div class='clearfix'></div>");
                $("#editReferenceSpan").html("<div class='clearfix'></div>");
                }
            }
            else
            {
                console.log('this is not your figure');

                this.$("#publishButton").html("");

                $("#editTextSpan").html("<div class='clearfix'></div>");
                $("#editRegionSpan").html("<div class='clearfix'></div>");
                $("#editReferenceSpan").html("<div class='clearfix'></div>");

                var figstarred = false;
                if ($.inArray(activeFigure.id, currUser.get('starArray')) >= 0)
                {
                  figstarred = true;
                }

                if (figstarred) {
                  console.log('and starred');
                  var starredString = '<a class="btn btn-warning btn-small" onclick="starFigureGlobal(\''+ activeFigure.id + '\')"><span class="icon-star icon-white"></span></a>';
                  $("#starSpan").html(starredString)
                }
                else
                {
                  console.log('and not starred');
                  var unstarredString = '<a class="btn btn-small" onclick="starFigureGlobal(\''+ activeFigure.id + '\')"><span class="icon-star"></span></a>';
                  $("#starSpan").html(unstarredString)

                };
            }
          }
          else
          {
              this.$("#publishButton").html("");
                              $("#editTextSpan").html("<div class='clearfix'></div>");
                $("#editRegionSpan").html("<div class='clearfix'></div>");
                $("#editReferenceSpan").html("<div class='clearfix'></div>");
          }
   

          this.setInitialZoom();

      },

    // populate the figure views
    addAllView: function(e) {
      
      if (map)
      {
        this.$("#viewContainer").html("");

        geojsonViewLayer.clearLayers();
        _.each(activeFigure.get('viewArray'), function(geojsonobj, index) {
          
          geojsonobj.index = index;
          var rectview = new rectView({model: geojsonobj});
          this.$("#viewContainer").append(rectview.render().el);

        });
      }
    },
    unpublishPublish: function(e){
    
        var self = this;
        var parseID = activeFigure.id;
        var publishBOOL = activeFigure.get('published');


        if (publishBOOL) {

          activeFigure.getACL().setPublicReadAccess(false);
          activeFigure.set('published', false);
          activeFigure.save(null, {
              success: function(object) {

                $("#publishButton").html('<div class="btn-group pull-right"><button class="btn btn-primary btn-small">Unpublished</button><button class="btn btn-success btn-small dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"><li><a id="unpublishButton" href="#">Publish figure</a></li></ul></div>');        
                
                
                  var editRefHTML = '<div class="btn-group pull-right" style="margin-right:30px"><a href="/ref/' + activeFigure.id + '" id="editRefButton" class="btn btn-small btn-primary"><i class="icon-edit icon-white"></i>  Edit references</a></div>';
                  var editROIHTML = '<div class="btn-group pull-right" style="margin-right:30px"><a href="/roi/' + activeFigure.id + '" id="editROIButton" class="btn btn-small  btn-primary"><i class="icon-edit icon-white"></i>  Edit regions</a></div>';
                  var editTextHTML = '<div class="btn-group pull-right" style="margin-right:30px"><button id="editTextButton" class="btn btn-small btn-primary"><i class="icon-edit icon-white"></i>  Edit text</button></div><div class="clearfix"></div>';
                  $("#editReferenceSpan").html(editRefHTML);
                  $("#editRegionSpan").html(editROIHTML);
                  $("#editTextSpan").html(editTextHTML);
              },
              error: function(object, error) {
                
              }
          });
        }
        else
        {
        
          activeFigure.getACL().setPublicReadAccess(true);
          activeFigure.set('published', true);
          activeFigure.save(null, {
              success: function(object) {
                  
                  $("#publishButton").html('<div class="btn-group pull-right"><button class="btn btn-success btn-small">Published</button><button class="btn btn-primary btn-small dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"><li><a id="unpublishButton" href="#">Unpublish figure</a></li></ul></div>');        
                    
                $("#editTextSpan").html("<div class='clearfix'></div>");
                $("#editRegionSpan").html("<div class='clearfix'></div>");
                $("#editReferenceSpan").html("<div class='clearfix'></div>");

              },
              error: function(object, error) {
                  
              }
          });

        }  
    },

    saveCurrentText: function(e){

      var self = this;
      var figureTitle = self.$("#figureTitleEDIT").val();


      var figureDescription = self.$("#figureDescriptionEDIT").val();
      var figureExternal = self.$("#figureExternalEDIT").val();
      var figureTags = self.$('#textarea').textext()[0].tags()._formData;
      var figureAuthorList = self.$("#figureAuthorList").val();

      activeFigure.set('tag', figureTags);
      activeFigure.set('figureTitle', figureTitle);
      activeFigure.set('figureDescription', figureDescription);
      activeFigure.set('figureExternal', figureExternal);
      activeFigure.set('authorList', figureAuthorList);
      
      document.title = activeFigure.get('figureTitle');

      activeFigure.save({
        success: function(object) {
          console.log('save successful');


          self.$("#figureTitle").html(object.get('figureTitle'));
          self.$("#figureDescription").html(object.get('figureDescription'));
          self.$("#figureAuthor").html(object.get('authorList'));
          var tagarray = object.get('tag');

          tag_html = '';
          _.each(tagarray, function(tag, index) { 
            tag_html += '<a href="/library/#/tag/' + tag + '" >' + tag  + '</a>, ';
          });

          self.$("#figureTags").html(tag_html);
          self.$("#figureExternal").html('<a target="_blank" href="' + object.get('figureExternal') + '">' + object.get('figureExternal') + '</a>');  

          $('#myTab a:first').tab('show');

        },
        error: function(object, error) {            
          console.log(error);
        }
      });

    },
    // populate the reference markers
    addAllRefs: function(e) {

      if (map)
      {
        

        this.$("#referenceContainer").html("");

        _.each(activeFigure.get('referenceArray'), function(geojsonobj, index) {

          geojsonobj.index = index;
          var rectview = new pointView({model: geojsonobj});
          this.$("#referenceContainer").append(rectview.render().el);

         if(geojsonobj.properties.reftype == 'Pubmed ID')
          {
            pubmedLayer.addData(geojsonobj);
          } else if (geojsonobj.properties.reftype == 'DX.DOI')
          {
            dxLayer.addData(geojsonobj);
          }else if (geojsonobj.properties.reftype == 'Youtube ID')
          {
            ytLayer.addData(geojsonobj);
          }else if (geojsonobj.properties.reftype == 'Vimeo ID')
          {
            vimLayer.addData(geojsonobj);
          }else if (geojsonobj.properties.reftype == 'Other URL')
          {
            urlLayer.addData(geojsonobj);
          }

        });
      }     
    },
        // Logs out the user and shows the login view
    logOut: function(e) {
      var self = this;
      Parse.User.logOut();
      window.appModel = new PublishAppView();
      this.undelegateEvents();
      delete self;
      
    },

    // refresh the view
    reloadImageView: function(e)
    {
      resetMap();
    },

    render: function() {
      // $(this.el).html(this.template(this.model.toJSON()));
      this.delegateEvents();
    }
  });






/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/


  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    initialize: function() {
      this.render();
    },

    render: function() {

      window.appModel = new PublishAppView();

      $('#myTab a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
      });


      // $('#dropDownButton').dropdown();
      // $('#dropDownLogin input').click(function(e) {
      //   e.stopPropagation();
      // });

      // $('#dropDownLogin button').click(function(e) {
      //   e.stopPropagation();
      //   window.appModel.signInUser();
      // });
 
    }
  });


  var AppRouter = Parse.Router.extend({

    routes: {
      "region/:id": "showRegion",
      "*actions": "defaultRoute" 
    },

    initialize: function(options) {

    },
    showRegion: function(id)
    {
      console.log('viewing region ' + id);
      $("#initialRegion").val(id)
    },

    defaultRoute: function( actions ){

      // console.log(actions);

    }


  });

  var state = new AppState;

  new AppRouter;
  Parse.history.start();


  new AppView;
});

/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/














