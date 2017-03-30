function resizeIframe(obj) {
	obj.style.height = obj.contentWindow.document.body.scrollHeight + "px";
	var nodeList = obj.contentWindow.document.getElementsByTagName("a");
	var nodeArray = Array.from(nodeList);
	nodeArray.forEach(function(x) { x.target = "_blank"; });
}

function resizeIframes() {
	var nodeList = document.getElementsByTagName("iframe");
	var nodeArray = Array.from(nodeList);
	nodeArray.forEach(resizeIframe);
}

resizeIframes = _.debounce(resizeIframes, 100);
