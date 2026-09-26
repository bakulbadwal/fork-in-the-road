/* Prints the numbers ACCEPTANCE.md quotes. Run: node tests/check.js */
"use strict";
var FR = require("../js/core.js"), S = require("../js/sim.js");
var cos = FR.schedule("cosine"), lin = FR.schedule("linear");
function f(x, d) { return Number(x).toFixed(d == null ? 3 : d); }
// the same rounding the page uses: a non-zero count under 0.5% prints as "<1%"
function pct(n) { return (n > 0 && n < 0.005 ? "<1%" : Math.round(100 * n) + "%") + " (" + Math.round(n * 600) + ")"; }

console.log("== A. schedules ==");
[0, 250, 500, 750, 999].forEach(function (t) {
  console.log("t=" + t, "cosine √ᾱ=" + f(Math.sqrt(cos.ab[t])), "√(1−ᾱ)=" + f(Math.sqrt(1 - cos.ab[t])), "| linear √ᾱ=" + f(Math.sqrt(lin.ab[t])), "√(1−ᾱ)=" + f(Math.sqrt(1 - lin.ab[t])));
});
console.log("ᾱ_999 cosine", cos.ab[999].toExponential(2), "linear", lin.ab[999].toExponential(2));
console.log("timesteps(3)", FR.timesteps(3), "timesteps(10)", FR.timesteps(10), "timesteps(1000) first/last", FR.timesteps(1000)[0], FR.timesteps(1000)[999]);
// the two volume knobs' squares always sum to 1
console.log("√ᾱ² + √(1−ᾱ)² at t=500:", f(cos.ab[500] + (1 - cos.ab[500]), 6));
// half-way point: first t where √ᾱ < √(1−ᾱ)
function half(sch) { for (var t = 0; t < 1000; t++) if (sch.ab[t] < 0.5) return t; }
console.log("ᾱ crosses 0.5 at t =", half(cos), "(cosine)", half(lin), "(linear)");

console.log("\n== B. the denoiser ==");
var comps = S.map2d(0), mean = FR.mixtureMean(comps);
console.log("mixture mean (the averager's answer):", mean.map(function (v) { return f(v); }), "in cart?", S.inCart(mean[0], mean[1], 0));
// null case: an un-noised point on a blob centre must come back unchanged (t = -1 → ᾱ = 1)
var d0 = FR.denoise(comps[3].mu, 1 - 1e-12, comps, S.BASIS2);
console.log("denoise(centre, ᾱ≈1) − centre:", f(d0.x0[0] - comps[3].mu[0], 6), f(d0.x0[1] - comps[3].mu[1], 6));
// from pure noise the guess is the mean (up to a vanishing term)
var dT = FR.denoise([1.7, -0.4], cos.ab[999], comps, S.BASIS2);
console.log("denoise(x_T, t=999) ≈ mean:", dT.x0.map(function (v) { return f(v, 4); }));
// ε-prediction ↔ x0-prediction round trip
var x0 = [0.9, 0.3], eps = [0.5, -1.2], ab = cos.ab[300], xt = FR.qSample(x0, eps, ab);
var back = FR.epsFrom(xt, x0, ab);
console.log("ε round trip:", back.map(function (v) { return f(v, 6); }));
// the guess from a lightly noised left point stays left; heavy noise pulls it to the middle
var pt = comps[3].mu; [100, 300, 500, 700, 900, 999].forEach(function (t) {
  var xt2 = FR.qSample(pt, [0.3, -0.2], cos.ab[t]), g = FR.denoise(xt2, cos.ab[t], comps, S.BASIS2).x0;
  console.log(" t=" + t, "guess x=" + f(g[0]), "y=" + f(g[1]), S.classify(g[0], g[1], 0));
});

console.log("\n== C. passes (2-D map, cosine, 600 chains, seed 11) ==");
var K_LIST = [1, 2, 3, 5, 10, 20, 50, 100, 1000];
var table = {};
K_LIST.forEach(function (K) { var r = S.run2d({ K: K, eta: 0, sch: cos, fx: 0 }); table[K] = r.tally; console.log(" K=" + K, "left " + pct(r.tally.left / 600), "right " + pct(r.tally.right / 600), "cart " + pct(r.tally.cart / 600)); });
console.log("η = 1 (DDPM-like):");
[2, 5, 10, 50].forEach(function (K) { var r = S.run2d({ K: K, eta: 1, sch: cos, fx: 0 }); console.log(" K=" + K, "cart " + pct(r.tally.cart / 600), "left " + pct(r.tally.left / 600)); });
console.log("linear schedule:");
[1, 2, 5, 10].forEach(function (K) { var r = S.run2d({ K: K, eta: 0, sch: lin, fx: 0 }); console.log(" K=" + K, "cart " + pct(r.tally.cart / 600)); });
console.log("demos: " + S.demos2d(100, 7, 0).filter(function (p) { return p.side < 0; }).length + " left-drive positions of 600");
console.log("budget: a card of 8 pins at 10 pins/s lasts 0.8 s; at 10 ms/pass, passes that fit = " + Math.floor(800 / 10) + "; 10 passes = 0.1 s (" + Math.round(100 * 0.1 / 0.9) + "% of the cycle waiting); 1,000 passes = 10 s");

console.log("\n== F. flow matching (same fog, same map, Euler in K steps) ==");
[1, 2, 3, 4, 5, 10, 20, 50].forEach(function (K) {
  var fl = S.run2d({ K: K, flow: true, fx: 0 }), dd = S.run2d({ K: K, eta: 0, sch: cos, fx: 0 });
  console.log(" K=" + K, "flow cart " + pct(fl.tally.cart / 600) + " left " + pct(fl.tally.left / 600) + " straightness " + f(fl.straightness, 3), "| DDIM cart " + pct(dd.tally.cart / 600) + " straightness " + f(dd.straightness, 3));
});
// null cases: at t = 0 the velocity points at the mixture mean; the last Euler step lands on E[x1 | x_t]
var v0 = FR.flowVelocity([1.2, -0.7], 0, comps, S.BASIS2);
console.log("v(x, t=0) + x = mean?", v0.v.map(function (v, i) { return f(v + [1.2, -0.7][i], 4); }), "· weights at t=0 uniform:", f(Math.max.apply(null, v0.w) - Math.min.apply(null, v0.w), 6));
var one = FR.flowSample({ K: 1, comps: comps, basis: S.BASIS2, D: 2, n: 3, seed: 5 });
console.log("K=1 lands on the mean:", one.map(function (c) { return c.x.map(function (v) { return f(v, 3); }).join(","); }).join(" | "));
// same fog, same pin: with the exact field, DDIM (η = 0) and flow matching integrate the same ODE in different coordinates
[10, 50].forEach(function (K) {
  var fl = S.run2d({ K: K, flow: true, fx: 0 }), dd = S.run2d({ K: K, eta: 0, sch: cos, fx: 0 }), same = 0, gap = 0, stD = 0;
  var ts = FR.timesteps(K);
  fl.chains.forEach(function (c, i) {
    var d = dd.chains[i], cl = S.classify(c.x[0], c.x[1], 0, fl.comps), cd = S.classify(d.x[0], d.x[1], 0, dd.comps);
    if (cl === cd) same++; gap = Math.max(gap, Math.hypot(c.x[0] - d.x[0], c.x[1] - d.x[1]));
    // DDIM's trail redrawn in flow's coordinates: x_flow = x_DDIM / (√ᾱ + √(1−ᾱ))
    var tr = d.trail.map(function (p, s) { var ab = s < ts.length ? FR.abAt(cos, ts[s]) : 1, den = Math.sqrt(ab) + Math.sqrt(1 - ab); return [p[0] / den, p[1] / den]; });
    stD += FR.straightness(tr);
  });
  console.log(" K=" + K + ": same side " + same + "/600 · max gap between the two pins " + f(gap, 3) + " · DDIM's trails redrawn in flow's coordinates: straightness " + f(stD / 600, 3) + " (flow's own " + f(fl.straightness, 3) + ", DDIM's own " + f(dd.straightness, 3) + ")");
});
console.log("drive with flow cards:");
var fbase = { policy: "flow", K: 10, Ta: 8, lookout: true, msPerPass: 10, sch: cos, cartAt: S.still(0), seed: 3 };
[1, 2, 5, 10].forEach(function (K) { var r = S.fleet(Object.assign({}, fbase, { K: K }), 20); console.log(" flow K=" + K + ": hits " + r.hits + "/20 · flips " + f(r.flips, 2) + " · time " + f(r.time, 1) + " s"); });

console.log("\n== G. the apprentice (a real network; about 45 s) ==");
var N = require("../js/net.js"), net0 = N.create(32, 1), gc = N.gradCheck(net0, { demos: [[0.5, 0.2]], sch: cos });
console.log("weights " + net0.params + " · gradient check: analytic " + gc.analytic.toExponential(4) + " vs finite difference " + gc.numeric.toExponential(4));
console.log("loss floor (exact denoiser, 20,000 pairs): " + f(N.floor(comps, S.BASIS2, cos, 20000, 5), 3));
var exG = S.run2d({ K: 10, eta: 0, sch: cos, fx: 0 }), exF = S.fidelity(exG.chains.map(function (c) { return c.x; }), comps);
console.log("exact K=10: cart " + exG.tally.cart + " · left " + exG.tally.left + " · route distance " + f(exF.onroute, 2));
function apprentice(nLeft, steps) {
  var demos = S.demosSplit(50, nLeft, 7, 0).map(function (p) { return [p.x0, p.y0]; }), n = N.create(32, 1);
  var ema = N.train(n, { demos: demos, sch: cos, seed: 7 }, steps);
  function lift(K) { var r = FR.sample({ K: K, eta: 0, sch: cos, D: 2, n: 600, seed: 11, predict: function (x, t, ab) { return { x0: N.predictX0(n, x, t, ab) }; } }); var p = r.map(function (c) { return c.x; }); return { t: S.tally(p, 0, comps), fi: S.fidelity(p, comps) }; }
  var k10 = lift(10), k1 = lift(1);
  console.log(" " + nLeft + " left of 50 · " + steps + " steps · loss " + f(ema, 3) + " → K=10: cart " + k10.t.cart + " · left " + k10.t.left + " (" + Math.round(100 * k10.t.left / 600) + "%) · route distance " + f(k10.fi.onroute, 2) + " · left blobs " + k10.fi.leftBlobs + "/6 · clipped " + k10.fi.offmap + " | K=1: clipped " + k1.fi.offmap + "/600");
}
[300, 3000, 10000].forEach(function (st) { apprentice(25, st); });
[10, 5, 1].forEach(function (nl) { apprentice(nl, 10000); });
apprentice(1, 30000);
var pc10 = S.map2d(0); pc10.forEach(function (k) { k.lp = Math.log((k.side < 0 ? 0.1 : 0.9) / 6); });
var ex10 = S.tally(FR.sample({ K: 10, eta: 0, sch: cos, D: 2, n: 600, seed: 11, comps: pc10, basis: S.BASIS2 }).map(function (c) { return c.x; }), 0, pc10);
console.log(" exact cartographer with a 10% left prior: left " + ex10.left + " (" + Math.round(100 * ex10.left / 600) + "%)");

console.log("\n== D. the lookout (conditioning) ==");
[0.4, 0.7, 1.0].forEach(function (fx) {
  var seen = S.run2d({ K: 10, eta: 0, sch: cos, fx: fx, fxSeen: fx }), blind = S.run2d({ K: 10, eta: 0, sch: cos, fx: fx, fxSeen: 0 });
  console.log(" cart at " + fx + ": with lookout cart " + pct(seen.tally.cart / 600) + " · blind cart " + pct(blind.tally.cart / 600) + " (blind left-route " + pct(blind.tally.left / 600) + ", in-cart samples on the right route: " + blind.chains.filter(function (c) { return S.inCart(c.x[0], c.x[1], fx) && S.sideOf(c.x[0], c.x[1], blind.comps) > 0; }).length + ")");
});

console.log("\n== E. the drive (16-waypoint card) ==");
var base = { policy: "diffusion", K: 10, eta: 0, Ta: 8, lookout: true, msPerPass: 10, sch: cos, cartAt: S.still(0), seed: 3 };
function report(name, cfg, n) { var r = S.fleet(cfg, n || 20); console.log(" " + name + ": hits " + r.hits + "/" + r.n + " · flips " + f(r.flips, 2) + " · jitter " + f(r.jitter, 3) + " · time " + f(r.time, 1) + " s"); return r; }
var e1 = report("cartographer K10 Ta8", base);
console.log("  decisions per run:", e1.runs[0].decisions.length, "· first card side:", e1.runs[0].decisions[0].side, "· sides across 20 runs: left " + e1.runs.filter(function (r) { return r.decisions[0].side < 0; }).length);
report("averager", Object.assign({}, base, { policy: "averager" }));
report("cartographer K1", Object.assign({}, base, { K: 1 }));
report("cartographer K2", Object.assign({}, base, { K: 2 }));
report("Ta1 (replan every checkpoint)", Object.assign({}, base, { Ta: 1 }));
report("Ta4", Object.assign({}, base, { Ta: 4 }));
report("Ta16 (drive the whole card)", Object.assign({}, base, { Ta: 16 }));
report("Ta1, K50", Object.assign({}, base, { Ta: 1, K: 50 }));
console.log("-- the push: cart jumps 0 → 0.7 at t = 0.5 s --");
report("lookout, push", Object.assign({}, base, { cartAt: S.pushed(0, 0.5, 0.7) }));
report("blind, push", Object.assign({}, base, { lookout: false, cartAt: S.pushed(0, 0.5, 0.7) }));
report("blind, cart parked at 0.7", Object.assign({}, base, { lookout: false, cartAt: S.still(0.7) }));
report("averager, push", Object.assign({}, base, { policy: "averager", cartAt: S.pushed(0, 0.5, 0.7) }));
report("lookout, push, Ta16 (whole card)", Object.assign({}, base, { Ta: 16, cartAt: S.pushed(0, 0.5, 0.7) }));
report("averager, Ta1", Object.assign({}, base, { policy: "averager", Ta: 1 }));
report("averager, cart parked at 0.7", Object.assign({}, base, { policy: "averager", cartAt: S.still(0.7) }));
console.log("-- the pacing vendor: cart at 0.8·sin(2πt/8) --");
report("K10 (0.1 s think)", Object.assign({}, base, { cartAt: S.pacing(0.8, 8) }));
report("K1000 (10 s think)", Object.assign({}, base, { K: 1000, cartAt: S.pacing(0.8, 8) }));
report("K1000, Ta2", Object.assign({}, base, { K: 1000, Ta: 2, cartAt: S.pacing(0.8, 8) }));
report("K1000, faster motor (dt 0.05)", Object.assign({}, base, { K: 1000, dtWp: 0.05, cartAt: S.pacing(0.8, 8) }));
report("K1000, Ta16", Object.assign({}, base, { K: 1000, Ta: 16, cartAt: S.pacing(0.8, 8) }));
