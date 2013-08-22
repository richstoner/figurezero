from multiprocessing import Process
import datetime, os, time, json
from threading import Thread

import boto
import ParsePy

from boto.s3.key import Key
from boto.sqs.message import Message
from boto.sqs.connection import SQSConnection
from boto.s3.connection import S3Connection

AWS_ACCESS_KEY = ''
AWS_SECRET_KEY =''

ParsePy.APPLICATION_ID = ""
ParsePy.MASTER_KEY = ""

conn = SQSConnection(AWS_ACCESS_KEY, AWS_SECRET_KEY)

convert_q = conn.create_queue('FZconvertQueue', 120)
upload_q = conn.create_queue('FZuploadQueue', 120)

convert_q.clear()
upload_q.clear()

query = ParsePy.ParseQuery("UploadObject")
fzobjects = query.fetch()

for fzobj in fzobjects:
	print fzobj.objectId()
	fzobj.delete()

print convert_q.count()
print upload_q.count()
print len(fzobjects)
