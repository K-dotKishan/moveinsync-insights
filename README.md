# MoveInSync Insights

Review analytics dashboard for the MoveInSync FDE case study. Plain HTML/CSS/JS + Chart.js (CDN).

## Run
`fetch()` cannot read local JSON from `file://`, so serve the folder:
- VS Code: install **Live Server**, right-click `index.html` → *Open with Live Server*; or
- `python -m http.server 8000` then open http://localhost:8000

## Structure
- `index.html` – layout and five pages (Dashboard, Review Explorer, Action Plan, Monitoring, About)
- `css/styles.css` – theme variables (light/dark), responsive layout
- `js/app.js` – all logic (kept in one file for easy explanation)
- `data/reviews.json` – `meta`, `categories` (name + suggested action), `reviews`
- `build_data.py` – optional helper that regenerates the JSON

## Add reviews
Append an object to `reviews` in `data/reviews.json`:
`{"id":"R056","date":"YYYY-MM-DD","stars":1,"text":"...","primaryCategory":"<exact category name>","secondaryTags":[],"severity":"Low|Medium|High","source":"Google Play screenshot","verified":false,"complete":true}`
Add new categories in the `categories` array; the filters and charts pick them up automatically.
Use `"complete": false` when text is cut off. Never paraphrase silently.

## Features
Search, star/date/category filters, live KPIs, 4 charts (trend shows only with ≥3 months of data), paginated table with detail dialog, CSV export of filtered rows, reset, dark mode (saved in localStorage), live-calculated evidence counts on the Action Plan.

## Deploy to GitHub Pages
1. Create a repo and push this folder (index.html at the root).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root → Save.
3. Open `https://<user>.github.io/<repo>/` after about a minute.

## Main functions (js/app.js)
- `init()` loads setup, listeners, static pages. `showPage()` switches pages.
- `getFiltered()` applies every filter; `render()` calls `renderKPIs`, `renderCharts`, `renderTable` with its result.
- `count()` groups items for charts. `makeChart()` redraws a chart safely.
- `openDetails()` full review dialog. `exportCSV()` downloads filtered rows.
- `renderRecs()` builds the Action Plan and computes evidence from data.

## Interview guide
- **Design:** one filtered list drives every widget, so numbers always agree. No hardcoded results.
- **Data:** 55 unique 1-star reviews from screenshots (3 duplicates removed). Categories are my judgment, unverified.
- **Findings (computed live):** authentication/OTP/logout dominates the sample; booking/no-show errors are fewer but higher severity (salary deductions); support gaps compound other issues.
- **Limits:** 1-star-only sample, so avg is 1.00 and says nothing about the 4.6★ overall; no positive reviews captured; can't separate app bugs from operations; root causes unverified.
- **Recommendations:** hypotheses, priority provisional, validated with internal metrics (see Monitoring page).
