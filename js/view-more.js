/* ==========================================================================
   Grandir Ensemble — Indicateurs, Album (+ viewer), Carte, Médiathèque, Courage
   ========================================================================== */
(function () {
  'use strict';
  const G = window.Game, E = window.Economy, C = window.CONTENT, GE = window.GE;
  const { $, $$, esc, fmtFr, fmtEn, fmtEnLong, pct, elan } = GE;
  const MONTHS = ['jan', 'feb', 'mar', 'apr'];
  const KSTAR = Math.pow(1.006, 120);

  // ======================= INDICATEURS =======================
  function lineChart(series, opts = {}) {
    // series: [{pts:[[x,y]], cls}] ; x in day index 0..120
    const W = 640, H = 190, L = 44, R = 10, T = 12, B = 26;
    const ys = series.flatMap(s => s.pts.map(p => p[1]));
    let y0 = opts.y0 ?? Math.min(...ys), y1 = opts.y1 ?? Math.max(...ys);
    if (y1 - y0 < 1e-9) { y1 += 1; y0 -= 1; }
    const pad = (y1 - y0) * .08; y0 -= pad; y1 += pad;
    const X = x => L + (x / 120) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="lbl" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${opts.fmt ? opts.fmt(v) : v.toFixed(2)}</text>`; }
    [['Jan', 0], ['Feb', 31], ['Mar', 59], ['Apr', 90], ['30 Apr', 119]].forEach(([l, x]) => { g += `<text class="lbl" x="${X(x)}" y="${H - 6}" text-anchor="${x > 100 ? 'end' : 'start'}">${l}</text>`; });
    const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    let body = '';
    for (const s of series) {
      if (!s.pts.length) continue;
      if (s.area) body += `<path class="area" d="${path(s.pts)}L${X(s.pts[s.pts.length - 1][0])},${H - B}L${X(s.pts[0][0])},${H - B}Z"/>`;
      body += `<path class="${s.cls}" d="${path(s.pts)}"/>`;
      if (s.dot) { const p = s.pts[s.pts.length - 1]; body += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4.5" fill="#D22B3A" stroke="#fff" stroke-width="2"/>`; }
    }
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}"><defs><linearGradient id="gradArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2C55A8" stop-opacity=".18"/><stop offset="1" stop-color="#2C55A8" stop-opacity="0"/></linearGradient></defs>${g}${body}</svg>`;
  }
  function seriesPts(P) { return G.series(P).map(p => [G.D.diff(G.START, p.iso) + 1, p.K]); }
  function idealPts() { const a = []; for (let i = 0; i <= 120; i += 4) a.push([i, Math.pow(1.006, i)]); return a; }
  function projection(P) {
    const pts = seriesPts(P); const last = pts[pts.length - 1];
    const rem = 120 - last[0]; if (rem <= 0) return [];
    const out = [last]; for (let i = 4; i <= rem; i += 4) out.push([last[0] + i, last[1] * Math.pow(1.006, i)]);
    out.push([120, last[1] * Math.pow(1.006, rem)]); return out;
  }

  GE.views.indicators = (root, args) => {
    const P = GE.P; const s = E.snapshot(P.K);
    const s0 = E.snapshot(1), sT = E.snapshot(KSTAR);
    const pts = seriesPts(P); const proj = projection(P);
    const best = proj.length ? proj[proj.length - 1][1] : P.K;
    const sb = E.snapshot(best);
    root.innerHTML = `
      <div class="page-head"><div><h1>Indicateurs nationaux</h1><p>Ten measures of the Nation, all driven by one number: the élan national. Keep your daily word and it compounds; break it and it erodes.</p></div></div>
      <section class="panel elan-panel">
        <div>
          <div class="muted">Élan national (index, 1 Jan 2027 = 100)</div>
          <div class="elan-big">${elan(P.K)}</div>
          <p class="muted" style="margin-top:8px">A flawless term ends at <b>${elan(KSTAR)}</b>. ${proj.length ? `If you complete every remaining day, you finish at <b>${elan(best)}</b>, with a GDP per capita of ${E.INDICATORS[0].value(sb)} and an HDI of ${E.INDICATORS[1].value(sb)}.` : ''}</p>
          <div class="cal-legend"><span><svg width="22" height="8"><path d="M0 4h22" stroke="#12306E" stroke-width="2.4"/></svg> Your path</span><span><svg width="22" height="8"><path d="M0 4h22" stroke="#B0832F" stroke-width="1.5" stroke-dasharray="4 4"/></svg> Perfect path</span><span><svg width="22" height="8"><path d="M0 4h22" stroke="#2C55A8" stroke-width="1.5" stroke-dasharray="1 4"/></svg> Your best from here</span></div>
        </div>
        <div>${lineChart([{ pts: idealPts(), cls: 'ideal' }, { pts: proj, cls: 'ideal" style="stroke:#2C55A8;stroke-dasharray:1 4' }, { pts, cls: 'line', area: true, dot: true }], { fmt: v => (v * 100).toFixed(0), label: 'Élan national over the term', y0: Math.min(.9, ...pts.map(p => p[1])), y1: Math.max(KSTAR, ...pts.map(p => p[1])) })}</div>
      </section>
      <div class="ind-grid">
        ${E.INDICATORS.map(ind => {
          const a = ind.raw(s0), b = ind.raw(sT), v = ind.raw(s);
          const prog = Math.max(0, Math.min(1, (v - a) / (b - a)));
          const spark = pts.map(p => [p[0], ind.raw(E.snapshot(p[1]))]);
          return `<button class="ind-card" data-ind="${ind.key}">
            <div class="top"><span class="name">${ind.name}</span><span class="unit">${ind.unit}</span></div>
            <div class="value">${ind.value(s)}</div>
            <div class="sub">${ind.sub(s)}</div>
            <div class="track"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
            <div class="track-lbl"><span>Start ${ind.value(s0)}</span><span>Perfect term ${ind.value(sT)}</span></div>
            ${spark.length > 2 ? sparkline(spark) : ''}
            <div class="ref">${ind.france}</div>
          </button>`;
        }).join('')}
      </div>
      <section class="panel math" style="margin-top:26px">
        <h2>The maths behind the Nation</h2>
        <p>Every closed day multiplies the élan national <i>K</i> by its reward. This is the boost or deduction named in the rules, applied to the engine that moves all ten indicators:</p>
        <span class="formula">K<sub>t</sub> = K<sub>t−1</sub> × (1 + r<sub>t</sub>), &nbsp; r ∈ {+0.60%, +0.30%, +0.15%, −0.15%, −0.30%}</span>
        <p>A perfect term of 120 days gives K* = 1.006<sup>120</sup> = ${KSTAR.toFixed(4)}; its log-progress is G* = 120·ln 1.006 = ${E.G_STAR.toFixed(5)}. Each indicator is then a calibrated transmission of K, chosen so that the start describes a nation in deep difficulty and a perfect term reaches, or passes, France’s real record.</p>
        <ul>
          <li><b>Levels</b> (GDP per capita, gross national income, tourists) grow with an elasticity: <code>X = X₀ · K^ε</code>, with <code>ε = ln(X_target / X₀) / G*</code>. That is why one perfect day lifts GDP by about ${((Math.pow(1.006, E.D.gdp.e) - 1) * 100).toFixed(2)}%: growth compounds on growth.</li>
          <li><b>Bounded scores</b> (happiness, PISA, business climate, government effectiveness, life expectancy, schooling, health coverage) follow a diminishing-returns curve <code>X = F − (F − X₀) · K^(−0.75)</code>. The first gains come fast; the last points, as in real development data, are the hardest. The asymptote F is solved so a perfect term lands on target.</li>
          <li><b>Lower is better</b> (Global Peace Index, Gini) use the same curve falling toward a floor.</li>
          <li><b>Composites</b> use their official formulas. The HDI is the UNDP geometric mean <code>(I_health × I_education × I_income)^(1/3)</code>; government effectiveness becomes a percentile with the standard normal <code>Φ(x)</code>.</li>
          <li><b>World ranks</b> are read off a modelled distribution of countries: <code>rank = 1 + round((N − 1) · P(another country scores better))</code>.</li>
        </ul>
        <p class="muted">Bad days hurt but never doom the term: a −0.30% day is undone by half of one perfect day.</p>
        <div class="table-wrap"><table class="tier-table" style="margin-top:10px">
          <thead><tr><th>Day completed</th><th>Reward</th><th>Élan</th><th>Gems</th></tr></thead>
          <tbody>${G.TIER_ORDER.map(k => { const t = G.TIERS[k]; return `<tr><td>${t.range}</td><td><span class="tier-pill t-${k}">${t.label}</span></td><td class="num ${t.rate >= 0 ? 'delta up' : 'delta down'}">${pct(t.rate)}</td><td class="num">${t.gems > 0 ? '+' : '−'}${Math.abs(t.gems)}</td></tr>`; }).join('')}</tbody>
        </table></div>
      </section>`;
    root.addEventListener('click', e => { const c = e.target.closest('[data-ind]'); if (c) openIndicator(c.dataset.ind); });
    if (args[0]) setTimeout(() => openIndicator(args[0]), 50);
  };
  function sparkline(pts) {
    const ys = pts.map(p => p[1]); const y0 = Math.min(...ys), y1 = Math.max(...ys) || 1; const r = y1 - y0 || 1;
    const x0 = pts[0][0], xr = (pts[pts.length - 1][0] - x0) || 1;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((p[0] - x0) / xr * 300).toFixed(1)},${(36 - (p[1] - y0) / r * 32).toFixed(1)}`).join('');
    return `<svg class="spark" viewBox="0 0 300 38" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  function openIndicator(key) {
    const ind = E.INDICATORS.find(i => i.key === key); if (!ind) return;
    const P = GE.P; const s = E.snapshot(P.K), s0 = E.snapshot(1), sT = E.snapshot(KSTAR);
    const pts = seriesPts(P).map(p => [p[0], ind.raw(E.snapshot(p[1]))]);
    const ideal = idealPts().map(p => [p[0], ind.raw(E.snapshot(p[1]))]);
    const proj = projection(P).map(p => [p[0], ind.raw(E.snapshot(p[1]))]);
    let extra = '';
    if (key === 'hdi') extra = `<div class="table-wrap"><table class="tier-table"><thead><tr><th>Component</th><th>Now</th><th>Index</th></tr></thead><tbody>
      <tr><td>Life expectancy</td><td class="num">${s.parts.le.toFixed(1)} years</td><td class="num">${s.Ih.toFixed(3)}</td></tr>
      <tr><td>Expected years of schooling</td><td class="num">${s.parts.eys.toFixed(1)}</td><td class="num" rowspan="2">${s.Ie.toFixed(3)}</td></tr>
      <tr><td>Mean years of schooling</td><td class="num">${s.parts.mys.toFixed(1)}</td></tr>
      <tr><td>GNI per capita (2021 PPP $)</td><td class="num">${Math.round(s.parts.gni).toLocaleString('en-US')}</td><td class="num">${s.Ii.toFixed(3)}</td></tr>
      </tbody></table></div><p class="muted">France in HDR 2025: life expectancy 83.3, expected schooling 16.1, mean schooling 11.8, GNI $55,060 → HDI 0.920.</p>`;
    GE.modal({
      title: ind.name, wide: true,
      body: `<p class="muted" style="margin-top:-4px">${ind.unit}</p>
        <div style="display:flex;gap:26px;flex-wrap:wrap;align-items:baseline;margin:6px 0 4px"><div><div class="muted" style="font-size:13px">Now</div><div class="elan-big" style="font-size:44px">${ind.value(s)}</div></div>
          <div><div class="muted" style="font-size:13px">Start of term</div><b class="num" style="font-size:22px">${ind.value(s0)}</b></div>
          <div><div class="muted" style="font-size:13px">Perfect term</div><b class="num" style="font-size:22px">${ind.value(sT)}</b></div></div>
        <p class="muted">${ind.sub(s)}</p>
        ${lineChart([{ pts: ideal, cls: 'ideal' }, { pts: proj, cls: 'ideal" style="stroke:#2C55A8;stroke-dasharray:1 4' }, { pts, cls: 'line', area: true, dot: true }], { label: ind.name, fmt: v => Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2) })}
        <h3 style="margin-top:14px">How it moves</h3><p class="math">${ind.math}</p>${extra}
        <p class="muted">${ind.france}. Values in this game are a model, not official statistics.</p>`,
      actions: [{ label: 'Close', cls: 'btn-primary' }]
    }).then(() => { if (location.hash.startsWith('#/indicators/')) history.replaceState(null, '', '#/indicators'); });
  }

  // ======================= ALBUM =======================
  GE.views.album = (root) => {
    const P = GE.P; const un = G.unlockedSet(P); const t = GE.today();
    const all = [];
    root.innerHTML = `<div class="page-head"><div><h1>L’album</h1><p>One stamp for every day you log a plan, whatever the result. ${un.size} of 120 collected. Click a stamp to see it in full, with zoom.</p></div>
      <div class="bar" style="width:min(320px,100%);height:8px"><i style="width:${un.size / 120 * 100}%"></i></div></div>
      ${MONTHS.map(mk => {
        const M = C.months[mk]; let got = 0;
        const cells = window.COLLECTION[mk].map((data, i) => {
          const iso = `${M.iso}-${String(i + 1).padStart(2, '0')}`;
          if (un.has(iso)) { got++; const it = { month: mk, index: i, iso, data }; all.push(it); return `<button class="stamp" data-k="${all.length - 1}">${GE.stampHTML(it)}</button>`; }
          const missed = iso < t || G.mode(P, iso) === 'before-term';
          return `<div class="stamp locked ${iso === t ? 'today-lock' : ''}" title="${missed ? 'Not logged' : 'Log ' + fmtEn(iso) + ' to unlock'}"><div class="face"><span>${i + 1}</span></div><div class="cap">${iso === t ? 'Today' : missed ? 'Not collected' : fmtEn(iso)}</div></div>`;
        }).join('');
        return `<section class="album-month"><header><h2>${M.fr}<span>${M.themeFr}</span></h2><span class="muted">${M.theme}, ${got} of ${M.days}</span></header><div class="album-grid">${cells}</div></section>`;
      }).join('')}`;
    root.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) GE.openViewer(all, +b.dataset.k); });
  };

  // ======================= VIEWER =======================
  GE.openViewer = (items, idx) => {
    items = items.filter(Boolean); if (!items.length) return;
    let i = idx, alt = 0, zoomer = null, info = true;
    const v = document.createElement('div'); v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
    v.innerHTML = `<div class="viewer-stage" id="vStage">
        <div class="viewer-loading">Loading…</div>
        <div class="viewer-alts" id="vAlts"></div>
        <button class="viewer-close" aria-label="Close">×</button>
        <button class="viewer-nav prev" aria-label="Previous">‹</button><button class="viewer-nav next" aria-label="Next">›</button>
        <div class="viewer-tools">
          <button data-z="out" aria-label="Zoom out"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M16.5 16.5 21 21"/></svg></button>
          <span class="pct" id="vPct">100%</span>
          <button data-z="in" aria-label="Zoom in"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M11 8v6M16.5 16.5 21 21"/></svg></button>
          <span class="sep"></span>
          <button data-z="fit" aria-label="Fit to screen" title="Fit (0)"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
          <button data-z="one" aria-label="Actual size" title="Actual pixels"><svg viewBox="0 0 24 24"><path d="M7 8l2-1v10M15 8l2-1v10"/><circle cx="12" cy="10" r=".6"/><circle cx="12" cy="14" r=".6"/></svg></button>
          <button data-z="info" aria-label="Show or hide the story" title="Story"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg></button>
        </div>
      </div>
      <aside class="viewer-info" id="vInfo"></aside>`;
    document.body.appendChild(v); document.body.style.overflow = 'hidden';
    const stage = $('#vStage', v);
    const setInfo = () => { v.classList.toggle('no-info', !info); setTimeout(() => zoomer && zoomer.fit(), 30); };
    setInfo();
    const close = () => { zoomer && zoomer.destroy(); v.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
    const onKey = e => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
      else if (zoomer && zoomer.key(e)) e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    const go = d => { if (items.length < 2) return; i = (i + d + items.length) % items.length; alt = 0; load(); };
    v.querySelector('.viewer-close').onclick = close;
    v.querySelector('.prev').onclick = () => go(-1); v.querySelector('.next').onclick = () => go(1);
    v.querySelector('.viewer-tools').addEventListener('click', e => {
      const b = e.target.closest('[data-z]'); if (!b || !zoomer) return;
      ({ in: () => zoomer.zoomBy(1.3), out: () => zoomer.zoomBy(1 / 1.3), fit: () => zoomer.fit(), one: () => zoomer.actual(), info: () => { info = !info; setInfo(); } })[b.dataset.z]();
    });
    function load() {
      const it = items[i]; const imgs = it.data.img; const im = imgs[alt];
      const logo = /-logo\./.test(im.src);
      v.querySelectorAll('.viewer-nav').forEach(b => { b.hidden = items.length < 2; });
      $('#vAlts', v).innerHTML = imgs.length > 1 ? imgs.map((x, k) => `<button class="${k === alt ? 'on' : ''}" data-alt="${k}" aria-label="${k ? 'Logo' : 'Photo'}"><img src="assets/collection/${x.thumb}" alt=""></button>`).join('') : '';
      $$('#vAlts [data-alt]', v).forEach(b => { b.onclick = () => { alt = +b.dataset.alt; load(); }; });
      const M = C.months[it.month];
      $('#vInfo', v).innerHTML = `<div class="kicker">${esc(M.fr)}, ${esc(M.themeFr)}. Unlocked for ${esc(fmtFr(it.iso))}</div>
        <h2>${esc(it.data.name)}</h2>${it.data.sub ? `<div class="sub">${esc(it.data.sub)}</div>` : '<div style="height:12px"></div>'}
        ${it.data.paras.map(p => `<p>${esc(p)}</p>`).join('')}
        <p class="muted" style="font-size:13px">Tip: scroll or pinch to zoom, drag to move, double-click to zoom in or out.</p>`;
      stage.classList.toggle('light', logo);
      zoomer && zoomer.destroy(); zoomer = null;
      stage.querySelectorAll('img.vimg').forEach(n => n.remove());
      $('.viewer-loading', v).hidden = false;
      const img = new Image(); img.className = 'vimg'; img.alt = it.data.name; img.decoding = 'async';
      img.onload = () => {
        $('.viewer-loading', v).hidden = true;
        let w = img.naturalWidth || im.w || 1200, h = img.naturalHeight || im.h || 600;
        if (/\.svg$/.test(im.src) && w < 1400) { h = h * 1400 / w; w = 1400; }
        stage.insertBefore(img, stage.firstChild);
        zoomer = new window.Zoomer(stage, img, { w, h, max: Math.max(4, 4 * 1400 / Math.max(w, h)) * (logo ? 2 : 1), pad: logo ? 70 : 16, maxFit: logo ? 0.9 : 3, onChange: r => { $('#vPct', v).textContent = Math.round(r * 100) + '%'; } });
      };
      img.onerror = () => { $('.viewer-loading', v).textContent = 'This image could not be loaded.'; };
      img.src = 'assets/collection/' + im.src;
    }
    load();
  };

  // ======================= CARTE =======================
  let mapLoading = null;
  function loadMap() {
    if (window.FRANCE_MAP_SVG) return Promise.resolve();
    if (!mapLoading) mapLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/map_svg.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    return mapLoading;
  }
  const regionOf = r => r.startsWith('Grand Est') ? 'Grand Est' : r.startsWith('Overseas') ? 'Outre-mer' : r;

  GE.views.map = (root, args) => {
    const DEP = window.DEPARTMENTS;
    const keys = Object.keys(DEP);
    const regions = [...new Set(keys.map(k => regionOf(DEP[k].region)))];
    root.innerHTML = `<div class="page-head"><div><h1>La carte de France</h1><p>101 departments, from Ain to Mayotte. Hover to name them, click to read what makes each one unique. Zoom with the wheel or a pinch, drag to move.</p></div></div>
      <div class="map-layout">
        <div class="map-stage hide-cities" id="mapStage"><div class="viewer-loading" style="color:var(--ardoise)">Loading the map…</div>
          <div class="map-tools"><button data-m="in" aria-label="Zoom in">+</button><button data-m="out" aria-label="Zoom out">−</button><button data-m="fit" aria-label="Fit map">⤢</button></div></div>
        <div class="map-side">
          <section class="panel"><label class="field" style="margin:0"><span>Find a department</span><input type="search" id="depSearch" list="depList" placeholder="Name or number, e.g. 75 or Gironde"></label>
            <datalist id="depList">${keys.map(k => `<option value="${k} — ${esc(DEP[k].name)}">`).join('')}</datalist></section>
          <section class="panel dep-card" id="depCard"></section>
          <section class="panel"><h3>Regions</h3><div class="legend" id="legend">${regions.map(r => `<button data-r="${esc(r)}"><i style="background:${C.regionColors[r] || '#eee'}"></i>${esc(r)}</button>`).join('')}</div>
            <h3 style="margin-top:16px">Labels</h3><div class="toggles">
              <label><input type="checkbox" data-t="num" checked> Numbers</label><label><input type="checkbox" data-t="names" checked> Names</label>
              <label><input type="checkbox" data-t="pref" checked> Prefectures</label><label><input type="checkbox" data-t="cities"> City dots</label></div></section>
        </div>
      </div>`;
    const card = $('#depCard', root);
    const overview = () => {
      card.innerHTML = `<h3>France in brief</h3><div class="facts">
        <div><b>101</b><span>departments (96 in Europe, 5 overseas)</span></div><div><b>18</b><span>regions (13 in Europe, 5 overseas)</span></div>
        <div><b>68.6 M</b><span>people (INSEE, 1 Jan 2025)</span></div><div><b>643,801</b><span>km², including overseas</span></div></div>
        <p class="muted" style="margin-top:12px">Created in 1790 so that every citizen could reach the prefecture within a day’s ride, the departments are still numbered in near-alphabetical order. Those numbers appear on postcodes and, by choice, on car plates.</p>`;
    };
    overview();
    let zoomer = null, sel = null;
    loadMap().then(() => {
      const stage = $('#mapStage', root); if (!stage) return;
      const wrap = document.createElement('div'); wrap.innerHTML = window.FRANCE_MAP_SVG;
      const svg = wrap.querySelector('svg'); svg.setAttribute('width', '1080'); svg.setAttribute('height', '1044.25'); svg.style.background = '#fff';
      const credit = svg.querySelector('#credit-text-svg'); // keep the mapchart credit visible
      stage.querySelector('.viewer-loading').remove();
      stage.insertBefore(wrap, stage.firstChild);
      ['Department_Names', 'Department_Numbers', 'Prefecture_Names', 'Cities', 'sidemap', 'state_borders', 'state_lines'].forEach(id => { const n = svg.querySelector('#' + id); if (n) n.style.pointerEvents = 'none'; });
      const paths = $$('path[id^="Dep_"]', svg);
      paths.forEach(p => { const k = p.id.slice(4); const d = DEP[k]; if (d) p.setAttribute('fill', C.regionColors[regionOf(d.region)] || '#eee'); });
      zoomer = new window.Zoomer(stage, wrap, { w: 1080, h: 1044.25, pad: 10, max: 12 });
      GE.cleanup = () => { zoomer && zoomer.destroy(); tip.remove(); };
      const tip = document.createElement('div'); tip.className = 'map-tip'; tip.hidden = true; document.body.appendChild(tip);
      stage.addEventListener('pointermove', e => {
        const p = e.target.closest && e.target.closest('path[id^="Dep_"]');
        if (!p || zoomer.pointers.size) { tip.hidden = true; return; }
        const d = DEP[p.id.slice(4)]; if (!d) { tip.hidden = true; return; }
        tip.hidden = false; tip.textContent = `${p.id.slice(4)} — ${d.name}`; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
      });
      stage.addEventListener('pointerleave', () => { tip.hidden = true; });
      stage.addEventListener('click', e => {
        if (zoomer.moved > 6) return;
        const p = e.target.closest('path[id^="Dep_"]'); if (p) select(p.id.slice(4));
      });
      root.querySelector('.map-tools').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; ({ in: () => zoomer.zoomBy(1.4), out: () => zoomer.zoomBy(1 / 1.4), fit: () => zoomer.fit() })[b.dataset.m](); });
      if (args[0] && DEP[args[0]]) select(args[0]);
    }).catch(() => { const st = $('#mapStage', root); if (st) st.querySelector('.viewer-loading').textContent = 'The map file (js/map_svg.js) could not be loaded.'; });

    function select(k, focus = true) {
      const d = DEP[k]; if (!d) return;
      const stage = $('#mapStage', root);
      $$('path.sel', stage).forEach(p => p.classList.remove('sel'));
      const p = stage.querySelector('#Dep_' + k); if (p) p.classList.add('sel');
      sel = k;
      card.innerHTML = `<div class="head"><span class="num-badge">${k}</span><div><h2 style="font-size:26px">${esc(d.name)}</h2><div class="muted">${esc(regionOf(d.region))}</div></div></div>
        <dl><dt>Prefecture</dt><dd>${esc(d.pref)}</dd><dt>Region</dt><dd>${esc(d.region)}</dd></dl>
        <p>${esc(d.desc)}</p><button class="btn btn-sm" id="depBack">Back to overview</button>`;
      $('#depBack', card).onclick = () => { $$('path.sel', stage).forEach(x => x.classList.remove('sel')); sel = null; overview(); };
      if (focus && p && zoomer && innerWidth > 1020) {
        const bb = p.getBBox(); const r = stage.getBoundingClientRect();
        const target = Math.min(zoomer.fitS * 2.4, Math.min(r.width / (bb.width * 3), r.height / (bb.height * 3)));
        const s = Math.max(zoomer.fitS * 1.6, target);
        zoomer.s = s; zoomer.x = r.width / 2 - (bb.x + bb.width / 2) * s; zoomer.y = r.height / 2 - (bb.y + bb.height / 2) * s; zoomer.clampPan(); zoomer.apply();
      }
      if (innerWidth <= 1020) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    $('#depSearch', root).addEventListener('change', e => {
      const q = e.target.value.trim().toLowerCase(); if (!q) return;
      const k = keys.find(k => q.startsWith(k.toLowerCase() + ' ') || q === k.toLowerCase()) || keys.find(k => DEP[k].name.toLowerCase() === q) || keys.find(k => DEP[k].name.toLowerCase().includes(q) || DEP[k].pref.toLowerCase().includes(q));
      if (k) select(k); else GE.toast('No department matches that search.', 'err');
    });
    $('#legend', root).addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      const on = !b.classList.contains('on');
      $$('#legend button', root).forEach(x => x.classList.remove('on'));
      const stage = $('#mapStage', root);
      $$('path[id^="Dep_"]', stage).forEach(p => { const d = DEP[p.id.slice(4)]; p.classList.toggle('dim', on && (!d || regionOf(d.region) !== b.dataset.r)); });
      if (on) b.classList.add('on');
    });
    root.querySelector('.toggles').addEventListener('change', e => {
      const t = e.target.dataset.t; const stage = $('#mapStage', root);
      stage.classList.toggle('hide-' + t, !e.target.checked);
    });
  };

  // ======================= MÉDIATHÈQUE =======================
  GE.views.media = (root) => {
    const groups = ['songs', 'history', 'culture'];
    root.innerHTML = `<div class="page-head"><div><h1>La médiathèque</h1><p>Songs, history and the French art of living. Videos play from youtube-nocookie.com, YouTube’s privacy-enhanced mode, and only load when you press play.</p></div></div>
      ${groups.map(g => `<section class="media-group"><header><h2>${C.videoGroups[g].fr}</h2><p>${C.videoGroups[g].en}</p></header>
        <div class="video-grid">${C.videos.filter(v => v.group === g).map(v => `<article class="video">
          <div class="frame" data-yt="${v.id}"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">
            <button class="play" aria-label="Play ${esc(v.title)}"><span><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg></span></button></div>
          <div class="meta"><b>${esc(v.title)}</b><small>${esc(v.by)}</small><div><a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Open on YouTube</a></div></div>
        </article>`).join('')}</div></section>`).join('')}`;
    root.addEventListener('click', e => {
      const b = e.target.closest('.play'); if (!b) return;
      const fr = b.closest('.frame'); const id = fr.dataset.yt;
      // only one video at a time: restore any other frame
      $$('.frame.playing', root).forEach(f => { f.classList.remove('playing'); f.innerHTML = f._facade; });
      fr._facade = fr.innerHTML; fr.classList.add('playing');
      fr.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      GE.pauseMusic();
    });
  };

  // ======================= COURAGE & RÈGLES =======================
  GE.views.courage = (root) => {
    const P = GE.P;
    let qi = Math.abs(G.D.diff(G.START, GE.today())) % C.quotes.length;
    const settled = Object.values(P.days).filter(d => d.result);
    const hard = settled.filter(d => 'DE'.includes(d.result.tier)).length;
    const after = (() => { let n = 0, prevBad = false, iso = G.START; while (iso <= G.END) { const d = P.days[iso]; const t = d && d.result && d.result.tier; if (t && prevBad && 'CBA'.includes(t)) n++; if (t) prevBad = 'DE'.includes(t); iso = G.D.add(iso, 1); } return n; })();
    const q = () => C.quotes[qi];
    root.innerHTML = `
      <section class="courage-hero">
        <div class="q-fr" id="qFr">« ${esc(q().fr)} »</div>
        <div class="q-en" id="qEn">${esc(q().en)}</div>
        <div class="q-by" id="qBy">${esc(q().by)}</div>
        <button class="btn" id="qNext">Another word of courage</button>
      </section>
      <div class="two-col">
        <section class="panel letter">
          <h2>A letter from the Government</h2>
          <p>Dear ${esc(P.name)},</p>
          <p>No nation ever rose in a straight line. France has known wars, plagues, revolutions and bankruptcies, and each time it was rebuilt by people who simply did the next useful thing, then the one after that. That is what we ask of you: not perfection, only continuation.</p>
          <p>Some days you will finish everything. Some days you will not. A closed day is closed; its numbers are honest, and that honesty is what makes your progress real. Tomorrow’s page is always blank, always yours, and always worth sealing.</p>
          <p>Whatever happened today, you are still in the programme. Plan a little smaller if you must, keep the promise you make, and let the compounding do its quiet work. We are, truly, growing together.</p>
          <div class="sign">Le Gouvernement</div>
        </section>
        <section class="panel">
          <h2>After a hard day</h2>
          <p class="muted">Three moves that turn a bad day into a turning point.</p>
          <ol class="steps">
            <li><div><b>Let it close.</b> The deduction is small: one perfect day all but erases two hard ones. Don’t carry yesterday into today.</div></li>
            <li><div><b>Shrink tomorrow.</b> Plan three tasks you are sure you can finish. A 100% day on a short list beats 60% on a long one.</div></li>
            <li><div><b>Seal it early.</b> Seal before noon so you commit while your energy is fresh, then do the hardest block first.</div></li>
          </ol>
          <div class="facts" style="margin-top:20px">
            <div><b>${settled.length}</b><span>days closed so far</span></div>
            <div><b>${after}</b><span>comebacks after a hard day${hard ? ` (of ${hard} hard days)` : ''}</span></div>
          </div>
        </section>
      </div>
      <section class="panel" style="margin-bottom:22px"><h2>Sagesse française</h2><p class="muted">Fables and proverbs to carry through the term.</p>
        <ul class="proverbs" style="columns:2 320px;display:block">${C.quotes.map(x => `<li style="break-inside:avoid;margin-bottom:14px"><div class="fr">${esc(x.fr)}</div><div class="en">${esc(x.en)} <i>— ${esc(x.by)}</i></div></li>`).join('')}</ul></section>

      <div class="page-head" style="margin-top:36px"><div><h1>Les règles du jeu</h1><p>How Grandir Ensemble works, from the first time block to the last day of April.</p></div></div>
      <section class="panel" style="margin-bottom:22px"><h2>A day, step by step</h2>
        <div class="flow">
          <div><b>Plan</b><span>List your tasks as time blocks between 00:00 and 24:00. Hours and minutes are editable.</span></div>
          <div><b>Seal</b><span>Press the wax seal. Plans made in advance seal themselves when their day begins.</span></div>
          <div><b>Do</b><span>Tick tasks as you finish them. Changing a sealed plan costs 1 gem per revision.</span></div>
          <div><b>Close</b><span>Close the day yourself, or it closes at midnight with what is ticked.</span></div>
          <div><b>Reward</b><span>Your share of tasks done sets the gems and the boost; your stamp is revealed.</span></div>
        </div></section>
      <div class="two-col">
        <section class="panel"><h2>Rewards</h2>
          <div class="table-wrap"><table class="tier-table"><thead><tr><th>Share of the to-do list done</th><th>Indicators</th><th>Gems</th></tr></thead><tbody>
          ${G.TIER_ORDER.map(k => { const t = G.TIERS[k]; return `<tr><td><span class="tier-pill t-${k}">${t.range}</span></td><td class="num ${t.rate >= 0 ? 'delta up' : 'delta down'}">${t.rate >= 0 ? 'boost' : 'deduction'} ${Math.abs(t.rate * 100).toFixed(2)}%</td><td class="num">${t.gems > 0 ? '+' : '−'}${Math.abs(t.gems)} ${GE.gem()}</td></tr>`; }).join('')}
          </tbody></table></div>
          <p class="muted" style="margin-top:12px">The boost or deduction is applied to the élan national, the engine behind all ten indicators. See the Indicateurs tab for the full maths. Gems never go below zero.</p></section>
        <section class="panel"><h2>Rules of the programme</h2>
          <ul>
            <li><b>The term</b> runs from 1 January to 30 April 2027: 120 days. With a real-calendar profile, days before you joined are not counted.</li>
            <li><b>Stamps.</b> Every day you log a plan unlocks that day’s stamp, regardless of the outcome: beautiful spots in January, churches in February, French foods in March and French brands in April.</li>
            <li><b>Revisions.</b> On the day itself, once the plan is sealed, each change (adding, removing or editing a task) costs 1 gem. Ticking tasks off is always free. Planning future days is free.</li>
            <li><b>Missed days.</b> A day with no plan counts as “under 30%”: −0.30% and −3 gems, and no stamp.</li>
            <li><b>Starting treasury.</b> ${G.STARTING_GEMS} gems, enough for a few honest corrections.</li>
            <li><b>Medals</b> come with days at 50% or better: bronze at 5, silver at 15, vermeil at 30, gold at 50.</li>
          </ul></section>
      </div>
      <section class="panel" style="margin-bottom:22px"><h2>Distinctions</h2><p class="muted">${Object.keys(P.ach).length} of ${G.ACH.length} earned.</p>
        <div class="badges">${G.ACH.map(a => `<div class="badge ${P.ach[a.id] ? '' : 'off'}">${GE.medal('')}<div><b>${esc(a.name)}</b><small>${esc(a.en)}</small></div></div>`).join('')}</div></section>
      <section class="panel faq"><h2>Questions</h2>
        <details><summary>Where is my data stored?</summary><p>Only in this browser, on this device. Use “Download a backup” in the profile menu to keep a copy or move to another device, then “Restore from a backup” there.</p></details>
        <details><summary>Can I try the game before January 2027?</summary><p>Yes. Create a Practice profile: it starts on 1 January 2027 and you move the date forward yourself with the bar under the header. Your real profile is unaffected.</p></details>
        <details><summary>What if I forget to seal today’s plan?</summary><p>Tasks can only be ticked on a sealed plan. If the day ends unsealed, it counts as under 30%. Plans written on an earlier day seal themselves automatically, so planning the evening before is the safest habit.</p></details>
        <details><summary>Do my tasks need to be equal in size?</summary><p>Completion is counted per task, so one long block counts the same as a short one. Split big work into blocks of similar weight for a fairer score.</p></details>
        <details><summary>Are the indicators real statistics?</summary><p>No. They are a game model calibrated on real sources (UNDP Human Development Report 2025, World Happiness Report 2025, Global Peace Index 2025, OECD PISA 2022, World Bank, Atout France). The “France today” lines on each card give the real reference.</p></details>
        <details><summary>Is this an official government site?</summary><p>No. The government voice is role-play for a personal productivity game. It is not affiliated with the French Government.</p></details>
      </section>`;
    $('#qNext', root).onclick = () => {
      qi = (qi + 1) % C.quotes.length;
      $('#qFr', root).textContent = `« ${q().fr} »`; $('#qEn', root).textContent = q().en; $('#qBy', root).textContent = q().by;
    };
  };
})();
