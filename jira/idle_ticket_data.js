function addIdleTicket(tbody, rowData) {
	var row = document.createElement('tr');

	if (rowData['state'] == 'open') {
		if (rowData['open_time_days'] > 5) {
			row.style.backgroundColor = 'rgba(255,0,0,0.2)';
		}
		else if (rowData['open_time_days'] > 2) {
			row.style.backgroundColor = 'rgba(255,127,0,0.2)';
		}
	}
	else {
		if (rowData['idle_time_days'] > 5) {
			row.style.backgroundColor = 'rgba(255,0,0,0.2)';
		}
		else if (rowData['idle_time_days'] > 2) {
			row.style.backgroundColor = 'rgba(255,127,0,0.2)';
		}
	}

	var cell = document.createElement('td');
	cell.innerHTML = rowData['region'];
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.innerHTML = '<a href="https://liferay.atlassian.net/browse/' + rowData['ticket_key'] + '" target="_blank">' + rowData['ticket_key'] + '</a>'
	row.appendChild(cell);

	cell = document.createElement('td');
	cell.innerHTML = rowData['assignee'];
	row.appendChild(cell);

	if (rowData['state'] == 'open') {
		cell = document.createElement('td');
		cell.innerHTML = '<a href="' + rowData['github_url'] + '" target="_blank">' + rowData['pull_id'] + '</a>'
		row.appendChild(cell);

		cell = document.createElement('td');
		cell.innerHTML = rowData['open_time_days'].toFixed(1) + ' days';
		row.appendChild(cell);
	}

	cell = document.createElement('td');
	cell.innerHTML = rowData['idle_time_days'].toFixed(1) + ' days';
	row.appendChild(cell);

	tbody.appendChild(row);
};

function sortIdleTicketByIdleTime(a, b) {
	return b['idle_time_days'] - a['idle_time_days'];
};

var request = new XMLHttpRequest();
var requestURL = 'https://s3-us-west-2.amazonaws.com/mdang.grow/idle_ticket_data.json';

request.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
		var idleTicketData = JSON.parse(this.responseText);

		document.getElementById('githubIdleTicketsLastUpdated').innerHTML = new Date(idleTicketData.lastUpdated);
		document.getElementById('jiraIdleTicketsLastUpdated').innerHTML = new Date(idleTicketData.lastUpdated);

		idleTicketData.githubIdleTicketsList.sort(sortIdleTicketByIdleTime);
		idleTicketData.githubIdleTicketsList.forEach(addIdleTicket.bind(null, document.getElementById('githubIdleTickets')));

		idleTicketData.jiraIdleTicketsList.sort(sortIdleTicketByIdleTime);
		idleTicketData.jiraIdleTicketsList.forEach(addIdleTicket.bind(null, document.getElementById('jiraIdleTickets')));
	}
};

request.open('GET', requestURL, true);
request.send();