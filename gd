#!/bin/bash

SCRIPT_FOLDER=$(dirname "${BASH_SOURCE[0]}")

. ${SCRIPT_FOLDER}/setopts

project_to_library() {
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
		fi

		local ARTIFACT_NAME="$(grep Bundle-SymbolicName ${GIT_ROOT}/modules${ARTIFACT_PATH}/bnd.bnd | cut -d' ' -f 2-)"
		local ARTIFACT_PROPERTIES="${GIT_ROOT}/modules/.releng${ARTIFACT_PATH}/artifact.properties"
		local ARTIFACT_VERSION=$(grep 'artifact.url' ${ARTIFACT_PROPERTIES} | cut -d'=' -f 2 | grep -o "/${ARTIFACT_NAME}/[^/]*" | cut -d'/' -f 3)

		sed -i 's@'${project}'@group: "com.liferay", name: "'${ARTIFACT_NAME}'", version: "'${ARTIFACT_VERSION}'"@g' ${1}/build.gradle
	done
}

rm -f ${GIT_ROOT}/status.txt
project_to_library ${PWD}

if [ "" == "$(grep -F .jsp ${GIT_ROOT}/status.txt)" ]; then
	${SCRIPT_FOLDER}/gw -x compileJSP deploy
else
	${SCRIPT_FOLDER}/gw -x deploy
fi

rm ${GIT_ROOT}/status.txt