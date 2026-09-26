/* Fork in the Road — the town square. A toy world, seeded and deterministic, exposed as window.FRSim.
   The demonstrations (where the dispatcher drove) are a hand-designed distribution; everything computed ON
   them (the denoiser, the sampler, the averager) is exact math from core.js. */
(function (root) {
  "use strict";
  var FR = typeof require === "function" ? require("./core.js") : root.FR;

  /* ---------- the square ---------- */
  var START_Y = -2.5, GOAL_Y = 2.5, VIEW = 3;
  var CART = { hw: 0.55, hh: 0.65 };            // the pretzel cart: a box centred at (fx, 0)
  var A = 1.3, BW = 1.3;                         // how far the routes swing out, and how long the swing is
  function bump(y) { return Math.exp(-(y / BW) * (y / BW)); }
  // The demonstrated route on side s (−1 left, +1 right) when the cart sits at fx. Starts and ends on the centre line.
  function routeX(y, s, fx) { return (fx + s * A) * bump(y); }
  function inCart(x, y, fx) { return Math.abs(x - fx) < CART.hw && Math.abs(y) < CART.hh; }
  function classify(x, y, fx) { return inCart(x, y, fx) ? "cart" : (x < fx ? "left" : "right"); }
  function tally(pts, fx) {
    var n = { left: 0, right: 0, cart: 0 };
    pts.forEach(function (p) { n[classify(p[0], p[1], fx)]++; });
    n.total = pts.length; return n;
  }

  /* ---------- the 2-D map (steps 1–5): one logged position per demo drive ---------- */
  var LEVELS = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0], SIG = 0.13;
  var BASIS2 = FR.identityBasis(2, SIG * SIG);
  function map2d(fx) {
    var comps = [];
    [-1, 1].forEach(function (s) { LEVELS.forEach(function (y) { comps.push({ mu: [routeX(y, s, fx), y], lp: Math.log(1 / 12), side: s }); }); });
    return comps;
  }
  function demos2d(n, seed, fx) {
    var r = FR.rng(seed), comps = map2d(fx), pts = [];
    for (var i = 0; i < n; i++) {
      var c = comps[Math.floor(r() * comps.length)];
      pts.push({ x0: c.mu[0] + SIG * r.normal(), y0: c.mu[1] + SIG * r.normal(), side: c.side, ex: r.normal(), ey: r.normal() });
    }
    return pts;
  }
  // Run the sampler on the 2-D map. The denoiser believes the cart is at fxSeen; the tally uses where it really is (fx).
  function run2d(o) {
    var comps = map2d(o.fxSeen == null ? o.fx : o.fxSeen);
    var res = FR.sample({ K: o.K, eta: o.eta || 0, sch: o.sch, comps: comps, basis: BASIS2, D: 2, n: o.n || 600, seed: o.seed == null ? 11 : o.seed });
    var pts = res.map(function (c) { return c.x; });
    return { chains: res, tally: tally(pts, o.fx), comps: comps };
  }

  /* ---------- the waypoint card (step 6 and the review board): 16 lateral positions ahead ---------- */
  var H = 16, DY = 0.16, KAPPA = 4, RHO = 0.7, DT_WP = 0.1;   // 16 checkpoints, 0.16 apart, driven at 10 per second
  var LAM = (function () { var g = [], s = 0, j; for (j = 0; j < H; j++) { g.push(Math.pow(2, -j)); s += g[j]; } return g.map(function (v) { return 0.16 * v / s; }); })();
  var BASIS16 = FR.dctBasis(H, LAM);            // smooth deviations: mostly a sideways shift, then a tilt, then a bend
  function chunkMean(px, py, s, fx) {
    var m = [], off = px - routeX(py, s, fx);
    for (var i = 1; i <= H; i++) m.push(routeX(py + i * DY, s, fx) + off * Math.pow(RHO, i));   // rejoin the demonstrated route
    return m;
  }
  // Which side the demonstrators took from here: 50/50 on the centre line, leaning with the courier's offset from the cart.
  function chunkComps(px, py, fx) {
    var l = KAPPA * (px - fx), z = Math.log(Math.exp(l) + Math.exp(-l));
    return [{ mu: chunkMean(px, py, -1, fx), lp: -l - z, side: -1 }, { mu: chunkMean(px, py, 1, fx), lp: l - z, side: 1 }];
  }
  function chunkYs(py) { var ys = []; for (var i = 1; i <= H; i++) ys.push(py + i * DY); return ys; }

  /* ---------- one drive across the square ----------
     cfg: policy 'diffusion' | 'averager' · K passes · eta · Ta executed per card · lookout (sees the cart) ·
          msPerPass · cartAt(t) → fx · seed · sch · dtWp (seconds per checkpoint) · maxDecisions
     The courier stands still while the card is being drawn (think time = K × msPerPass), then drives Ta checkpoints. */
  function drive(cfg) {
    var r = FR.rng(cfg.seed == null ? 1 : cfg.seed), sch = cfg.sch, dt = cfg.dtWp || DT_WP;
    var px = 0, py = START_Y, t = 0, hit = false, path = [{ x: 0, y: py, t: 0 }], decisions = [], flips = 0, lastSide = null;
    var Ta = cfg.Ta || 8, K = cfg.K || 10, ms = cfg.msPerPass == null ? 10 : cfg.msPerPass, max = cfg.maxDecisions || 80;
    while (py < GOAL_Y - 1e-9 && !hit && decisions.length < max) {
      var fxNow = cfg.cartAt(t), obsFx = cfg.lookout ? fxNow : (cfg.blindFx || 0);
      var comps = chunkComps(px, py, obsFx), chunk, think, weights = null;
      if (cfg.policy === "averager") { chunk = FR.mixtureMean(comps); think = ms / 1000; }
      else {
        var ts = FR.timesteps(K), x = []; for (var i = 0; i < H; i++) x.push(r.normal());
        for (var s = 0; s < ts.length; s++) {
          var tt = ts[s], next = s + 1 < ts.length ? ts[s + 1] : -1, abT = FR.abAt(sch, tt), abS = next < 0 ? null : FR.abAt(sch, next);
          var d = FR.denoise(x, abT, comps, BASIS16); weights = d.w;
          x = FR.ddimStep(x, d.x0, FR.epsFrom(x, d.x0, abT), abT, abS, cfg.eta || 0, r.normal);
        }
        chunk = x; think = K * ms / 1000;
      }
      var ys = chunkYs(py), iz = 0; for (var q = 1; q < H; q++) if (Math.abs(ys[q]) < Math.abs(ys[iz])) iz = q;
      var side = chunk[iz] < obsFx ? -1 : 1;
      if (lastSide !== null && side !== lastSide && py < 0) flips++;
      lastSide = side;
      decisions.push({ t: t, x: px, y: py, obsFx: obsFx, realFx: fxNow, chunk: chunk, ys: ys, side: side, think: think, w: weights });
      t += think;
      for (var e = 0; e < Ta && py < GOAL_Y - 1e-9; e++) {
        var nx = chunk[e], ny = ys[e];
        for (var u = 1; u <= 5 && !hit; u++) {                      // check the road between checkpoints, against where the cart is at that moment
          var f = u / 5; if (inCart(px + (nx - px) * f, py + (ny - py) * f, cfg.cartAt(t + dt * f))) hit = true;
        }
        t += dt; px = nx; py = ny; path.push({ x: px, y: py, t: t });
        if (hit) break;
      }
    }
    var jit = 0, m = 0;
    for (var p = 1; p + 1 < path.length; p++) { jit += Math.abs(path[p + 1].x - 2 * path[p].x + path[p - 1].x); m++; }
    return { path: path, decisions: decisions, hit: hit, arrived: !hit && py >= GOAL_Y - 1e-9, time: t, flips: flips, jitter: m ? jit / m : 0, finalFx: cfg.cartAt(t) };
  }
  // Many seeded drives, summarised.
  function fleet(cfg, n) {
    var hits = 0, flips = 0, jit = 0, time = 0, runs = [];
    for (var i = 0; i < n; i++) {
      var c = Object.assign({}, cfg, { seed: (cfg.seed || 0) * 1000 + i + 1 }), d = drive(c);
      runs.push(d); if (d.hit) hits++; flips += d.flips; jit += d.jitter; time += d.time;
    }
    return { n: n, hits: hits, hitRate: hits / n, flips: flips / n, jitter: jit / n, time: time / n, runs: runs };
  }
  var still = function (fx) { return function () { return fx; }; };
  var pushed = function (fx0, at, by) { return function (t) { return t >= at ? fx0 + by : fx0; }; };
  var pacing = function (amp, period) { return function (t) { return amp * Math.sin(2 * Math.PI * t / period); }; };

  var S = { START_Y: START_Y, GOAL_Y: GOAL_Y, VIEW: VIEW, CART: CART, A: A, bump: bump, routeX: routeX, inCart: inCart, classify: classify, tally: tally,
    LEVELS: LEVELS, SIG: SIG, BASIS2: BASIS2, map2d: map2d, demos2d: demos2d, run2d: run2d,
    H: H, DY: DY, KAPPA: KAPPA, LAM: LAM, BASIS16: BASIS16, chunkMean: chunkMean, chunkComps: chunkComps, chunkYs: chunkYs, DT_WP: DT_WP,
    drive: drive, fleet: fleet, still: still, pushed: pushed, pacing: pacing };
  if (typeof module !== "undefined" && module.exports) module.exports = S; else root.FRSim = S;
})(typeof window !== "undefined" ? window : this);
