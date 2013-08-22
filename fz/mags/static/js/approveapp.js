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


var map;
var tlpoint;
var brpoint;

var resetMap = function(){
    map.fitBounds(new L.LatLngBounds(
        tlpoint, 
        brpoint
    ));
}

$(window).resize(function() {
  $("#map").height(window.innerHeight - 100);

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

        map = new L.Map('map', {
            crs: L.CRS.Direct,
            center: new L.LatLng(0, 0),
            zoom: maxLOD,
            minZoom: 1,
            worldCopyJump: false,
            attributionControl: false
        });

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
    }

}


$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize("nY5yXtyaq5zJ1TnCfGOBDa6vu9IX9WwhDJTxx6eu",
                   "2HnPlp2kBNpS66dsPdVHRlec1b8BVzKnbZc5XknC");


  // FigureObject Model
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


  // This is the transient application state, not persisted on Parse
  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
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
      "click #approveFigure" : "approveFigure",
      "click #conversionError" : "conversionError",
      "click #refreshProcButton" : "checkIfFileDone"
    },

    el: ".content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

      _.bindAll(this, 'render', 'logOut', 'reloadImageView', 'approveFigure', 'conversionError', 'checkIfFileDone');

      // Main todo management template
      this.$el.html(_.template($("#manage-todos-template").html()));
      
      _gaq.push(['_trackEvent', 'Approve', 'Approve view initialized']);


      this.activeFigureID = $("#parseID").html();

      this.query = new Parse.Query(FigureObject);     
      this.query.equalTo("user", Parse.User.current()); 
      this.query.get(this.activeFigureID, {

        success: function(figureobject) {

          this.activeFigure = figureobject;
          var fojson = figureobject.toJSON();
          
          if (fojson.stat >= 6)
          {
            console.log('figure ready for approval');



            $('#_filename').fadeOut(500, function() {
              $(this).text(fojson.originalFilename).fadeIn(500);
            });

            $('#_filesize').fadeOut(500, function() {
              $(this).text(fojson.originalFileSize + " bytes").fadeIn(500);
            });

            $('#_procstatus').fadeOut(500, function() {
              $(this).text(fojson.stat + ',' + fojson.processingStatus).fadeIn(500);
            });

            $('#_imagesize').fadeOut(500, function() {
              $(this).text(fojson.originalImageSize).fadeIn(500);
            });

            loadMapFromFigureObject(figureobject);

            if( fojson.stat >= 7)
            {
              console.log('figure already approved');

              $('#approvalBlock').fadeOut(500, function() {

                  var htmlString = '<center><h3 id="homeContent">Figure approved.</h3>';
                  htmlString += '<p>You can now edit the occompanying text...</p>';
                  htmlString += '<p><a href="/fz/' + figureobject.id + '" class="btn" type="button">Edit figure text  <i class="icon-arrow-right"></i></a></p><br>';
                  
                  htmlString += '<p>or define important regions of interest...</p>';
                  htmlString += '<p><a href="/roi/' + figureobject.id + '" class="btn" type="button">Edit regions  <i class="icon-arrow-right"></i></a></p><br>';
                  
                  htmlString += '<p><p>or embed references from Pubmed or videos from youtube & vimeo... </p>';
                  htmlString += '<a href="/ref/' + figureobject.id + '" class="btn" type="button">Edit references  <i class="icon-arrow-right"></i></a></p><br>';
                  
                  htmlString += '<p>or return to your library </p>';
                  htmlString += '<p><a href="/library" class="btn btn-small btn-inverse" type="button">Return to library</a></p><br></center>';
                
                  $(this).html(htmlString).fadeIn(500);

                  // $(this).html('<h3 id="title">Figure already approved.</h3><br><a href="/roi/' + figureobject.id + '" class="btn btn-success btn-large btn-block" type="button">Add metadata</a> <br><a href="/library" class="btn btn-large btn-block" type="button">return to figure list.</a>').fadeIn(500);
              });

            }
            else
            {
              $('#approvalBlock').fadeIn(500, function(){
                $(this).html('<center><h3 id="title">Before we continue, <br>please review the conversion</h3><br><p><button class="btn btn-success btn-large btn-block" id="approveFigure" type="button">Figure appears correct. <i class="icon-check icon-white"></i></button></p><br><p><button class="btn btn-danger btn-block" id="conversionError" type="button">Something went wrong, discard....</button></p></center>');
              });
            }
          }
          else
          {
            
            $('#_filename').fadeOut(500, function() {
              $(this).text(fojson.originalFilename).fadeIn(500);
            });

            $('#_procstatus').fadeOut(500, function() {
              $(this).text(fojson.stat + ',' + fojson.processingStatus).fadeIn(500);
            });

            $('#approvalBlock').fadeOut(500, function() {
                var htmlString = '<h3 id="title">Figure still in conversion queue...</h3>';
                  htmlString += '<a href="#" id="refreshProcButton" class="btn btn-large btn-block" type="button">Refresh status</a>';
                  htmlString += '<a href="/library" class="btn btn-large btn-block" type="button">Return to figure list.</a>'
                  $(this).html(htmlString).fadeIn(500);
            });

          }
        },
        error: function(object, error) {
          // alert('figure not found?');
          window.location = "/library";
        }
      });
    },

    checkIfFileDone: function(e)
    {
      _gaq.push(['_trackEvent', 'Approve', 'Refresh status']);

      this.query.get(this.activeFigureID, {
        success: function(figureobject) {

          this.activeFigure = figureobject;


          
          var fojson = figureobject.toJSON();
          // console.log(fojson);
          if (fojson.stat >= 6)
          {
            console.log('figure ready for approval');

            $('#_filename').fadeOut(500, function() {
              $(this).text(fojson.originalFilename).fadeIn(500);
            });

            $('#_filesize').fadeOut(500, function() {
              $(this).text(fojson.originalFileSize + " bytes").fadeIn(500);
            });

            $('#_procstatus').fadeOut(500, function() {
              $(this).text(fojson.stat + ',' + fojson.processingStatus).fadeIn(500);
            });

            $('#_imagesize').fadeOut(500, function() {
              $(this).text(fojson.originalImageSize).fadeIn(500);
            });

            loadMapFromFigureObject(figureobject);

            if( fojson.stat >= 7)
            {
              $('#approvalBlock').fadeOut(500, function() {
                  var htmlString = '<h3 id="title">Figure already approved.</h3>';
                  htmlString += '<a href="/fz/' + figureobject.id + '" class="btn btn-small btn-primary" type="button">Edit text</a>';
                  htmlString += '<a href="/roi/' + figureobject.id + '" class="btn btn-small btn-primary" type="button">Edit views</a>';
                  htmlString += '<a href="/ref/' + figureobject.id + '" class="btn btn-small btn-primary" type="button">Edit references</a>';
                  htmlString += '<a href="/library" class="btn btn-small btn-inverse" type="button">Return to library</a></div><br>';
                
                  $(this).html(htmlString).fadeIn(500);

              });
            }
            else
            {
              $('#approvalBlock').fadeIn(500, function(){
                $(this).html('<h3 id="title">Before we continue, <br>please review the conversion</h3><br><div class="btn-group"><button class="btn btn-success btn-block" id="approveFigure" type="button">Okay <i class="icon-check icon-white"></i></button><button class="btn btn-danger btn-block" id="conversionError" type="button">Something went wrong</button></div>');
              });
            }
          }
          else
          {

            $('#_filename').fadeOut(500, function() {
              $(this).text(fojson.originalFilename).fadeIn(500);
            });

            $('#_procstatus').fadeOut(500, function() {
              $(this).text(fojson.stat + ',' + fojson.processingStatus).fadeIn(500);
            });
          
            $('#approvalBlock').fadeOut(500, function() {
                // $(this).html('<h3 id="title">Figure in process queue.</h3> <div id="APPactivityView"></div><br><a href="#" id="refreshProcButton" class="btn btn-large btn-block" type="button">Refresh</a>').fadeIn(500);

                  var htmlString = '<h3 id="title">Figure still in conversion queue...</h3>';
                  htmlString += '<a href="#" id="refreshProcButton" class="btn btn-large btn-block" type="button">Refresh status</a>';
                  htmlString += '<a href="/library" class="btn btn-large btn-block" type="button">Return to figure list.</a>'
                  $(this).html(htmlString).fadeIn(500);
            });
          }
  
        },
        error: function(object, error) {
          window.location = "/library";
          // alert('figure not found?');
        }
      });

    },

    reloadImageView: function(e)
    {
      resetMap();
    },

    approveFigure: function(e)
    {
      
    _gaq.push(['_trackEvent', 'Approve', 'Approved figure']);

      this.query.first({
        success: function(figureobject) {

            figureobject.set('stat', 7);
            figureobject.save(null, {
              success: function(object) {
                

                console.log('success');

                $('#_procstatus').fadeOut(500, function() {
                  $(this).text(figureobject.stat + ',' + figureobject.processingStatus).fadeIn(500);
                });

                 $('#approvalBlock').fadeOut(100, function() {
                  var htmlString = '<center><h3 id="homeContent">Figure approved.</h3>';
                  htmlString += '<p>You can now edit the occompanying text...</p>';
                  htmlString += '<p><a href="/fz/' + figureobject.id + '" class="btn" type="button">Edit figure text  <i class="icon-arrow-right"></i></a></p><br>';
                  
                  htmlString += '<p>or define important regions of interest...</p>';
                  htmlString += '<p><a href="/roi/' + figureobject.id + '" class="btn" type="button">Edit regions  <i class="icon-arrow-right"></i></a></p><br>';
                  
                  htmlString += '<p><p>or embed references from Pubmed or videos from youtube & vimeo... </p>';
                  htmlString += '<a href="/ref/' + figureobject.id + '" class="btn" type="button">Edit references  <i class="icon-arrow-right"></i></a></p><br>';
                  
                  htmlString += '<p>or return to your library </p>';
                  htmlString += '<p><a href="/library" class="btn btn-small btn-inverse" type="button">Return to library</a></p><br></center>';
                
                  $(this).html(htmlString).fadeIn(500);

                });


              },
              error: function(object, error) {
                
                alert(error);
              }

            });

           
        },
        error: function(error) {
          alert("Error: " + error.code + " " + error.message);
        }
      });
    },
    conversionError: function(e)
    {
      _gaq.push(['_trackEvent', 'Approve', 'Conversion error clicked']);

      var r=confirm("Confirm delete of this upload?");
      var self = this;
     
      if (r==true)
      {
        // confirm delete
        this.query.first({

          success: function(fzobj) {
            // The object was retrieved successfully.
            fzobj.destroy({
              success: function(myObject) {
                
                _gaq.push(['_trackEvent', 'Approve', 'Conversion error, figure removed']);

                window.location = "http://figurezero.com/library";
              },
              error: function(myObject, error) {
                
              }
            });

          },
          error: function(object, error) {
            console.log('object not retrieved successfully');
            
          }
        });
      }
    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      var self = this;
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete self;
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
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
      //     new ManageTodosView();
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
          new ManageTodosView();
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
        new ManageTodosView();
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

