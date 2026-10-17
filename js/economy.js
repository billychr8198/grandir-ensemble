/* ==========================================================================
   Grandir Ensemble — national indicator model
   --------------------------------------------------------------------------
   One hidden state drives everything: the Élan national K (national momentum).
   K starts at 1.0000 on 1 January 2027. Each settled day multiplies it:

        K_t = K_{t-1} × (1 + r_t)     r ∈ {+0.60%, +0.30%, +0.15%, −0.15%, −0.30%}

   A perfect 120-day term gives K* = 1.006^120 = 2.0507, so the log-progress
   of a perfect term is G* = 120·ln(1.006) = 0.71817.

   Every indicator is a calibrated transmission of K:

   • "Level" indicators (GDP, GNI, tourists) grow with an elasticity ε:
          X = X0 · K^ε,         ε = ln(X_target / X0) / G*

   • "Bounded" indicators follow a diminishing-returns curve toward an
     asymptote F that is never reached inside one term:
          X = F − (F − X0) · K^(−λ),   λ = 0.75
     (for "lower is better" indicators F sits below, so X falls).

   • Composite indicators are computed with their real formulas
     (UNDP HDI geometric mean, WGI percentile from the standard normal, etc.)

   • World ranks are read off a modelled world distribution N(μ, σ):
          rank = 1 + round((N − 1) · P(country beats you))

   Calibration: start values describe a nation in deep difficulty; targets are
   what a flawless 120-day term reaches (at or above France's real record).
   ========================================================================== */
(function () {
  'use strict';
  const DAYS = 120;
  const G_STAR = DAYS * Math.log(1.006);

  // Standard normal CDF (Abramowitz–Stegun 7.1.26, |err| < 7.5e-8)
  function Phi(z) {
    const s = z < 0 ? -1 : 1; const x = Math.abs(z) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return 0.5 * (1 + s * y);
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---- primitive drivers -------------------------------------------------
  // kind: 'level' | 'gap' | 'floor'
  const D = {
    gdp:   { kind: 'level', x0: 11200, xt: 50800, min: 2500 },          // US$ per person
    gni:   { kind: 'level', x0: 9500,  xt: 62000, min: 1500, max: 75000 }, // 2021 PPP $
    tour:  { kind: 'level', x0: 21,    xt: 104,   min: 4 },              // millions / yr
    le:    { kind: 'gap', x0: 61.0, xt: 84.5, min: 45 },        // years
    eys:   { kind: 'gap', x0: 10.2, xt: 17.0, min: 5 },         // years
    mys:   { kind: 'gap', x0: 5.8,  xt: 12.8, min: 2 },         // years
    uhc:   { kind: 'gap', x0: 38,   xt: 97, min: 15, max: 100 },        // WHO UHC index
    happy: { kind: 'gap', x0: 4.35, xt: 7.30,  min: 2.5 },       // Cantril 0–10
    pisa:  { kind: 'gap', x0: 382,  xt: 528, min: 300 },       // mean score
    dbiz:  { kind: 'gap', x0: 46.5, xt: 86.0, min: 20, max: 100 },        // 0–100
    wgi:   { kind: 'gap', x0: -0.72, xt: 1.95, min: -2.5, max: 2.5 },      // −2.5…+2.5
    gpi:   { kind: 'floor', x0: 3.05, xt: 1.30, min: 1, max: 3.8 },      // 1–5, lower better
    gini:  { kind: 'floor', x0: 48.5, xt: 25.5, min: 18, max: 65 }        // 0–100, lower better
  };
  // Bounded indicators share one curvature λ = 0.75 (diminishing returns that
  // still leave the last month of the term worth fighting for). The asymptote F
  // is then solved so that a perfect term lands exactly on the target:
  //   F = (X_target − X0·c) / (1 − c),  c = exp(−λ·G*)
  const LAMBDA = 0.75, C = Math.exp(-LAMBDA * G_STAR);
  for (const k in D) {
    const d = D[k];
    if (d.kind === 'level') d.e = Math.log(d.xt / d.x0) / G_STAR;
    else { d.l = LAMBDA; d.F = (d.xt - d.x0 * C) / (1 - C); }
  }
  function drive(k, K) {
    const d = D[k];
    let v;
    if (d.kind === 'level') v = d.x0 * Math.pow(K, d.e);
    else v = d.F - (d.F - d.x0) * Math.pow(K, -d.l);   // same algebra for gap and floor
    return clamp(v, d.min ?? -Infinity, d.max ?? Infinity);
  }

  // ---- full national snapshot -----------------------------------------------
  function snapshot(K) {
    const p = {}; for (const k in D) p[k] = drive(k, K);
    // HDI (UNDP 2025 method, 2021 PPP goalposts)
    const Ih = clamp((p.le - 20) / 65, 0, 1);
    const Ie = (clamp(p.mys / 15, 0, 1) + clamp(p.eys / 18, 0, 1)) / 2;
    const Ii = clamp((Math.log(p.gni) - Math.log(100)) / (Math.log(75000) - Math.log(100)), 0, 1);
    const hdi = Math.cbrt(Ih * Ie * Ii);
    // Health system performance score and WHO-style rank of 191
    const health = 0.5 * clamp((p.le - 40) / 47 * 100, 0, 100) + 0.5 * p.uhc;
    const rank = (N, x, mu, sd, lowerBetter) => {
      const beat = lowerBetter ? Phi((x - mu) / sd) : 1 - Phi((x - mu) / sd);
      return 1 + Math.round((N - 1) * beat);
    };
    return {
      K, parts: p, Ih, Ie, Ii,
      gdp: p.gdp, gdpRank: rank(190, Math.log(p.gdp), Math.log(9000), 1.25),
      hdi, hdiRank: rank(193, hdi, 0.735, 0.15),
      health, healthRank: rank(191, health, 62, 12),
      tour: p.tour,
      happy: p.happy, happyRank: rank(147, p.happy, 5.55, 1.12),
      pisa: p.pisa, pisaRank: rank(81, p.pisa, 445, 48),
      pisaSub: { math: p.pisa - 4, read: p.pisa - 4, sci: p.pisa + 8 },
      dbiz: p.dbiz, dbizRank: rank(190, p.dbiz, 63, 12),
      wgi: p.wgi, wgiPct: Phi(p.wgi) * 100,
      gpi: p.gpi, gpiRank: rank(163, p.gpi, 2.08, 0.42, true),
      gini: p.gini, giniRank: rank(170, p.gini, 37, 8, true)
    };
  }

  const fmt = {
    money: v => '$' + Math.round(v).toLocaleString('en-US'),
    n: (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  };

  // ---- display catalogue ----------------------------------------------------
  // France references: HDR 2025 (UNDP), WHR 2025, GPI 2025 (IEP), Atout France 2025,
  // PISA 2022 (OECD), Doing Business 2020 (World Bank), WGI, World Bank Gini.
  const INDICATORS = [
    { key: 'gdp', name: 'GDP per capita', unit: 'current US$', better: 'high', icon: '€',
      value: s => fmt.money(s.gdp), raw: s => s.gdp, sub: s => `World rank ≈ ${s.gdpRank} of 190`,
      france: 'France today: ≈ $46,000 (2024)',
      math: `GDP = 11,200 × K^ε, with ε = ln(50,800 / 11,200) / G* ≈ ${D.gdp.e.toFixed(3)}. A +0.60% day therefore lifts output by ≈ ${((Math.pow(1.006, D.gdp.e) - 1) * 100).toFixed(2)}%; a −0.30% day costs ≈ ${((1 - Math.pow(0.997, D.gdp.e)) * 100).toFixed(2)}%.` },
    { key: 'hdi', name: 'Human Development Index', unit: '0 – 1', better: 'high', icon: '◎',
      value: s => fmt.n(s.hdi, 3), raw: s => s.hdi, sub: s => `Rank ≈ ${s.hdiRank} of 193 · life exp. ${s.parts.le.toFixed(1)} y`,
      france: 'France today: 0.920, 26th (HDR 2025)',
      math: 'UNDP formula: HDI = (I_health × I_education × I_income)^(1/3). I_health = (LE − 20)/65; I_education = ½(MYS/15 + EYS/18); I_income = ln(GNIpc/100)/ln(75,000/100). Life expectancy, schooling years and GNI each follow their own calibrated K-curve.' },
    { key: 'health', name: 'Global health ranking', unit: 'rank of 191', better: 'rank', icon: '✚',
      value: s => '#' + s.healthRank, raw: s => s.health, sub: s => `Health score ${s.health.toFixed(1)} / 100 · UHC ${s.parts.uhc.toFixed(0)}`,
      france: 'WHO 2000 ranked France 1st of 191',
      math: 'Health score S = ½·scale(LE, 40→87) + ½·UHC coverage index. World systems are modelled as N(62, 12); rank = 1 + round(190 × P(score > S)).' },
    { key: 'tour', name: 'International tourists', unit: 'million arrivals / year', better: 'high', icon: '✈',
      value: s => fmt.n(s.tour, 1) + ' M', raw: s => s.tour, sub: s => `≈ ${fmt.money(s.tour * 760).replace('$', '€')} M in receipts`,
      france: 'France today: ≈ 102 M visitors (2025 record)',
      math: `Arrivals = 21 M × K^ε, ε ≈ ${D.tour.e.toFixed(3)}. Receipts are estimated at ≈ €760 per visitor.` },
    { key: 'happy', name: 'World Happiness Index', unit: 'Cantril ladder 0 – 10', better: 'high', icon: '☺',
      value: s => fmt.n(s.happy, 2), raw: s => s.happy, sub: s => `Rank ≈ ${s.happyRank} of 147`,
      france: 'France today: ≈ 6.6, 33rd of 147 (WHR 2025)',
      math: `Diminishing returns: H = F − (F − 4.35)·K^(−0.75), asymptote F ≈ ${D.happy.F.toFixed(2)} (never reached within one term). World modelled as N(5.55, 1.12).` },
    { key: 'pisa', name: 'PISA score', unit: 'mean of maths, reading, science', better: 'high', icon: '✎',
      value: s => Math.round(s.pisa), raw: s => s.pisa, sub: s => `Maths ${Math.round(s.pisaSub.math)} · reading ${Math.round(s.pisaSub.read)} · science ${Math.round(s.pisaSub.sci)} · rank ≈ ${s.pisaRank} of 81`,
      france: 'France today: 474 / 474 / 487 (PISA 2022)',
      math: `P = F − (F − 382)·K^(−0.75), F ≈ ${D.pisa.F.toFixed(0)}. Sub-scores keep France's profile (science +8, maths and reading −4). Systems modelled as N(445, 48).` },
    { key: 'dbiz', name: 'Ease of doing business', unit: 'score 0 – 100', better: 'high', icon: '⚖',
      value: s => fmt.n(s.dbiz, 1), raw: s => s.dbiz, sub: s => `Rank ≈ ${s.dbizRank} of 190`,
      france: 'France: 76.8, 32nd (World Bank DB2020 — series ended 2021)',
      math: `B = F − (F − 46.5)·K^(−0.75), F ≈ ${D.dbiz.F.toFixed(1)}; capped at 100. Economies modelled as N(63, 12).` },
    { key: 'wgi', name: 'Government effectiveness', unit: 'WGI estimate −2.5 … +2.5', better: 'high', icon: '⌂',
      value: s => (s.wgi >= 0 ? '+' : '−') + fmt.n(Math.abs(s.wgi), 2), raw: s => s.wgi, sub: s => `Percentile rank ${s.wgiPct.toFixed(0)}`,
      france: 'France today: ≈ +1.2 (Worldwide Governance Indicators)',
      math: 'WGI estimates are standardised to a world mean of 0 and SD of 1, so percentile = Φ(estimate) × 100. E = F − (F + 0.72)·K^(−0.75), F ≈ ' + D.wgi.F.toFixed(2) + ', bounded to ±2.5.' },
    { key: 'gpi', name: 'Global Peace Index', unit: '1 – 5, lower is better', better: 'low', icon: '☮',
      value: s => fmt.n(s.gpi, 3), raw: s => s.gpi, sub: s => `Rank ≈ ${s.gpiRank} of 163`,
      france: 'France today: 1.97, 74th of 163 (GPI 2025)',
      math: `Falling toward a floor: GPI = F + (3.05 − F)·K^(−0.75), F ≈ ${D.gpi.F.toFixed(2)}; bounded to [1, 3.8]. Countries modelled as N(2.08, 0.42).` },
    { key: 'gini', name: 'Gini coefficient', unit: '0 – 100, lower is better', better: 'low', icon: '≈',
      value: s => fmt.n(s.gini, 1), raw: s => s.gini, sub: s => `Rank ≈ ${s.giniRank} of 170 (1 = most equal)`,
      france: 'France today: ≈ 31.5 (World Bank)',
      math: `Falling toward a floor: Gini = F + (48.5 − F)·K^(−0.75), F ≈ ${D.gini.F.toFixed(1)}. Countries modelled as N(37, 8), rank 1 = most equal.` }
  ];

  window.Economy = { DAYS, G_STAR, D, Phi, snapshot, INDICATORS, fmt };
})();
