#!/usr/bin/env python

import logging
import tornado.auth
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import os.path
import uuid
import json
import pprint
import math
import urllib
import urllib2
import bitly_api
from urllib2 import Request, urlopen, URLError
import os, shutil
from urllib import urlretrieve
import boto

import ConfigParser

config = ConfigParser.RawConfigParser()
config.read('/home/ubuntu/fz/conf/app.cfg')

AWS_ACCESS_KEY = config.get('aws', 'accesskey')
AWS_SECRET_KEY = config.get('aws', 'secretkey')

# ParsePy.APPLICATION_ID = config.get('parse', 'P_APP_ID')
# ParsePy.MASTER_KEY = config.get('parse', 'P_MASTER_KEY')

_convert = config.get('fz', 'convertQueueName')
_upload = config.get('fz', 'uploadQueueName')

from tornado.options import define, options

define("port", default=8000, help="run on the given port", type=int)

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", LaunchHandler),
            (r"/", LaunchHandler),
            (r"/app", AppRedirect),
            (r"/library", ApplicationHandler),
            (r"/library/.*", ApplicationHandler),
            (r"/complete/", UploadCompleteHandler),
            (r"/approve/(.*)", ApproveConversionHandler),
            (r"/roi/(.*)", EditFigureHandler),
            (r"/ref/(.*)", EditRefFigureHandler),
            (r"/edit/(.*)", ViewFigureHandler),
            (r"/fz/(.*)", PublishHandler),
            (r"/summary/(.*)", SummaryHandler),
            (r"/api/(.*)", APIHandler),
            (r"/doi/(.*)", DOIHandler),
            (r"/json/(.*)", JSONHandler),
            (r"/wall", WallHandler),
            (r"/cut/", CUTHandler),
            (r"/x/", X3Handler),
            (r"/xtk/", XTKHandler),
            (r"/fs/(.*)", FullScreenHandler),
            (r"/b/", X3Handler),
            (r"/c/", XTKEmbedHandler),
            (r"/star/(.*)", StarHandler),
            (r"/unstar/(.*)", UnStarHandler)
        ]
        settings = dict(
            debug=False,
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static")
        )
        tornado.web.Application.__init__(self, handlers, **settings)




class DemoHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("demo.html", messages=None)


class AppRedirect(tornado.web.RequestHandler):
    def get(self):

        self.redirect('http://itunes.apple.com/us/app/figurezero/id566982640?mt=8')

# http://itunes.apple.com/us/app/figurezero/id566982640?mt=8


# This is the main application, available after the user signs in
# From this app they can view thier current figures and their status
# They can upload a figure
class ApplicationHandler(tornado.web.RequestHandler):

    def generate_post_form(self,bucket_name, key):
        import hmac, datetime
        from hashlib import sha1
        expiration = datetime.datetime.utcnow() + datetime.timedelta(days=365)
        policy = '''{"expiration": "%(expires)s","conditions": [{"bucket":"%(bucket)s"}, {"success_action_redirect": "http://figurezero.com/complete/"}, ["starts-with","$key","%(key)s"],{"acl":"private"}, ["starts-with","$x-amz-meta-tag",""], ["starts-with","$x-amz-meta-email",""], ["starts-with","$x-amz-meta-parse",""]]}'''
        
        policy = policy%{
            "expires": expiration.strftime("%Y-%m-%dT%H:%M:%SZ"), # This has to be formatted this way
            "bucket": bucket_name,
            "key": key,
        }

        encoded = policy.encode('utf-8').encode('base64').replace("\n","") # Here we base64 encode a UTF-8 version of our policy.  Make sure there are no new lines, Amazon doesn't like them.

        return ("https://%s.s3.amazonaws.com/"%(bucket_name),{
                   "policy":encoded,
                   "signature":hmac.new(AWS_SECRET_KEY,encoded,sha1).digest().encode("base64").replace("\n",""), # Generate the policy signature using our Amazon Secret Key
                   "key": key,
                   "AWSAccessKeyId": AWS_ACCESS_KEY, # Obviously the Amazon Access Key
                   "acl":"private",
                   "success_action_status":"200",
              })

    def get(self):

        import uuid
        randomkey = uuid.uuid4()
        _postdict = self.generate_post_form('figurezero', 'upload/%s'%randomkey)
        self.render("app.html", postdict=_postdict)




################################################################################################################################
################################################################################################################################
################################################################################################################################
################################################################################################################################
################################################################################################################################
################################################################################################################################


class FZConverter(object):
    """docstring for FZConverter"""
    def __init__(self):
        super(FZConverter, self).__init__()
        # self.arg = arg

    def loadFromZoomifyURL(self, zoomify_url):

        self.url_to_process = zoomify_url
        self.url_type = 'zoomify'
        self.tileSize = 256
        print 'loaded URL: %s' % self.url_to_process


    def getTileIndex(self, level, x, y):
        """
        Get the zoomify index of a tile in a given level, at given co-ordinates
        This is needed to get the tilegroup.
 
        Keyword arguments:
        level -- the zoomlevel of the tile
        x,y -- the co-ordinates of the tile in that level
 
        Returns -- the zoomify index
        """

        index = x + y * int(math.ceil( math.floor(self.width/pow(2, self.number_of_zoom_levels - level - 1)) / self.tileSize ) )
 
        for i in range(1, level+1):
            index += int(math.ceil( math.floor(self.width /pow(2, self.number_of_zoom_levels - i)) / self.tileSize ) ) * \
                     int(math.ceil( math.floor(self.height/pow(2, self.number_of_zoom_levels - i)) / self.tileSize ) )
 
        return index


    def parseZoomify(self, verbose=False):

        if self.url_type == 'local_zoomify':
            image_property_path = '%sImageProperties.xml' % (self.path_to_process)
            
            if verbose:
                print 'loading properties from %s' % image_property_path

            image_property_string = open(image_property_path, 'r').read()
            splitline = image_property_string.split(' ')
            if len(splitline) > 1:
                for items in splitline:
                    if 'HEIGHT' in items:
                        self.height = int(items.split('"')[1])
                    if 'WIDTH' in items:
                        self.width = int(items.split('"')[1])

            self.number_of_zoom_levels = int(max(math.ceil(math.log(self.width / 256, 2.0)), math.ceil(math.log(self.height / 256 , 2.0))) + 1)
            if verbose:
                print 'Found image with %d x %d pixels in size, expected maximum zoom: %d (not counting 0)' % (self.width, self.height, self.number_of_zoom_levels)

        elif self.url_type == 'zoomify':

            return self.parseZoomifyURL()


    def parseZoomifyURL(self, verbose=True):

        # assume we don't have height & width for the image, figure it out
        print 'Processing zoomifyURL: %s' % (self.url_to_process)

        zoomify_url = self.url_to_process
        parse_successful = True
        self.image_property_path = ''

        # create image properties url
        if 'ImageProperties' not in zoomify_url:

            if verbose:
                print "ImageProperties not in URL, adding"

            self.image_property_path = '%sImageProperties.xml' % (zoomify_url)

        else:
            if verbose:
                print "ImageProperties in URL, continue"
            
            self.baseURL = zoomify_url.split('/ImageProperties')[0]
            self.image_property_path = zoomify_url


        print self.image_property_path
        useOriginalParse = True

        try:

            from StringIO import StringIO
            import gzip

            remote_site_description = ''

            request = urllib2.Request(self.image_property_path)
            request.add_header('Accept-encoding', 'gzip')
            response = urllib2.urlopen(request)
            if response.info().get('Content-Encoding') == 'gzip':
                buf = StringIO( response.read())
                f = gzip.GzipFile(fileobj=buf)
                remote_site_description = f.read()

            print remote_site_description

            if 'IMAGE_PROPERTIES' not in remote_site_description:
                remote_site_description = urllib2.urlopen(self.image_property_path)    
            else:
                useOriginalParse = False

        except URLError, e:
            print 'Unable to locate ImageProperties.xml at %s' % (self.image_property_path)
            print e.reason        

        # print remote_site_description
        
        if parse_successful:
            # parse height and width from xml file of entire image
            self.height = 0
            self.width = 0
            self.tileSize = 256

            # print len(remote_site_description)

            if useOriginalParse:
                for line in remote_site_description:
                    splitline = line.split(' ')
                    if len(splitline) > 1:
                        for items in splitline:
                            if 'HEIGHT' in items:
                                self.height = int(items.split('"')[1])
                            if 'WIDTH' in items:
                                self.width = int(items.split('"')[1])

            else:
                # for line in remote_site_description:
                splitline = remote_site_description.split(' ')
                if len(splitline) > 1:
                    for items in splitline:
                        if 'HEIGHT' in items:
                            self.height = int(items.split('"')[1])
                        if 'WIDTH' in items:
                            self.width = int(items.split('"')[1])




            self.number_of_zoom_levels = int(max(math.ceil(math.log(self.width / 256, 2.0)), math.ceil(math.log(self.height / 256 , 2.0))) + 1)

            print 'Found image with %d x %d pixels in size, expected maximum zoom: %d (not counting 0)' % (self.width, self.height, self.number_of_zoom_levels)

            return parse_successful



    def extractRegionURL(self, region_array, output_size, annotate=True, verbose=False):

        native_coordinate_array = region_array
        output_coordinate_array = output_size

        self.tile_extent = []

        for i in range(0,int(self.number_of_zoom_levels)):
            
            rc = {}
            row_max = int( math.ceil( self.height / (256 * pow(2,i) )))+1
            col_max = int( math.ceil( self.width / (256 * pow(2,i) )))+1

            rc['row'] = row_max
            rc['col'] = col_max
            rc['tot'] = row_max * col_max
            self.tile_extent.append(rc)

        z_to_use = 0

        for i in range(0,int(self.number_of_zoom_levels)):
            
            i_min = int( math.floor( float(native_coordinate_array[0])  / (256 * pow(2,i) )))
            i_max = int( math.floor( (float(native_coordinate_array[0]) + float(native_coordinate_array[2])) / (256 * pow(2,i) )))

            j_min = int( ( math.floor( float(native_coordinate_array[1]) / (256 * pow(2,i) ))))
            j_max = int( ( math.floor( (float(native_coordinate_array[1]) + float(native_coordinate_array[3])) / (256 * pow(2,i) ))))

            if verbose:
                print 'For at z: %d, there are %d cols and %d rows' % (self.number_of_zoom_levels - i, col_max, row_max)
                print 'For at z: %d, there are %d pixels and %d pixels' % ( self.number_of_zoom_levels - i, col_max*256, row_max*256)

                tilegroup = self.getTileIndex(self.number_of_zoom_levels - i - 1, i_min, j_min) / 256
                print 'For at z: %d, the object starts at group %d, %d cols and %d rows,' % (self.number_of_zoom_levels - i, tilegroup, i_min, j_min)
                print '\tTileGroup%d/%d-%d-%d.jpg' % (tilegroup, self.number_of_zoom_levels - i - 1, i_min, j_min)

                tilegroup = self.getTileIndex(self.number_of_zoom_levels - i - 1, i_max, j_max) / 256
                print 'For at z: %d, the object ends at group %d, %d cols and %d rows,' % (self.number_of_zoom_levels - i, tilegroup, i_max, j_max)
                print '\tTileGroup%d/%d-%d-%d.jpg' % (tilegroup, self.number_of_zoom_levels - i - 1, i_max, j_max)

            region_w = native_coordinate_array[2] / pow(2,i)
            region_h = native_coordinate_array[3] / pow(2,i)

            if verbose:
                print 'At this zoom (%d), the capture region will be %f x %f' % (i, region_w, region_h)

            if region_w < output_coordinate_array[0] or region_w < output_coordinate_array[1]:
                if verbose:
                    print 'below output resolution'
                pass
            else:
                z_to_use = i

        if verbose:
            print 'will use %d for capture' % (z_to_use)

        i_min = int( math.floor( float(native_coordinate_array[0])  / (256 * pow(2,z_to_use) )))
        i_max = int( math.floor( (float(native_coordinate_array[0]) + float(native_coordinate_array[2])) / (256 * pow(2,z_to_use) )))

        j_min = int( ( math.floor( float(native_coordinate_array[1]) / (256 * pow(2,z_to_use) ))))
        j_max = int( ( math.floor( (float(native_coordinate_array[1]) + float(native_coordinate_array[3])) / (256 * pow(2,z_to_use) ))))

        if verbose:

            tilegroup = self.getTileIndex(self.number_of_zoom_levels - z_to_use - 1, i_min, j_min) / 256
            print 'For at z: %d, the object starts at group %d, %d cols and %d rows,' % (self.number_of_zoom_levels - i, tilegroup, i_min, j_min)
            print '\tTileGroup%d/%d-%d-%d.jpg' % (tilegroup, self.number_of_zoom_levels - z_to_use - 1, i_min, j_min)
        
        
            tilegroup = self.getTileIndex(self.number_of_zoom_levels - z_to_use - 1, i_max, j_max) / 256
            print 'For at z: %d, the object ends at group %d, %d cols and %d rows,' % (self.number_of_zoom_levels - i, tilegroup, i_max, j_max)
            print '\tTileGroup%d/%d-%d-%d.jpg' % (tilegroup, self.number_of_zoom_levels - z_to_use - 1, i_max, j_max)

        region_w = native_coordinate_array[2] / pow(2,z_to_use)
        region_h = native_coordinate_array[3] / pow(2,z_to_use)

        if verbose:
            print 'At this zoom, the capture region will be %f x %f' % (region_w, region_h)

        tile_list_needed = []

        # iterate across each col for a row
        for i in range(i_min, i_max+1):

            # list of tiles in this row
            row_list = []

            for j in range(j_min, j_max+1):
                actual_offset = self.number_of_zoom_levels - z_to_use - 1
                tilegroup = self.getTileIndex(self.number_of_zoom_levels - z_to_use - 1, i, j) / 256
                # tileIndex = self.getTileIndex(int(actual_offset), i, j)

                tile_url = '%sTileGroup%d/%d-%d-%d.jpg' % (self.url_to_process[0:-19], tilegroup, actual_offset, i, j)
                tile_name = '%d-%d-%d.jpg' % (actual_offset, i, j)
                row_list.append([tile_url, tile_name])
                if os.path.exists(tile_url):
                    pass
                else:
                    if verbose:
                        print 'FILE NOT FOUND -> this is good.'
                    pass

            tile_list_needed.append(row_list)

        # tmp_dir_name = '/tmp/' + str(uuid.uuid4()) 
        tmp_dir_name = '/tmp/fztest/'
        
        if os.path.exists(tmp_dir_name):
            pass 
        else:
            os.makedirs(tmp_dir_name)
        # # os.mkdir(tmp_dir_name)
        
        col_cmdstr = '/usr/bin/montage ' 
        
        if verbose:
            print col_cmdstr

        row_ind = 0
        for row_needed in tile_list_needed:
            cmdstr = '/usr/bin/montage '

            for col_needed in row_needed:
                output_path = tmp_dir_name + '' + col_needed[1]

                # if annotate:
                #     annotate_cmd = '''/usr/local/bin/convert /Users/stonerri/allenhack/figurezero/%s -pointsize 40 -draw "gravity center text 0,0 '%s'" %s ''' % (col_needed[0], col_needed[1], output_path)
                
                #     if verbose:
                #         print annotate_cmd
                    
                #     pcmd = os.popen(annotate_cmd)
                #     for e in pcmd:
                #         if verbose:
                #             print e
                #         pass
                # else:

                #     shutil.copy(col_needed[0], output_path)
                print col_needed[0]
                print output_path
                urlretrieve(col_needed[0], output_path)

                cmdstr += output_path + ' '

            row_path = tmp_dir_name + 'row-%d.jpg' % (row_ind)
            row_ind +=1

            cmdstr += ' -geometry +0+0 -tile 1x%d %s' % (len(row_needed), row_path )
            
            if verbose:
                print cmdstr

            pipe = os.popen(cmdstr)
            for e in pipe:
                if verbose:
                    print e
                pass

            col_cmdstr += row_path + ' '

        prepath = tmp_dir_name + 'merge-'
        final_path = prepath+'%d-%d_%d-%d_%d-%d.png' % (float(native_coordinate_array[0]), float(native_coordinate_array[1]), float(native_coordinate_array[2]), float(native_coordinate_array[3]), output_coordinate_array[0], output_coordinate_array[1])
        # print final_path
        col_cmdstr += ' -geometry +0+0 -tile %dx1 %s' % (len(tile_list_needed), final_path )
        
        pipe = os.popen(col_cmdstr)
        for e in pipe:
            if verbose:
                print e
            pass

        import glob
        files_to_remove = glob.glob('%s/*.jpg' % tmp_dir_name)
        for file_name in files_to_remove:
            os.remove(file_name)

        crop_origin_x = i_min*256
        crop_origin_y = j_min*256

        crop_bound_x = (i_max+1)*256
        crop_bound_y = (j_max+1)*256

        if verbose:
            print 'base image origin: %d %d' % (crop_origin_x, crop_origin_y)
            print 'base image bound: %d %d' % (crop_bound_x, crop_bound_y)    
            print 'base image dimensions: %d %d' % (crop_bound_x - crop_origin_x, crop_bound_y -  crop_origin_y)

        target_origin_x = native_coordinate_array[0] / pow(2,z_to_use)
        target_origin_y = native_coordinate_array[1] / pow(2,z_to_use)

        if verbose:
            print 'target origin: %d %d' % (target_origin_x, target_origin_y)
            print 'target size: %d %d' % (region_w, region_h)
            print 'target bound: %d %d' % (target_origin_x + region_w, target_origin_y + region_h)

        croppath = tmp_dir_name + 'crop-%d-%d_%d-%d_%d-%d.png' % (float(native_coordinate_array[0]), float(native_coordinate_array[1]), float(native_coordinate_array[2]), float(native_coordinate_array[3]), output_coordinate_array[0], output_coordinate_array[1])
        crop_cmdstr = '/usr/bin/convert %s -crop %dx%d+%d+%d %s' % (final_path, region_w, region_h, target_origin_x - crop_origin_x, target_origin_y - crop_origin_y, croppath)

        if verbose:
            print crop_cmdstr

        pipe = os.popen(crop_cmdstr)
        for e in pipe:
            pass

        finalfinalpath = tmp_dir_name + 'final-%d-%d_%d-%d_%d-%d.jpg' % (float(native_coordinate_array[0]), float(native_coordinate_array[1]), float(native_coordinate_array[2]), float(native_coordinate_array[3]), output_coordinate_array[0], output_coordinate_array[1])

        scale_cmdstr = '/usr/bin/convert %s -quality 80 -resize %dx%d %s' % (croppath, output_coordinate_array[0], output_coordinate_array[1], finalfinalpath)
        if verbose:
            print scale_cmdstr
        
        pipe = os.popen(scale_cmdstr)
        for e in pipe:
            pass

        return finalfinalpath






class CUTHandler(tornado.web.RequestHandler):

    def prepare(self):

        pass

    def post(self):

        jsondict =  json.loads(self.request.body)

        import pprint
        pprint.pprint(jsondict)


        fztest = FZConverter()
        fztest.loadFromZoomifyURL(jsondict['ipxml'])

        ipxarray = jsondict['ipxml'].split('/')
        rootID = ipxarray[-3]
        imageID = ipxarray[-2]

        if fztest.parseZoomify():

            s_array = jsondict['origin'] + jsondict['size']
            in_array = []
            out_array = jsondict['output']

            for v in s_array:
                in_array.append(int(v))

#             print in_array
            
            tmpfilename = fztest.extractRegionURL(in_array, out_array)
            
            idstring = str(uuid.uuid4())
            fulllocation= jsondict['path'] + idstring + '.jpg'
            thumblocation= jsondict['path'] + 'th-' + idstring + '.jpg'

            print tmpfilename
            print fulllocation

            cmdstr = '/usr/bin/convert %s -quality 80  %s' % (tmpfilename, fulllocation)
            print cmdstr 
            pipe = os.popen(cmdstr)
            for e in pipe:
                print e

            cmdstr = '/usr/bin/convert %s -quality 80 -resize 256x256  %s' % (tmpfilename, thumblocation)
            print cmdstr

            pipe = os.popen(cmdstr)
            for e in pipe:
                print e

            # print 'success!'
            viewurl = fulllocation[20:]
            thumburl = thumblocation[20:]

            s3path = 'tile/%s/%s/%s.jpg' % (rootID, imageID, idstring)
            s3thumb = 'tile/%s/%s/th-%s.jpg' % (rootID, imageID, idstring)



            from boto.s3.connection import S3Connection
            from boto.s3.key import Key

            self.s3conn = S3Connection(AWS_ACCESS_KEY, AWS_SECRET_KEY)
            b = self.s3conn.create_bucket('fzero')

            fk = Key(b)
            fk.key = s3path
            fk.set_contents_from_filename(fulllocation)


            thk = Key(b)
            thk.key = s3thumb
            thk.set_contents_from_filename(thumblocation)



            # viewURL= 'http://figurezero.com%s' % (viewurl)
            viewURL = 'https://s3.amazonaws.com/fzero/%s' % (s3path)
            thumbURL = 'https://s3.amazonaws.com/fzero/%s' % (s3thumb)
            bitly = bitly_api.Connection('figurezero','BITLY_API')
            shortenedURL = bitly.shorten(viewURL)
            qrLinkURL = shortenedURL['url'] + '.qrcode?s=400'

            json_dict = {}
            json_dict['result'] = 'success'
            # json_dict['viewfile'] = tmpfilename
            # json_dict['viewthumb'] = thumblocation
            json_dict['viewurl'] = viewURL
            json_dict['thumburl'] = thumbURL
            json_dict['bitlyurl'] = shortenedURL['url']
            json_dict['qrURL'] = qrLinkURL
            self.set_header("Content-Type", "text/json")
            self.write(json.dumps(json_dict))

        else:

            print 'error of some sort'

################################################################################################################################
################################################################################################################################
################################################################################################################################
################################################################################################################################





class UploadCompleteHandler(tornado.web.RequestHandler):

    def prepare(self):
        from boto.sqs.connection import SQSConnection
        self.conn = SQSConnection(AWS_ACCESS_KEY, AWS_SECRET_KEY)
        self._q = self.conn.create_queue('FZconvertQueue', 120)

        from boto.s3.connection import S3Connection
        self.s3conn = S3Connection(AWS_ACCESS_KEY, AWS_SECRET_KEY)

    def get(self): 

        completeDebugDict = {}
        # completeDebugDict['bucket'] = self.get_arguments('bucket')[0]
        completeDebugDict['key'] = self.get_arguments('key')[0]
        completeDebugDict['parseID'] = self.get_arguments('id')[0]
        self._bucket = self.s3conn.create_bucket('figurezero')
        k = self._bucket.get_key(completeDebugDict['key'])

        rootID = completeDebugDict['key'].split('/')[1]
        completeDebugDict['tag'] = k.get_metadata('tag')
        completeDebugDict['rootID'] = rootID
        # completeDebugDict['parseID'] = k.get_metadata('parse')
        completeDebugDict['emailAddress'] = k.get_metadata('email')
        completeDebugDict['size'] = k.size

        from boto.sqs.message import Message
        m = Message()
        m.set_body(json.dumps(completeDebugDict))
        status = self._q.write(m)

        self.redirect('/approve/%s' % (completeDebugDict['parseID']))


class APIHandler(tornado.web.RequestHandler):

    def get(self, input):

        if input == 'tags.json':

            json_array = ['#figurezero', '#sfn2012', '#sfn12']
            self.set_header("Content-Type", "text/json")
            self.write(json.dumps(json_array))

        else:
            self.set_header("Content-Type", "text/json")
            self.write('[ ]')

class UnStarHandler(tornado.web.RequestHandler):
    def get(self, input):

        if len(input) > 0:
            if len(input.split('/')) == 2:

                import ParsePy

                ParsePy.APPLICATION_ID = ""
                ParsePy.MASTER_KEY = ""

                print input

                figid = input.split('/')[0]
                userid = input.split('/')[1]

                figureObject = ParsePy.ParseQuery("UploadObject").get(figid)

                if figureObject:
                
                    try:
                        starArray = figureObject.starArray

                        if userid in starArray:

                            starArray.remove(userid)

                            figureObject.starArray = starArray
                            figureObject.save()
                            
                            json_dict = {}
                            json_dict['result'] = 'unstarred figure'
                            json_dict['starcount'] = len(starArray)
                            self.set_header("Content-Type", "text/json")
                            self.write(json.dumps(json_dict))


                        else:

                            # figure already starred by this user
                            json_dict = {}
                            json_dict['result'] = 'not starred'
                            json_dict['starcount'] = len(starArray)
                            self.set_header("Content-Type", "text/json")
                            self.write(json.dumps(json_dict))
                            
                    except:

                        json_dict = {}
                        json_dict['result'] = 'star array not found'
                        json_dict['starcount'] = 0
                        self.set_header("Content-Type", "text/json")
                        self.write(json.dumps(json_dict))

                else:

                    json_dict = {}
                    json_dict['result'] = 'figureObject not found.'
                    self.set_header("Content-Type", "text/json")
                    self.write(json.dumps(json_dict)) 
            else:

                json_dict = {}
                json_dict['result'] = 'incorrect formatting'
                self.set_header("Content-Type", "text/json")
                self.write(json.dumps(json_dict)) 

        else:

            json_dict = {}
            json_dict['result'] = 'Length cannot be zero'
            self.set_header("Content-Type", "text/json")
            self.write(json.dumps(json_dict)) 




class StarHandler(tornado.web.RequestHandler):
    def get(self, input):

        if len(input) > 0:
            if len(input.split('/')) == 2:

                import ParsePy

                ParsePy.APPLICATION_ID = ""
                ParsePy.MASTER_KEY = ""

                print input

                figid = input.split('/')[0]
                userid = input.split('/')[1]

                figureObject = ParsePy.ParseQuery("UploadObject").get(figid)

                if figureObject:
                
                    try:
                        starArray = figureObject.starArray

                        if userid not in starArray:

                            starArray.append(userid)
                            figureObject.starArray = starArray
                            figureObject.save()
                            
                            json_dict = {}
                            json_dict['result'] = 'starred figure'
                            json_dict['starcount'] = len(starArray)
                            self.set_header("Content-Type", "text/json")
                            self.write(json.dumps(json_dict))


                        else:

                            # figure already starred by this user
                            json_dict = {}
                            json_dict['result'] = 'already starred'
                            json_dict['starcount'] = len(starArray)
                            self.set_header("Content-Type", "text/json")
                            self.write(json.dumps(json_dict))
                            
                    except:

                        starArray = []
                        starArray.append(userid)

                        
                        figureObject.starArray = starArray
                        figureObject.save()

                        json_dict = {}
                        json_dict['result'] = 'created star array'
                        json_dict['starcount'] = len(starArray)
                        self.set_header("Content-Type", "text/json")
                        self.write(json.dumps(json_dict))

                else:

                    json_dict = {}
                    json_dict['result'] = 'figureObject not found.'
                    self.set_header("Content-Type", "text/json")
                    self.write(json.dumps(json_dict)) 
            else:

                json_dict = {}
                json_dict['result'] = 'incorrect formatting'
                self.set_header("Content-Type", "text/json")
                self.write(json.dumps(json_dict)) 

        else:

            json_dict = {}
            json_dict['result'] = 'Length cannot be zero'
            self.set_header("Content-Type", "text/json")
            self.write(json.dumps(json_dict)) 




class DOIHandler(tornado.web.RequestHandler):

    def get(self, input):

        if len(input) > 0:

            import urllib2

            req = urllib2.Request(input)
            req.add_header('Accept', 'application/citeproc+json')
            resp = urllib2.urlopen(req)

            self.write(resp.read())








class JSONHandler(tornado.web.RequestHandler):


    def get(self, input):

        if len(input) > 0:

            import ParsePy

            ParsePy.APPLICATION_ID = ""
            ParsePy.MASTER_KEY = ""

            print input

            figureObject = ParsePy.ParseQuery("UploadObject").get(input)

            if figureObject:
                
                # print figureObject._getJSONProperties()
                jsondict = json.loads(figureObject._getJSONProperties())
                import pprint
                pprint.pprint(jsondict)

                if figureObject.published:
                    self.set_header("Content-Type", "text/json")
                    self.write(json.dumps(jsondict, indent=4))
                    
                    # self.write(pprint.pprint(jsondict))
            
                else:

                    returndict = {}
                    returndict['status'] = 'Figure not public.'
                    self.write(json.dumps(returndict))

            else:

                returndict = {}
                returndict['status'] = 'Figure not found'
                self.write(json.dumps(returndict))



        else:

            returndict = {}
            returndict['status'] = 'Invalid ID'
            self.write(json.dumps(returndict))

            # import urllib2

            # req = urllib2.Request(input)
            # req.add_header('Accept', 'application/citeproc+json')
            # resp = urllib2.urlopen(req)

            # self.write(resp.read())




class WallHandler(tornado.web.RequestHandler):
    def prepare(self):
        pass

    def get(self):

        self.render('wall.html');

        

class PublishHandler(tornado.web.RequestHandler):

        # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("publish.html", messages=inputarg.split('/')[0])

        else:
            self.redirect('/')



class SummaryHandler(tornado.web.RequestHandler):

        # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("summary.html", messages=inputarg)

        else:
            self.redirect('/')



class AllHandler(tornado.web.RequestHandler):

        # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("all.html", messages=inputarg)

        else:
            self.redirect('/')


class SearchHandler(tornado.web.RequestHandler):

    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("search.html", messages=inputarg)

        else:
            self.redirect('/')





class ApproveConversionHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("approve.html", messages=inputarg)

        else:
            self.redirect('/')


class LaunchHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self):

        self.render("launch.html")


class X3Handler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self):

        self.render("x3dtest.html")



class XTKHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("publish.html", messages=inputarg.split('/')[0])

        else:
            self.redirect('/')


class FullScreenHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:
            self.render("fullscreen.html", messages=inputarg.split('/')[0])

        else:
            self.redirect('/')


class XTKEmbedHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self):

        self.render("xtkembed.html")



class EditFigureHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:        
            self.render("editView.html", messages=inputarg)

        else:
            self.redirect('/')



class EditRefFigureHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:        
            self.render("editRef.html", messages=inputarg)

        else:
            self.redirect('/')




class ViewFigureHandler(tornado.web.RequestHandler):
    
    # do anything that needs preparation behind scenes here
    def prepare(self):    
        pass

    def get(self, inputarg):

        if len(inputarg) > 3:        
            self.render("preview.html", messages=inputarg)

        else:
            self.redirect('/')








def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()

