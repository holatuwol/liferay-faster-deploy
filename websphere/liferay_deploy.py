war_name = 'liferay.war'
app_name = 'liferay_war'

# Define utility methods

app_manager = AdminControl.queryNames('cell=DefaultCell01,node=DefaultNode01,type=ApplicationManager,process=server1,*')

# Deploy Liferay

try:
	AdminControl.invoke(app_manager, 'stopApplication', '[DefaultApplication]')
	AdminApp.uninstall('DefaultApplication')

	AdminConfig.save()
except:
	pass

AdminApp.install(
	'/opt/IBM/WebSphere/AppServer/profiles/AppSrv01/liferay/%s' % war_name,
	'[ -preCompileJSPs -distributeApp -nouseMetaDataFromBinary -appname %s -createMBeansForResources -noreloadEnabled -nodeployws -validateinstall warn -noprocessEmbeddedConfig -filepermission .*\.dll=755#.*\.so=755#.*\.a=755#.*\.sl=755 -noallowDispatchRemoteInclude -noallowServiceRemoteInclude -asyncRequestDispatchType DISABLED -nouseAutoLink -noenableClientModule -clientMode isolated -novalidateSchema -contextroot / -MapModulesToServers [[ %s %s,WEB-INF/web.xml WebSphere:cell=DefaultCell01,node=DefaultNode01,server=server1 ]] -MapWebModToVH [[ %s %s,WEB-INF/web.xml default_host ]] -MetadataCompleteForModules [[ %s %s,WEB-INF/web.xml true ]]]' % (app_name, war_name, war_name, war_name, war_name, war_name, war_name))

AdminConfig.save()

# Start the application

AdminControl.invoke(app_manager, 'startApplication', '[%s]' % app_name)