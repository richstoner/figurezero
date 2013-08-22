// -3 conversion failed
// -2 unsupported file type
// -1 upload failed

// 0 created upload object
// 1 uploaded object to s3
// 2 message added to upload queue
// 3 message received from upload queue
// 4 downloaded from s3
// 5 conversion okay
// 6 tiles created
// 7 image approved

// 10 image published

var deleteFZObjectGlobal = function(parseID)
{
  window.appModel.deleteFZObject(parseID);
}

var publishModelGlobal = function(parseID, publishBOOL)
{
  window.appModel.publishModel(parseID, publishBOOL);
}

var starFigureGlobal = function(parseID)
{
  window.appModel.starFigure(parseID);
}




var searchTitleGlobal = function(searchTerm)
{
  $("#searchQuery").val(searchTerm)
  window.appModel.searchTitle();
}

var searchTagGlobal = function(searchTerm)
{
  $("#searchQuery").val(searchTerm)
}

var setSortStateGlobal = function(sortState)
{
  window.appModel.updateSort(sortState);
}

var publishModelGlobal = function(modelID, pbool)
{
  window.appModel.publishModel(modelID, pbool);
}



$(window).resize(function() {
  // $("#myFiguresDiv").height(window.innerHeight - 120);
});


$(function() {

var map;
var defaultTileLayer;
var drawnItems;
var tlpoint;
var brpoint;
var layerid;
var searchType;


var filterType;
var groupName;



  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize("nY5yXtyaq5zJ1TnCfGOBDa6vu9IX9WwhDJTxx6eu", "2HnPlp2kBNpS66dsPdVHRlec1b8BVzKnbZc5XknC");

  var FigureObject = Parse.Object.extend("UploadObject",
  {
      parseDict: {},
      initialize: function() {
        // console.log("initialized FZ object");
      }
  });

  var FigureList = Parse.Collection.extend({
    model: FigureObject
  });


var FigureView = Parse.View.extend({

    tagName:  "tr",
    template: _.template($('#figure-template').html()),

    initialize: function() {
      _.bindAll(this, 'render', 'updateWithParseData');
    },

    render: function() {

      $(this.el).html(this.template(this.model.toJSON()));      

      return this;
    },

    updateWithParseData: function(input) {
      this.model.set("parseDict", input);
    }

  });

/******************************************************************************/

  var MainApplicationView = Parse.View.extend({

    singleFigureTemplate: _.template($('#figure-template').html()),

    events: {
      "click #logoutButton": "logOut",
      "click #refreshButton": "refreshEntries",
      "click #showStarred" : "showStarred",
      "click #showUploads" : "showUploads",
      "click #showAllPublic" : "showAll",
      "click #titleSearch" : "searchTitle",
      "click #tagSearch" : "searchTag",
      "click #resetSearch" : "resetSearch",
      "change #fileUpload" : "uploadChanged",
      "submit #uploadForm" : "uploadSubmit",
      "click #btnShowMe" : "showMePressed",
      "click #signin-button" : "signinPressed",
      'click #clearSearch' : 'resetSearch',
      "keypress #signup-password" : "signinPressed",
      "click #createaccount-button" : "createAccountPressed",
      "keypress #signup-email" : "createAccountPressed"
    },

    el: ".content",

    initialize: function() {
      var self = this;
  
      _.bindAll(this, 
        'render', 
        'publishModel',
        'logOut',
        'addOne',
        'addAll',
        'refreshEntries',
        'deleteFZObject',
        'showStarred',
        'showUploads',
        'showAll',
        'searchTitle',
        'searchTag',
        'resetSearch',
        'starFigure',
        'uploadChanged',
        "uploadSubmit",
        'updateSort', 
        'signinPressed',
        'createAccountPressed',
        'populateFigureList',
        'showMePressed'
        );

      this.searchState = 0;
      this.sortState = 0; 
      //0 ascending, create
      //1 descending create
      //2 ascending title
      //3 descending title
      
      // Main todo management template
      this.$el.html(_.template($("#manage-todos-template").html()));

      this.activeIndex = 0;
      this.activeFigures = new FigureList;
      this.activeFigures.bind('reset',   this.addAll);

      self.populateFigureList();

      var currentUser = Parse.User.current();
      if (currentUser) {
        currentUser.fetch({
          success: function(user){
          // console.log('updated user');
          }
        });
      }
      else
      {

        if($.cookie('fzFirstLibrary') == null) { 
          $.cookie('fzFirstLibrary', '1', {expires:1, path:'/'});
          // $("#welcomeModal").modal('show')
        }
        else
        {
          $("#welcomeModal").modal('show') 
        } 
      }
      
      $('#activityView')
          .hide()  // hide it initially
          .ajaxStart(function() {
              $(this).show();
          })
          .ajaxStop(function() {
              $(this).hide();
          })
      ;

      $('#searchForm').submit(function() {

          if ($("#searchQuery").val().length > 0) {
            // self.searchTitle();

            // tag/:id": "searchTag",
            _gaq.push(['_trackEvent', 'Library', 'Search via form']);

            window.location = 'http://wsie.cc/library/#/title/' + $("#searchQuery").val()

          }
          else
          {
            self.resetSearch();
          }

        return false;
      });
    },
    clearSearchPress: function(e)
    {

    },
    showMePressed: function(e)
    {
      $("#welcomeModal").modal('hide');
      $("#myModal").modal('show');
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
            window.appModel = new MainApplicationView();
            
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
            window.appModel = new MainApplicationView();
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
    updateSort: function(_newState)
    {
      // console.log(_newState);


      this.sortState = _newState;
      this.populateFigureList();

    },
    uploadSubmit: function() {

          var self = this;
          var fd = new FormData();

          var key = $("input[name=key]").val() + '/' + $("input[name=file]")[0].files[0].name 

          self.newUploadOject.set('key', key);

          fd.append('key', key);
          fd.append('AWSAccessKeyId', $("#accesskey").val());
          fd.append('acl', 'private');
          fd.append('success_action_redirect', $("input[name=success_action_redirect]").val());
          fd.append('policy', $("input[name=Policy]").val());
          fd.append('signature', $("input[name=Signature]").val());
          fd.append('x-amz-meta-email',$("input[name=x-amz-meta-email]").val());
          fd.append('x-amz-meta-tag',$("input[name=x-amz-meta-tag]").val());
          fd.append('x-amz-meta-parse', 'nil');
          // fd.append('Content-Type', $("input[name=file]")[0].files[0].type);
          fd.append('file',$("input[name=file]")[0].files[0]);

          var form = $("#uploadForm")[0];
          var xhr = new XMLHttpRequest();

          xhr.open('POST', form.action, true);
          xhr.onload = function(e) { 
            console.log('onload:');
            console.log(e);
          };

          var progressBar = document.querySelector('progress');
          xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
              progressBar.value = (e.loaded / e.total) * 100;
              console.log(progressBar.value);
              progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
            }
          };

          xhr.onreadystatechange = function() {

            if (xhr.readyState != 4)  { return; }


            self.newUploadOject.set('author', Parse.User.current().get("username"));
            
            self.newUploadOject.set('authorList', Parse.User.current().get("username"));

            self.newUploadOject.save(null, {
              success: function(object) {
                
                console.log('saved figure object, trigger conversion');

                  xhr = new XMLHttpRequest();
                  xhr.open("GET", "/complete/?key=" + object.get('key') + '&id=' + object.id, false);

                  _gaq.push(['_trackEvent', 'Library', 'Upload complete']);
                  
                  xhr.send(null);

                  $("#dropDownUpload").dropdown('toggle');

                  self.resetSearch();

                // $("#parseIDinput").val(object.id);
              // console.log($("#parseIDinput").val());              
              },
              error: function(object, error) {


                // _gaq.push(['_trackEvent', 'Library', 'Upload complete']);
                // console.log('save unsuccessful, not trigger');

              }
            });
          };

          _gaq.push(['_trackEvent', 'Library', 'Upload started']);

          xhr.send(fd);


          $("#uploadButton").addClass('disabled');
          return false;
        
    },
    uploadChanged: function(){

      var self = this;

      var UploadObject = Parse.Object.extend("UploadObject");
      this.newUploadOject = new UploadObject();

      var blank_array = [];

      this.newUploadOject.set('stat', 0);
      self.newUploadOject.set('starArray', blank_array );
      this.newUploadOject.set('authorList', '');
      this.newUploadOject.set('user', Parse.User.current());
      this.newUploadOject.set('processingStatus', 'FigureObject created.');
      
      this.newUploadOject.set('originalFilename', $("#fileUpload").val().substr(12));
      this.newUploadOject.setACL(new Parse.ACL(Parse.User.current()));

      _gaq.push(['_trackEvent', 'Library', 'Upload initiated']);

      $("#uploadButton").removeClass('disabled');

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



        // console.log(inArrayInd);
        if (inArrayInd >= 0)
        {  

          $.get(unstarURL, function(data) {
            // console.log(data);
          });

            currentUser.get('starArray').splice(inArrayInd, 1);
            _gaq.push(['_trackEvent', 'Library', 'Figure unstarred']);
            currentUser.save(null, {
              success: function(user)
              {
                console.log('figure unstarred');
                self.activeFigures.fetch();

                // console.log(user);

              }
            });
        }
        else
        {
            $.get(starURL, function(data) {
              // console.log(data);
            });

            currentUser.get('starArray').push(idToStar);
            _gaq.push(['_trackEvent', 'Library', 'Figure starred']);
            currentUser.save(null, {
              success: function(user)
              {
                console.log('figure starred');
                self.activeFigures.fetch();
                // console.log(user);

              }
            });
        }
      }
      else
      {

        $.get(starURL, function(data) {
            // console.log(data);
          });

        var starArray = [];
        starArray.push(idToStar);
        _gaq.push(['_trackEvent', 'Library', 'Figure starred']);
        currentUser.set('starArray', starArray);
        currentUser.save(null, {
          success: function(user)
          {
            console.log('figure starred');
            self.activeFigures.fetch();
            // console.log(user);

          }
        });

      }

    },

    populateFigureList:function()
    {
        this.activeFigures.query = new Parse.Query(FigureObject);

        switch(this.sortState){

          case 0:
              this.activeFigures.query.descending("createdAt");
            break;
          case 1:
              this.activeFigures.query.ascending("createdAt");

            break;
          case 2:
              this.activeFigures.query.descending("figureTitle");
            break;
          case 3:
              this.activeFigures.query.ascending("figureTitle");
            break;
          default:
            break;
        }

        // console.log(filterType);

        switch(filterType){

          case 'none':

            break;

          case 'tag':

              this.activeFigures.query.matches("tag", $("#hiddenSearchTerm").val(), "im");

            break;

          case 'title':

              this.activeFigures.query.matches("figureTitle", $("#hiddenSearchTerm").val(), "im");

            break;

        }

        switch(groupName){

            case 'all':

              break;

            case 'mine':

              this.activeFigures.query.equalTo("user", Parse.User.current());


              break;

            case 'starred':
              
              var starArray = Parse.User.current().get('starArray');
              this.activeFigures.query.containedIn("objectId", starArray);
              break;  


        }


        // this.activeFigures.query.greaterThan("stat", 6);      
        this.activeFigures.query.lessThan("stat", 10);      
        this.activeFigures.fetch();
    },


    showStarred: function ()
    {

        groupName = 'starred'
        this.populateFigureList();

    },

    showAll: function ()
    {
        groupName = 'all';
        this.populateFigureList();
    },

    showUploads: function()
    {
        groupName = 'mine';
        this.populateFigureList();
    },

    resetSearch: function()
    {

      $("#searchQuery").val("");

      filterType = 'none';
      this.populateFigureList();

    },
    searchTitle: function()
    {
      filterType = 'title';
      var searchValue = $("#searchQuery").val();

      this.populateFigureList();
    },

    searchTag: function()
    {

      filterType = 'tag';
      var searchValue = $("#searchQuery").val();      
      this.populateFigureList();

    },
    publishModel: function(parseID, publishBOOL)
    { 
        var self = this;
        // console.log(parseID);
        // console.log(publishBOOL);

        self.activeFigures.query.get(parseID, {

            success: function(fzobj) {

                if(!publishBOOL)
                {
                  // this is inverted, not sure why...

                  fzobj.getACL().setPublicReadAccess(true);
                  fzobj.set('published', true);
                  fzobj.save(null, {
                    success: function(object) {
                      
                      // alert('published!');
                      _gaq.push(['_trackEvent', 'Library', 'Figure published']);
                      
                      self.resetSearch();

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
                      
                      // console.log('unpublished!');
                      _gaq.push(['_trackEvent', 'Library', 'Figure unpublished']);

                      self.resetSearch();
                    },
                    error: function(object, error) {

                      console.log('error trying to save...');
                  
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
    deleteFZObject: function(parseID)
    {
        var r=confirm("Confirm delete of FZ object with id: " + parseID);
        var self = this;
        if (r==true)
        {
          // confirm delete
          self.activeFigures.query.get(parseID, {

            success: function(fzobj) {
              // The object was retrieved successfully.
              fzobj.destroy({
                success: function(myObject) {
                  

                  _gaq.push(['_trackEvent', 'Library', 'Figure delete']);

                  self.populateFigureList();
                  // self.addAll();
                },
                error: function(myObject, error) {
                  // The delete failed.
                  // error is a Parse.Error with an error code and description.
                }
              });

            },
            error: function(object, error) {
              console.log('object not retrieved successfully');
              // The object was not retrieved successfully.
              
            }
          });
          
        }
        else
        {
          console.log('delete cancelled');
        }
    },

    refreshEntries: function(e)
    {
      console.log('refresh clicked');
      // this.activeFigures.reset();
      this.activeFigures.fetch();




    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      // var self = this;
      // Parse.User.logOut();

      var self = this;
      Parse.User.logOut();
      window.appModel = new MainApplicationView();
      this.undelegateEvents();
      delete self;

      
      // new LogInView();
      // this.undelegateEvents();
      
      // delete self;
    },

    render: function() {
      this.delegateEvents();


    },

    addOne: function(figureobject) {
      var index = this.activeFigures.indexOf(figureobject);
      var view = new FigureView({model: figureobject});
      var keys = Object.keys(figureobject.getACL().permissionsById);
      var userFromACL = '';

      _.each(keys, function(key){
        if (key == '*') { }  else { userFromACL = key; }
      });

      // hah yes I know.
      var figstarred = false;

      if (Parse.User.current())
      {
        if(Parse.User.current().has('starArray'))
        {
          if ($.inArray(figureobject.id, Parse.User.current().get('starArray')) >= 0)
          {
            figstarred = true;
          }
        }
      }
      
      var newDict = {
        parseCreateDate: figureobject.createdAt,
        parseObjectID: figureobject.id,
        parseUserId: userFromACL,
        cid: figureobject.cid,
        starred: figstarred,
        aid: index        
      };

      // console.log(newDict);

      view.updateWithParseData(newDict);
      this.$("#viewTable").append(view.render().el);
      
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection) {
      this.$("#viewTable").html("");
      this.activeFigures.each(this.addOne);
    }

  });








  /************************************************************************************/

 var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  /************************************************************************************/





  /************************************************************************************/

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      // if (Parse.User.current()) {

      window.appModel = new MainApplicationView();

      // } else {
      //   new LogInView();
      // }
    }
  });


  /************************************************************************************/

  var AppRouter = Parse.Router.extend({

    routes: {
      "tag/:id": "searchTag",
      "title/:id": "searchTitle",
      "roi/:id": "searchRegion",
      "*actions": "defaultRoute" 
    },

    initialize: function(options) {

    },

    searchRegion: function(id)
    {
      console.log('viewing region ' + id);

    },
    searchTag: function(id) {
      
      filterType = 'tag';
      $("#hiddenSearchTerm").val(id)
      
      if(window.appModel != null)
      {
         window.appModel.populateFigureList();
      }


    },
    searchTitle: function(id) {
      
      filterType = 'title';
      $("#hiddenSearchTerm").val(id)

      if(window.appModel != null)
      {
         window.appModel.populateFigureList();
      }

      //

    },
    defaultRoute: function( actions ){
      searchType = 'none';
    }


  });

  /************************************************************************************/

  var state = new AppState;

  new AppRouter;
  Parse.history.start();

  new AppView;

  
});

