#!/usr/bin/env python3
"""
Liferay Portal - Password Encryption Algorithm Across Git Tags
Generates an interactive HTML website tool to compare `passwords.encryption.algorithm`
across all git repository tags to determine if `passwords.encryption.algorithm.legacy`
needs to be configured during upgrade.

Usage:
    python3 generate_password_encryption_report.py [--output report.html] [--repo-path .]
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime


# ==============================================================================
# Part 1: Git Tag Extraction & Algorithm Analysis Engine
# ==============================================================================

class TagPropertyExtractor:
    """Extracts passwords.encryption.algorithm from portal-impl/src/portal.properties across git tags."""

    PROP_PATTERN = re.compile(
        r'^[ \t]*passwords\.encryption\.algorithm[ \t]*=[ \t]*(.+)$',
        re.MULTILINE
    )

    def __init__(self, repo_path="/home/me/dev/projects/liferay-portal"):
        self.repo_path = os.path.abspath(repo_path)

    @staticmethod
    def natural_sort_key(tag):
        """Natural alphanumeric sorting key for release and version tags."""
        parts = re.split(r'(\d+)', tag)
        key = []
        for part in parts:
            if part.isdigit():
                key.append((0, int(part)))
            elif part:
                key.append((1, part.lower()))
        return key

    @staticmethod
    def categorize_tag(tag):
        """Categorize tag into release types."""
        if re.match(r'^\d{4}\.q\d\.\d+$', tag):
            return "Quarterly Release"
        if re.match(r'^\d+\.\d+\.\d+(\.\d+)?-ga\d+$', tag):
            return "GA Release"
        if re.match(r'^\d+\.\d+\.\d+-u\d+$', tag):
            return "Update Release"
        if tag.startswith("fix-pack-"):
            return "Fix Pack"
        if tag.startswith("marketplace-"):
            return "Marketplace"
        return "Other"

    def get_all_tags_with_dates(self):
        """Retrieve all tags and their dates via git for-each-ref."""
        cmd = [
            "git", "-C", self.repo_path, "for-each-ref",
            "--format=%(refname:short)|%(creatordate:iso-strict)|%(committerdate:iso-strict)",
            "refs/tags"
        ]
        output = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("utf-8")
        tags_info = {}
        for line in output.strip().splitlines():
            if not line:
                continue
            parts = line.split("|")
            tag_name = parts[0]
            creator_date = parts[1] if len(parts) > 1 and parts[1] else ""
            committer_date = parts[2] if len(parts) > 2 and parts[2] else ""
            best_date = creator_date or committer_date
            tags_info[tag_name] = best_date
        return tags_info

    def extract_algorithms(self, tags_info):
        """
        Extract passwords.encryption.algorithm for all tags using git cat-file --batch.
        Pipes requests synchronously to prevent buffer deadlocks.
        """
        process = subprocess.Popen(
            ["git", "-C", self.repo_path, "cat-file", "--batch"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL
        )

        def read_exact(stream, num_bytes):
            buf = bytearray()
            while len(buf) < num_bytes:
                chunk = stream.read(num_bytes - len(buf))
                if not chunk:
                    break
                buf.extend(chunk)
            return bytes(buf)

        results = []
        total = len(tags_info)
        processed = 0

        # Sort tags by natural version
        sorted_tags = sorted(tags_info.keys(), key=self.natural_sort_key)

        for tag in sorted_tags:
            query = f"{tag}:portal-impl/src/portal.properties\n".encode("utf-8")
            process.stdin.write(query)
            process.stdin.flush()

            header_line = process.stdout.readline().decode("utf-8", errors="ignore")
            date_str = tags_info.get(tag, "")
            display_date = date_str[:10] if date_str else "Unknown"
            category = self.categorize_tag(tag)

            if not header_line or "missing" in header_line:
                results.append({
                    "tag": tag,
                    "date": display_date,
                    "full_date": date_str,
                    "category": category,
                    "has_file": False,
                    "algorithm": "N/A (File Missing)"
                })
            else:
                header_parts = header_line.split()
                if len(header_parts) >= 3 and header_parts[2].isdigit():
                    blob_size = int(header_parts[2])
                    raw_data = read_exact(process.stdout, blob_size)
                    process.stdout.read(1)  # trailing LF

                    blob_data = raw_data.decode("utf-8", errors="ignore")
                    match = self.PROP_PATTERN.search(blob_data)
                    algo_val = match.group(1).strip() if match else "N/A (Not Defined)"
                    results.append({
                        "tag": tag,
                        "date": display_date,
                        "full_date": date_str,
                        "category": category,
                        "has_file": True,
                        "algorithm": algo_val
                    })
                else:
                    results.append({
                        "tag": tag,
                        "date": display_date,
                        "full_date": date_str,
                        "category": category,
                        "has_file": False,
                        "algorithm": "N/A (Read Error)"
                    })

            processed += 1
            if processed % 100 == 0 or processed == total:
                sys.stderr.write(f"\rExtracted tag properties: {processed}/{total}...")
                sys.stderr.flush()

        sys.stderr.write("\n")
        process.stdin.close()
        process.wait()

        return results

    def analyze(self):
        """Run extraction and build comprehensive summary dataset."""
        t0 = time.time()
        tags_info = self.get_all_tags_with_dates()
        records = self.extract_algorithms(tags_info)
        elapsed = time.time() - t0

        # Compute summary statistics
        algo_counts = {}
        category_counts = {}
        for r in records:
            algo = r["algorithm"]
            cat = r["category"]
            algo_counts[algo] = algo_counts.get(algo, 0) + 1
            category_counts[cat] = category_counts.get(cat, 0) + 1

        return {
            "metadata": {
                "total_tags": len(records),
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "elapsed_seconds": round(elapsed, 2),
                "repo_path": self.repo_path
            },
            "algo_counts": algo_counts,
            "category_counts": category_counts,
            "records": records
        }


# ==============================================================================
# Part 2: Interactive HTML Website Tool Generator
# ==============================================================================

class HtmlReportGenerator:
    """Generates a modern, standalone HTML tool with upgrade evaluation and filtering."""

    @staticmethod
    def generate(data, output_path):
        """Render standalone HTML file containing embedded data, styling, and interactive JavaScript."""
        data_json = json.dumps(data, indent=None)

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liferay Password Encryption Algorithm & Upgrade Advisor</title>
  <style>
    :root {{
      --primary: #0b5fff;
      --primary-hover: #004ecc;
      --bg-body: #f8fafc;
      --bg-card: #ffffff;
      --bg-card-subtle: #f1f5f9;
      --border-color: #e2e8f0;
      --border-hover: #cbd5e1;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-subtle: #94a3b8;
      --success: #10b981;
      --success-bg: #ecfdf5;
      --success-border: #a7f3d0;
      --warning: #f59e0b;
      --warning-bg: #fffbeb;
      --warning-border: #fde68a;
      --danger: #ef4444;
      --danger-bg: #fef2f2;
      --danger-border: #fecaca;
      --info-bg: #eff6ff;
      --info-border: #bfdbfe;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      --radius: 10px;
    }}

    [data-theme="dark"] {{
      --bg-body: #0b0f19;
      --bg-card: #131b2e;
      --bg-card-subtle: #1e293b;
      --border-color: #243247;
      --border-hover: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-subtle: #64748b;
      --primary: #3b82f6;
      --primary-hover: #60a5fa;
      --success-bg: #064e3b22;
      --success-border: #065f46;
      --warning-bg: #78350f22;
      --warning-border: #92400e;
      --danger-bg: #7f1d1d22;
      --danger-border: #991b1b;
      --info-bg: #1e3a8a22;
      --info-border: #1d4ed8;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.6);
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: var(--font-family);
      background-color: var(--bg-body);
      color: var(--text-main);
      line-height: 1.5;
      padding: 24px 20px 60px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }}

    .container {{
      max-width: 1280px;
      margin: 0 auto;
    }}

    header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
      gap: 16px;
    }}

    .header-title h1 {{
      font-size: 26px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .header-title p {{
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 6px;
      max-width: 800px;
    }}

    .header-actions {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .theme-toggle-btn {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 8px 14px;
      border-radius: var(--radius);
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      box-shadow: var(--shadow-sm);
      transition: all 0.15s ease;
    }}

    .theme-toggle-btn:hover {{
      border-color: var(--border-hover);
      background: var(--bg-card-subtle);
    }}

    /* KPI Summary Cards */
    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }}

    .kpi-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 18px 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }}

    .kpi-card:hover {{
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }}

    .kpi-label {{
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }}

    .kpi-value {{
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
    }}

    .kpi-subtext {{
      font-size: 12px;
      color: var(--text-subtle);
    }}

    /* Upgrade Advisor Section */
    .section-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 28px;
      box-shadow: var(--shadow-sm);
    }}

    .section-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 8px;
    }}

    .section-header h2 {{
      font-size: 19px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .advisor-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }}

    @media (max-width: 768px) {{
      .advisor-grid {{
        grid-template-columns: 1fr;
      }}
    }}

    .select-group {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}

    .select-group label {{
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }}

    .tag-select {{
      padding: 10px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border-color);
      background-color: var(--bg-card);
      color: var(--text-main);
      font-size: 14px;
      font-family: inherit;
      width: 100%;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s ease;
    }}

    .tag-select:focus {{
      border-color: var(--primary);
    }}

    /* Advisor Result Box */
    .result-box {{
      border-radius: var(--radius);
      padding: 22px;
      border: 1px solid var(--border-color);
      background: var(--bg-card-subtle);
      transition: all 0.2s ease;
    }}

    .result-box.action-required {{
      background: var(--danger-bg);
      border-color: var(--danger-border);
    }}

    .result-box.rounds-upgrade {{
      background: var(--warning-bg);
      border-color: var(--warning-border);
    }}

    .result-box.no-action {{
      background: var(--success-bg);
      border-color: var(--success-border);
    }}

    .result-badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 12px;
    }}

    .result-badge.danger {{
      background: #ef4444;
      color: #ffffff;
    }}

    .result-badge.warning {{
      background: #d97706;
      color: #ffffff;
    }}

    .result-badge.success {{
      background: #059669;
      color: #ffffff;
    }}

    .comparison-cards {{
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      margin: 16px 0;
    }}

    @media (max-width: 640px) {{
      .comparison-cards {{
        grid-template-columns: 1fr;
        text-align: center;
      }}
    }}

    .comparison-node {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 14px 16px;
      box-shadow: var(--shadow-sm);
    }}

    .comparison-node .tag-title {{
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 4px;
    }}

    .comparison-node .tag-algo {{
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
      word-break: break-all;
    }}

    .comparison-arrow {{
      font-size: 20px;
      color: var(--text-muted);
      font-weight: bold;
      text-align: center;
    }}

    .config-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 14px 18px;
      margin-top: 14px;
    }}

    .config-card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }}

    .config-card-header span {{
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }}

    .copy-btn {{
      background: var(--primary);
      color: #ffffff;
      border: none;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s ease;
    }}

    .copy-btn:hover {{
      background: var(--primary-hover);
    }}

    .code-block {{
      font-family: var(--font-mono);
      font-size: 13px;
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      border-radius: 6px;
      color: var(--text-main);
      overflow-x: auto;
      white-space: pre;
    }}

    .explanation-text {{
      font-size: 14px;
      color: var(--text-main);
      margin-top: 12px;
      line-height: 1.6;
    }}

    /* Timeline Section */
    .timeline {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }}

    .timeline-item {{
      background: var(--bg-card-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 16px;
      border-left: 4px solid var(--primary);
    }}

    .timeline-era {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 4px;
    }}

    .timeline-algo {{
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 6px;
    }}

    .timeline-desc {{
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }}

    /* Filter & Search Bar */
    .controls-grid {{
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }}

    @media (max-width: 768px) {{
      .controls-grid {{
        grid-template-columns: 1fr;
      }}
    }}

    .search-input {{
      padding: 10px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border-color);
      background-color: var(--bg-card);
      color: var(--text-main);
      font-size: 14px;
      width: 100%;
      outline: none;
      transition: border-color 0.15s ease;
    }}

    .search-input:focus {{
      border-color: var(--primary);
    }}

    .filter-select {{
      padding: 10px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--border-color);
      background-color: var(--bg-card);
      color: var(--text-main);
      font-size: 14px;
      outline: none;
      cursor: pointer;
      width: 100%;
    }}

    /* Table Styles */
    .table-wrapper {{
      overflow-x: auto;
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      background: var(--bg-card);
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }}

    thead {{
      background: var(--bg-card-subtle);
      border-bottom: 1px solid var(--border-color);
    }}

    th {{
      padding: 12px 16px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
    }}

    th:hover {{
      color: var(--text-main);
    }}

    td {{
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
      vertical-align: middle;
    }}

    tr:last-child td {{
      border-bottom: none;
    }}

    tr:hover td {{
      background-color: var(--bg-card-subtle);
    }}

    .tag-badge {{
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }}

    .algo-pill {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      word-break: break-all;
    }}

    .algo-sha {{
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }}

    [data-theme="dark"] .algo-sha {{
      background: #78350f44;
      color: #fde68a;
      border-color: #92400e;
    }}

    .algo-pbkdf2-128 {{
      background: #e0f2fe;
      color: #075985;
      border: 1px solid #bae6fd;
    }}

    [data-theme="dark"] .algo-pbkdf2-128 {{
      background: #0c4a6e44;
      color: #7dd3fc;
      border-color: #0284c7;
    }}

    .algo-pbkdf2-720 {{
      background: #ede9fe;
      color: #5b21b6;
      border: 1px solid #ddd6fe;
    }}

    [data-theme="dark"] .algo-pbkdf2-720 {{
      background: #4c1d9544;
      color: #c4b5fd;
      border-color: #7c3aed;
    }}

    .algo-pbkdf2-1300 {{
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }}

    [data-theme="dark"] .algo-pbkdf2-1300 {{
      background: #14532d44;
      color: #86efac;
      border-color: #15803d;
    }}

    .algo-missing {{
      background: var(--bg-card-subtle);
      color: var(--text-subtle);
      border: 1px solid var(--border-color);
      font-style: italic;
    }}

    .category-badge {{
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--bg-card-subtle);
      color: var(--text-muted);
      border: 1px solid var(--border-color);
    }}

    .action-link {{
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-main);
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      margin-right: 4px;
    }}

    .action-link:hover {{
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }}

    /* Pagination */
    .pagination-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 13px;
      color: var(--text-muted);
    }}

    .pagination-buttons {{
      display: flex;
      gap: 6px;
    }}

    .page-btn {{
      padding: 6px 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-main);
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
    }}

    .page-btn:hover:not(:disabled) {{
      background: var(--bg-card-subtle);
      border-color: var(--border-hover);
    }}

    .page-btn:disabled {{
      opacity: 0.4;
      cursor: not-allowed;
    }}

    .page-btn.active {{
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }}

    footer {{
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: var(--text-subtle);
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-title">
        <h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Password Encryption Algorithm Inspector
        </h1>
        <p>
          Analyze active default values of <code>passwords.encryption.algorithm</code> in <code>portal-impl/src/portal.properties</code> across all Git repository tags and determine when <code>passwords.encryption.algorithm.legacy</code> is required during upgrades.
        </p>
      </div>
      <div class="header-actions">
        <button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleTheme()">
          <span id="themeIcon">🌙</span> Toggle Theme
        </button>
      </div>
    </header>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total Git Tags</span>
        <span class="kpi-value" id="kpiTotalTags">-</span>
        <span class="kpi-subtext" id="kpiWithFile">- contain portal.properties</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Unique Algorithms</span>
        <span class="kpi-value" id="kpiUniqueAlgos">4</span>
        <span class="kpi-subtext">SHA, PBKDF2 (128k, 720k, 1.3M)</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Current Master / Latest</span>
        <span class="kpi-value" style="font-size: 17px; font-family: var(--font-mono); color: var(--success);">1.3M PBKDF2</span>
        <span class="kpi-subtext">PBKDF2WithHmacSHA1/160/1300000</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Pre-6.2 Legacy (SHA)</span>
        <span class="kpi-value" id="kpiShaTags" style="color: var(--warning);">-</span>
        <span class="kpi-subtext">Requires legacy property on upgrade</span>
      </div>
    </div>

    <!-- Upgrade Advisor Section -->
    <div class="section-card">
      <div class="section-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          Interactive Upgrade Compatibility Advisor
        </h2>
        <span style="font-size: 13px; color: var(--text-muted);">
          Compare source tag vs target tag to evaluate <code>passwords.encryption.algorithm.legacy</code> requirement
        </span>
      </div>

      <div class="advisor-grid">
        <div class="select-group">
          <label for="sourceTagSelect">Source Tag (Upgrading From):</label>
          <select id="sourceTagSelect" class="tag-select" onchange="runUpgradeAnalysis()"></select>
        </div>
        <div class="select-group">
          <label for="targetTagSelect">Target Tag (Upgrading To):</label>
          <select id="targetTagSelect" class="tag-select" onchange="runUpgradeAnalysis()"></select>
        </div>
      </div>

      <!-- Upgrade Evaluation Box -->
      <div id="advisorResultBox" class="result-box">
        <div id="advisorBadge" class="result-badge">Analysis Ready</div>

        <div class="comparison-cards">
          <div class="comparison-node">
            <div class="tag-title">Source: <span id="resSourceTag">-</span></div>
            <div class="tag-algo" id="resSourceAlgo">-</div>
          </div>
          <div class="comparison-arrow">➔</div>
          <div class="comparison-node">
            <div class="tag-title">Target: <span id="resTargetTag">-</span></div>
            <div class="tag-algo" id="resTargetAlgo">-</div>
          </div>
        </div>

        <div id="advisorExplanation" class="explanation-text">
          Select source and target tags to evaluate upgrade path.
        </div>

        <div id="advisorConfigSnippet" class="config-card" style="display: none;">
          <div class="config-card-header">
            <span>Recommended Configuration (portal-ext.properties)</span>
            <button class="copy-btn" onclick="copyConfigSnippet()">Copy Config</button>
          </div>
          <div class="code-block" id="snippetText"></div>
        </div>
      </div>
    </div>

    <!-- Algorithm History & Evolution Timeline -->
    <div class="section-card">
      <div class="section-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 14"></polyline>
          </svg>
          Algorithm Evolution Across Liferay Portal History
        </h2>
      </div>

      <div class="timeline">
        <div class="timeline-item" style="border-left-color: #f59e0b;">
          <div class="timeline-era">Liferay 6.1 and Earlier</div>
          <div class="timeline-algo">SHA</div>
          <div class="timeline-desc">
            Base64-encoded SHA-1. <strong>Stored hashes do NOT have algorithm prefixes</strong>.
            Upgrading from 6.1 or earlier <em>strictly requires</em> <code>passwords.encryption.algorithm.legacy=SHA</code>.
          </div>
        </div>

        <div class="timeline-item" style="border-left-color: #0284c7;">
          <div class="timeline-era">Liferay 6.2 through Early 7.4</div>
          <div class="timeline-algo">PBKDF2WithHmacSHA1/160/128000</div>
          <div class="timeline-desc">
            128,000 rounds. <strong>Introduced algorithm prefix</strong> <code>{{algorithm}}hash</code> in the database.
            Allows Liferay to automatically detect hash types on authentication.
          </div>
        </div>

        <div class="timeline-item" style="border-left-color: #7c3aed;">
          <div class="timeline-era">Liferay 7.4 Updates / 2023 Q3</div>
          <div class="timeline-algo">PBKDF2WithHmacSHA1/160/720000</div>
          <div class="timeline-desc">
            Rounds increased from 128k to 720,000 for improved brute-force resistance.
            Hashes remain self-describing; existing passwords seamlessly upgrade upon user login.
          </div>
        </div>

        <div class="timeline-item" style="border-left-color: #10b981;">
          <div class="timeline-era">2024 Q2+ through Current</div>
          <div class="timeline-algo">PBKDF2WithHmacSHA1/160/1300000</div>
          <div class="timeline-desc">
            1,300,000 rounds (recommended by OWASP Password Storage Guidelines).
            Users logging in with 128k or 720k hashes are transparently upgraded to 1.3M rounds.
          </div>
        </div>
      </div>
    </div>

    <!-- Tag Explorer Table -->
    <div class="section-card">
      <div class="section-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          Repository Tags Directory (<span id="filteredTagCount">0</span> tags)
        </h2>
      </div>

      <div class="controls-grid">
        <input type="text" id="searchInput" class="search-input" placeholder="Search by tag name or algorithm..." oninput="handleFilterChange()">
        <select id="categoryFilter" class="filter-select" onchange="handleFilterChange()">
          <option value="ALL">All Categories</option>
          <option value="Quarterly Release">Quarterly Releases</option>
          <option value="GA Release">GA Releases</option>
          <option value="Update Release">Update Releases</option>
          <option value="Fix Pack">Fix Packs</option>
          <option value="Marketplace">Marketplace</option>
          <option value="Other">Other</option>
        </select>
        <select id="algorithmFilter" class="filter-select" onchange="handleFilterChange()">
          <option value="ALL">All Algorithms</option>
          <option value="PBKDF2WithHmacSHA1/160/1300000">PBKDF2 (1,300,000)</option>
          <option value="PBKDF2WithHmacSHA1/160/720000">PBKDF2 (720,000)</option>
          <option value="PBKDF2WithHmacSHA1/160/128000">PBKDF2 (128,000)</option>
          <option value="SHA">SHA (Legacy 6.1)</option>
          <option value="MISSING">Missing portal.properties</option>
        </select>
      </div>

      <div class="table-wrapper">
        <table id="tagsTable">
          <thead>
            <tr>
              <th onclick="toggleSort('tag')">Tag Name <span id="sortIndicatorTag">▲</span></th>
              <th onclick="toggleSort('date')">Date <span id="sortIndicatorDate"></span></th>
              <th>Category</th>
              <th onclick="toggleSort('algorithm')">Active Algorithm <span id="sortIndicatorAlgo"></span></th>
              <th style="text-align: right;">Advisor Actions</th>
            </tr>
          </thead>
          <tbody id="tagsTableBody">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <div>
          Showing <span id="pageRangeStart">1</span> to <span id="pageRangeEnd">50</span> of <span id="totalFilteredRecords">0</span> tags
          &nbsp;|&nbsp;
          Page Size:
          <select id="pageSizeSelect" style="padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);" onchange="handlePageSizeChange(this.value)">
            <option value="25">25</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <div class="pagination-buttons" id="paginationControls">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>

    <footer>
      Generated on {data["metadata"]["generated_at"]} &bull; Analyzed {data["metadata"]["total_tags"]} repository tags in {data["metadata"]["elapsed_seconds"]}s &bull; Liferay Portal Architecture
    </footer>
  </div>

  <script>
    // Embedded Tag Data
    const RAW_DATA = {data_json};

    let allRecords = RAW_DATA.records || [];
    let filteredRecords = [...allRecords];
    let sortColumn = 'tag';
    let sortAsc = true;
    let currentPage = 1;
    let pageSize = 50;

    // Theme Management
    function initTheme() {{
      const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);
    }}

    function toggleTheme() {{
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next);
    }}

    function updateThemeIcon(theme) {{
      const icon = document.getElementById('themeIcon');
      if (icon) {{
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }}
    }}

    // Badge styling helper
    function getAlgoBadgeClass(algo) {{
      if (!algo || algo.includes('Missing') || algo.includes('Not')) return 'algo-missing';
      if (algo === 'SHA') return 'algo-sha';
      if (algo.includes('128000')) return 'algo-pbkdf2-128';
      if (algo.includes('720000')) return 'algo-pbkdf2-720';
      if (algo.includes('1300000')) return 'algo-pbkdf2-1300';
      return 'algo-pbkdf2-128';
    }}

    // Initialize Advisor Dropdowns
    function initDropdowns() {{
      const srcSelect = document.getElementById('sourceTagSelect');
      const tgtSelect = document.getElementById('targetTagSelect');

      // Filter tags that actually have portal.properties for clean dropdowns
      const validTags = allRecords.filter(r => r.has_file);

      // Default selections: 6.2.0-ga1 to 2024.q1.14 (or latest)
      let defaultSrc = '6.1.0-ga1';
      let defaultTgt = validTags.length > 0 ? validTags[validTags.length - 1].tag : '';

      // Check if 6.1.0-ga1 exists, otherwise pick first
      if (!validTags.some(r => r.tag === defaultSrc) && validTags.length > 0) {{
        defaultSrc = validTags[0].tag;
      }}

      srcSelect.innerHTML = validTags.map(r => `<option value="${{r.tag}}">${{r.tag}} (${{r.category}} - ${{r.date}})</option>`).join('');
      tgtSelect.innerHTML = validTags.map(r => `<option value="${{r.tag}}">${{r.tag}} (${{r.category}} - ${{r.date}})</option>`).join('');

      srcSelect.value = defaultSrc;
      tgtSelect.value = defaultTgt;

      runUpgradeAnalysis();
    }}

    // Run Upgrade Analysis
    function runUpgradeAnalysis() {{
      const srcTag = document.getElementById('sourceTagSelect').value;
      const tgtTag = document.getElementById('targetTagSelect').value;

      const srcRecord = allRecords.find(r => r.tag === srcTag) || {{ algorithm: 'Unknown' }};
      const tgtRecord = allRecords.find(r => r.tag === tgtTag) || {{ algorithm: 'Unknown' }};

      document.getElementById('resSourceTag').textContent = srcTag;
      document.getElementById('resSourceAlgo').textContent = srcRecord.algorithm;
      document.getElementById('resTargetTag').textContent = tgtTag;
      document.getElementById('resTargetAlgo').textContent = tgtRecord.algorithm;

      const resultBox = document.getElementById('advisorResultBox');
      const badge = document.getElementById('advisorBadge');
      const explanation = document.getElementById('advisorExplanation');
      const snippetContainer = document.getElementById('advisorConfigSnippet');
      const snippetText = document.getElementById('snippetText');

      resultBox.className = 'result-box';

      const srcAlgo = srcRecord.algorithm;
      const tgtAlgo = tgtRecord.algorithm;

      // Evaluation Logic
      if (srcAlgo === tgtAlgo) {{
        resultBox.classList.add('no-action');
        badge.className = 'result-badge success';
        badge.textContent = 'NO CONFIG CHANGE NEEDED';
        explanation.innerHTML = `
          <strong>Identical Password Encryption Algorithm:</strong> Both <code>${{srcTag}}</code> and <code>${{tgtTag}}</code> default to <code>${{srcAlgo}}</code>.<br>
          No modification to <code>passwords.encryption.algorithm.legacy</code> is required unless you are upgrading users originally migrated from pre-6.2 who have never authenticated.
        `;
        snippetContainer.style.display = 'none';
      }} else if (srcAlgo === 'SHA') {{
        // Definite Legacy Migration Required!
        resultBox.classList.add('action-required');
        badge.className = 'result-badge danger';
        badge.textContent = 'MIGRATION REQUIRED: LEGACY PROPERTY MUST BE SET';
        explanation.innerHTML = `
          <strong>Critical Action Required:</strong> Source release <code>${{srcTag}}</code> uses legacy <code>SHA</code> encryption without prefix braces.<br>
          Target release <code>${{tgtTag}}</code> uses <code>${{tgtAlgo}}</code> with <code>{{algorithm}}</code> prefixing.<br>
          Because Liferay cannot deduce the legacy algorithm for stored prefix-less SHA passwords, <strong>you must set <code>passwords.encryption.algorithm.legacy=SHA</code> in <code>portal-ext.properties</code></strong>. Otherwise, existing users will fail to log in with <code>PwdEncryptorException.MustSetLegacyAlgorithmProperty</code>.
        `;
        snippetContainer.style.display = 'block';
        snippetText.textContent = `# Set designated legacy encryption algorithm to migrate existing pre-6.2 passwords:\npasswords.encryption.algorithm.legacy=SHA`;
      }} else if (srcAlgo.startsWith('PBKDF2') && tgtAlgo.startsWith('PBKDF2')) {{
        // Rounds upgrade within PBKDF2 family
        resultBox.classList.add('rounds-upgrade');
        badge.className = 'result-badge warning';
        badge.textContent = 'ROUNDS UPGRADE: AUTOMATICALLY HANDLED BY LIFERAY';
        explanation.innerHTML = `
          <strong>Automatic PBKDF2 Rounds Upgrade:</strong><br>
          Source version uses <code>${{srcAlgo}}</code> and target uses <code>${{tgtAlgo}}</code>.<br>
          Starting in Liferay 6.2+, all passwords stored in the database are prefixed with their algorithm identifier (e.g., <code>{{PBKDF2WithHmacSHA1/160/128000}}...</code>).<br>
          Liferay's <code>PasswordEncryptorUtil</code> automatically reads this prefix to verify the user's password, and upon successful authentication, transparently upgrades the password to the target algorithm (<strong>${{tgtAlgo}}</strong>).<br><br>
          <strong>Legacy Property:</strong> You generally <strong>do NOT need</strong> to set <code>passwords.encryption.algorithm.legacy</code> for standard users. However, if your database still contains unauthenticated users carried over from pre-6.2 (or prefix-less custom hashes), set <code>passwords.encryption.algorithm.legacy=SHA</code>.
        `;
        snippetContainer.style.display = 'block';
        snippetText.textContent = `# Standard 6.2+ upgrade automatically migrates prefixed hashes on login.\n# Only set this if your database contains un-migrated pre-6.2 users who never logged in:\n# passwords.encryption.algorithm.legacy=SHA`;
      }} else {{
        // Custom or general migration
        resultBox.classList.add('action-required');
        badge.className = 'result-badge warning';
        badge.textContent = 'ALGORITHM CHANGED: VERIFY USER HASHES';
        explanation.innerHTML = `
          The default algorithm changed from <code>${{srcAlgo}}</code> to <code>${{tgtAlgo}}</code>.<br>
          If any users have stored passwords that lack the <code>{{algorithm}}</code> prefix, set <code>passwords.encryption.algorithm.legacy=${{srcAlgo}}</code> in <code>portal-ext.properties</code>.
        `;
        snippetContainer.style.display = 'block';
        snippetText.textContent = `passwords.encryption.algorithm.legacy=${{srcAlgo}}`;
      }}
    }}

    function setAdvisorSource(tag) {{
      const select = document.getElementById('sourceTagSelect');
      if (select) {{
        select.value = tag;
        runUpgradeAnalysis();
        window.scrollTo({{ top: select.closest('.section-card').offsetTop - 20, behavior: 'smooth' }});
      }}
    }}

    function setAdvisorTarget(tag) {{
      const select = document.getElementById('targetTagSelect');
      if (select) {{
        select.value = tag;
        runUpgradeAnalysis();
        window.scrollTo({{ top: select.closest('.section-card').offsetTop - 20, behavior: 'smooth' }});
      }}
    }}

    function copyConfigSnippet() {{
      const text = document.getElementById('snippetText').textContent;
      navigator.clipboard.writeText(text).then(() => {{
        alert('Configuration copied to clipboard!');
      }}).catch(err => {{
        console.error('Failed to copy: ', err);
      }});
    }}

    // Filter & Search Logic
    function handleFilterChange() {{
      const query = document.getElementById('searchInput').value.toLowerCase().trim();
      const catFilter = document.getElementById('categoryFilter').value;
      const algoFilter = document.getElementById('algorithmFilter').value;

      filteredRecords = allRecords.filter(r => {{
        // Search text
        if (query) {{
          const matchTag = r.tag.toLowerCase().includes(query);
          const matchAlgo = r.algorithm.toLowerCase().includes(query);
          const matchCat = r.category.toLowerCase().includes(query);
          if (!matchTag && !matchAlgo && !matchCat) return false;
        }}

        // Category filter
        if (catFilter !== 'ALL' && r.category !== catFilter) {{
          return false;
        }}

        // Algorithm filter
        if (algoFilter !== 'ALL') {{
          if (algoFilter === 'MISSING') {{
            if (r.has_file) return false;
          }} else if (r.algorithm !== algoFilter) {{
            return false;
          }}
        }}

        return true;
      }});

      currentPage = 1;
      sortAndRenderTable();
    }}

    // Sorting Logic
    function toggleSort(column) {{
      if (sortColumn === column) {{
        sortAsc = !sortAsc;
      }} else {{
        sortColumn = column;
        sortAsc = true;
      }}
      sortAndRenderTable();
    }}

    function updateSortIndicators() {{
      document.getElementById('sortIndicatorTag').textContent = sortColumn === 'tag' ? (sortAsc ? '▲' : '▼') : '';
      document.getElementById('sortIndicatorDate').textContent = sortColumn === 'date' ? (sortAsc ? '▲' : '▼') : '';
      document.getElementById('sortIndicatorAlgo').textContent = sortColumn === 'algorithm' ? (sortAsc ? '▲' : '▼') : '';
    }}

    function naturalCompare(a, b) {{
      const partsA = a.split(/(\\d+)/);
      const partsB = b.split(/(\\d+)/);
      const len = Math.max(partsA.length, partsB.length);

      for (let i = 0; i < len; i++) {{
        const pA = partsA[i] || '';
        const pB = partsB[i] || '';
        const numA = parseInt(pA, 10);
        const numB = parseInt(pB, 10);

        if (!isNaN(numA) && !isNaN(numB)) {{
          if (numA !== numB) return numA - numB;
        }} else {{
          const cmp = pA.localeCompare(pB);
          if (cmp !== 0) return cmp;
        }}
      }}
      return 0;
    }}

    function sortAndRenderTable() {{
      filteredRecords.sort((a, b) => {{
        let res = 0;
        if (sortColumn === 'tag') {{
          res = naturalCompare(a.tag, b.tag);
        }} else if (sortColumn === 'date') {{
          res = (a.full_date || '').localeCompare(b.full_date || '');
        }} else if (sortColumn === 'algorithm') {{
          res = a.algorithm.localeCompare(b.algorithm);
        }}
        return sortAsc ? res : -res;
      }});

      updateSortIndicators();
      renderTable();
    }}

    // Table & Pagination Rendering
    function renderTable() {{
      const tbody = document.getElementById('tagsTableBody');
      const total = filteredRecords.length;
      document.getElementById('filteredTagCount').textContent = total;
      document.getElementById('totalFilteredRecords').textContent = total;

      if (total === 0) {{
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">No matching tags found.</td></tr>`;
        document.getElementById('pageRangeStart').textContent = '0';
        document.getElementById('pageRangeEnd').textContent = '0';
        document.getElementById('paginationControls').innerHTML = '';
        return;
      }}

      let effectivePageSize = pageSize === 'ALL' ? total : parseInt(pageSize, 10);
      const totalPages = Math.ceil(total / effectivePageSize);
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      const startIndex = (currentPage - 1) * effectivePageSize;
      const endIndex = Math.min(startIndex + effectivePageSize, total);

      document.getElementById('pageRangeStart').textContent = (startIndex + 1).toString();
      document.getElementById('pageRangeEnd').textContent = endIndex.toString();

      const pageSlice = filteredRecords.slice(startIndex, endIndex);

      tbody.innerHTML = pageSlice.map(r => `
        <tr>
          <td>
            <span class="tag-badge">${{r.tag}}</span>
          </td>
          <td style="color: var(--text-muted); white-space: nowrap;">${{r.date}}</td>
          <td><span class="category-badge">${{r.category}}</span></td>
          <td>
            <span class="algo-pill ${{getAlgoBadgeClass(r.algorithm)}}">${{r.algorithm}}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            ${{r.has_file ? `
              <button class="action-link" onclick="setAdvisorSource('${{r.tag}}')">As Source</button>
              <button class="action-link" onclick="setAdvisorTarget('${{r.tag}}')">As Target</button>
            ` : `<span style="font-size: 11px; color: var(--text-subtle);">No portal.properties</span>`}}
          </td>
        </tr>
      `).join('');

      renderPaginationControls(totalPages);
    }}

    function renderPaginationControls(totalPages) {{
      const container = document.getElementById('paginationControls');
      if (totalPages <= 1) {{
        container.innerHTML = '';
        return;
      }}

      let buttonsHtml = '';
      buttonsHtml += `<button class="page-btn" ${{currentPage === 1 ? 'disabled' : ''}} onclick="goToPage(1)">&laquo;</button>`;
      buttonsHtml += `<button class="page-btn" ${{currentPage === 1 ? 'disabled' : ''}} onclick="goToPage(${{currentPage - 1}})">&lsaquo;</button>`;

      const maxButtons = 5;
      let startP = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endP = Math.min(totalPages, startP + maxButtons - 1);
      if (endP - startP + 1 < maxButtons) {{
        startP = Math.max(1, endP - maxButtons + 1);
      }}

      for (let p = startP; p <= endP; p++) {{
        buttonsHtml += `<button class="page-btn ${{p === currentPage ? 'active' : ''}}" onclick="goToPage(${{p}})">${{p}}</button>`;
      }}

      buttonsHtml += `<button class="page-btn" ${{currentPage === totalPages ? 'disabled' : ''}} onclick="goToPage(${{currentPage + 1}})">&rsaquo;</button>`;
      buttonsHtml += `<button class="page-btn" ${{currentPage === totalPages ? 'disabled' : ''}} onclick="goToPage(${{totalPages}})">&raquo;</button>`;

      container.innerHTML = buttonsHtml;
    }}

    function goToPage(p) {{
      currentPage = p;
      renderTable();
    }}

    function handlePageSizeChange(val) {{
      pageSize = val === 'ALL' ? 'ALL' : parseInt(val, 10);
      currentPage = 1;
      renderTable();
    }}

    // Init Page on Load
    window.addEventListener('DOMContentLoaded', () => {{
      initTheme();

      // Populate KPI counts
      document.getElementById('kpiTotalTags').textContent = RAW_DATA.metadata.total_tags.toLocaleString();
      const withFile = allRecords.filter(r => r.has_file).length;
      document.getElementById('kpiWithFile').textContent = `${{withFile.toLocaleString()}} tags have portal.properties`;

      const shaCount = allRecords.filter(r => r.algorithm === 'SHA').length;
      document.getElementById('kpiShaTags').textContent = `${{shaCount}} tags`;

      initDropdowns();
      handleFilterChange();
    }});
  </script>
</body>
</html>
"""
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return os.path.abspath(output_path)


# ==============================================================================
# CLI Entry Point
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Inspect passwords.encryption.algorithm across git tags and generate an interactive upgrade advisor HTML."
    )
    parser.add_argument(
        "--output", "-o",
        default="passwords_encryption_algorithm.html",
        help="Path for generated HTML file (default: passwords_encryption_algorithm.html)"
    )
    parser.add_argument(
        "--repo-path", "-r",
        default=".",
        help="Path to git repository (default: current directory)"
    )
    args = parser.parse_args()

    print("================================================================================")
    print(" Liferay Portal - Password Encryption Algorithm Inspector Across Git Tags")
    print("================================================================================")
    print(f"Repository path: {os.path.abspath(args.repo_path)}")
    print(f"Output HTML file: {args.output}\n")

    print("[Part 1] Extracting passwords.encryption.algorithm across git tags...")
    extractor = TagPropertyExtractor(repo_path=args.repo_path)
    data = extractor.analyze()

    print(f"\nExtracted {data['metadata']['total_tags']} tags in {data['metadata']['elapsed_seconds']}s.")
    print("\nAlgorithm Distribution:")
    for algo, count in sorted(data["algo_counts"].items(), key=lambda x: x[1], reverse=True):
        print(f"  - {algo}: {count} tags")

    print("\nRelease Category Distribution:")
    for cat, count in sorted(data["category_counts"].items(), key=lambda x: x[1], reverse=True):
        print(f"  - {cat}: {count} tags")

    print(f"\n[Part 2] Generating interactive HTML tool -> {args.output}...")
    abs_output = HtmlReportGenerator.generate(data, args.output)
    print(f"Successfully generated HTML tool at: {abs_output}")
    print("Open this file in any web browser to view tag values and use the upgrade advisor.\n")


if __name__ == "__main__":
    main()
