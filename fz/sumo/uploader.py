#!/usr/bin/env python

from multiprocessing import Process
import datetime, os, time, json
from threading import Thread

import ParsePy
import boto
import ConfigParser

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


conn = SQSConnection(AWS_ACCESS_KEY, AWS_SECRET_KEY)

upload_q = conn.create_queue(_upload, 120)

def processMessageFromSQS(temp_message):

    message_dict = json.loads(temp_message.get_body())

    import pprint 
    pprint.pprint(message_dict)
    rootkey = message_dict['rootID']
    parseID = message_dict['parseID']

    os.chdir('/srv/localdata')
    _uploadBucket = config.get('fz', 'tilesUploadBucket')
    cmdstr = '/home/ubuntu/fz/sumo/s3parallel --content-type=guess --prefix=tile --bucket=%s ./%s' % (_uploadBucket, rootkey)
    
    pcmd = os.popen(cmdstr)
    for e in pcmd:
        pass
    
    os.chdir('..')

    _objectName = config.get('fz', 'figureObjectName')
    figureObject = ParsePy.ParseQuery(_objectName).get(parseID)
    figureObject.stat = 6
    figureObject.processingStatus = 'Uploaded to cloud.'
    figureObject.save()

    upload_q.delete_message(temp_message)

    

if __name__ == '__main__':

    clearQueue = False
    if clearQueue:
        upload_q.clear()

    while(True):
        
        if upload_q.count() > 0:
            
            temp_message = upload_q.read(30)

            import types
            if not isinstance(temp_message, types.NoneType):

                p = Process(target=processMessageFromSQS, args=(temp_message,))
                p.start()
                p.join()

        time.sleep(20)





