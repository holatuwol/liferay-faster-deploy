#!/bin/bash

downloadbuild() {
	parsearg $1

	if [ "false" == "${DOWNLOAD_BUILD}" ]; then
		return 0
	elif [ -d ${BUILD_MOUNT_POINT} ] && [ "" != "$(find ${BUILD_MOUNT_POINT} -name catalina.sh)" ]; then
		rsync -arq --exclude=tomcat --exclude=logs ${BUILD_MOUNT_POINT}/ ${LIFERAY_HOME}/

		return 0
	elif [ "" != "$(find ${LIFERAY_HOME} -name catalina.sh)" ]; then
		return 0
	elif [ "" != "$BUILD_NAME" ]; then
		cp ${BUILD_MOUNT_POINT}/$BUILD_NAME ${LIFERAY_HOME}
		extract
		return $?
	elif [ "" != "$BASE_TAG" ]; then
		. ${HOME}/download_branch.sh
		downloadtag && extract
		return $?
	elif [ "" != "$PATCH_ID" ] || [ "" != "$RELEASE_ID" ] || [ -d "${LIFERAY_HOME}/patches" ]; then
		. ${HOME}/download_release.sh
		downloadrelease && extract
		return $?
	elif [ "" != "$BASE_BRANCH" ]; then
		. ${HOME}/download_branch.sh
		downloadbranch && extract
		return $?
	else
		echo "Unable to identify base branch"
		return 1
	fi
}

extract() {
	# Figure out if we need to untar the build, based on whether the
	# baseline hash has changed

	cd ${LIFERAY_HOME}

	echo "Build name: $BUILD_NAME"

	if [[ "$BUILD_NAME" == *.tar.gz ]]; then
		tar -zxf ${BUILD_NAME}
	elif [[ "$BUILD_NAME" == *.tar.xz ]]; then
		unxz ${BUILD_NAME}
		tar -xf ${BUILD_NAME}
	elif [[ "$BUILD_NAME" == *.zip ]]; then
		unzip -qq "${BUILD_NAME}"
	elif [[ "$BUILD_NAME" == *.7z ]]; then
		7z x "${BUILD_NAME}"
	fi

	local OLD_LIFERAY_HOME=$(find . -type d -name '.liferay-home' | sort | head -1)

	if [ "" == "$OLD_LIFERAY_HOME" ]; then
		local OLD_CATALINA_HOME=$(find . -type d -name 'tomcat*' | sort | head -1)

		if [ "" != "${OLD_CATALINA_HOME}" ]; then
			OLD_LIFERAY_HOME=$(dirname "$OLD_CATALINA_HOME")
		fi
	fi

	if [ "" == "$OLD_LIFERAY_HOME" ]; then
		find . -type d
		echo "Unable to find LIFERAY_HOME for archive of ${BUILD_NAME}"
		exit 1
	fi

	echo "Moving files from ${OLD_LIFERAY_HOME} to ${PWD}"

	for file in $(find $OLD_LIFERAY_HOME -mindepth 1 -maxdepth 1); do
		if [ ! -e "$(basename $file)" ]; then
			mv $file .
		fi
	done

	rm -rf $OLD_LIFERAY_HOME

	if [ "" != "$BUILD_NAME" ]; then
		rm $BUILD_NAME
	fi

	cd -
}

getbuild() {
	local LOCAL_NAME=$(basename $1)
	local REMOTE_NAME=${LOCAL_NAME}

	if [ "" != "$2" ]; then
		LOCAL_NAME=$2
	fi

	if [ -f "${LIFERAY_HOME}/${LOCAL_NAME}" ]; then
		echo "Already downloaded ${LOCAL_NAME}"
		return 0
	fi

	if [ -f "${BUILD_MOUNT_POINT}/${REMOTE_NAME}" ]; then
		cp "${BUILD_MOUNT_POINT}/${REMOTE_NAME}" "${LIFERAY_HOME}/${LOCAL_NAME}"
		echo "Already downloaded ${LOCAL_NAME}"
		return 0
	fi

	echo "Attempting to download $1 to ${LOCAL_NAME}"

	curl ${FILES_CREDENTIALS} -o ${LIFERAY_HOME}/${LOCAL_NAME} "$1"
}

parsearg() {
	if [ "" == "$1" ]; then
		return 0
	fi

	if [[ "$1" == *.zip ]]; then
		if [[ $1 == http* ]]; then
			PATCH_ID=$(echo $1 | rev | cut -d'/' -f 1 | rev | cut -d'.' -f 1)
		else
			PATCH_ID=$(echo $1 | cut -d'.' -f 1)
		fi

		return 0
	fi

	if [ "" != "${BUILD_NAME}" ] || [ "" != "${BASE_TAG}" ]; then
		return 0
	fi

	if [ "" != "${BASE_BRANCH}" ] && [ "master" != "${BASE_BRANCH}" ]; then
		return 0
	fi

	if [ "" != "${BRANCH_ARCHIVE_MIRROR}" ]; then
		SHORT_NAME=$(echo $1 | sed 's/ee-//g' | tr -d '.')
		IS_BRANCH=$(curl -s --connect-timeout 2 $BRANCH_ARCHIVE_MIRROR/ | grep -o '<a href="'${SHORT_NAME}'-[0-9]*.tar.gz">' | cut -d'"' -f 2 | sort | tail -1)

		if [ "" != "${IS_BRANCH}" ]; then
			BASE_BRANCH=${SHORT_NAME}
			return 0
		fi
	fi

	if [[ "$1" == *.x ]] || [[ "$1" == *.x-private ]] || [ "$1" == "master" ] || [ "$1" == "master-private" ]; then
		BASE_BRANCH=$1
		return 0
	fi

	if [[ "$1" == *x ]] || [[ "$1" == *x-private ]]; then
		BASE_BRANCH=$(echo $1 | sed 's/^\([0-9]*\)\([0-9]\)x/\1.\2.x/')
		return 0
	fi

	if [ "" != "$(echo $1 | grep -o '^[0-9]*\.[0-9]*')" ]; then
		RELEASE_ID=$1
		return 0
	fi

	if [ "" != "$(echo $1 | grep -o '^[0-9]*$')" ]; then
		RELEASE_ID=$(echo $1 | sed 's/^\([0-9]*\)\([0-9]\)\([0-9][0-9]\)$/\1.\2.\3/')
		return 0
	fi

	BASE_TAG=$(curl -s --connect-timeout 2 $TAG_ARCHIVE_MIRROR/tags.txt | grep "^$1$")

	if [ "" != "${BASE_TAG}" ] && [[ 1 == $(echo -n "${BASE_TAG}" | grep -c '^') ]]; then
		return 0
	fi

	BASE_TAG=$(curl -s --connect-timeout 2 $TAG_ARCHIVE_MIRROR/tags-ce.txt | grep "^$1$")

	if [ "" != "${BASE_TAG}" ] && [[ 1 == $(echo -n "${BASE_TAG}" | grep -c '^') ]]; then
		return 0
	fi

	BASE_TAG=
	PATCH_ID=$1
}