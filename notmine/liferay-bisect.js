function highlightTextField() {
	this.setSelectionRange(0, this.value.length);
}

function getTableHeaderRow() {
	var thead = document.createElement('thead');
	var row = document.createElement('tr');

	var cell = document.createElement('th');
	row.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('bisect')
	cell.textContent = 'good';
	row.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('bisect')
	cell.textContent = 'bad';
	row.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('commit-hash')
	cell.textContent = 'commit hash';
	row.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('ticket-id')
	cell.textContent = 'JIRA ticket';
	row.appendChild(cell);

	cell = document.createElement('th');
	cell.classList.add('commit-date')
	cell.textContent = 'commit date';
	row.appendChild(cell);

	thead.appendChild(row);
	return thead;
}

function updateCheckbox(event) {
	var target = event.target;

	var index = parseInt(target.getAttribute('data-index'));

	var value = target.getAttribute('data-value');

	if (notableHashes[index].status == value) {
		target.checked = false;
	}

	updateCheckboxes();
}

function generateRow(notableHash, arrayIndex) {
	var displayIndex = notableHashes.length - arrayIndex - 1;
	var row = document.createElement('tr');

	var cell = document.createElement('th');
	cell.textContent = displayIndex;
	row.appendChild(cell);

	var cell = document.createElement('td');
	cell.classList.add('bisect');
	var checkbox = document.createElement('input');
	checkbox.setAttribute('type', 'radio');
	checkbox.setAttribute('name', 'hash' + arrayIndex);
	checkbox.setAttribute('data-index', arrayIndex);
	checkbox.setAttribute('data-value', 'good');

	if (notableHash.status) {
		checkbox.disabled = true;

		if (notableHash.status == 'good') {
			checkbox.checked = true;
		}
	}
	else {
		checkbox.onclick = updateCheckbox;
	}

	cell.appendChild(checkbox);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('bisect');
    checkbox = document.createElement('input');
	checkbox.setAttribute('type', 'radio');
	checkbox.setAttribute('name', 'hash' + arrayIndex);
	checkbox.setAttribute('data-index', arrayIndex);
	checkbox.setAttribute('data-value', 'bad');

	if (notableHash.status) {
		checkbox.disabled = true;

		if (notableHash.status == 'bad') {
			checkbox.checked = true;
		}
	}
	else {
		checkbox.onclick = updateCheckbox;
	}

	cell.appendChild(checkbox);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('commit-hash');

	var input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.setAttribute('value', notableHash.hash);
	input.onclick = highlightTextField;

	cell.appendChild(input);
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('ticket-id');
	cell.innerHTML = notableHash.ticket ? '<a href="https://issues.liferay.com/browse/' + notableHash.ticket + '">' + notableHash.ticket + '</a>' : 'merge commit';
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.classList.add('commit-date');
	cell.textContent = notableHash.date;
	row.appendChild(cell);

	return row;
}

var rows = notableHashes.map(generateRow);

var table = document.createElement('table');
table.classList.add('table');
table.appendChild(getTableHeaderRow());

var tbody = document.createElement('tbody');

for (var i = 0; i < rows.length; i++) {
	tbody.appendChild(rows[i]);
}

table.appendChild(tbody);

document.querySelector('div[role=main]').appendChild(table);

function checkStatuses(checked) {
	// Reset all previous statuses

	for (var i = 1; i < notableHashes.length - 1; i++) {
		notableHashes[i].status = null;
	}

	// Handle, starting from the top

	var endIndex1 = 0;
	var checkStatus1 = notableHashes[endIndex1].status;

	for (var i = 1; i < checked.length; i++) {
		if (checked[i].getAttribute('data-value') != checkStatus1) {
			break;
		}

		endIndex1 = parseInt(checked[i].getAttribute('data-index'));
	}

	for (var i = 1; i <= endIndex1; i++) {
		notableHashes[i].status = checkStatus1;
	}

	// Handle, starting from the bottom

	var endIndex2 = notableHashes.length - 1;
	var checkStatus2 = notableHashes[endIndex2].status;

	for (var i = checked.length - 2; i >= 0; i--) {
		if (checked[i].getAttribute('data-value') != checkStatus2) {
			break;
		}

		endIndex2 = parseInt(checked[i].getAttribute('data-index'));
	}

	for (var i = endIndex2; i < notableHashes.length - 1; i++) {
		notableHashes[i].status = checkStatus2;
	}

	// Return the halfway point

	var midpoint = Math.floor((endIndex1 + endIndex2) / 2);

	if (midpoint == endIndex1) {
		midpoint++;
	}

	if (midpoint == endIndex2) {
		midpoint--;
	}

	return midpoint;
}

function updateCheckboxes() {
	var checked = document.querySelectorAll('input:checked');
	var midpoint = checkStatuses(checked);

	for (var i = 0; i < rows.length; i++) {
		rows[i].classList.remove('good-hash');
		rows[i].classList.remove('bad-hash');
		rows[i].classList.remove('next-hash');
		rows[i].classList.remove('marked');

		if (notableHashes[i].status == 'bad') {
			rows[i].classList.add('bad-hash');
		}
		else if (notableHashes[i].status == 'good') {
			rows[i].classList.add('good-hash');
		}

		if (i == midpoint) {
			rows[i].classList.add('next-hash');
		}
	}

	var badIndex, goodIndex;

	if (notableHashes[0].status == 'bad') {
		console.log('branch 1');
		for (var i = 1; i < checked.length; i++) {
			if (checked[i].getAttribute('data-value') == 'bad') {
				continue;
			}

			badIndex = checked[i - 1].getAttribute('data-index');
			goodIndex = checked[i].getAttribute('data-index');
			break;
		}
	}
	else {
		console.log('branch 2');
		for (var i = 1; i < checked.length; i++) {
			if (checked[i].getAttribute('data-value') == 'good') {
				continue;
			}

			goodIndex = checked[i - 1].getAttribute('data-index');
			badIndex = checked[i].getAttribute('data-index');
			break;
		}
	}

	var badHash = notableHashes[badIndex].hash;
	var goodHash = notableHashes[goodIndex].hash;

	document.getElementById('newCommand').value = 'lb ' + badHash + ' ' + goodHash;

	for (var i = 0; i < checked.length; i++) {
		checked[i].parentNode.parentNode.classList.add('marked');
	}
}

updateCheckboxes();

function hideUnmarked(event) {
	if (event.target.checked) {
		table.classList.add('hide-unmarked');
	}
	else {
		table.classList.remove('hide-unmarked');
	}
}

document.getElementById('hideUnmarked').onchange = hideUnmarked;

function hideMarked(event) {
	if (event.target.checked) {
		table.classList.add('hide-marked');
	}
	else {
		table.classList.remove('hide-marked');
	}
}

document.getElementById('hideMarked').onchange = hideMarked;

document.getElementById('newCommand').onclick = highlightTextField;