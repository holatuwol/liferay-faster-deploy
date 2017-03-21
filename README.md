Clone this repository.

```
git clone git@github.com:holatuwol/liferay-faster-deploy.git
```

Open up the `redeploy` file and specify where you wish the builds to go.

```
BUILD_FOLDER_PREFIX=/opt/liferay
```

Add a Bash function to `.bash_aliases` (or the equivalent on whichever shell you're using) which calls the script. Use whatever shorthand you think makes sense, with the example here being `rd`.

```
rd() {
	/path/to/liferay-faster-deploy/redeploy
}
```

Navigate to the root of the portal repository and invoke the function you created.

```
cd /path/to/portal/source

rd
```