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

var resetMap = function()
{
    map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
}

var zoomToGlobal = function(index)
{
    window.appModel.zoomTo(index);
}

var panToGlobal = function(index)
{

}

var highlightMapGlobal = function(index)
{
    window.appModel.highlightMap(index);
}

var clearHighLightsGlobal = function()
{
  geojsonViewLayer.clearLayers();;
}

var highlightRefGlobal = function(index)
{
    window.appModel.highlightRef(index);
}

var clearRefHighLightsGlobal = function()
{
  // geojsonViewLayer.clearLayers();;
  refhighlightLayer.clearLayers();
}

var deleteViewAtIndexGlobal = function(index)
{
  // window.appModel.deleteViewAtIndex(index);
}

$(window).resize(function() {
  $("#map").height(window.innerHeight * 0.8);
  $("#viewContainer").height(window.innerHeight * 0.6);
  $("#referenceContainer").height(window.innerHeight * 0.6);

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


    var ImagePropertiesPath = figureobject.get("s3imagePropertiesLocation");
    var tilepath = figureobject.get("s3tileLocation");
    console.log(tilepath);

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

        $("#map").height(window.innerHeight * 0.8);
        $("#viewContainer").height(window.innerHeight * 0.6);
        $("#referenceContainer").height(window.innerHeight * 0.6);

        map = new L.Map('map', {
            crs: L.CRS.Direct,
            center: new L.LatLng(0, 0),
            zoom: maxLOD,
            minZoom: 1,
            worldCopyJump: false,
            attributionControl: false,
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

        map.fitBounds(new L.LatLngBounds(
            tlpoint, 
            brpoint
        ));

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
              "color": "#000000",
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
//     // does this feature have a property named popupContent?
//     if (feature.properties && feature.properties.title) {
//         // layer.bindPopup(feature.properties.popupContent);

//         layer.on('click', function(e) { 

//             layer.bindPopup('<p id="customViewTitle"> <a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed?term=' + feature.properties.id + ' "><i class="icon-share"></i></a> <span class="heavier">' + feature.properties.title + '</span>  <br>' + feature.properties.authors + '</p>');
            
//             var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
//             map.panTo(brpoint);

//         });
//     }
// }


function onEachPointFeature(feature, layer ) {
    
  if(feature.properties.reftype == 'Pubmed ID')
  {

    if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 

            layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed?term=' + feature.properties.id + ' ">Pubmed Link</a></p>', {maxWidth:500});
            
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

          

            layer.bindPopup('<iframe src="http://player.vimeo.com/video/' + feature.properties.id + '" width="320" height="240" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>', {maxWidth:500});
            
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

            layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="' + feature.properties.id + ' ">DOI Link</a></p>', {maxWidth:500});
            
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

            layer.bindPopup('<iframe id="ytplayer" type="text/html" width="320" height="240" src="http://www.youtube.com/embed/' +  feature.properties.id + '?autoplay=1&origin=http://figurezero.com" frameborder="0"/>', {maxWidth:500});
            
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
            layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p><p><a target="_blank" href="' + feature.properties.id + ' ">Original URL</a></p>', {maxWidth:500});
            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }


}


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

  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });


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
    },
  });



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
    },
  });

  // The Application
  // ---------------

  // The main view that lets a user manage their todo items
  var ManageTodosView = Parse.View.extend({

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "click #logoutButton": "logOut",
      "click #resetviewbutton" : "reloadImageView",
      "click #reload-text-button": "reloadText",
      "click #reload-model-button": "reloadActiveFigure",
      "click #save-text-button": "saveCurrentText",
      "click #unpublishButton": "unpublishPublish",
    },

    el: ".content",

    initialize: function() {
      var self = this;

      _.bindAll(this, 
        'render', 
        'saveCurrentText', 
        'addFigureInfo', 
        'reloadText', 
        'logOut', 
        'reloadImageView', 
        'reloadActiveFigure', 
        'zoomTo', 
        'highlightMap', 
        'highlightRef',
        'addAllView', 
        'addAllRefs',
        'unpublishPublish');

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

            loadMapFromFigureObject(figureobject);
            
          }
        },
        error: function(object, error) {

          alert('figure not available - it may not be public');
          console.log(error);
        }
      });
    },

    saveCurrentText: function(e){

      var self = this;
      var figureTitle = self.$("#figureTitle").val();
      var figureDescription = self.$("#figureDescription").val();
      var figureExternal = self.$("#figureExternal").val();
      
      var figureTags = self.$('#textarea').textext()[0].tags()._formData;

      console.log(figureTitle);
      console.log(figureDescription);
      console.log(figureExternal);
      console.log(figureTags);

      activeFigure.set('tag', figureTags);
      activeFigure.set('figureTitle', figureTitle);
      activeFigure.set('figureDescription', figureDescription);
      activeFigure.set('figureExternal', figureExternal);

      $('#activityView').show();

      activeFigure.save({
        success: function(object) {
          console.log('save successful');
          $('#activityView').fadeOut(500);

        },
        error: function(object, error) {            
          console.log(error);
          alert('Save failed - please retry.');
          $('#activityView').fadeOut(500);

        }
      });

    },
    unpublishPublish: function(e){
    
        var self = this;
        var parseID = activeFigure.id;
        var publishBOOL = activeFigure.published;
  
        self.query.get(parseID, {

            success: function(fzobj) {

                if(!publishBOOL)
                {
                  // this is inverted, not sure why...

                  fzobj.getACL().setPublicReadAccess(true);
                  fzobj.set('published', true);
                  fzobj.save(null, {
                    success: function(object) {
                      
                      alert('published!');

                      $("#publishButton").html('<button id="unpublishButton" class="pull-right btn btn-success">Published. (tap to unpublish)</button>');        
                    },
                    error: function(object, error) {

                      alert('error trying to save...');
                      
                    }
                  });                  


                }
                else
                {

                  fzobj.getACL().setPublicReadAccess(false);
                  fzobj.set('published', false);
                  fzobj.save(null, {
                    success: function(object) {
                      
                      console.log('unpublished!');
              
                      $("#publishButton").html('<button id="unpublishButton" class="pull-right btn btn-primary">Unpublished. (tap to unpublish)</button>');        

                      // self.refreshEntries();
                    },
                    error: function(object, error) {

                      // console.log('error trying to save...');
                  
                    }
                  });     

                }
            },
            error: function(myObject, error) {
              // The delete failed.
              // error is a Parse.Error with an error code and description.
            }
          });     
    },
    reloadText: function(e) {

      var self = this;

      $('#activityView').show();

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {

          delete activeFigure;

          activeFigure = $.extend(true, {}, figureobject);
          var figureTitle = activeFigure.get('figureTitle');
          var shorturl = activeFigure.get('shortenedURL');
          var qrcode = activeFigure.get('qrLinkURL');
          var tagarray = activeFigure.get('tag');

          console.log(figureTitle)

          self.$('.text-core').remove();
          self.$("#textareacontainer").html('<textarea id="textarea" rows="1"></textarea>');
          self.$("#figureTitle").val(figureTitle);
          self.$("#figureDescription").val(activeFigure.get('figureDescription'));
          
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

          $('#activityView').fadeOut(500);
        },
        error: function(object, error) {

          alert('figure retrieve error');
          $('#activityView').fadeOut(500);
          
        }

      });

    },
    reloadActiveFigure: function()
    {
      var self = this;

      $('#activityView').show();

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {
          
          activeFigure = $.extend(true, {}, figureobject);
          var fojson = figureobject.toJSON();
          if (fojson.stat >= 7)
          {

            self.addAllRefs();
          }

          $('#activityView').fadeOut(500);
        },
        error: function(object, error) {

          alert('figure not available - it may not be public');
          $('#activityView').fadeOut(500);
          console.log(error);
          
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

      geojsonViewLayer.addData(activeFigure.get('viewArray')[index]);


      // geojsonViewLayer = L.geoJson(activeFigure.get('viewArray')[index], {
      //       style: myStyle,
      //       onEachFeature: onEachRectFeature
      // }).addTo(map);

    },

    highlightRef: function(index)
    {
      var self = this;
      // console.log(activeFigure.get('referenceArray')[index])

      refhighlightLayer.addData(activeFigure.get('referenceArray')[index]);

      // geojsonViewLayer.addData(activeFigure.get('referenceArray')[index]);

    },
    addFigureInfo: function(e)
    {
      // console.log(activeFigure.get('figureTitle'));



      this.$("#figureTitle").html(activeFigure.get('figureTitle'));
      this.$("#figureDescription").html(activeFigure.get('figureDescription'));

      if(activeFigure.get("published"))
      {
        this.$("#publishButton").html('<button id="unpublishButton" class="pull-right btn btn-success">Published. (tap to unpublish)</button>');        
      }
      else
      {
        this.$("#publishButton").html('<button id="unpublishButton" class="pull-right btn btn-primary">Unpublished. (tap to unpublish)</button>');        

      }



      var shorturl = activeFigure.get('shortenedURL');
      var qrcode = activeFigure.get('qrLinkURL');
      var tagarray = activeFigure.get('tag');

        $('#textarea').textext({
        plugins : 'tags prompt focus autocomplete ajax arrow',
        tagsItems : tagarray,
        prompt : 'tags',
        ajax : {
            url : '/api/tags.json',
            dataType : 'json',
            cacheResults : true
        }
        });    

          

      // $('#textarea').width('240px');


      },
    addAllView: function(e) {
      
      if (map)
      {
        this.$("#viewContainer").html("");

        geojsonViewLayer.clearLayers();
        
        // L.geoJson.clearLayers()

        _.each(activeFigure.get('viewArray'), function(geojsonobj) {

          console.log(geojsonobj);

          var rectview = new rectView({model: geojsonobj});
          this.$("#viewContainer").append(rectview.render().el);

          // geojsonViewLayer = L.geoJson(geojsonobj, {
          //       onEachFeature: onEachRectFeature
          //   }).addTo(map);

        });
      }
    },
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

    reloadImageView: function(e)
    {
      resetMap();
    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete this;
    },

    render: function() {

      this.delegateEvents();



    },

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
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();
      
      Parse.User.logIn(username, password, {
        success: function(user) {
          window.appModel = new ManageTodosView();
          self.undelegateEvents();
          delete self;

          $('#myTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

          
   

        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          this.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    signUp: function(e) {
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
      
      // var username = this.$("#signup-username").val();
      // var password = this.$("#signup-password").val();
      
      // Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
      //   success: function(user) {
      //     window.appModel = new ManageTodosView();
      //     self.undelegateEvents();
      //     delete self;
          
      //     $('#myTab a').click(function (e) {
      //       e.preventDefault();
      //       $(this).tab('show');
      //     });

      //   },

      //   error: function(user, error) {
      //     self.$(".signup-form .error").html(error.message).show();
      //     this.$(".signup-form button").removeAttr("disabled");
      //   }
      // });

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

          $('#myTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
          });

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
