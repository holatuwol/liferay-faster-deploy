#!/usr/bin/env python

import os

war_name = 'liferay.war'
app_name = 'liferay_war'

# Define utility methods

def get_config(type, filter=None):
    return [x[x.find('(')+1:x.rfind(')')] for x in AdminConfig.list(type).split('\n') if len(x) > 0 and (filter is None or x.find(filter) != -1)]

# Setup global library

def get_library_classloaders(config_id):
    namespace = config_id.split('|')[0]

    classloaders = get_config('Classloader', namespace)

    for classloader in classloaders:
        classloader_properties = AdminConfig.showall('(%s)' % classloader)

        if classloader_properties.find('PARENT_LAST') == -1:
            AdminConfig.modify('(%s)' % classloader, [['mode', 'PARENT_LAST']])

    if len(classloaders) == 0:
        AdminConfig.create('Classloader', '(%s)' % config_id, [['mode', 'PARENT_LAST']])
        AdminConfig.save()

        classloaders = get_config('Classloader', namespace)

    return classloaders

def add_shared_library_ref(config_type, config_filter, library_name):
    for config_id in get_config(config_type, config_filter):
        classloaders = get_library_classloaders(config_id)

        for classloader in classloaders:
            AdminConfig.create('LibraryRef', '(%s)' % classloader, [['libraryName', library_name]])
            AdminConfig.save()

def get_shared_library_files(shared_library_folder):
    if not os.path.isdir(shared_library_folder):
        return []

    return ['%s/%s' % (shared_library_folder, file) for file in os.listdir(shared_library_folder)]

def setup_shared_library(name, folder):
    if not os.path.isdir(folder):
        os.makedirs(folder)

    for server in get_config('Server'):
        AdminConfig.create(
            'Library', '(%s)' % server,
            '[[nativePath ""] [name "%s"] [isolatedClassLoader "false"] [description ""] [classPath "%s"]]' % (name, folder))
        AdminConfig.save()
    
# Uninstall the default application

def uninstall_default_application():
    app_manager = AdminControl.queryNames('cell=DefaultCell01,node=DefaultNode01,type=ApplicationManager,process=server1,*')

    try:
        AdminControl.invoke(app_manager, 'stopApplication', '[DefaultApplication]')

        AdminApp.uninstall('DefaultApplication')
        AdminConfig.save()
    except:
        pass

# Install Liferay

def install_liferay():
    setup_shared_library('liferay-global', '/opt/IBM/WebSphere/AppServer/profiles/AppSrv01/liferay/shared_global_library')
    add_shared_library_ref('ApplicationServer', None, 'liferay-global')

    AdminApp.install(
        '/opt/IBM/WebSphere/AppServer/profiles/AppSrv01/liferay/%s' % war_name,
        ['-preCompileJSPs', '-distributeApp', '-nouseMetaDataFromBinary', '-appname', app_name, '-createMBeansForResources', '-noreloadEnabled', '-nodeployws', '-validateinstall', 'warn', '-noprocessEmbeddedConfig', '-filepermission', '.*\\.so=755', '-noallowDispatchRemoteInclude', '-noallowServiceRemoteInclude', '-asyncRequestDispatchType', 'DISABLED', '-nouseAutoLink', '-noenableClientModule', '-clientMode', 'isolated', '-novalidateSchema', '-contextroot', '/', '-MapModulesToServers', '[[%s %s,WEB-INF/web.xml WebSphere:cell=DefaultCell01,node=DefaultNode01,server=server1]]' % (war_name, war_name), '-MapWebModToVH', '[[%s %s,WEB-INF/web.xml default_host]]' % (war_name, war_name), '-MetadataCompleteForModules', '[[%s %s,WEB-INF/web.xml "true"]]' % (war_name, war_name)])
    AdminConfig.save()

    setup_shared_library('liferay-application', '/opt/IBM/WebSphere/AppServer/profiles/AppSrv01/liferay/shared_application_library')
    add_shared_library_ref('ApplicationDeployment', app_name, 'liferay-application')
    AdminConfig.save()

uninstall_default_application()
install_liferay()