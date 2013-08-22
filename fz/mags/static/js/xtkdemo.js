

$ = jQuery;

$(document).ready(function(){
     $.ajaxSetup ({  
      cache: false  
      });  
 });

window.onload = function() {

var getMinMax = function(inputArray)
{
  var min = 0;
  var max = 0;

  $.each(inputArray, function(item){
    // console.log(item);
    if(item > max)
    {
      max = item;
    }

    if(item < min)
    {
      min = item;
    }
  });

  var returnDict = {
    min: min,
    max: max
  }

  return returnDict;
}

Array.max = function( array ){
    return Math.max.apply( Math, array );
};
Array.min = function( array ){
    return Math.min.apply( Math, array );
};


 var r1 = new X.renderer3D();
    // .. attach the renderer to a <div> container using its id
    r1.container = 'r1';
    r1.init();

    buildAxes(r1, 30);

    $.ajax({
      url: '/static/fish.csv',
      success: function(data) {
        // $('.result').html(data);
        // alert('Load was performed.');
        var fields = data.split(/\r/);
        // var dat = data.split(',')
        
        var t_vec = []
        var x_vec = []
        var y_vec = []
        var v_vec = []

        var range = fields.length;
        var resamp = 100;

        for (var i=1;  10*i < range + 1; i++)
        {

          csarray = fields[(i)*10].split(',')

          t_vec[(i-1)] = csarray[0];
          x_vec[(i-1)] = csarray[1];
          y_vec[(i-1)] = csarray[2];
          v_vec[(i-1)] = csarray[3];
        }

        // console.log(Array.max(t_vec))
        t_mm = { min: Array.min(t_vec), max: Array.max(t_vec)};
        x_mm = { min: Array.min(x_vec), max: Array.max(x_vec)};
        y_mm = { min: Array.min(y_vec), max: Array.max(y_vec)};
        v_mm = { min: Array.min(v_vec), max: Array.max(v_vec)};
        
        for (var i=0; i<t_vec.length; i++)
        {
          t_vec[i] = 300*(t_vec[i] - t_mm.min )/ (t_mm.max - t_mm.min)
          x_vec[i] = 100*(x_vec[i] - x_mm.min )/ (x_mm.max - x_mm.min)
          y_vec[i] = 100*(y_vec[i] - y_mm.min )/ (y_mm.max - y_mm.min)
          v_vec[i] = Math.round(8*(v_vec[i] - v_mm.min )/ (v_mm.max - v_mm.min))
        }

        // console.log(t_vec)
        console.log(v_vec)
        // console.log(y_vec)

        var colorMap = [ 
          [178/255,24/255,43/255],
          [214/255,96/255,77/255],
          [244/255,165/255,130/255],
          [253/255,219/255,199/255],
          [247/255,247/255,247/255],
          [209/255,229/255,240/255],
          [146/255,197/255,222/255],
          [67/255,147/255,195/255],
          [33/255,102/255,172/255]
        ]        


        for (var i=0; i<t_vec.length - 1; i++)
        {

            var start = [t_vec[i], x_vec[i], y_vec[i]]
            var end = [t_vec[i+1], x_vec[i+1], y_vec[i+1]]

            console.log(colorMap[v_vec[i]])

            addLine(r1, start, end, 0.5 + 3* v_vec[i] / 9, colorMap[v_vec[i]]);
        }

      },
      error: function(error) {
        console.log('error');
      }

    });


    r1.render();
};

var addLine = function(r, start, end, width, color)
{
  var column = new X.cylinder();
  column.start = start;
  column.end = end;
  column.radius = width;

  column.color = color;
  // column.caption = caption

  r.add(column)


}


var buildAxes = function(r, length)
{
  var x_axis = new X.cylinder();
  x_axis.start = [0,0,0];
  x_axis.end = [length,0,0];
  x_axis.radius = 1.0;

  x_axis.color = [1,0,0];
  x_axis.caption = 'Time'

  r.add(x_axis)

  var y_axis = new X.cylinder();
  y_axis.start = [0,0,0];
  y_axis.end = [0,length,0];
  y_axis.radius = 1.0;

  y_axis.color = [0,1,0];
  y_axis.caption = 'X'

  r.add(y_axis)

  var z_axis = new X.cylinder();
  z_axis.start = [0,0,0];
  z_axis.end = [0,0,length];
  z_axis.radius = 1.0;

  z_axis.color = [0,0,1];
  z_axis.caption = 'Y'

  r.add(z_axis)

}

  // var cylinder1 = new X.cylinder();
  // // start and end points in world space
  // cylinder1.start = [-10, 0, 0];
  // cylinder1.end = [10, 0, 0];
  // cylinder1.radius = 0.3;
  // // the cylinder is blue
  // cylinder1.color = [0, 0, 1];
  // cylinder1.caption = 'cylinder 1';
  // cylinder1.transform.translateX(30);
  // cylinder1.transform.translateY(30);

  // r1.add(cylinder1);

  // create a new X.mesh and attach a .VTK file
  // var mesh = new X.mesh();
  // mesh.file = 'http://x.babymri.org/?avf.vtk';
  
  // // .. but add it to only to the first renderer
  // r1.add(mesh);
  
  // the onShowtime function gets executed, once the renderer r1 completely
  // loaded the .VTK file
  // r1.onShowtime = function() {

  //   // since the mesh was loaded, we add it now to the other renderers
  //   // // this way, the .VTK file is loaded only once
  //   // r2.add(mesh);
  //   // r3.add(mesh);
    
  //   // trigger rendering
  //   // r2.render();
  //   // r3.render();
    
  // };
  
  // start the loading of the .VTK file and display it on renderer r1.
  // once the file was fully loaded, the r1.onShowtime function is executed
  
  
  /*
   * Thank you:
   * 
   * The rendered vessel is an arteriovenous fistula in an arm (a bypass created
   * by joining an artery and vein) acquired from a MR scanner. The data was
   * provided by Orobix S.R.L.
   * 
   * http://www.orobix.com
   */


