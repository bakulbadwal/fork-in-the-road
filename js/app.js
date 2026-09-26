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
  var NAV_ICON = { s0: "square", s1: "fog", s2: "map", s3: "passes", s4: "watch", s5: "spyglass", s6: "card", cap: "star", ft: "pencil" };
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
    var h = { stopped: false, stop: function () { h.stopped = true; } };
    if (REDUCED) { onFrame(1); if (onDone) onDone(); return h; }
    var t0 = null;
    function step(now) {
      if (h.stopped) return;
      if (t0 === null) t0 = now;
      var u = Math.min(1, (now - t0) / ms);
      onFrame(u);
      if (u < 1) requestAnimationFrame(step); else if (onDone) onDone();
    }
    requestAnimationFrame(step);
    return h;
  }
  var ease = function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };

  /* ---------------- the map canvas ---------------- */
  function SquareView(id) {
    var c = $(id), ctx = c.getContext("2d"), W = 0, H = 0, V = S.VIEW;
    function fit() {
      var r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
      ctx.setTransform(d, 0, 0, d, 0, 0); W = w; H = h;
    }
    var X = function (x) { return (x + V) / (2 * V) * W; }, Y = function (y) { return (V - y) / (2 * V) * H; };
    function cartBox(fx, ghost) {
      var x0 = X(fx - S.CART.hw), y0 = Y(S.CART.hh), w = X(fx + S.CART.hw) - x0, h = Y(-S.CART.hh) - y0;
      if (ghost) { ctx.setLineDash([6, 5]); ctx.strokeStyle = COL.fog; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h); ctx.setLineDash([]); return; }
      ctx.fillStyle = "#B8793F"; ctx.strokeStyle = COL.line; ctx.lineWidth = 2; ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h);
      var band = Math.max(8, h * 0.22), n = Math.max(2, Math.round(w / 12));
      for (var i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? "#FBF7EC" : "#C8452F"; ctx.fillRect(x0 + i * w / n, y0, w / n + 0.5, band); }
      ctx.strokeRect(x0, y0, w, band);
      ctx.fillStyle = "#FFFDF6"; ctx.font = "600 " + Math.max(9, Math.round(W / 42)) + "px 'Grandstander', 'Patrick Hand', sans-serif"; ctx.textAlign = "center";
      ctx.fillText("PRETZELS", x0 + w / 2, y0 + h * 0.65);
    }
    function courierGlyph(x, y, o) {
      o = o || {}; var s = Math.max(10, W / 30), px = X(x), py = Y(y);
      ctx.fillStyle = COL.line; ctx.beginPath(); ctx.arc(px - s * 0.5, py + s * 0.35, s * 0.28, 0, 7); ctx.arc(px + s * 0.5, py + s * 0.35, s * 0.28, 0, 7); ctx.fill();
      ctx.fillStyle = o.dizzy ? "#F4B7A7" : "#B9BDC2"; ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(px - s, py - s * 0.35, 2 * s, s * 0.8, s * 0.25); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#F4C430"; ctx.fillRect(px - s, py + s * 0.05, 2 * s, s * 0.18);
      ctx.fillStyle = "#B8793F"; ctx.fillRect(px - s * 0.7, py - s * 0.9, s * 0.9, s * 0.55); ctx.strokeRect(px - s * 0.7, py - s * 0.9, s * 0.9, s * 0.55);
      ctx.fillStyle = "#FFFDF6"; ctx.fillRect(px + s * 0.35, py - s * 0.8, s * 0.55, s * 0.45); ctx.strokeRect(px + s * 0.35, py - s * 0.8, s * 0.55, s * 0.45);
      ctx.fillStyle = COL.line; ctx.beginPath(); ctx.arc(px + s * 0.5, py - s * 0.58, s * 0.06, 0, 7); ctx.arc(px + s * 0.75, py - s * 0.58, s * 0.06, 0, 7); ctx.fill();
    }
    function dot(x, y, col, r) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(x), Y(y), r || Math.max(2, W / 200), 0, 7); ctx.fill(); }
    function render(st) {
      fit();
      ctx.fillStyle = css("--cobble") || "#EAD9B6"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(74,46,30,.12)"; ctx.lineWidth = 1;
      for (var g = -3; g <= 3; g++) { ctx.beginPath(); ctx.moveTo(X(g), 0); ctx.lineTo(X(g), H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, Y(g)); ctx.lineTo(W, Y(g)); ctx.stroke(); }
      ctx.fillStyle = "#DDBB8A"; ctx.fillRect(X(-0.5), 0, X(0.5) - X(-0.5), H);
      ctx.strokeStyle = "#FBF7EC"; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#B9BDC2"; ctx.strokeStyle = COL.line; ctx.lineWidth = 2; ctx.fillRect(X(-0.6), Y(S.START_Y) - 2, X(0.6) - X(-0.6), H - Y(S.START_Y) + 2); ctx.strokeRect(X(-0.6), Y(S.START_Y) - 2, X(0.6) - X(-0.6), H - Y(S.START_Y) + 2);
      ctx.fillStyle = "#5FA03C"; ctx.fillRect(X(-0.6), -2, X(0.6) - X(-0.6), Y(S.GOAL_Y) + 2); ctx.strokeRect(X(-0.6), -2, X(0.6) - X(-0.6), Y(S.GOAL_Y) + 2);
      ctx.font = "800 " + Math.max(9, Math.round(W / 40)) + "px 'Grandstander', 'Patrick Hand', sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = COL.ink; ctx.fillText("DEPOT", X(0), H - 5); ctx.fillStyle = "#FBF7EC"; ctx.fillText("BAKERY", X(0), Y(S.GOAL_Y) - 4);
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
      if (st.trails) { ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6; st.trails.forEach(function (tr) { ctx.strokeStyle = tr.col || COL.fog; ctx.beginPath(); tr.pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.stroke(); }); ctx.globalAlpha = 1; }
      if (st.arrows) { ctx.strokeStyle = "rgba(74,46,30,.35)"; ctx.lineWidth = 1; st.arrows.forEach(function (a) { ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(a[2]), Y(a[3])); ctx.stroke(); }); }
      if (st.pts) { ctx.globalAlpha = st.ptsAlpha || 0.85; st.pts.forEach(function (p) { dot(p.x, p.y, p.col, p.r); }); ctx.globalAlpha = 1; }
      if (st.guess) { ctx.strokeStyle = COL.ink; ctx.lineWidth = 1; ctx.globalAlpha = 0.6; st.guess.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), Math.max(2.2, W / 170), 0, 7); ctx.stroke(); }); ctx.globalAlpha = 1; }
      if (st.path && st.path.length > 1) { ctx.strokeStyle = st.pathCol || COL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); st.path.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }); ctx.stroke(); }
      if (st.pins) { st.pins.forEach(function (p) { ctx.fillStyle = p.state === "lit" ? "#F4C430" : p.state === "done" ? "#5FA03C" : "#FFFDF6"; ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(3, W / 90), 0, 7); ctx.fill(); ctx.stroke(); }); }
      if (st.courier) courierGlyph(st.courier.x, st.courier.y, st.courier);
      if (st.flash) { ctx.fillStyle = "rgba(200,69,47,.18)"; ctx.fillRect(0, 0, W, H); }
      if (st.caption) { ctx.fillStyle = COL.ink; ctx.font = "400 " + Math.max(11, Math.round(W / 32)) + "px 'Patrick Hand', sans-serif"; ctx.textAlign = "left"; ctx.fillText(st.caption, 8, 20); }
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
  var DEMOS = S.demos2d(600, 7, 0);
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
      var side = drives % 2 === 0 ? -1 : 1; drives++; if (side < 0) nl++; else nr++;
      var pts = DEMOS.filter(function (p) { return p.side === side; }).slice((drives - 1) * 3, (drives - 1) * 3 + 6);
      if (pts.length < 6) pts = DEMOS.filter(function (p) { return p.side === side; }).slice(0, 6);
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
      view.render({ fx: 0, pts: pts, caption: "t = " + t });
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
      view.render({ fx: 0, pts: pts, arrows: arrows, caption: "t = " + t });
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
      $("s3lad").innerHTML = "<tr><th>passes</th><th>went left</th><th>went right</th><th>inside the cart</th></tr>" + rows.map(function (r) { return '<tr class="' + (r.K === K ? "now" : "") + '"><td class="n">' + r.K + "</td><td>" + pct(r.tally.left / 600) + "</td><td>" + pct(r.tally.right / 600) + '</td><td class="n" style="color:' + (r.tally.cart ? COL.cart : "#3B7422") + '">' + pct(r.tally.cart / 600) + "</td></tr>"; }).join("");
    }
    function stats(chains, done, pass) {
      if (!done) { $("s3l").textContent = "–"; $("s3r").textContent = "–"; $("s3cart").textContent = "–"; $("s3st").innerHTML = "pass <b>" + pass + " / " + K + "</b>"; return; }
      var tl = S.tally(chains.map(function (c) { return c.x; }), 0);
      $("s3l").textContent = pct(tl.left / 600); $("s3r").textContent = pct(tl.right / 600); $("s3cart").textContent = pct(tl.cart / 600);
      $("s3st").innerHTML = "<b>" + K + "</b> pass" + (K > 1 ? "es" : "") + " · " + tl.cart + " of 600 in the cart";
    }
    function frame(chains, pass, u, done) {
      var pts = chains.map(function (c) { var a = c.trail[pass], b2 = c.trail[Math.min(pass + 1, c.trail.length - 1)], x = a[0] + (b2[0] - a[0]) * u, y = a[1] + (b2[1] - a[1]) * u; return { x: x, y: y, col: done ? classCol(S.classify(c.x[0], c.x[1], 0)) : COL.fog }; });
      var trails = $("s3trail").checked ? chains.slice(0, 30).map(function (c) { var tp = c.trail.slice(0, pass + 1).map(function (p) { return [p[0], p[1]]; }); var a = c.trail[pass], b2 = c.trail[Math.min(pass + 1, c.trail.length - 1)]; tp.push([a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u]); return { pts: tp, col: done ? classCol(S.classify(c.x[0], c.x[1], 0)) : COL.fog }; }) : null;
      var guess = $("s3guess").checked && !done ? chains.map(function (c) { return c.guesses[Math.min(pass, c.guesses.length - 1)]; }) : null;
      view.render({ fx: 0, routes: done, pts: pts, trails: trails, guess: guess, caption: done ? K + " pass" + (K > 1 ? "es" : "") + " · " + (eta ? "DDPM-like η = 1" : "DDIM η = 0") + " · " + schName : "pass " + (pass + 1) + " of " + K });
    }
    $("s3go").onclick = function () {
      if (running) running.stop();
      var res = S.run2d({ K: K, eta: eta, sch: SCH[schName], fx: 0, n: 600, seed: 11 }), chains = res.chains, pass = 0, per = Math.max(140, Math.min(800, 3000 / K));
      last = chains; $("s3go").disabled = true;
      function next() {
        stats(chains, false, pass + 1);
        running = anim(per, function (u) { frame(chains, pass, ease(u), false); }, function () {
          pass++;
          if (pass < K) next(); else { frame(chains, K - 1, 1, true); stats(chains, true); running = null; $("s3go").disabled = false; touch("s3"); }
        });
      }
      next();
    };
    seg($("s3k"), [1, 2, 3, 5, 10, 50].map(function (k) { return { v: k, label: String(k) }; }), K, function (v) { K = +v; renderLadder(); });
    seg($("s3eta"), [{ v: 0, label: "DDIM · η = 0" }, { v: 1, label: "DDPM-like · η = 1" }], eta, function (v) { eta = +v; renderLadder(); });
    seg($("s3sch"), SCH_OPTS, schName, function (v) { schName = v; renderLadder(); });
    $("s3trail").addEventListener("change", function () { if (last && !running) frame(last, K - 1, 1, true); });
    idle(); renderLadder(); stats(null, false, 0); $("s3st").textContent = "";
    redraws.push(function () { if ($("s3").classList.contains("on")) { if (last && !running) frame(last, K - 1, 1, true); else if (!running) idle(); } });
  }

  /* ================= STEP 4: the stopwatch ================= */
  function initS4() {
    var ms = 10, hz = 10, schName = "cosine";
    function draw() {
      var budget = 1000 / hz, rows = ladder(schName, 0, true), fits = rows.filter(function (r) { return r.K * ms <= budget; }), best = fits.length ? fits[fits.length - 1] : null;
      $("s4msv").textContent = ms; $("s4bud").textContent = fmt(budget, 0) + " ms"; $("s4max").textContent = best ? best.K : "0";
      $("s4cart").textContent = best ? pct(best.tally.cart / 600) : "–"; $("s4cart").className = "v " + (best && best.tally.cart === 0 ? "good" : "bad");
      $("s4ddpm").textContent = fmt(1000 * ms / 1000, 1) + " s";
      $("s4m").innerHTML = "budget = 1000 ÷ " + hz + " = <b>" + fmt(budget, 0) + " ms</b> · passes ≤ " + fmt(budget, 0) + " ÷ " + ms + " = <b>" + fmt(Math.floor(budget / ms), 0) + "</b>" + (best ? "<br>the biggest rung that fits: <b>" + best.K + " passes</b>, " + fmt(best.K * ms, 0) + " ms, " + pct(best.tally.cart / 600) + " in the cart" : "<br><span class='bad'>not even one pass fits</span>");
      $("s4lad").innerHTML = "<tr><th>passes</th><th>time</th><th>fits?</th><th>inside the cart</th></tr>" + rows.map(function (r) { var tm = r.K * ms, ok = tm <= budget; return '<tr class="' + (best && r.K === best.K ? "now" : "") + (ok ? "" : " no") + (r.K === 1000 ? " slow" : "") + '"><td class="n">' + r.K + (r.K === 1000 ? " (DDPM)" : "") + "</td><td>" + (tm >= 1000 ? fmt(tm / 1000, 1) + " s" : fmt(tm, 0) + " ms") + "</td><td>" + (ok ? "✓" : "✗") + '</td><td class="n" style="color:' + (r.tally.cart ? COL.cart : "#3B7422") + '">' + pct(r.tally.cart / 600) + "</td></tr>"; }).join("");
    }
    $("s4ms").addEventListener("input", function () { ms = +this.value; draw(); touch("s4"); });
    seg($("s4hz"), [5, 10, 20, 50].map(function (h) { return { v: h, label: h + " Hz · " + fmt(1000 / h, 0) + " ms" }; }), hz, function (v) { hz = +v; draw(); touch("s4"); });
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
      va.render({ fx: fx, routes: true, pts: seen.chains.map(function (c) { return { x: c.x[0], y: c.x[1], col: classCol(S.classify(c.x[0], c.x[1], fx)) }; }), caption: "with the report · cart at " + sgn(fx, 1) });
      vb.render({ fx: fx, ghost: 0, routes: true, routesFx: 0, pts: blind.chains.map(function (c) { return { x: c.x[0], y: c.x[1], col: classCol(S.classify(c.x[0], c.x[1], fx)) }; }), caption: "blindfolded · she thinks the cart is at 0.0" });
      $("s5ac").textContent = pct(seen.tally.cart / 600); $("s5al").textContent = pct(seen.tally.left / 600); $("s5bc").textContent = pct(blind.tally.cart / 600); $("s5bl").textContent = pct(blind.tally.left / 600);
      $("s5st").innerHTML = "600 routes each · blind: <b>" + blind.tally.cart + "</b> in the cart";
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
      hud(tau, ph, dc, driven, finished);
    }
    var k = 0;
    function next() {
      if (k >= phases.length) { if (onDone) onDone(); return; }
      var ph = phases[k], dur = Math.max(1, ph.r1 - ph.r0);
      return anim(dur, function (u) { render(ph, u); }, function () { k++; next(); });
    }
    if (REDUCED) { render(phases[phases.length - 1], 1); if (onDone) onDone(); return { stop: function () {} }; }
    var h = { stopped: false }, cur = null;
    (function loop() { if (h.stopped || k >= phases.length) { if (!h.stopped && onDone) onDone(); return; } var ph = phases[k]; cur = anim(Math.max(1, ph.r1 - ph.r0), function (u) { render(ph, u); }, function () { k++; loop(); }); })();
    h.stop = function () { h.stopped = true; if (cur) cur.stop(); };
    return h;
  }
  function initS6() {
    var view = SquareView("s6c"), o = { policy: "diffusion", K: 10, Ta: 8, lookout: true, push: false, fx: 0 }, running = null, lastDrive = null;
    function idle() { view.render({ fx: o.fx, routes: true, courier: { x: 0, y: S.START_Y }, caption: "at the depot · press Drive" }); $("s6t").textContent = "0.0 s"; $("s6card").textContent = "–"; $("s6do").textContent = "ready"; $("s6dent").textContent = "0"; $("s6pins").innerHTML = ""; $("s6st").textContent = ""; }
    function pinsRow(dc, driven, Ta) { $("s6pins").innerHTML = dc.chunk.map(function (x, j) { return "<i class='" + (j < Ta ? (j < driven ? "done" : "lit") : "") + "'></i>"; }).join(""); }
    function hud(tau, ph, dc, driven, finished) {
      $("s6t").textContent = tau.toFixed(1) + " s"; $("s6card").textContent = String(ph.i + 1);
      $("s6do").textContent = finished ? (lastDrive.hit ? "dented" : "delivered") : ph.kind === "think" ? "thinking " + (dc.think >= 1 ? fmt(dc.think, 0) + " s" : fmt(dc.think * 1000, 0) + " ms") : "pin " + Math.min(driven + 1, o.Ta) + " / " + o.Ta;
      $("s6dent").textContent = finished && lastDrive.hit ? "1" : "0";
      pinsRow(dc, driven, o.Ta);
      var seesCart = Math.abs(dc.obsFx - dc.realFx) < 1e-9;
      $("s6st").className = "status" + (finished && lastDrive.hit ? " hit" : "");
      $("s6st").innerHTML = finished ? (lastDrive.hit ? "<b>Dent.</b> " + lastDrive.decisions.length + " cards, " + lastDrive.time.toFixed(1) + " s, " + lastDrive.flips + " side flip" + (lastDrive.flips === 1 ? "" : "s") + "." : "<b>Delivered.</b> " + lastDrive.decisions.length + " cards, " + lastDrive.time.toFixed(1) + " s, " + lastDrive.flips + " side flip" + (lastDrive.flips === 1 ? "" : "s") + ".") : "card " + (ph.i + 1) + ": the cartographer " + (seesCart ? "sees the cart at " + sgn(dc.obsFx, 1) : "<b>thinks</b> the cart is at " + sgn(dc.obsFx, 1) + " (it's at " + sgn(dc.realFx, 1) + ")") + " · " + (dc.side < 0 ? "going left" : "going right");
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
    seg($("s6pol"), [{ v: "diffusion", label: "the cartographer (diffusion)" }, { v: "averager", label: "the clerk (average)" }], o.policy, function (v) { o.policy = v; });
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
    { id: "c3", title: "Case 3 · the slowpoke", brief: "<b>The report:</b> on market day the vendor paces the cart back and forth across the road (0.8 either way, an 8-second round trip). The courier dents it most drives and takes 25 seconds. The rule: the cartographer draws every card with DDPM's full <b>1,000 passes</b>, 10 ms each, and the courier waits for the card.",
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
        store.cap[c.id] = pass; save(); grade();
      };
    });
    grade();
  }

  /* ================= FIELD TEST ================= */
  var FT = [
    { q: "Cosine schedule: at which t does the map become half fog (ᾱ crosses 0.5)?", hint: "step 1", ans: 496, tol: 12 },
    { q: "Linear schedule: at which t?", hint: "step 1", ans: 259, tol: 12 },
    { q: "One pass from pure fog: what percent of the 600 routes end inside the cart?", hint: "step 3, %", ans: 100, tol: 1 },
    { q: "Five passes, cosine, DDIM η = 0: what percent inside the cart?", hint: "step 3, %", ans: 2, tol: 2 },
    { q: "Linear schedule, two passes: what percent inside the cart?", hint: "step 3, %", ans: 94, tol: 4 },
    { q: "10 ms per pass, a new card every 50 ms (20 Hz): how many passes fit?", hint: "step 4", ans: 5, tol: 0 },
    { q: "Cart parked at +1.0, cartographer blindfolded, 10 passes: what percent inside the cart?", hint: "step 5, %", ans: 28, tol: 5 },
    { q: "Re-plan after every pin (Ta = 1), 20 drives: side flips per drive?", hint: "step 6, Drive 20 in a row", ans: 1.9, tol: 0.5 }
  ];
  function initFT() {
    $("ftqs").innerHTML = FT.map(function (f, i) { return '<div class="fq"><div class="fqt"><b>' + (i + 1) + ".</b> " + f.q + ' <span class="muted">(' + f.hint + ')</span></div><div class="row"><input type="number" id="ft' + i + '" step="any" value="' + (store.ft[i] != null ? esc(store.ft[i]) : "") + '"><span class="res" id="ftr' + i + '"></span></div></div>'; }).join("");
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) { var raw = $("ft" + i).value, v = parseFloat(raw), ok = raw !== "" && !isNaN(v) && Math.abs(v - f.ans) <= f.tol; store.ft[i] = raw; if (ok) score++; $("ftr" + i).innerHTML = ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'; });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can read the Diffusion Policy paper." : "");
      if (score >= 6 && !store.said.ft) { store.said.ft = true; save(); buildNav(); markNav(); }
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
  function hashId() { var m = /^#\/?(s[0-6]|cap|ft)$/.exec(location.hash || ""); return m ? m[1] : null; }
  window.addEventListener("hashchange", function () { var id = hashId(); if (id && !$(id).classList.contains("on")) show(id); });
  initS0(); initS1(); initS2(); initS3(); initS4(); initS5(); initS6(); initCap(); initFT();
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
    }, 0);
  });
  window.addEventListener("resize", function () { redrawAll(); });
  window.FRApp = { show: show, store: function () { return store; }, ladder: ladder };
})();
