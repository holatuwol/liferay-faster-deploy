#!/bin/bash

checkservicepack() {
	if [ "" != "${RELEASE_ID}" ]; then
		echo "Already identified release as ${RELEASE_ID}"
		return 0
	fi

	if [ "" == "${PATCH_ID}" ]; then
		return 0
	fi

	if [[ ${PATCH_ID} == *-7010 ]] || [[ ${PATCH_ID} == *-7010.zip ]]; then
		RELEASE_ID=7.0.10
	elif [[ ${PATCH_ID} == *-7110 ]] || [[ ${PATCH_ID} == *-7110.zip ]]; then
		RELEASE_ID=7.1.10
	elif [[ ${PATCH_ID} == *-7210 ]] || [[ ${PATCH_ID} == *-7210.zip ]]; then
		RELEASE_ID=7.2.10
	elif [[ ${PATCH_ID} == *-7310 ]] || [[ ${PATCH_ID} == *-7310.zip ]]; then
		RELEASE_ID=7.3.10
	fi

	if [[ ${PATCH_ID} == *hotfix* ]]; then
		cd "${LIFERAY_HOME}"
		mkdir -p patches
		getpatch ${PATCH_ID}
		cd -

		RELEASE_ID=
	fi

	if [ "" == "${PATCH_ID}" ]; then
		return 0
	fi

	echo "Checking service pack for ${PATCH_ID}"
	RELEASE_ID=$(python ${SCRIPT_FOLDER}/closest_service_pack.py ${PATCH_ID})
}

copyextras() {
	if [ ! -d ${BUILD_MOUNT_POINT}/patches ] && [ ! -d "${LIFERAY_HOME}/patching-tool" ]; then
		if [ "" == "$RELEASE_ID" ] || [[ 10 -lt $(echo "$RELEASE_ID" | cut -d'.' -f 3 | cut -d'-' -f 1) ]]; then
			echo "Not an EE release, so patches will not be installed"
			return 0
		fi
	fi

	local UP_TO_DATE=false

	if [ -d ${LIFERAY_HOME}/patches ]; then
		UP_TO_DATE=true

		for file in ${LIFERAY_HOME}/patches/*; do
			if [ ! -f ${LIFERAY_HOME}/patching-tool/patches/${file} ]; then
				UP_TO_DATE=false
			fi
		done
	fi

	if [ "false" == "${UP_TO_DATE}" ]; then
		mkdir -p ${LIFERAY_HOME}/patches

		for file in ${LIFERAY_HOME}/patching-tool/patches/*; do
			cp ${file} ${LIFERAY_HOME}/patches/
		done

		cd "${LIFERAY_HOME}"
		rm -rf patching-tool
		getpatchingtool
		cd -

		cd "${LIFERAY_HOME}/patching-tool"
		rm -f default.properties
		chmod u+x patching-tool.sh

		if [ -h ../tomcat ]; then
			mv ../tomcat /tmp
			./patching-tool.sh auto-discovery ..
			mv /tmp/tomcat ..
		else
			./patching-tool.sh auto-discovery ..
		fi

		cd -
	fi

	if [ "" != "${PATCH_ID}" ] && [[ ${PATCH_ID} != *-0 ]] && [[ ${PATCH_ID} != *-0-* ]]; then
		cd "${LIFERAY_HOME}"
		mkdir -p patches
		getpatch $PATCH_ID
		cd -
	fi

	if [ -d "${BUILD_MOUNT_POINT}/patches" ]; then
		mkdir -p "${LIFERAY_HOME}/patches"

		if [ -f /usr/bin/rsync ]; then
			rsync -av "${BUILD_MOUNT_POINT}/patches/" "${LIFERAY_HOME}/patches/"
		else
			cp -f ${BUILD_MOUNT_POINT}/patches/ "${LIFERAY_HOME}/patches/"
		fi
	fi

	if [ -d "${LIFERAY_HOME}/patches" ]; then
		if [ -f /usr/bin/rsync ]; then
			rsync -av "/${LIFERAY_HOME}/patches/" "${LIFERAY_HOME}/patching-tool/patches/"
		else
			cp -f /${LIFERAY_HOME}/patches/* "${LIFERAY_HOME}/patching-tool/patches/"
		fi
	fi

	cd "${LIFERAY_HOME}/patching-tool"
	echo 'auto.update.plugins=true' >> default.properties
	./patching-tool.sh install
	cd -

	rm -rf ${LIFERAY_HOME}/osgi/state
}

downloadrelease() {
	checkservicepack

	local REQUEST_URL=

	if [ "" == "$RELEASE_ID" ]; then
		if [ "" != "$PATCH_ID" ]; then
			RELEASE_ID=$(echo "${PATCH_ID}" | grep -o '[0-9]*$' | sed 's/\(.\)\(.\)\(..\)/\1.\2.\3/g')
		elif [ -d $LIFERAY_HOME/patches ]; then
			RELEASE_ID=$(find $LIFERAY_HOME/patches -name 'liferay-hotfix-*' | grep -o '[0-9]*.zip' | sed 's/\.zip//g' | sed 's/\(.\)\(.\)\(..\)/\1.\2.\3/g')
		else
			return 1
		fi
	fi

	if [[ 10 -le $(echo "$RELEASE_ID" | cut -d'.' -f 3 | cut -d'-' -f 1) ]]; then
		downloadlicense
		REQUEST_URL="${LIFERAY_FILES_MIRROR}/${LIFERAY_FILES_EE_FOLDER}/portal/${RELEASE_ID}/"
	else
		REQUEST_URL="${LIFERAY_RELEASES_MIRROR}/portal/${RELEASE_ID}/"
	fi

	echo "Identifying build candidate (release) via ${REQUEST_URL}"

	local BUILD_CANDIDATE=$(curl ${FILES_CREDENTIALS} -s --connect-timeout 2 $REQUEST_URL | grep -o '<a href="[^"]*tomcat-[^"]*\.\(7z\|zip\)">' | grep -vF 'jre' | grep -vF 'slim' | cut -d'"' -f 2 | sort | tail -1)

	if [ "" == "$BUILD_CANDIDATE" ]; then
		echo "Unable to identify build candidate (maybe you forgot to connect to a VPN)"
		return 0
	fi

	echo $BUILD_CANDIDATE
	BUILD_NAME=${RELEASE_ID}$(echo ${BUILD_CANDIDATE} | grep -o '\.\(7z\|zip\)$')

	if [ -f /release/${BUILD_CANDIDATE} ]; then
		echo "Using already downloaded ${BUILD_CANDIDATE}"

		if [ ! -f ${LIFERAY_HOME}/${BUILD_CANDIDATE} ]; then
			cp /release/${BUILD_CANDIDATE} ${LIFERAY_HOME}/${BUILD_NAME}
		fi

		return 0
	fi

	REQUEST_URL="${REQUEST_URL}${BUILD_CANDIDATE}"

	BUILD_TIMESTAMP=$(echo $BUILD_CANDIDATE | grep -o "[0-9]*.\(7z\|zip\)" | cut -d'.' -f 1)

	echo "Downloading $RELEASE_ID release (used for patching)"

	getbuild "${REQUEST_URL}" "${BUILD_NAME}"

	if [ -d /release ]; then
		cp ${LIFERAY_HOME}/${BUILD_NAME} /release/${BUILD_CANDIDATE}
	fi
}

downloadlicense() {
	if [ -d ${BUILD_MOUNT_POINT}/data/license ] || [ -d ${LIFERAY_HOME}/data/license ]; then
		return 0
	fi

	for file in $(test -d ${LIFERAY_HOME}/deploy && find ${LIFERAY_HOME}/deploy -name '*.xml'); do
		if [ "" == "${file}" ]; then
			continue
		fi

		if [ "" != "$(grep -F '<product-name>Portal' ${file})" ]; then
			return 0
		fi

		if [ "" != "$(grep -F '<product-name>Digital Enterprise' ${file})" ]; then
			return 0
		fi
	done

	local RELEASE_ID_NUMERIC=$(echo "$RELEASE_ID" | cut -d'.' -f 1,2,3 | tr -d '.')

	if [ -f /license/${RELEASE_ID_NUMERIC}.xml ]; then
		mkdir -p ${LIFERAY_HOME}/deploy
		cp /license/${RELEASE_ID_NUMERIC}.xml ${LIFERAY_HOME}/deploy/license.xml
		return $?
	fi

	if [ "" == "${LICENSE_MIRROR}" ]; then
		return 1
	fi

	local LICENSE_URL="${LICENSE_MIRROR}/${RELEASE_ID_NUMERIC}.xml"

	echo "Downloading developer license from ${LICENSE_URL}"

	mkdir -p ${LIFERAY_HOME}/deploy/
	curl --connect-timeout 2 -o ${LIFERAY_HOME}/deploy/license.xml "${LICENSE_URL}"
}

getpatch() {
	setpatchfile $1

	if [ "" == "$PATCH_FILE" ]; then
		if [ "" != "$1" ]; then
			echo "Unable to determine patch file for $1"
		fi

		return 0
	fi

	local PATCH_LOCATION="patches/${PATCH_FILE}"

	if [ -f ${LIFERAY_HOME}/patches/${PATCH_FILE} ]; then
		PATCH_LOCATION="${LIFERAY_HOME}/patches/${PATCH_FILE}"
		echo "Using existing patch file ${PATCH_LOCATION}"
	elif [ -f ${LIFERAY_HOME}/patching-tool/patches/${PATCH_FILE} ]; then
		PATCH_LOCATION="${LIFERAY_HOME}/patching-tool/patches/${PATCH_FILE}"
		echo "Using existing patch file ${PATCH_LOCATION}"
	elif [ -f ${BUILD_MOUNT_POINT}/patches/${PATCH_FILE} ]; then
		PATCH_LOCATION="${BUILD_MOUNT_POINT}/patches/${PATCH_FILE}"
		echo "Using existing patch file ${PATCH_LOCATION}"
	else
		local RELEASE_ID_SHORT=$(echo "$RELEASE_ID" | cut -d'.' -f 1,2,3)
		local REQUEST_URL="${LIFERAY_FILES_MIRROR}/${LIFERAY_FILES_EE_FOLDER}/fix-packs/${RELEASE_ID_SHORT}/${PATCH_FOLDER}/${PATCH_FILE}"

		echo "Attempting to download ${REQUEST_URL}"
		curl ${FILES_CREDENTIALS} -o ${PATCH_LOCATION} "${REQUEST_URL}"
	fi

	local NEEDED_PATCH_ID=

	if [[ "${PATCH_FILE}" == liferay-hotfix-*-7010.zip ]]; then
		PATCH_ID=
		NEEDED_PATCH_ID=$(unzip -c ${PATCH_LOCATION} fixpack_documentation.xml | grep requirements | grep -o 'de=[0-9]*' | cut -d'=' -f 2)

		if [ "" == "${NEEDED_PATCH_ID}" ]; then
			PATCH_ID=de-0
		else
			PATCH_ID=de-${NEEDED_PATCH_ID}
		fi
	elif [[ "${PATCH_FILE}" == liferay-hotfix-*-7110.zip ]]; then
		PATCH_ID=
		NEEDED_PATCH_ID=$(unzip -c ${PATCH_LOCATION} fixpack_documentation.xml | grep requirements | grep -o 'dxp=[0-9]*' | cut -d'=' -f 2)

		if [ "" == "${NEEDED_PATCH_ID}" ]; then
			PATCH_ID=dxp-0-7110
		else
			PATCH_ID=dxp-${NEEDED_PATCH_ID}-7110
		fi
	elif [[ "${PATCH_FILE}" == liferay-hotfix-*-7210.zip ]]; then
		PATCH_ID=
		NEEDED_PATCH_ID=$(unzip -c ${PATCH_LOCATION} fixpack_documentation.xml | grep requirements | grep -o 'dxp=[0-9]*' | cut -d'=' -f 2)

		if [ "" == "${NEEDED_PATCH_ID}" ]; then
			PATCH_ID=dxp-0-7210
		else
			PATCH_ID=dxp-${NEEDED_PATCH_ID}-7210
		fi
	fi
}

getpatchingtool() {
	local REQUEST_URL=${LIFERAY_FILES_MIRROR}/${LIFERAY_FILES_EE_FOLDER}/fix-packs/patching-tool/

	echo "Checking for latest patching tool at ${REQUEST_URL}"
	local PATCHING_TOOL_VERSION=

	if [[ "$RELEASE_ID" == 6.1.30* ]] || [[ "$RELEASE_ID" == 6.2.10* ]]; then
		PATCHING_TOOL_VERSION=patching-tool-$(curl ${FILES_CREDENTIALS} $REQUEST_URL/LATEST.txt)-internal.zip
	elif [[ "$RELEASE_ID" == 7.0.10* ]] || [[ "$RELEASE_ID" == 7.1.10* ]] || [[ "$RELEASE_ID" == 7.2.10* ]]; then
		curl ${FILES_CREDENTIALS} $REQUEST_URL/LATEST-2.0.txt
		PATCHING_TOOL_VERSION=patching-tool-$(curl ${FILES_CREDENTIALS} $REQUEST_URL/LATEST-2.0.txt)-internal.zip
	else
		curl ${FILES_CREDENTIALS} $REQUEST_URL/LATEST-3.0.txt
		PATCHING_TOOL_VERSION=patching-tool-$(curl ${FILES_CREDENTIALS} $REQUEST_URL/LATEST-3.0.txt)-internal.zip
	fi

	echo "Using patching tool ${PATCHING_TOOL_VERSION}"

	if [ -f $PATCHING_TOOL_VERSION ] && [ -d patching-tool ]; then
		return 0
	fi

	REQUEST_URL=${REQUEST_URL}${PATCHING_TOOL_VERSION}

	echo "Retrieving latest patching tool at ${REQUEST_URL}"
	curl ${FILES_CREDENTIALS} -o $PATCHING_TOOL_VERSION $REQUEST_URL

	rm -rf patching-tool
	unzip $PATCHING_TOOL_VERSION
}

setpatchfile() {
	PATCH_FOLDER=
	PATCH_FILE=

	if [[ "$1" == hotfix-* ]]; then
		PATCH_FOLDER=hotfix
		PATCH_FILE=liferay-$1.zip
	elif [[ "$1" == liferay-hotfix-* ]]; then
		PATCH_FOLDER=hotfix

		if [[ "$1" == *.zip ]]; then
			PATCH_FILE=$1
		else
			PATCH_FILE=$1.zip
		fi
	elif [[ "$1" == liferay-fix-pack-portal-* ]]; then
		PATCH_FOLDER=portal

		if [[ "$1" == *.zip ]]; then
			PATCH_FILE=$1
		else
			PATCH_FILE=$1.zip
		fi
	elif [[ "$1" == liferay-fix-pack-de-* ]]; then
		PATCH_FOLDER=de

		if [[ "$1" == *.zip ]]; then
			PATCH_FILE=$1
		else
			PATCH_FILE=$1.zip
		fi
	elif [[ "$1" == liferay-fix-pack-dxp-* ]]; then
		PATCH_FOLDER=dxp

		if [[ "$1" == *.zip ]]; then
			PATCH_FILE=$1
		else
			PATCH_FILE=$1.zip
		fi
	elif [[ "$1" == portal-* ]]; then
		PATCH_FOLDER=portal

		if [[ "$1" == *-6210.zip ]]; then
			PATCH_FILE=liferay-fix-pack-$1
		elif [[ "$1" == *-6210 ]]; then
			PATCH_FILE=liferay-fix-pack-$1.zip
		else
			echo "$1 did not specify a version, assuming 6.2.10"
			PATCH_FILE=liferay-fix-pack-$1-6210.zip
		fi
	elif [[ "$1" == de-* ]]; then
		PATCH_FOLDER=de

		if [[ "$1" == *-7010.zip ]]; then
			PATCH_FILE=liferay-fix-pack-$1
		elif [[ "$1" == *-7010 ]]; then
			PATCH_FILE=liferay-fix-pack-$1.zip
		else
			echo "$1 did not specify a version, assuming 7.0.10"
			PATCH_FILE=liferay-fix-pack-$1-7010.zip
		fi
	elif [[ "$1" == dxp-* ]]; then
		PATCH_FOLDER=dxp

		if [[ "$1" == *-7110.zip ]] || [[ "$1" == *-7210.zip ]]; then
			PATCH_FILE=liferay-fix-pack-$1
		elif [[ "$1" == *-7110 ]] || [[ "$1" == *-7210 ]]; then
			PATCH_FILE=liferay-fix-pack-$1.zip
		else
			echo "$1 did not specify a version, assuming 7.1.10"
			PATCH_FILE=liferay-fix-pack-$1-7110.zip
		fi
	fi
}