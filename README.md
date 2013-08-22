### FigureZero Server

Server

We have a python-happy backend running tornado fronted by NGINX with supervisor managing. It’s a loosely coupled architecture with SQS between, storage on S3, and hopefully taking advantage of the recent CORS addition for serving tiles. For user management and all database work, we use parse.com. It’s incredible and we’re not getting paid to say that. It has made life easy for cross-platform web + mobile application development.

Web app

The web app is a backbone.js app with a few jquery elements running on a parse.com base with a heavy reliance on bootstrap + jasny. It was primarily an experiment in learning javascript MVC but in the end resulting in a stable, responsive, and somewhat attractive web application. Zoomable image viewing is provided by leaflet. Annotations are stored in geojson and arbitrarily limited to markers and rectangles. Future versions could make use of multiline polygons and/or circles. More time was spent selecting the components than actually piecing them together them.
