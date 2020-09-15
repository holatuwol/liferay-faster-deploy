var style = document.createElement('style');

style.textContent = `
#work-times th, #work-times td {
	border: 1px solid;
	padding: 0.2em;
	width: 5em;
}
#work-times td.work-time {
	background-color: #ccc;
}
#work-times td .today {
	background-color: #000;
	border-radius: 50%;
	height: 1em;
	width: 1em;
}
`;

document.head.appendChild(style);

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

	var now = new Date();

	var localOffset = 0 - (now.getTimezoneOffset() / 60);
	var offset = gmtOffset - localOffset;

	var gmtOffsetNow = new Date(now.getTime() + (offset * 3600 * 1000));
	var gmtOffsetHours = gmtOffsetNow.getHours();
	var gmtOffsetDay = (gmtOffsetNow.getDay() + 6) % 7;

	var workTable = adjustedWorkTimes.map((row, dayOfWeek) => {
		return [
			createTableElement('th', row[0])
		].concat(
			row[1].map((fillIn, hourOfDay) => {
				var hourContent = ' ';

				if (hourOfDay == gmtOffsetHours && dayOfWeek == gmtOffsetDay) {
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