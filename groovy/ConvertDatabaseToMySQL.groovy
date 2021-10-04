import com.liferay.petra.string.StringPool
import com.liferay.portal.kernel.annotation.ImplementationClassName
import com.liferay.portal.kernel.dao.db.DB
import com.liferay.portal.kernel.dao.db.DBManagerUtil
import com.liferay.portal.kernel.dao.db.DBType
import com.liferay.portal.kernel.dao.jdbc.DataAccess
import com.liferay.portal.kernel.dao.jdbc.DataSourceFactoryUtil
import com.liferay.portal.kernel.model.ModelHintsUtil
import com.liferay.portal.kernel.module.framework.service.IdentifiableOSGiService
import com.liferay.portal.kernel.service.PersistedModelLocalService
import com.liferay.portal.kernel.service.PersistedModelLocalServiceRegistryUtil
import com.liferay.portal.kernel.util.PortalClassLoaderUtil
import com.liferay.portal.kernel.util.StringUtil
import com.liferay.portal.upgrade.util.Table
import com.liferay.registry.Registry
import com.liferay.registry.RegistryUtil

import java.lang.reflect.Field
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import javax.sql.DataSource

DBType targetDBType = DBType.MYSQL

String databaseHostName = "172.17.0.3"
String databaseSchema = "lportal"
String databaseUsername = "lportal"
String databasePassword = "lportal"

Properties properties = new Properties()

properties.setProperty("driverClassName", "com.mysql.cj.jdbc.Driver")
properties.setProperty("url", "jdbc:mysql://${databaseHostName}/${databaseSchema}?characterEncoding=UTF-8&dontTrackOpenResources=true&holdResultsOpenOverStatementClose=true&useFastDateParsing=false&useUnicode=true");
properties.setProperty("username", databaseUsername);
properties.setProperty("password", databasePassword);

Registry registry = RegistryUtil.getRegistry()

def getModelImplClass = { String className ->
	PersistedModelLocalService persistedModelLocalService = PersistedModelLocalServiceRegistryUtil.getPersistedModelLocalService(className)

	ClassLoader serviceClassLoader

	if ((persistedModelLocalService == null) || !(persistedModelLocalService instanceof IdentifiableOSGiService)) {
		if (className.startsWith("com.liferay.counter") || className.startsWith("com.liferay.portal") || className.startsWith("com.liferay.portlet")) {
			serviceClassLoader = PortalClassLoaderUtil.getClassLoader()
		}
		else {
			String serviceClassName = StringUtil.replace(className,".model.", ".service.persistence.") + "Persistence"

			def services = registry.getServices(serviceClassName, null)

			if ((services != null) && (services.length > 0)) {
				serviceClassLoader = services[0].getClass().getClassLoader()
			}
		}
	}
	else {
		serviceClassLoader = persistedModelLocalService.getClass().getClassLoader()
	}

	try {
		Class<?> modelClass = serviceClassLoader.loadClass(className)

		ImplementationClassName implementationClassNameAnnotation = modelClass.getAnnotation(ImplementationClassName.class)

		String modelImplClassName = modelImplClassName = implementationClassNameAnnotation.value()

		return serviceClassLoader.loadClass(modelImplClassName)
	}
	catch (Exception e) {
		out.print("<li>Unable to identify model class for " + className + "</li>")

		return null
	}
}

Set<String> copiedTables = new HashSet<>()

def copyTable = { DB targetDB, Connection sourceConnection, Connection targetConnection, Class<?> implClass, Field tableField, String tableFieldVar ->
	String columnsFieldVar = StringUtil.replace(tableFieldVar, "_NAME", "_COLUMNS");
	String sqlCreateFieldVar = StringUtil.replace(tableFieldVar, "_NAME", "_SQL_CREATE");

	Field columnsField = implClass.getField(columnsFieldVar)
	Field sqlCreateField = implClass.getField(sqlCreateFieldVar)

	String tableName = (String) tableField.get(StringPool.BLANK)

	if (!copiedTables.add(tableName)) {
		return
	}

	PreparedStatement ps = targetConnection.prepareStatement("select 1 from information_schema.tables where table_name = ?");

	try {
		ps.setString(1, tableName)

		ResultSet rs = ps.executeQuery()

		if (rs.next()) {
			System.out.println("Skipping ${tableName} because it already exists")

			return
		}
	}
	finally {
		DataAccess.cleanUp(ps)
	}

	String sqlCreate = (String) sqlCreateField.get(StringPool.BLANK)

	targetDB.runSQL(targetConnection, sqlCreate)

	Object[][] columns = (Object[][]) columnsField.get(new Object[0][0])

	Table table = new Table(tableName, columns)

	table.generateTempFile(sourceConnection)
	table.populateTable(targetConnection)
}

def copyTables = {
	Thread currentThread = Thread.currentThread()
	ClassLoader threadClassLoader = currentThread.getContextClassLoader()

	DataSource targetDataSource = null

	try {
		currentThread.setContextClassLoader(PortalClassLoaderUtil.getClassLoader())
		targetDataSource = DataSourceFactoryUtil.initDataSource(properties)
	}
	finally {
		currentThread.setContextClassLoader(threadClassLoader)
	}

	DB targetDB = DBManagerUtil.getDB(targetDBType, targetDataSource)

	Connection sourceConnection = DataAccess.getConnection()
	Connection targetConnection = targetDataSource.getConnection()

	targetConnection.setAutoCommit(true)

	try {
		List<String> modelNames = ModelHintsUtil.getModels()

		modelNames.each({ String className ->
			Class<?> modelImplClass = getModelImplClass(className)

			if (modelImplClass == null) {
				return
			}

			Field[] fields = modelImplClass.getFields();

			for (Field field : fields) {
				String fieldName = field.getName();

				if (fieldName.equals("TABLE_NAME") ||
					(fieldName.startsWith("MAPPING_TABLE_") && fieldName.endsWith("_NAME"))) {

					copyTable(targetDB, sourceConnection, targetConnection, modelImplClass, field, fieldName)
				}
			}

		})
	}
	finally {
		DataAccess.cleanUp(sourceConnection)
		DataAccess.cleanUp(targetConnection)
	}
}

try {
	copyTables()

	System.out.println("Database conversion completed")
}
catch (Exception e) {
	e.printStackTrace(out)
}
