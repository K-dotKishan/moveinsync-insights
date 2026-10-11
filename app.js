/* MoveInSync Insights – plain JavaScript, no framework.
   Flow: load JSON -> keep a `state` of filters -> getFiltered() -> render everything. */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let DATA, charts = {};
const state = {q:'', stars:'all', cat:'all', from:'', to:'', page:1};
const PAGE_SIZE = 10;

const loadData = () => {
  const candidates = ['reviews.json', 'data/reviews.json'];
  return Promise.any(candidates.map(path => fetch(path).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }))).catch(() => {
    $('#err').hidden = false;
    return null;
  });
};

loadData().then(d => {
  if (!d) return;
  DATA = d;
  init();
});

function init() {
  $('#fCat').innerHTML += DATA.categories.map(c => `<option>${esc(c.name)}</option>`).join('');
  // Any filter control: update state, go back to page 1, re-render.
  [['#fQ','q'],['#fStars','stars'],['#fCat','cat'],['#fFrom','from'],['#fTo','to']].forEach(([sel,key]) =>
    $(sel).addEventListener('input', e => { state[key] = e.target.value; state.page = 1; render(); }));
  $('#resetBtn').onclick = resetFilters;
  $('#csvBtn').onclick = exportCSV;
  $('#prev').onclick = () => { state.page--; renderTable(getFiltered()); };
  $('#next').onclick = () => { state.page++; renderTable(getFiltered()); };
  $('#dlgClose').onclick = () => $('#dlg').close();
  $('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
  document.querySelectorAll('nav button').forEach(b => b.onclick = () => showPage(b.dataset.page));
  $('#themeBtn').onclick = toggleTheme;
  const saved = localStorage.getItem('theme'); if (saved) document.documentElement.dataset.theme = saved;
  renderRecs(); renderMonitoring(); renderAbout();
  showPage(location.hash.slice(1) || 'dashboard');
  render();
}

function showPage(p) {
  if (!document.getElementById('page-' + p)) p = 'dashboard';
  document.querySelectorAll('.page').forEach(s => s.hidden = s.id !== 'page-' + p);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
  $('#filters').hidden = !['dashboard','explorer'].includes(p);
  $('#sidebar').classList.remove('open'); location.hash = p;
  if (p === 'dashboard') render(); // charts need a visible canvas to size correctly
}

function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); render();
}

function resetFilters() {
  Object.assign(state, {q:'', stars:'all', cat:'all', from:'', to:'', page:1});
  ['#fQ','#fFrom','#fTo'].forEach(s => $(s).value = ''); $('#fStars').value = 'all'; $('#fCat').value = 'all';
  render();
}

// Core: apply every active filter to the full dataset.
function getFiltered() {
  const q = state.q.trim().toLowerCase();
  return DATA.reviews.filter(r =>
    (!q || r.text.toLowerCase().includes(q)) &&
    (state.stars === 'all' || r.stars === +state.stars) &&
    (state.cat === 'all' || r.primaryCategory === state.cat) &&
    (!state.from || r.date >= state.from) && (!state.to || r.date <= state.to));
}
const count = (arr, fn) => arr.reduce((m, r) => { const k = fn(r); m[k] = (m[k]||0) + 1; return m; }, {});

function render() {
  const rs = getFiltered();
  renderKPIs(rs); renderCharts(rs); renderTable(rs);
}

function renderKPIs(rs) {
  const n = rs.length, total = DATA.reviews.length, m = DATA.meta;
  const isFiltered = n < total;
  const avg = n ? (rs.reduce((s,r) => s + r.stars, 0) / n).toFixed(2) : 'No data';
  const neg = rs.filter(r => r.stars <= 2).length;
  const cats = Object.entries(count(rs, r => r.primaryCategory)).sort((a,b) => b[1]-a[1]);
  const top = cats.length ? `${cats[0][0]} (${cats[0][1]})` : 'No data';
  const kpi = (l, v, s) => `<div class="kpi"><span>${esc(l)}</span><b>${esc(String(v))}</b><small class="muted">${s}</small></div>`;
  // First KPI always shows full-dataset total so it never changes with filters.
  // Second KPI shows filtered count only when a filter is active, otherwise just confirms the total.
  $('#kpis').innerHTML =
    kpi('Dataset total', total, `All ${total} reviews in reviews.json`) +
    kpi('Filtered reviews', n, isFiltered ? `${n} of ${total} match current filters` : 'No filters active — showing all') +
    kpi('Sample avg rating', avg, isFiltered ? `Filtered view · Play Store listing: ${m.playStoreOverallRating}★` : `1★-only sample · Play Store listing: ${m.playStoreOverallRating}★`) +
    kpi('Top issue (filtered)', top, 'By primary category in current view');
  $('#sampleNote').innerHTML = `<strong>Collected ${esc(m.collectedOn)}.</strong> ${esc(m.source)}. ` +
    `This sample is <strong>1-star reviews only</strong>, so its statistics describe <em>complaints</em>, not all users. ` +
    `It is not comparable with the overall ${m.playStoreOverallRating}★ Play Store rating. ` +
    `Categories and severity were assigned manually with AI assistance and have not been independently verified.`;
}

function makeChart(id, cfg) {
  if (charts[id]) charts[id].destroy();
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
  charts[id] = new Chart($('#' + id), cfg);
}

// Format "2026-05" → "May 2026"
function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString(undefined, {month:'short', year:'numeric'});
}

function renderCharts(rs) {
  const baseOpts = {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}};

  // Star-rating chart — reflects current filtered set (or full set when no filter active).
  const byStar = count(rs, r => r.stars);
  makeChart('cStars', {
    type:'bar',
    data:{labels:['1★','2★','3★','4★','5★'], datasets:[{data:[1,2,3,4,5].map(s => byStar[s]||0), backgroundColor:'#0b6e4f'}]},
    options:{...baseOpts, scales:{y:{beginAtZero:true, ticks:{precision:0}}}}
  });

  // Category breakdown — horizontal bars, with left padding to avoid label clipping.
  const byCat = count(rs, r => r.primaryCategory);
  const catLabels = DATA.categories.map(c => c.name).filter(n => byCat[n]).sort((a,b) => byCat[b]-byCat[a]);
  makeChart('cCats', {
    type:'bar',
    data:{labels:catLabels, datasets:[{data:catLabels.map(l => byCat[l]), backgroundColor:'#2563eb'}]},
    options:{
      ...baseOpts,
      indexAxis:'y',
      layout:{padding:{left:0}},
      scales:{
        x:{beginAtZero:true, ticks:{precision:0}},
        y:{ticks:{font:{size:12}, autoSkip:false}}
      }
    }
  });

  // Monthly trend — format axis labels as "Mon YYYY".
  const months = count(rs, r => r.date.slice(0,7)), keys = Object.keys(months).sort();
  if (keys.length >= 3) {
    const avgs = keys.map(k => {
      const g = rs.filter(r => r.date.startsWith(k));
      return +(g.reduce((s,r) => s + r.stars, 0) / g.length).toFixed(2);
    });
    makeChart('cTrend', {
      type:'bar',
      data:{
        labels:keys.map(fmtMonth),
        datasets:[
          {label:'Reviews', data:keys.map(k => months[k]), backgroundColor:'#0b6e4f'},
          {label:'Avg rating', type:'line', data:avgs, yAxisID:'y1', borderColor:'#d97706', tension:0.3}
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        scales:{
          y:{beginAtZero:true, ticks:{precision:0}},
          y1:{position:'right', min:1, max:5, grid:{drawOnChartArea:false}}
        },
        plugins:{legend:{display:true, position:'top'}}
      }
    });
    $('#trendNote').textContent = 'Months with few reviews are noisy; the selected sample is not time-balanced.';
  } else {
    if (charts.cTrend) { charts.cTrend.destroy(); delete charts.cTrend; }
    $('#trendNote').textContent = 'Insufficient data: needs reviews from at least 3 different months.';
  }

  // Sentiment doughnut.
  const pos = rs.filter(r => r.stars >= 4).length;
  const neu = rs.filter(r => r.stars === 3).length;
  const neg = rs.filter(r => r.stars <= 2).length;
  makeChart('cSent', {
    type:'doughnut',
    data:{
      labels:['Positive (4–5★)','Neutral (3★)','Negative (1–2★)'],
      datasets:[{data:[pos,neu,neg], backgroundColor:['#16a34a','#eab308','#dc2626']}]
    },
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}}
  });
}

function renderTable(rs) {
  const sorted = [...rs].sort((a,b) => b.date.localeCompare(a.date));
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pages);
  const slice = sorted.slice((state.page-1)*PAGE_SIZE, state.page*PAGE_SIZE);
  const action = name => (DATA.categories.find(c => c.name === name) || {}).action || '';
  $('#rows').innerHTML = slice.length ? slice.map(r => `<tr class="clickable" tabindex="0" data-id="${r.id}">
    <td>${r.date}</td><td><span class="badge s${r.stars}">${r.stars}★</span></td>
    <td>${esc(r.text.length > 140 ? r.text.slice(0,140) + '…' : r.text)}${r.complete ? '' : ' <span class="badge">incomplete</span>'}</td>
    <td><span class="badge">${esc(r.primaryCategory)}</span></td><td>${r.severity}</td><td>${esc(action(r.primaryCategory))}</td></tr>`).join('')
    : '<tr><td colspan="6">No reviews match the filters.</td></tr>';
  $('#pageInfo').textContent = `Page ${state.page} of ${pages} (${sorted.length} reviews)`;
  $('#prev').disabled = state.page <= 1; $('#next').disabled = state.page >= pages;
  document.querySelectorAll('#rows tr[data-id]').forEach(tr => {
    const open = () => openDetails(tr.dataset.id);
    tr.onclick = open; tr.onkeydown = e => { if (e.key === 'Enter') open(); };
  });
}

function openDetails(id) {
  const r = DATA.reviews.find(x => x.id === id);
  $('#dlgBody').innerHTML = `<h2>${r.id} · ${r.date} · <span class="badge s${r.stars}">${r.stars}★</span></h2>
    <p>${esc(r.text)}</p><p><strong>Primary:</strong> ${esc(r.primaryCategory)}<br>
    <strong>Secondary:</strong> ${r.secondaryTags.map(esc).join(', ') || 'none'}<br>
    <strong>Severity:</strong> ${r.severity}<br><strong>Source:</strong> ${esc(r.source)}<br>
    <strong>Text complete:</strong> ${r.complete ? 'yes' : 'no (cut off or partly hidden in screenshot)'}<br>
    <strong>Category manually verified:</strong> ${r.verified ? 'yes' : 'not yet'}</p>`;
  $('#dlg').showModal();
}

function exportCSV() {
  const rs = getFiltered(), q = v => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['id','date','stars','text','primaryCategory','secondaryTags','severity','complete','verified'];
  const lines = [head.join(',')].concat(rs.map(r => [r.id,r.date,r.stars,r.text,r.primaryCategory,r.secondaryTags.join('; '),r.severity,r.complete,r.verified].map(q).join(',')));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/csv'}));
  a.download = 'moveinsync-reviews-filtered.csv'; a.click();
}

/* ---------- Action Plan ---------- */
const RECS = [
 {t:'Booking correctness and no-show disputes', cats:['Booking & No-Show Errors'], p:'P0', e:'High', o:'Backend',
  problem:'Users report bookings for dates they did not choose, no-show marks despite a booking, and cancellations the app showed as done.',
  sol:'Audit booking, vehicle-assignment and no-show records for mismatches. Show date, shift, pickup point and confirmed status clearly. Give every booking an auditable confirmation.',
  impact:'Avoids unfair salary deductions and lost trust.', metric:'Incorrect no-show dispute rate; booking success rate.',
  val:'Compare dispute counts and "no-show" review mentions before and after release; sample bookings against logs.'},
 {t:'Authentication and session reliability', cats:['Authentication & Session Management'], p:'P0', e:'Medium', o:'Mobile Engineering',
  problem:'Frequent logouts, OTPs that do not arrive, session-expired errors and failed sign-in block access to the app.',
  sol:'Investigate session expiry, token refresh, OTP delivery and enterprise SSO behavior. Improve error messages and recovery. Keep sessions secure per company policy; do not simply disable controls.',
  impact:'Restores access, including for urgent safety use.', metric:'Unexpected logout rate; OTP delivery and verification success rate.',
  val:'Track both metrics per app version; check whether login-related review share drops after the fix.'},
 {t:'GPS and ETA reliability', cats:['GPS, Tracking & ETA'], p:'P1', e:'High', o:'Backend',
  problem:'Reports of slow or stale GPS, wrong vehicle positions and inaccurate pickup/drop times.',
  sol:'Detect stale location updates, show when location was last refreshed, improve ETA accuracy and show uncertainty.',
  impact:'Fewer missed pickups and less waiting.', metric:'GPS update freshness; ETA error.',
  val:'Log update intervals and ETA vs actual arrival; compare before and after.'},
 {t:'App performance', cats:['App Performance & Usability'], p:'P1', e:'Medium', o:'Mobile Engineering',
  problem:'Slow loading, hangs or crashes in booking, and repeated agreement prompts.',
  sol:'Measure startup time, API latency, crash rate and booking-flow performance; fix the worst bottlenecks; show agreements only when they change.',
  impact:'Faster, less frustrating booking.', metric:'Crash-free session rate; startup and booking-flow time.',
  val:'Use crash analytics per release and compare against review mentions of slowness.'},
 {t:'Notifications and support', cats:['Notifications & Check-In','Customer Support'], p:'P1', e:'Medium', o:'Customer Support',
  problem:'Missed check-ins, delayed alerts, and helpdesk lines that are unreachable or unanswered.',
  sol:'Add pickup-point alerts and check-in reminders. Give each support request a ticket reference, status and escalation path for urgent ride issues.',
  impact:'Fewer surprise no-shows; users know their issue is being handled.', metric:'Support first-response and resolution time.',
  val:'Track ticket times and check-in-related no-show disputes before and after.'}
];
function renderRecs() {
  const total = DATA.reviews.length;
  $('#recs').innerHTML = RECS.map((r, i) => {
    const prim = DATA.reviews.filter(x => r.cats.includes(x.primaryCategory)).length;
    const any = DATA.reviews.filter(x => r.cats.includes(x.primaryCategory) || x.secondaryTags.some(t => r.cats.includes(t))).length;
    return `<details ${i === 0 ? 'open' : ''}><summary>${r.p} (provisional) · ${esc(r.t)} <span class="badge">Effort: ${r.e}</span> <span class="badge">${r.o}</span></summary><dl>
    <dt>Problem</dt><dd>${r.problem}</dd>
    <dt>Evidence (live)</dt><dd>${prim} of ${total} sample reviews have this as primary category; ${any} mention it as primary or secondary. Counts are from a 1-star-only sample.</dd>
    <dt>Proposed solution</dt><dd>${r.sol}</dd><dt>User impact</dt><dd>${r.impact}</dd>
    <dt>Success metric</dt><dd>${r.metric}</dd><dt>Validation</dt><dd>${r.val}</dd></dl></details>`;
  }).join('');
}

/* ---------- Monitoring + About (static text) ---------- */
function renderMonitoring() {
  const M = [
   ['Play Store average rating','Overall star rating on the listing','The headline outcome; lags behind fixes'],
   ['Share of 1–2★ reviews','Fraction of new reviews that are negative','Shows whether complaints shrink'],
   ['Booking success rate','Bookings completed without error','Core job of the app'],
   ['Incorrect no-show dispute rate','No-show marks later reversed','Reveals booking/no-show data errors'],
   ['Unexpected logout rate','Sessions ended without user action','Direct signal for the login complaints'],
   ['OTP delivery & verification success','OTPs received and verified','Users cannot enter the app without it'],
   ['GPS update freshness','Age of last vehicle location','Stale data causes wrong tracking'],
   ['ETA error','Predicted vs actual arrival gap','Drives trust in pickup timing'],
   ['Crash-free session rate','Sessions without a crash','Stability measure'],
   ['Support first-response / resolution time','Time to first reply and to closure','Shows whether users get help']];
  $('#metrics').innerHTML = M.map(m => `<tr>${m.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  $('#workflow').innerHTML = ['Collect new reviews periodically.','Categorize and validate the feedback.','Identify emerging issues.','Assign issues to the appropriate owner.','Implement fixes.','Compare metrics and review themes before and after the fix.'].map(s => `<li>${s}</li>`).join('');
}
function renderAbout() {
  $('#aboutBody').innerHTML = `
  <h2>Method and limits</h2><ul>
  <li>Reviews were collected manually from the public Google Play listing, as screenshots.</li>
  <li>The sample was selected, filtered to 1-star reviews, so it has strong selection bias. It cannot show how common each problem is among all users.</li>
  <li>The overall Play Store rating (${DATA.meta.playStoreOverallRating}★) and this sample's average are different measures.</li>
  <li>Reviews may describe app defects <em>or</em> transport-operations problems (drivers, vendors); categories mix both.</li>
  <li>Categories and severity were assigned by me with AI help and must be manually validated (all records start as <code>verified: false</code>).</li>
  <li>Public reviews alone cannot establish technical root causes.</li>
  <li>Incomplete screenshots are marked "incomplete"; reviewer names are not stored.</li></ul>
  <h2>Tools</h2><ul><li>Google Play Store (public reviews)</li><li>Manual inspection and categorization</li><li>HTML, CSS and JavaScript</li><li>Chart.js</li><li>AI assistance for organizing themes and drafting recommendations, with human verification</li></ul>`;
}
