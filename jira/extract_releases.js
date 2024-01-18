var releases = {};

var releaseLinks = Array.from(document.querySelectorAll('div[data-test-id="project-directories.versions.main.table.table-container"] table tr a[data-test-id="project-directories.versions.main.table.cells.name"]'));

releaseLinks = releaseLinks.filter(it => it.closest('td').nextSibling.nextSibling.textContent.trim() != 'No issues')

releaseLinks.filter(it => it.textContent.indexOf('7.4.13 DXP U') != -1)
  .reduce((acc, next) => {
    acc['7.4.13-' + next.textContent.trim().substring(11).toLowerCase()] = next.href.substring(next.href.indexOf('/versions/') + 10, next.href.indexOf('/tab/'));
    return acc;
  }, releases);

releaseLinks.filter(it => it.textContent.indexOf('.Q') != -1)
  .reduce((acc, next) => {
    acc[next.textContent.trim().toLowerCase()] = next.href.substring(next.href.indexOf('/versions/') + 10, next.href.indexOf('/tab/'));
    return acc;
  }, releases);

JSON.stringify(releases, Object.keys(releases).sort((a, b) => {
  var uA = a.indexOf('u');
  var uB = b.indexOf('u');

  return (uA == -1 && uB == -1) ? (a > b ? 1 : -1) :
    (uA == -1) ? 1 : (uB == -1) ? -1 :
    parseInt(a.substring(uA + 1)) - parseInt(b.substring(uB + 1));
}), 2);