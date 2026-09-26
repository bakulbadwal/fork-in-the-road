/* Fork in the Road — the apprentice: a small real network that learns to predict the fog, trained the way
   notebook 01 trains its UNet (foggy pin in, predict ε, squared error). Plain JavaScript: an MLP with two hidden
   layers, SiLU activations, a sinusoidal timestep embedding, hand-written backprop and Adam. Seeded, so the same
   settings train the same weights for everyone (up to floating-point differences between JavaScript engines).
   Exposed as window.FRNet (or module.exports in Node). */
(function (root) {
  "use strict";
  var FR = typeof require === "function" ? require("./core.js") : root.FR;
  var FREQS = [1, 2, 4, 8], NIN = 2 + 2 * FREQS.length;   // x, y, and sin/cos of t at four frequencies → 10 inputs

  function silu(z) { return z / (1 + Math.exp(-z)); }
  function dsilu(z) { var s = 1 / (1 + Math.exp(-z)); return s * (1 + z * (1 - s)); }
  function features(x, t) {
    var f = [x[0], x[1]], u = t / 999;
    for (var i = 0; i < FREQS.length; i++) { f.push(Math.sin(Math.PI * FREQS[i] * u)); f.push(Math.cos(Math.PI * FREQS[i] * u)); }
    return f;
  }

  // A network with layer sizes [NIN, h, h, 2]. Weights are flat arrays: W[l] is (out × in), b[l] is (out).
  function create(hidden, seed) {
    var r = FR.rng(seed == null ? 1 : seed), sizes = [NIN, hidden, hidden, 2], W = [], b = [], m = [], v = [], mb = [], vb = [], n = 0;
    for (var l = 0; l < 3; l++) {
      var nin = sizes[l], nout = sizes[l + 1], lim = Math.sqrt(6 / (nin + nout)), w = new Float64Array(nin * nout);
      for (var i = 0; i < w.length; i++) w[i] = (r() * 2 - 1) * lim;
      W.push(w); b.push(new Float64Array(nout)); m.push(new Float64Array(w.length)); v.push(new Float64Array(w.length)); mb.push(new Float64Array(nout)); vb.push(new Float64Array(nout));
      n += w.length + nout;
    }
    return { sizes: sizes, W: W, b: b, m: m, v: v, mb: mb, vb: vb, params: n, step: 0, seed: seed == null ? 1 : seed };
  }
  // Forward pass for one input; returns the activations needed for backprop.
  function forward(net, f) {
    var a = [f], z = [];
    for (var l = 0; l < 3; l++) {
      var nin = net.sizes[l], nout = net.sizes[l + 1], W = net.W[l], bb = net.b[l], zl = new Float64Array(nout), al = new Float64Array(nout), prev = a[l];
      for (var o = 0; o < nout; o++) { var s = bb[o], row = o * nin; for (var i = 0; i < nin; i++) s += W[row + i] * prev[i]; zl[o] = s; al[o] = l < 2 ? silu(s) : s; }
      z.push(zl); a.push(al);
    }
    return { a: a, z: z, out: a[3] };
  }
  // The apprentice's noise prediction ε̂ for a foggy pin x at timestep t.
  function predictEps(net, x, t) { return Array.prototype.slice.call(forward(net, features(x, t)).out); }
  // Her clean guess, from the noise prediction, as in step 2: x̂₀ = (x_t − √(1−ᾱ)·ε̂) / √ᾱ, clipped to the map.
  // The clip is what diffusers' `clip_sample` does: near t = 999, √ᾱ is about 0.00005, so any error in ε̂ is multiplied
  // by 20,000 and a raw guess flies off the map. The exact denoiser never needs it; a learned one always does.
  var CLIP = 3;
  function predictX0(net, x, t, ab, clip) {
    var e = predictEps(net, x, t), a = Math.sqrt(ab), bq = Math.sqrt(1 - ab), c = clip == null ? CLIP : clip;
    return [(x[0] - bq * e[0]) / a, (x[1] - bq * e[1]) / a].map(function (v) { return c ? Math.max(-c, Math.min(c, v)) : v; });
  }

  /* One training step on a minibatch, exactly notebook 01's loop: pick clean pins, random timesteps and fresh noise,
     fog them with the schedule, predict the noise, take the mean squared error, Adam-update every weight. */
  function trainStep(net, o) {
    var B = o.batch || 64, lr = o.lr == null ? 2e-3 : o.lr, r = o.rng, demos = o.demos, sch = o.sch, beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
    var gW = net.W.map(function (w) { return new Float64Array(w.length); }), gb = net.b.map(function (b) { return new Float64Array(b.length); }), loss = 0, last = null;
    for (var n = 0; n < B; n++) {
      var p = demos[Math.floor(r() * demos.length)], t = Math.floor(r() * 1000), ab = FR.abAt(sch, t), e = [r.normal(), r.normal()];
      var xt = [Math.sqrt(ab) * p[0] + Math.sqrt(1 - ab) * e[0], Math.sqrt(ab) * p[1] + Math.sqrt(1 - ab) * e[1]];
      var fw = forward(net, features(xt, t)), out = fw.out;
      var d = [2 * (out[0] - e[0]) / (2 * B), 2 * (out[1] - e[1]) / (2 * B)];   // d(mean squared error)/d(out), averaged over the batch and both outputs
      loss += ((out[0] - e[0]) * (out[0] - e[0]) + (out[1] - e[1]) * (out[1] - e[1])) / 2;
      if (n === 0) last = { t: t, xt: xt, eps: e, pred: [out[0], out[1]] };
      // backprop
      var delta = d;
      for (var l = 2; l >= 0; l--) {
        var nin = net.sizes[l], nout = net.sizes[l + 1], prev = fw.a[l], W = net.W[l], gWl = gW[l], gbl = gb[l], next = new Float64Array(nin);
        for (var oo = 0; oo < nout; oo++) {
          var dz = delta[oo]; if (dz === 0) continue;
          gbl[oo] += dz; var row = oo * nin;
          for (var i = 0; i < nin; i++) { gWl[row + i] += dz * prev[i]; next[i] += dz * W[row + i]; }
        }
        if (l > 0) { var zprev = fw.z[l - 1]; for (var k = 0; k < nin; k++) next[k] *= dsilu(zprev[k]); }
        delta = next;
      }
    }
    // Adam
    net.step++;
    var c1 = 1 - Math.pow(beta1, net.step), c2 = 1 - Math.pow(beta2, net.step);
    for (var l2 = 0; l2 < 3; l2++) {
      var W2 = net.W[l2], g = gW[l2], mm = net.m[l2], vv = net.v[l2];
      for (var j = 0; j < W2.length; j++) { mm[j] = beta1 * mm[j] + (1 - beta1) * g[j]; vv[j] = beta2 * vv[j] + (1 - beta2) * g[j] * g[j]; W2[j] -= lr * (mm[j] / c1) / (Math.sqrt(vv[j] / c2) + eps); }
      var b2 = net.b[l2], g2 = gb[l2], mb = net.mb[l2], vb = net.vb[l2];
      for (var q = 0; q < b2.length; q++) { mb[q] = beta1 * mb[q] + (1 - beta1) * g2[q]; vb[q] = beta2 * vb[q] + (1 - beta2) * g2[q] * g2[q]; b2[q] -= lr * (mb[q] / c1) / (Math.sqrt(vb[q] / c2) + eps); }
    }
    return { loss: loss / B, last: last };
  }
  // Train for a fixed number of steps (deterministic given the seed). onProgress(step, loss) is optional.
  function train(net, o, steps, onProgress) {
    var r = o.rng || FR.rng(o.seed == null ? 7 : o.seed), ema = null;
    for (var s = 0; s < steps; s++) {
      var res = trainStep(net, { batch: o.batch, lr: o.lr, rng: r, demos: o.demos, sch: o.sch });
      ema = ema == null ? res.loss : 0.98 * ema + 0.02 * res.loss;
      if (onProgress) onProgress(s + 1, res.loss, ema, res.last);
    }
    return ema;
  }
  // The irreducible loss: how wrong even the exact best guess is, on average, because a foggy pin could have come from several places.
  function floor(comps, basis, sch, n, seed) {
    var r = FR.rng(seed == null ? 5 : seed), tot = 0, cum = [], acc = 0;
    comps.forEach(function (c) { acc += Math.exp(c.lp); cum.push(acc); });   // pins are drawn with the mixture's own weights
    for (var i = 0; i < n; i++) {
      var u = r() * acc, k = 0; while (k < cum.length - 1 && cum[k] < u) k++;
      var c = comps[k], p = [c.mu[0] + Math.sqrt(basis.lam[0]) * r.normal(), c.mu[1] + Math.sqrt(basis.lam[1]) * r.normal()];
      var t = Math.floor(r() * 1000), ab = FR.abAt(sch, t), e = [r.normal(), r.normal()];
      var xt = [Math.sqrt(ab) * p[0] + Math.sqrt(1 - ab) * e[0], Math.sqrt(ab) * p[1] + Math.sqrt(1 - ab) * e[1]];
      var eh = FR.epsFrom(xt, FR.denoise(xt, ab, comps, basis).x0, ab);
      tot += ((eh[0] - e[0]) * (eh[0] - e[0]) + (eh[1] - e[1]) * (eh[1] - e[1])) / 2;
    }
    return tot / n;
  }
  // The floor for a particular log: the best any predictor could do if it knew exactly which pins were logged
  // (the empirical posterior: weights over the logged pins, ∝ exp(−|x_t − √ᾱ·p|² / (2(1−ᾱ)))). Lower than the
  // population floor, because a small log is easier to "know" than the whole square: that gap is memorisation.
  function floorEmpirical(demos, sch, n, seed) {
    var r = FR.rng(seed == null ? 5 : seed), tot = 0;
    for (var i = 0; i < n; i++) {
      var p = demos[Math.floor(r() * demos.length)], t = Math.floor(r() * 1000), ab = FR.abAt(sch, t), a = Math.sqrt(ab), b2 = 1 - ab, e = [r.normal(), r.normal()];
      var xt = [a * p[0] + Math.sqrt(b2) * e[0], a * p[1] + Math.sqrt(b2) * e[1]], best = -Infinity, lw = new Float64Array(demos.length);
      for (var k = 0; k < demos.length; k++) { var dx = xt[0] - a * demos[k][0], dy = xt[1] - a * demos[k][1]; lw[k] = -(dx * dx + dy * dy) / (2 * b2); if (lw[k] > best) best = lw[k]; }
      var sw = 0, mx = 0, my = 0;
      for (k = 0; k < demos.length; k++) { var w = Math.exp(lw[k] - best); sw += w; mx += w * demos[k][0]; my += w * demos[k][1]; }
      var x0 = [mx / sw, my / sw], eh = FR.epsFrom(xt, x0, ab);
      tot += ((eh[0] - e[0]) * (eh[0] - e[0]) + (eh[1] - e[1]) * (eh[1] - e[1])) / 2;
    }
    return tot / n;
  }
  // A gradient check through trainStep itself: one step on a seeded batch, the gradient read back from Adam's
  // first moment (m = 0.1·g on the first step), against finite differences of that batch's loss, on several weights and biases.
  function trainCheck(net, o) {
    function batchLoss(n) {
      var r = FR.rng(o.batchSeed || 3), B = 8, L = 0;
      for (var i = 0; i < B; i++) {
        var p = o.demos[Math.floor(r() * o.demos.length)], t = Math.floor(r() * 1000), ab = FR.abAt(o.sch, t), e = [r.normal(), r.normal()];
        var xt = [Math.sqrt(ab) * p[0] + Math.sqrt(1 - ab) * e[0], Math.sqrt(ab) * p[1] + Math.sqrt(1 - ab) * e[1]], out = forward(n, features(xt, t)).out;
        L += ((out[0] - e[0]) * (out[0] - e[0]) + (out[1] - e[1]) * (out[1] - e[1])) / 2;
      }
      return L / B;
    }
    var probe = create(net.sizes[1], net.seed), res = trainStep(probe, { batch: 8, lr: 0, rng: FR.rng(o.batchSeed || 3), demos: o.demos, sch: o.sch }), worst = 0;
    var picks = [[0, 0, 3], [0, 1, 40], [1, 0, 100], [2, 0, 5], [0, 2, 7], [1, 2, 20], [2, 2, 1]];   // [layer, kind (0 weight, 1 bias of that layer via kind 2), index]
    picks.forEach(function (pk) {
      var l = pk[0], isBias = pk[1] === 2, idx = pk[2], arr = isBias ? net.b[l] : net.W[l], g = (isBias ? probe.mb[l][idx] : probe.m[l][idx]) / 0.1, h = 1e-6, w0 = arr[idx];
      var fresh = create(net.sizes[1], net.seed), tgt = isBias ? fresh.b[l] : fresh.W[l];
      tgt[idx] = w0 + h; var lp = batchLoss(fresh); tgt[idx] = w0 - h; var lm = batchLoss(fresh); tgt[idx] = w0;
      var num = (lp - lm) / (2 * h), rel = Math.abs(g - num) / Math.max(1e-9, Math.abs(num)); if (rel > worst) worst = rel;
    });
    return { worstRelativeError: worst, checked: picks.length, loss: res.loss };
  }
  // A finite-difference check of the gradient on one weight, for the acceptance script.
  function gradCheck(net, o) {
    var r0 = FR.rng(99), demos = o.demos, sch = o.sch;
    var p = demos[0], t = 400, ab = FR.abAt(sch, t), e = [0.3, -0.7], xt = [Math.sqrt(ab) * p[0] + Math.sqrt(1 - ab) * e[0], Math.sqrt(ab) * p[1] + Math.sqrt(1 - ab) * e[1]];
    function lossAt() { var out = forward(net, features(xt, t)).out; return ((out[0] - e[0]) * (out[0] - e[0]) + (out[1] - e[1]) * (out[1] - e[1])) / 2; }
    // analytic gradient for one sample (batch of 1)
    var gW = net.W.map(function (w) { return new Float64Array(w.length); }), fw = forward(net, features(xt, t)), out = fw.out, delta = [(out[0] - e[0]), (out[1] - e[1])];
    for (var l = 2; l >= 0; l--) {
      var nin = net.sizes[l], nout = net.sizes[l + 1], prev = fw.a[l], W = net.W[l], next = new Float64Array(nin);
      for (var oo = 0; oo < nout; oo++) { var dz = delta[oo], row = oo * nin; for (var i = 0; i < nin; i++) { gW[l][row + i] += dz * prev[i]; next[i] += dz * W[row + i]; } }
      if (l > 0) { var zprev = fw.z[l - 1]; for (var k = 0; k < nin; k++) next[k] *= dsilu(zprev[k]); }
      delta = next;
    }
    var idx = 7, h = 1e-6, w0 = net.W[0][idx];
    net.W[0][idx] = w0 + h; var lp = lossAt(); net.W[0][idx] = w0 - h; var lm = lossAt(); net.W[0][idx] = w0;
    return { analytic: gW[0][idx], numeric: (lp - lm) / (2 * h) };
  }

  var N = { NIN: NIN, features: features, create: create, forward: forward, predictEps: predictEps, predictX0: predictX0, trainStep: trainStep, train: train, floor: floor, floorEmpirical: floorEmpirical, gradCheck: gradCheck, trainCheck: trainCheck };
  if (typeof module !== "undefined" && module.exports) module.exports = N; else root.FRNet = N;
})(typeof window !== "undefined" ? window : this);
