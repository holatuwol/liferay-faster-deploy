import json
import sys

account_key = sys.argv[1]

with open(f"customer_export/{account_key}.json", "r", encoding="utf8") as f:
    data = json.load(f)

last_comment_date = max(
    (c.get("createdDate") for t in data for c in t.get("comments", []) if c.get("createdDate") is not None),
    default=None,
)

# Embed the raw ticket data as JSON inside a <script type="application/json"> tag
# and let the browser render the TOC table and ticket sections client-side.
# Escaping "<" prevents "</script>" (or "<!--") in ticket content from breaking
# out of the script tag; "<" is a valid JSON string escape for "<".
ticket_json = json.dumps(data).replace("<", "\\u003c")

html_doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{account_key} Customer Ticket Export</title>
<style>
  :root {{
    color-scheme: light dark;
    --bg: #ffffff;
    --fg: #1a1a1a;
    --muted: #5f6368;
    --border: #d8dbe0;
    --row-alt: #f6f7f9;
    --accent: #0b5fff;
    --card-bg: #fbfbfc;
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --bg: #14161a;
      --fg: #e8e8e8;
      --muted: #9aa0a6;
      --border: #33363c;
      --row-alt: #1c1f24;
      --accent: #6ea8ff;
      --card-bg: #1a1c20;
    }}
  }}
  * {{ box-sizing: border-box; }}
  body {{
    background: var(--bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 2rem 1.5rem 4rem;
    line-height: 1.5;
  }}
  h1 {{ font-size: 1.6rem; margin-bottom: 0.25rem; }}
  .subtitle {{ color: var(--muted); margin-top: 0; margin-bottom: 1.5rem; }}
  table {{
    border-collapse: collapse;
    width: 100%;
  }}
  .toc-wrap {{
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 3rem;
  }}
  #toc-table th, #toc-table td {{
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
    font-size: 0.92rem;
  }}
  #toc-table th {{
    background: var(--row-alt);
    position: sticky;
    top: 0;
  }}
  #toc-table th.sortable {{
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }}
  #toc-table th.sortable:hover {{ color: var(--accent); }}
  #toc-table th.sortable::after {{
    content: "\\2195";
    display: inline-block;
    margin-left: 0.35rem;
    color: var(--muted);
  }}
  #toc-table th.sortable[aria-sort="ascending"]::after {{ content: "\\2191"; color: var(--accent); }}
  #toc-table th.sortable[aria-sort="descending"]::after {{ content: "\\2193"; color: var(--accent); }}
  #toc-table tr:nth-child(even) {{ background: var(--row-alt); }}
  #toc-table a {{ color: var(--accent); text-decoration: none; font-weight: 600; }}
  #toc-table a:hover {{ text-decoration: underline; }}
  .ticket {{
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.75rem;
    background: var(--card-bg);
  }}
  .ticket h2 {{ margin-top: 0; }}
  table.fields {{ margin-bottom: 1rem; }}
  table.fields th, table.fields td {{
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }}
  table.fields th {{ width: 12rem; color: var(--muted); font-weight: 600; }}
  .comments {{ display: flex; flex-direction: column; gap: 0.75rem; }}
  .comment {{
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.6rem 0.9rem;
    background: var(--bg);
  }}
  .comment-meta {{ font-size: 0.85rem; color: var(--muted); margin-bottom: 0.35rem; }}
  .comment-author {{ font-weight: 600; color: var(--fg); }}
  .comment-body {{ font-size: 0.95rem; overflow-wrap: anywhere; }}
  .comment-body p:first-child {{ margin-top: 0; }}
  .comment-body p:last-child {{ margin-bottom: 0; }}
  .no-comments {{ color: var(--muted); font-style: italic; }}
  .back-to-top {{ margin-bottom: 0; margin-top: 1rem; font-size: 0.85rem; }}
  .back-to-top a {{ color: var(--accent); }}
</style>
</head>
<body>
  <h1>{account_key} Customer Ticket Export</h1>
  <p class="subtitle" id="ticket-count"></p>

  <h2 id="toc">Table of Contents</h2>
  <div class="toc-wrap">
    <table id="toc-table">
      <thead>
        <tr>
          <th class="sortable">Issue Key</th>
          <th class="sortable">Reporter</th>
          <th class="sortable">Summary</th>
          <th class="sortable">Created Date</th>
          <th class="sortable">Status</th>
          <th class="sortable">Status Date</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <h2>Tickets</h2>
  <div id="tickets"></div>

<script id="ticket-data" type="application/json">{ticket_json}</script>
<script>
(function() {{
  var tickets = JSON.parse(document.getElementById("ticket-data").textContent);

  function esc(s) {{
    return (s == null ? "" : String(s))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }}

  function fmtDate(ms) {{
    if (ms == null) return "";
    var d = new Date(ms);
    function pad(n) {{ return String(n).padStart(2, "0"); }}
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
      " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + " UTC";
  }}

  var tocRows = [];
  var sections = [];

  tickets.forEach(function(t) {{
    var key = t.issueKey || "";
    var anchor = esc(key);
    var reporter = esc(t.reporter);
    var summary = esc(t.summary);
    var created = fmtDate(t.createdDate);
    var status = esc(t.status);
    var statusDate = fmtDate(t.statusDate);
    var comments = t.comments || [];

    tocRows.push(
      "<tr>" +
        '<td data-sort="' + esc(key) + '"><a href="#ticket-' + anchor + '">' + esc(key) + "</a></td>" +
        "<td>" + reporter + "</td>" +
        "<td>" + summary + "</td>" +
        '<td data-sort="' + (t.createdDate || "") + '">' + esc(created) + "</td>" +
        "<td>" + status + "</td>" +
        '<td data-sort="' + (t.statusDate || "") + '">' + esc(statusDate) + "</td>" +
      "</tr>"
    );

    var commentHtml = [];
    if (comments.length) {{
      comments.forEach(function(c) {{
        var cAuthor = esc(c.author);
        var cDate = fmtDate(c.createdDate);
        var cBody = c.body || "";
        commentHtml.push(
          '<div class="comment">' +
            '<div class="comment-meta"><span class="comment-author">' + cAuthor +
              '</span> &middot; <span class="comment-date">' + esc(cDate) + "</span></div>" +
            '<div class="comment-body">' + cBody + "</div>" +
          "</div>"
        );
      }});
    }} else {{
      commentHtml.push('<p class="no-comments">No comments.</p>');
    }}

    sections.push(
      '<section class="ticket" id="ticket-' + anchor + '">' +
        "<h2>" + esc(key) + "</h2>" +
        '<table class="fields">' +
          "<tr><th>Issue Key</th><td>" + esc(key) + "</td></tr>" +
          "<tr><th>Reporter</th><td>" + reporter + "</td></tr>" +
          "<tr><th>Summary</th><td>" + summary + "</td></tr>" +
          "<tr><th>Created Date</th><td>" + esc(created) + "</td></tr>" +
          "<tr><th>Status</th><td>" + status + "</td></tr>" +
          "<tr><th>Status Date</th><td>" + esc(statusDate) + "</td></tr>" +
        "</table>" +
        "<h3>Comments (" + comments.length + ")</h3>" +
        '<div class="comments">' + commentHtml.join("") + "</div>" +
        '<p class="back-to-top"><a href="#toc">&uarr; Back to table of contents</a></p>' +
      "</section>"
    );
  }});

  document.getElementById("ticket-count").textContent = tickets.length + " tickets";
  document.querySelector("#toc-table tbody").innerHTML = tocRows.join("");
  document.getElementById("tickets").innerHTML = sections.join("");

  var table = document.getElementById("toc-table");
  var tbody = table.querySelector("tbody");
  var headers = table.querySelectorAll("th.sortable");
  var collator = new Intl.Collator(undefined, {{ numeric: true, sensitivity: "base" }});

  headers.forEach(function(th, index) {{
    th.addEventListener("click", function() {{
      var ascending = th.getAttribute("aria-sort") !== "ascending";
      headers.forEach(function(h) {{ h.removeAttribute("aria-sort"); }});
      th.setAttribute("aria-sort", ascending ? "ascending" : "descending");

      var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
      rows.sort(function(rowA, rowB) {{
        var cellA = rowA.cells[index];
        var cellB = rowB.cells[index];
        var valueA = cellA.getAttribute("data-sort") || cellA.textContent.trim();
        var valueB = cellB.getAttribute("data-sort") || cellB.textContent.trim();
        var numA = parseFloat(valueA);
        var numB = parseFloat(valueB);
        var result;
        if (valueA !== "" && valueB !== "" && !isNaN(numA) && !isNaN(numB)) {{
          result = numA - numB;
        }} else {{
          result = collator.compare(valueA, valueB);
        }}
        return ascending ? result : -result;
      }});
      rows.forEach(function(row) {{ tbody.appendChild(row); }});
    }});
  }});
}})();
</script>
</body>
</html>
"""

with open(f"customer_export/{account_key}.html", "w", encoding="utf8") as f:
    f.write(html_doc)

print(f"Wrote export for {account_key} ({len(data)} tickets), last comment was at {last_comment_date}")