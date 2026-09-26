/* Fork in the Road — UI. Every number shown is computed by window.FR (core.js) or window.FRSim (sim.js);
   this file only wires controls to them and draws. Nothing runs until a control is touched. */
(function () {
  "use strict";
  var FR = window.FR, S = window.FRSim, GL = window.FR_GLOSSARY, IC = window.FR_ICONS || {}, ART = window.FR_ART || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };

  /* ---------------- formatting ---------------- */
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function pct(p) { return p > 0 && p < 0.005 ? "<1%" : fmt(p * 100, 0) + "%"; }
  function sgn(n, d) { return (n >= 0 ? "+" : "−") + fmt(Math.abs(n), d == null ? 2 : d); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ---------------- persistence (never required) ---------------- */
  var KEY = "fork-in-the-road-v1";
  var store = { predicts: {}, touched: {}, said: {}, cap: {}, ft: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) store = Object.assign(store, JSON.parse(raw)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  var SCH = { cosine: FR.schedule("cosine"), linear: FR.schedule("linear") };
  var REDUCED = false; try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (/[?&]instant=1/.test(location.search)) REDUCED = true;   // for screenshots: every animation jumps to its end
  if (/[?&]shot=1/.test(location.search)) document.body.classList.add("shot");
  var COL = { left: "#246A9C", right: "#D9771E", cart: "#A5321F", fog: "#B9BDC2", ink: "#3A2418", line: "#4A2E1E" };

  /* ---------------- nav ---------------- */
  var NAV_ICON = { s0: "square", s1: "fog", s2: "map", s3: "passes", s4: "watch", s5: "spyglass", s6: "card", s7: "arrow", s8: "apprentice", cap: "star", ft: "pencil" };
  var sections = qa("section");
  function buildNav() {
    var nav = $("nav"); nav.innerHTML = "";
    sections.forEach(function (s) {
      var b = document.createElement("button");
      b.innerHTML = '<span class="ic" aria-hidden="true">' + (IC[NAV_ICON[s.id]] || "") + "</span>" + s.dataset.title + (store.said[s.id] ? '<span class="chk">✓</span>' : "");
      b.onclick = function () { show(s.id); };
      b.dataset.for = s.id;
      nav.appendChild(b);
    });
  }
  function show(id) {
    sections.forEach(function (s) { s.classList.toggle("on", s.id === id); });
    qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === id); });
    var active = document.querySelector("#nav button.on"), nav = $("nav");
    if (active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    try { history.replaceState(null, "", "#/" + id); } catch (e) {}
    window.scrollTo(0, 0);
    redrawAll();
  }
  function markNav() { var cur = sections.filter(function (s) { return s.classList.contains("on"); })[0]; if (cur) qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === cur.id); }); }
  var redraws = [];
  function redrawAll() { redraws.forEach(function (f) { try { f(); } catch (e) {} }); }

  /* ---------------- engagement: predict + say ---------------- */
  function touch(sec) { store.touched[sec] = (store.touched[sec] || 0) + 1; save(); checkSay(sec); }
  function checkSay(sec) {
    var s = $(sec); if (!s) return;
    var preds = qa(".predict", s), sayEl = s.querySelector(".say");
    if (!sayEl) return;
    var allAnswered = preds.every(function (p) { return store.predicts[p.dataset.p] != null; });
    var open = allAnswered && (store.touched[sec] || 0) >= 3;
    if (open && !sayEl.classList.contains("open")) {
      sayEl.classList.add("open");
      if (!store.said[sec]) { store.said[sec] = true; save(); buildNav(); markNav(); }
    }
    sayEl.querySelector(".tag").textContent = open ? "Say it out loud" : "Say it out loud · unlocks after you answer the prediction" + (preds.length > 1 ? "s" : "") + " and play with the controls";
  }
  function initPredicts() {
    qa(".predict").forEach(function (p) {
      var key = p.dataset.p, sec = p.closest("section").id, btns = qa(".opts button", p);
      function reveal(idx) {
        btns.forEach(function (b, i) { b.disabled = true; if (b.hasAttribute("data-right")) b.classList.add("right"); else if (i === idx) b.classList.add("wrong"); });
        p.classList.add("done");
      }
      btns.forEach(function (b, i) { b.onclick = function () { store.predicts[key] = i; save(); reveal(i); checkSay(sec); }; });
      if (store.predicts[key] != null) reveal(store.predicts[key]);
    });
  }

  /* ---------------- glossary tooltip ---------------- */
  function bindTip(el) {
    if (el.dataset.bound) return; el.dataset.bound = "1";
    el.tabIndex = 0; el.setAttribute("role", "button");
    var tip = $("tip");
    function place() {
      var g = GL[el.dataset.g]; if (!g) return;
      tip.innerHTML = "<b>" + g[0] + "</b><br>" + g[1] + '<span class="kt">In the square: ' + g[2] + "</span>";
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8) + "px";
      var y = r.bottom + 8; if (y + h > window.innerHeight - 8) y = r.top - h - 8;
      tip.style.top = Math.max(8, y) + "px";
    }
    el.addEventListener("mouseenter", place); el.addEventListener("focus", place);
    el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
    el.addEventListener("blur", function () { tip.style.display = "none"; });
    el.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (tip.style.display === "block") tip.style.display = "none"; else place(); });
  }
  function initTips(root) { qa(".g", root).forEach(bindTip); }
  document.addEventListener("click", function () { $("tip").style.display = "none"; });
  window.addEventListener("scroll", function () { $("tip").style.display = "none"; }, { passive: true });

  /* ---------------- controls ---------------- */
  function seg(el, opts, val, onChange) {
    el.innerHTML = "";
    var state = { value: val };
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = o.label; b.dataset.v = o.v;
      if (String(o.v) === String(val)) b.classList.add("on");
      b.onclick = function () { state.value = o.v; qa("button", el).forEach(function (x) { x.classList.toggle("on", x === b); }); onChange(o.v); };
      el.appendChild(b);
    });
    return state;
  }
  var SCH_OPTS = [{ v: "cosine", label: "cosine (squaredcos_cap_v2)" }, { v: "linear", label: "linear" }];

  /* ---------------- animation: one loop per event, none at rest ---------------- */
  function anim(ms, onFrame, onDone) {
    var iv = null, h = { stopped: false, stop: function () { h.stopped = true; if (iv) clearInterval(iv); } };
    if (REDUCED) { onFrame(1); if (onDone) setTimeout(onDone, 0); return h; }   // deferred, so the caller's handle assignment lands first
    var t0 = performance.now(), done = false;
    function tick() {
      if (h.stopped || done) return;
      var u = Math.min(1, (performance.now() - t0) / ms);
      onFrame(u);
      if (u >= 1) { done = true; clearInterval(iv); if (onDone) onDone(); }
    }
    (function loop() { if (h.stopped || done) return; tick(); if (!done) requestAnimationFrame(loop); })();
    iv = setInterval(tick, 300);   // a run still finishes in a background tab, where animation frames stop
    return h;
  }
  var ease = function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };

  /* ---------------- the map canvas: the square, drawn in the scenes' language ---------------- */
  var FOG_BANKS = [[-1.9, 1.6, 0.62], [-0.7, 1.9, 0.5], [0.9, 1.7, 0.58], [2.0, 1.1, 0.5], [-2.1, 0.3, 0.55], [-0.9, 0.6, 0.62], [0.6, 0.4, 0.5], [1.9, -0.2, 0.6],
    [-1.6, -0.9, 0.55], [-0.2, -0.8, 0.62], [1.2, -1.1, 0.55], [-2.0, -2.0, 0.6], [-0.6, -2.1, 0.5], [0.9, -2.2, 0.58], [2.1, -1.6, 0.5], [0.1, 1.0, 0.45], [-1.3, 2.4, 0.45], [1.6, 2.5, 0.45], [0.2, -2.9, 0.5], [-2.4, 1.4, 0.45]];
  function SquareView(id) {
    var c = $(id), ctx = c.getContext("2d"), W = 0, H = 0, V = S.VIEW, bg = null, bgKey = "";
    var SIGNF = "'Grandstander', 'Patrick Hand', sans-serif", HANDF = "'Patrick Hand', sans-serif";
    function fit() {
      var r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
      ctx.setTransform(d, 0, 0, d, 0, 0); W = w; H = h;
    }
    var X = function (x) { return (x + V) / (2 * V) * W; }, Y = function (y) { return (V - y) / (2 * V) * H; }, PX = function (u) { return u / (2 * V) * W; };
    function box(g, x0, y0, x1, y1, fill) { var L = X(x0), T = Y(y1), w = X(x1) - L, h = Y(y0) - T; g.fillStyle = fill; g.fillRect(L, T, w, h); g.strokeRect(L, T, w, h); return { L: L, T: T, w: w, h: h, R: L + w, B: T + h }; }
    // a Busytown storefront in elevation, in world coordinates
    function storefront(g, x0, y0, x1, y1, col, awn) {
      g.strokeStyle = COL.line; g.lineWidth = Math.max(1.2, W / 360);
      var b = box(g, x0, y0, x1, y1, col), w = b.w, h = b.h;
      g.fillStyle = "#B8793F"; g.fillRect(b.L - w * 0.06, b.T - h * 0.07, w * 1.12, h * 0.08); g.strokeRect(b.L - w * 0.06, b.T - h * 0.07, w * 1.12, h * 0.08);
      g.fillStyle = "#9CCBEA"; [0.14, 0.6].forEach(function (u) { g.fillRect(b.L + w * u, b.T + h * 0.12, w * 0.26, h * 0.16); g.strokeRect(b.L + w * u, b.T + h * 0.12, w * 0.26, h * 0.16); });
      var ay = b.B - h * 0.36, n = Math.max(3, Math.round(w / 9)), zz = h * 0.06;
      g.fillStyle = awn; g.beginPath(); g.moveTo(b.L, ay); g.lineTo(b.R, ay); g.lineTo(b.R, ay + zz);
      for (var i = n; i > 0; i--) { g.lineTo(b.L + (i - 0.5) * w / n, ay + zz * 2); g.lineTo(b.L + (i - 1) * w / n, ay + zz); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#B8793F"; g.fillRect(b.L + w * 0.36, b.B - h * 0.26, w * 0.28, h * 0.26); g.strokeRect(b.L + w * 0.36, b.B - h * 0.26, w * 0.28, h * 0.26);
    }
    function drawStatic(g) {
      g.fillStyle = "#EAD9B6"; g.fillRect(0, 0, W, H);
      var r = 3; g.strokeStyle = "#DDBB8A"; g.lineWidth = Math.max(1.5, W / 240); g.lineCap = "round";
      for (var i = 0; i < 150; i++) { r = (r * 9301 + 49297) % 233280; var cx = (r / 233280) * W; r = (r * 9301 + 49297) % 233280; var cy = (r / 233280) * H; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + W / 80, cy); g.stroke(); }
      g.lineCap = "butt"; g.strokeStyle = COL.line; g.lineWidth = Math.max(1.2, W / 360);
      box(g, -0.5, -V, 0.5, V, "#DDBB8A");
      g.strokeStyle = "#FBF7EC"; g.lineWidth = Math.max(1.5, W / 260); g.setLineDash([PX(0.25), PX(0.22)]); g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke(); g.setLineDash([]);
      storefront(g, -3.05, 1.05, -2.3, 2.55, "#C8452F", "#5FA03C"); storefront(g, -3.05, -2.4, -2.3, -0.95, "#B8A3DC", "#9CCBEA");
      storefront(g, 2.3, 1.05, 3.05, 2.55, "#9CCBEA", "#C8452F"); storefront(g, 2.3, -2.4, 3.05, -0.95, "#5FA03C", "#F4C430");
      // a tree between the left storefronts, a bench between the right ones
      g.strokeStyle = COL.line; g.lineWidth = Math.max(1.2, W / 360);
      g.fillStyle = "#B8793F"; g.fillRect(X(-2.72), Y(0.05), PX(0.14), PX(0.5)); g.strokeRect(X(-2.72), Y(0.05), PX(0.14), PX(0.5));
      g.fillStyle = "#5FA03C"; g.beginPath(); g.arc(X(-2.65), Y(0.35), PX(0.34), 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(X(-2.85), Y(0.12), PX(0.2), 0, 7); g.fill(); g.stroke();
      g.fillStyle = "#B8793F"; g.fillRect(X(2.38), Y(0.1), PX(0.55), PX(0.1)); g.strokeRect(X(2.38), Y(0.1), PX(0.55), PX(0.1)); g.fillRect(X(2.44), Y(0), PX(0.06), PX(0.16)); g.fillRect(X(2.82), Y(0), PX(0.06), PX(0.16));
      // depot and bakery
      g.strokeStyle = COL.line; g.lineWidth = Math.max(1.5, W / 300);
      box(g, -0.62, -V - 0.1, 0.62, S.START_Y, "#B9BDC2"); box(g, -0.62, S.GOAL_Y, 0.62, V + 0.1, "#5FA03C");
      g.font = "800 " + Math.max(9, Math.round(W / 40)) + "px " + SIGNF; g.textAlign = "center";
      g.fillStyle = COL.ink; g.fillText("DEPOT", X(0), H - Math.max(4, W / 110)); g.fillStyle = "#FBF7EC"; g.fillText("BAKERY", X(0), Y(S.GOAL_Y) - Math.max(3, W / 130));
    }
    function ensureBg() {
      var key = W + "x" + H; if (bg && bgKey === key) return;
      var d = window.devicePixelRatio || 1; bg = document.createElement("canvas"); bg.width = Math.round(W * d); bg.height = Math.round(H * d);
      var g = bg.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); drawStatic(g); bgKey = key;
    }
    // the pretzel cart: wooden body, wheels, posts, a striped awning and its sign
    function cartBox(fx, ghost) {
      var x0 = X(fx - S.CART.hw), y0 = Y(S.CART.hh), w = X(fx + S.CART.hw) - x0, h = Y(-S.CART.hh) - y0;
      if (ghost) {
        ctx.setLineDash([6, 5]); ctx.strokeStyle = "rgba(74,46,30,.45)"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(74,46,30,.6)"; ctx.font = "400 " + Math.max(9, Math.round(W / 46)) + "px " + HANDF; ctx.textAlign = "center"; ctx.fillText("was here", x0 + w / 2, y0 + h + Math.max(10, W / 40));
        return;
      }
      ctx.strokeStyle = COL.line; ctx.lineWidth = Math.max(1.5, W / 300);
      var band = h * 0.24, body0 = y0 + band + h * 0.1;
      ctx.fillStyle = "#B8793F"; ctx.fillRect(x0 + w * 0.04, body0, w * 0.92, h - band - h * 0.1 - h * 0.12); ctx.strokeRect(x0 + w * 0.04, body0, w * 0.92, h - band - h * 0.1 - h * 0.12);
      ctx.beginPath(); ctx.moveTo(x0 + w * 0.04, body0 + (h - band) * 0.42); ctx.lineTo(x0 + w * 0.96, body0 + (h - band) * 0.42); ctx.stroke();
      ctx.fillStyle = "#DDBB8A"; [0.27, 0.73].forEach(function (u) { ctx.beginPath(); ctx.arc(x0 + w * u, y0 + h - h * 0.12, h * 0.12, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = COL.line; ctx.beginPath(); ctx.arc(x0 + w * u, y0 + h - h * 0.12, h * 0.035, 0, 7); ctx.fill(); ctx.fillStyle = "#DDBB8A"; });
      ctx.beginPath(); ctx.moveTo(x0 + w * 0.1, body0); ctx.lineTo(x0 + w * 0.1, y0 + band); ctx.moveTo(x0 + w * 0.9, body0); ctx.lineTo(x0 + w * 0.9, y0 + band); ctx.stroke();
      var n = Math.max(4, Math.round(w / 9));
      for (var i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? "#FBF7EC" : "#C8452F"; ctx.fillRect(x0 + i * w / n, y0, w / n + 0.5, band); }
      ctx.strokeRect(x0, y0, w, band);
      ctx.fillStyle = "#FFFDF6"; ctx.fillRect(x0 + w * 0.18, y0 + band + h * 0.02, w * 0.64, h * 0.1); ctx.strokeRect(x0 + w * 0.18, y0 + band + h * 0.02, w * 0.64, h * 0.1);
      ctx.fillStyle = COL.ink; ctx.font = "800 " + Math.max(7, Math.round(W / 70)) + "px " + SIGNF; ctx.textAlign = "center"; ctx.fillText("PRETZELS", x0 + w / 2, y0 + band + h * 0.1);
    }
    // the courier: a crate on a rounded body, a yellow stripe, two wheels, a face plate and an antenna
    function courierGlyph(x, y, o) {
      o = o || {}; var s = Math.max(10, W / 30), px = X(x), py = Y(y);
      ctx.strokeStyle = COL.line; ctx.lineWidth = Math.max(1.5, W / 300);
      ctx.fillStyle = "#B8793F"; ctx.fillRect(px - s * 0.75, py - s * 0.95, s * 0.9, s * 0.6); ctx.strokeRect(px - s * 0.75, py - s * 0.95, s * 0.9, s * 0.6);
      ctx.beginPath(); ctx.moveTo(px - s * 0.3, py - s * 0.95); ctx.lineTo(px - s * 0.3, py - s * 0.35); ctx.stroke();
      ctx.fillStyle = o.dizzy ? "#F4B7A7" : "#B9BDC2"; ctx.beginPath(); ctx.roundRect(px - s, py - s * 0.35, 2 * s, s * 0.8, s * 0.25); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#F4C430"; ctx.fillRect(px - s, py + s * 0.05, 2 * s, s * 0.18);
      ctx.fillStyle = COL.line; [-0.5, 0.5].forEach(function (u) { ctx.beginPath(); ctx.arc(px + s * u, py + s * 0.42, s * 0.28, 0, 7); ctx.fill(); ctx.fillStyle = "#B9BDC2"; ctx.beginPath(); ctx.arc(px + s * u, py + s * 0.42, s * 0.1, 0, 7); ctx.fill(); ctx.fillStyle = COL.line; });
      ctx.fillStyle = "#FFFDF6"; ctx.fillRect(px + s * 0.35, py - s * 0.8, s * 0.55, s * 0.45); ctx.strokeRect(px + s * 0.35, py - s * 0.8, s * 0.55, s * 0.45);
      ctx.fillStyle = COL.line; ctx.beginPath(); ctx.arc(px + s * 0.5, py - s * 0.62, s * 0.06, 0, 7); ctx.arc(px + s * 0.75, py - s * 0.62, s * 0.06, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px + s * 0.52, py - s * 0.48); ctx.quadraticCurveTo(px + s * 0.62, py - s * 0.4, px + s * 0.73, py - s * 0.48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + s * 0.1, py - s * 0.95); ctx.lineTo(px + s * 0.1, py - s * 1.3); ctx.stroke();
      ctx.fillStyle = "#C8452F"; ctx.beginPath(); ctx.arc(px + s * 0.1, py - s * 1.38, s * 0.1, 0, 7); ctx.fill(); ctx.stroke();
    }
    function fogLayer(alpha) {
      if (!(alpha > 0.01)) return;
      ctx.globalAlpha = Math.min(1, alpha) * 0.82; ctx.strokeStyle = "rgba(74,46,30,.55)"; ctx.lineWidth = 1.2;
      FOG_BANKS.forEach(function (b) { ctx.fillStyle = "#EEF3F6"; ctx.beginPath(); ctx.arc(X(b[0]), Y(b[1]), PX(b[2]), 0, 7); ctx.fill(); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    function paperLabel(text) {
      ctx.font = "400 " + Math.max(11, Math.round(W / 32)) + "px " + HANDF; ctx.textAlign = "left";
      var w = ctx.measureText(text).width + 14, h = Math.max(18, W / 20);
      ctx.fillStyle = "#FFFDF6"; ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; ctx.fillRect(6, 6, w, h); ctx.strokeRect(6, 6, w, h);
      ctx.fillStyle = COL.ink; ctx.fillText(text, 13, 6 + h * 0.72);
    }
    function dot(x, y, col, r) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(x), Y(y), r || Math.max(2, W / 200), 0, 7); ctx.fill(); }
    function render(st) {
      fit(); ensureBg(); ctx.drawImage(bg, 0, 0, W, H);
      var fx = st.fx == null ? 0 : st.fx;
      if (st.routes) {
        [-1, 1].forEach(function (sd) {
          ctx.strokeStyle = sd < 0 ? COL.left : COL.right; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.globalAlpha = 0.55; ctx.beginPath();
          for (var y = S.START_Y; y <= S.GOAL_Y + 1e-9; y += 0.05) { var x = S.routeX(y, sd, st.routesFx == null ? fx : st.routesFx); if (y === S.START_Y) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); }
          ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        });
      }
      if (st.ghost != null && Math.abs(st.ghost - fx) > 1e-6) cartBox(st.ghost, true);
      cartBox(fx);
      if (st.avg) { ctx.strokeStyle = COL.cart; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.beginPath(); ctx.moveTo(X(st.avg[0]), Y(S.START_Y)); ctx.lineTo(X(st.avg[0]), Y(S.GOAL_Y)); ctx.stroke(); ctx.setLineDash([]); }
      fogLayer(st.fog || 0);
      if (st.field) {
        ctx.strokeStyle = COL.line; ctx.fillStyle = COL.line; ctx.lineWidth = Math.max(1, W / 400); ctx.globalAlpha = 0.75;
        st.field.forEach(function (a) {
          var m = Math.sqrt(a.vx * a.vx + a.vy * a.vy); if (m < 1e-9) return;
          var len = Math.min(0.34, m * 0.11), ux = a.vx / m, uy = a.vy / m, x1 = a.x + ux * len, y1 = a.y + uy * len;
          ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
          var hx = X(x1), hy = Y(y1), hs = Math.max(3, W / 120);
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - ux * hs + uy * hs * 0.6, hy + uy * hs + ux * hs * 0.6); ctx.lineTo(hx - ux * hs - uy * hs * 0.6, hy + uy * hs - ux * hs * 0.6); ctx.closePath(); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      if (st.trails) { ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; st.trails.forEach(function (tr) { ctx.strokeStyle = tr.col || COL.fog; ctx.beginPath(); tr.pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.stroke(); }); ctx.globalAlpha = 1; }
      if (st.arrows) { ctx.strokeStyle = "rgba(74,46,30,.35)"; ctx.lineWidth = 1; st.arrows.forEach(function (a) { ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(a[2]), Y(a[3])); ctx.stroke(); }); }
      if (st.pts) { ctx.globalAlpha = st.ptsAlpha || 0.85; st.pts.forEach(function (p) { dot(p.x, p.y, p.col, p.r); }); ctx.globalAlpha = 1; }
      if (st.guess) { ctx.strokeStyle = COL.ink; ctx.lineWidth = 1; ctx.globalAlpha = 0.6; st.guess.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), Math.max(2.2, W / 170), 0, 7); ctx.stroke(); }); ctx.globalAlpha = 1; }
      if (st.path && st.path.length > 1) { ctx.strokeStyle = st.pathCol || COL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); st.path.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }); ctx.stroke(); }
      if (st.pins) { st.pins.forEach(function (p) { ctx.fillStyle = p.state === "lit" ? "#F4C430" : p.state === "done" ? "#5FA03C" : "#FFFDF6"; ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(3, W / 90), 0, 7); ctx.fill(); ctx.stroke(); }); }
      if (st.courier) courierGlyph(st.courier.x, st.courier.y, st.courier);
      if (st.flash) { ctx.fillStyle = "rgba(200,69,47,.18)"; ctx.fillRect(0, 0, W, H); }
      if (st.caption) paperLabel(st.caption);
    }
    return { render: render, canvas: c };
  }
  if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };

  function drawSchedule(id, sch, t) {
    var c = $(id), ctx = c.getContext("2d"), r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    ctx.setTransform(d, 0, 0, d, 0, 0);
    var pad = { l: 34, r: 10, t: 12, b: 24 };
    ctx.fillStyle = "#FFFDF6"; ctx.fillRect(0, 0, w, h);
    var px = function (tt) { return pad.l + tt / 999 * (w - pad.l - pad.r); }, py = function (v) { return pad.t + (1 - v) * (h - pad.t - pad.b); };
    ctx.strokeStyle = "#E7DCC4"; ctx.lineWidth = 1; [0, 0.5, 1].forEach(function (v) { ctx.beginPath(); ctx.moveTo(pad.l, py(v)); ctx.lineTo(w - pad.r, py(v)); ctx.stroke(); });
    ctx.fillStyle = "#6E5040"; ctx.font = "13px 'Patrick Hand', sans-serif"; ctx.textAlign = "right"; [0, 0.5, 1].forEach(function (v) { ctx.fillText(v.toFixed(1), pad.l - 5, py(v) + 4); });
    ctx.textAlign = "center"; [0, 250, 500, 750, 999].forEach(function (tt) { ctx.fillText(String(tt), px(tt), h - 7); });
    function line(fn, col, dash) { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(dash); ctx.beginPath(); for (var tt = 0; tt < 1000; tt += 3) { var v = fn(sch.ab[tt]); if (tt) ctx.lineTo(px(tt), py(v)); else ctx.moveTo(px(tt), py(v)); } ctx.stroke(); ctx.setLineDash([]); }
    line(function (a) { return Math.sqrt(a); }, COL.left, []); line(function (a) { return Math.sqrt(1 - a); }, COL.right, [5, 4]);
    var half = 0; while (half < 999 && sch.ab[half] >= 0.5) half++;
    ctx.strokeStyle = "#6E5040"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px(half), pad.t); ctx.lineTo(px(half), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#6E5040"; ctx.textAlign = "left"; ctx.fillText("half fog: t = " + half, px(half) + 5, pad.t + 12);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px(t), pad.t); ctx.lineTo(px(t), h - pad.b); ctx.stroke();
    ctx.fillStyle = COL.left; ctx.beginPath(); ctx.arc(px(t), py(Math.sqrt(sch.ab[t])), 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = COL.right; ctx.beginPath(); ctx.arc(px(t), py(Math.sqrt(1 - sch.ab[t])), 4.5, 0, 7); ctx.fill();
  }
  function halfFog(sch) { var t = 0; while (t < 999 && sch.ab[t] >= 0.5) t++; return t; }
  function classCol(cl) { return cl === "cart" ? COL.cart : cl === "left" ? COL.left : COL.right; }

  /* ================= STEP 0: the square ================= */
  var DEMOS = S.demos2d(100, 7, 0);   // 100 drives, alternating sides, six logged positions each
  function cartCol(count) { return count === 0 ? "#3B7422" : count / 600 < 0.005 ? "#8A6300" : COL.cart; }
  function initS0() {
    var view = SquareView("s0c"), view2 = SquareView("s0c2"), logged = [], drives = 0, nl = 0, nr = 0, running = null;
    var r = FR.rng(21);
    function draw(extra) {
      view.render(Object.assign({ fx: 0, routes: true, pts: logged.map(function (p) { return { x: p.x0, y: p.y0, col: p.side < 0 ? COL.left : COL.right }; }) }, extra || {}));
      $("s0n").textContent = drives; $("s0l").textContent = nl; $("s0r").textContent = nr;
    }
    function logRow(i, side) { var row = document.createElement("div"); row.className = "lr"; row.innerHTML = "<i>#" + i + "</i><i style='color:" + (side < 0 ? COL.left : COL.right) + "'>" + (side < 0 ? "left" : "right") + "</i><i>6 positions logged</i>"; $("s0log").appendChild(row); $("s0log").scrollTop = 1e6; }
    function reset() { logged = []; drives = 0; nl = 0; nr = 0; $("s0log").innerHTML = '<div class="lr h"><i>drive</i><i>side</i><i>what the log records</i></div>'; draw(); }
    // one drive: the courier follows a demonstrated route, and its six logged positions drop onto the map
    $("s0demo").onclick = function () {
      if (running) return;
      var pts = DEMOS.filter(function (p) { return p.drive === drives % 100; }), side = pts[0].side; drives++; if (side < 0) nl++; else nr++;
      logRow(drives, side);
      running = anim(1400, function (u) {
        var y = S.START_Y + (S.GOAL_Y - S.START_Y) * ease(u), x = S.routeX(y, side, 0);
        var shown = pts.filter(function (p) { return p.y0 <= y; });
        view.render({ fx: 0, routes: true, pts: logged.concat(shown).map(function (p) { return { x: p.x0, y: p.y0, col: p.side < 0 ? COL.left : COL.right }; }), courier: { x: x, y: y } });
      }, function () { logged = logged.concat(pts); running = null; draw(); touch("s0"); });
    };
    $("s0all").onclick = function () { if (running) running.stop(); running = null; logged = DEMOS.slice(); drives = 100; nl = 50; nr = 50; $("s0log").innerHTML = '<div class="lr h"><i>drive</i><i>side</i><i>what the log records</i></div><div class="lr note">100 drives · 600 logged positions · 300 blue, 300 orange</div>'; draw(); touch("s0"); };
    $("s0clear").onclick = function () { if (running) running.stop(); running = null; reset(); };
    // the clerk's average
    var comps = S.map2d(0), mean = FR.mixtureMean(comps), running2 = null;
    function draw2(extra) { view2.render(Object.assign({ fx: 0, routes: true, avg: mean, pts: DEMOS.map(function (p) { return { x: p.x0, y: p.y0, col: p.side < 0 ? COL.left : COL.right }; }), ptsAlpha: 0.35 }, extra || {})); }
    $("s0ax").textContent = sgn(mean[0], 2);
    $("s0avg").onclick = function () {
      if (running2) running2.stop();
      $("s0res").textContent = "driving…";
      running2 = anim(1600, function (u) {
        var y = S.START_Y + (S.GOAL_Y - S.START_Y) * ease(u), hit = S.inCart(mean[0], Math.min(y, -S.CART.hh + 0.02), 0) || y >= -S.CART.hh;
        var yy = hit ? -S.CART.hh - 0.02 : y;
        draw2({ courier: { x: mean[0], y: yy, dizzy: hit }, flash: hit });
      }, function () { $("s0res").textContent = "dented"; touch("s0"); });
    };
    reset(); draw2();
    redraws.push(function () { if ($("s0").classList.contains("on")) { draw(); draw2(); } });
  }

  /* ================= STEP 1: fog rolls in ================= */
  function initS1() {
    var view = SquareView("s1c"), t = 0, schName = "cosine", p0 = DEMOS[0];
    function draw() {
      var sch = SCH[schName], ab = FR.abAt(sch, t), a = Math.sqrt(ab), b = Math.sqrt(1 - ab), swapped = 0;
      var pts = DEMOS.map(function (p) { var x = a * p.x0 + b * p.ex, y = a * p.y0 + b * p.ey; if ((p.side < 0 && x > 0) || (p.side > 0 && x < 0)) swapped++; return { x: x, y: y, col: p.side < 0 ? COL.left : COL.right }; });
      view.render({ fx: 0, pts: pts, fog: b, caption: "t = " + t });
      $("s1tv").textContent = t; $("s1a").textContent = a.toFixed(2); $("s1b").textContent = b.toFixed(2); $("s1swap").textContent = pct(swapped / DEMOS.length); $("s1half").textContent = halfFog(sch);
      $("s1m").innerHTML = "one dot: x₀ = (" + sgn(p0.x0) + ", " + sgn(p0.y0) + ") · ε = (" + sgn(p0.ex) + ", " + sgn(p0.ey) + ")<br>x<sub>" + t + "</sub> = <b>" + a.toFixed(2) + "</b> × x₀ + <b>" + b.toFixed(2) + "</b> × ε = (<b>" + sgn(a * p0.x0 + b * p0.ex) + "</b>, <b>" + sgn(a * p0.y0 + b * p0.ey) + "</b>)";
      drawSchedule("s1chart", sch, t);
    }
    $("s1t").addEventListener("input", function () { t = +this.value; draw(); touch("s1"); });
    seg($("s1sch"), SCH_OPTS, schName, function (v) { schName = v; draw(); touch("s1"); });
    draw();
    redraws.push(function () { if ($("s1").classList.contains("on")) draw(); });
  }

  /* ================= STEP 2: the cartographer ================= */
  function initS2() {
    var view = SquareView("s2c"), t = 300, schName = "cosine", comps = S.map2d(0), p0 = DEMOS[0];
    function draw() {
      var sch = SCH[schName], ab = FR.abAt(sch, t), a = Math.sqrt(ab), b = Math.sqrt(1 - ab), n = { left: 0, right: 0, cart: 0 }, pts = [], arrows = [], d0 = null;
      DEMOS.forEach(function (p, i) {
        var xt = [a * p.x0 + b * p.ex, a * p.y0 + b * p.ey], d = FR.denoise(xt, ab, comps, S.BASIS2), cl = S.classify(d.x0[0], d.x0[1], 0); n[cl]++;
        if (i === 0) d0 = { xt: xt, d: d };
        pts.push({ x: xt[0], y: xt[1], col: COL.fog, r: 2 }); pts.push({ x: d.x0[0], y: d.x0[1], col: classCol(cl) });
        if ($("s2arr").checked) arrows.push([xt[0], xt[1], d.x0[0], d.x0[1]]);
      });
      view.render({ fx: 0, pts: pts, arrows: arrows, fog: b * 0.5, caption: "t = " + t });
      $("s2tv").textContent = t; $("s2l").textContent = pct(n.left / DEMOS.length); $("s2r").textContent = pct(n.right / DEMOS.length); $("s2cart").textContent = pct(n.cart / DEMOS.length);
      var wl = 0, wr = 0; comps.forEach(function (c, k) { if (c.side < 0) wl += d0.d.w[k]; else wr += d0.d.w[k]; });
      $("s2m").innerHTML = "foggy dot x<sub>t</sub> = (" + sgn(d0.xt[0]) + ", " + sgn(d0.xt[1]) + ") at t = " + t + "<br>weight on the left routes <b>" + wl.toFixed(2) + "</b> · on the right routes <b>" + wr.toFixed(2) + "</b><br>her guess x̂₀ = (<b>" + sgn(d0.d.x0[0]) + "</b>, <b>" + sgn(d0.d.x0[1]) + "</b>) → " + S.classify(d0.d.x0[0], d0.d.x0[1], 0);
      var eps = FR.epsFrom(d0.xt, d0.d.x0, ab), back = [(d0.xt[0] - b * eps[0]) / a, (d0.xt[1] - b * eps[1]) / a];
      var f3 = function (v) { return v < 0.0005 ? v.toExponential(1) : v.toFixed(3); };
      $("s2m2").innerHTML = "her noise prediction ε̂ = (" + sgn(eps[0]) + ", " + sgn(eps[1]) + ") · √ᾱ = " + f3(a) + " · √(1−ᾱ) = " + f3(b) + "<br>x̂₀ = ((" + sgn(d0.xt[0]) + ") − " + f3(b) + " × (" + sgn(eps[0]) + ")) ÷ " + f3(a) + " = <b>" + sgn(back[0]) + "</b> <span class='ok'>✓ the same guess</span>";
    }
    $("s2t").addEventListener("input", function () { t = +this.value; draw(); touch("s2"); });
    seg($("s2sch"), SCH_OPTS, schName, function (v) { schName = v; draw(); touch("s2"); });
    $("s2arr").addEventListener("change", function () { draw(); touch("s2"); });
    draw();
    redraws.push(function () { if ($("s2").classList.contains("on")) draw(); });
  }

  /* ================= STEP 3: fog lifts in passes ================= */
  var LADDER_K = [1, 2, 3, 5, 10, 20, 50, 100];
  var ladderCache = {};
  function ladder(schName, eta, withThousand) {
    var key = schName + "|" + eta + "|" + (withThousand ? 1 : 0);
    if (ladderCache[key]) return ladderCache[key];
    var rows = LADDER_K.concat(withThousand ? [1000] : []).map(function (K) { var r = S.run2d({ K: K, eta: eta, sch: SCH[schName], fx: 0, n: 600, seed: 11 }); return { K: K, tally: r.tally }; });
    ladderCache[key] = rows; return rows;
  }
  function initS3() {
    var view = SquareView("s3c"), K = 10, eta = 0, schName = "cosine", running = null, last = null;
    function idle() { view.render({ fx: 0, routes: true, caption: "pure fog: press Lift the fog" }); }
    function renderLadder() {
      var rows = ladder(schName, eta);
      $("s3lad").innerHTML = "<tr><th>passes</th><th>went left</th><th>went right</th><th>inside the cart</th></tr>" + rows.map(function (r) { return '<tr class="' + (r.K === K ? "now" : "") + '"><td class="n">' + r.K + "</td><td>" + pct(r.tally.left / 600) + "</td><td>" + pct(r.tally.right / 600) + '</td><td class="n" style="color:' + cartCol(r.tally.cart) + '">' + pct(r.tally.cart / 600) + (r.tally.cart && r.tally.cart < 12 ? " (" + r.tally.cart + ")" : "") + "</td></tr>"; }).join("");
    }
    // A run keeps its own settings (run.K, run.eta, run.sch) so changing a control mid-animation can't break it.
    function stats(run, done, pass) {
      if (!done) { $("s3l").textContent = "–"; $("s3r").textContent = "–"; $("s3cart").textContent = "–"; $("s3st").innerHTML = "pass <b>" + pass + " / " + run.K + "</b>"; return; }
      var tl = S.tally(run.chains.map(function (c) { return c.x; }), 0, run.comps);
      $("s3l").textContent = pct(tl.left / 600); $("s3r").textContent = pct(tl.right / 600); $("s3cart").textContent = pct(tl.cart / 600);
      $("s3st").innerHTML = "<b>" + run.K + "</b> pass" + (run.K > 1 ? "es" : "") + " · " + tl.cart + " of 600 in the cart";
    }
    function frame(run, pass, u, done) {
      var chains = run.chains, cl = function (c) { return classCol(S.classify(c.x[0], c.x[1], 0, run.comps)); };
      var pts = chains.map(function (c) { var a = c.trail[pass], b2 = c.trail[Math.min(pass + 1, c.trail.length - 1)], x = a[0] + (b2[0] - a[0]) * u, y = a[1] + (b2[1] - a[1]) * u; return { x: x, y: y, col: done ? cl(c) : COL.fog }; });
      var trails = $("s3trail").checked ? chains.slice(0, 30).map(function (c) { var tp = c.trail.slice(0, pass + 1).map(function (p) { return [p[0], p[1]]; }); var a = c.trail[pass], b2 = c.trail[Math.min(pass + 1, c.trail.length - 1)]; tp.push([a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u]); return { pts: tp, col: done ? cl(c) : COL.fog }; }) : null;
      var guess = $("s3guess").checked && !done ? chains.map(function (c) { return c.guesses[Math.min(pass, c.guesses.length - 1)]; }) : null;
      var ts = FR.timesteps(run.K), f0 = Math.sqrt(1 - FR.abAt(SCH[run.sch], ts[pass])), f1 = pass + 1 < run.K ? Math.sqrt(1 - FR.abAt(SCH[run.sch], ts[pass + 1])) : 0;   // the fog's actual volume at this pass
      view.render({ fx: 0, routes: done, pts: pts, trails: trails, guess: guess, fog: done ? 0 : f0 + (f1 - f0) * u, caption: done ? run.K + " pass" + (run.K > 1 ? "es" : "") + " · " + (run.eta ? "DDPM-like η = 1" : "DDIM η = 0") + " · " + run.sch : "pass " + (pass + 1) + " of " + run.K });
    }
    $("s3go").onclick = function () {
      if (running) running.stop();
      var res = S.run2d({ K: K, eta: eta, sch: SCH[schName], fx: 0, n: 600, seed: 11 });
      var run = { chains: res.chains, comps: res.comps, K: K, eta: eta, sch: schName }, pass = 0, per = Math.max(140, Math.min(800, 3000 / run.K));
      last = run; $("s3go").disabled = true;
      function next() {
        stats(run, false, pass + 1);
        running = anim(per, function (u) { frame(run, pass, ease(u), false); }, function () {
          pass++;
          if (pass < run.K) next(); else { frame(run, run.K - 1, 1, true); stats(run, true); running = null; $("s3go").disabled = false; touch("s3"); }
        });
      }
      next();
    };
    seg($("s3k"), [1, 2, 3, 5, 10, 50].map(function (k) { return { v: k, label: String(k) }; }), K, function (v) { K = +v; renderLadder(); });
    seg($("s3eta"), [{ v: 0, label: "DDIM · η = 0" }, { v: 1, label: "DDPM-like · η = 1" }], eta, function (v) { eta = +v; renderLadder(); });
    seg($("s3sch"), SCH_OPTS, schName, function (v) { schName = v; renderLadder(); });
    $("s3trail").addEventListener("change", function () { if (last && !running) frame(last, last.K - 1, 1, true); });
    idle(); renderLadder(); $("s3st").textContent = "";
    redraws.push(function () { if ($("s3").classList.contains("on")) { if (last && !running) frame(last, last.K - 1, 1, true); else if (!running) idle(); } });
  }

  /* ================= STEP 4: the stopwatch ================= */
  function initS4() {
    var ms = 10, ta = 8, schName = "cosine";
    var tstr = function (msv) { return msv >= 1000 ? fmt(msv / 1000, msv >= 10000 ? 0 : 1) + " s" : fmt(msv, 0) + " ms"; };
    function draw() {
      var card = ta * S.DT_WP * 1000, rows = ladder(schName, 0, true), fit = Math.floor(card / ms), ten = 10 * ms, wait10 = ten / (ten + card);
      $("s4msv").textContent = ms; $("s4bud").textContent = tstr(card); $("s4max").textContent = fmt(fit, 0);
      $("s4wait").textContent = pct(wait10); $("s4wait").className = "v " + (wait10 <= 0.2 ? "good" : wait10 <= 0.5 ? "warn" : "bad");
      $("s4ddpm").textContent = tstr(1000 * ms);
      $("s4m").innerHTML = "one card = " + ta + " pins × 0.1 s = <b>" + tstr(card) + "</b> of driving · passes ≤ " + fmt(card, 0) + " ÷ " + ms + " = <b>" + fmt(fit, 0) + "</b><br>10 passes: wait " + tstr(ten) + ", drive " + tstr(card) + " → <b>" + pct(wait10) + "</b> of each cycle standing still · 1,000 passes: wait " + tstr(1000 * ms) + " per " + tstr(card) + " of driving";
      $("s4lad").innerHTML = "<tr><th>passes</th><th>drawing the card</th><th>waiting share</th><th>fits?</th><th>inside the cart</th></tr>" + rows.map(function (r) { var tm = r.K * ms, ok = tm <= card; return '<tr class="' + (r.K === 10 ? "now" : "") + (ok ? "" : " no") + (r.K === 1000 ? " slow" : "") + '"><td class="n">' + r.K + (r.K === 1000 ? " (the whole schedule)" : "") + "</td><td>" + tstr(tm) + "</td><td>" + pct(tm / (tm + card)) + "</td><td>" + (ok ? "✓" : "✗") + '</td><td class="n" style="color:' + cartCol(r.tally.cart) + '">' + pct(r.tally.cart / 600) + "</td></tr>"; }).join("");
    }
    $("s4ms").addEventListener("input", function () { ms = +this.value; draw(); touch("s4"); });
    seg($("s4ta"), [1, 4, 8, 16].map(function (k) { return { v: k, label: k + " pin" + (k > 1 ? "s" : "") + " · " + fmt(k * 100, 0) + " ms" }; }), ta, function (v) { ta = +v; draw(); touch("s4"); });
    seg($("s4sch"), SCH_OPTS, schName, function (v) { schName = v; draw(); touch("s4"); });
    var drawn = false;
    redraws.push(function () { if ($("s4").classList.contains("on") && !drawn) { drawn = true; draw(); } });
  }

  /* ================= STEP 5: the lookout ================= */
  function initS5() {
    var va = SquareView("s5a"), vb = SquareView("s5b"), fx = 0.7, ran = null;
    function idle() { va.render({ fx: fx, routes: true, caption: "cart at " + sgn(fx, 1) + " · report received" }); vb.render({ fx: fx, ghost: 0, routes: true, routesFx: 0, caption: "cart at " + sgn(fx, 1) + " · no report" }); }
    function run() {
      var seen = S.run2d({ K: 10, eta: 0, sch: SCH.cosine, fx: fx, fxSeen: fx, n: 600, seed: 11 }), blind = S.run2d({ K: 10, eta: 0, sch: SCH.cosine, fx: fx, fxSeen: 0, n: 600, seed: 11 });
      ran = { seen: seen, blind: blind, fx: fx };
      va.render({ fx: fx, routes: true, pts: seen.chains.map(function (c) { return { x: c.x[0], y: c.x[1], col: classCol(S.classify(c.x[0], c.x[1], fx, seen.comps)) }; }), caption: "with the report · cart at " + sgn(fx, 1) });
      vb.render({ fx: fx, ghost: 0, routes: true, routesFx: 0, pts: blind.chains.map(function (c) { return { x: c.x[0], y: c.x[1], col: classCol(S.classify(c.x[0], c.x[1], fx, blind.comps)) }; }), caption: "blindfolded · she thinks the cart is at 0.0" });
      $("s5ac").textContent = pct(seen.tally.cart / 600); $("s5al").textContent = pct(seen.tally.left / 600); $("s5bc").textContent = pct(blind.tally.cart / 600); $("s5bl").textContent = pct(blind.tally.left / 600);
      $("s5st").innerHTML = "600 pins each · blind: <b>" + blind.tally.cart + "</b> in the cart · with the report: <b>" + seen.tally.cart + "</b>";
    }
    $("s5fx").addEventListener("input", function () { fx = +this.value; $("s5fxv").textContent = sgn(fx, 1); ran = null; idle(); touch("s5"); });
    $("s5go").onclick = function () { run(); touch("s5"); };
    idle();
    redraws.push(function () { if ($("s5").classList.contains("on")) { if (ran && ran.fx === fx) run(); else idle(); } });
  }

  /* ================= STEP 6: the drive ================= */
  function driveCfg(o) {
    return { policy: o.policy, K: o.K, eta: 0, Ta: o.Ta, lookout: o.lookout, msPerPass: 10, sch: SCH.cosine, seed: o.seed == null ? 3 : o.seed, dtWp: o.dtWp, cartAt: o.cartAt || (o.push ? S.pushed(o.fx, 0.5, 0.7) : S.still(o.fx)) };
  }
  // Time-compressed playback of a finished drive: execution at real speed, thinking capped at 1 s of wall clock.
  function playDrive(view, d, cfg, hud, onDone) {
    var phases = [], real = 0, i, dec;
    for (i = 0; i < d.decisions.length; i++) {
      dec = d.decisions[i]; var thinkReal = Math.min(dec.think, 1.0) * 1000, execEnd = i + 1 < d.decisions.length ? d.decisions[i + 1].t : d.time;
      phases.push({ kind: "think", i: i, s0: dec.t, s1: dec.t + dec.think, r0: real, r1: real + thinkReal }); real += thinkReal;
      var execReal = Math.max(0, execEnd - dec.t - dec.think) * 1000;
      phases.push({ kind: "exec", i: i, s0: dec.t + dec.think, s1: execEnd, r0: real, r1: real + execReal }); real += execReal;
    }
    function posAt(tau) { var p = d.path, k = 0; while (k + 1 < p.length && p[k + 1].t <= tau) k++; if (k + 1 >= p.length) return { x: p[p.length - 1].x, y: p[p.length - 1].y }; var a = p[k], b = p[k + 1], u = b.t > a.t ? Math.min(1, Math.max(0, (tau - a.t) / (b.t - a.t))) : 1; return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }
    function pathTo(tau) { return d.path.filter(function (p) { return p.t <= tau + 1e-9; }); }
    function render(ph, u) {
      var tau = ph.s0 + (ph.s1 - ph.s0) * u, dc = d.decisions[ph.i], pos = posAt(tau), fxNow = cfg.cartAt(tau), driven = ph.kind === "exec" ? Math.floor((tau - ph.s0) / (cfg.dtWp || S.DT_WP) + 1e-6) : -1;
      var pins = dc.chunk.map(function (x, j) { return { x: x, y: dc.ys[j], state: j < cfg.Ta ? (j < driven ? "done" : j === driven ? "lit" : "lit") : "plan" }; });
      if (ph.kind === "think") pins.forEach(function (p, j) { p.state = j < cfg.Ta ? "lit" : "plan"; });
      var finished = ph === phases[phases.length - 1] && u >= 1;
      view.render({ fx: fxNow, ghost: dc.obsFx, routes: false, path: pathTo(tau), pins: pins, courier: { x: pos.x, y: pos.y, dizzy: finished && d.hit }, flash: finished && d.hit, caption: (ph.kind === "think" ? "drawing card " + (ph.i + 1) : "driving card " + (ph.i + 1)) + " · t = " + tau.toFixed(1) + " s" });
      hud(tau, ph, dc, driven, finished, cfg);
    }
    var k = 0;
    function next() {
      if (k >= phases.length) { if (onDone) onDone(); return; }
      var ph = phases[k], dur = Math.max(1, ph.r1 - ph.r0);
      return anim(dur, function (u) { render(ph, u); }, function () { k++; next(); });
    }
    if (REDUCED) { var first = /[?&]phase=0/.test(location.search); render(phases[first ? 0 : phases.length - 1], first ? 0 : 1); if (onDone) onDone(); return { stop: function () {} }; }
    var h = { stopped: false }, cur = null;
    (function loop() { if (h.stopped || k >= phases.length) { if (!h.stopped && onDone) onDone(); return; } var ph = phases[k]; cur = anim(Math.max(1, ph.r1 - ph.r0), function (u) { render(ph, u); }, function () { k++; loop(); }); })();
    h.stop = function () { h.stopped = true; if (cur) cur.stop(); };
    return h;
  }
  function initS6() {
    var view = SquareView("s6c"), o = { policy: "diffusion", K: 10, Ta: 8, lookout: true, push: false, fx: 0 }, running = null, lastDrive = null;
    function idle() { view.render({ fx: o.fx, routes: true, courier: { x: 0, y: S.START_Y }, caption: "at the depot · press Drive" }); $("s6t").textContent = "0.0 s"; $("s6card").textContent = "–"; $("s6do").textContent = "ready"; $("s6dent").textContent = "0"; $("s6pins").innerHTML = ""; $("s6st").textContent = ""; }
    function pinsRow(dc, driven, Ta) { $("s6pins").innerHTML = dc.chunk.map(function (x, j) { return "<i class='" + (j < Ta ? (j < driven ? "done" : "lit") : "") + "'></i>"; }).join(""); }
    function hud(tau, ph, dc, driven, finished, cfg) {
      var Ta = cfg.Ta;
      $("s6t").textContent = tau.toFixed(1) + " s"; $("s6card").textContent = String(ph.i + 1);
      $("s6do").textContent = finished ? (lastDrive.hit ? "dented" : "delivered") : ph.kind === "think" ? "thinking " + (dc.think >= 1 ? fmt(dc.think, 0) + " s" : fmt(dc.think * 1000, 0) + " ms") : "pin " + Math.min(driven + 1, Ta) + " / " + Ta;
      $("s6dent").textContent = finished && lastDrive.hit ? "1" : "0";
      pinsRow(dc, driven, Ta);
      var seesCart = Math.abs(dc.obsFx - dc.realFx) < 1e-9;
      $("s6st").className = "status" + (finished && lastDrive.hit ? " hit" : "");
      $("s6st").innerHTML = finished ? (lastDrive.hit ? "<b>Dent.</b> " + lastDrive.decisions.length + " cards, " + lastDrive.time.toFixed(1) + " s, " + lastDrive.flips + " side flip" + (lastDrive.flips === 1 ? "" : "s") + "." : "<b>Delivered.</b> " + lastDrive.decisions.length + " cards, " + lastDrive.time.toFixed(1) + " s, " + lastDrive.flips + " side flip" + (lastDrive.flips === 1 ? "" : "s") + ".") : "card " + (ph.i + 1) + ": the cartographer " + (seesCart ? "sees the cart at " + sgn(dc.obsFx, 1) : "<b>thinks</b> the cart is at " + sgn(dc.obsFx, 1) + " (it's at " + sgn(dc.realFx, 1) + ")") + " · " + (dc.side < 0 ? "going left" : dc.side > 0 ? "going right" : "straight through");
    }
    function drive() {
      if (running) running.stop();
      var cfg = driveCfg(o); lastDrive = S.drive(cfg); $("s6go").disabled = true;
      running = playDrive(view, lastDrive, cfg, hud, function () { running = null; $("s6go").disabled = false; touch("s6"); });
    }
    function fleet() {
      var f = S.fleet(driveCfg(o), 20);
      $("s6fa").textContent = (f.n - f.hits) + " / 20"; $("s6fh").textContent = f.hits + " / 20"; $("s6ff").textContent = fmt(f.flips, 2); $("s6ftm").textContent = fmt(f.time, 1);
      touch("s6");
    }
    seg($("s6pol"), [{ v: "diffusion", label: "the cartographer (diffusion, DDIM)" }, { v: "flow", label: "the cartographer (arrows, flow matching · step 7)" }, { v: "averager", label: "the clerk (average)" }], o.policy, function (v) { o.policy = v; });
    seg($("s6k"), [1, 2, 5, 10, 50].map(function (k) { return { v: k, label: String(k) }; }), o.K, function (v) { o.K = +v; });
    seg($("s6ta"), [1, 4, 8, 16].map(function (k) { return { v: k, label: String(k) }; }), o.Ta, function (v) { o.Ta = +v; });
    $("s6look").addEventListener("change", function () { o.lookout = this.checked; });
    $("s6push").addEventListener("change", function () { o.push = this.checked; });
    $("s6fx").addEventListener("input", function () { o.fx = +this.value; $("s6fxv").textContent = sgn(o.fx, 1); if (!running) idle(); });
    $("s6go").onclick = drive; $("s6fleet").onclick = fleet;
    idle();
    redraws.push(function () { if ($("s6").classList.contains("on") && !running) idle(); });
    window.FRDrive = { drive: drive, fleet: fleet, set: function (k, v) { o[k] = v; } };
  }

  /* ================= STEP 7: arrows, not guesses (flow matching) ================= */
  var FLOW_K = [1, 2, 3, 4, 5, 10, 20, 50], flowLadder = null;
  function initS7() {
    var vf = SquareView("s7f"), vd = SquareView("s7d"), vw = SquareView("s7w"), t = 0, K = 10, running = null, last = null, comps = S.map2d(0);
    function field() {
      var t2 = Math.min(t, 0.95), arrows = [], step = 0.4;
      for (var gx = -2.6; gx <= 2.61; gx += step) for (var gy = -2.6; gy <= 2.61; gy += step) { var f = FR.flowVelocity([gx, gy], t2, comps, S.BASIS2); arrows.push({ x: gx, y: gy, vx: f.v[0], vy: f.v[1] }); }
      var pts = DEMOS.map(function (p) { return { x: (1 - t2) * p.ex + t2 * p.x0, y: (1 - t2) * p.ey + t2 * p.y0, col: p.side < 0 ? COL.left : COL.right }; });
      vf.render({ fx: 0, pts: pts, field: arrows, fog: 1 - t2, caption: "t = " + t2.toFixed(2) + (t2 === 0 ? " · pure fog" : "") });
      $("s7tv").textContent = t2.toFixed(2);
      var p0 = DEMOS[0], xt = [(1 - t2) * p0.ex + t2 * p0.x0, (1 - t2) * p0.ey + t2 * p0.y0], f0 = FR.flowVelocity(xt, t2, comps, S.BASIS2);
      $("s7m").innerHTML = "one dot: ε = (" + sgn(p0.ex) + ", " + sgn(p0.ey) + ") · x₁ = (" + sgn(p0.x0) + ", " + sgn(p0.y0) + ") · x<sub>t</sub> = (1 − t)·ε + t·x₁ = (" + sgn(xt[0]) + ", " + sgn(xt[1]) + ")<br>her arrow v = (E[x₁ | x<sub>t</sub>] − x<sub>t</sub>) ÷ (1 − t) = (<b>" + sgn(f0.v[0]) + "</b>, <b>" + sgn(f0.v[1]) + "</b>) · this dot's own straight line x₁ − ε = (<b>" + sgn(p0.x0 - p0.ex) + "</b>, <b>" + sgn(p0.y0 - p0.ey) + "</b>)";
    }
    $("s7t").addEventListener("input", function () { t = +this.value; field(); touch("s7"); });
    function idle() { vd.render({ fx: 0, routes: true, caption: "DDIM · press Lift both" }); vw.render({ fx: 0, routes: true, caption: "flow matching · press Lift both" }); }
    // the same fog point, lifted both ways: does it end on the same side, and how far apart are its two pins?
    function agree(run) {
      var same = 0, gap = 0;
      run.f.chains.forEach(function (c, i) { var d = run.d.chains[i]; if (S.classify(c.x[0], c.x[1], 0, run.f.comps) === S.classify(d.x[0], d.x[1], 0, run.d.comps)) same++; gap = Math.max(gap, Math.hypot(c.x[0] - d.x[0], c.x[1] - d.x[1])); });
      return { same: same, gap: gap };
    }
    function ladder() {
      if (!flowLadder) flowLadder = FLOW_K.map(function (k) { var r = { K: k, d: S.run2d({ K: k, eta: 0, sch: SCH.cosine, fx: 0 }), f: S.run2d({ K: k, flow: true, fx: 0 }) }; r.a = agree(r); return r; });
      $("s7lad").innerHTML = "<tr><th>passes</th><th>DDIM · in the cart</th><th>flow · in the cart</th><th>same side, both ways</th><th>straightness · DDIM</th><th>straightness · flow</th></tr>" + flowLadder.map(function (r) {
        return '<tr class="' + (r.K === K ? "now" : "") + '"><td class="n">' + r.K + '</td><td class="n" style="color:' + cartCol(r.d.tally.cart) + '">' + pct(r.d.tally.cart / 600) + (r.d.tally.cart && r.d.tally.cart < 12 ? " (" + r.d.tally.cart + ")" : "") + '</td><td class="n" style="color:' + cartCol(r.f.tally.cart) + '">' + pct(r.f.tally.cart / 600) + (r.f.tally.cart && r.f.tally.cart < 12 ? " (" + r.f.tally.cart + ")" : "") + '</td><td class="n">' + r.a.same + " / 600</td><td>" + r.d.straightness.toFixed(2) + "</td><td>" + r.f.straightness.toFixed(2) + "</td></tr>";
      }).join("");
    }
    // DDIM's fog thins with its actual noise weight √(1−ᾱ) at the pass's timestep; flow's thins with 1 − t exactly.
    function fogAt(run, pass, u, flow) {
      if (flow) return 1 - (pass + u) / run.K;
      var ts = FR.timesteps(run.K), a0 = Math.sqrt(1 - FR.abAt(SCH.cosine, ts[pass])), a1 = pass + 1 < run.K ? Math.sqrt(1 - FR.abAt(SCH.cosine, ts[pass + 1])) : 0;
      return a0 + (a1 - a0) * u;
    }
    function frameOne(view, run, pass, u, done, name) {
      var chains = run.chains, cl = function (c) { return classCol(S.classify(c.x[0], c.x[1], 0, run.comps)); };
      var pts = chains.map(function (c) { var a = c.trail[pass], b2 = c.trail[Math.min(pass + 1, c.trail.length - 1)]; return { x: a[0] + (b2[0] - a[0]) * u, y: a[1] + (b2[1] - a[1]) * u, col: done ? cl(c) : COL.fog }; });
      var trails = chains.slice(0, 30).map(function (c) { var tp = c.trail.slice(0, pass + 1).map(function (p) { return [p[0], p[1]]; }); var a = c.trail[pass], b2 = c.trail[Math.min(pass + 1, c.trail.length - 1)]; tp.push([a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u]); return { pts: tp, col: done ? cl(c) : COL.fog }; });
      view.render({ fx: 0, routes: done, pts: pts, trails: trails, fog: done ? 0 : fogAt(run, pass, u, name !== "DDIM"), caption: name + " · " + (done ? run.K + " pass" + (run.K > 1 ? "es" : "") : "pass " + (pass + 1) + " of " + run.K) });
    }
    function stats(run) {
      var a = agree(run);
      $("s7dc").textContent = pct(run.d.tally.cart / 600); $("s7wc").textContent = pct(run.f.tally.cart / 600);
      $("s7same").textContent = a.same + " / 600"; $("s7gap").textContent = a.gap.toFixed(2);
      $("s7st").innerHTML = "<b>" + run.K + "</b> pass" + (run.K > 1 ? "es" : "") + " · DDIM " + run.d.tally.cart + " of 600 in the cart · flow " + run.f.tally.cart + " of 600 · " + a.same + " of 600 on the same side both ways";
    }
    $("s7go").onclick = function () {
      if (running) running.stop();
      var run = { K: K, d: S.run2d({ K: K, eta: 0, sch: SCH.cosine, fx: 0 }), f: S.run2d({ K: K, flow: true, fx: 0 }) }, pass = 0, per = Math.max(160, Math.min(800, 3000 / K));
      run.d.K = K; run.f.K = K; last = run; $("s7go").disabled = true;
      $("s7dc").textContent = "–"; $("s7wc").textContent = "–"; $("s7same").textContent = "–"; $("s7gap").textContent = "–";
      function next() {
        $("s7st").innerHTML = "pass <b>" + (pass + 1) + " / " + run.K + "</b>";
        running = anim(per, function (u) { frameOne(vd, run.d, pass, ease(u), false, "DDIM"); frameOne(vw, run.f, pass, ease(u), false, "flow matching"); }, function () {
          pass++;
          if (pass < run.K) next(); else { frameOne(vd, run.d, run.K - 1, 1, true, "DDIM"); frameOne(vw, run.f, run.K - 1, 1, true, "flow matching"); stats(run); running = null; $("s7go").disabled = false; touch("s7"); }
        });
      }
      next();
    };
    seg($("s7k"), FLOW_K.map(function (k) { return { v: k, label: String(k) }; }), K, function (v) { K = +v; if (flowLadder) ladder(); });
    field(); idle();
    var drawn = false;
    redraws.push(function () { if ($("s7").classList.contains("on")) { field(); if (!drawn) { drawn = true; ladder(); } if (last && !running) { frameOne(vd, last.d, last.K - 1, 1, true, "DDIM"); frameOne(vw, last.f, last.K - 1, 1, true, "flow matching"); } else if (!running) idle(); } });
  }

  /* ================= STEP 8: the apprentice (a real network) ================= */
  function initS8() {
    var N = window.FRNet, comps = S.map2d(0), ve = SquareView("s8e"), va = SquareView("s8a");
    var o = { nLeft: 25, steps: 3000, K: 10 }, net = null, trained = 0, target = 0, hist = [], running = false, floorV = null, lastPair = null, lastLift = null, exactCache = {};
    function floorLoss() { if (floorV == null) floorV = N.floor(comps, S.BASIS2, SCH.cosine, 20000, 5); return floorV; }
    function demos() { return S.demosSplit(50, o.nLeft, 7, 0).map(function (p) { return [p.x0, p.y0]; }); }
    function fresh() { net = N.create(32, 1); trained = 0; hist = []; lastPair = null; lastLift = null; }
    function tags(ema) {
      $("s8w").textContent = fmt(net.params, 0); $("s8floor").textContent = floorLoss().toFixed(3);
      $("s8l").textContent = ema == null ? "–" : ema.toFixed(3); $("s8l").className = "v " + (ema == null ? "" : ema < floorLoss() * 1.05 ? "good" : ema < 0.45 ? "warn" : "bad");
      $("s8n").textContent = fmt(trained, 0) + (target ? " / " + fmt(target, 0) : "");
    }
    function mathbox(ema) {
      if (!lastPair) { $("s8m").innerHTML = "press Train: one pair from the current batch appears here"; return; }
      var p = lastPair;
      $("s8m").innerHTML = "one pair, step " + fmt(trained, 0) + ": fog level t = <b>" + p.t + "</b> · foggy pin x<sub>t</sub> = (" + sgn(p.xt[0]) + ", " + sgn(p.xt[1]) + ") · the fog that was added ε = (" + sgn(p.eps[0]) + ", " + sgn(p.eps[1]) + ")<br>her guess ε̂ = (<b>" + sgn(p.pred[0]) + "</b>, <b>" + sgn(p.pred[1]) + "</b>) · squared error " + (((p.pred[0] - p.eps[0]) * (p.pred[0] - p.eps[0]) + (p.pred[1] - p.eps[1]) * (p.pred[1] - p.eps[1])) / 2).toFixed(3) + " · nudge all " + fmt(net.params, 0) + " weights a little toward it (Adam, lr 0.002)";
    }
    function drawLoss() {
      var c = $("s8loss"), ctx = c.getContext("2d"), r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = "#FFFDF6"; ctx.fillRect(0, 0, w, h);
      var pad = { l: 40, r: 10, t: 10, b: 24 }, lo = 0.3, hi = 1.0, span = Math.max(target, trained, 1);
      var px = function (s) { return pad.l + s / span * (w - pad.l - pad.r); }, py = function (v) { return pad.t + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (h - pad.t - pad.b); };
      ctx.strokeStyle = "#E7DCC4"; ctx.lineWidth = 1; [0.4, 0.6, 0.8, 1.0].forEach(function (v) { ctx.beginPath(); ctx.moveTo(pad.l, py(v)); ctx.lineTo(w - pad.r, py(v)); ctx.stroke(); });
      ctx.fillStyle = "#6E5040"; ctx.font = "13px 'Patrick Hand', sans-serif"; ctx.textAlign = "right"; [0.4, 0.6, 0.8, 1.0].forEach(function (v) { ctx.fillText(v.toFixed(1), pad.l - 5, py(v) + 4); });
      ctx.textAlign = "center"; ctx.fillText("training steps → " + fmt(span, 0), w / 2, h - 6);
      ctx.strokeStyle = "#3B7422"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pad.l, py(floorLoss())); ctx.lineTo(w - pad.r, py(floorLoss())); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#3B7422"; ctx.textAlign = "left"; ctx.fillText("the exact cartographer's floor " + floorLoss().toFixed(3), pad.l + 6, py(floorLoss()) - 5);
      if (hist.length > 1) { ctx.strokeStyle = COL.left; ctx.lineWidth = 2.2; ctx.beginPath(); hist.forEach(function (p, i) { if (i) ctx.lineTo(px(p[0]), py(p[1])); else ctx.moveTo(px(p[0]), py(p[1])); }); ctx.stroke(); }
    }
    function train() {
      if (running) return;
      var r = FR.rng(7), d = demos(), ema = null; fresh(); target = o.steps; running = true; $("s8go").disabled = true; $("s8lift").disabled = true; $("s8study").disabled = true;
      $("s8st").innerHTML = "training on " + o.nLeft + " left and " + (50 - o.nLeft) + " right drives…";
      (function chunk() {
        var t0 = performance.now();
        while (trained < target && performance.now() - t0 < 12) {
          var res = N.trainStep(net, { rng: r, demos: d, sch: SCH.cosine }); trained++;
          ema = ema == null ? res.loss : 0.98 * ema + 0.02 * res.loss;
          if (trained % 10 === 0 || trained === target) hist.push([trained, ema]);
          if (res.last) lastPair = res.last;
        }
        drawLoss(); tags(ema); mathbox(ema);
        if (trained < target) setTimeout(chunk, 0);
        else { running = false; $("s8go").disabled = false; $("s8lift").disabled = false; $("s8study").disabled = false; $("s8st").innerHTML = "<b>" + fmt(trained, 0) + "</b> steps · loss " + ema.toFixed(3) + " (floor " + floorLoss().toFixed(3) + ") · now lift the fog"; touch("s8"); }
      })();
    }
    function exactRun(K) { if (!exactCache[K]) exactCache[K] = S.run2d({ K: K, eta: 0, sch: SCH.cosine, fx: 0 }); return exactCache[K]; }
    function appRun(K, theNet) {
      var res = FR.sample({ K: K, eta: 0, sch: SCH.cosine, D: 2, n: 600, seed: 11, predict: function (x, t, ab) { return { x0: N.predictX0(theNet, x, t, ab) }; } });
      var pts = res.map(function (c) { return c.x; });
      return { chains: res, tally: S.tally(pts, 0, comps), fid: S.fidelity(pts, comps) };
    }
    function paint(view, run, label) {
      view.render({ fx: 0, routes: true, pts: run.chains.map(function (c) { return { x: Math.max(-2.95, Math.min(2.95, c.x[0])), y: Math.max(-2.95, Math.min(2.95, c.x[1])), col: classCol(S.classify(c.x[0], c.x[1], 0, comps)) }; }), caption: label });
    }
    function idle() { ve.render({ fx: 0, routes: true, caption: "the exact cartographer" }); va.render({ fx: 0, routes: true, caption: "the apprentice: train her first" }); }
    function lift() {
      if (!net || !trained) { $("s8st").innerHTML = "train the apprentice first"; return; }
      var ex = exactRun(o.K), ap = appRun(o.K, net); lastLift = { ex: ex, ap: ap, K: o.K };
      paint(ve, ex, "the exact cartographer · " + o.K + " pass" + (o.K > 1 ? "es" : "")); paint(va, ap, "the apprentice · " + fmt(trained, 0) + " steps · " + o.K + " pass" + (o.K > 1 ? "es" : ""));
      var exf = S.fidelity(ex.chains.map(function (c) { return c.x; }), comps);
      $("s8ec").textContent = pct(ex.tally.cart / 600); $("s8ac").textContent = pct(ap.tally.cart / 600); $("s8ac").className = "v " + (ap.tally.cart <= 2 ? "good" : ap.tally.cart < 30 ? "warn" : "bad");
      $("s8el").textContent = pct(ex.tally.left / 600); $("s8al").textContent = pct(ap.tally.left / 600);
      $("s8er").textContent = exf.onroute.toFixed(2); $("s8ar").textContent = ap.fid.onroute.toFixed(2); $("s8ar").className = "v " + (ap.fid.onroute < 0.25 ? "good" : ap.fid.onroute < 0.5 ? "warn" : "bad");
      $("s8off").textContent = ap.fid.offmap + " / 600"; $("s8off").className = "v " + (ap.fid.offmap ? "bad" : "good");
      $("s8st").innerHTML = "<b>" + o.K + "</b> pass" + (o.K > 1 ? "es" : "") + " · exact " + ex.tally.cart + " of 600 in the cart · apprentice " + ap.tally.cart + (ap.fid.offmap ? " · <b>" + ap.fid.offmap + " pins clipped at the map's edge</b>" : "");
      touch("s8");
    }
    // The split study: four apprentices, 10,000 steps each, on logs where 50%, 20%, 10% and 2% of the drives went left.
    var SPLITS = [25, 10, 5, 1];
    function priorComps(share) { var c = S.map2d(0); c.forEach(function (k) { k.lp = Math.log((k.side < 0 ? share : 1 - share) / 6); }); return c; }
    function study() {
      if (running) return; running = true; $("s8study").disabled = true; $("s8go").disabled = true; var rows = [], i = 0;
      function one() {
        var nLeft = SPLITS[i], d = S.demosSplit(50, nLeft, 7, 0).map(function (p) { return [p.x0, p.y0]; }), n2 = N.create(32, 1), r = FR.rng(7), done = 0, tot = 10000;
        (function chunk() {
          var t0 = performance.now(); while (done < tot && performance.now() - t0 < 12) { N.trainStep(n2, { rng: r, demos: d, sch: SCH.cosine }); done++; }
          $("s8sst").innerHTML = "apprentice " + (i + 1) + " of 4 (" + (2 * nLeft) + "% of drives went left) · step " + fmt(done, 0) + " / 10,000";
          if (done < tot) setTimeout(chunk, 0);
          else {
            var ap = appRun(10, n2), pc = priorComps(nLeft / 50), exs = FR.sample({ K: 10, eta: 0, sch: SCH.cosine, D: 2, n: 600, seed: 11, comps: pc, basis: S.BASIS2 });
            var ext = S.tally(exs.map(function (c) { return c.x; }), 0, pc);
            rows.push({ share: 2 * nLeft, exLeft: ext.left, apLeft: ap.tally.left, cart: ap.tally.cart, leftBlobs: ap.fid.leftBlobs });
            renderStudy(rows); i++;
            if (i < SPLITS.length) one(); else { running = false; $("s8study").disabled = false; $("s8go").disabled = false; $("s8sst").innerHTML = "done · 10 passes each · the exact column samples with the same share as its prior"; touch("s8"); }
          }
        })();
      }
      one();
    }
    function renderStudy(rows) {
      $("s8lad").innerHTML = "<tr><th>drives that went left</th><th>exact cartographer · left pins</th><th>apprentice · left pins</th><th>left-route blobs she still draws</th><th>in the cart</th></tr>" + rows.map(function (r) {
        return "<tr><td class=\"n\">" + r.share + "% (" + (r.share / 2) + " of 50)</td><td>" + pct(r.exLeft / 600) + " (" + r.exLeft + ")</td><td class=\"n\" style=\"color:" + (Math.abs(r.apLeft - r.exLeft) <= 30 ? "#3B7422" : "#8A6300") + "\">" + pct(r.apLeft / 600) + " (" + r.apLeft + ")</td><td>" + r.leftBlobs + " of 6</td><td class=\"n\" style=\"color:" + cartCol(r.cart) + "\">" + pct(r.cart / 600) + (r.cart && r.cart < 12 ? " (" + r.cart + ")" : "") + "</td></tr>";
      }).join("");
    }
    $("s8left").addEventListener("input", function () { o.nLeft = +this.value; $("s8leftv").textContent = o.nLeft + " left · " + (50 - o.nLeft) + " right"; });
    seg($("s8steps"), [{ v: 300, label: "300 · under a second" }, { v: 3000, label: "3,000 · a few seconds" }, { v: 10000, label: "10,000 · ~5 s" }, { v: 30000, label: "30,000 · ~15 s" }], o.steps, function (v) { o.steps = +v; });
    seg($("s8k"), [1, 5, 10, 50].map(function (k) { return { v: k, label: String(k) }; }), o.K, function (v) { o.K = +v; });
    $("s8go").onclick = train; $("s8lift").onclick = lift; $("s8study").onclick = study;
    fresh(); tags(); mathbox(); idle();
    var drawn = false;
    redraws.push(function () { if ($("s8").classList.contains("on")) { drawLoss(); if (!drawn) { drawn = true; tags(); } if (lastLift && !running) { paint(ve, lastLift.ex, "the exact cartographer · " + lastLift.K + " passes"); paint(va, lastLift.ap, "the apprentice · " + fmt(trained, 0) + " steps · " + lastLift.K + " passes"); } else if (!running) idle(); } });
    window.FRApprentice = { train: train, lift: lift, study: study, set: function (k, v) { o[k] = v; } };
  }

  /* ================= REVIEW BOARD ================= */
  var CASES = [
    { id: "c1", title: "Case 1 · the straight-liner", brief: "<b>The report:</b> the courier dents the cart every single drive. The dispatch rule is the clerk's: fit the average of the route sheets and drive it. The cart is parked at 0.0, where it always is; the sheets are 50 left, 50 right.",
      broken: { policy: "averager", K: 1, Ta: 8, lookout: true, fx: 0 },
      fixes: [
        { label: "Log ten times more drives, same fork", cfg: { policy: "averager", K: 1, Ta: 8, lookout: true, fx: 0 }, why: "More sheets make the average more precise, not different." },
        { label: "Replace the averager with the cartographer, 10 DDIM passes", cfg: { policy: "diffusion", K: 10, Ta: 8, lookout: true, fx: 0 }, right: true, why: "Sampling commits to one side." },
        { label: "Re-plan after every pin instead of every 8", cfg: { policy: "averager", K: 1, Ta: 1, lookout: true, fx: 0 }, why: "Averaging more often is still averaging." }
      ],
      causes: [{ label: "Squared error answers a fork with the average, and the average is the cart", right: true }, { label: "Not enough demonstrations" }, { label: "The courier drives too fast to turn"}],
      checks: [{ label: "20 drives, at most 1 dent", test: function (f) { return f.hits <= 1; }, why: function (f) { return f.hits + " of 20 hit the cart"; } }] },
    { id: "c2", title: "Case 2 · the ditherer", brief: "<b>The report:</b> the courier zigzags at the depot, veering left, then right, then left, and takes twice as long. The rule: the cartographer draws a card of 16 pins with 10 passes, and the courier re-plans after <b>every single pin</b>.",
      broken: { policy: "diffusion", K: 10, Ta: 1, lookout: true, fx: 0 },
      fixes: [
        { label: "Fifty passes per card instead of ten", cfg: { policy: "diffusion", K: 50, Ta: 1, lookout: true, fx: 0 }, why: "Better guesses, still a fresh coin flip every pin." },
        { label: "Drive 8 pins per card before looking again", cfg: { policy: "diffusion", K: 10, Ta: 8, lookout: true, fx: 0 }, right: true, why: "Committing to the card is what stops the dithering." },
        { label: "One pass per card, to be quicker", cfg: { policy: "diffusion", K: 1, Ta: 1, lookout: true, fx: 0 }, why: "One pass is the clerk." }
      ],
      causes: [{ label: "Re-planning every pin lets each fresh sample pick a side while the fork is still 50/50", right: true }, { label: "Too few passes per card" }, { label: "The fog schedule is wrong" }],
      checks: [{ label: "20 drives, side flips per drive ≤ 0.5", test: function (f) { return f.flips <= 0.5; }, why: function (f) { return fmt(f.flips, 2) + " flips per drive"; } }, { label: "20 drives, at most 1 dent", test: function (f) { return f.hits <= 1; }, why: function (f) { return f.hits + " of 20 hit the cart"; } }] },
    { id: "c3", title: "Case 3 · the slowpoke", brief: "<b>The report:</b> on market day the vendor paces the cart back and forth across the road (0.8 either way, an 8-second round trip). The courier dents it most drives and takes 25 seconds. The rule: the cartographer draws every card by walking the course's whole schedule, <b>1,000 passes</b> at 10 ms each, and the courier waits for the card.",
      broken: { policy: "diffusion", K: 1000, Ta: 8, lookout: true, cartAt: S.pacing(0.8, 8) },
      fixes: [
        { label: "Ten DDIM passes per card", cfg: { policy: "diffusion", K: 10, Ta: 8, lookout: true, cartAt: S.pacing(0.8, 8) }, right: true, why: "0.1 s per card: the report is fresh when the courier moves." },
        { label: "A shorter card: drive 2 pins, then look again", cfg: { policy: "diffusion", K: 1000, Ta: 2, lookout: true, cartAt: S.pacing(0.8, 8) }, why: "Every card is still 10 seconds stale, and now there are more of them." },
        { label: "A faster motor: 20 pins per second", cfg: { policy: "diffusion", K: 1000, Ta: 8, lookout: true, dtWp: 0.05, cartAt: S.pacing(0.8, 8) }, why: "Driving faster on a stale card." }
      ],
      causes: [{ label: "Ten seconds of thinking makes every report stale before the courier moves", right: true }, { label: "The card is too long" }, { label: "The lookout is too slow" }],
      checks: [{ label: "20 drives, at most 2 dents", test: function (f) { return f.hits <= 2; }, why: function (f) { return f.hits + " of 20 hit the cart"; } }, { label: "under 6 seconds per drive", test: function (f) { return f.time < 6; }, why: function (f) { return fmt(f.time, 1) + " s per drive"; } }] }
  ];
  function initCap() {
    var host = $("capcases");
    host.innerHTML = CASES.map(function (c, ci) {
      return '<div class="card" style="margin-top:14px"><h3>' + c.title + '</h3><div class="brief">' + c.brief + '</div>' +
        '<div class="btnrow"><button class="ghost" id="' + c.id + 'run">Run the rule as dispatched (20 drives)</button><span class="verdict" id="' + c.id + 'v"></span></div>' +
        '<div class="lbl">The fix</div><div class="reason" id="' + c.id + 'fix">' + c.fixes.map(function (f, i) { return '<label><input type="radio" name="' + c.id + 'fix" value="' + i + '"><span>' + esc(f.label) + "</span></label>"; }).join("") + "</div>" +
        '<div class="lbl">The cause</div><div class="reason" id="' + c.id + 'cause">' + c.causes.map(function (f, i) { return '<label><input type="radio" name="' + c.id + 'cause" value="' + i + '"><span>' + esc(f.label) + "</span></label>"; }).join("") + "</div>" +
        '<div class="btnrow"><button class="act" id="' + c.id + 'go">Re-drive with the fix</button></div><div class="checks" id="' + c.id + 'ch"></div></div>';
    }).join("");
    function fleetOf(cfg) { return S.fleet(driveCfg(Object.assign({ seed: 3 }, cfg)), 20); }
    function grade() { var n = CASES.filter(function (c) { return store.cap[c.id]; }).length; $("capstars").textContent = "★".repeat(n) + "☆".repeat(3 - n); $("capverdict").innerHTML = n === 3 ? "<b>Three for three.</b> You can make the dispatch calls." : n ? "<b>" + n + " of 3</b> fixed and explained." : ""; if (n === 3 && !store.said.cap) { store.said.cap = true; save(); buildNav(); markNav(); } }
    CASES.forEach(function (c) {
      $(c.id + "run").onclick = function () { var f = fleetOf(c.broken); $(c.id + "v").innerHTML = "as dispatched: <b>" + f.hits + " of 20</b> dented · " + fmt(f.flips, 2) + " side flips per drive · " + fmt(f.time, 1) + " s per drive"; };
      $(c.id + "go").onclick = function () {
        var fi = document.querySelector('input[name="' + c.id + 'fix"]:checked'), ci = document.querySelector('input[name="' + c.id + 'cause"]:checked');
        if (!fi || !ci) { $(c.id + "ch").innerHTML = '<div class="callout co-w">Pick a fix and a cause first.</div>'; return; }
        var fix = c.fixes[+fi.value], cause = c.causes[+ci.value], f = fleetOf(fix.cfg), rows = c.checks.map(function (k) { var ok = k.test(f); return { ok: ok, label: k.label, why: k.why(f) }; });
        rows.push({ ok: !!cause.right, label: "the cause is named", why: cause.right ? "yes" : "that's not what the re-drive shows" });
        var pass = rows.every(function (r) { return r.ok; });
        $(c.id + "ch").innerHTML = rows.map(function (r) { return '<div class="check ' + (r.ok ? "ok" : "no") + '"><span class="ic">' + (r.ok ? "✓" : "✗") + '</span><div>' + r.label + '<div class="why">' + r.why + "</div></div></div>"; }).join("") +
          '<div class="callout ' + (pass ? "co-g" : "co-r") + '"><b>' + (pass ? "Fixed." : "Not fixed.") + "</b> " + esc(fix.why) + "</div>";
        store.cap[c.id] = store.cap[c.id] || pass; save(); grade();   // a star, once earned, stays
      };
    });
    grade();
  }

  /* ================= FIELD TEST ================= */
  var FT = [
    { q: "Cosine schedule: at which t does the map become half fog (ᾱ crosses 0.5)?", hint: "step 1", ans: 496, tol: 12 },
    { q: "Linear schedule: at which t?", hint: "step 1", ans: 259, tol: 12 },
    { q: "One pass from pure fog: what percent of the 600 pins end inside the cart?", hint: "step 3, %", ans: 100, tol: 1 },
    { q: "Five passes, cosine, DDIM η = 0: what percent inside the cart?", hint: "step 3, %", ans: 2, tol: 2 },
    { q: "Linear schedule, two passes: what percent inside the cart?", hint: "step 3, %", ans: 94, tol: 4 },
    { q: "10 ms per pass and a card of 4 pins: how many passes fit before drawing the card takes longer than driving it?", hint: "step 4", ans: 40, tol: 0 },
    { q: "Cart parked at +1.0, cartographer blindfolded, 10 passes: what percent inside the cart?", hint: "step 5, %", ans: 28, tol: 5 },
    { q: "The cartographer, 10 passes, lookout on, no push, cart at 0.0, re-planning after every pin (Ta = 1): side flips per drive over 20 drives?", hint: "step 6, Drive 20 in a row", ans: 1.9, tol: 0.5 },
    { q: "Flow matching, 3 Euler steps from the same fog: what percent of the 600 pins end inside the cart?", hint: "step 7, %", ans: 8, tol: 2 },
    { q: "The apprentice trained 300 steps on a 25/25 log, 10 passes: how many of the 600 pins end inside the cart?", hint: "step 8, a count", ans: 32, tol: 6 }
  ];
  function initFT() {
    $("ftqs").innerHTML = FT.map(function (f, i) { return '<div class="fq"><div class="fqt"><b>' + (i + 1) + ".</b> " + f.q + ' <span class="muted">(' + f.hint + ')</span></div><div class="row"><input type="number" id="ft' + i + '" step="any" value="' + (store.ft[i] != null ? esc(store.ft[i]) : "") + '"><span class="res" id="ftr' + i + '"></span></div></div>'; }).join("");
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) { var raw = $("ft" + i).value, v = parseFloat(raw), ok = raw !== "" && !isNaN(v) && Math.abs(v - f.ans) <= f.tol; store.ft[i] = raw; if (ok) score++; $("ftr" + i).innerHTML = ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'; });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can read the Diffusion Policy paper." : "");
      if (score >= 8 && !store.said.ft) { store.said.ft = true; save(); buildNav(); markNav(); }
    };
    $("reset").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} history.replaceState(null, "", location.pathname); location.reload(); };
  }

  /* ---------------- art ---------------- */
  function renderArt() { qa(".scene[data-art]").forEach(function (el) { var svg = ART[el.dataset.art]; if (svg && !el.firstChild) el.innerHTML = svg; }); }
  function buildNext() {
    sections.forEach(function (s, i) {
      var n = sections[i + 1]; if (!n) return;
      var row = document.createElement("div"); row.className = "nextrow";
      var b = document.createElement("button"); b.type = "button"; b.className = "act"; b.textContent = "Next: " + n.dataset.n + " · " + n.dataset.title + " →";
      b.onclick = function () { show(n.id); };
      row.appendChild(b); s.appendChild(row);
    });
  }

  /* ---------------- boot ---------------- */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  renderArt();
  qa(".kmap .k[data-i]").forEach(function (el) { el.innerHTML = IC[el.dataset.i] || ""; });
  qa(".mast .mi").forEach(function (el) { el.innerHTML = IC.courier || ""; });
  buildNav(); buildNext();
  function hashId() { var m = /^#\/?(s[0-8]|cap|ft)$/.exec(location.hash || ""); return m ? m[1] : null; }
  window.addEventListener("hashchange", function () { var id = hashId(); if (id && !$(id).classList.contains("on")) show(id); });
  initS0(); initS1(); initS2(); initS3(); initS4(); initS5(); initS6(); initS7(); initS8(); initCap(); initFT();
  initTips(document); initPredicts();
  sections.forEach(function (s) { checkSay(s.id); });
  var start = hashId() || "s0";
  show(start);
  window.addEventListener("load", function () {
    setTimeout(function () {
      window.scrollTo(0, 0); redrawAll();
      // Shareable links: ?run=lift#/s3 lifts the fog at the default settings; ?run=drive#/s6 drives once with the push and the lookout on.
      var run = (/[?&]run=([a-z]+)/.exec(location.search) || [])[1];
      if (run === "lift" && start === "s3") $("s3go").click();
      if (run === "drive" && start === "s6") { $("s6push").checked = true; window.FRDrive.set("push", true); $("s6go").click(); }
      if (run === "both" && start === "s7") $("s7go").click();
      if (run === "train" && start === "s8") { $("s8go").click(); var wait = setInterval(function () { if (!$("s8go").disabled) { clearInterval(wait); $("s8lift").click(); } }, 100); }
      // Screenshot mode only: settle at the top once fonts, clicks and layout are done (headless Chrome otherwise drifts).
      if (document.body.classList.contains("shot")) setTimeout(function () { window.scrollTo(0, 0); }, 700);
    }, 0);
  });
  window.addEventListener("resize", function () { redrawAll(); });
  window.FRApp = { show: show, store: function () { return store; }, ladder: ladder };
})();
