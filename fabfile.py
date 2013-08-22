from __future__ import with_statement
from fabric.api import *

from fabric.contrib.console import confirm
from fabric.contrib.files import exists, sed

import boto
from boto.s3.key import Key
from boto import ec2

from datetime import datetime
import sys, pprint, time, ConfigParser

ec2keypairname = 'ec2-keypair'
localkeypath = '/Users/stonerri/.ssh/ec2-keypair'
baseAMI = 'ami-3d4ff254'

application_dir = 'figurezero'

aws_access_key_id = 'AWS_ACCESS_ID'
aws_secret_access_key ='AWS_ACCESS_SECRET'

def launch():
	'''Creates a new large instance on ec2'''	
	with settings(warn_only = True):
		conn = ec2.EC2Connection(aws_access_key_id, aws_secret_access_key)
		
		time.sleep(1)

		reservation = conn.run_instances(baseAMI, instance_type='m1.small', key_name='ec2-keypair')
		
		time.sleep(1)

		instance = reservation.instances[0]
		
		time.sleep(1)

		print 'Starting instance %s' %(instance)
		while not instance.update() == 'running':
			time.sleep(1)

		#print 'Instance started.'
		instance.add_tag('Name', 'fz-automated-deploy')
		
		time.sleep(1)	
		
		print 'Instance started: %s' % instance.__dict__['id']
		print 'Private DNS: %s' % instance.__dict__['private_dns_name']
		print 'Private IP: %s' % instance.__dict__['private_ip_address']
		print 'Public DNS: %s' % instance.__dict__['public_dns_name']
		
		# print '\n------------- ' + strftime("%Y-%m-%d %H:%M:%S", gmtime()) + '-------------'
		return instance



def new():
	env.user = 'ubuntu'
	env.host_string ='ec2-54-234-245-185.compute-1.amazonaws.com'
	env.key_filename = [localkeypath]

def medsdk():
	env.user = 'ubuntu'
	env.host_string ='medsdk.com'
	env.key_filename = [localkeypath]

def figurezero():
	env.user = 'ubuntu'
	env.host_string ='figurezero.com'
	env.key_filename = [localkeypath]

def test():
	run('uname -a')

def base():
	'''Basic packages for building, version control'''
	with settings(warn_only=True):
		
		# update existing tools
		run("sudo apt-get -y update", pty = True)
		run("sudo apt-get -y upgrade", pty = True)		
		
		# install build and CVS tools
		packagelist = ['git-core', 'mercurial', 'subversion', 'unzip', 'build-essential', 'g++', 'nginx-extras']
		run('sudo apt-get -y install %s' % ' '.join(packagelist), pty = True)




def python():
	'''This installs the most recent stable build of nginx 1.0+'''
	with settings(warn_only=True):
		
		# install python components
		packagelist = ['python-setuptools', 'python-pip', 'python-dev', 'python-lxml', 'libxml2-dev', 'python-imaging']
		run('sudo apt-get -y install %s' % ' '.join(packagelist), pty = True)

		packagelist = ['tornado', 'supervisor', 'virtualenv']
		
		for each_package in packagelist: 
			print each_package
			run('sudo pip install %s' % each_package, pty = True)


def fzBase():
	'''This installs the most recent stable build of nginx 1.0+'''
	with settings(warn_only=True):
		
		# install python components
		packagelist = ['imagemagick', 'inkscape']
		run('sudo apt-get -y install %s' % ' '.join(packagelist), pty = True)

		packagelist = ['boto']
		for each_package in packagelist: 
			print each_package
			run('sudo pip install %s' % each_package, pty = True)

		sudo('pip install -e git://github.com/bitly/bitly-api-python.git#egg=bitly_api')

		run('wget http://closure-compiler.googlecode.com/files/compiler-latest.zip')
		run('unzip compiler-latest.zip')
		# install python components
		packagelist = ['default-jre']
		for each_package in packagelist: 		
			run('sudo apt-get -y install %s' % each_package, pty = True)


def deploy():

	with settings(warn_only=True):
		
		put('id_rsa.pub','.ssh/id_rsa')
		put('id_rsa', '.ssh/id_rsa')
		
		sudo('chmod 0600 .ssh/id_rsa')
		sudo('chmod 0600 .ssh/id_rsa.pub')

		# this will ask for a password
		if exists('fz'):
			with cd('fz'):
				run('git pull --rebase -f')
		else:
			with cd('fz'):
				run('git clone git@github.com:richstoner/fz.git')

		#make log dirs
		run('mkdir -p fz/log')
		run('mkdir -p fz/log/supervisord')

		# unlink
		sudo('rm /etc/supervisord.conf')
		sudo('rm /etc/init.d/supervisord')

		# link
		sudo('ln -s /home/ubuntu/fz/conf/supervisord.conf /etc/supervisord.conf')
		sudo('ln -s /home/ubuntu/fz/conf/supervisord /etc/init.d/supervisord')

		# set to start
		sudo('update-rc.d supervisord defaults')

		sudo('rm /etc/nginx/nginx.conf')
		run('cp /home/ubuntu/fz/conf/nginx-base.conf /home/ubuntu/fz/conf/nginx-auto.conf')
		
		sed('/home/ubuntu/fz/conf/nginx-auto.conf', 'AUTOWWWDOMAIN', 'www.' + env.host_string)
		sed('/home/ubuntu/fz/conf/nginx-auto.conf', 'AUTODOMAIN', env.host_string)

		sudo('ln -s /home/ubuntu/fz/conf/nginx-auto.conf /etc/nginx/nginx.conf')
		sudo('service nginx force-reload')

		sudo('rm fz/conf/app.cfg')
		run('cp /home/ubuntu/fz/conf/app-base.cfg /home/ubuntu/fz/conf/app-auto.cfg')
		sed('/home/ubuntu/fz/conf/app-auto.cfg', 'AUTODOMAIN', env.host_string)

		sudo('ln -s /home/ubuntu/fz/conf/app-auto.cfg /home/ubuntu/fz/conf/app.cfg')
		sudo('service supervisord restart')
		sudo('supervisorctl restart all')

		sudo('mkdir /srv/localdata')
		sudo('chown ubuntu:ubuntu /srv/localdata')
		sudo('rm /home/ubuntu/fz/sumo/local')
		run('ln -s /srv/localdata /home/ubuntu/fz/sumo/local')




def fzSuper():
	with settings(warn_only=True):
		# compress
		local('zip -vr conf.zip fz/conf/ -x "*.DS_Store"')
		put('conf.zip', 'conf.zip')
		
		#copy
		run('unzip -o conf.zip')

		#make log dirs
		run('mkdir -p fz/log')
		run('mkdir -p fz/log/supervisord')

		# unlink
		sudo('rm /etc/supervisord.conf')
		sudo('rm /etc/init.d/supervisord')

		# link
		sudo('ln -s /home/ubuntu/fz/conf/supervisord.conf /etc/supervisord.conf')
		sudo('ln -s /home/ubuntu/fz/conf/supervisord /etc/init.d/supervisord')

		# set to start
		sudo('update-rc.d supervisord defaults')


def fzUpdateConfig():
	
	with settings(warn_only=True):
		# compress
		local('zip -vr conf.zip fz/conf/ -x "*.DS_Store"')
		put('conf.zip', 'conf.zip')
		
		#copy
		run('unzip -o conf.zip')








def fzDev():
	with settings(warn_only=True):

		sudo('rm /etc/nginx/nginx.conf')
		sudo('ln -s /home/ubuntu/fz/conf/nginx-wsiecc.conf /etc/nginx/nginx.conf')
		sudo('service nginx force-reload')

		sudo('rm fz/conf/app.cfg')
		sudo('ln -s /home/ubuntu/fz/conf/app-dev.cfg /home/ubuntu/fz/conf/app.cfg')
		sudo('service supervisord restart')
		sudo('supervisorctl restart all')


def fzCompileMags():

	with settings(warn_only=True):
		
		run('python fz/mags/compile.py')
		sudo('supervisorctl restart tornado')
		

# def fzPro():
# 	with settings(warn_only=True):

# 		sudo('rm /etc/nginx/nginx.conf')
# 		sudo('ln -s /home/ubuntu/fz/conf/nginx-wsiecc.conf /etc/nginx/nginx.conf')
# 		sudo('service nginx force-reload')

# 		sudo('rm fz/conf/app.cfg')
# 		sudo('ln -s /home/ubuntu/fz/conf/app-prod.cfg /home/ubuntu/fz/conf/app.cfg')
# 		sudo('supervisorctl restart all')



# def fzMags():
# 	with settings(warn_only=True):
# 		local('zip -vr mags.zip fz/mags/ -x "*.DS_Store"')
# 		put('mags.zip', 'mags.zip')
# 		run('unzip -o mags.zip')
		

def fzEnableMags():
	with settings(warn_only=True):

		run('ln -s /home/ubuntu/fz/conf/tornado.conf /home/ubuntu/fz/conf/super/tornado.conf')
		sudo('supervisorctl reread')
		sudo('supervisorctl add tornado')
		sudo('supervisorctl stop tornado')


def disableMags():
	with settings(warn_only=True):

		sudo('supervisorctl stop tornado')
		sudo('supervisorctl remove tornado')
		sudo('rm /home/ubuntu/fz/conf/super/tornado.conf')


# def fzSumo():
# 	with settings(warn_only=True):
# 		local('zip -vr sumo.zip fz/sumo/ -x "*.DS_Store"')
# 		put('sumo.zip', 'sumo.zip')
# 		run('unzip -o sumo.zip')
	
# 		sudo('mkdir /srv/localdata')
# 		sudo('chown ubuntu:ubuntu /srv/localdata')
# 		sudo('rm /home/ubuntu/fz/sumo/local')
# 		run('ln -s /srv/localdata /home/ubuntu/fz/sumo/local')


def fzEnableSumo():		
	with settings(warn_only=True):		
		run('ln -s /home/ubuntu/fz/conf/converter.conf /home/ubuntu/fz/conf/super/converter.conf')
		run('ln -s /home/ubuntu/fz/conf/upload.conf /home/ubuntu/fz/conf/super/upload.conf')

		sudo('supervisorctl reread')
		sudo('supervisorctl add s3upload')
		sudo('supervisorctl stop s3upload')
		sudo('supervisorctl add converter')
		sudo('supervisorctl stop converter')


def fzDisableSumo():		
	with settings(warn_only=True):		
		
		sudo('supervisorctl stop s3upload')
		sudo('supervisorctl remove s3upload')
		sudo('supervisorctl stop converter')
		sudo('supervisorctl remove converter')

		sudo('rm /home/ubuntu/fz/conf/super/upload.conf')
		sudo('rm /home/ubuntu/fz/conf/super/converter.conf')

















