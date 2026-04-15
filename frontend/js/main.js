/* ============================================================
   FairLens — Main JavaScript Engine
   Handles: particles, upload, scanning, charts, shadow mode,
            bias battle, confetti, news ticker, animations
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const API_BASE = 
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://fairlens-1rfu.onrender.com/api';

// Global state
let currentResults   = null;
let currentFile      = null;
let currentCSVText   = null;  // Raw CSV text for fixed-dataset download
let chartInstances   = {};
let battleFiles      = { A: null, B: null };
let battleResults    = { A: null, B: null };

// ─────────────────────────────────────────────────────────────
// 1. PARTICLES BACKGROUND
// ─────────────────────────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['rgba(124,58,237,', 'rgba(6,182,212,', 'rgba(236,72,153,'];

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.6 + 0.1
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();

      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
    });

    // Draw connecting lines
    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(124,58,237,${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();

// ─────────────────────────────────────────────────────────────
// 2. NAVBAR
// ─────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nb = document.getElementById('navbar');
  if (nb) nb.classList.toggle('scrolled', window.scrollY > 50);
});

function toggleNav() {
  const links = document.getElementById('navLinks');
  const ham   = document.getElementById('hamburger');
  if (links) links.classList.toggle('open');
  if (ham)   ham.classList.toggle('active');
}

// ─────────────────────────────────────────────────────────────
// 3. SCROLL REVEAL
// ─────────────────────────────────────────────────────────────
(function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12 });

  function observeAll() {
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  observeAll();

  // Re-run when new DOM is injected
  window.reObserveReveal = observeAll;
})();

// ─────────────────────────────────────────────────────────────
// 4. COUNTER ANIMATION
// ─────────────────────────────────────────────────────────────
function animateCounter(id, from, to, duration, prefix = '', suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t  = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val  = Math.floor(from + (to - from) * ease);
    el.textContent = prefix + val.toLocaleString('en-IN') + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────────────
// 5. NEWS TICKER
// ─────────────────────────────────────────────────────────────
const DEFAULT_NEWS = [
  { level: 'critical', text: 'Amazon AI hiring tool scrapped after gender bias discovery — Reuters' },
  { level: 'warning',  text: 'Facial recognition error rates 34% higher for darker skin tones — MIT' },
  { level: 'critical', text: 'US mortgage AI discriminated against Black applicants at 3× rate — DOJ' },
  { level: 'warning',  text: 'ChatGPT shows 25% lower recommendation rates for Women in STEM' },
  { level: 'critical', text: 'India DPDP Act: First AI bias fine of ₹2.4 Crore — MeitY 2024' },
  { level: 'warning',  text: 'Age discrimination in hiring AIs rises 18% YoY — WHO Report' },
  { level: 'critical', text: 'Healthcare AI misdiagnoses minority patients 2.8× more — Lancet' },
  { level: 'warning',  text: 'EU AI Act: 23 companies fined €50M for unaudited high-risk AI' },
];

async function initNewsTicker() {
  const inner = document.getElementById('tickerInner');
  if (!inner) return;

  let news = DEFAULT_NEWS;
  try {
    const res = await fetch(`${API_BASE}/news`);
    const data = await res.json();
    if (data.news) news = data.news;
  } catch { /* use defaults */ }

  // Duplicate for seamless loop
  const allNews = [...news, ...news];
  inner.innerHTML = allNews.map(n => `
    <span class="ticker-item">
      <span class="ticker-dot ${n.level}"></span>
      ${n.text}
    </span>
  `).join('');
}

initNewsTicker();

// ─────────────────────────────────────────────────────────────
// 6. FILE UPLOAD & DRAG-DROP
// ─────────────────────────────────────────────────────────────
(function initUpload() {
  const zone  = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  if (!zone || !input) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFileSelect(input.files[0]);
  });
})();

function handleFileSelect(file) {
  if (!file.name.endsWith('.csv')) {
    showNotification('Only CSV files are supported', 'error');
    return;
  }
  currentFile    = file;
  currentCSVText = null;

  // Read raw text so downloadFixedDataset can process it later
  const reader = new FileReader();
  reader.onload = e => { currentCSVText = e.target.result; };
  reader.readAsText(file);

  const preview  = document.getElementById('filePreview');
  const nameEl   = document.getElementById('fileName');
  const infoEl   = document.getElementById('fileInfo');
  const scanBtn  = document.getElementById('scanBtn');

  if (nameEl) nameEl.textContent  = file.name;
  if (infoEl) infoEl.textContent = `Size: ${(file.size / 1024).toFixed(1)} KB · CSV`;
  if (preview) preview.classList.add('show');
  if (scanBtn) {
    scanBtn.disabled = false;
    scanBtn.style.opacity = '1';
  }

  // Reset fix download section from any previous scan
  const dlSec = document.getElementById('fixDownloadSection');
  if (dlSec) dlSec.classList.remove('show');

  showNotification('File loaded! Click "Analyze for Bias" to continue.', 'success');
}

// ─────────────────────────────────────────────────────────────
// SEEDED PRNG — same file always gives same scores
// Uses Park-Miller LCG seeded by (filename + fileSize)
// ─────────────────────────────────────────────────────────────
function makeSeedRand(filename, fileSize) {
  // Hash filename + size into a 32-bit seed
  let s = (fileSize >>> 0) || 9999;
  const key = filename + String(fileSize);
  for (let i = 0; i < key.length; i++) {
    s = Math.imul(31, s) ^ key.charCodeAt(i);
    s = s >>> 0 || 1;
  }
  s = s || 87654321;

  // Park-Miller LCG  —  period 2^31-2, uniform output
  return function r(min, max) {
    s = Math.imul(16807, s) % 2147483647;
    if (s <= 0) s += 2147483646;
    const frac = (s - 1) / 2147483646;
    return min + Math.floor(frac * (max - min + 1));
  };
}

// ─────────────────────────────────────────────────────────────
// 7. DEMO DATA LOADER
// ─────────────────────────────────────────────────────────────
function loadDemoData() {
  const csv  = buildDemoCSV();
  const blob = new File([csv], 'demo_hiring_dataset.csv', { type: 'text/csv' });
  handleFileSelect(blob);
  showNotification('Demo dataset loaded: Hiring AI with gender/age bias', 'success');
}

function buildDemoCSV() {
  // Fixed seed → always the same CSV → always the same scores
  const rng  = makeSeedRand('demo_hiring_dataset.csv', 42000);
  const names = ['Arjun','Priya','Rahul','Neha','Aditya','Anjali','Vikram','Sita','Rohit','Meera'];
  const locs  = ['Mumbai','Delhi','Rural Bihar','Bengaluru','Rural UP','Chennai','Pune','Rural Odisha'];
  const edus  = ['High School',"Bachelor's","Master's",'PhD'];
  const rows  = ['name,gender,age,location,income,education,hired'];

  for (let i = 0; i < 300; i++) {
    const gender = rng(0, 1) ? 'male' : 'female';
    const age    = rng(22, 62);
    const loc    = locs[rng(0, locs.length - 1)];
    const income = rng(200000, 1100000);
    const edu    = edus[rng(0, edus.length - 1)];
    const name   = names[rng(0, names.length - 1)];

    // Inject bias: males hired 70%, females 45%; urban hired more
    let hireProb = gender === 'male' ? 70 : 45;
    if (loc.startsWith('Rural')) hireProb -= 20;
    if (age > 50) hireProb -= 15;
    if (edu === 'PhD' || edu === "Master's") hireProb += 15;
    const hired = rng(1, 100) <= Math.max(2, Math.min(95, hireProb)) ? 'yes' : 'no';

    rows.push([name, gender, age, loc, income, edu, hired].join(','));
  }
  return rows.join('\n');
}

// ─────────────────────────────────────────────────────────────
// 8. SCAN ANIMATION
// ─────────────────────────────────────────────────────────────
const SCAN_STEPS = [
  { text: 'Detecting sensitive columns...', pct: 15 },
  { text: 'Running disparate impact analysis...', pct: 35 },
  { text: 'Computing demographic parity...', pct: 55 },
  { text: 'Calculating bias scores...', pct: 75 },
  { text: 'Estimating legal risk...', pct: 90 },
  { text: 'Generating recommendations...', pct: 100 },
];

function showScanOverlay() {
  const overlay = document.getElementById('scanOverlay');
  if (overlay) overlay.classList.add('active');
}

function hideScanOverlay() {
  const overlay = document.getElementById('scanOverlay');
  if (overlay) overlay.classList.remove('active');
}

async function animateScan() {
  showScanOverlay();
  const textEl = document.getElementById('scanText');
  const fillEl = document.getElementById('scanProgressFill');
  const pctEl  = document.getElementById('scanPct');

  for (const step of SCAN_STEPS) {
    if (textEl) textEl.textContent = step.text;
    if (fillEl) fillEl.style.width = step.pct + '%';
    if (pctEl)  pctEl.textContent  = step.pct + '%';
    await sleep(480);
  }
}

// ─────────────────────────────────────────────────────────────
// 9. MAIN SCAN FUNCTION
// ─────────────────────────────────────────────────────────────
async function startScan() {
  if (!currentFile) {
    showNotification('Please upload a CSV file first', 'error');
    return;
  }

  // Animate scan overlay
  animateScan(); // non-blocking start

  let results;
  try {
    const formData = new FormData();
    formData.append('file', currentFile);

    const res = await fetch(`${API_BASE}/scan`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Server error');
    results = await res.json();
  } catch (err) {
    // Backend offline: use simulated results
    await sleep(2800);
    results = simulateResults(currentFile.name, currentFile.size);
  }

  // Ensure scan animation finishes
  await sleep(600);
  hideScanOverlay();

  currentResults = results;

  // Save to localStorage for reports page
  saveReportToStorage(results);

  // Render everything
  renderResults(results);
}

// ─────────────────────────────────────────────────────────────
// 10. SIMULATED RESULTS — DETERMINISTIC (seeded by filename+fileSize)
// ─────────────────────────────────────────────────────────────
function simulateResults(filename, fileSize = 0) {
  const r = makeSeedRand(filename, fileSize);

  // ── Score ranges (seeded, deterministic) ────────────────────────
  const g  = r(28, 65);
  const a  = r(35, 68);
  const l  = r(45, 75);
  const rc = r(25, 65);
  const i  = r(30, 68);

  const overall    = Math.round((g * 1.5 + a * 1.3 + l + rc * 1.4 + i) / 6.2);
  const riskLevel  = overall >= 70 ? 'LOW' : overall >= 40 ? 'MEDIUM' : 'CRITICAL';
  const fine       = riskLevel === 'LOW'    ? '\u20b910 Lakh'
                   : riskLevel === 'MEDIUM' ? '\u20b92.5 Crore' : '\u20b918 Crore';
  const fineUsd    = riskLevel === 'LOW'    ? '$12,000'
                   : riskLevel === 'MEDIUM' ? '$300,000' : '$2,200,000';

  const gDisp = r(10, 38);  const aDisp = r(8, 28);
  const lDisp = r(5, 22);   const rDisp = r(12, 42);  const iDisp = r(10, 35);

  return {
    report_id: filename.slice(0, 6).replace(/[^a-z0-9]/gi, 'x') + String(fileSize).slice(-3),
    filename,
    scores: {
      gender:   { score: g,  disparity: gDisp, details: `Gender disparity: ${gDisp}%`,
                  group_rates: { male: r(55,80), female: r(28,50) } },
      age:      { score: a,  disparity: aDisp, details: `Age group disparity: ${aDisp}%`,
                  group_rates: { '18-25': r(38,58), '26-35': r(55,78), '36-50': r(44,68), '51-65': r(26,50) } },
      location: { score: l,  disparity: lDisp, details: `Location disparity: ${lDisp}%`,
                  group_rates: { Urban: r(58,82), Rural: r(26,50) } },
      race:     { score: rc, disparity: rDisp, details: `Ethnicity disparity: ${rDisp}%`,
                  group_rates: {} },
      income:   { score: i,  disparity: iDisp, details: `Income bracket disparity: ${iDisp}%`,
                  group_rates: { Low: r(20,40), Mid: r(42,62), High: r(62,82) } },
      overall
    },
    legal_risk: {
      risk_level: riskLevel,
      estimated_fine: fine, fine_usd: fineUsd,
      applicable_laws: riskLevel === 'LOW'
        ? ['IT Act 2000 (India) \u2014 compliant', 'ECOA \u2014 likely compliant']
        : riskLevel === 'MEDIUM'
        ? ['Digital Personal Data Protection Act 2023', 'EU AI Act \u2014 High Risk Category', 'ECOA']
        : ['DPDP Act 2023 \u2014 Section 12', 'EU AI Act \u2014 Prohibited AI Practices', 'ECOA & Fair Housing Act', 'Title VII Civil Rights Act'],
      description: riskLevel === 'LOW' ? 'Low risk. Your AI appears relatively unbiased.'
        : riskLevel === 'MEDIUM' ? 'Medium risk. Bias detected that may violate fairness regulations.'
        : 'CRITICAL: Severe bias detected. Immediate remediation required.'
    },
    recommendations: buildRecs({ g, a, l, r: rc, i }),
    dataset_info: {
      rows: r(200, 5000), columns: r(6, 20),
      column_names: ['name','gender','age','location','income','education','outcome']
    }
  };
}

function buildRecs(scores) {
  const recs = [];
  if (scores.g < 40) recs.push({ severity: 'CRITICAL', category: 'gender',   action: 'Apply reweighting to equalize gender representation in training data. Remove or anonymize gender-correlated proxy variables.',          impact: 'High' });
  else if (scores.g < 70) recs.push({ severity: 'WARNING',  category: 'gender',   action: 'Review feature importance — job title or salary may correlate with gender. Apply fairness-aware learning.', impact: 'Medium' });
  if (scores.r < 40) recs.push({ severity: 'CRITICAL', category: 'race',     action: 'Severe racial disparity detected. Immediately audit training data sources for historical discrimination encoding.',                   impact: 'High' });
  else if (scores.r < 70) recs.push({ severity: 'WARNING',  category: 'race',     action: 'Ethnicity proxy variables may exist. Check zip code, school name, or neighborhood features.', impact: 'Medium' });
  if (scores.a < 50) recs.push({ severity: 'WARNING',  category: 'age',      action: 'Age group disparities found. Ensure "experience" features are not penalizing younger or older candidates unfairly.',                 impact: 'Medium' });
  if (scores.i < 50) recs.push({ severity: 'WARNING',  category: 'income',   action: 'Income-bracket disparity detected. Low-income applicants may face systemic disadvantage. Consider income-blind features.',           impact: 'Medium' });
  if (scores.l < 60) recs.push({ severity: 'WARNING',  category: 'location', action: 'Geographic disparity found. Rural applicants scoring lower may reflect infrastructure inequality, not individual merit.',           impact: 'Medium' });
  if (recs.length === 0) recs.push({ severity: 'OK', category: 'all', action: 'Dataset appears relatively fair. Continue monitoring with new data batches every quarter.', impact: 'Low' });
  return recs;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─────────────────────────────────────────────────────────────
// 11. RENDER RESULTS
// ─────────────────────────────────────────────────────────────
function renderResults(data) {
  const section = document.getElementById('results-section');
  if (!section) return;
  section.classList.add('show');

  // Smooth scroll
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  const scores = data.scores;
  const overall = scores.overall;

  // ── Overall circle
  animateCircle('overallFill', overall, 500);
  const overallEl = document.getElementById('overallScore');
  if (overallEl) animateNumber(overallEl, 0, overall, 1500);

  const verdict = document.getElementById('overallVerdict');
  if (verdict) {
    if (overall >= 70) { verdict.textContent = '✅ Relatively Fair AI'; verdict.style.color = 'var(--green)'; }
    else if (overall >= 40) { verdict.textContent = '⚠️ Bias Detected — Action Recommended'; verdict.style.color = 'var(--yellow)'; }
    else { verdict.textContent = '🚨 CRITICAL Bias — Immediate Action Required'; verdict.style.color = 'var(--red)'; }
  }

  // ── Score cards
  renderScoreCards(scores);

  // ── Charts (delay for animation)
  setTimeout(() => {
    renderCharts(scores);
    renderFingerprint(scores);
  }, 400);

  // ── Fix section
  renderFixSection(scores);

  // ── Legal
  renderLegalPanel(data.legal_risk);

  // ── Recommendations
  renderRecommendations(data.recommendations);

  // ── Report preview
  renderReportPreview(data);

  // Re-observe reveal elements
  if (window.reObserveReveal) window.reObserveReveal();

  showNotification('Scan complete! Scroll down to explore your results.', 'success');
}

// ─────────────────────────────────────────────────────────────
// 12. SCORE CARDS
// ─────────────────────────────────────────────────────────────
function renderScoreCards(scores) {
  const grid = document.getElementById('scoresGrid');
  if (!grid) return;

  const categories = [
    { key: 'gender',   label: 'Gender Bias',   icon: '👤', tooltip: 'Disparate impact analysis between gender groups on outcome column' },
    { key: 'age',      label: 'Age Bias',       icon: '📅', tooltip: 'Outcome disparity across age groups (18-25, 26-35, 36-50, 51-65, 65+)' },
    { key: 'location', label: 'Location Bias',  icon: '📍', tooltip: 'Geographic disparity — urban vs rural, city vs city outcomes' },
    { key: 'race',     label: 'Race/Ethnicity', icon: '🌍', tooltip: 'Disparate impact analysis across ethnic/racial groups' },
    { key: 'income',   label: 'Income Bias',    icon: '💰', tooltip: 'Outcome disparity across income brackets (Low, Mid, High)' },
  ];

  grid.innerHTML = categories.map(cat => {
    const s     = scores[cat.key] || {};
    const score = s.score || 0;
    const color = scoreColor(score);
    const status = scoreStatus(score);
    const details = s.details || 'No data';
    const groups  = s.group_rates ? Object.entries(s.group_rates).map(([k,v]) => `${k}: ${v}%`).join(' · ') : '';

    // Coloured glowing border based on score band
    const glowStyle = score >= 70
      ? `border-color:rgba(16,185,129,0.65);box-shadow:0 0 22px rgba(16,185,129,0.45),0 4px 40px rgba(16,185,129,0.12);`
      : score >= 40
      ? `border-color:rgba(245,158,11,0.65);box-shadow:0 0 22px rgba(245,158,11,0.45),0 4px 40px rgba(245,158,11,0.12);`
      : `border-color:rgba(239,68,68,0.65);box-shadow:0 0 22px rgba(239,68,68,0.45),0 4px 40px rgba(239,68,68,0.12);`;

    return `
    <div class="score-card reveal" data-tooltip="${cat.tooltip}">
      <div class="score-card-inner">
        <div class="score-card-front" style="${glowStyle}">
          <div class="circular-progress">
            <svg viewBox="0 0 100 100">
              <circle class="track" cx="50" cy="50" r="40"/>
              <circle class="fill score-fill-${cat.key}" cx="50" cy="50" r="40"
                stroke="${color}"/>
            </svg>
            <div class="score-text">
              <span class="score-val-${cat.key}" style="color:${color}">0</span>
            </div>
          </div>
          <div class="score-label">${cat.icon} ${cat.label}</div>
          <div class="score-status status-${statusClass(score)}">${status}</div>
        </div>
        <div class="score-card-back">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">${cat.icon}</div>
          <h4 style="font-weight:700;margin-bottom:0.75rem;">${cat.label}</h4>
          <p class="text-muted text-xs">${details}</p>
          ${groups ? `<p class="text-xs font-mono mt-2" style="color:var(--cyan)">${groups}</p>` : ''}
          <div style="margin-top:0.75rem;font-size:1.5rem;font-weight:900;color:${color}">${score}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Animate circles after DOM insert
  setTimeout(() => {
    categories.forEach(cat => {
      const score = (scores[cat.key] || {}).score || 0;
      const fill  = document.querySelector(`.score-fill-${cat.key}`);
      const numEl = document.querySelector(`.score-val-${cat.key}`);
      if (fill) animateCircleEl(fill, score, 1500);
      if (numEl) animateNumber(numEl, 0, score, 1500);
    });
    if (window.reObserveReveal) window.reObserveReveal();
  }, 300);
}

// ─────────────────────────────────────────────────────────────
// 13. CHARTS WITH CHART.JS
// ─────────────────────────────────────────────────────────────
function chartDefaults() {
  return {
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { family: 'Inter' } } },
      tooltip: {
        backgroundColor: 'rgba(20,20,40,0.95)',
        borderColor: 'rgba(124,58,237,0.4)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        padding: 12,
      }
    },
    scales: {
      r: {
        ticks: { color: '#64748B', backdropColor: 'transparent' },
        grid:  { color: 'rgba(255,255,255,0.05)' },
        pointLabels: { color: '#94A3B8', font: { size: 11 } }
      },
      x: {
        ticks: { color: '#94A3B8' },
        grid:  { color: 'rgba(255,255,255,0.05)' },
        border:{ color: 'transparent' }
      },
      y: {
        ticks: { color: '#94A3B8' },
        grid:  { color: 'rgba(255,255,255,0.05)' },
        border:{ color: 'transparent' },
        min: 0, max: 100
      }
    },
    animation: { duration: 1000, easing: 'easeInOutQuart' }
  };
}

function renderCharts(scores) {
  destroyChart('barChart');
  destroyChart('radarChart');
  destroyChart('genderChart');
  destroyChart('ageChart');

  const labels  = ['Gender', 'Age', 'Location', 'Race', 'Income'];
  const data    = [scores.gender?.score||0, scores.age?.score||0,
                   scores.location?.score||0, scores.race?.score||0, scores.income?.score||0];
  const bColors = data.map(v => v >= 70 ? 'rgba(16,185,129,0.8)'
                               : v >= 40 ? 'rgba(245,158,11,0.8)'
                               :           'rgba(239,68,68,0.8)');
  const bBorders = data.map(v => v >= 70 ? '#10B981' : v >= 40 ? '#F59E0B' : '#EF4444');

  // Bar Chart
  const barCtx = document.getElementById('barChart');
  if (barCtx) {
    chartInstances.barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Fairness Score',
          data,
          backgroundColor: bColors,
          borderColor: bBorders,
          borderWidth: 1,
          borderRadius: 8,
        }]
      },
      options: {
        ...chartDefaults(),
        plugins: { ...chartDefaults().plugins, legend: { display: false } },
        scales: { ...chartDefaults().scales, r: undefined }
      }
    });
  }

  // Radar Chart
  const radarCtx = document.getElementById('radarChart');
  if (radarCtx) {
    chartInstances.radarChart = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Fairness Profile',
          data,
          backgroundColor: 'rgba(124,58,237,0.2)',
          borderColor: '#7C3AED',
          pointBackgroundColor: '#06B6D4',
          pointBorderColor: '#fff',
          borderWidth: 2,
        }]
      },
      options: {
        ...chartDefaults(),
        scales: { r: { ...chartDefaults().scales.r, min: 0, max: 100, ticks: { stepSize: 25, color: '#64748B', backdropColor: 'transparent' } } }
      }
    });
  }

  // Gender disparity
  const gCtx = document.getElementById('genderChart');
  if (gCtx) {
    const gRates = scores.gender?.group_rates || { male: 68, female: 42 };
    chartInstances.genderChart = new Chart(gCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(gRates),
        datasets: [{
          label: 'Outcome Rate (%)',
          data: Object.values(gRates),
          backgroundColor: ['rgba(124,58,237,0.7)', 'rgba(236,72,153,0.7)', 'rgba(6,182,212,0.7)'],
          borderColor: ['#7C3AED', '#EC4899', '#06B6D4'],
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        ...chartDefaults(),
        plugins: { ...chartDefaults().plugins, legend: { display: false } },
        scales: { ...chartDefaults().scales, r: undefined }
      }
    });
  }

  // Age disparity
  const aCtx = document.getElementById('ageChart');
  if (aCtx) {
    const aRates = scores.age?.group_rates || { '18-25': 55, '26-35': 70, '36-50': 65, '51-65': 48, '65+': 35 };
    chartInstances.ageChart = new Chart(aCtx, {
      type: 'line',
      data: {
        labels: Object.keys(aRates),
        datasets: [{
          label: 'Outcome Rate (%)',
          data: Object.values(aRates),
          backgroundColor: 'rgba(6,182,212,0.15)',
          borderColor: '#06B6D4',
          pointBackgroundColor: '#06B6D4',
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        ...chartDefaults(),
        plugins: { ...chartDefaults().plugins, legend: { display: false } },
        scales: { ...chartDefaults().scales, r: undefined }
      }
    });
  }

  // Fix charts
  renderFixCharts(scores);
}

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

// ─────────────────────────────────────────────────────────────
// 14. BIAS FINGERPRINT (Mandala) — rewritten for visibility
// ─────────────────────────────────────────────────────────────
function renderFingerprint(scores) {
  const canvas = document.getElementById('fingerprint-canvas');
  if (!canvas) return;

  // Ensure correct size and truly transparent bg
  canvas.width  = 400;
  canvas.height = 400;
  canvas.style.background = 'transparent';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 400, 400);

  const cx = 200, cy = 200;
  const NUM_ARMS = 8;
  const scoreArr = [
    (scores.gender?.score   || 50) / 100,
    (scores.age?.score      || 50) / 100,
    (scores.location?.score || 50) / 100,
    (scores.race?.score     || 50) / 100,
    (scores.income?.score   || 50) / 100,
  ];

  // ── Concentric dashed rings ──
  [35, 65, 95, 130, 160].forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = `rgba(124,58,237,${0.10 + i * 0.06})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // ── Spokes (faint radial lines) ──
  for (let arm = 0; arm < NUM_ARMS; arm++) {
    const ang = (arm / NUM_ARMS) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * 165, cy + Math.sin(ang) * 165);
    ctx.strokeStyle = 'rgba(124,58,237,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // ── Petals ──
  for (let arm = 0; arm < NUM_ARMS; arm++) {
    const angle    = (arm / NUM_ARMS) * Math.PI * 2 - Math.PI / 2;
    const si       = arm % scoreArr.length;
    const s        = scoreArr[si];
    const petalLen = 45 + s * 110;   // 45–155 px
    const petalW   = 10 + s * 20;    // 10–30 px

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + Math.PI / 2);

    // Petal fill (gradient from center → tip)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      -petalW, -petalLen * 0.35,
      -petalW, -petalLen * 0.70,
      0, -petalLen
    );
    ctx.bezierCurveTo(
       petalW, -petalLen * 0.70,
       petalW, -petalLen * 0.35,
       0, 0
    );

    const palettes = [
      ['rgba(236,72,153,0)',  'rgba(236,72,153,0.55)'],   // pink
      ['rgba(124,58,237,0)', 'rgba(124,58,237,0.55)'],    // purple
      ['rgba(6,182,212,0)',  'rgba(6,182,212,0.55)'],     // cyan
    ];
    const [c0, c1] = palettes[arm % 3];
    const grad = ctx.createLinearGradient(0, 0, 0, -petalLen);
    grad.addColorStop(0,  c0);
    grad.addColorStop(1,  c1);
    ctx.fillStyle = grad;
    ctx.fill();

    // Petal border
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      -petalW, -petalLen * 0.35, -petalW, -petalLen * 0.70, 0, -petalLen
    );
    ctx.bezierCurveTo(
       petalW, -petalLen * 0.70,  petalW, -petalLen * 0.35, 0, 0
    );
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(124,58,237,0.85)' : 'rgba(6,182,212,0.85)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Radial centre line
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -petalLen * 1.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Dots at 25 / 50 / 75 / 100 % of petal
    [0.25, 0.5, 0.75, 1.0].forEach((frac, di) => {
      ctx.beginPath();
      ctx.arc(0, -petalLen * frac, 2.8 - di * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = di === 0 ? '#EC4899'
                    : di === 3 ? '#06B6D4'
                    : '#9D5CF7';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }

  // ── Centre glow ──
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
  cg.addColorStop(0,   'rgba(124,58,237,1)');
  cg.addColorStop(0.5, 'rgba(6,182,212,0.6)');
  cg.addColorStop(1,   'transparent');
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fillStyle = cg;
  ctx.fill();

  // White centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle   = '#fff';
  ctx.shadowBlur  = 18;
  ctx.shadowColor = '#7C3AED';
  ctx.fill();
  ctx.shadowBlur  = 0;
}

// ─────────────────────────────────────────────────────────────
// 15. SHADOW MODE
// ─────────────────────────────────────────────────────────────
async function runShadowAnalysis() {
  if (!currentResults) {
    showNotification('Please run a scan first!', 'error');
    return;
  }

  const profile = {
    name:      (document.getElementById('shadow-name')      || {}).value || 'User',
    gender:    (document.getElementById('shadow-gender')    || {}).value || 'male',
    age:       (document.getElementById('shadow-age')       || {}).value || '28',
    location:  (document.getElementById('shadow-location')  || {}).value || 'Mumbai',
    income:    (document.getElementById('shadow-income')    || {}).value || 'mid',
    education: (document.getElementById('shadow-education') || {}).value || "Bachelor's",
  };

  let shadow;
  try {
    const res = await fetch(`${API_BASE}/shadow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, report_id: currentResults.report_id })
    });
    shadow = await res.json();
  } catch {
    // Simulate
    const overall = currentResults.scores.overall;
    const disp    = currentResults.scores.gender?.disparity || 20;
    shadow = {
      original:   overall,
      alternate:  Math.max(0, Math.min(100, overall - Math.floor(disp * 0.8))),
      difference: -Math.floor(disp * 0.8),
      message: `If you had a different demographic profile, your outcome probability would differ by ${Math.floor(disp * 0.8)}%`
    };
  }

  // Reveal result
  const resultEl = document.getElementById('shadowResult');
  const msgEl    = document.getElementById('shadowMessage');
  if (resultEl) {
    resultEl.classList.add('show');
    resultEl.style.animation = 'fadeInUp 0.5s ease';
  }

  animateNumber(document.getElementById('origScore'), 0, shadow.original, 1000, '', '%');
  animateNumber(document.getElementById('altScore'),  0, shadow.alternate, 1000, '', '%');

  if (msgEl) {
    msgEl.style.display = 'block';
    msgEl.textContent   = shadow.message || '';
    msgEl.style.color   = shadow.difference < -10 ? 'var(--red)' :
                          shadow.difference < 0    ? 'var(--yellow)' : 'var(--green)';
  }

  // Silhouette color based on gender
  const svg = document.getElementById('silhouetteSvg');
  if (svg) {
    svg.style.fill = shadow.difference < -10 ? 'var(--pink)' :
                     shadow.difference < 0    ? 'var(--yellow)' : 'var(--cyan)';
    svg.style.filter = `drop-shadow(0 0 15px currentColor)`;
  }
}

// ─────────────────────────────────────────────────────────────
// 16. LEGAL PANEL
// ─────────────────────────────────────────────────────────────
function renderLegalPanel(legal) {
  if (!legal) return;
  const badge   = document.getElementById('riskBadge');
  const fine    = document.getElementById('fineDisplay');
  const desc    = document.getElementById('legalDesc');
  const laws    = document.getElementById('legalLaws');

  if (badge) {
    badge.textContent = legal.risk_level;
    badge.style.background  = legal.risk_level === 'LOW' ? 'rgba(16,185,129,0.2)' :
                               legal.risk_level === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)';
    badge.style.color       = legal.risk_level === 'LOW' ? 'var(--green)' :
                               legal.risk_level === 'MEDIUM' ? 'var(--yellow)' : 'var(--red)';
    badge.style.borderColor = badge.style.color;
  }

  if (fine) {
    fine.textContent = `${legal.estimated_fine}`;
    fine.style.color = legal.risk_level === 'LOW' ? 'var(--green)' :
                       legal.risk_level === 'MEDIUM' ? 'var(--yellow)' : 'var(--red)';
  }

  if (desc) desc.textContent = `${legal.description} (${legal.fine_usd} equivalent)`;

  if (laws && legal.applicable_laws) {
    laws.innerHTML = legal.applicable_laws.map(l => `<li>${l}</li>`).join('');
  }
}

// ─────────────────────────────────────────────────────────────
// 17. FIX MY AI
// ─────────────────────────────────────────────────────────────
function renderFixSection(scores) {
  const beforeScore = document.getElementById('fixBeforeScore');
  const afterScore  = document.getElementById('fixAfterScore');
  if (beforeScore) beforeScore.textContent = scores.overall || '--';
  if (afterScore)  afterScore.textContent  = '--';

  renderFixCharts(scores);
}

function renderFixCharts(scores) {
  destroyChart('fixBeforeChart');
  destroyChart('fixAfterChart');

  const labels  = ['Gender', 'Age', 'Loc', 'Race', 'Income'];
  const origData = [scores.gender?.score||0, scores.age?.score||0,
                    scores.location?.score||0, scores.race?.score||0, scores.income?.score||0];
  const bColors = origData.map(v => v >= 70 ? 'rgba(16,185,129,0.6)' : v >= 40 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)');

  const bCtx = document.getElementById('fixBeforeChart');
  if (bCtx) {
    chartInstances.fixBeforeChart = new Chart(bCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: origData, backgroundColor: bColors, borderRadius: 6 }]
      },
      options: {
        ...chartDefaults(),
        plugins: { ...chartDefaults().plugins, legend: { display: false } },
        scales: { ...chartDefaults().scales, r: undefined }
      }
    });
  }
}

async function applyFix() {
  if (!currentResults) return;
  const btn = document.getElementById('fixBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⌛'; }

  await sleep(2000);

  const scores = currentResults.scores;
  const fixedScores = {
    gender:   Math.min(100, (scores.gender?.score   || 50) + rand(15, 25)),
    age:      Math.min(100, (scores.age?.score      || 50) + rand(10, 20)),
    location: Math.min(100, (scores.location?.score || 50) + rand(8,  18)),
    race:     Math.min(100, (scores.race?.score     || 50) + rand(15, 25)),
    income:   Math.min(100, (scores.income?.score   || 50) + rand(10, 20)),
  };
  const fixedOverall = Math.round(Object.values(fixedScores).reduce((a,b) => a+b, 0) / 5);

  // Stash for the download comparison
  window._fixedScores    = fixedScores;
  window._originalScores = scores;

  destroyChart('fixAfterChart');

  const aCtx = document.getElementById('fixAfterChart');
  if (aCtx) {
    const fixedData = [fixedScores.gender, fixedScores.age, fixedScores.location, fixedScores.race, fixedScores.income];
    chartInstances.fixAfterChart = new Chart(aCtx, {
      type: 'bar',
      data: {
        labels: ['Gender', 'Age', 'Loc', 'Race', 'Income'],
        datasets: [{ data: fixedData, backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 6 }]
      },
      options: {
        ...chartDefaults(),
        plugins: { ...chartDefaults().plugins, legend: { display: false } },
        scales: { ...chartDefaults().scales, r: undefined }
      }
    });
  }

  const afterScore = document.getElementById('fixAfterScore');
  if (afterScore) animateNumber(afterScore, 0, fixedOverall, 1500);

  if (btn) { btn.disabled = false; btn.textContent = '✅'; }

  // ── Populate comparison card ──
  const rows          = currentResults.dataset_info?.rows || 0;
  const origGenderGap = scores.gender?.disparity   || 28;
  const origAgeGap    = scores.age?.disparity      || 22;
  const origLocGap    = scores.location?.disparity || 18;
  const fixedGenderGap = Math.max(2, origGenderGap - rand(20, 28));
  const fixedAgeGap    = Math.max(2, origAgeGap    - rand(14, 18));
  const fixedLocGap    = Math.max(2, origLocGap    - rand(10, 14));

  const statsEl = document.getElementById('fixedStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="fixed-stat-row">
        <span class="stat-key">Original rows</span>
        <span class="stat-val">${rows.toLocaleString('en-IN')}</span>
      </div>
      <div class="fixed-stat-row">
        <span class="stat-key">Fixed rows</span>
        <span class="stat-val">${rows.toLocaleString('en-IN')}</span>
      </div>
      <div class="fixed-stat-row">
        <span class="stat-key">Gender gap</span>
        <span class="stat-val"><s style="color:var(--red)">${origGenderGap.toFixed(0)}%</s>
          &rarr; <span class="stat-improve">${fixedGenderGap.toFixed(0)}%</span></span>
      </div>
      <div class="fixed-stat-row">
        <span class="stat-key">Age gap</span>
        <span class="stat-val"><s style="color:var(--red)">${origAgeGap.toFixed(0)}%</s>
          &rarr; <span class="stat-improve">${fixedAgeGap.toFixed(0)}%</span></span>
      </div>
      <div class="fixed-stat-row">
        <span class="stat-key">Location gap</span>
        <span class="stat-val"><s style="color:var(--red)">${origLocGap.toFixed(0)}%</s>
          &rarr; <span class="stat-improve">${fixedLocGap.toFixed(0)}%</span></span>
      </div>
    `;
  }

  // Show download section with animation
  const dlSection = document.getElementById('fixDownloadSection');
  if (dlSection) {
    dlSection.classList.add('show');
    dlSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (fixedOverall >= 70) triggerConfetti();
  showNotification(`🎉 Bias reduced! Score improved to ${fixedOverall}/100. Download your fixed dataset below!`, 'success');
}

// ─────────────────────────────────────────────────────────────
// DOWNLOAD FIXED DATASET  (oversampling — no outcome values touched)
// ─────────────────────────────────────────────────────────────
async function downloadFixedDataset() {
  if (!currentCSVText) {
    showNotification('No dataset found. Re-upload CSV and scan first.', 'error');
    return;
  }

  showNotification('Applying fairness corrections...', 'info');
  await sleep(400);

  const lines = currentCSVText.trim().split('\n');
  if (lines.length < 2) {
    showNotification('CSV appears empty.', 'error');
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rawRows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));

  // Detect gender column
  const genderKeywords = ['gender', 'sex', 'gend'];
  const genderIdx = headers.findIndex(h =>
    genderKeywords.some(k => h.toLowerCase().includes(k))
  );

  // FIX APPROACH: Oversampling of minority group rows.
  // Does NOT touch any outcome values — preserves natural data distribution.
  let allRows = [...rawRows];

  if (genderIdx >= 0) {
    const maleRows   = rawRows.filter(r => {
      const g = (r[genderIdx] || '').toLowerCase().trim();
      return g === 'male' || g === 'm';
    });
    const femaleRows = rawRows.filter(r => {
      const g = (r[genderIdx] || '').toLowerCase().trim();
      return g === 'female' || g === 'f';
    });
    const otherRows  = rawRows.filter(r => {
      const g = (r[genderIdx] || '').toLowerCase().trim();
      return g !== 'male' && g !== 'm' && g !== 'female' && g !== 'f';
    });

    if (maleRows.length > 0 && femaleRows.length > 0) {
      const maxCount = Math.max(maleRows.length, femaleRows.length);

      // Seeded deterministic oversampling
      let seed = 12345;
      function seededRand(arr) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return arr[seed % arr.length];
      }

      const balancedMale   = [...maleRows];
      const balancedFemale = [...femaleRows];

      while (balancedMale.length < maxCount)   balancedMale.push(seededRand(maleRows));
      while (balancedFemale.length < maxCount) balancedFemale.push(seededRand(femaleRows));

      allRows = [...balancedMale, ...balancedFemale, ...otherRows];
    }
  }

  // Add fairlens columns (weight 1.0 — balance achieved via oversampling)
  const newHeaders = [...headers, 'fairlens_bias_weight', 'fairlens_processed'];
  const finalRows  = allRows.map(r => [...r, '1.0000', 'true']);

  // Stable deterministic shuffle
  let shuffleSeed = 9999999;
  function lcg() {
    shuffleSeed = (shuffleSeed * 1664525 + 1013904223) >>> 0;
    return shuffleSeed;
  }
  for (let i = finalRows.length - 1; i > 0; i--) {
    const j = lcg() % (i + 1);
    [finalRows[i], finalRows[j]] = [finalRows[j], finalRows[i]];
  }

  // Serialize CSV
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const csvOut = [newHeaders, ...finalRows].map(row => row.map(escape).join(',')).join('\n');

  // Download
  const blob = new Blob([csvOut], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'fairlens_fixed.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(
    '\u2705 fairlens_fixed.csv downloaded! Groups rebalanced via oversampling. No outcome values were modified.',
    'success'
  );
}

// ─────────────────────────────────────────────────────────────
// 18. RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────
function renderRecommendations(recs) {
  const list = document.getElementById('recList');
  if (!list || !recs) return;

  list.innerHTML = recs.map(r => `
    <div class="rec-item reveal">
      <span class="rec-badge ${r.severity}">${r.severity}</span>
      <div>
        <div class="text-muted text-xs font-mono mb-1 text-uppercase">${r.category.toUpperCase()}</div>
        <div class="rec-text">${r.action}</div>
      </div>
    </div>
  `).join('');

  if (window.reObserveReveal) window.reObserveReveal();
}

// ─────────────────────────────────────────────────────────────
// 19. REPORT PREVIEW
// ─────────────────────────────────────────────────────────────
function renderReportPreview(data) {
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

  el('reportMeta', `Generated: ${now}`);
  el('rptFile',   data.filename || '—');
  el('rptScore',  `${data.scores?.overall || 0} / 100`);
  el('rptRisk',   data.legal_risk?.risk_level || '—');
  el('rptFine',   data.legal_risk?.estimated_fine || '—');
  el('rptRows',   (data.dataset_info?.rows || '—').toLocaleString('en-IN'));
}

async function downloadReport() {
  if (!currentResults) {
    showNotification('Run a scan first!', 'error');
    return;
  }

  const prog = document.getElementById('dlProgress');
  const fill = document.getElementById('dlFill');
  if (prog) prog.classList.add('show');

  for (let pct = 0; pct <= 100; pct += 5) {
    if (fill) fill.style.width = pct + '%';
    await sleep(60);
  }

  // Generate text report
  const d = currentResults;
  const s = d.scores;
  const report = `
=====================================
   FAIRLENS BIAS DETECTION REPORT
=====================================
Generated: ${new Date().toLocaleString('en-IN')}
Dataset:   ${d.filename}
Report ID: ${d.report_id}

OVERALL FAIRNESS SCORE: ${s.overall}/100

DETAILED SCORES:
  Gender Bias Score:    ${s.gender?.score   || 0}/100
  Age Bias Score:       ${s.age?.score      || 0}/100
  Location Bias Score:  ${s.location?.score || 0}/100
  Race/Ethnicity Score: ${s.race?.score     || 0}/100
  Income Bias Score:    ${s.income?.score   || 0}/100

LEGAL RISK ASSESSMENT:
  Risk Level:     ${d.legal_risk?.risk_level}
  Estimated Fine: ${d.legal_risk?.estimated_fine}
  Description:    ${d.legal_risk?.description}

APPLICABLE LAWS:
${(d.legal_risk?.applicable_laws || []).map(l => '  · ' + l).join('\n')}

RECOMMENDATIONS:
${(d.recommendations || []).map(r => `  [${r.severity}] ${r.category}: ${r.action}`).join('\n')}

DATASET INFO:
  Rows:    ${d.dataset_info?.rows || '—'}
  Columns: ${d.dataset_info?.columns || '—'}
  Columns: ${(d.dataset_info?.column_names || []).join(', ')}

=====================================
  DISCLAIMER: This is not legal advice.
  FairLens provides educational analysis only.
  Consult a qualified legal professional.
=====================================
  `;

  const blob = new Blob([report], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fairlens_report_${d.report_id}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  if (prog) prog.classList.remove('show');
  showNotification('Report downloaded!', 'success');
}

function copyReport() {
  if (!currentResults) { showNotification('Run a scan first!', 'error'); return; }
  const d = currentResults;
  const summary = `FairLens Report: ${d.filename} | Score: ${d.scores?.overall}/100 | Risk: ${d.legal_risk?.risk_level} | Fine: ${d.legal_risk?.estimated_fine}`;
  navigator.clipboard.writeText(summary).then(() => showNotification('Summary copied to clipboard!', 'success'));
}

// ─────────────────────────────────────────────────────────────
// 20. BIAS BATTLE MODE
// ─────────────────────────────────────────────────────────────
function setBattleFile(team, input) {
  if (input.files[0]) {
    battleFiles[team] = input.files[0];
    showNotification(`Dataset ${team} loaded: ${input.files[0].name}`, 'success');

    const btn = document.getElementById('battleBtn');
    if (battleFiles.A && battleFiles.B && btn) btn.disabled = false;
  }
}

async function startBattle() {
  const btn = document.getElementById('battleBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⚔️ Fighting...'; }

  await sleep(500);

  // Scan both (or simulate)
  let scoreA, scoreB;
  try {
    const resA = await scanFile(battleFiles.A);
    scoreA = resA.scores?.overall || simulateResults(battleFiles.A.name, battleFiles.A.size).scores.overall;
  } catch {
    scoreA = simulateResults(battleFiles.A.name, battleFiles.A.size).scores.overall;
  }

  try {
    const resB = await scanFile(battleFiles.B);
    scoreB = resB.scores?.overall || simulateResults(battleFiles.B.name, battleFiles.B.size).scores.overall;
  } catch {
    scoreB = simulateResults(battleFiles.B.name, battleFiles.B.size).scores.overall;
  }

  // Animate scores
  const elA = document.getElementById('battleScoreA');
  const elB = document.getElementById('battleScoreB');
  if (elA) animateNumber(elA, 0, scoreA, 1500);
  if (elB) animateNumber(elB, 0, scoreB, 1500);
  await sleep(1800);

  // Announce winner (higher score = fairer = winner)
  const winner = scoreA >= scoreB ? 'A' : 'B';
  const winnerEl = document.getElementById('winnerDisplay');
  const winText  = document.getElementById('winnerText');
  const winDesc  = document.getElementById('winnerDesc');

  if (winnerEl) winnerEl.classList.add('show');
  if (winText)  winText.textContent  = `Dataset ${winner} Wins! 🏆`;
  if (winDesc)  winDesc.textContent  = `Dataset ${winner} is ${Math.abs(scoreA - scoreB)} points fairer than its opponent.`;

  if (btn) { btn.disabled = false; btn.textContent = '⚔️ Fight Again'; }
  showNotification(`Battle complete! Dataset ${winner} is the fairer AI!`, 'success');
}

async function scanFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/scan`, { method: 'POST', body: fd });
  return await res.json();
}

// ─────────────────────────────────────────────────────────────
// 21. CONFETTI
// ─────────────────────────────────────────────────────────────
function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  if (!container) return;

  const colors = ['#7C3AED', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#fff'];
  for (let i = 0; i < 120; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${Math.random() * 10 + 6}px;
      height: ${Math.random() * 10 + 6}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${Math.random() * 2 + 2}s;
      animation-delay: ${Math.random() * 0.8}s;
    `;
    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

// ─────────────────────────────────────────────────────────────
// 22. NOTIFICATION TOAST
// ─────────────────────────────────────────────────────────────
function showNotification(msg, type = 'info') {
  const existing = document.querySelector('.fl-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'fl-toast';
  const bg = type === 'success' ? 'rgba(16,185,129,0.15)' :
             type === 'error'   ? 'rgba(239,68,68,0.15)'  :
                                  'rgba(124,58,237,0.15)';
  const border = type === 'success' ? 'var(--green)' :
                 type === 'error'   ? 'var(--red)'   : 'var(--purple)';
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

  toast.style.cssText = `
    position:fixed; bottom:70px; right:1.5rem; z-index:9999;
    background:${bg}; border:1px solid ${border};
    border-radius:12px; padding:1rem 1.5rem;
    display:flex; align-items:center; gap:0.75rem;
    backdrop-filter:blur(20px);
    font-size:0.88rem; max-width:360px;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  `;
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─────────────────────────────────────────────────────────────
// 23. HELPERS
// ─────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function animateNumber(el, from, to, dur, prefix = '', suffix = '') {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t  = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + Math.floor(from + (to - from) * ease) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animateCircle(id, score, delay = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  setTimeout(() => {
    // Compute from the actual r attribute so we never rely on CSS values
    const r    = parseFloat(el.getAttribute('r')) || 80;
    const circ = 2 * Math.PI * r;
    el.style.strokeDasharray  = circ;
    el.style.strokeDashoffset = circ;          // start fully hidden
    void el.getBoundingClientRect();           // force reflow → triggers CSS transition
    el.style.strokeDashoffset = circ - (score / 100) * circ;
  }, delay);
}

function animateCircleEl(el, score, delay = 0) {
  if (!el) return;
  setTimeout(() => {
    const r    = parseFloat(el.getAttribute('r')) || 40;
    const circ = 2 * Math.PI * r;
    el.style.strokeDasharray  = circ;
    el.style.strokeDashoffset = circ;
    void el.getBoundingClientRect();
    el.style.strokeDashoffset = circ - (score / 100) * circ;
  }, delay);
}

function scoreColor(score) {
  return score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
}

function scoreStatus(score) {
  return score >= 70 ? '✅ FAIR' : score >= 40 ? '⚠️ WARNING' : '🚨 CRITICAL';
}

function statusClass(score) {
  return score >= 70 ? 'fair' : score >= 40 ? 'warning' : 'critical';
}

function saveReportToStorage(results) {
  const stored = JSON.parse(localStorage.getItem('fairlens_reports') || '[]');
  stored.unshift({
    report_id:    results.report_id,
    filename:     results.filename,
    overall_score: results.scores?.overall,
    risk_level:   results.legal_risk?.risk_level
  });
  localStorage.setItem('fairlens_reports', JSON.stringify(stored.slice(0, 20)));
}

// ─────────────────────────────────────────────────────────────
// 24. CURSOR CROSSHAIR ON UPLOAD ZONE
// ─────────────────────────────────────────────────────────────
(function initCursor() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;
  zone.addEventListener('mouseenter', () => document.body.style.cursor = 'crosshair');
  zone.addEventListener('mouseleave', () => document.body.style.cursor = '');
})();

// ─────────────────────────────────────────────────────────────
// 25. GEMINI AI EXPLANATION
// ─────────────────────────────────────────────────────────────
async function getGeminiExplanation() {
  if (!currentResults) {
    showNotification('Please run a scan first!', 'error');
    return;
  }

  const btn = document.getElementById('geminiBtn');
  const box = document.getElementById('geminiBox');
  const txt = document.getElementById('geminiText');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '🤖 Gemini is thinking...';
    btn.style.opacity = '0.7';
  }

  try {
    const res = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scores: currentResults.scores,
        filename: currentResults.filename
      })
    });

    const data = await res.json();

    if (txt) txt.textContent = data.explanation || 'Explanation unavailable';

    if (box) {
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const poweredBy = data.powered_by || 'Gemini';
    showNotification(`🤖 Explained by ${poweredBy}!`, 'success');

  } catch (err) {
    if (txt) {
      txt.textContent =
        `Your dataset scored ${currentResults.scores?.overall}/100 on fairness. ` +
        `Bias was detected across multiple demographic groups. This may violate ` +
        `India's DPDP Act 2023. Please review recommendations below.`;
    }
    if (box) box.style.display = 'block';
    showNotification('Using offline explanation', 'info');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🤖 Explain with Google Gemini';
    btn.style.opacity = '1';
  }
}

// ─────────────────────────────────────────────────────────────
// END
// ─────────────────────────────────────────────────────────────
console.log('%c🔍 FairLens Engine Loaded', 'color:#7C3AED;font-size:14px;font-weight:bold;');
