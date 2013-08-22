#!/usr/bin/env python

# // -3 conversion failed
# // -2 unsupported file type
# // -1 upload failed

# // 0 created upload object
# // 1 uploaded object to s3
# // 2 message added to upload queue
# // 3 message received from upload queue
# // 4 downloaded from s3
# // 5 conversion okay
# // 6 tiles made
# // 7 image approved

# // 10 image hidden

from multiprocessing import Process
import datetime, os, time, json, uuid, ConfigParser
from threading import Thread

import ParsePy
import boto
import bitly_api
import pprint

from boto.s3.key import Key
from boto.sqs.message import Message
from boto.sqs.connection import SQSConnection
from boto.s3.connection import S3Connection

config = ConfigParser.RawConfigParser()
config.read('/home/ubuntu/fz/conf/app.cfg')

AWS_ACCESS_KEY = config.get('aws', 'accesskey')
AWS_SECRET_KEY = config.get('aws', 'secretkey')
ParsePy.APPLICATION_ID = config.get('parse', 'P_APP_ID')
ParsePy.MASTER_KEY = config.get('parse', 'P_MASTER_KEY')
_convert = config.get('fz', 'convertQueueName')
_upload = config.get('fz', 'uploadQueueName')

activedomain = 'http://%s' % (  config.get('fz', 'activedomain'))

conn = SQSConnection(AWS_ACCESS_KEY, AWS_SECRET_KEY)

convert_q = conn.create_queue(_convert, 120)
upload_q = conn.create_queue(_upload, 120)

def processMessageFromSQS(temp_message):

    message_dict = json.loads(temp_message.get_body())
    convert_q.delete_message(temp_message)            
    pprint.pprint(message_dict)    
    
    figureObject = ParsePy.ParseQuery("UploadObject").get(message_dict['parseID'])
    
    if figureObject == None:
        print 'object not found'

    figureObject.stat = 2
    figureObject.processingStatus = 'Upload found.'
    figureObject.published = False

    figureObject.save()

    figureObject.figureTitle = ''
    figureObject.figureDescription = ''''''

    # try:

    # figureObject = ParsePy.ParseObject("UploadObject")
    # figureObject.uploadUser = message_dict['parseID']
    figureObject.uploadEmailAddress = message_dict['emailAddress']
    figureObject.tag = ['']

    figureObject.processingStatus = 'Upload message received'
    print figureObject.processingStatus

# folder ID
    rootID = message_dict['rootID']
    figureObject.rootID = rootID

# image ID
    imageID = str(uuid.uuid4())
    figureObject.imageID = imageID

# shortened URL
    viewURL= 'http://figurezero.com/fz/%s' % (figureObject.objectId())

    bitly = bitly_api.Connection('figurezero','BITLY_KEY')

    shortenedURL = bitly.shorten(viewURL)
    figureObject.shortenedURL = shortenedURL['url']
    print shortenedURL

# QR code url
    qrLinkURL = shortenedURL['url'] + '.qrcode?s=400'

    print qrLinkURL

    figureObject.qrLinkURL = qrLinkURL    

# path where file will be downloaded from S3 to for processing
    local_path = os.path.abspath(os.path.curdir) + '/local/' + rootID + '/'
    original_filename = message_dict['key'].split('/')[-1]
    original_extension = os.path.splitext(original_filename)[-1]

    local_filename = local_path + '%s%s' % (imageID, original_extension)
    converted_filename = local_path + '%s.png' % (imageID)
    converted_filenameStatic = local_path + '%s-512.jpg' % (imageID)

    figureObject.localPath = local_path
    figureObject.localFilename = local_filename
    figureObject.originalFileSize = message_dict['size']
    figureObject.originalExtension = original_extension
    figureObject.originalFilename = original_filename
    figureObject.convertedFilename = converted_filename
    figureObject.convertedStaticImage = converted_filenameStatic

# create s3 connection

    s3conn = S3Connection(AWS_ACCESS_KEY, AWS_SECRET_KEY)
    bucket = s3conn.get_bucket('figurezero')
    key = bucket.get_key(message_dict['key'])

# verify key exists on 

    if key.exists():

        # update status
        figureObject.processingStatus = 'Key found, downloading'
        print figureObject.processingStatus

        #verify download directory exists, if not create
        if not os.path.exists(local_path):
            figureObject.processingStatus = 'Path doesnt exist, creating'
            print figureObject.processingStatus
            os.makedirs(local_path)
        else:
            figureObject.processingStatus = 'Path doesnt exist, creating'
            print figureObject.processingStatus


        #download to local
        key.get_contents_to_filename(local_filename)

        figureObject.stat = 3
        figureObject.processingStatus = 'Transferred to conversion server.'
        figureObject.save()

        if os.path.exists(local_filename):
            # update status
            figureObject.processingStatus = 'File downloaded, engage conversion'
            print figureObject.processingStatus

            if original_extension.lower() in ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.psd', '.ps', '.svg', '.jp2']:


# inkscape sumatra_poster_Neuroinf2011.svg --export-png=testposter.png -d 96
                if 'svg' in original_extension.lower():



                    cmdstr = '/usr/bin/inkscape %s -d 96 --export-png=%s ' % (local_filename, converted_filename)
                    pcmd = os.popen(cmdstr)
                    for e in pcmd:
                        print e

                    scale_cmdstr = '/usr/bin/convert %s -quality 80 -resize 512x512 %s' % (converted_filename, converted_filenameStatic)
                    pcmd = os.popen(scale_cmdstr)
                    for e in pcmd:
                        print e

                else:

                    cmdstr = '/usr/bin/convert -density 96 %s %s ' % (local_filename, converted_filename)
                    pcmd = os.popen(cmdstr)
                    for e in pcmd:
                        print e

                    scale_cmdstr = '/usr/bin/convert %s -quality 80 -resize 512x512 %s' % (converted_filename, converted_filenameStatic)
                    pcmd = os.popen(scale_cmdstr)
                    for e in pcmd:
                        print e


                print os.path.abspath(os.curdir)

                # update status
                figureObject.processingStatus = 'File converted, Starting tile process'
                print figureObject.processingStatus

                figureObject.stat = 4 # convert okay
                figureObject.processingStatus = 'Converted into standard form.'
                figureObject.save()
                
                cmdstr = '/usr/bin/identify -format "%%wx%%h" %s ' % (converted_filename)
                pcmd = os.popen(cmdstr)
                
                firstLine = True
                for e in pcmd:
                    if firstLine:
                        figureObject.originalImageSize = e
                        firstLine = False
                    print e

                import opentiler
                opentiler.tile(converted_filename, False, local_path, local_path, False, 1, 1)

                # update status
                figureObject.stat = 5 # tiled okay
                figureObject.processingStatus = 'Tiles created.'
                print figureObject.processingStatus

                static_location = '%s/s3/%s/%s-512.jpg' % (activedomain, rootID, imageID)
                image_properties_location = '%s/s3/%s/%s/ImageProperties.xml' % (activedomain, rootID, imageID)
                tile_location = '%s/s3/%s/%s/' % (activedomain, rootID, imageID)
                thumbnail_location = '%s/s3/%s/%s/TileGroup0/0-0-0.jpg' % (activedomain, rootID, imageID)

                s3image_properties_location = 'https://s3.amazonaws.com/fzero/tile/%s/%s/ImageProperties.xml' % (rootID, imageID)
                s3tile_location = 'https://s3.amazonaws.com/fzero/tile/%s/%s/' % (rootID, imageID)
                s3thumbnail_location = 'https://s3.amazonaws.com/fzero/tile/%s/%s/TileGroup0/0-0-0.jpg' % (rootID, imageID)
                s3static = 'https://s3.amazonaws.com/fzero/tile/%s/%s-512.jpg' % (rootID, imageID)

                figureObject.s3static = s3static
                figureObject.static_location = static_location

                figureObject.imagePropertiesLocation = image_properties_location
                figureObject.s3imagePropertiesLocation = s3image_properties_location
                                
                figureObject.tileLocation = tile_location 
                figureObject.s3tileLocation = s3tile_location
                
                figureObject.thumbnailLocation = thumbnail_location
                figureObject.s3thumbnailLocation = s3thumbnail_location

                figureObject.referenceArray = []
                figureObject.viewArray = []

                figureObject.save()

                #create upload message
                new_m = Message()

                message_dict = {}
                message_dict['upload_dir'] = local_path
                message_dict['upload_bucket'] = 'fzero'
                message_dict['rootID'] = rootID
                message_dict['parseID'] = figureObject.objectId()
                # message_dict['key'] = key_name
                # message_dict['tilekey'] = uuid_string

                new_m.set_body(json.dumps(message_dict))
                status = upload_q.write(new_m)


        # else downloaded file does not exist
        else:

            # update status
            figureObject.processingStatus = 'Error occurred during download'
            print figureObject.processingStatus
            figureObject.save()

    # else key not found
    else:

        figureObject.processingStatus = 'Key not found in S3 bucket'
        print figureObject.processingStatus
        figureObject.save()



if __name__ == '__main__':

    clearQueue = False
    if clearQueue:
        convert_q.clear()
        upload_q.clear()


    while(True):
        
        if convert_q.count() > 0:

            temp_message = convert_q.read(10)

            import types
            if not isinstance(temp_message, types.NoneType):

                p = Process(target=processMessageFromSQS, args=(temp_message,))
                p.start()
                p.join()

        time.sleep(3)
















