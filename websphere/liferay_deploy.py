#!/usr/bin/env python

import os

war_name = 'liferay.war'
app_name = 'liferay_war'

# Define utility methods

def get_config(type, filter=None):
    return [x[x.find('(')+1:x.rfind(')')] for x in AdminConfig.list(type).split('\n') if len(x) > 0 and (filter is None or x.find(filter) != -1)]

app_manager = AdminControl.queryNames('cell=DefaultCell01,node=DefaultNode01,type=ApplicationManager,process=server1,*')

# Setup global library

def get_library_classloader(config_id):
    namespace = config_id.split('|')[0]

    for classloader in get_config('Classloader', namespace):
        classloader_properties = AdminConfig.showall('(%s)' % classloader)

        if classloader_properties.find('PARENT_LAST') != -1:
            return classloader

    AdminConfig.create('Classloader', '(%s)' % config_id, [['mode', 'PARENT_LAST']])
    AdminConfig.save()

    return get_library_classloader(config_id)

def add_shared_library_ref(config_type, config_filter, library_name):
    for config_id in get_config(config_type, config_filter):
        classloader = get_library_classloader(config_id)

        AdminConfig.create('LibraryRef', '(%s)' % classloader, [['libraryName', library_name]])
        AdminConfig.save()

shared_library_files = []

def get_shared_library_files(shared_library_folder):
    shared_library_folder = '/opt/IBM/WebSphere/AppServer/lib/ext'

    if not os.path.isdir(shared_library_folder):
        return []

    return ['%s/%s' % (shared_library_folder, file) for file in os.listdir(shared_library_folder)]

shared_library_files = shared_library_files + get_shared_library_files('/opt/IBM/WebSphere/AppServer/lib/ext')
shared_library_files = shared_library_files + get_shared_library_files('/opt/IBM/WebSphere/AppServer/profiles/AppSrv01/liferay/shared_library')

classpath = ':'.join(shared_library_files)

for server in get_config('Server'):
    AdminConfig.create(
        'Library', '(%s)' % server,
        '[[nativePath ""] [name "liferay-global"] [isolatedClassLoader "false"] [description ""] [classPath "%s"]]' % classpath)
    AdminConfig.save()

add_shared_library_ref('ApplicationServer', None, 'liferay-global')

# Uninstall the default application

try:
    AdminControl.invoke(app_manager, 'stopApplication', '[DefaultApplication]')

    AdminApp.uninstall('DefaultApplication')
    AdminConfig.save()
except:
    pass

# Deploy Liferay

AdminApp.install(
    '/opt/IBM/WebSphere/AppServer/profiles/AppSrv01/liferay/%s' % war_name,
    ['-preCompileJSPs', '-distributeApp', '-nouseMetaDataFromBinary', '-appname', app_name, '-createMBeansForResources', '-noreloadEnabled', '-nodeployws', '-validateinstall', 'warn', '-noprocessEmbeddedConfig', '-filepermission', '.*\\.so=755', '-noallowDispatchRemoteInclude', '-noallowServiceRemoteInclude', '-asyncRequestDispatchType', 'DISABLED', '-nouseAutoLink', '-noenableClientModule', '-clientMode', 'isolated', '-novalidateSchema', '-contextroot', '/', '-MapModulesToServers', '[[%s %s,WEB-INF/web.xml WebSphere:cell=DefaultCell01,node=DefaultNode01,server=server1]]' % (war_name, war_name), '-MapWebModToVH', '[[%s %s,WEB-INF/web.xml default_host]]' % (war_name, war_name), '-MetadataCompleteForModules', '[[%s %s,WEB-INF/web.xml "true"]]' % (war_name, war_name)])
AdminConfig.save()

#add_shared_library_ref('ApplicationDeployment', app_name, '...')
#AdminConfig.save()

# Start the application

AdminControl.invoke(app_manager, 'startApplication', '[%s]' % app_name)