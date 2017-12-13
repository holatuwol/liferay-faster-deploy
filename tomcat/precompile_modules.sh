#!/bin/bash

TOMCAT_HOME=$PWD
LIFERAY_HOME=$(dirname $TOMCAT_HOME)

build_classpaths() {
	mkdir -p ${LIFERAY_HOME}/precompile/

	cat /dev/null > ${LIFERAY_HOME}/imports.csv

	pushd ${LIFERAY_HOME} > /dev/null

	for jar in $(find unzipped_jars -name '*.jsp' -type f | cut -d'/' -f 2 | sort -u); do
		local manifest=unzipped_jars/${jar}/META-INF/MANIFEST.MF
		local BUNDLE_NAME=$(grep '^Bundle-SymbolicName:' ${manifest} | cut -d':' -f 2 | tr -d '[:space:]')
		local BUNDLE_VERSION=$(grep '^Bundle-Version:' ${manifest} | cut -d':' -f 2 | tr -d '[:space:]')
		local WORK_FOLDER=${BUNDLE_NAME}-${BUNDLE_VERSION}

		if [ ! -d ${LIFERAY_HOME}/work/${WORK_FOLDER} ]; then
			continue
		fi

		csvmanifest Import ${manifest} "${jar},${WORK_FOLDER}" >> ${LIFERAY_HOME}/imports.csv
	done

	popd > /dev/null
}

collect_exports() {
	cat /dev/null > "${LIFERAY_HOME}/exports.csv"

	mkdir -p ${LIFERAY_HOME}/unzipped_jars

	for jar in $(find ${LIFERAY_HOME}/zipped_jars -name '*.jar'); do
		local JAR_NAME=$(basename ${jar})

		if [ ! -d ${LIFERAY_HOME}/unzipped_jars/${JAR_NAME} ]; then
			unzip -qq ${jar} -d ${LIFERAY_HOME}/unzipped_jars/${JAR_NAME}
		fi

		for manifest in MANIFEST.MF system.packages.extra.mf; do
			if [ -f ${LIFERAY_HOME}/unzipped_jars/${JAR_NAME}/META-INF/${manifest} ]; then
				csvmanifest Export ${LIFERAY_HOME}/unzipped_jars/${JAR_NAME}/META-INF/${manifest} ${JAR_NAME} >> "${LIFERAY_HOME}/exports.csv"
			fi
		done
	done
}

collect_jars() {
	mkdir -p ${LIFERAY_HOME}/zipped_jars

	for lpkg in $(find ${LIFERAY_HOME}/osgi/marketplace -name '*.lpkg'); do
		unzip -qq $lpkg -d ${LIFERAY_HOME}/zipped_jars
	done

	for folder in core modules portal static marketplace/override; do
		for file in $(find ${LIFERAY_HOME}/osgi/$folder -name '*.jar'); do
			cp -f $file ${LIFERAY_HOME}/zipped_jars
		done
	done
}

csvmanifest() {
	sed -n "/${1}-Package/,/^[^ ]/p" ${2} | sed '$d' | sed "1s/${1}-Package://" | tr -d '[:space:]' | \
		sed 's/",/"\n/g' | sed 's/;uses:="[^"]*"//g' | sed 's/;version=/,/g' | sed 's/,\([^"0-9]\)/\n\1/g' | \
		cut -d',' -f 1 | sort | awk '{ print "'${3}'," $1 }'
}

precompile_jsps() {
	echo TODO
}

collect_jars
collect_exports
build_classpaths
precompile_jsps