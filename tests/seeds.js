// The slow half of ACCEPTANCE section G (about 3 minutes): the split study over ten training seeds and five fogs (G5),
// and the start-fog bias at fifty passes (G9). `node tests/seeds.js`. The fast half is in check.js.
var FR = require("../js/core.js"), S = require("../js/sim.js"), N = require("../js/net.js");
var cos = FR.schedule("cosine"), comps = S.map2d(0), TM = 899;
function f(x, d) { return Number(x).toFixed(d == null ? 2 : d); }
function priorComps(share) { var c = S.map2d(0); c.forEach(function (k) { k.lp = Math.log((k.side < 0 ? share : 1 - share) / 6); }); return c; }
function demos(nLeft) { return S.demosSplit(50, nLeft, 7, 0).map(function (p) { return [p.x0, p.y0]; }); }
function chain(x, ts, pc, r) {
  for (var s = 0; s < ts.length; s++) { var t = ts[s], nx = s + 1 < ts.length ? ts[s + 1] : -1, aT = FR.abAt(cos, t), aS = nx < 0 ? null : FR.abAt(cos, nx); var d = FR.denoise(x, aT, pc, S.BASIS2); x = FR.ddimStep(x, d.x0, FR.epsFrom(x, d.x0, aT), aT, aS, 0, r.normal); }
  return x;
}
// A pin drawn from the prior, fogged to t: the fog as it really is there.
function startTrue(pc, t, r) { var u = r(), acc = 0, k = 0; for (k = 0; k < pc.length; k++) { acc += Math.exp(pc[k].lp); if (u < acc) break; } if (k >= pc.length) k = pc.length - 1; var ab = FR.abAt(cos, t); var p = [pc[k].mu[0] + Math.sqrt(S.BASIS2.lam[0]) * r.normal(), pc[k].mu[1] + Math.sqrt(S.BASIS2.lam[1]) * r.normal()]; return [Math.sqrt(ab) * p[0] + Math.sqrt(1 - ab) * r.normal(), Math.sqrt(ab) * p[1] + Math.sqrt(1 - ab) * r.normal()]; }
console.log("== G9 at K = 50: exact cartographer's left share by start, 20,000 chains ==");
[0.2, 0.1, 0.02].forEach(function (share) {
  var pc = priorComps(share), n = 20000, out = [];
  [["centred N(0,I) at 899", false], ["true fog at 899", true]].forEach(function (cfg, ci) {
    var r = FR.rng(103 + ci), L = 0, ts = FR.timestepsFrom(50, TM);
    for (var i = 0; i < n; i++) { var x = cfg[1] ? startTrue(pc, ts[0], r) : [r.normal(), r.normal()]; x = chain(x, ts, pc, r); if (S.classify(x[0], x[1], 0, comps) === "left") L++; }
    out.push(cfg[0] + " " + f(100 * L / n, 1) + "%");
  });
  console.log(" prior " + (100 * share) + "%: " + out.join(" · "));
});
console.log("== G5: ten training seeds (7-16), 10,000 steps, K = 10 from centred fog at 899 ==");
var t0 = Date.now();
[[25, 0.5], [10, 0.2], [5, 0.1], [1, 0.02]].forEach(function (sp) {
  var d = demos(sp[0]), pc = priorComps(sp[1]), ts = FR.timestepsFrom(10, TM), fogSeeds = [11, 12, 13, 14, 15];
  function liftExact(seed) { var res = FR.sample({ K: 10, ts: ts, eta: 0, sch: cos, D: 2, n: 600, seed: seed, comps: pc, basis: S.BASIS2 }); return S.tally(res.map(function (c) { return c.x; }), 0, comps).left; }
  function liftNet(net, seed) { var res = FR.sample({ K: 10, ts: ts, eta: 0, sch: cos, D: 2, n: 600, seed: seed, predict: function (x, t, ab) { return { x0: N.predictX0(net, x, t, ab) }; } }); return S.tally(res.map(function (c) { return c.x; }), 0, comps).left; }
  var ex11 = liftExact(11), exMean = fogSeeds.map(liftExact).reduce(function (a, b) { return a + b; }, 0) / (600 * fogSeeds.length), ap11 = [], apMean = [];
  for (var seed = 7; seed <= 16; seed++) { var net = N.create(32, 1); N.train(net, { demos: d, sch: cos, seed: seed }, 10000); ap11.push(liftNet(net, 11)); apMean.push(fogSeeds.map(function (s) { return liftNet(net, s); }).reduce(function (a, b) { return a + b; }, 0) / (600 * fogSeeds.length)); }
  function stats(a) { var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length; return { m: m, sd: Math.sqrt(a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / (a.length - 1)), lo: Math.min.apply(null, a), hi: Math.max.apply(null, a) }; }
  var s11 = stats(ap11), sm = stats(apMean);
  console.log(" " + (100 * sp[1]) + "% log · fog 11: exact " + ex11 + ", apprentice [" + ap11.join(", ") + "] mean " + f(s11.m, 0) + " SD " + f(s11.sd, 0) + " (binomial SD " + f(Math.sqrt(600 * exMean * (1 - exMean)), 0) + ") · five fogs: exact " + f(100 * exMean, 1) + "%, apprentice " + f(100 * sm.m, 1) + "% ± SE " + f(100 * sm.sd / Math.sqrt(apMean.length)) + " (seeds " + f(100 * sm.lo, 1) + "–" + f(100 * sm.hi, 1) + "%)");
});
console.log("took " + ((Date.now() - t0) / 1000).toFixed(0) + " s");
