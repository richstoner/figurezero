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
    // map.fitBounds(new L.LatLngBounds(tlpoint, brpoint));
}

var zoomToGlobal = function (index) {
    // window.appModel.zoomTo(index);
}

var highlightMapGlobal = function (index) {
    // window.appModel.highlightMap(index);
}

var clearHighLightsGlobal = function () {
  // geojsonViewLayer.clearLayers();
}

var highlightRefGlobal = function (index) {
    window.appModel.highlightRef(index);
}

var clearRefHighLightsGlobal = function () {
  // refhighlightLayer.clearLayers();
}

var zoomRefGlobal = function (index) {
  // window.appModel.zoomRef(index);
}

var starFigureGlobal = function (parseID) {
  window.appModel.starFigure(parseID);
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
        'createAccountPressed',
        'signinPressed'
        );

      this.activeFigureID = $("#parseID").html();

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
              self.addAllRefs();
              self.addAllView();
              self.addFigureInfo();
          }


        },
        error: function(object, error) {
          console.log('error');

          $('#activityView').hide();

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
      // var self = this;
      // geojsonViewLayer.addData(activeFigure.get('viewArray')[index]);
    },

    // show the highlighted marker for the selected region
    highlightRef: function(index)
    {
      // var self = this;
      // refhighlightLayer.addData(activeFigure.get('referenceArray')[index]);
    },

    // populate the figure text and metadata contents
    addFigureInfo: function(e)
    {
      $("#figureTitle").html(activeFigure.get('figureTitle'));
      $("#figureDescription").html(activeFigure.get('figureDescription'));
      $("#figureAuthor").html(activeFigure.get('authorList'));
      document.title = activeFigure.get('figureTitle');
      $("#figureStatic").html('<img src="' + activeFigure.get('static_location') + '"/>');      
      
      var shorturl = activeFigure.get('shortenedURL');
      var qrcode = activeFigure.get('qrLinkURL');
      var tagarray = activeFigure.get('tag');

      tag_html = '';
      _.each(tagarray, function(object, index) { 
        tag_html += '<a href="/library/#/tag/' + object + '">' + object  + '</a>, ';
      });
      $("#figureTags").html(tag_html);

      $("#qrcode").html('<a target="_blank" href="' + qrcode + ' "><img style="width:200px; height:200px;" src="' + qrcode + '"/></a>' )
      $("#shortLinkURL").html('<a target="_blank" href="' + shorturl + ' ">' + shorturl + '</a>' )



      },

    // populate the figure views
    addAllView: function(e) {
      
      // if (map)
      // {
        this.$("#viewContainer").html("");

        // geojsonViewLayer.clearLayers();

        _.each(activeFigure.get('viewArray'), function(geojsonobj) {
          console.log(geojsonobj);
          var rectview = new rectView({model: geojsonobj});
          this.$("#viewContainer").append(rectview.render().el);

        });
      // }
    },

    // populate the reference markers
    addAllRefs: function(e) {

      // if (map)
      // {
          var currUser = Parse.User.current();
          var keys = Object.keys(activeFigure.getACL().permissionsById);
          var userFromACL = '';

          _.each(keys, function(key){       
              if (key == '*') {} 
              else {
                userFromACL = key;
              }
          });

          if (currUser)
          {

            if(currUser.id == userFromACL)
            {
                console.log('this is my figure');

                var starredstring = '<a class="btn btn-mini btn-primary dropdown-toggle" data-toggle="dropdown" href="#">Figure options<span class="caret"></span></a><ul class="dropdown-menu"><li><a class="" href="/fz/'+ activeFigure.id + '">Edit text</a></li><li><a class="" href="/roi/'+ activeFigure.id + '">Edit ROIs</a></li><li><a class="" href="/ref/'+ activeFigure.id + '">Edit references</a></li></ul>';
                  $("#starSpan").html(starredstring)
            }
            else
            {
                console.log('this is not my figure');

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
              // 

          }

        this.$("#referenceContainer").html("");

        _.each(activeFigure.get('referenceArray'), function(geojsonobj, index) {

          geojsonobj.index = index;
          var rectview = new pointView({model: geojsonobj});
          this.$("#referenceContainer").append(rectview.render().el);

        });
      // }     
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
      // resetMap();
    },

    render: function() {
      // $(this.el).html(this.template(this.model.toJSON()));
      this.delegateEvents();
    }
  });



/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/




//   var LogInView = Parse.View.extend({
//     events: {
//       "submit form.login-form": "logIn",
//       "submit form.signup-form": "signUp"
//     },



//     el: ".content",
    
//     initialize: function() {
//       _.bindAll(this, "logIn", "signUp");
//       this.render();
//     },

//     logIn: function(e) {
//       var self = this;
//       var username = this.$("#login-username").val();
//       var password = this.$("#login-password").val();
      
//       Parse.User.logIn(username, password, {
//         success: function(user) {
//           window.appModel = new ManageTodosView();
//           self.undelegateEvents();
//           delete self;

//           $('#myTab a').click(function (e) {
//             e.preventDefault();
//             $(this).tab('show');
//           });

//         },

//         error: function(user, error) {
//           self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
//           this.$(".login-form button").removeAttr("disabled");
//         }
//       });

//       this.$(".login-form button").attr("disabled", "disabled");

//       return false;
//     },

//     signUp: function(e) {
//       var self = this;
//       var username = this.$("#signup-username").val();
//       var password = this.$("#signup-password").val();
      
//       Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
//         success: function(user) {
//           window.appModel = new PublishAppView();
//           self.undelegateEvents();
//           delete self;
          
//           $('#myTab a').click(function (e) {
//             e.preventDefault();
//             $(this).tab('show');
//           });
// // dropDownButton

//         },

//         error: function(user, error) {
//           self.$(".signup-form .error").html(error.message).show();
//           this.$(".signup-form button").removeAttr("disabled");
//         }
//       });

//       this.$(".signup-form button").attr("disabled", "disabled");

//       return false;
//     },

//     render: function() {
//       this.$el.html(_.template($("#login-template").html()));
//       this.delegateEvents();
//     }
//   });


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

  });

  var state = new AppState;

  new AppRouter;
  new AppView;
});

/********************************************************************************************/
/********************************************************************************************/
/********************************************************************************************/














