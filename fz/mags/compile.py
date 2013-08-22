#!/usr/bin/env python

java_location = '/usr/bin/java'
compiler_location = '/home/ubuntu/compiler.jar'

cmdstr = '%s -jar %s --help' % (java_location, compiler_location)

import os

# APP
# java -jar compiler.jar --js=in1.js --js=in2.js ... --js_output_file=out.js

print 'building app.min.js'

app_list = []
app_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
app_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')
app_list.append('--js=/home/ubuntu/fz/mags/static/js/jquery.cookie.js')
app_list.append('--js=/home/ubuntu/fz/mags/static/js/app.js')

app_str = ' '.join(app_list)

cmdstr = '%s -jar %s %s --js_output_file=/home/ubuntu/fz/mags/static/prod/app.min.js' % (java_location, compiler_location, app_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e

print 'building approve.min.js'

approve_list = []
approve_list.append('--js=/home/ubuntu/fz/mags/static/js/approveapp.js')
approve_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
approve_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')
approve_list.append('--js=/home/ubuntu/fz/mags/static/lib/Control.FullScreen.js')

approve_str = ' '.join(approve_list)

cmdstr = '%s -jar %s  %s --js_output_file=/home/ubuntu/fz/mags/static/prod/approve.min.js' % (java_location, compiler_location, approve_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e


print 'building ref.min.js'

ref_list = []
ref_list.append('--js=/home/ubuntu/fz/mags/static/js/editRefApp.js')
ref_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
ref_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')
ref_list.append('--js=/home/ubuntu/fz/mags/static/js/leaflet.draw.js')
ref_list.append('--js=/home/ubuntu/fz/mags/static/lib/Control.FullScreen.js')

ref_str = ' '.join(ref_list)

cmdstr = '%s -jar %s %s  --js_output_file=/home/ubuntu/fz/mags/static/prod/ref.min.js' % (java_location, compiler_location, ref_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e

print 'building roi.min.js'

roi_list = []
roi_list.append('--js=/home/ubuntu/fz/mags/static/js/editViewApp.js')
roi_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
roi_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')
roi_list.append('--js=/home/ubuntu/fz/mags/static/js/leaflet.draw.js')
roi_list.append('--js=/home/ubuntu/fz/mags/static/lib/Control.FullScreen.js')

roi_str = ' '.join(roi_list)

cmdstr = '%s -jar %s %s --js_output_file=/home/ubuntu/fz/mags/static/prod/roi.min.js' % (java_location, compiler_location, roi_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e


print 'building fz.min.js'

fz_list = []
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/publishApp.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/leaflet.draw.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/lib/Control.FullScreen.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/textext.min.js')

fz_str = ' '.join(fz_list)

cmdstr = '%s -jar %s %s --js_output_file=/home/ubuntu/fz/mags/static/prod/fz.min.js' % (java_location, compiler_location, fz_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e


print 'building fs.min.js'

fz_list = []
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/publishFull.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/leaflet.draw.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/lib/Control.FullScreen.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/textext.min.js')

fz_str = ' '.join(fz_list)

cmdstr = '%s -jar %s %s --js_output_file=/home/ubuntu/fz/mags/static/prod/fs.min.js' % (java_location, compiler_location, fz_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e	

print 'building sum.min.js'

sum_list = []

sum_list.append('--js=/home/ubuntu/fz/mags/static/js/summaryApp.js')
sum_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
sum_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')

sum_str = ' '.join(sum_list)

cmdstr = '%s -jar %s %s --js_output_file=/home/ubuntu/fz/mags/static/prod/sum.min.js' % (java_location, compiler_location, sum_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e




print 'building wall.min.js'

fz_list = []
fz_list.append('--js=/home/ubuntu/fz/mags/static/js/wall.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/prod/underscore-min.js')
fz_list.append('--js=/home/ubuntu/fz/mags/static/prod/parse-1.0.18.min.js')

fz_str = ' '.join(fz_list)

cmdstr = '%s -jar %s %s --js_output_file=/home/ubuntu/fz/mags/static/prod/wall.min.js' % (java_location, compiler_location, fz_str)

pipe = os.popen(cmdstr)
for e in pipe:
	print e













