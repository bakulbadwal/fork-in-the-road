/* Fork in the Road — the math. Pure functions only, exposed as window.FR (or module.exports in Node).
   Everything here is exact: the DDPM forward process and the two noise schedules exactly as the
   diffusers library builds them (Hugging Face Diffusion Models Course, Unit 1), the Bayes-optimal
   denoiser for a Gaussian-mixture data distribution, and DDIM sampling with η (Song et al., 2021). */
(function (root) {
  "use strict";

  /* ---------- seeded randomness (so every demo is reproducible) ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    var f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.normal = function () {
      var u = 0, v = 0;
      while (u === 0) u = f();
      while (v === 0) v = f();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return f;
  }

  /* ---------- noise schedules, as diffusers' DDPMScheduler builds them ---------- */
  var T = 1000;
  // "linear": betas from 1e-4 to 0.02. "cosine": squaredcos_cap_v2 (Nichol & Dhariwal 2021), betas capped at 0.999.
  function schedule(kind) {
    var betas = new Array(T), ab = new Array(T), i, p = 1;
    if (kind === "linear") {
      for (i = 0; i < T; i++) betas[i] = 1e-4 + (0.02 - 1e-4) * i / (T - 1);
    } else {
      var f = function (t) { var c = Math.cos((t + 0.008) / 1.008 * Math.PI / 2); return c * c; };
      for (i = 0; i < T; i++) betas[i] = Math.min(1 - f((i + 1) / T) / f(i / T), 0.999);
    }
    for (i = 0; i < T; i++) { p *= 1 - betas[i]; ab[i] = p; }   // ᾱ_t = ∏ (1 − β_i)
    return { kind: kind === "linear" ? "linear" : "cosine", betas: betas, ab: ab };
  }
  function abAt(sch, t) { return t < 0 ? 1 : sch.ab[t]; }
  // The K timesteps a K-pass sampler visits, most noisy first (diffusers' "leading" spacing).
  function timesteps(K) { var ts = []; for (var i = 0; i < K; i++) ts.push(Math.round((T - 1) - i * T / K)); return ts; }

  /* ---------- the forward process ---------- */
  // x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε
  function qSample(x0, eps, ab) { var a = Math.sqrt(ab), b = Math.sqrt(1 - ab); return x0.map(function (v, i) { return a * v + b * eps[i]; }); }

  /* ---------- the data model: a Gaussian mixture with a shared covariance ---------- */
  // A basis describes the shared covariance C = Σ_j λ_j u_j u_jᵀ (U rows are orthonormal vectors u_j).
  function identityBasis(D, s2) {
    var U = [], lam = [];
    for (var j = 0; j < D; j++) { var row = new Array(D).fill(0); row[j] = 1; U.push(row); lam.push(s2); }
    return { U: U, lam: lam, D: D };
  }
  // DCT-II basis: u_0 is a constant shift, u_1 a tilt, u_2 a bend … so a covariance with decaying λ_j makes smooth curves.
  function dctBasis(D, lam) {
    var U = [];
    for (var j = 0; j < D; j++) {
      var c = Math.sqrt((j === 0 ? 1 : 2) / D), row = [];
      for (var i = 0; i < D; i++) row.push(c * Math.cos(Math.PI * (i + 0.5) * j / D));
      U.push(row);
    }
    return { U: U, lam: lam, D: D };
  }
  function dot(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

  /* ---------- the exact denoiser ----------
     Given x_t = √ᾱ x_0 + √(1−ᾱ) ε with x_0 ~ Σ_k π_k N(μ_k, C), returns E[x_0 | x_t] and the posterior
     weights over components. This is the function a perfectly trained noise-prediction network converges to
     (predicting ε and predicting x_0 are the same prediction, see epsFrom). */
  function denoise(xt, ab, comps, basis) {
    var D = xt.length, a = Math.sqrt(ab), b2 = 1 - ab, U = basis.U, lam = basis.lam;
    var vj = lam.map(function (l) { return ab * l + b2; });          // variance of x_t along u_j, within a component
    var logdet = 0; for (var j = 0; j < D; j++) logdet += Math.log(vj[j]);
    var lw = [], cs = [], best = -Infinity, k, i;
    for (k = 0; k < comps.length; k++) {
      var mu = comps[k].mu, r = new Array(D);
      for (i = 0; i < D; i++) r[i] = xt[i] - a * mu[i];
      var c = new Array(D), q = 0;
      for (j = 0; j < D; j++) { c[j] = dot(U[j], r); q += c[j] * c[j] / vj[j]; }
      lw[k] = comps[k].lp - 0.5 * q - 0.5 * logdet; cs[k] = c;
      if (lw[k] > best) best = lw[k];
    }
    var w = lw.map(function (l) { return Math.exp(l - best); }), sw = w.reduce(function (s, x) { return s + x; }, 0);
    w = w.map(function (x) { return x / sw; });
    var x0 = new Array(D).fill(0);
    for (k = 0; k < comps.length; k++) {
      if (w[k] < 1e-12) continue;
      var mu2 = comps[k].mu, c2 = cs[k];
      for (i = 0; i < D; i++) {
        var corr = 0;
        for (j = 0; j < D; j++) corr += U[j][i] * (a * lam[j] / vj[j]) * c2[j];   // posterior shrink toward the noisy input
        x0[i] += w[k] * (mu2[i] + corr);
      }
    }
    return { x0: x0, w: w };
  }
  // ε̂ = (x_t − √ᾱ · x̂_0) / √(1 − ᾱ): the noise prediction that corresponds to a clean-image prediction.
  function epsFrom(xt, x0, ab) { var a = Math.sqrt(ab), b = Math.sqrt(1 - ab); return xt.map(function (v, i) { return (v - a * x0[i]) / b; }); }

  /* ---------- DDIM sampling (Song et al. 2021, eq. 12), with η ---------- */
  // η = 0: deterministic. η = 1: the DDPM ancestral step. abS == null means "the last step: return x̂_0".
  function ddimSigma(abT, abS, eta) { return eta * Math.sqrt((1 - abS) / (1 - abT)) * Math.sqrt(Math.max(0, 1 - abT / abS)); }
  function ddimStep(xt, x0, eps, abT, abS, eta, normal) {
    if (abS == null) return x0.slice();
    var sig = ddimSigma(abT, abS, eta), dir = Math.sqrt(Math.max(0, 1 - abS - sig * sig)), aS = Math.sqrt(abS);
    return x0.map(function (v, i) { return aS * v + dir * eps[i] + (sig > 0 ? sig * normal() : 0); });
  }
  // Run n chains from pure noise through K passes. Returns each chain's final point, its trail and the denoiser's clean guess at every pass.
  function sample(o) {
    var ts = timesteps(o.K), r = rng(o.seed == null ? 1 : o.seed), out = [], D = o.D;
    for (var n = 0; n < o.n; n++) {
      var x = []; for (var i = 0; i < D; i++) x.push(r.normal());
      var trail = [x.slice()], guesses = [], weights = [];
      for (var s = 0; s < ts.length; s++) {
        var t = ts[s], next = s + 1 < ts.length ? ts[s + 1] : -1;
        var abT = abAt(o.sch, t), abS = next < 0 ? null : abAt(o.sch, next);
        var d = denoise(x, abT, o.comps, o.basis);
        var eps = epsFrom(x, d.x0, abT);
        x = ddimStep(x, d.x0, eps, abT, abS, o.eta, r.normal);
        trail.push(x.slice()); guesses.push(d.x0); weights.push(d.w);
      }
      out.push({ x: x, trail: trail, guesses: guesses, weights: weights });
    }
    return out;
  }
  // The MSE-optimal single guess from pure noise: the mixture mean (what one pass from x_T returns, up to a vanishing term).
  function mixtureMean(comps) {
    var D = comps[0].mu.length, m = new Array(D).fill(0), z = comps.map(function (c) { return Math.exp(c.lp); }), s = z.reduce(function (a, b) { return a + b; }, 0);
    comps.forEach(function (c, k) { for (var i = 0; i < D; i++) m[i] += z[k] / s * c.mu[i]; });
    return m;
  }

  var FR = { T: T, rng: rng, schedule: schedule, abAt: abAt, timesteps: timesteps, qSample: qSample, identityBasis: identityBasis, dctBasis: dctBasis,
    denoise: denoise, epsFrom: epsFrom, ddimSigma: ddimSigma, ddimStep: ddimStep, sample: sample, mixtureMean: mixtureMean };
  if (typeof module !== "undefined" && module.exports) module.exports = FR; else root.FR = FR;
})(typeof window !== "undefined" ? window : this);
