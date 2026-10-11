# MoveInSync Insights

> A review analytics dashboard built for the MoveInSync FDE case study.  
> Plain **HTML / CSS / JS** · **Chart.js** (CDN) · zero build step.

---

## 🚀 Quick Start

`fetch()` cannot read local files from `file://`, so you need a local server:

| Method | Command | URL |
|---|---|---|
| VS Code Live Server | Right-click `index.html` → *Open with Live Server* | auto-opens |
| Python | `python -m http.server 8000` | http://localhost:8000 |

---

## 📁 Project Structure

```
├── index.html        # Layout and five pages
├── styles.css        # Theme variables (light/dark), responsive layout
├── app.js            # All logic in one file — easy to walk through
├── reviews_expanded.json # Primary dataset: meta, categories, reviews (expanded)
├── reviews.json      # Original 55-review screenshot dataset (fallback)
├── build_data.py     # Optional helper to regenerate the JSON
└── README.md
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Dashboard** | 4 KPIs · star chart · category breakdown · monthly trend · sentiment doughnut |
| **Review Expanded** | Paginated table · click any row for full detail dialog |
| **Filters** | Search text · star rating · category · date range · reset |
| **CSV Export** | Downloads the current filtered view |
| **Action Plan** | 5 provisional recommendations with live evidence counts |
| **Monitoring** | 10 metrics table + suggested workflow |
| **Dark mode** | Toggled in the sidebar, persisted via `localStorage` |

> The trend chart only renders when the filtered data spans **≥ 3 months**.

---

## ➕ Adding Reviews

Append an object to the `reviews` array in `reviews_expanded.json`:

```json
{
  "id": "R056",
  "date": "YYYY-MM-DD",
  "stars": 1,
  "text": "...",
  "primaryCategory": "<exact category name>",
  "secondaryTags": [],
  "severity": "Low|Medium|High",
  "source": "Google Play screenshot",
  "verified": false,
  "complete": true
}
```

- Add new categories to the `categories` array — filters and charts pick them up automatically.
- Use `"complete": false` when text is cut off in a screenshot. Never silently paraphrase.

---

## 🌐 Deploy to GitHub Pages

1. Create a repo and push this folder (`index.html` at the root).
2. **Settings → Pages → Source:** *Deploy from a branch* → `main` / `(root)` → Save.
3. Your dashboard will be live at `https://<your-username>.github.io/<repo-name>/` within about a minute.

---

## 🧩 Code Map (`app.js`)

| Function | What it does |
|---|---|
| `init()` | Wires up listeners, renders static pages, calls `render()` |
| `showPage(p)` | Switches the visible page and updates nav state |
| `getFiltered()` | Applies every active filter to the full dataset |
| `render()` | Calls `renderKPIs`, `renderCharts`, `renderTable` with filtered results |
| `count(arr, fn)` | Groups items for chart data |
| `makeChart(id, cfg)` | Safely destroys and redraws a Chart.js instance |
| `openDetails(id)` | Shows the full review in a `<dialog>` |
| `exportCSV()` | Downloads filtered rows as a `.csv` |
| `renderRecs()` | Builds the Action Plan with live evidence counts from data |

---

## 🎤 Interview Notes

**Architecture**  
One `getFiltered()` call drives every widget — KPIs, charts, and the table always agree. No hardcoded numbers anywhere.

**Dataset**  
55 unique 1-star reviews collected manually from Google Play screenshots. Categories are a judgment call, assisted by AI, and marked `"verified": false` until independently confirmed.

**Key findings** *(computed live from the data)*

- **Authentication / OTP / logout** dominates the sample — largest single cluster.
- **Booking & no-show errors** are fewer but carry higher severity (financial penalty: salary deductions).
- **Support gaps** compound other issues — users can't escalate when things go wrong.

**Limits**

- 1-star-only sample → average rating of 1.00 says nothing about the 4.6★ overall Play Store rating.
- No positive reviews captured; distribution is intentionally skewed toward complaints.
- Cannot separate app-side bugs from transport-operations failures (driver behaviour, vendor management).
- Root causes are unverified hypotheses — internal metrics are needed to confirm them.

**Recommendations**  
All priorities are provisional. See the **Monitoring** page for the metrics that would validate each fix.

---

## ⚠️ Methodology Disclaimer

This dataset is a **manually collected, 1-star-only sample** from public Google Play screenshots. It has strong selection bias and cannot represent the experience of all MoveInSync users. Statistics in this dashboard describe complaints, not overall satisfaction. The 4.6★ Play Store rating and this sample's figures are not comparable.
