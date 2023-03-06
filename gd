#!/bin/bash

SCRIPT_FOLDER=$(dirname "${BASH_SOURCE[0]}")

. ${SCRIPT_FOLDER}/setopts

ARTIFACT_HASHES=()

project_to_library() {
	if [ "portal-bootstrap" == "$(basename ${1})" ]; then
		return 0
	fi

	if [ ! -f ${1}/build.gradle ]; then
		return 0
	fi

	if [ ! -f ${GIT_ROOT}/status.txt ]; then
		git status --porcelain > ${GIT_ROOT}/status.txt
	fi

	for project in $(grep compileOnly ${1}/build.gradle | grep -o 'project\(.*\)'); do
		local ARTIFACT_PATH="$(echo ${project} | cut -d'"' -f 2 | tr ':' '/')"

		if [ "" != "$(grep "modules${ARTIFACT_PATH}/src/main/java/" ${GIT_ROOT}/status.txt)" ]; then
			project_to_library ${GIT_ROOT}/modules${ARTIFACT_PATH}
			continue
		fi

		local ARTIFACT_PROPERTIES="${GIT_ROOT}/modules/.releng${ARTIFACT_PATH}/artifact.properties"

		if [ ! -f ${ARTIFACT_PROPERTIES} ]; then
			project_to_library ${GIT_ROOT}/modules${ARTIFACT_PATH}
			continue
		fi

		local LAST_PUBLISH_HASH=$(printf '%s\0' "${ARTIFACT_HASHES[@]}" | grep -z "^${ARTIFACT_PROPERTIES};" | cut -d ";" -f 2)

		if [ -z "${LAST_PUBLISH_HASH}" ]; then
			LAST_PUBLISH_HASH=$(git log -1 --pretty='%H' ${ARTIFACT_PROPERTIES})

			ARTIFACT_HASHES=("${ARTIFACT_HASHES[@]}" "${ARTIFACT_PROPERTIES};${LAST_PUBLISH_HASH}")
		fi

		if [ "" != "$(git diff --name-only ${LAST_PUBLISH_HASH}..HEAD -- ${GIT_ROOT}/modules${ARTIFACT_PATH}/src/main/java)" ]; then
			project_to_library ${GIT_ROOT}/modules${ARTIFACT_PATH}
			continue
		fi

		local ARTIFACT_NAME="$(grep Bundle-SymbolicName ${GIT_ROOT}/modules${ARTIFACT_PATH}/bnd.bnd | cut -d' ' -f 2-)"
		local ARTIFACT_VERSION=$(grep 'artifact.url' ${ARTIFACT_PROPERTIES} | cut -d'=' -f 2 | grep -o "/${ARTIFACT_NAME}/[^/]*" | cut -d'/' -f 3)

		sed -i.bak 's@'${project}'@group: "com.liferay", name: "'${ARTIFACT_NAME}'", version: "'${ARTIFACT_VERSION}'"@g' ${1}/build.gradle
	done
}

rm -f ${GIT_ROOT}/status.txt
project_to_library ${PWD}

if [ "" == "$(grep -F .jsp ${GIT_ROOT}/status.txt)" ]; then
	${SCRIPT_FOLDER}/gw -x compileJSP deploy
else
	${SCRIPT_FOLDER}/gw deploy
fi

rm ${GIT_ROOT}/status.txt