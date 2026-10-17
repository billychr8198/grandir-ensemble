/* ==========================================================================
   Grandir Ensemble — Accueil, Calendrier and the daily planner
   ========================================================================== */
(function () {
  'use strict';
  const G = window.Game, E = window.Economy, C = window.CONTENT, GE = window.GE;
  const { $, $$, esc, fmtFr, fmtEn, fmtEnLong, pct, elan } = GE;
  const MONTHS = ['jan', 'feb', 'mar', 'apr'];
  const catOf = id => C.categories.find(c => c.id === id) || C.categories[0];
  const catVar = id => `--cat: var(--c-${catOf(id).id})`;

  function dayIndex(iso) { return G.D.diff(G.START, iso); }
  function communique(iso) { const i = Math.abs(dayIndex(iso)) % C.communiques.length; return C.communiques[i]; }

  // ======================= ACCUEIL =======================
  GE.views.home = (root) => {
    const P = GE.P, t = GE.today();
    const pre = t < G.START, post = t > G.END;
    const focus = pre ? G.START : post ? G.END : t;
    const s = G.stats(P, focus), m = G.mode(P, focus);
    const snap = E.snapshot(P.K);
    const prevK = (() => { const ser = G.series(P); return ser.length > 1 ? ser[ser.length - 2].K : 1; })();
    const snapPrev = E.snapshot(prevK);
    const med = G.medal(P), streak = G.streak(P);
    const unlocked = G.unlockedSet(P).size;
    const it = GE.itemFor(focus);
    const lastSettled = Object.keys(P.days).filter(k => P.days[k].settled).sort().pop();

    let todayBlock;
    if (pre) {
      const n = G.D.diff(t, G.START);
      todayBlock = `<div class="countdown"><span class="num">J−${n}</span><span class="muted">before the term opens on 1 January 2027</span></div>
        <p>Plans made before a day begins are free to edit, and they seal themselves when that day arrives. Use the time to prepare January.</p>
        <a class="btn btn-primary btn-lg" href="#/day/${G.START}">Plan 1 January</a>`;
    } else if (post) {
      todayBlock = `<h3>The term is complete.</h3><p class="muted">Your indicators, stamps and distinctions are kept here. Look back at what you built.</p>
        <a class="btn btn-primary" href="#/indicators">See the final indicators</a>`;
    } else if (m === 'before-term') {
      todayBlock = `<p>Your term began on ${fmtFr(P.startDate)}.</p>`;
    } else {
      const label = { planning: s.total ? 'Plan written, not sealed yet' : 'No plan yet for today', sealed: 'Plan sealed. Time to do it.', closed: 'Today is closed.' }[m] || '';
      todayBlock = `<div class="today-row">
          <div class="ring" style="--p:${Math.round(s.pct)}"><div><b>${Math.round(s.pct)}%</b><small>${s.done}/${s.total}</small></div></div>
          <div class="today-meta"><h3>${label}</h3>
            <p>${m === 'sealed' ? `If you close now: <b>${s.tier.label}</b>, ${pct(s.tier.rate)} élan, ${s.tier.gems > 0 ? '+' : ''}${s.tier.gems} gems.` : m === 'planning' ? 'Write your time blocks, then press the seal. Edits are free until you seal.' : 'Come back tomorrow for a new page.'}</p>
            <a class="btn btn-primary" href="#/day/${t}">${m === 'closed' ? 'Review today' : m === 'sealed' ? 'Open today’s plan' : 'Plan today'}</a>
          </div></div>`;
    }

    root.innerHTML = `
      <div class="home-grid">
        <section class="communique">
          <div class="from">Communiqué du Gouvernement</div>
          <div class="date-big">${esc(fmtFr(focus).replace(/ 2027$/, ''))} <em>2027</em></div>
          <blockquote>“${esc(communique(focus))}”</blockquote>
          ${todayBlock}
        </section>
        <div class="side-stack">
          <section class="panel treasury">
            <div><div class="label">Treasury</div><div class="big">${GE.gem()}${P.gems}</div><div class="muted" style="font-size:13px">gems</div></div>
            <div><div class="label">Élan national</div><div class="big">${elan(P.K)}</div><div class="muted" style="font-size:13px">started at 100.00</div></div>
            <div class="medal-row">${GE.medal()}<div style="flex:1;min-width:0"><b>${esc(med.name)}</b><div class="muted" style="font-size:13px">${esc(med.en)}. ${streak ? `Streak: ${streak} day${streak > 1 ? 's' : ''} at 50% or more.` : 'Build a streak with days at 50% or more.'}</div>
              ${med.next ? `<div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, (med.good - med.at) / (med.next.at - med.at) * 100)}%"></i></div><div class="muted" style="font-size:12px;margin-top:3px">${med.next.at - med.good} good days to ${esc(med.next.name)}</div>` : ''}</div></div>
          </section>
          ${it ? `<section class="panel next-stamp">
            ${(G.unlockedSet(P).has(focus)) ? `<button class="stamp" data-view="${focus}">${GE.stampHTML(it, { nocap: true })}</button>` : `<div class="stamp locked today-lock"><div class="face"><span>?</span></div></div>`}
            <div><div class="muted" style="font-size:13px">${esc(C.months[it.month].themeFr)}</div><h3>${G.unlockedSet(P).has(focus) ? esc(it.data.name) : 'Today’s stamp is waiting'}</h3>
            <p class="muted" style="margin:4px 0 8px;font-size:14px">${G.unlockedSet(P).has(focus) ? 'Unlocked. Open it to read its story.' : 'Log a plan for this day and close it to reveal it, whatever the result.'}</p>
            <a href="#/album">Album: ${unlocked} of 120</a></div>
          </section>` : ''}
          ${lastSettled ? (() => { const r = P.days[lastSettled].result; const tier = G.TIERS[r.tier]; return `<section class="panel last-result">${GE.postmark(r.tier, r.total ? Math.round(r.pct) + '%' : '—').replace('class="stampmark"', 'class="stampmark" style="width:64px;height:64px;flex:none"')}<div><div class="muted" style="font-size:13px">Last closed day, ${fmtEn(lastSettled)}</div><b>${tier.label}</b><div class="muted" style="font-size:14px">${pct(r.rate)} élan, ${r.gems > 0 ? '+' : ''}${r.gems} gems</div></div></section>`; })() : ''}
        </div>
      </div>
      <div class="ind-mini">
        ${E.INDICATORS.map(ind => {
          const a = ind.raw(snap), b = ind.raw(snapPrev); const d = a - b;
          const good = ind.better === 'low' || ind.better === 'rank' ? (ind.key === 'health' ? d > 0 : d < 0) : d > 0;
          const cls = Math.abs(d) < 1e-9 ? 'flat' : good ? 'up' : 'down';
          const arrow = ind.key === 'health' ? (good ? '▲' : '▼') : (d > 0 ? '▲' : '▼');
          return `<a href="#/indicators/${ind.key}"><div class="n">${ind.name}</div><div class="v">${ind.value(snap)}</div><div class="delta ${cls}">${cls === 'flat' ? 'unchanged' : `${arrow} ${good ? 'better' : 'worse'} since last day`}</div></a>`;
        }).join('')}
      </div>`;
    const vb = root.querySelector('[data-view]');
    if (vb) vb.onclick = () => GE.openViewer([GE.itemFor(vb.dataset.view)], 0);
  };

  // ======================= CALENDRIER =======================
  GE.views.calendar = (root, args) => {
    const P = GE.P, t = GE.today();
    let mk = args[0] && MONTHS.includes(args[0]) ? args[0] : (t >= G.START && t <= G.END ? MONTHS[Number(t.slice(5, 7)) - 1] : 'jan');
    const M = C.months[mk];
    const first = `${M.iso}-01`;
    const dow = (G.D.parse(first).getUTCDay() + 6) % 7; // Monday = 0
    const un = G.unlockedSet(P);
    const cells = [];
    for (let i = 0; i < dow; i++) cells.push('<div class="cal-cell pad" aria-hidden="true"></div>');
    for (let d = 1; d <= M.days; d++) {
      const iso = `${M.iso}-${String(d).padStart(2, '0')}`;
      const day = G.day(P, iso), mode = G.mode(P, iso), s = G.stats(P, iso);
      let info = '', pill = '', thumb = '';
      if (day.settled && day.result) {
        const r = day.result;
        pill = `<span class="tier-pill t-${r.tier}">${r.total ? Math.round(r.pct) + '%' : 'not logged'}</span>`;
        info = `${pct(r.rate)}<br>${r.gems > 0 ? '+' : r.gems < 0 ? '−' : ''}${Math.abs(r.gems)} gems`;
      } else if (mode === 'before-term') info = 'Before your term';
      else if (s.total) info = `${s.total} task${s.total > 1 ? 's' : ''}${mode === 'sealed' ? `, ${s.done} done` : ''}`;
      else if (iso >= t) info = iso === t ? 'Plan today' : '';
      if (mode === 'sealed') pill = `<span class="tier-pill t-B">Sealed</span>`;
      if (un.has(iso)) { const it = GE.itemFor(iso); thumb = `<span class="thumb stamp">${GE.stampHTML(it, { nocap: true }).replace(/<span class="val">.*?<\/span>/, '')}</span>`; }
      const cls = ['cal-cell', iso === t ? 'is-today' : '', iso < t ? 'is-past' : '', mode === 'before-term' ? 'before' : ''].join(' ');
      cells.push(`<a class="${cls}" href="#/day/${iso}" aria-label="${esc(fmtEnLong(iso))}"><span class="d">${d}</span>${pill}<span class="info">${info}</span>${thumb}</a>`);
    }
    while (cells.length % 7) cells.push('<div class="cal-cell pad" aria-hidden="true"></div>');
    root.innerHTML = `
      <div class="page-head">
        <div><h1>${M.fr} 2027</h1><p>Every day you log this month unlocks a stamp from <i>${M.themeFr}</i> (${M.theme}). Choose a day to plan it.</p></div>
        <nav class="month-switch" aria-label="Months">${MONTHS.map(k => `<a href="#/calendar/${k}" class="${k === mk ? 'on' : ''}">${C.months[k].fr}</a>`).join('')}</nav>
      </div>
      <div class="cal">
        <div class="cal-head">${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(d => `<div><span class="full">${d}</span></div>`).join('')}</div>
        <div class="cal-grid">${cells.join('')}</div>
      </div>
      <div class="cal-legend">${G.TIER_ORDER.map(k => `<span class="tier-pill t-${k}">${G.TIERS[k].range}</span>`).join('')}<span>Red outline: today</span></div>`;
    if (innerWidth < 760) $$('.cal-head .full', root).forEach(s => { s.textContent = s.textContent.slice(0, 2); });
  };

  // ======================= DAY PLANNER =======================
  GE.views.day = (root, args) => {
    const P = GE.P;
    let iso = args[0];
    if (!iso || !/^\d{4}-\d\d-\d\d$/.test(iso) || !G.D.inWindow(iso)) iso = G.D.max(G.START, G.D.min(GE.today(), G.END));
    renderDay(root, iso);
  };

  function laneLayout(tasks) {
    const ev = tasks.map(t => ({ t, s: G.T.toMin(t.start), e: Math.max(G.T.toMin(t.end), G.T.toMin(t.start) + 15) })).sort((a, b) => a.s - b.s || a.e - b.e);
    let cluster = [], lanesEnd = [], maxEnd = -1;
    const flush = () => { const n = lanesEnd.length; cluster.forEach(x => { x.n = n; }); cluster = []; lanesEnd = []; };
    for (const x of ev) {
      if (x.s >= maxEnd && cluster.length) flush();
      let lane = lanesEnd.findIndex(end => end <= x.s);
      if (lane < 0) { lane = lanesEnd.length; lanesEnd.push(x.e); } else lanesEnd[lane] = x.e;
      x.lane = lane; cluster.push(x); maxEnd = Math.max(maxEnd, x.e);
    }
    flush();
    // overlap marker
    ev.forEach(x => { x.overlap = ev.some(y => y !== x && y.s < x.e && x.s < y.e); });
    return ev;
  }

  function hmField(name, val, label) {
    const [h, m] = val.split(':');
    return `<span class="hm" role="group" aria-label="${label}"><input type="number" min="0" max="24" data-hm="${name}-h" value="${h}" aria-label="${label} hour"><span class="colon">:</span><input type="number" min="0" max="59" data-hm="${name}-m" value="${m}" aria-label="${label} minutes"></span>`;
  }
  function readHM(row, name) {
    let h = parseInt(row.querySelector(`[data-hm="${name}-h"]`).value, 10); let m = parseInt(row.querySelector(`[data-hm="${name}-m"]`).value, 10);
    if (isNaN(h)) h = 0; if (isNaN(m)) m = 0;
    h = Math.max(0, Math.min(24, h)); m = Math.max(0, Math.min(59, m)); if (h === 24) m = 0;
    return G.T.fromMin(h * 60 + m);
  }
  const durTxt = (a, b) => { const d = G.T.toMin(b) - G.T.toMin(a); if (d <= 0) return '<span class="warn">ends before it starts</span>'; const h = Math.floor(d / 60), m = d % 60; return `${h ? h + ' h' : ''}${h && m ? ' ' : ''}${m ? m + ' min' : ''}`; };
  const catSelect = (val) => `<select data-f="cat" aria-label="Category">${C.categories.map(c => `<option value="${c.id}" ${c.id === val ? 'selected' : ''}>${c.fr} — ${c.en}</option>`).join('')}</select>`;

  function renderDay(root, iso) {
    const P = GE.P, t = GE.today();
    const day = G.day(P, iso), mode = G.mode(P, iso);
    const free = mode === 'future' || mode === 'planning';
    const s = G.stats(P, iso);
    const it = GE.itemFor(iso); const unlocked = G.unlockedSet(P).has(iso);
    const prev = G.D.add(iso, -1), next = G.D.add(iso, 1);
    const tasks = day.tasks.slice().sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    if (free) day.tasks.sort((a, b) => a.start.localeCompare(b.start)); // keep stored order tidy

    const banner = {
      future: [`${GE.seal('GE', 'ico')}`, `<b>Free planning.</b> Change anything at no cost. This plan seals itself automatically when ${fmtEn(iso)} begins${t < G.START ? '' : ''}.`, 'planning'],
      planning: [`${GE.seal('GE', 'ico')}`, `<b>Today, unsealed.</b> Edits are free until you seal the plan. Once sealed, every change costs 1 gem, and you can start ticking tasks off.`, 'planning'],
      sealed: [`${GE.seal('GE', 'ico')}`, `<b>Sealed plan.</b> Tick tasks as you finish them. Changing the plan now costs 1 gem per revision (${day.revisions} so far today). You have ${P.gems} gems.`, 'sealed'],
      closed: ['', day.result ? `<b>Closed.</b> ${G.TIERS[day.result.tier].label}: ${day.result.total ? `${day.result.done} of ${day.result.total} tasks` : 'no plan logged'}, ${pct(day.result.rate)} élan, ${day.result.gems > 0 ? '+' : ''}${day.result.gems} gems.${day.revisions ? ` ${day.revisions} paid revision${day.revisions > 1 ? 's' : ''}.` : ''}` : '<b>This day has passed.</b> It will be counted the next time the programme updates.', 'closed'],
      'before-term': ['', '<b>Before your term.</b> Your programme started on ' + fmtFr(P.startDate) + '. Days before it are not counted.', 'closed']
    }[mode];

    root.innerHTML = `
      <div class="day-head">
        <div><div class="crumbs"><a href="#/calendar/${MONTHS[Number(iso.slice(5, 7)) - 1]}">${C.months[MONTHS[Number(iso.slice(5, 7)) - 1]].fr} 2027</a>${iso === t ? ' — today' : ''}</div>
          <h1>${esc(fmtFr(iso))}</h1></div>
        <div class="day-nav">
          <a class="btn btn-sm" href="#/day/${prev}" ${G.D.inWindow(prev) ? '' : 'hidden'} aria-label="Previous day">‹ ${fmtEn(prev)}</a>
          ${iso !== t && G.D.inWindow(t) ? `<a class="btn btn-sm" href="#/day/${t}">Today</a>` : ''}
          <a class="btn btn-sm" href="#/day/${next}" ${G.D.inWindow(next) ? '' : 'hidden'} aria-label="Next day">${fmtEn(next)} ›</a>
        </div>
      </div>
      <div class="state-banner ${banner[2]}">${banner[0]}<p>${banner[1]}</p>
        ${unlocked ? `<button class="btn btn-sm" id="openStamp">View today’s stamp: ${esc(it.data.name)}</button>` : ''}</div>
      <div class="planner">
        <section class="timeline-wrap" aria-label="24-hour timeline">
          <div class="timeline-top"><span>00:00 to 24:00</span><span>${free || mode === 'sealed' ? 'Click an empty hour to add a block' : ''}</span></div>
          <div class="timeline-scroll" id="tlScroll"><div class="timeline" id="timeline"></div></div>
        </section>
        <section class="tasks-panel">
          <div class="tasks-top"><h2>To-do list</h2>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${free ? `<button class="btn btn-sm" id="copyFrom">${GE.ico.copy.replace('<svg', '<svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8"')} Copy from another day</button>` : ''}
              ${free && s.total && G.D.inWindow(next) ? `<button class="btn btn-sm" id="repeatNext">Repeat on ${fmtEn(next)}</button>` : ''}
            </div></div>
          ${s.total ? `<div class="progress-line"><div class="bar"><i style="width:${s.pct}%"></i></div><b class="num">${Math.round(s.pct)}%</b><span class="muted">${s.done}/${s.total}</span></div>` : ''}
          <div id="taskList"></div>
          ${free || mode === 'sealed' ? `<div class="add-row"><button class="btn btn-primary" id="addTask">Add a task${mode === 'sealed' ? ` <span style="opacity:.85">(1 ${GE.gem()})</span>` : ''}</button></div>` : ''}
          <div id="dayFooter"></div>
        </section>
      </div>`;

    // ----- task list -----
    const list = $('#taskList', root);
    const paint = () => {
      const cur = G.day(P, iso);
      if (!cur.tasks.length) {
        list.innerHTML = `<div class="empty"><h3>${free ? 'An empty page' : 'Nothing was planned'}</h3><p>${free ? 'Add your first time block, or click an hour on the timeline.' : mode === 'sealed' ? '' : 'This day had no plan.'}</p></div>`;
        return;
      }
      if (free) {
        list.innerHTML = cur.tasks.map(tk => `
          <div class="task edit" data-id="${tk.id}" style="${catVar(tk.cat)}">
            <div class="edit-main">
              <div class="edit-row"><input class="title-in" data-f="title" value="${esc(tk.title)}" placeholder="What will you do?" maxlength="120" aria-label="Task">${catSelect(tk.cat)}</div>
              <div class="edit-row"><span class="hm-label">From</span>${hmField('start', tk.start, 'Start')}<span class="hm-label">to</span>${hmField('end', tk.end, 'End')}<span class="dur" data-dur>${durTxt(tk.start, tk.end)}</span></div>
            </div>
            <div class="task-actions"><button class="del" data-act="del" aria-label="Delete task">${GE.ico.trash}</button></div>
          </div>`).join('');
      } else {
        const sorted = cur.tasks.slice().sort((a, b) => a.start.localeCompare(b.start));
        list.innerHTML = sorted.map(tk => `
          <div class="task ${tk.done ? 'is-done' : ''}" data-id="${tk.id}" style="${catVar(tk.cat)}">
            <button class="chk ${tk.done ? 'on' : ''}" data-act="done" ${mode === 'sealed' ? '' : 'disabled'} aria-pressed="${tk.done}" aria-label="${tk.done ? 'Mark as not done' : 'Mark as done'}">${GE.check}</button>
            <div class="body"><div class="t-title">${esc(tk.title || 'Untitled task')}</div>
              <div class="t-meta"><span class="num">${tk.start} – ${tk.end}</span><span class="cat"><i></i>${catOf(tk.cat).fr}</span></div></div>
            ${mode === 'sealed' ? `<div class="task-actions"><button data-act="rev" aria-label="Revise task (1 gem)" title="Revise (1 gem)">${GE.ico.edit}</button><button class="del" data-act="del" aria-label="Remove task (1 gem)" title="Remove (1 gem)">${GE.ico.trash}</button></div>` : '<span></span>'}
          </div>`).join('');
      }
    };
    paint();

    // ----- footer: seal / close / forecast -----
    const footer = () => {
      const cur = G.day(P, iso); const st = G.stats(P, iso); const md = G.mode(P, iso);
      let h = '';
      if (md === 'planning' && cur.tasks.length) {
        h += `<div class="seal-cta"><button class="seal-btn" id="sealBtn" aria-label="Seal today's plan">${GE.seal('GE')}</button>
          <div><h3>Seal today’s plan</h3><p class="muted">Sealing commits you to these ${cur.tasks.length} task${cur.tasks.length > 1 ? 's' : ''}. After that, each change costs 1 gem.</p></div></div>`;
      }
      if (md === 'sealed' || (md === 'planning' && cur.tasks.length) || md === 'future') {
        const tier = st.total ? st.tier : G.TIERS.E;
        h += `<div class="forecast">${md === 'future' ? 'When this day comes,' : 'If you close the day now,'} at <b>${Math.round(st.pct)}%</b> you would receive <b>${tier.label}</b>: ${pct(tier.rate)} élan and ${tier.gems > 0 ? '+' : ''}${tier.gems} gems.
          ${md !== 'future' ? `<br><span class="muted">${G.TIER_ORDER.slice(0, 3).map(k => `${G.TIERS[k].range} → ${G.TIERS[k].gems > 0 ? '+' : ''}${G.TIERS[k].gems}`).join(', ')} gems.</span>` : ''}</div>`;
      }
      if (md === 'sealed') h += `<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-rouge btn-lg" id="closeDay">Close the day and receive the result</button></div>`;
      $('#dayFooter', root).innerHTML = h;
      const sb = $('#sealBtn', root); if (sb) sb.onclick = doSeal;
      const cd = $('#closeDay', root); if (cd) cd.onclick = doClose;
    };
    footer();

    // ----- timeline -----
    const tl = $('#timeline', root);
    const H = 52;
    const paintTimeline = () => {
      const cur = G.day(P, iso); const md = G.mode(P, iso);
      let h = '';
      for (let i = 0; i <= 24; i++) h += `<div class="tl-hour ${i < 24 ? 'half' : 'last'}" style="top:${i * H}px"><span>${String(i).padStart(2, '0')}:00</span></div>`;
      if (md === 'future' || md === 'planning' || md === 'sealed') for (let i = 0; i < 24; i++) h += `<div class="tl-slot" data-hour="${i}" style="top:${i * H}px" title="Add a block at ${String(i).padStart(2, '0')}:00"></div>`;
      const lay = laneLayout(cur.tasks);
      for (const x of lay) {
        const top = x.s / 60 * H, ht = Math.max(16, (x.e - x.s) / 60 * H - 2);
        const left = `calc(58px + (100% - 66px) * ${x.lane / x.n})`, width = `calc((100% - 66px) / ${x.n} - 3px)`;
        h += `<button class="tl-block ${x.t.done ? 'done' : ''} ${x.overlap ? 'overlap' : ''}" data-id="${x.t.id}" style="${catVar(x.t.cat)};top:${top}px;height:${ht}px;left:${left};width:${width}" title="${esc(x.t.title)} ${x.t.start}–${x.t.end}${x.overlap ? ' (overlaps another block)' : ''}"><b>${esc(x.t.title || 'Untitled')}</b>${ht > 30 ? `<small>${x.t.start} – ${x.t.end}</small>` : ''}</button>`;
      }
      if (iso === GE.today()) h += `<div class="tl-now" id="tlNow"></div>`;
      tl.innerHTML = h;
      GE.updateNowLine();
    };
    GE.updateNowLine = () => { const n = $('#tlNow'); if (n) n.style.top = (G.T.nowMin() / 60 * H) + 'px'; };
    paintTimeline();
    // scroll to the first task or to now
    const sc = $('#tlScroll', root);
    const firstMin = day.tasks.length ? Math.min(...day.tasks.map(x => G.T.toMin(x.start))) : 7 * 60;
    const focusMin = iso === GE.today() ? G.T.nowMin() - 90 : firstMin - 30;
    sc.scrollTop = Math.max(0, focusMin / 60 * H);

    const refreshAll = () => { paint(); paintTimeline(); footer(); GE.renderHeader(); refreshProgress(); };
    const refreshProgress = () => {
      const st = G.stats(P, iso); const pl = $('.progress-line', root);
      if (pl) { pl.querySelector('i').style.width = st.pct + '%'; pl.querySelector('b').textContent = Math.round(st.pct) + '%'; pl.querySelector('.muted').textContent = `${st.done}/${st.total}`; }
    };

    // ----- actions -----
    const newTask = (start) => {
      const cur = G.day(P, iso);
      if (start == null) { const ends = cur.tasks.map(x => G.T.toMin(x.end)); start = ends.length ? Math.min(Math.max(...ends), 23 * 60) : 8 * 60; }
      return { id: G.uid(), title: '', start: G.T.fromMin(start), end: G.T.fromMin(Math.min(start + 60, 1440)), cat: 'work', done: false };
    };
    const freeAdd = (start) => {
      const tk = newTask(start);
      G.change(P, iso, 'add', d => d.tasks.push(tk)); GE.save();
      const md = G.mode(P, iso);
      if (md === 'future' || md === 'planning') {
        renderDay(root, iso);
        const inp = root.querySelector(`.task[data-id="${tk.id}"] .title-in`); if (inp) { inp.focus(); inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
    };
    const paidEditor = async (tk, isNew) => {
      let out = null;
      const v = await GE.modal({
        title: isNew ? 'Add a task to a sealed plan' : 'Revise a sealed task',
        body: `<div class="cost-note">${GE.gem()} This revision costs 1 gem. You have ${P.gems}.</div>
          <div class="task edit" id="ed" style="border:0;padding:0">
            <div class="edit-main">
              <div class="edit-row"><input class="title-in" data-f="title" value="${esc(tk.title)}" placeholder="What will you do?" maxlength="120" aria-label="Task">${catSelect(tk.cat)}</div>
              <div class="edit-row"><span class="hm-label">From</span>${hmField('start', tk.start, 'Start')}<span class="hm-label">to</span>${hmField('end', tk.end, 'End')}</div>
            </div></div>`,
        actions: [{ label: 'Cancel', value: null }, { label: `Pay 1 gem and save`, value: 'ok', cls: 'btn-primary', onClick: back => { const ed = back.querySelector('#ed'); out = { title: ed.querySelector('[data-f=title]').value.trim(), cat: ed.querySelector('[data-f=cat]').value, start: readHM(ed, 'start'), end: readHM(ed, 'end') }; if (G.T.toMin(out.end) <= G.T.toMin(out.start)) { GE.toast('The end time must be after the start time.', 'err'); return false; } } }],
        onOpen: back => setTimeout(() => back.querySelector('.title-in').focus(), 30)
      });
      if (v !== 'ok' || !out) return;
      if (!isNew && out.title === tk.title && out.cat === tk.cat && out.start === tk.start && out.end === tk.end) { GE.toast('Nothing changed, so no gem was spent.'); return; }
      const r = G.change(P, iso, isNew ? `Added “${out.title || 'task'}”` : `Revised “${tk.title || 'task'}”`, d => {
        if (isNew) d.tasks.push({ ...tk, ...out }); else Object.assign(d.tasks.find(x => x.id === tk.id), out);
      });
      if (!r.ok) { GE.toast(r.reason, 'err'); return; }
      GE.sound('spend'); GE.bumpGems(); GE.save(); GE.toast(`Plan revised. 1 gem paid, ${P.gems} left.`);
      refreshAll();
    };
    async function doSeal() {
      const cur = G.day(P, iso);
      const bad = cur.tasks.filter(x => G.T.toMin(x.end) <= G.T.toMin(x.start));
      if (bad.length) { GE.toast('Fix the blocks that end before they start, then seal.', 'err'); return; }
      const untitled = cur.tasks.filter(x => !x.title.trim()).length;
      if (untitled && !(await GE.confirm('Seal with untitled tasks?', `<p>${untitled} task${untitled > 1 ? 's have' : ' has'} no name. Naming them now is free; after sealing it costs 1 gem each.</p>`, 'Seal anyway'))) return;
      const btn = $('#sealBtn', root); btn && btn.classList.add('pressing');
      GE.sound('click');
      setTimeout(() => {
        if (G.seal(P, iso)) {
          const fresh = G.checkAchievements(P); GE.save(true);
          GE.toast('Plan sealed. Off you go.');
          fresh.forEach(a => GE.toast(`New distinction: <b>${esc(a.name)}</b>`, 'gold'));
          renderDay(root, iso);
        }
      }, 450);
    }

    async function doClose() {
      const st = G.stats(P, iso);
      if (st.pct < 100) {
        const ok = await GE.confirm('Close the day?', `<p>${st.done} of ${st.total} tasks are done (${Math.round(st.pct)}%). Closing now gives <b>${st.tier.label}</b>: ${pct(st.tier.rate)} élan and ${st.tier.gems > 0 ? '+' : ''}${st.tier.gems} gems. You cannot reopen the day.</p>${GE.today() === iso ? '<p class="muted">If you leave it open, it closes by itself at midnight with whatever is ticked.</p>' : ''}`, 'Close the day', 'btn-rouge');
        if (!ok) return;
      }
      const r = G.closeDay(P, iso); if (!r) return;
      GE.save(true); renderDay(root, iso); GE.renderHeader();
      await GE.showResult(r);
      (r.fresh || []).forEach(a => GE.toast(`New distinction: <b>${esc(a.name)}</b>`, 'gold'));
    }


    // free-edit events (delegated)
    list.addEventListener('input', e => {
      const row = e.target.closest('.task.edit'); if (!row || !free) return;
      const tk = G.day(P, iso).tasks.find(x => x.id === row.dataset.id); if (!tk) return;
      if (e.target.dataset.f === 'title') tk.title = e.target.value;
      if (e.target.dataset.hm) { tk.start = readHM(row, 'start'); tk.end = readHM(row, 'end'); row.querySelector('[data-dur]').innerHTML = durTxt(tk.start, tk.end); }
      G.day(P, iso, true).editedOn = GE.today();
      GE.save(); paintTimeline(); footer();
    });
    list.addEventListener('change', e => {
      const row = e.target.closest('.task.edit'); if (!row || !free) return;
      const tk = G.day(P, iso).tasks.find(x => x.id === row.dataset.id); if (!tk) return;
      if (e.target.dataset.f === 'cat') { tk.cat = e.target.value; row.style.cssText = catVar(tk.cat); }
      if (e.target.dataset.hm) { // normalise what was typed
        const [st, en] = [readHM(row, 'start'), readHM(row, 'end')];
        row.querySelector('[data-hm="start-h"]').value = st.slice(0, 2); row.querySelector('[data-hm="start-m"]').value = st.slice(3);
        row.querySelector('[data-hm="end-h"]').value = en.slice(0, 2); row.querySelector('[data-hm="end-m"]').value = en.slice(3);
      }
      GE.save(); paintTimeline();
    });
    list.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const row = b.closest('.task'); const id = row.dataset.id;
      const tk = G.day(P, iso).tasks.find(x => x.id === id); if (!tk) return;
      const md = G.mode(P, iso);
      if (b.dataset.act === 'done') {
        if (G.toggleDone(P, iso, id)) { GE.sound(tk.done ? 'gem' : 'click'); GE.save(); paint(); paintTimeline(); footer(); refreshProgress(); }
      } else if (b.dataset.act === 'del') {
        if (md === 'sealed') {
          if (!(await GE.confirm('Remove this task?', `<div class="cost-note">${GE.gem()} Removing a task from a sealed plan costs 1 gem. You have ${P.gems}.</div><p>“${esc(tk.title || 'Untitled')}”, ${tk.start} – ${tk.end}</p>`, 'Pay 1 gem and remove', 'btn-rouge'))) return;
          const r = G.change(P, iso, `Removed “${tk.title || 'task'}”`, d => { d.tasks = d.tasks.filter(x => x.id !== id); });
          if (!r.ok) { GE.toast(r.reason, 'err'); return; }
          GE.sound('spend'); GE.bumpGems(); GE.toast(`Task removed. 1 gem paid, ${P.gems} left.`);
        } else G.change(P, iso, 'delete', d => { d.tasks = d.tasks.filter(x => x.id !== id); });
        GE.save(); renderDay(root, iso);
      } else if (b.dataset.act === 'rev') paidEditor(tk, false);
    });
    tl.addEventListener('click', e => {
      const blk = e.target.closest('.tl-block');
      if (blk) {
        const row = list.querySelector(`.task[data-id="${blk.dataset.id}"]`);
        if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.animate([{ background: 'var(--bleu-50)' }, { background: 'transparent' }], 1200); const inp = row.querySelector('.title-in'); inp && inp.focus({ preventScroll: true }); }
        return;
      }
      const slot = e.target.closest('.tl-slot'); if (!slot) return;
      const y = e.offsetY; const min = +slot.dataset.hour * 60 + (y > H / 2 ? 30 : 0);
      const md = G.mode(P, iso);
      if (md === 'sealed') paidEditor(newTask(min), true); else freeAdd(min);
    });
    const add = $('#addTask', root);
    if (add) add.onclick = () => { if (G.mode(P, iso) === 'sealed') paidEditor(newTask(), true); else freeAdd(); };
    const os = $('#openStamp', root); if (os) os.onclick = () => GE.openViewer([GE.itemFor(iso)], 0);

    const cf = $('#copyFrom', root);
    if (cf) cf.onclick = async () => {
      const options = Object.keys(P.days).filter(k => k !== iso && P.days[k].tasks.length).sort().reverse().slice(0, 40);
      if (!options.length) { GE.toast('No other day has a plan yet.'); return; }
      let pick = null;
      const v = await GE.modal({
        title: 'Copy a plan', body: `<p class="muted">The copied blocks are added to this day, unticked. This is free because the day is not sealed.</p>
          <label class="field"><span>Copy from</span><select id="cpSel">${options.map(k => `<option value="${k}">${esc(fmtEnLong(k))} (${P.days[k].tasks.length} tasks)</option>`).join('')}</select></label>
          <label class="toggles"><label><input type="checkbox" id="cpReplace" ${G.day(P, iso).tasks.length ? '' : 'checked'}> Replace the current plan</label></label>`,
        actions: [{ label: 'Cancel', value: null }, { label: 'Copy plan', value: 'ok', cls: 'btn-primary', onClick: back => { pick = { from: back.querySelector('#cpSel').value, replace: back.querySelector('#cpReplace').checked }; } }]
      });
      if (v !== 'ok' || !pick) return;
      G.change(P, iso, 'copy', d => { const src = P.days[pick.from].tasks.map(x => ({ ...x, id: G.uid(), done: false, doneAt: null })); d.tasks = pick.replace ? src : d.tasks.concat(src); });
      GE.save(); renderDay(root, iso); GE.toast('Plan copied.');
    };
    const rn = $('#repeatNext', root);
    if (rn) rn.onclick = async () => {
      if (!['future', 'planning'].includes(G.mode(P, next))) { GE.toast(`${fmtEn(next)} can no longer be edited for free.`, 'err'); return; }
      const has = G.day(P, next).tasks.length;
      if (has && !(await GE.confirm('Replace that plan?', `<p>${fmtEnLong(next)} already has ${has} tasks. Replace them with this plan?</p>`, 'Replace'))) return;
      G.change(P, next, 'copy', d => { d.tasks = G.day(P, iso).tasks.map(x => ({ ...x, id: G.uid(), done: false, doneAt: null })); });
      GE.save(); GE.toast(`Plan repeated on ${fmtEn(next)}.`);
    };
  }
})();
