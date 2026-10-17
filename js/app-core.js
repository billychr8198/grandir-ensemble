/* ==========================================================================
   Grandir Ensemble — app core: helpers, profile, header, router, modals,
   sound, confetti and the settlement "communiqué".
   ========================================================================== */
(function () {
  'use strict';
  const G = window.Game, E = window.Economy, C = window.CONTENT;
  const GE = window.GE = { views: {} };

  // ---------- tiny helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const frLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const frShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const enShort = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const enLong = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtFr = iso => cap(frLong.format(G.D.parse(iso)));
  const fmtFrShort = iso => frShort.format(G.D.parse(iso));
  const fmtEn = iso => enShort.format(G.D.parse(iso));
  const fmtEnLong = iso => enLong.format(G.D.parse(iso));
  const pct = (r, d = 2) => (r >= 0 ? '+' : '−') + Math.abs(r * 100).toFixed(d) + '%';
  const elan = K => (K * 100).toFixed(2);
  Object.assign(GE, { $, $$, esc, fmtFr, fmtFrShort, fmtEn, fmtEnLong, pct, elan, cap });

  // ---------- icons ----------
  GE.gem = (cls = 'gem') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="#2C55A8"/><path d="M2 9h20L12 21z" fill="#12306E"/><path d="M6 3l3 6h6l3-6M9 9l3 12 3-12" fill="none" stroke="#fff" stroke-width="1" opacity=".75"/><path d="M6 3h12l-3 6H9z" fill="#7FA0E0"/></svg>`;
  GE.seal = (label = 'GE', cls = '') => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="wax${label}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#EE4A55"/><stop offset=".6" stop-color="#C21F2F"/><stop offset="1" stop-color="#8E1220"/></radialGradient></defs><path fill="url(#wax${label})" d="M60 4c8 0 11 6 18 7s13-2 17 4 1 12 5 17 11 6 11 14-6 10-6 17 6 12 2 18-11 4-16 8-6 12-14 14-12-3-17-3-11 6-18 3-7-10-12-14-12-3-15-9 3-11 1-17-9-9-8-17 9-9 11-15-1-12 4-16 13 0 18-4 9-11 17-11z"/><circle cx="60" cy="60" r="33" fill="none" stroke="#7E0F1C" stroke-width="2.5" opacity=".55"/><circle cx="60" cy="60" r="27" fill="none" stroke="#FF9AA2" stroke-width="1" opacity=".5"/><text x="60" y="72" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="34" font-weight="700" fill="#7E0F1C" opacity=".9">${label}</text><text x="59" y="71" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="34" font-weight="700" fill="#FFB3B9" opacity=".5">${label}</text></svg>`;
  GE.medal = (cls = 'medal-ico') => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 2h6l4 14-6 2z" fill="#12306E"/><path d="M20 2h8l-4 14z" fill="#fff" stroke="#DDE2EE"/><path d="M28 2h6l-4 16-6-2z" fill="#D22B3A"/><circle cx="24" cy="31" r="13" fill="#D9B263"/><circle cx="24" cy="31" r="10" fill="none" stroke="#9C7426" stroke-width="1.5"/><path d="m24 24 2 4.2 4.6.6-3.4 3.1.9 4.6-4.1-2.3-4.1 2.3.9-4.6-3.4-3.1 4.6-.6z" fill="#9C7426"/></svg>`;
  GE.check = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  GE.ico = {
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>'
  };
  GE.postmark = (tier, big) => {
    const col = { C: '#B0832F', B: '#12306E', A: '#2C55A8', D: '#C9772B', E: '#D22B3A' }[tier];
    return `<svg class="stampmark" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="pm-arc" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="${col}" stroke-width="3"/><circle cx="60" cy="60" r="36" fill="none" stroke="${col}" stroke-width="1.5"/>
      <text font-family="Jost, sans-serif" font-size="10.5" letter-spacing="2.2" fill="${col}"><textPath href="#pm-arc">GRANDIR ENSEMBLE ✦ RÉPUBLIQUE DU PROGRÈS ✦ 2027 ✦</textPath></text>
      <text x="60" y="68" text-anchor="middle" font-family="Bodoni Moda, serif" font-weight="700" font-size="${String(big).length > 3 ? 20 : 24}" fill="${col}">${big}</text></svg>`;
  };

  // ---------- state ----------
  GE.P = null;
  let saveTimer = null;
  GE.save = (now) => {
    clearTimeout(saveTimer);
    const go = () => { if (GE.P) G.saveProfile(GE.P); };
    if (now) go(); else saveTimer = setTimeout(go, 250);
  };
  GE.today = () => G.today(GE.P);
  window.addEventListener('beforeunload', () => GE.save(true));

  // ---------- sound ----------
  const SFX = {};
  ['gem', 'unlock', 'fanfare', 'penalty', 'spend', 'click'].forEach(n => { SFX[n] = 'assets/audio/' + n + '.mp3'; });
  let music = null;
  GE.sound = name => {
    if (!GE.P || !GE.P.settings.sound) return;
    try { const a = new Audio(SFX[name]); a.volume = name === 'click' ? .35 : .6; a.play().catch(() => {}); } catch (e) {}
  };
  GE.setMusic = on => {
    if (!music) { music = new Audio('assets/audio/musette-au-clair-de-la-lune.mp3'); music.loop = true; music.volume = .28; }
    if (on) music.play().catch(() => {}); else music.pause();
  };
  GE.pauseMusic = () => music && music.pause();

  // ---------- toasts ----------
  GE.toast = (msg, kind = '') => {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg;
    $('#toastRoot').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, kind === 'err' ? 4200 : 2800);
  };

  // ---------- modal ----------
  GE.modal = ({ title, body, actions = [], wide, onOpen, dismiss = true }) => new Promise(resolve => {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title || 'Dialog')}" style="${wide ? 'width:min(760px,100%)' : ''}">
      ${title ? `<div class="modal-head"><h2>${title}</h2>${dismiss ? '<button class="x" aria-label="Close">×</button>' : ''}</div>` : ''}
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${a.label}</button>`).join('')}</div>` : ''}
    </div>`;
    const prevFocus = document.activeElement;
    const close = v => { back.remove(); document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); resolve(v); };
    const onKey = e => { if (e.key === 'Escape' && dismiss) close(null); };
    back.addEventListener('click', e => {
      if (e.target === back && dismiss) close(null);
      const x = e.target.closest('.x'); if (x) close(null);
      const b = e.target.closest('[data-i]');
      if (b && b.closest('.modal-foot')) {
        const a = actions[+b.dataset.i];
        if (a.onClick) { const r = a.onClick(back); if (r === false) return; }
        close(a.value ?? a.label);
      }
    });
    document.addEventListener('keydown', onKey);
    $('#modalRoot').appendChild(back);
    onOpen && onOpen(back, close);
    const f = back.querySelector('[autofocus], .modal-foot .btn-primary, .modal-foot .btn-rouge, .modal-foot .btn');
    f && f.focus({ preventScroll: true });
  });
  GE.confirm = (title, body, ok = 'Confirm', cls = 'btn-primary') => GE.modal({ title, body, actions: [{ label: 'Cancel', value: false }, { label: ok, value: true, cls }] }).then(v => v === true);

  // ---------- confetti (tricolore) ----------
  GE.confetti = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#confetti'); const ctx = cv.getContext('2d');
    const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
    const cols = ['#12306E', '#FFFFFF', '#D22B3A', '#D9B263'];
    const ps = Array.from({ length: 160 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 26, vy: -Math.random() * 26 - 6, r: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * 4)], a: Math.random() * 6, va: (Math.random() - .5) * .3 }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, W, H); t++;
      for (const p of ps) {
        p.vy += .55; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.strokeStyle = 'rgba(18,48,110,.25)';
        ctx.fillRect(-p.r, -p.r * .45, p.r * 2, p.r * .9); ctx.strokeRect(-p.r, -p.r * .45, p.r * 2, p.r * .9); ctx.restore();
      }
      if (t < 170) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })();
  };

  // ---------- header ----------
  GE.renderHeader = () => {
    const P = GE.P; if (!P) return;
    const t = GE.today();
    $('#chipDate').textContent = fmtFr(t);
    $('#chipGems').innerHTML = `${GE.gem()}<b>${P.gems}</b><span class="sr">gems</span>`;
    $('#chipElan').innerHTML = `<span class="lbl">Élan</span><b>${elan(P.K)}</b>`;
    const bar = $('#sandboxBar');
    if (P.sandbox) {
      bar.hidden = false;
      bar.innerHTML = `<span>Practice calendar. Simulated date:</span><b>${fmtFr(t)}</b>
        <button class="btn btn-sm" id="sbNext">Go to next day</button>
        <label>or jump to <input type="date" id="sbJump" min="${G.D.add(t, 1)}" max="2027-05-01" value="${G.D.add(t, 1)}"></label>
        <button class="btn btn-sm" id="sbGo">Jump</button>`;
      $('#sbNext').onclick = () => GE.moveSim(G.D.add(t, 1));
      $('#sbGo').onclick = () => { const v = $('#sbJump').value; if (v && v > t) GE.moveSim(v); };
    } else bar.hidden = true;
  };
  GE.bumpGems = () => { const c = $('#chipGems'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); };
  GE.moveSim = iso => {
    if (iso > '2027-05-01') iso = '2027-05-01';
    GE.P.simDate = iso; GE.runCatchUp(true); GE.save(true); GE.route();
  };

  // ---------- menu ----------
  function renderMenu() {
    const P = GE.P; const m = $('#menu');
    m.innerHTML = `<div class="who"><b>${esc(P.name)}</b><small class="muted">${P.sandbox ? 'Practice profile' : 'Real calendar'}${P.sandbox ? '' : `, term from ${fmtFrShort(P.startDate)}`}</small></div>
      <button data-a="sound">Sound effects <span class="switch ${P.settings.sound ? 'on' : ''}"></span></button>
      <button data-a="music">Musette (Au clair de la lune) <span class="switch ${P.settings.music ? 'on' : ''}"></span></button>
      <hr>
      <button data-a="ledger">Treasury history</button>
      <button data-a="export">Download a backup</button>
      <button data-a="import">Restore from a backup</button>
      <hr>
      <button data-a="logout">Switch profile</button>
      <button data-a="delete" class="danger">Delete this profile</button>`;
  }
  function toggleMenu(open) {
    const m = $('#menu'), b = $('#menuBtn');
    if (open === undefined) open = m.hidden;
    if (open) renderMenu();
    m.hidden = !open; b.setAttribute('aria-expanded', String(open));
  }
  GE.toggleMenu = toggleMenu;
  document.addEventListener('click', async e => {
    if (e.target.closest('#menuBtn')) { toggleMenu(); return; }
    if (!e.target.closest('#menu')) { if (!$('#menu').hidden) toggleMenu(false); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    const P = GE.P;
    switch (a.dataset.a) {
      case 'sound': P.settings.sound = !P.settings.sound; GE.save(); renderMenu(); break;
      case 'music': P.settings.music = !P.settings.music; GE.setMusic(P.settings.music); GE.save(); renderMenu(); break;
      case 'ledger': toggleMenu(false); GE.showLedger(); break;
      case 'export': toggleMenu(false); exportSave(); break;
      case 'import': toggleMenu(false); importSave(); break;
      case 'logout': toggleMenu(false); GE.logout(); break;
      case 'delete': {
        toggleMenu(false);
        const ok = await GE.confirm('Delete this profile?', `<p>All plans, gems, stamps and indicators of <b>${esc(P.name)}</b> will be erased from this browser. Download a backup first if you may want them back.</p>`, 'Delete profile', 'btn-rouge');
        if (ok) { G.deleteProfile(P.id); GE.logout(true); }
      }
    }
  });
  $('#chipGems').addEventListener('click', () => GE.showLedger());
  $('#chipElan').addEventListener('click', () => { location.hash = '#/indicators'; });

  GE.showLedger = () => {
    const rows = GE.P.ledger.slice(-60).reverse();
    GE.modal({
      title: 'Treasury history',
      body: `<p class="muted">Every gem earned or spent. Revisions of a sealed plan cost 1 gem each.</p>
        <div class="away-list">${rows.length ? rows.map(r => `<div><span>${fmtEn(r.date)} — ${esc(r.note)}</span><b class="${r.gems > 0 ? 'delta up' : r.gems < 0 ? 'delta down' : 'delta flat'}">${r.gems > 0 ? '+' : ''}${r.gems} ${GE.gem()}</b></div>`).join('') : '<div>No movements yet. Your starting treasury is ' + G.STARTING_GEMS + ' gems.</div>'}</div>`,
      actions: [{ label: 'Close', cls: 'btn-primary' }]
    });
  };

  function exportSave() {
    const blob = new Blob([JSON.stringify({ app: 'grandir-ensemble', v: 1, exported: new Date().toISOString(), profile: GE.P }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `grandir-ensemble-${GE.P.name.replace(/\W+/g, '-').toLowerCase()}-${G.D.localToday()}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    GE.toast('Backup downloaded.');
  }
  function importSave() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      try {
        const data = JSON.parse(await inp.files[0].text());
        const p = data.profile; if (!p || !p.id || !p.days) throw new Error('not a backup');
        const ok = await GE.confirm('Restore this backup?', `<p>This replaces the profile <b>${esc(p.name)}</b> on this browser with the backup from ${esc((data.exported || '').slice(0, 10))}.</p>`, 'Restore');
        if (!ok) return;
        G.saveProfile(p); GE.enter(p);
        GE.toast('Backup restored.');
      } catch (e) { GE.toast('That file is not a Grandir Ensemble backup.', 'err'); }
    };
    inp.click();
  }

  // ---------- catch-up & settlement UI ----------
  GE.runCatchUp = (quiet) => {
    const res = G.catchUp(GE.P);
    GE.save(true);
    if (res.length) setTimeout(() => GE.showAway(res), quiet ? 50 : 400);
    if (res.fresh && res.fresh.length) setTimeout(() => res.fresh.forEach(a => GE.toast(`${GE.medal('gem')} New distinction: <b>${esc(a.name)}</b>`, 'gold')), 1200);
    return res;
  };

  GE.itemFor = iso => {
    const k = G.unlockKey(iso); if (!k) return null;
    const data = window.COLLECTION[k.month][k.index]; return data ? { ...k, iso, data } : null;
  };

  GE.stampHTML = (it, opts = {}) => {
    const img = it.data.img[0]; const logo = /-logo\./.test(img.src);
    return `<div class="face ${logo ? 'logo' : ''}"><img src="assets/collection/${img.thumb}" alt="${esc(it.data.name)}" loading="lazy"><span class="val">${Number(it.iso.slice(8))}</span></div>${opts.nocap ? '' : `<div class="cap">${esc(it.data.name)}</div>`}`;
  };

  /** One day's result, as an official communiqué. */
  GE.showResult = async (r) => {
    const tier = G.TIERS[r.tier];
    const words = C.settleWords[r.tier][Math.floor(Math.random() * 3)];
    const sb = E.snapshot(r.Kbefore), sa = E.snapshot(r.Kafter);
    const it = r.unlocked ? GE.itemFor(r.iso) : null;
    if (r.tier === 'C') { GE.sound('fanfare'); GE.confetti(); } else if ('BA'.includes(r.tier)) GE.sound('gem'); else GE.sound('penalty');
    GE.bumpGems();
    const gemLine = r.gems === r.wanted ? `${r.gems > 0 ? '+' : ''}${r.gems}` : `${r.gems} <small>(of ${r.wanted}; the treasury was short)</small>`;
    const v = await GE.modal({
      title: '',
      body: `<div class="decree">
        <div class="muted">Communiqué du Gouvernement, ${fmtFr(r.iso)}</div>
        ${GE.postmark(r.tier, r.total ? Math.round(r.pct) + '%' : '—')}
        <div class="tierword">${tier.label}</div><div class="tierfr">${tier.fr}</div>
        <p class="muted" style="margin:6px 0 0">${r.total ? `${r.done} of ${r.total} tasks completed` : 'No plan was logged for this day'}</p>
        <p class="words">${words}</p>
        <div class="gains">
          <div><b class="${r.rate >= 0 ? 'delta up' : 'delta down'}" style="font-size:26px">${pct(r.rate)}</b><small>to every indicator's momentum</small></div>
          <div><b style="display:flex;gap:6px;align-items:center;justify-content:center">${GE.gem()} ${gemLine}</b><small>gems</small></div>
        </div>
        <div class="away-list" style="margin-bottom:12px">
          ${['gdp', 'hdi', 'tour', 'pisa'].map(k => { const ind = E.INDICATORS.find(i => i.key === k); return `<div><span>${ind.name}</span><span>${ind.value(sb)} → <b>${ind.value(sa)}</b></span></div>`; }).join('')}
        </div>
        ${it ? `<p style="margin:6px 0 4px"><b>New stamp for your album</b></p>
          <div class="reveal" id="reveal"><div class="inner">
            <div class="front"><div class="stamp locked"><div class="face"><span>?</span></div><div class="cap">${esc(C.months[it.month].themeFr)}</div></div></div>
            <div class="back"><div class="stamp">${GE.stampHTML(it)}</div></div>
          </div></div>` : (r.total ? '' : '<p class="muted">Log a plan on a day to unlock its stamp.</p>')}
      </div>`,
      actions: it ? [{ label: 'Continue', value: 'ok' }, { label: 'See it in full', value: 'view', cls: 'btn-primary' }] : [{ label: 'Continue', value: 'ok', cls: 'btn-primary' }],
      onOpen: back => { if (it) setTimeout(() => { const rv = back.querySelector('#reveal'); if (rv) { rv.classList.add('flip'); GE.sound('unlock'); } }, 900); }
    });
    if (v === 'view' && it) GE.openViewer([it], 0);
  };

  GE.showAway = async (res) => {
    if (res.length === 1) return GE.showResult(res[0]);
    const gems = res.reduce((s, r) => s + r.gems, 0);
    const K0 = res[0].Kbefore, K1 = res[res.length - 1].Kafter;
    const unlocked = res.filter(r => r.unlocked).map(r => GE.itemFor(r.iso));
    GE.sound(K1 >= K0 ? 'gem' : 'penalty'); GE.bumpGems();
    const v = await GE.modal({
      title: 'While you were away',
      body: `<p>${res.length} days were closed and counted. Days without a logged plan count as hard days; the Government keeps the books honest so your progress means something.</p>
        <div class="away-list">${res.map(r => `<div><span>${fmtEn(r.iso)} <span class="tier-pill t-${r.tier}">${r.total ? Math.round(r.pct) + '%' : 'not logged'}</span></span><span>${pct(r.rate)}, ${r.gems > 0 ? '+' : ''}${r.gems} ${GE.gem()}</span></div>`).join('')}</div>
        <div class="decree"><div class="gains" style="margin-top:14px">
          <div><b class="${K1 >= K0 ? 'delta up' : 'delta down'}" style="font-size:24px">${pct(K1 / K0 - 1)}</b><small>Élan national</small></div>
          <div><b>${gems > 0 ? '+' : ''}${gems}</b><small>gems</small></div>
          <div><b>${unlocked.length}</b><small>new stamps</small></div></div></div>`,
      actions: unlocked.length ? [{ label: 'Continue', value: 'ok' }, { label: 'View new stamps', value: 'view', cls: 'btn-primary' }] : [{ label: 'Continue', value: 'ok', cls: 'btn-primary' }]
    });
    if (v === 'view') GE.openViewer(unlocked, 0);
  };

  // ---------- router ----------
  const TABS = { home: 'home', calendar: 'calendar', day: 'calendar', indicators: 'indicators', album: 'album', map: 'map', media: 'media', courage: 'courage' };
  GE.route = () => {
    if (!GE.P) return;
    const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    const name = GE.views[parts[0]] ? parts[0] : 'home';
    $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === TABS[name]));
    GE.renderHeader();
    const view = $('#view');
    if (GE.cleanup) { try { GE.cleanup(); } catch (e) {} GE.cleanup = null; }
    view.innerHTML = '';
    GE.views[name](view, parts.slice(1));
    if (GE._lastView !== location.hash) { window.scrollTo(0, 0); GE._lastView = location.hash; }
  };
  window.addEventListener('hashchange', GE.route);

  // ---------- login ----------
  function showLogin() {
    $('#app').hidden = true; $('#login').hidden = false;
    const ix = G.loadIndex();
    $('#profileList').innerHTML = ix.length ? ix.map(p => `<div class="profile-row">
        <button class="enter" data-id="${p.id}"><span class="avatar ${p.sandbox ? 'sandbox' : ''}">${esc(p.name.charAt(0).toUpperCase())}</span>
        <span><b>${esc(p.name)}</b><small>${p.sandbox ? 'Practice' : 'Real calendar'}, ${p.gems} gems, élan ${elan(p.K)}${p.hasPin ? ', PIN' : ''}</small></span></button>
      </div>`).join('') : '';
    $('#createForm h2').textContent = ix.length ? 'Or start a new profile' : 'Join the programme';
  }
  $('#profileList').addEventListener('click', async e => {
    const b = e.target.closest('.enter'); if (!b) return;
    const p = G.loadProfile(b.dataset.id); if (!p) return;
    if (p.pin) {
      let val = '';
      const v = await GE.modal({
        title: `Welcome back, ${esc(p.name)}`,
        body: '<label class="field"><span>Enter your 4-digit PIN</span><input id="pinIn" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>',
        actions: [{ label: 'Cancel', value: null }, { label: 'Enter', value: 'ok', cls: 'btn-primary' }],
        onOpen: back => {
          const i = back.querySelector('#pinIn'); setTimeout(() => i.focus(), 30);
          i.addEventListener('input', () => { val = i.value; });
          i.addEventListener('keydown', ev => { if (ev.key === 'Enter') back.querySelector('.btn-primary').click(); });
        }
      });
      if (v !== 'ok') return;
      if ((await G.hashPin(val)) !== p.pin) { GE.toast('That PIN does not match.', 'err'); return; }
    }
    GE.enter(p);
  });

  $('#createForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name') || '').trim(); if (!name) return;
    const pin = String(f.get('pin') || '').trim();
    if (pin && !/^\d{4}$/.test(pin)) { GE.toast('The PIN must be 4 digits, or left empty.', 'err'); return; }
    const p = G.newProfile({ name, pinHash: pin ? await G.hashPin(pin) : null, sandbox: f.get('mode') === 'sandbox' });
    G.saveProfile(p); e.target.reset();
    GE.enter(p, true);
  });

  GE.enter = (p, isNew) => {
    GE.P = p;
    try { sessionStorage.setItem('ge-session', p.id); localStorage.setItem('ge-last', p.id); } catch (e) {}
    $('#login').hidden = true; $('#app').hidden = false;
    GE.runCatchUp();
    if (!location.hash || location.hash === '#/') location.hash = '#/home';
    GE.route();
    if (p.settings.music) GE.setMusic(true);
    if (isNew) setTimeout(() => GE.welcome(), 300);
  };
  GE.logout = (deleted) => {
    if (!deleted) GE.save(true);
    GE.P = null; GE.setMusic(false);
    try { sessionStorage.removeItem('ge-session'); localStorage.removeItem('ge-last'); } catch (e) {}
    showLogin();
  };
  GE.welcome = () => {
    const P = GE.P; const t = GE.today();
    GE.modal({
      title: `Bienvenue, ${esc(P.name)}`,
      body: `<p>On behalf of the Government, welcome to <b>Grandir Ensemble</b>. The Nation starts this term in difficulty: low income, short lives, empty classrooms. Your daily discipline is the policy that rebuilds it.</p>
        <p>Each day: write your to-do list in time blocks, seal it, do it, then close the day. Keep your word and the ten national indicators rise; every logged day also adds a stamp to your album. You start with <b>${G.STARTING_GEMS} gems</b>.</p>
        ${t < G.START ? `<p>The term begins on <b>${fmtFr(G.START)}</b>. Until then you can plan any day for free.</p>` : ''}
        <p class="muted">The full rules live in the Courage tab.</p>`,
      actions: [{ label: 'Read the rules', value: 'rules' }, { label: 'Plan my first day', value: 'plan', cls: 'btn-primary' }]
    }).then(v => {
      if (v === 'rules') location.hash = '#/courage';
      if (v === 'plan') location.hash = '#/day/' + (t < G.START ? G.START : t > G.END ? G.END : t);
    });
  };

  // ---------- clock: catch midnight while the page is open ----------
  let lastDay = null;
  setInterval(() => {
    if (!GE.P) return;
    const t = GE.today();
    if (lastDay && t !== lastDay) { GE.runCatchUp(); GE.route(); }
    lastDay = t;
    const now = $('.tl-now'); if (now && GE.updateNowLine) GE.updateNowLine();
  }, 30000);

  // ---------- boot ----------
  GE.boot = () => {
    let id = null;
    try { id = sessionStorage.getItem('ge-session') || localStorage.getItem('ge-last'); } catch (e) {}
    const p = id && G.loadProfile(id);
    if (p) {
      let fromSession = false; try { fromSession = sessionStorage.getItem('ge-session') === id; } catch (e) {}
      if (!p.pin || fromSession) { GE.enter(p); return; }
    }
    showLogin();
  };
})();
