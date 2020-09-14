var workTimes = [
	["Mon", [10,11,12,21,22,23]],
	["Tue", [10,11,12,14,15,16,20,22,23]],
	["Wed", [10,11,12,21,22,23]],
	["Thu", [10,11,12,14,15,16,22,23]],
	["Fri", [10,11,12,14,15,16,17,18]],
	["Sat", []],
	["Sun", [22]]
];
var workTimesGMTOffset = -7;

function adjustWorkTimes(gmtOffset) {
	var workTimesSets = workTimes.map(x => new Set(x[1]));
	var offset = workTimesGMTOffset - gmtOffset;

	var flattenedWorkTimes = new Array(24 * 7).fill(false).map((x, hourOfWeek) => {
		var newHourOfWeek = (hourOfWeek + offset + 24 * 7) % (24 * 7);
		var newDayOfWeek = Math.floor(newHourOfWeek / 24);
		var newHourOfDay = newHourOfWeek % 24;

		return workTimesSets[newDayOfWeek].has(newHourOfDay);
	});

	var adjustedWorkTimes = [];
	for (var i = 0; i < 7; i++) {
	     adjustedWorkTimes.push([workTimes[i][0], flattenedWorkTimes.slice(i * 24, i * 24 + 24)]);
	}

	return adjustedWorkTimes;
}

function createTableElement(tagName, text, fillIn) {
	var element = document.createElement(tagName);

	if (typeof text == 'string') {
		element.textContent = text;
	}
	else {
		element.appendChild(text);
	}

	if (fillIn) {
		element.classList.add('work-time');
	}

	return element;
}

function renderWorkTimes(gmtOffset) {
	var adjustedWorkTimes = adjustWorkTimes(gmtOffset);

	var workTable = adjustedWorkTimes.map((row) => {
		return [
			createTableElement('th', row[0])
		].concat(
			row[1].map((fillIn) => createTableElement('td', ' ', fillIn))
		)
	})

	var select = document.createElement('select');

	for (var i = -12; i <= 14; i++) {
		var option = document.createElement('option');
		option.textContent = 'GMT' + ((i == 0) ? '' : ((i > 0) ? ('+' + i) : i));
		option.value = i;
		option.selected = (i == gmtOffset);
		select.appendChild(option);
	}

	select.onchange = function() {
		renderWorkTimes(this.options[this.selectedIndex].value);
	};

	var getHourContent = i => (i == 0) ? select : ((i < 11 ? ('0' + (i-1)) : (i-1)) + ':00');

	var hours = new Array(25).fill(0).map((x, i) => createTableElement('th', getHourContent(i)))

	// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
	var transpose = m => m[0].map((x,i) => m.map(x => x[i]));

	var renderedTable = transpose([hours].concat(workTable));

	var table = document.getElementById('work-times');
	table.innerHTML = '';

	for (var i = 0; i < renderedTable.length; i++) {
		var row = document.createElement('tr');
		for (var j = 0; j < renderedTable[i].length; j++) {
			row.appendChild(renderedTable[i][j]);
		}
		table.appendChild(row);
	}
}

renderWorkTimes(0 - parseInt(new Date().getTimezoneOffset() / 60));