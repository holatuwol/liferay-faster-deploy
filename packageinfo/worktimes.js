var style = document.createElement('style');

style.textContent = `
.tab-pane {
	margin-top: 1em;
}

.work-times th,
.work-times td {
	border: 1px solid;
	padding: 0.2em;
	width: 5em;
}
.work-times td.work-time {
	background-color: #ccc;
}
.work-times td .today {
	background-color: #000;
	border-radius: 50%;
	height: 1em;
	width: 1em;
}
`;

document.head.appendChild(style);

function adjustWorkTimes(workTimes, workGMTOffset, displayGMTOffset) {
	var workTimesSets = workTimes.map(x => new Set(x[1]));
	var offset = workGMTOffset - displayGMTOffset;

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

function renderWorkTimes(table, workTimes, workGMTOffset, displayGMTOffset) {
	var adjustedWorkTimes = adjustWorkTimes(workTimes, workGMTOffset, displayGMTOffset);

	var now = new Date();

	var localOffset = 0 - (now.getTimezoneOffset() / 60);
	var offset = displayGMTOffset - localOffset;

	var displayGMTOffsetNow = new Date(now.getTime() + (offset * 3600 * 1000));
	var displayGMTOffsetHours = displayGMTOffsetNow.getHours();
	var displayGMTOffsetDay = (displayGMTOffsetNow.getDay() + 6) % 7;

	var workTable = adjustedWorkTimes.map((row, dayOfWeek) => {
		return [
			createTableElement('th', row[0])
		].concat(
			row[1].map((fillIn, hourOfDay) => {
				var hourContent = ' ';

				if (hourOfDay == displayGMTOffsetHours && dayOfWeek == displayGMTOffsetDay) {
					hourContent = document.createElement('div');
					hourContent.textContent = ' ';
					hourContent.classList.add('today');
				}

				return createTableElement('td', hourContent, fillIn);
			})
		)
	})

	var select = document.createElement('select');

	for (var i = -12; i <= 14; i++) {
		var option = document.createElement('option');
		option.textContent = 'GMT' + ((i == 0) ? '' : ((i > 0) ? ('+' + i) : i));
		option.value = i;
		option.selected = (i == displayGMTOffset);
		select.appendChild(option);
	}

	select.onchange = function() {
		renderWorkTimes(table, workTimes, workGMTOffset, this.options[this.selectedIndex].value);
	};

	var getHourContent = i => (i == 0) ? select : ((i < 11 ? ('0' + (i-1)) : (i-1)) + ':00');

	var hours = new Array(25).fill(0).map((x, i) => createTableElement('th', getHourContent(i)))

	// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript
	var transpose = m => m[0].map((x,i) => m.map(x => x[i]));

	var renderedTable = transpose([hours].concat(workTable));

	table.innerHTML = '';

	for (var i = 0; i < renderedTable.length; i++) {
		var row = document.createElement('tr');
		for (var j = 0; j < renderedTable[i].length; j++) {
			row.appendChild(renderedTable[i][j]);
		}
		table.appendChild(row);
	}
}

function createWorkTimeTable(key, active) {
	var anchorItem = document.createElement('a');
	anchorItem.setAttribute('data-toggle', 'tab');
	anchorItem.setAttribute('href', '#' + key);
	anchorItem.textContent = 'Week of ' + key;

	var listItem = document.createElement('li');
	listItem.appendChild(anchorItem);

	if (active) {
		listItem.classList.add('active');
	}

	var listContainer = document.getElementById('work-times-tabs');
	listContainer.appendChild(listItem);

	var table = document.createElement('table');
	table.classList.add('work-times');

	var tableHolder = document.createElement('div');
	tableHolder.classList.add('tab-pane');
	tableHolder.setAttribute('id', key);
	tableHolder.appendChild(table);

	if (active) {
		tableHolder.classList.add('active');
	}

	var tableContainer = document.getElementById('work-times-content');
	tableContainer.appendChild(tableHolder);

	return table;
}

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/worktimes.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		var workTimeInfo = JSON.parse(this.responseText);

		var workGMTOffset = workTimeInfo['gmtOffset'];
		var displayGMTOffset = 0 - parseInt(new Date().getTimezoneOffset() / 60);

		var workTimes = workTimeInfo['times']
		var keys = Object.keys(workTimes).sort();

		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var table = createWorkTimeTable(key, i == 0);
			renderWorkTimes(table, workTimes[key], workGMTOffset, displayGMTOffset);
		}
	}
};

request.open('GET', requestURL, true);
request.send();