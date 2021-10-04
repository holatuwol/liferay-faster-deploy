import com.liferay.document.library.kernel.store.Store
import com.liferay.petra.io.StreamUtil
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
import com.liferay.portal.kernel.util.Base64
import com.liferay.portal.kernel.util.FileUtil
import com.liferay.portal.kernel.util.LocaleUtil
import com.liferay.portal.kernel.util.PortalClassLoaderUtil
import com.liferay.portal.kernel.util.StringUtil
import com.liferay.portal.upgrade.util.Table
import com.liferay.portlet.documentlibrary.store.StoreFactory
import com.liferay.registry.Registry
import com.liferay.registry.RegistryUtil

import java.lang.reflect.Field
import java.nio.file.Path
import java.sql.Connection
import java.text.NumberFormat
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import javax.sql.DataSource

boolean exportDatabase = true
boolean exportDocumentLibrary = false

NumberFormat format = NumberFormat.getNumberInstance(LocaleUtil.ENGLISH)

String liferayHome = System.getProperty("liferay.home")
String backupFolderName = liferayHome + "/data/backup"
String hsqlFolderName = backupFolderName + "/hypersonic"

new File(hsqlFolderName).mkdirs()

File hypersonicZip = new File(backupFolderName, "hypersonic.zip")
File documentLibraryZip = new File(backupFolderName, "document_library.zip")

DBType targetDBType = DBType.HYPERSONIC

Properties properties = new Properties()

properties.setProperty("driverClassName", "org.hsqldb.jdbc.JDBCDriver")
properties.setProperty("url", "jdbc:hsqldb:" + hsqlFolderName + "/lportal");
properties.setProperty("username", "sa");
properties.setProperty("password", "");

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

		targetConnection.prepareStatement("SHUTDOWN").execute()
	}
	finally {
		DataAccess.cleanUp(sourceConnection)
		DataAccess.cleanUp(targetConnection)
	}
}

def copyFolderToZip = { String inputFolderName, String outputFolderName, ZipOutputStream zipOutputStream ->
	File inputFolder = new File(inputFolderName)

	Path inputPath = inputFolder.toPath()

	inputFolder.eachFileRecurse({ inputFile ->
		if (!inputFile.isFile()) {
			return
		}

		String relativeName = inputPath.relativize(inputFile.toPath()).toString()

		zipOutputStream.putNextEntry(new ZipEntry(outputFolderName + "/" + relativeName))

		inputFile.withInputStream {
			StreamUtil.transfer(it, zipOutputStream, false)
		}

		zipOutputStream.closeEntry()
	})
}

def getUnwrappedStore = { Store store ->
	while (store.getClass().getName().endsWith("Wrapper")) {
		store = store.store
	}

	return store
}

def createBackupZipBlob = { String inputFolderName, String outputFolderName, String fileName, File file, int compressionLevel ->
	ZipOutputStream zipOutputStream = new ZipOutputStream(new FileOutputStream(file))
	zipOutputStream.setLevel(compressionLevel)
	copyFolderToZip(inputFolderName, outputFolderName, zipOutputStream)
	zipOutputStream.close()

	int used = out._writer._outputStream.size()
	int available = (1024 * 1024 * 1024) - used

	if (available < file.size()) {
		out.print("<li>${fileName}: too large  (${format.format(file.size())} bytes)</li>")
	}
	else {
		byte[] bytes = FileUtil.getBytes(file)

		String base64Data = Base64.encode(bytes)

		out.print("<li>${fileName}: <a download='${fileName}' id='${fileName}'>download</a> (${format.format(file.size())} bytes)</li><script>fetch('data:application/zip;base64,${base64Data}').then(res => res.blob()).then(blob => { document.getElementById('${fileName}').href = URL.createObjectURL(blob) })</script>")
	}
}

try {
	out.print("<ul>")

	if (exportDatabase) {
		copyTables()

		System.out.println("Database conversion completed")

		createBackupZipBlob(hsqlFolderName, "hypersonic", "hypersonic.zip", hypersonicZip, 9)
	}

	if (exportDocumentLibrary) {
		def store = getUnwrappedStore(StoreFactory.getInstance().getStore())
		String storeFolderName = store.getRootDirPath().toString()
		createBackupZipBlob(storeFolderName, "document_library", "document_library.zip", documentLibraryZip, 0)
	}

	out.print("</ul>")
}
catch (Exception e) {
	e.printStackTrace(out)
}
finally {
	FileUtil.deltree(backupFolderName)
}
