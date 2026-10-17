/* ==========================================================================
   Grandir Ensemble — game rules and saved state (no DOM in this file)
   Everything is stored in the browser (localStorage), per profile.
   ========================================================================== */
(function () {
  'use strict';
  const START = '2027-01-01', END = '2027-04-30';
  const STORE = 'grandir-ensemble-2027';
  const STARTING_GEMS = 5;

  // ---- reward tiers (exactly as the programme rules state) ----------------
  const TIERS = {
    C: { id: 'C', label: 'Full commitment', fr: 'Engagement total', range: '100%', rate: 0.006, gems: 8, color: 'or' },
    B: { id: 'B', label: 'Strong day', fr: 'Belle journée', range: '75% – 99%', rate: 0.003, gems: 4, color: 'bleu' },
    A: { id: 'A', label: 'Half the way', fr: 'À mi-chemin', range: '50% – 74%', rate: 0.0015, gems: 2, color: 'ciel' },
    D: { id: 'D', label: 'Below half', fr: 'En dessous de la moitié', range: '30% – 49%', rate: -0.0015, gems: -1, color: 'ambre' },
    E: { id: 'E', label: 'Hard day', fr: 'Journée difficile', range: 'under 30%, or nothing logged', rate: -0.003, gems: -3, color: 'rouge' }
  };
  const TIER_ORDER = ['C', 'B', 'A', 'D', 'E'];
  function tierFor(pct) {
    if (pct >= 100) return TIERS.C;
    if (pct >= 75) return TIERS.B;
    if (pct >= 50) return TIERS.A;
    if (pct >= 30) return TIERS.D;
    return TIERS.E;
  }

  // ---- civic medals (by number of days at 50% or better) --------------------
  const MEDALS = [
    { at: 0, name: 'Citoyen·ne engagé·e', en: 'Engaged citizen' },
    { at: 5, name: 'Médaille de bronze', en: 'Bronze medal of progress' },
    { at: 15, name: "Médaille d'argent", en: 'Silver medal of progress' },
    { at: 30, name: 'Médaille de vermeil', en: 'Vermeil medal of progress' },
    { at: 50, name: "Médaille d'or", en: 'Gold medal of progress' },
    { at: 80, name: 'Grand or', en: 'Grand gold medal' },
    { at: 110, name: 'Bâtisseur·se de la Nation', en: 'Builder of the Nation' }
  ];

  // ---- dates (all ISO yyyy-mm-dd, computed in UTC to dodge DST) -----------
  const D = {
    parse: iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); },
    iso: dt => dt.toISOString().slice(0, 10),
    add: (iso, n) => { const t = D.parse(iso); t.setUTCDate(t.getUTCDate() + n); return D.iso(t); },
    diff: (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),
    localToday: () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; },
    inWindow: iso => iso >= START && iso <= END,
    max: (a, b) => (a > b ? a : b), min: (a, b) => (a < b ? a : b)
  };
  const WINDOW_DAYS = D.diff(START, END) + 1; // 120

  // unlockable for a date → { month: 'jan', index: 0-based }
  function unlockKey(iso) {
    const m = { '01': 'jan', '02': 'feb', '03': 'mar', '04': 'apr' }[iso.slice(5, 7)];
    return m ? { month: m, index: Number(iso.slice(8, 10)) - 1 } : null;
  }

  // ---- time helpers -------------------------------------------------------
  const T = {
    toMin: s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; },
    fromMin: n => { n = Math.max(0, Math.min(1440, Math.round(n))); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; },
    nowMin: () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  };

  // ---- storage --------------------------------------------------------------
  const mem = {};
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v == null ? (mem[k] ?? null) : v; } catch (e) { return mem[k] ?? null; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* private mode: memory only */ } },
    del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }
  };
  function loadIndex() { try { return JSON.parse(ls.get(STORE + ':index')) || []; } catch (e) { return []; } }
  function saveIndex(ix) { ls.set(STORE + ':index', JSON.stringify(ix)); }
  function loadProfile(id) { try { return JSON.parse(ls.get(STORE + ':p:' + id)); } catch (e) { return null; } }
  function saveProfile(p) {
    ls.set(STORE + ':p:' + p.id, JSON.stringify(p));
    const ix = loadIndex(); const i = ix.findIndex(x => x.id === p.id);
    const row = { id: p.id, name: p.name, sandbox: p.sandbox, hasPin: !!p.pin, gems: p.gems, K: p.K, updated: Date.now() };
    if (i >= 0) ix[i] = row; else ix.push(row);
    saveIndex(ix);
  }
  function deleteProfile(id) { ls.del(STORE + ':p:' + id); saveIndex(loadIndex().filter(x => x.id !== id)); }
  async function hashPin(pin) {
    const data = new TextEncoder().encode('grandir:' + pin);
    try { const h = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let h = 2166136261; for (const b of data) { h ^= b; h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16); }
  }
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function newProfile({ name, pinHash, sandbox }) {
    const today = D.localToday();
    return {
      v: 1, id: uid(), name: name.trim(), pin: pinHash || null, sandbox: !!sandbox,
      created: today,
      // a real term starts on the later of 1 January 2027 and the day you joined
      startDate: sandbox ? START : D.max(START, today),
      simDate: sandbox ? START : null,
      gems: STARTING_GEMS, K: 1, days: {}, ledger: [], ach: {},
      settings: { sound: true, music: false }
    };
  }

  // ---- the game ---------------------------------------------------------------
  function today(p) { return p.sandbox ? p.simDate : D.localToday(); }
  function day(p, iso, create) {
    let d = p.days[iso];
    if (!d && create) d = p.days[iso] = { tasks: [], sealed: false, editedOn: null, revisions: 0, revLog: [], settled: false, result: null };
    return d || { tasks: [], sealed: false, revisions: 0, revLog: [], settled: false, result: null, ghost: true };
  }
  function ledger(p, iso, kind, gems, note) { p.ledger.push({ at: Date.now(), date: iso, kind, gems, note, balance: p.gems }); if (p.ledger.length > 800) p.ledger.splice(0, p.ledger.length - 800); }

  /** What may the player do with this date right now? */
  function mode(p, iso) {
    const t = today(p); const d = day(p, iso);
    if (!D.inWindow(iso)) return 'outside';
    if (d.settled) return 'closed';
    if (iso < p.startDate) return 'before-term';
    if (iso < t) return 'closed';           // will be settled by catch-up
    if (iso > t) return 'future';           // free planning
    return d.sealed ? 'sealed' : 'planning';  // today
  }

  function stats(p, iso) {
    const d = day(p, iso); const total = d.tasks.length; const done = d.tasks.filter(x => x.done).length;
    const pct = total ? (done / total) * 100 : 0;
    return { total, done, pct, tier: tierFor(pct) };
  }

  function settle(p, iso, auto) {
    const d = day(p, iso, true);
    if (d.settled) return null;
    const s = stats(p, iso);
    const tier = s.total ? s.tier : TIERS.E;
    const Kb = p.K; p.K = p.K * (1 + tier.rate);
    let g = tier.gems; if (g < 0) g = -Math.min(p.gems, -g);
    p.gems += g;
    const key = s.total ? unlockKey(iso) : null;
    d.settled = true; d.sealed = d.sealed || s.total > 0;
    d.result = { pct: s.pct, done: s.done, total: s.total, tier: tier.id, rate: tier.rate, gems: g, wanted: tier.gems, Kbefore: Kb, Kafter: p.K, unlocked: key, auto: !!auto, at: Date.now() };
    ledger(p, iso, 'settle', g, `${tier.fr} (${Math.round(s.pct)}%)`);
    return { iso, ...d.result };
  }

  /** Bring the save up to date: settle past days, auto-seal today's pre-made plan. */
  function catchUp(p) {
    const t = today(p); const out = [];
    let iso = p.startDate;
    const last = D.min(D.add(t, -1), END);
    while (iso <= last) { const r = settle(p, iso, true); if (r) out.push(r); iso = D.add(iso, 1); }
    if (D.inWindow(t) && t >= p.startDate) {
      const d = day(p, t);
      if (!d.ghost && !d.settled && !d.sealed && d.tasks.length && d.editedOn && d.editedOn < t) {
        d.sealed = true; d.sealedAt = Date.now(); d.autoSealed = true;
      }
    }
    out.fresh = checkAchievements(p);
    return out;
  }

  /** Apply a change to a day's plan; charges 1 gem when the plan is sealed. */
  function change(p, iso, what, fn) {
    const m = mode(p, iso);
    if (m === 'closed' || m === 'outside' || m === 'before-term') return { ok: false, reason: 'This day is closed. Its plan can no longer change.' };
    const d = day(p, iso, true);
    if (m === 'sealed') {
      if (p.gems < 1) return { ok: false, reason: 'Revising a sealed plan costs 1 gem and the treasury is empty. Finish the tasks you have, or close the day.' };
      fn(d);
      p.gems -= 1; d.revisions += 1; d.revLog.push({ at: Date.now(), what });
      ledger(p, iso, 'revision', -1, what);
      return { ok: true, cost: 1 };
    }
    fn(d); d.editedOn = today(p);
    return { ok: true, cost: 0 };
  }
  function seal(p, iso) {
    const d = day(p, iso, true);
    if (mode(p, iso) !== 'planning' || !d.tasks.length) return false;
    d.sealed = true; d.sealedAt = Date.now(); return true;
  }
  function toggleDone(p, iso, id) {
    if (mode(p, iso) !== 'sealed') return false;
    const t = day(p, iso).tasks.find(x => x.id === id); if (!t) return false;
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null; return true;
  }
  function closeDay(p, iso) { if (mode(p, iso) !== 'sealed') return null; const r = settle(p, iso, false); r.fresh = checkAchievements(p); return r; }

  // ---- derived figures --------------------------------------------------------
  function medal(p) {
    const good = Object.values(p.days).filter(d => d.settled && d.result && 'CBA'.includes(d.result.tier)).length;
    let m = MEDALS[0], next = MEDALS[1];
    for (let i = 0; i < MEDALS.length; i++) if (good >= MEDALS[i].at) { m = MEDALS[i]; next = MEDALS[i + 1] || null; }
    return { ...m, good, next };
  }
  function streak(p) {
    let n = 0; let iso = D.min(D.add(today(p), -1), END);
    const t = today(p); if (day(p, t).settled) iso = t;
    while (iso >= p.startDate && D.inWindow(iso)) {
      const d = p.days[iso]; if (!d || !d.settled || !'CBA'.includes(d.result.tier)) break;
      n++; iso = D.add(iso, -1);
    }
    return n;
  }
  /** K after each settled day, for charts. */
  function series(p) {
    const pts = [{ iso: D.add(START, -1), K: 1 }];
    let iso = START; let K = 1;
    while (iso <= END) { const d = p.days[iso]; if (d && d.settled && d.result) { K = d.result.Kafter; pts.push({ iso, K }); } iso = D.add(iso, 1); }
    return pts;
  }
  function unlockedSet(p) {
    const s = new Set();
    for (const iso in p.days) { const d = p.days[iso]; if (d.settled && d.result && d.result.unlocked) s.add(iso); }
    return s;
  }
  function remainingDays(p) { const t = today(p); if (t > END) return 0; return D.diff(D.max(t, START), END) + 1; }

  // ---- achievements -------------------------------------------------------------
  const ACH = [
    { id: 'first-seal', name: 'Premier décret', en: 'Seal your first daily plan', test: p => Object.values(p.days).some(d => d.sealed) },
    { id: 'first-perfect', name: 'Sans faute', en: 'Complete 100% of a day', test: p => Object.values(p.days).some(d => d.result && d.result.tier === 'C') },
    { id: 'week', name: 'Semaine parfaite', en: '7 perfect days in a row', test: p => run(p, 'C') >= 7 },
    { id: 'fortnight', name: 'Quinzaine solide', en: '14 days in a row at 75% or more', test: p => run(p, 'CB') >= 14 },
    { id: 'month', name: 'Mois accompli', en: 'Log every day of a calendar month', test: p => ['01', '02', '03', '04'].some(m => monthLogged(p, m)) },
    { id: 'rebound', name: 'Le rebond', en: 'Follow a hard day with a perfect one', test: p => rebound(p) },
    { id: 'treasury', name: 'Trésor national', en: 'Hold 50 gems at once', test: p => p.gems >= 50 },
    { id: 'album-30', name: 'Philatéliste', en: 'Unlock 30 stamps', test: p => unlockedSet(p).size >= 30 },
    { id: 'album-60', name: 'Conservateur·rice', en: 'Unlock 60 stamps', test: p => unlockedSet(p).size >= 60 },
    { id: 'album-120', name: 'Album complet', en: 'Unlock all 120 stamps', test: p => unlockedSet(p).size >= 120 },
    { id: 'hdi', name: 'Développement très élevé', en: 'Reach an HDI of 0.800', test: p => window.Economy.snapshot(p.K).hdi >= 0.8 },
    { id: 'term', name: 'Fin de mandat', en: 'Reach 30 April 2027', test: p => !!(p.days[END] && p.days[END].settled) }
  ];
  function run(p, tiers) {
    let best = 0, cur = 0, iso = START;
    while (iso <= END) { const d = p.days[iso]; if (d && d.result && tiers.includes(d.result.tier)) { cur++; best = Math.max(best, cur); } else cur = 0; iso = D.add(iso, 1); }
    return best;
  }
  function monthLogged(p, m) {
    const days = { '01': 31, '02': 28, '03': 31, '04': 30 }[m];
    for (let i = 1; i <= days; i++) { const d = p.days[`2027-${m}-${String(i).padStart(2, '0')}`]; if (!d || !d.result || !d.result.total) return false; }
    return true;
  }
  function rebound(p) {
    let iso = START; let prevBad = false;
    while (iso <= END) { const d = p.days[iso]; const t = d && d.result && d.result.tier; if (t === 'C' && prevBad) return true; prevBad = t === 'D' || t === 'E'; iso = D.add(iso, 1); }
    return false;
  }
  function checkAchievements(p) {
    const fresh = [];
    for (const a of ACH) if (!p.ach[a.id] && a.test(p)) { p.ach[a.id] = Date.now(); fresh.push(a); }
    return fresh;
  }

  window.Game = {
    START, END, WINDOW_DAYS, STARTING_GEMS, TIERS, TIER_ORDER, MEDALS, ACH, D, T,
    tierFor, unlockKey, loadIndex, loadProfile, saveProfile, deleteProfile, hashPin, newProfile, uid,
    today, day, mode, stats, settle, catchUp, change, seal, toggleDone, closeDay,
    medal, streak, series, unlockedSet, remainingDays, checkAchievements, ledger
  };
})();
