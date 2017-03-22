Clone this repository.

```
git clone git@github.com:holatuwol/liferay-faster-deploy.git
```

Add a Bash function to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script while also specifying where you want the builds to go by setting the `BUILD_FOLDER_PREFIX` variable. Use whatever shorthand you think makes sense, with the example here being `rd`.

```
rd() {
	BUILD_FOLDER_PREFIX=/opt/liferay \
		BUILD_FOLDER_SUFFIX=bundles \
		TAG_ARCHIVE_MIRROR=http://mirrors/files.liferay.com/private/ee/fix-packs/support/tags \
		BRANCH_ARCHIVE_MIRROR=http://cloud-10-50-0-165/builds \
			/path/to/liferay-faster-deploy/redeploy
}
```

Navigate to the root of the portal repository and invoke the function you created.

```
cd /path/to/portal/source

rd
```
