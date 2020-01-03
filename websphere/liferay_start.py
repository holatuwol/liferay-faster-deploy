#!/usr/bin/env python

war_name = 'liferay.war'
app_name = 'liferay_war'

# Start the application

app_manager = AdminControl.queryNames('cell=DefaultCell01,node=DefaultNode01,type=ApplicationManager,process=server1,*')

AdminControl.invoke(app_manager, 'startApplication', '[%s]' % app_name)