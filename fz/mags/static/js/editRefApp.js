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

var refhighlightLayer;
var activeFigure;

var imageHeight;
var imageWidth;

var resetMap = function()
{
     map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
}

var zoomRefGlobal = function (index) {
  window.appModel.zoomRef(index);
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
    // geojsonLayer.clearLayers();
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
  window.appModel.deleteViewAtIndex(index);
}

$(window).resize(function() {
  $("#map").height(window.innerHeight - 100);
  $("#referenceContainer").height(window.innerHeight  - 540);

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
        $("#referenceContainer").height(window.innerHeight - 540);

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
            polyline: false,
            circle: false,
            polygon: false,
            rectangle: false
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
        // map.on('draw:rectangle-created', function (e) {
        //     drawnItems.clearLayers();
        //     drawnItems.addLayer(e.rect);
        // });
        // map.on('draw:circle-created', function (e) {
        //     drawnItems.clearLayers();
        //     drawnItems.addLayer(e.circ);
        // });
        map.on('draw:marker-created', function (e) {
            drawnItems.clearLayers();
            drawnItems.addLayer(e.marker);
        });
        map.addLayer(drawnItems);

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


function onEachPointFeature(feature, layer) {
    
    if (feature.properties && feature.properties.title) {

        layer.on('click', function(e) { 

            layer.bindPopup('<h3><a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed?term=' + feature.properties.id + ' "><i class="icon-share pull-right"></i></a><span class="heavier">' + feature.properties.title + '</span></h3><br><b>Authors :</b>' + feature.properties.authors + '<br><b>Abstract :</b>' + feature.properties.description + '</p>', {maxWidth:500});
            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
}


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


            if(feature.properties.title.indexOf("iframe") != -1)
            {
              layer.bindPopup('<iframe id="ytplayer" type="text/html" width="500" height="500" src="'+ feature.properties.id + '" frameborder="0"/>', {maxWidth:500});
            }
            else
            {
              layer.bindPopup('<h3><span class="heavier">' + feature.properties.title + '</span></h3><br>' + feature.properties.authors + '<br>' + feature.properties.description + '</p><p><a target="_blank" href="' + feature.properties.id + ' ">Original URL</a></p>', {maxWidth:500});  
            }
            
            
            var brpoint = new L.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
            map.panTo(brpoint);
            layer.openPopup();

        });
    }
  }


}

          // } else if (geojsonobj.properties.reftype == 'DX.DOI')
          // {
          //   dxLayer.addData(geojsonobj);
          // }else if (geojsonobj.properties.reftype == 'Youtube ID')
          // {
          //   ytLayer.addData(geojsonobj);
          // }else if (geojsonobj.properties.reftype == 'Vimeo ID')
          // {
          //   vimLayer.addData(geojsonobj);
          // }else if (geojsonobj.properties.reftype == 'Other URL')
          // {
          //   urlLayer.addData(geojsonobj);
          // }


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

  var rectViewView = Parse.View.extend({

    tagName:  "div",
    template: _.template($('#reference-template').html()),
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
      "click #reload-model-button": "reloadActiveFigure",
      "click #search-sourch": "searchSourceID",
      "click #search-pubmed": "searchSourceID",
      "click #search-doi": "searchDOI",
      "click #search-youtube": "searchYoutube",
      "click #search-vimeo": "searchVimeo",
      'keypress #pubmed-id': 'searchSourceID',
      'keypress #youtube-id': 'searchYoutube',
      'keypress #vimeo-id': 'searchVimeo',
      'keypress #doi-url': 'searchDOI'
      // "click #approveFigure" : "approveFigure",
      // "click #conversionError" : "conversionError",
    },

    el: ".content",

    initialize: function() {
      var self = this;

      _.bindAll(this, 
        'render', 
        'searchSourceID',
        'logOut', 
        'moveItemUp', 
        'moveItemDown', 
        'reloadImageView',
        'reloadActiveFigure', 
        'deleteViewAtIndex', 
        'zoomTo', 
        'highlightMap', 
        'saveCurrentView', 
        'addAllRefs', 
        'saveModelButtonClick', 
        'nextViewButton',
        'searchYoutube',
        'searchVimeo',
        'searchDOI',
        'highlightRef','zoomRef');

      this.$el.html(_.template($("#manage-todos-template").html()));      
      this.activeFigureID = $("#parseID").html();
      
      // this.activeFigure = new FigureObject();
      this.query = new Parse.Query(FigureObject); 

      this.lastSearchObject = {}

      this.query.get(this.activeFigureID, {

        success: function(figureobject) {
          
          activeFigure = $.extend(true, {}, figureobject);
          var fojson = figureobject.toJSON();

          console.log(fojson);

          if (fojson.stat >= 7)
          {

            console.log('here...');
            console.log($('#reference-type'))

            $('#reference-type').change(function() {
              
              $("#youtubethumb").hide();

              // console.log('here...');

              if ($("#reference-type").val() == 'Pubmed ID') {

                $("#pudmedinput").show();
                $("#doiinput").hide();
                $("#youtubeinput").hide();
                $("#vimeoinput").hide();
                $("#otherinput").hide();

              }
              else if ($("#reference-type").val() == 'DX.DOI') {

                $("#pudmedinput").hide();
                $("#doiinput").show();
                $("#youtubeinput").hide();
                $("#vimeoinput").hide();
                $("#otherinput").hide();

              }
              else if ($("#reference-type").val() == 'Youtube ID') {

                $("#pudmedinput").hide();
                $("#doiinput").hide();
                $("#youtubeinput").show();
                $("#vimeoinput").hide();
                $("#otherinput").hide();


              } 
              else if ($("#reference-type").val() == 'Vimeo ID') {

                $("#pudmedinput").hide();
                $("#doiinput").hide();
                $("#youtubeinput").hide();
                $("#vimeoinput").show();
                $("#otherinput").hide();
                

              }

              else if ($("#reference-type").val() == 'Other URL') {

                $("#pudmedinput").hide();
                $("#doiinput").hide();
                $("#youtubeinput").hide();
                $("#vimeoinput").hide();
                $("#otherinput").show();
                

              }

              else if ($("#reference-type").val() == '3. Select a reference type') {

                $("#doiinput").hide();
                $("#youtubeinput").hide();
                $("#vimeoinput").hide();
                $("#otherinput").hide();
                $("#pudmedinput").hide();

              }


            });

            loadMapFromFigureObject(figureobject);
            self.addAllRefs();


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

      $('#activityView').show();

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

            self.addAllRefs();
          }

          $('#activityView').fadeOut(500);
        },
        error: function(object, error) {

          // alert('figure not available - it may not be public');
          // $('#activityView').fadeOut(500);
          // console.log(error);
          window.location = "/library";
          
        }

      });

    },
    zoomTo: function(index)
    {
    },
    highlightMap: function(index)
    {
    },
    zoomRef: function(index)
    {
        var self = this;
        var regionObj = activeFigure.get('referenceArray')[index];
        var brpoint = new L.LatLng(regionObj.geometry.coordinates[1], regionObj.geometry.coordinates[0]);
        map.panTo(brpoint);
    },
    highlightRef: function(index)
    {
      var self = this;
      // console.log(activeFigure.get('referenceArray')[index])

      refhighlightLayer.addData(activeFigure.get('referenceArray')[index]);

      // geojsonViewLayer.addData(activeFigure.get('referenceArray')[index]);

    },

    moveItemUp: function(index)
    {
      if(index > 0)
      {
        //dont touch top view
        activeFigure.get('referenceArray')[index -1]= activeFigure.get('referenceArray').splice(index, 1, activeFigure.get('referenceArray')[ index -1 ])[0];

        $('#save-model-button').removeClass("disabled");


        // activeFigure.save({
        //   success: function(object) {},
        //   error: function(object, error) {}
        // });

        this.addAllRefs();



      }
    },
    moveItemDown: function(index)
    {
      if(index < activeFigure.get('referenceArray').length -1)
      {
        // don't touch if bottom view moving down
        activeFigure.get('referenceArray')[index]= activeFigure.get('referenceArray').splice(index + 1, 1, activeFigure.get('referenceArray')[ index ])[0];
        this.addAllRefs();

        $('#save-model-button').removeClass("disabled");


        // activeFigure.save({
        //   success: function(object) {},
        //   error: function(object, error) {}
        // });
      }

    },
    deleteViewAtIndex: function(index)
    {
      
      var r=confirm("Confirm delete of  Ref. #" + index);
      var self = this;
      if (r==true)
      {

        activeFigure.get('referenceArray').splice(index,1);
        activeFigure.save({
          success: function(object) {

            $('#save-model-button').addClass("disabled");

          },
          error: function(object, error) {}
        });

        pubmedLayer.clearLayers();
        self.addAllRefs();

      }
    },
    nextViewButton: function(e)
    {

      window.location = "/library";

      // activeFigure.save({

      //   success: function(object) {
        
      //     console.log('save successful');
      //     // window.location = "/preview/" + object.id;
          
      //   },

      //   error: function(object, error) {
            
      //       console.log(error);
            
      //   }
      // });

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


    searchVimeo: function(e)
    {

      var self = this;

      if (e.keyCode == 13 || e.type == 'click')
      {
        var video_id = $("#vimeo-id").val();

        if(video_id.indexOf("vimeo.com/") != -1)
        {
          // this contains a doi tag, replace with URL
          video_id = $.trim(video_id.substr(video_id.indexOf("vimeo.com/") + 10));
          $("#vimeo-id").val(video_id);
        }

        $.getJSON('http://vimeo.com/api/v2/video/' + video_id + '.json?callback=?',function(data,status,xhr){
            
            console.log(data);
            var videoobj = data[0];

            self.lastSearchObject = data[0];


            $('#pubmed-title').val(videoobj.title).fadeIn(500);
            $('#pubmed-authors').val(videoobj.user_name).fadeIn(500);
            $('#pubmed-abstract').val(videoobj.description).fadeIn(500);

            $('#youtubethumb').html('<img style="float:right" src="' + videoobj.thumbnail_small + '"/>' )
            $('#youtubethumb').fadeIn(500);
        });
      }
    },

    searchDOI:function(e)
    {

      var self = this;
      // console.log(e)

      if (e.keyCode == 13 || e.type == 'click')
      {
        var doiid = $("#doi-url").val();

        if(doiid.indexOf("doi:") != -1)
        {
          // this contains a doi tag, replace with URL
          doiid = 'http://dx.doi.org/' + doiid.substr(4);
          $("#doi-url").val(doiid);
          // console.log(doiid)
        }
        else if(doiid.indexOf("dx.doi.org/") != -1)
        {
          // this contains url, do nothing
          doiid = doiid;
          $("#doi-url").val(doiid);
          // console.log(doiid)
        }
        else
        {
          // this doesn't contain either, append url
          doiid = 'http://dx.doi.org/' + doiid;
          $("#doi-url").val(doiid);
        }

        

        $.getJSON("http://figurezero.com/doi/" + doiid, function(data){
          
            self.lastSearchObject = data;

            var authorstr = '';
            _.each(data.author, function(auth) {

                authorstr += auth.family
                authorstr += ', ';
                authorstr += auth.given[0];
                authorstr += '. ';
            });

            $('#pubmed-title').val(data.title).fadeIn(500);
            $('#pubmed-authors').val(authorstr).fadeIn(500);
            $('#pubmed-abstract').val("").fadeIn(500);
     
        });

        // $.getJSON('http://gdata.youtube.com/feeds/api/videos/'+video_id+'?v=2&alt=jsonc',function(data,status,xhr){
        //     // alert(data.data.title);
        //     // data contains the JSON-Object below
        //     $('#pubmed-title').val(data.data.title).fadeIn(500);
        //     $('#pubmed-authors').val(data.data.uploader).fadeIn(500);
        //     $('#pubmed-abstract').val(data.data.description).fadeIn(500);

        //     $('#youtubethumb').html('<img style="float:right" src="' + data.data.thumbnail.sqDefault + '"/>' )
        //     $('#youtubethumb').fadeIn(500);
        // });
      }
      
// curl -LH "Accept: application/citeproc+json" http://dx.doi.org/10.1038/nrd842

    },

    searchYoutube: function(e)
    {
      var self = this;

      if (e.keyCode == 13 || e.type == 'click')
      {
        var video_id = $("#youtube-id").val();

        if(video_id.indexOf("watch?v=") != -1)
        {
          // this contains a doi tag, replace with URL
          video_id = $.trim(video_id.substr(video_id.indexOf("watch?v=") + 8));
          // console.log(video_id)
          $("#youtube-id").val(video_id);
        }
        // watch?v=zXLeJFu57Wg


        $.getJSON('http://gdata.youtube.com/feeds/api/videos/'+video_id+'?v=2&alt=jsonc',function(data,status,xhr){
            // alert(data.data.title);
            // data contains the JSON-Object below

            self.lastSearchObject = data.data;

            $('#pubmed-title').val(data.data.title).fadeIn(500);
            $('#pubmed-authors').val(data.data.uploader).fadeIn(500);
            $('#pubmed-abstract').val(data.data.description).fadeIn(500);

            $('#youtubethumb').html('<img style="float:right" src="' + data.data.thumbnail.sqDefault + '"/>' )
            $('#youtubethumb').fadeIn(500);
        });
      }
    },

    searchSourceID: function(e)
    {

        var self = this;

        console.log('searching pubmed');

        if (e.keyCode == 13 || e.type == 'click')
        {
            var ref_type = $("#reference-type").val();
            var ref_url = $("#pubmed-id").val();

            pubmedURL = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=" + ref_url + "&retmode=xml";

            // console.log(pubmedURL)

            $.get(pubmedURL, function(xml) {
                // console.log(xml)
                // console.log('pm found')

                $imgxml = $(xml).find("ArticleTitle");
                $abstract = $(xml).find("AbstractText");

                $authorlist = $(xml).find("LastName");

                var authorstr = '';

                $('Author', $(xml)).each(function() {
                
                    var lname = $('LastName',this).text();
                    var fname = $('ForeName',this).text();

                    authorstr += lname;
                    authorstr += ', ';
                    authorstr += fname[0];
                    authorstr += '. ';
                });

                // console.log($('#pubmed-title'))
                // console.log($imgxml.text())

                $('#pubmed-title').val($imgxml.text()).fadeIn(500);
                $('#pubmed-authors').val(authorstr).fadeIn(500);
                $('#pubmed-abstract').val($abstract.text()).fadeIn(500);
            }, 'xml');
        }
    },

    saveCurrentView: function(e)
    {

      var self = this;

      var ref_type = this.$("#reference-type").val();

      if (ref_type == "Pubmed ID")
      {

        var ref_title = this.$("#pubmed-title").val();
        var ref_url = this.$("#pubmed-id").val();
        var ref_abstract = this.$("#pubmed-abstract").val();
        var ref_authors = this.$("#pubmed-authors").val();
        
        var geojsonobj = {};
        if(ref_title.length > 0)
        {

          drawnItems.eachLayer(function (layer) {        
            
            geojsonobj.geometry = layerToGeometry(layer);

            var latdif = tlpoint.lat - brpoint.lat;
            var lngdif = brpoint.lng - tlpoint.lng;

            // console.log(lngdif, latdif);

            var realY = imageHeight * geojsonobj.geometry.coordinates[1] / latdif;
            var realX = imageWidth * geojsonobj.geometry.coordinates[0] / lngdif;

            var nativeCoords = [realX, realY];

            propertyDict = {
              title: ref_title,
              description: ref_abstract,
              id: ref_url,
              authors: ref_authors,
              reftype: ref_type,
              nativeCoords: nativeCoords
            };

            geojsonobj.properties = propertyDict;
            geojsonobj.type = 'Feature';

            activeFigure.get('referenceArray').push(geojsonobj);

          });

          drawnItems.clearLayers();

          self.addAllRefs();

          // drawnItems.clearLayers();
          this.$("#pubmed-title").val("");
          this.$("#pubmed-abstract").val("");
          this.$("#pubmed-authors").val("");
          this.$("#pubmed-id").val("");

          activeFigure.save({
            success: function(object) {},
            error: function(object, error) {}
          });

        }
        else
        {
          self.$("#saveViewError").html("Title cannot be blank.").show().fadeOut(5000);
        }
      }
      else if (ref_type == "DX.DOI")
      {

        var ref_title = this.$("#pubmed-title").val();
        // var ref_url = this.$("#doi-url").val();
        var ref_abstract = this.$("#pubmed-abstract").val();
        var ref_authors = this.$("#pubmed-authors").val();
        


        var ref_url = $("#doi-url").val();

        if(ref_url.indexOf("doi:") != -1)
        {
          // this contains a doi tag, replace with URL
          ref_url = 'http://dx.doi.org/' + ref_url.substr(4);
          // $("#doi-url").val(doiid);
          // console.log(doiid)
        }
        else if(ref_url.indexOf("dx.doi.org/") != -1)
        {
          // this contains url, do nothing
          ref_url = ref_url;
          // $("#doi-url").val(doiid);
          // console.log(doiid)
        }
        else
        {
          // this doesn't contain either, append url
          ref_url = 'http://dx.doi.org/' + ref_url;
          // $("#doi-url").val(doiid);
        }
        


        var geojsonobj = {};
        if(ref_title.length > 0)
        {

          drawnItems.eachLayer(function (layer) {        
            
            geojsonobj.geometry = layerToGeometry(layer);

            var latdif = tlpoint.lat - brpoint.lat;
            var lngdif = brpoint.lng - tlpoint.lng;
            var realY = imageHeight * geojsonobj.geometry.coordinates[1] / latdif;
            var realX = imageWidth * geojsonobj.geometry.coordinates[0] / lngdif;

            var nativeCoords = [realX, realY];

            propertyDict = {
              title: ref_title,
              description: ref_abstract,
              id: ref_url,
              authors: ref_authors,
              reftype: ref_type,
              nativeCoords: nativeCoords
            };

            geojsonobj.properties = propertyDict;
            geojsonobj.type = 'Feature';

            activeFigure.get('referenceArray').push(geojsonobj);

          });

          drawnItems.clearLayers();

          self.addAllRefs();

          // drawnItems.clearLayers();
          this.$("#pubmed-title").val("");
          this.$("#pubmed-abstract").val("");
          this.$("#pubmed-authors").val("");
          this.$("#doi-url").val("");


          activeFigure.save({
            success: function(object) {},
            error: function(object, error) {}
          });

        }
        else
        {
          self.$("#saveViewError").html("Title cannot be blank.").show().fadeOut(5000);
        }
      } else if (ref_type == "Youtube ID")
      {

        var ref_title = this.$("#pubmed-title").val();
        var ref_url = this.$("#youtube-id").val();
        var ref_abstract = this.$("#pubmed-abstract").val();
        var ref_authors = this.$("#pubmed-authors").val();
        
        var geojsonobj = {};
        if(ref_title.length > 0)
        {

          drawnItems.eachLayer(function (layer) {        
            
            geojsonobj.geometry = layerToGeometry(layer);

            var latdif = tlpoint.lat - brpoint.lat;
            var lngdif = brpoint.lng - tlpoint.lng;
            var realY = imageHeight * geojsonobj.geometry.coordinates[1] / latdif;
            var realX = imageWidth * geojsonobj.geometry.coordinates[0] / lngdif;

            var nativeCoords = [realX, realY];

            propertyDict = {
              title: ref_title,
              description: ref_abstract,
              id: ref_url,
              authors: ref_authors,
              reftype: ref_type,
              nativeCoords: nativeCoords
            };

            geojsonobj.properties = propertyDict;
            geojsonobj.type = 'Feature';

            activeFigure.get('referenceArray').push(geojsonobj);

          });

          drawnItems.clearLayers();

          self.addAllRefs();

          // drawnItems.clearLayers();
          this.$("#pubmed-title").val("");
          this.$("#pubmed-abstract").val("");
          this.$("#pubmed-authors").val("");
          this.$("#youtube-id").val("");


          activeFigure.save({
            success: function(object) {},
            error: function(object, error) {}
          });

        }
        else
        {
          self.$("#saveViewError").html("Title cannot be blank.").show().fadeOut(5000);
        }
      } else if (ref_type == "Vimeo ID")
      {

        var ref_title = this.$("#pubmed-title").val();
        var ref_url = this.$("#vimeo-id").val();
        var ref_abstract = this.$("#pubmed-abstract").val();
        var ref_authors = this.$("#pubmed-authors").val();
        
        var geojsonobj = {};
        if(ref_title.length > 0)
        {

          drawnItems.eachLayer(function (layer) {        
            
            geojsonobj.geometry = layerToGeometry(layer);

            var latdif = tlpoint.lat - brpoint.lat;
            var lngdif = brpoint.lng - tlpoint.lng;
            var realY = imageHeight * geojsonobj.geometry.coordinates[1] / latdif;
            var realX = imageWidth * geojsonobj.geometry.coordinates[0] / lngdif;

            var nativeCoords = [realX, realY];

            propertyDict = {
              title: ref_title,
              description: ref_abstract,
              id: ref_url,
              authors: ref_authors,
              reftype: ref_type,
              nativeCoords: nativeCoords
            };

            geojsonobj.properties = propertyDict;
            geojsonobj.type = 'Feature';

            activeFigure.get('referenceArray').push(geojsonobj);

          });

          drawnItems.clearLayers();

          self.addAllRefs();

          // drawnItems.clearLayers();
          this.$("#pubmed-title").val("");
          this.$("#pubmed-abstract").val("");
          this.$("#pubmed-authors").val("");
          this.$("#vimeo-id").val("");


          activeFigure.save({
            success: function(object) {},
            error: function(object, error) {}
          });

        }
        else
        {
          self.$("#saveViewError").html("Title cannot be blank.").show().fadeOut(5000);
        }
      }
      else if (ref_type == "Other URL")
      {

        var ref_title = this.$("#pubmed-title").val();
        var ref_url = this.$("#other-url").val();
        var ref_abstract = this.$("#pubmed-abstract").val();
        var ref_authors = this.$("#pubmed-authors").val();
        
        var geojsonobj = {};
        if(ref_title.length > 0)
        {

          drawnItems.eachLayer(function (layer) {        
            
            geojsonobj.geometry = layerToGeometry(layer);

            var latdif = tlpoint.lat - brpoint.lat;
            var lngdif = brpoint.lng - tlpoint.lng;
            var realY = imageHeight * geojsonobj.geometry.coordinates[1] / latdif;
            var realX = imageWidth * geojsonobj.geometry.coordinates[0] / lngdif;

            var nativeCoords = [realX, realY];

            propertyDict = {
              title: ref_title,
              description: ref_abstract,
              id: ref_url,
              authors: ref_authors,
              reftype: ref_type,
              nativeCoords: nativeCoords
            };

            geojsonobj.properties = propertyDict;
            geojsonobj.type = 'Feature';

            activeFigure.get('referenceArray').push(geojsonobj);

          });

          drawnItems.clearLayers();

          self.addAllRefs();

          // drawnItems.clearLayers();
          this.$("#pubmed-title").val("");
          this.$("#pubmed-abstract").val("");
          this.$("#pubmed-authors").val("");
          this.$("#other-url").val("");


          activeFigure.save({
            success: function(object) {},
            error: function(object, error) {}
          });

        }
        else
        {
          self.$("#saveViewError").html("Title cannot be blank.").show().fadeOut(5000);
        }
      }





   
      
      return false;
    },

    addAllRefs: function(e) {

      if (map)
      {

        this.$("#referenceContainer").html("");

        _.each(activeFigure.get('referenceArray'), function(geojsonobj, index) {

          // console.log(geojsonobj);

          geojsonobj.index = index;

          var rectview = new rectViewView({model: geojsonobj});
          
          this.$("#referenceContainer").append(rectview.render().el);

          // console.log(geojsonobj.properties);


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
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();
      
      Parse.User.logIn(username, password, {
        success: function(user) {
          window.appModel = new ManageTodosView();
          self.undelegateEvents();
          delete self;
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
