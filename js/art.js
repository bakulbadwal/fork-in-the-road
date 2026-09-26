/* Fork in the Road — the pictures. Eight hand-built 960×400 cutaway scenes of a Busytown square, assembled from
   a small cast of drawn parts, plus the nav and cast icons. Flat gouache fills, one warm-brown outline, every object
   labelled with a hairline pointer. Exposed as window.FR_ART (scenes) and window.FR_ICONS (icons). */
(function (root) {
  "use strict";
  var L = "#4A2E1E", PAPER = "#FBF7EC", SHEET = "#FFFDF6", YEL = "#F4C430", BRICK = "#C8452F", GRASS = "#5FA03C", SKY = "#9CCBEA",
      SAND = "#DDBB8A", LILAC = "#B8A3DC", STEEL = "#B9BDC2", WOOD = "#B8793F", COBBLE = "#EAD9B6", FOG = "#EEF3F6", FOG2 = "#DCE6ED",
      LEFT = "#246A9C", RIGHT = "#D9771E", BAD = "#A5321F", NOTE = "#FFF1A8", SKIN = "#F1C9A5", SKIN2 = "#D9A27A", SKIN3 = "#9C6B4A", CHALK = "#2F4A3A";
  var HAND = "'Patrick Hand', 'Comic Sans MS', sans-serif", SIGN = "'Grandstander', 'Patrick Hand', sans-serif";

  /* ---------- primitives ---------- */
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-family="' + (o.sign ? SIGN : HAND) + '" font-size="' + (o.size || 15) + '"' + (o.sign ? ' font-weight="800"' : "") +
      ' fill="' + (o.fill || L) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") + (o.tf ? ' transform="' + o.tf + '"' : "") + (o.ls ? ' letter-spacing="' + o.ls + '"' : "") + ">" + s + "</text>";
  }
  // A painted signboard title: uppercase sign lettering in paper on a brick board, with the 2px dark offset copy.
  function board(x, y, w, s, col) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="36" rx="6" fill="' + (col || BRICK) + '" stroke="' + L + '" stroke-width="3"/>' +
      '<g font-family="' + SIGN + '" font-weight="800" font-size="21" letter-spacing="1" text-anchor="middle">' +
      '<text x="' + (x + w / 2 + 2) + '" y="' + (y + 27) + '" fill="' + L + '">' + s + "</text><text x=\"" + (x + w / 2) + '" y="' + (y + 25) + '" fill="' + PAPER + '">' + s + "</text></g>";
  }
  // A hand-lettered label joined to its object by a hairline pointer. t = [x, y] of the object.
  function label(x, y, s, t, o) {
    o = o || {};
    var out = txt(x, y, s, { size: o.size || 15, anchor: o.anchor, fill: o.fill });
    if (t) {
      var ax = o.anchor === "middle" ? x : o.anchor === "end" ? x - 4 : x + s.length * 6.4;
      if (o.from) ax = o.from[0];
      var ay = o.from ? o.from[1] : y - 5;
      out += '<path d="M' + ax + " " + ay + " L" + t[0] + " " + t[1] + '" fill="none" stroke="' + L + '" stroke-width="1"/>';
    }
    return out;
  }
  function note(x, y, w, h, lines, o) {   // a sticky note or index card
    o = o || {};
    var s = '<g transform="rotate(' + (o.rot || 0) + " " + (x + w / 2) + " " + (y + h / 2) + ')"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + (o.fill || NOTE) + '" stroke="' + L + '" stroke-width="2"/>';
    if (o.tape) s += '<rect x="' + (x + w / 2 - 16) + '" y="' + (y - 6) + '" width="32" height="12" fill="rgba(156,203,234,.8)" stroke="rgba(74,46,30,.4)" stroke-width="1.2" transform="rotate(3 ' + (x + w / 2) + " " + y + ')"/>';
    lines.forEach(function (ln, i) { s += txt(x + 8, y + 18 + i * 17, ln, { size: o.size || 14, sign: i === 0 && o.head }); });
    return s + (o.extra || "") + "</g>";
  }
  function cobbles(x, y, w, h, seed) {   // the square's paving: a sand field with cobble dots
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + COBBLE + '" stroke="' + L + '" stroke-width="2"/>', r = seed || 1;
    var d = "";
    for (var i = 0; i < 90; i++) { r = (r * 9301 + 49297) % 233280; var px = x + 8 + (r / 233280) * (w - 16); r = (r * 9301 + 49297) % 233280; var py = y + 8 + (r / 233280) * (h - 16); d += "M" + px.toFixed(1) + " " + py.toFixed(1) + " h5 "; }
    return s + '<path d="' + d + '" stroke="' + SAND + '" stroke-width="3" stroke-linecap="round"/>';
  }
  function building(x, y, w, h, col, o) {   // a Busytown storefront in elevation
    o = o || {};
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + col + '" stroke="' + L + '" stroke-width="2.5"/>';
    s += '<rect x="' + (x - 6) + '" y="' + (y - 14) + '" width="' + (w + 12) + '" height="16" fill="' + (o.roof || WOOD) + '" stroke="' + L + '" stroke-width="2.5"/>';
    var n = Math.max(1, Math.floor(w / 34));
    for (var i = 0; i < n; i++) { var wx = x + 10 + i * ((w - 20 - 18) / Math.max(1, n - 1 || 1)); if (n === 1) wx = x + w / 2 - 9; s += '<rect x="' + wx + '" y="' + (y + 12) + '" width="18" height="20" rx="2" fill="' + SKY + '" stroke="' + L + '" stroke-width="2"/>'; }
    if (o.awning) s += '<path d="M' + x + " " + (y + h - 44) + " h" + w + " v10 " + (function () { var d = "", k = Math.floor(w / 12); for (var j = 0; j < k; j++) d += "l-6 8 l-6 -8 "; return d; })() + 'z" fill="' + o.awning + '" stroke="' + L + '" stroke-width="2"/>';
    if (o.door) s += '<rect x="' + (x + w / 2 - 11) + '" y="' + (y + h - 30) + '" width="22" height="30" rx="3" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2"/>';
    if (o.sign) s += '<rect x="' + (x + 6) + '" y="' + (y + h - 62) + '" width="' + (w - 12) + '" height="16" rx="3" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.5"/>' + txt(x + w / 2, y + h - 50, o.sign, { size: 13, anchor: "middle" });
    return s;
  }
  function person(x, y, o) {   // a rounded Busytown worker, standing, about 70 tall; (x,y) = feet centre
    o = o || {};
    var skin = o.skin || SKIN, shirt = o.shirt || SKY, s = "";
    s += '<rect x="' + (x - 9) + '" y="' + (y - 22) + '" width="7" height="22" rx="3" fill="' + (o.pants || LEFT) + '" stroke="' + L + '" stroke-width="2"/><rect x="' + (x + 2) + '" y="' + (y - 22) + '" width="7" height="22" rx="3" fill="' + (o.pants || LEFT) + '" stroke="' + L + '" stroke-width="2"/>';
    s += '<rect x="' + (x - 14) + '" y="' + (y - 50) + '" width="28" height="32" rx="9" fill="' + shirt + '" stroke="' + L + '" stroke-width="2"/>';
    if (o.apron) s += '<rect x="' + (x - 9) + '" y="' + (y - 42) + '" width="18" height="22" rx="3" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.5"/>';
    // arms
    var ax = o.armsUp ? -18 : 0;
    s += '<path d="M' + (x - 14) + " " + (y - 44) + " l-10 " + (10 + ax) + '" stroke="' + L + '" stroke-width="7" stroke-linecap="round"/><path d="M' + (x - 14) + " " + (y - 44) + " l-10 " + (10 + ax) + '" stroke="' + shirt + '" stroke-width="3.5" stroke-linecap="round"/>';
    s += '<path d="M' + (x + 14) + " " + (y - 44) + " l10 " + (10 + (o.pointing ? -14 : ax)) + '" stroke="' + L + '" stroke-width="7" stroke-linecap="round"/><path d="M' + (x + 14) + " " + (y - 44) + " l10 " + (10 + (o.pointing ? -14 : ax)) + '" stroke="' + shirt + '" stroke-width="3.5" stroke-linecap="round"/>';
    s += '<circle cx="' + (x - 24) + '" cy="' + (y - 34 + ax) + '" r="4" fill="' + skin + '" stroke="' + L + '" stroke-width="1.5"/><circle cx="' + (x + 24) + '" cy="' + (y - 34 + (o.pointing ? -14 : ax)) + '" r="4" fill="' + skin + '" stroke="' + L + '" stroke-width="1.5"/>';
    // head
    s += '<circle cx="' + x + '" cy="' + (y - 62) + '" r="13" fill="' + skin + '" stroke="' + L + '" stroke-width="2"/>';
    s += '<circle cx="' + (x - 4) + '" cy="' + (y - 64) + '" r="1.6" fill="' + L + '"/><circle cx="' + (x + 4) + '" cy="' + (y - 64) + '" r="1.6" fill="' + L + '"/>';
    s += o.frown ? '<path d="M' + (x - 4) + " " + (y - 56) + " q4 -3 8 0\" fill=\"none\" stroke=\"" + L + '" stroke-width="1.5"/>' : '<path d="M' + (x - 4) + " " + (y - 58) + " q4 3 8 0\" fill=\"none\" stroke=\"" + L + '" stroke-width="1.5"/>';
    if (o.hat === "cap") s += '<path d="M' + (x - 13) + " " + (y - 66) + " a13 13 0 0 1 26 0 z\" fill=\"" + (o.hatCol || BRICK) + '" stroke="' + L + '" stroke-width="2"/><rect x="' + (x - 2) + '" y="' + (y - 69) + '" width="20" height="5" rx="2" fill="' + (o.hatCol || BRICK) + '" stroke="' + L + '" stroke-width="1.5"/>';
    if (o.hat === "visor") s += '<path d="M' + (x - 14) + " " + (y - 66) + " h28 l-4 -6 h-20 z\" fill=\"" + GRASS + '" stroke="' + L + '" stroke-width="1.5"/>';
    if (o.hat === "chef") s += '<rect x="' + (x - 10) + '" y="' + (y - 86) + '" width="20" height="14" rx="5" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/><rect x="' + (x - 12) + '" y="' + (y - 75) + '" width="24" height="6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/>';
    if (o.hair) s += '<path d="M' + (x - 13) + " " + (y - 64) + " a13 13 0 0 1 26 0 v-2 a13 13 0 0 0 -26 0 z\" fill=\"" + o.hair + '" stroke="' + L + '" stroke-width="1.5"/>';
    return s;
  }
  // The courier: a small wheeled delivery robot with a crate. (x, y) = ground contact centre; faces right unless flip.
  function courier(x, y, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = '<g transform="translate(' + x + " " + y + ") scale(" + (o.flip ? -sc : sc) + " " + sc + ')">';
    s += '<rect x="-28" y="-46" width="30" height="22" rx="3" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2"/><path d="M-28 -35 h30 M-13 -46 v22" stroke="' + L + '" stroke-width="1.5"/>';   // crate
    s += '<rect x="-34" y="-26" width="68" height="26" rx="8" fill="' + (o.body || STEEL) + '" stroke="' + L + '" stroke-width="2.5"/>';
    s += '<rect x="-34" y="-16" width="68" height="6" fill="' + YEL + '" stroke="' + L + '" stroke-width="1.5"/>';
    s += '<circle cx="-18" cy="0" r="10" fill="' + L + '"/><circle cx="-18" cy="0" r="4" fill="' + STEEL + '" stroke="' + L + '" stroke-width="1.5"/><circle cx="18" cy="0" r="10" fill="' + L + '"/><circle cx="18" cy="0" r="4" fill="' + STEEL + '" stroke="' + L + '" stroke-width="1.5"/>';
    s += '<rect x="14" y="-40" width="18" height="16" rx="4" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/>';   // face plate
    if (o.asleep) s += '<path d="M18 -32 h4 M26 -32 h4" stroke="' + L + '" stroke-width="1.8" stroke-linecap="round"/>' + txt(36, -44, "z", { size: 12 }) + txt(42, -52, "z", { size: 12 });
    else if (o.dizzy) s += '<path d="M17 -34 l4 4 m0 -4 l-4 4 M25 -34 l4 4 m0 -4 l-4 4" stroke="' + L + '" stroke-width="1.6"/>';
    else s += '<circle cx="20" cy="-33" r="1.8" fill="' + L + '"/><circle cx="27" cy="-33" r="1.8" fill="' + L + '"/><path d="M20 -29 q3.5 2.5 7 0" fill="none" stroke="' + L + '" stroke-width="1.4"/>';
    s += '<path d="M6 -46 v-12" stroke="' + L + '" stroke-width="2"/><circle cx="6" cy="-60" r="3.5" fill="' + BRICK + '" stroke="' + L + '" stroke-width="1.5"/>';   // antenna
    return s + "</g>";
  }
  // The pretzel cart: a wooden cart with a striped awning. (x, y) = ground centre.
  function cart(x, y, sc, o) {
    o = o || {}; sc = sc || 1;
    var s = '<g transform="translate(' + x + " " + y + ") scale(" + sc + ')">';
    s += '<rect x="-40" y="-50" width="80" height="34" rx="4" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2.5"/><path d="M-40 -40 h80 M-40 -29 h80" stroke="' + L + '" stroke-width="1.2"/>';
    s += '<circle cx="-24" cy="-10" r="11" fill="' + SAND + '" stroke="' + L + '" stroke-width="2.5"/><circle cx="24" cy="-10" r="11" fill="' + SAND + '" stroke="' + L + '" stroke-width="2.5"/><circle cx="-24" cy="-10" r="3" fill="' + L + '"/><circle cx="24" cy="-10" r="3" fill="' + L + '"/>';
    s += '<path d="M-36 -50 v-40 M36 -50 v-40" stroke="' + L + '" stroke-width="3"/>';
    s += '<path d="M-48 -90 h96 v8 l-8 9 l-8 -9 l-8 9 l-8 -9 l-8 9 l-8 -9 l-8 9 l-8 -9 l-8 9 l-8 -9 l-8 9 l-8 -9 l-8 9 l-8 -9 z" fill="' + BRICK + '" stroke="' + L + '" stroke-width="2"/>';
    s += '<path d="M-32 -90 v8 M-16 -90 v8 M0 -90 v8 M16 -90 v8 M32 -90 v8" stroke="' + PAPER + '" stroke-width="7"/>';
    s += '<path d="M-48 -90 h96 v8 h-96 z" fill="none" stroke="' + L + '" stroke-width="2"/>';
    s += '<path d="M-50 -95 h100" stroke="' + L + '" stroke-width="3" stroke-linecap="round"/>';
    // pretzels on a rail
    [-22, 0, 22].forEach(function (px) { s += '<path d="M' + (px - 7) + " -62 q7 -12 14 0 q-4 6 -7 3 q-3 3 -7 -3 z\" fill=\"" + WOOD + '" stroke="' + L + '" stroke-width="1.5"/>'; });
    s += '<rect x="-30" y="-78" width="60" height="14" rx="3" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.5"/>' + txt(0, -67, "PRETZELS", { size: 11, anchor: "middle", sign: true });
    if (o.dented) s += '<path d="M-40 -34 l6 -4 l-4 -6 l6 -3" fill="none" stroke="' + L + '" stroke-width="2"/>';
    return s + "</g>";
  }
  function fog(x, y, w, o) {   // a bank of fog: overlapping soft blobs
    o = o || {};
    var s = '<g opacity="' + (o.op == null ? 0.92 : o.op) + '">', n = Math.max(2, Math.floor(w / 46));
    for (var i = 0; i < n; i++) {
      var cx = x + i * (w / (n - 1 || 1)), r = 26 + ((i * 7) % 3) * 6, cy = y + ((i * 5) % 3) * 6 - 6;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (o.dark ? FOG2 : FOG) + '" stroke="' + L + '" stroke-width="1.5"/>';
    }
    for (i = 0; i < n; i++) { var cx2 = x + i * (w / (n - 1 || 1)), r2 = 24 + ((i * 7) % 3) * 6, cy2 = y + ((i * 5) % 3) * 6 - 6; s += '<circle cx="' + cx2 + '" cy="' + cy2 + '" r="' + (r2 - 2) + '" fill="' + (o.dark ? FOG2 : FOG) + '"/>'; }
    return s + "</g>";
  }
  function route(pts, col, o) {   // a dashed route through [x,y] points, smoothed
    o = o || {};
    var d = "M" + pts[0][0] + " " + pts[0][1];
    for (var i = 1; i < pts.length; i++) { var p = pts[i - 1], q = pts[i]; d += " Q" + ((p[0] + q[0]) / 2 + (o.bow || 0)) + " " + (p[1] + q[1]) / 2 + " " + q[0] + " " + q[1]; }
    return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (o.w || 4) + '" stroke-linecap="round"' + (o.solid ? "" : ' stroke-dasharray="9 8"') + (o.op ? ' opacity="' + o.op + '"' : "") + "/>";
  }
  function pin(x, y, col) { return '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + (col || YEL) + '" stroke="' + L + '" stroke-width="1.8"/>'; }
  function joystick(x, y) {
    return '<rect x="' + (x - 22) + '" y="' + (y - 10) + '" width="44" height="14" rx="4" fill="' + STEEL + '" stroke="' + L + '" stroke-width="2"/><path d="M' + x + " " + (y - 10) + " l6 -26\" stroke=\"" + L + '" stroke-width="4" stroke-linecap="round"/><circle cx="' + (x + 6) + '" cy="' + (y - 38) + '" r="7" fill="' + BRICK + '" stroke="' + L + '" stroke-width="2"/><circle cx="' + (x - 12) + '" cy="' + (y - 3) + '" r="3" fill="' + YEL + '" stroke="' + L + '" stroke-width="1.5"/>';
  }
  function sheetStack(x, y, n, col) {
    var s = "";
    for (var i = 0; i < n; i++) s += '<rect x="' + (x + i * 2) + '" y="' + (y - i * 3) + '" width="44" height="30" rx="2" fill="' + (col || SHEET) + '" stroke="' + L + '" stroke-width="1.5"/>';
    return s + '<path d="M' + (x + n * 2 + 8) + " " + (y - n * 3 + 22) + " q10 -10 20 0 M" + (x + n * 2 + 8) + " " + (y - n * 3 + 12) + " q10 10 20 0\" fill=\"none\" stroke=\"" + LEFT + '" stroke-width="2" stroke-dasharray="3 3"/>';
  }
  function tower(x, y) {   // the lookout tower, (x, y) = base centre, about 150 tall
    return '<rect x="' + (x - 14) + '" y="' + (y - 120) + '" width="28" height="120" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2.5"/><path d="M' + (x - 14) + " " + (y - 100) + " l28 20 M" + (x + 14) + " " + (y - 100) + " l-28 20 M" + (x - 14) + " " + (y - 60) + " l28 20 M" + (x + 14) + " " + (y - 60) + " l-28 20\" stroke=\"" + L + '" stroke-width="1.5"/>' +
      '<rect x="' + (x - 30) + '" y="' + (y - 138) + '" width="60" height="22" rx="3" fill="' + SAND + '" stroke="' + L + '" stroke-width="2.5"/><path d="M' + (x - 36) + " " + (y - 138) + " l36 -22 l36 22 z\" fill=\"" + BRICK + '" stroke="' + L + '" stroke-width="2.5"/>';
  }
  function spyglass(x, y, ang) { return '<g transform="rotate(' + ang + " " + x + " " + y + ')"><rect x="' + x + '" y="' + (y - 4) + '" width="30" height="8" rx="2" fill="' + WOOD + '" stroke="' + L + '" stroke-width="1.8"/><rect x="' + (x + 28) + '" y="' + (y - 6) + '" width="12" height="12" rx="2" fill="' + STEEL + '" stroke="' + L + '" stroke-width="1.8"/></g>'; }
  function table(x, y, w) { return '<rect x="' + (x - w / 2) + '" y="' + (y - 6) + '" width="' + w + '" height="10" rx="2" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2.5"/><path d="M' + (x - w / 2 + 12) + " " + (y + 4) + " v40 M" + (x + w / 2 - 12) + " " + (y + 4) + " v40\" stroke=\"" + L + '" stroke-width="4"/>'; }
  function mapSheet(x, y, w, h, o) {   // a route sheet: mini square with the cart and a route
    o = o || {};
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/>';
    var cx = x + w / 2, cy = y + h / 2;
    s += '<rect x="' + (cx - w * 0.12) + '" y="' + (cy - h * 0.14) + '" width="' + (w * 0.24) + '" height="' + (h * 0.28) + '" fill="' + WOOD + '" stroke="' + L + '" stroke-width="1.5"/>';
    if (o.left !== false) s += route([[cx, y + h - 6], [cx - w * 0.3, cy], [cx, y + 6]], o.leftCol || LEFT, { w: o.w || 2.5, solid: o.solid });
    if (o.right !== false) s += route([[cx, y + h - 6], [cx + w * 0.3, cy], [cx, y + 6]], o.rightCol || RIGHT, { w: o.w || 2.5, solid: o.solid });
    if (o.straight) s += '<path d="M' + cx + " " + (y + h - 6) + " V" + (y + 6) + '" stroke="' + BAD + '" stroke-width="3"/>';
    if (o.fog != null) s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + FOG + '" opacity="' + o.fog + '"/>';
    if (o.noise) { var r = 5, d = ""; for (var i = 0; i < 40 * o.noise; i++) { r = (r * 9301 + 49297) % 233280; var px = x + 4 + (r / 233280) * (w - 8); r = (r * 9301 + 49297) % 233280; var py = y + 4 + (r / 233280) * (h - 8); d += "M" + px.toFixed(1) + " " + py.toFixed(1) + " h2 "; } s += '<path d="' + d + '" stroke="' + L + '" stroke-width="2" stroke-linecap="round" opacity=".55"/>'; }
    return s;
  }
  function wrap(id, title, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="fr-' + id + '-title"><title id="fr-' + id + '-title">' + title + '</title><rect width="960" height="400" fill="#E5F2FA"/>' +
      '<g stroke-linejoin="round" stroke-linecap="round">' + inner + "</g></svg>";
  }
  // The square in plan view: paving, the road, depot and bakery, storefronts down both sides.
  function square(o) {
    o = o || {};
    var s = cobbles(230, 0, 500, 400, 3);
    s += '<rect x="440" y="0" width="80" height="400" fill="' + SAND + '" stroke="' + L + '" stroke-width="2"/><path d="M480 0 V400" stroke="' + PAPER + '" stroke-width="3" stroke-dasharray="14 12"/>';
    // depot (bottom) and bakery (top)
    s += '<rect x="430" y="352" width="100" height="48" fill="' + STEEL + '" stroke="' + L + '" stroke-width="2.5"/>' + txt(480, 384, "DEPOT", { size: 16, anchor: "middle", sign: true, fill: L });
    s += '<rect x="430" y="0" width="100" height="42" fill="' + GRASS + '" stroke="' + L + '" stroke-width="2.5"/>' + txt(480, 28, "BAKERY", { size: 16, anchor: "middle", sign: true, fill: PAPER });
    // storefronts along the sides (in elevation, as Busytown does)
    s += building(20, 60, 90, 120, BRICK, { awning: GRASS, door: true, sign: "hats" }) + building(122, 40, 96, 140, LILAC, { door: true, sign: "books", awning: SKY });
    s += building(742, 40, 96, 140, SKY, { awning: BRICK, door: true, sign: "café" }) + building(850, 60, 90, 120, GRASS, { door: true, sign: "toys", awning: YEL });
    // a tree and a bench
    s += '<rect x="60" y="300" width="10" height="40" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2"/><circle cx="65" cy="280" r="34" fill="' + GRASS + '" stroke="' + L + '" stroke-width="2.5"/><circle cx="48" cy="292" r="20" fill="' + GRASS + '" stroke="' + L + '" stroke-width="2"/>';
    s += '<rect x="130" y="330" width="70" height="8" rx="2" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2"/><path d="M138 338 v14 M192 338 v14" stroke="' + L + '" stroke-width="3"/>';
    return s;
  }
  var LROUTE = [[480, 352], [430, 300], [372, 220], [372, 180], [430, 100], [480, 42]], RROUTE = [[480, 352], [530, 300], [588, 220], [588, 180], [530, 100], [480, 42]];

  /* ---------- scenes ---------- */
  var scenes = {};
  scenes.s0 = function () {
    var s = square();
    s += route(LROUTE, LEFT) + route(RROUTE, RIGHT);
    s += cart(480, 236, 0.9) + courier(480, 352, 0.8, { flip: false });
    // the dispatcher's booth
    s += '<rect x="760" y="230" width="180" height="140" rx="6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.5"/><rect x="760" y="230" width="180" height="24" fill="' + YEL + '" stroke="' + L + '" stroke-width="2.5"/>' + txt(850, 248, "DISPATCH", { size: 16, anchor: "middle", sign: true });
    s += table(850, 330, 140) + person(880, 332, { shirt: BRICK, hat: "cap", hatCol: LEFT, pointing: true }) + joystick(800, 326) + sheetStack(772, 290, 5);
    s += board(290, 8, 380, "THE SQUARE");
    s += label(742, 204, "the dispatcher = the demonstrator", [872, 262], { size: 14, from: [900, 208] });
    s += label(742, 222, "route sheets = the demonstrations", [790, 280], { size: 14, from: [790, 226] });
    s += label(742, 392, "joystick = teleoperation", [800, 334], { size: 14, from: [800, 378] });
    s += label(236, 226, "the pretzel cart", [446, 212], { from: [340, 222] });
    s += label(236, 244, "= the obstacle", null);
    s += label(236, 340, "the courier = the robot", [448, 330], { from: [384, 336] });
    s += label(236, 358, "its driving rule = the policy", null);
    s += label(236, 140, "went LEFT", [378, 180], { fill: LEFT, size: 16, from: [318, 136] });
    s += label(640, 140, "went RIGHT", [588, 180], { fill: RIGHT, size: 16, from: [640, 136] });
    s += note(30, 196, 172, 62, ["100 drives logged:", "50 went left, 50 went right", "none through the cart"], { rot: -3, size: 13 });
    return wrap("s0", "The town square from above: a courier robot waits at the depot at the bottom, the bakery is at the top, and a pretzel cart sits in the middle of the road. Two dashed routes, one blue going left around the cart and one orange going right, are the demonstrated drives. At a dispatch booth a person with a joystick and a stack of route sheets points the way.", s);
  };
  scenes.s1 = function () {
    var s = square();
    // routes, fading under fog from the left
    s += route(LROUTE, LEFT, { op: 0.9 }) + route(RROUTE, RIGHT, { op: 0.9 }) + cart(480, 236, 0.9);
    // a scatter of logged waypoints, some drifting
    var r = 11; for (var i = 0; i < 60; i++) { r = (r * 9301 + 49297) % 233280; var t = r / 233280; var side = i % 2 ? RROUTE : LROUTE, idx = 1 + Math.floor(t * 4); var px = side[idx][0], py = side[idx][1]; r = (r * 9301 + 49297) % 233280; var jx = (r / 233280 - 0.5) * (14 + i * 1.2); r = (r * 9301 + 49297) % 233280; var jy = (r / 233280 - 0.5) * (14 + i * 1.2); s += '<circle cx="' + (px + jx).toFixed(1) + '" cy="' + (py + jy).toFixed(1) + '" r="3.5" fill="' + (i % 2 ? RIGHT : LEFT) + '" stroke="' + L + '" stroke-width="1"/>'; }
    s += fog(250, 120, 220, { op: 0.95, dark: true }) + fog(240, 200, 260, { op: 0.9 }) + fog(300, 290, 240, { op: 0.85, dark: true }) + fog(470, 150, 160, { op: 0.6 }) + fog(520, 260, 140, { op: 0.45 });
    // the fog schedule: a dial on the weather station
    s += '<rect x="760" y="220" width="180" height="150" rx="6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.5"/><rect x="760" y="220" width="180" height="24" fill="' + SKY + '" stroke="' + L + '" stroke-width="2.5"/>' + txt(850, 238, "FOG SCHEDULE", { size: 15, anchor: "middle", sign: true });
    s += '<circle cx="850" cy="305" r="42" fill="' + PAPER + '" stroke="' + L + '" stroke-width="2.5"/><path d="M850 305 L822 282" stroke="' + L + '" stroke-width="4" stroke-linecap="round"/><circle cx="850" cy="305" r="5" fill="' + L + '"/>';
    s += txt(812, 356, "linear", { size: 13 }) + txt(858, 356, "cosine", { size: 13 }) + txt(818, 272, "fast", { size: 12 }) + txt(866, 272, "slow", { size: 12 });
    s += '<path d="M780 262 q30 -30 60 0 q30 30 60 0" fill="none" stroke="' + STEEL + '" stroke-width="2"/>';
    s += board(290, 8, 380, "FOG ROLLS IN");
    s += label(24, 200, "fog = noise: it erases which", null, { size: 14 });
    s += label(24, 218, "route a dot came from", null, { size: 14 });
    s += label(24, 236, "t = fog time, 0 to 999", null, { size: 14 });
    s += label(742, 204, "the schedule = how fast it thickens", [850, 224], { size: 14, from: [850, 208] });
    s += label(24, 366, "a dot = one logged position", [300, 300], { size: 14, from: [196, 362] });
    s += label(24, 384, "from one drive", null, { size: 14 });
    return wrap("s1", "Fog rolls across the square from the left. The logged route positions, blue for left and orange for right, blur and drift under the fog until the two colours mix. A weather-station dial labelled fog schedule shows two settings, linear and cosine.", s);
  };
  scenes.s2 = function () {
    var s = '<rect x="0" y="300" width="960" height="100" fill="' + COBBLE + '" stroke="' + L + '" stroke-width="2"/>';
    s += '<rect x="0" y="0" width="960" height="300" fill="' + PAPER + '"/><path d="M0 300 H960" stroke="' + L + '" stroke-width="2.5"/>';
    s += '<rect x="20" y="30" width="300" height="250" rx="4" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.5"/>';   // window onto the foggy square
    s += cobbles(24, 34, 292, 242, 5) + '<rect x="150" y="34" width="40" height="242" fill="' + SAND + '"/>' + cart(170, 170, 0.5) + fog(40, 90, 250, { op: 0.9, dark: true }) + fog(60, 200, 240, { op: 0.85 });
    s += table(560, 250, 420);
    // the cartographer at the drafting table, with the foggy sheet in and the clean guess out
    s += person(560, 300, { shirt: GRASS, apron: true, hat: "visor", skin: SKIN2 });
    s += mapSheet(380, 160, 110, 84, { fog: 0.75, noise: 1 }) + mapSheet(640, 160, 110, 84, { solid: true, w: 3 });
    s += '<path d="M498 200 h30 m-6 -6 l6 6 l-6 6" fill="none" stroke="' + L + '" stroke-width="2.5"/><path d="M604 200 h30 m-6 -6 l6 6 l-6 6" fill="none" stroke="' + L + '" stroke-width="2.5"/>';
    s += '<circle cx="548" cy="214" r="12" fill="' + SKY + '" stroke="' + L + '" stroke-width="2.5"/><path d="M557 223 l14 14" stroke="' + L + '" stroke-width="5" stroke-linecap="round"/>';   // magnifier
    // the inset: from pure fog, the average
    s += '<rect x="780" y="40" width="160" height="150" rx="6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.5"/>' + txt(860, 62, "from pure fog", { size: 14, anchor: "middle" });
    s += mapSheet(800, 72, 120, 90, { straight: true, left: false, right: false });
    s += mapSheet(800, 72, 120, 90, { fog: 0, w: 2, leftCol: STEEL, rightCol: STEEL }).replace(/<rect[^>]*fill="#FFFDF6"[^>]*\/>/, "");
    s += txt(860, 182, "the average: straight through", { size: 12.5, anchor: "middle", fill: BAD });
    s += board(300, 8, 360, "THE CARTOGRAPHER", GRASS);
    s += label(330, 140, "a foggy route sheet (x_t)", [435, 160], { size: 14, from: [400, 140] });
    s += label(640, 140, "the best guess of the clean sheet (x̂₀)", [695, 160], { size: 14, from: [700, 140] });
    s += label(560, 60, "the cartographer = the denoiser network", [560, 236], { anchor: "middle", from: [560, 64] });
    s += label(40, 340, "she is trained on every fog level", null, { size: 15 });
    s += label(40, 364, "scored by squared error against the true sheet (MSE)", null, { size: 15 });
    s += label(590, 340, "given pure fog, the least-wrong single guess", null, { size: 15 });
    s += label(590, 364, "is the average of every route: straight through the cart", null, { size: 15, fill: BAD });
    return wrap("s2", "A cartographer with a visor and a magnifier sits at a drafting table. On her left is a fogged, speckled route sheet; on her right the clean sheet she reconstructs, with both routes around the cart drawn solid. An inset shows what she draws from pure fog: a single straight line through the cart, labelled the average.", s);
  };
  scenes.s3 = function () {
    var s = '<rect x="0" y="330" width="960" height="70" fill="' + COBBLE + '" stroke="' + L + '" stroke-width="2"/>';
    var fogs = [1, 0.75, 0.5, 0.25, 0];
    fogs.forEach(function (fv, i) {
      var x = 30 + i * 184;
      s += mapSheet(x, 90, 150, 150, { fog: fv, noise: fv, w: 3, solid: i === 4, leftCol: i < 2 ? STEEL : LEFT, rightCol: i < 2 ? STEEL : RIGHT, straight: i === 0 });
      s += txt(x + 75, 262, "pass " + (i + 1) + (i === 0 ? ": a smudge" : i === 4 ? ": committed" : ""), { size: 14, anchor: "middle" });
      if (i < 4) s += '<path d="M' + (x + 156) + " 165 h20 m-6 -6 l6 6 l-6 6\" fill=\"none\" stroke=\"" + L + '" stroke-width="2.5"/>';
    });
    s += person(42, 330, { shirt: GRASS, apron: true, hat: "visor", skin: SKIN2, pointing: true }) + courier(905, 330, 0.8, { flip: true });
    s += board(270, 8, 420, "FOG LIFTS IN PASSES", GRASS);
    s += label(200, 300, "each pass: guess the clean sheet, then lift only part of the fog", null, { size: 15 });
    s += label(200, 322, "the next guess starts from a sheet that already leans one way", null, { size: 15 });
    s += label(560, 300, "after a few passes the sheet has picked a side", null, { size: 15 });
    s += label(560, 322, "the courier gets a real route, never the smudge", null, { size: 15 });
    s += label(30, 74, "the same sheet, five passes", null, { size: 15 });
    return wrap("s3", "Five route sheets in a row, from fully fogged on the left to clear on the right. The first sheet shows only a straight smudge through the cart; by the third a faint fork appears; the last shows one clean route around the cart. The cartographer points along the row and the courier waits at the far end.", s);
  };
  scenes.s4 = function () {
    var s = '<rect x="0" y="330" width="960" height="70" fill="' + COBBLE + '" stroke="' + L + '" stroke-width="2"/>';
    // the clock tower
    s += '<rect x="60" y="70" width="90" height="260" fill="' + SAND + '" stroke="' + L + '" stroke-width="2.5"/><path d="M52 70 l53 -40 l53 40 z" fill="' + BRICK + '" stroke="' + L + '" stroke-width="2.5"/>';
    s += '<circle cx="105" cy="150" r="34" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.5"/><path d="M105 150 V122 M105 150 L124 160" stroke="' + L + '" stroke-width="3" stroke-linecap="round"/><circle cx="105" cy="150" r="3" fill="' + L + '"/>';
    s += '<rect x="76" y="250" width="58" height="22" rx="3" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.5"/>' + txt(105, 266, "10 per second", { size: 11, anchor: "middle" });
    // two cartographers: the fast desk and the slow desk
    s += table(400, 250, 220) + person(400, 300, { shirt: GRASS, apron: true, hat: "visor", skin: SKIN2 });
    s += sheetStack(310, 232, 3) + txt(332, 200, "10 passes", { size: 14, anchor: "middle", sign: true }) + txt(332, 218, "0.1 s", { size: 14, anchor: "middle", fill: "#3B7422" });
    s += table(740, 250, 260) + person(740, 300, { shirt: LILAC, apron: true, hat: "visor", skin: SKIN3, frown: true });
    var st = ""; for (var i = 0; i < 22; i++) st += '<rect x="' + (630 + (i % 3)) + '" y="' + (236 - i * 5) + '" width="52" height="8" rx="1" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1.2"/>';
    s += st + txt(656, 108, "1,000 passes", { size: 14, anchor: "middle", sign: true }) + txt(656, 126, "10 s", { size: 14, anchor: "middle", fill: BAD });
    // the courier waiting with a stopwatch
    s += courier(560, 330, 0.85, { flip: true }) + '<circle cx="600" cy="262" r="16" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.5"/><path d="M600 262 V250 M600 244 v-4 M596 240 h8" stroke="' + L + '" stroke-width="2.5" stroke-linecap="round"/>';
    s += board(270, 8, 420, "HOW MANY PASSES CAN YOU AFFORD", YEL);
    s += label(180, 84, "the control loop: a new card 10 times a second", [140, 150], { size: 15, from: [180, 80] });
    s += label(420, 190, "the courier waits for the card", [560, 300], { size: 14, from: [520, 186] });
    s += label(200, 360, "fast desk: 10 DDIM passes, 10 ms each, fits the budget", null, { size: 15 });
    s += label(200, 384, "slow desk: 1,000 passes, the square has changed by the time the card is ready", null, { size: 15 });
    return wrap("s4", "A clock tower with a sign reading ten per second. Two cartographers at two desks: at the fast desk a short stack of ten route sheets labelled 0.1 seconds; at the slow desk a tall stack of one thousand, labelled 10 seconds, with a frowning cartographer. The courier waits between them holding a stopwatch.", s);
  };
  scenes.s5 = function () {
    var s = square();
    // the cart has been pushed to the right; the vendor is pushing it
    s += route([[480, 352], [400, 300], [352, 220], [352, 180], [400, 100], [480, 42]], LEFT) + route([[480, 352], [590, 300], [660, 220], [660, 180], [590, 100], [480, 42]], RIGHT);
    s += '<rect x="444" y="176" width="72" height="66" rx="4" fill="none" stroke="' + STEEL + '" stroke-width="2.5" stroke-dasharray="6 5"/>' + txt(480, 258, "was here", { size: 12, anchor: "middle", fill: "#6E5040" });
    s += cart(540, 236, 0.9) + person(596, 240, { shirt: BRICK, hat: "chef", apron: true, armsUp: true, skin: SKIN3 });
    s += '<path d="M572 210 h-18 m6 -5 l-6 5 l6 5" fill="none" stroke="' + L + '" stroke-width="2.5"/>';
    s += tower(860, 330) + person(860, 208, { shirt: YEL, hat: "cap", hatCol: GRASS }) + spyglass(866, 160, -20);
    // the report card riding a pulley line down to the cartographer's desk
    s += '<path d="M830 200 L700 380" stroke="' + L + '" stroke-width="1.5" stroke-dasharray="4 4"/>';
    s += note(736, 262, 96, 44, ["REPORT", "cart at +0.7"], { rot: -18, tape: true, size: 13, head: true });
    s += courier(480, 352, 0.8);
    s += board(290, 8, 380, "THE LOOKOUT", SKY);
    s += label(742, 356, "the lookout = the camera", [880, 336], { size: 14, from: [900, 352] });
    s += label(742, 374, "the report = the observation", null, { size: 14 });
    s += label(742, 392, "the denoiser is conditioned on", null, { size: 14 });
    s += label(240, 300, "the vendor moved the cart", [452, 246], { anchor: "start", from: [410, 296] });
    s += label(24, 192, "with the report, she draws", null, { size: 14 });
    s += label(24, 210, "routes around TODAY's cart", null, { size: 14 });
    s += label(24, 366, "blindfolded, she draws them", null, { size: 14, fill: BAD });
    s += label(24, 384, "around where it USED to be", null, { size: 14, fill: BAD });
    return wrap("s5", "The square again, but a vendor in a chef's hat has pushed the pretzel cart to the right; a dashed outline marks where it used to stand. A lookout in a tower at the right edge aims a spyglass at the cart, and a report card reading cart at plus 0.7 slides down a line toward the cartographer.", s);
  };
  scenes.s6 = function () {
    var s = square();
    s += cart(500, 236, 0.9);
    // the courier mid-drive on the left route, with the card of 16 pins ahead: first 8 lit
    var pts = [[430, 300], [412, 284], [396, 268], [384, 250], [376, 232], [372, 214], [372, 196], [374, 178], [380, 160], [390, 142], [404, 124], [420, 108], [438, 92], [456, 76], [470, 60], [480, 44]];
    s += route([[480, 352]].concat(pts), LEFT, { op: 0.6 });
    pts.forEach(function (p, i) { s += pin(p[0], p[1], i < 8 ? YEL : SHEET); });
    s += courier(452, 322, 0.75, { flip: true });
    s += tower(860, 330) + person(860, 208, { shirt: YEL, hat: "cap", hatCol: GRASS, armsUp: true });
    s += person(556, 240, { shirt: BRICK, hat: "chef", apron: true, armsUp: true, skin: SKIN3 });
    s += '<path d="M540 210 h-14 m6 -5 l-6 5 l6 5" fill="none" stroke="' + L + '" stroke-width="2.5"/>';
    // the waypoint card in hand
    s += note(40, 200, 170, 120, ["WAYPOINT CARD", "16 pins ahead", "drive the first 8", "then look again"], { rot: -4, tape: true, head: true, size: 14 });
    var cp = ""; for (var i = 0; i < 16; i++) cp += pin(56 + i * 9.6, 296 - Math.sin(i / 15 * Math.PI) * 14, i < 8 ? YEL : SHEET);
    s += '<g transform="rotate(-4 125 260)">' + cp + "</g>";
    // a replan flag
    s += '<path d="M372 196 v-40" stroke="' + L + '" stroke-width="2"/><path d="M372 156 h34 l-8 8 l8 8 h-34 z" fill="' + BRICK + '" stroke="' + L + '" stroke-width="1.5"/>' + txt(374, 168, "look", { size: 10, fill: PAPER });
    s += board(270, 8, 420, "PIN 16 · DRIVE 8 · LOOK AGAIN", LEFT);
    s += label(236, 340, "the card = one action chunk", [440, 322], { size: 14, from: [409, 336] });
    s += label(236, 358, "(16 waypoints)", null, { size: 14 });
    s += label(620, 300, "the vendor is still pushing", [556, 232], { anchor: "start", from: [640, 296] });
    s += label(742, 356, "the lookout keeps reporting:", [880, 336], { size: 14, from: [900, 352] });
    s += label(742, 374, "every 8 pins, a fresh report", null, { size: 14 });
    s += label(742, 392, "and a fresh card", null, { size: 14 });
    s += label(240, 60, "yellow pins: driven now", [396, 268], { anchor: "start", from: [330, 64] });
    s += label(240, 84, "white pins: planned, then dropped", [438, 92], { anchor: "start", from: [420, 88] });
    return wrap("s6", "The courier is mid-way around the left of the cart, following a card of sixteen pins: the first eight are yellow and the rest white, with a small flag reading look at the eighth. The vendor is still pushing the cart; the lookout in the tower waves a fresh report. A waypoint card in the corner reads: 16 pins ahead, drive the first 8, then look again.", s);
  };
  scenes.cap = function () {
    var s = '<rect x="-5" y="268" width="970" height="100" fill="' + LILAC + '"/><rect x="-5" y="263" width="970" height="7" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2"/><rect x="-5" y="364" width="970" height="40" fill="' + WOOD + '" stroke="' + L + '" stroke-width="3"/>';
    s += '<rect x="34" y="48" width="892" height="180" rx="6" fill="' + WOOD + '" stroke="' + L + '" stroke-width="2.5"/><rect x="44" y="58" width="872" height="160" fill="' + SAND + '" stroke="' + L + '" stroke-width="1.5"/>';
    function folder(x, title, sub, stamp, art) {
      var f = '<rect x="' + x + '" y="68" width="268" height="144" rx="4" fill="' + NOTE + '" stroke="' + L + '" stroke-width="2.2"/><circle cx="' + (x + 134) + '" cy="71" r="5" fill="' + BRICK + '" stroke="' + L + '" stroke-width="1.8"/>';
      f += txt(x + 14, 88, title, { size: 15, sign: true }) + '<rect x="' + (x + 12) + '" y="96" width="244" height="76" fill="#D8ECF7" stroke="' + L + '" stroke-width="2"/>' + art(x + 12, 96);
      f += txt(x + 14, 197, sub, { size: 14 });
      f += '<g transform="rotate(-7 ' + (x + 212) + ' 190)"><rect x="' + (x + 160) + '" y="178" width="104" height="24" rx="3" fill="' + NOTE + '" stroke="' + BAD + '" stroke-width="2"/><rect x="' + (x + 163) + '" y="181" width="98" height="18" rx="2" fill="none" stroke="' + BAD + '" stroke-width="1"/>' + txt(x + 212, 195, stamp, { size: 14, sign: true, fill: BAD, anchor: "middle" }) + "</g>";
      return f;
    }
    s += folder(58, "CASE 1 · the straight-liner", "dented every drive", "DENTED", function (x, y) {
      return cart(x + 150, y + 74, 0.5, { dented: true }) + courier(x + 92, y + 74, 0.45, { dizzy: true }) + '<path d="M' + (x + 20) + " " + (y + 74) + " H" + (x + 70) + '" stroke="' + BAD + '" stroke-width="3" stroke-dasharray="6 4"/>' + txt(x + 44, y + 66, "the average", { size: 11, fill: BAD, anchor: "middle" });
    });
    s += folder(346, "CASE 2 · the ditherer", "zigzagged at the fork", "STALLED", function (x, y) {
      return cart(x + 190, y + 74, 0.5) + courier(x + 60, y + 74, 0.45, { dizzy: true }) + '<path d="M' + (x + 80) + " " + (y + 60) + " l12 10 l-10 10 l14 8 l-8 -14 l16 4 l-10 -12 l14 6\" fill=\"none\" stroke=\"" + L + '" stroke-width="2"/>';
    });
    s += folder(634, "CASE 3 · the slowpoke", "10 s late, cart gone", "LATE", function (x, y) {
      var st = ""; for (var i = 0; i < 12; i++) st += '<rect x="' + (x + 20 + (i % 2)) + '" y="' + (y + 66 - i * 4) + '" width="30" height="6" rx="1" fill="' + SHEET + '" stroke="' + L + '" stroke-width="1"/>';
      return st + courier(x + 100, y + 74, 0.45, { asleep: true }) + cart(x + 190, y + 74, 0.5) + '<circle cx="' + (x + 160) + '" cy="' + (y + 24) + '" r="12" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/><path d="M' + (x + 160) + " " + (y + 24) + " v-8 M" + (x + 160) + " " + (y + 24) + " l6 4\" stroke=\"" + L + '" stroke-width="2"/>';
    });
    // the review desk: the dispatcher and the cartographer with a chart
    s += person(280, 340, { shirt: BRICK, hat: "cap", hatCol: LEFT, skin: SKIN }) + person(680, 340, { shirt: GRASS, apron: true, hat: "visor", skin: SKIN2, frown: true });
    s += '<rect x="356" y="248" width="150" height="72" rx="2" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2.2"/><path d="M370 270 V306 H494" fill="none" stroke="' + L + '" stroke-width="1.8"/><path d="M374 300 L400 298 L420 290 L444 282 L466 262 L490 258" fill="none" stroke="' + BAD + '" stroke-width="3"/>' + txt(431, 266, "dents this week", { size: 13, anchor: "middle" });
    s += '<rect x="150" y="318" width="660" height="10" fill="' + WOOD + '"/><rect x="160" y="328" width="640" height="36" fill="' + BRICK + '"/>' + txt(480, 352, "diagnose · fix the dispatch rule · re-drive", { size: 18, sign: true, fill: PAPER, anchor: "middle" });
    s += board(290, 6, 380, "DISPATCH REVIEW BOARD");
    s += '<rect x="16" y="246" width="160" height="60" rx="6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/>' + txt(26, 264, "the dispatcher", { size: 16 }) + txt(26, 282, "watches the drive,", { size: 14 }) + txt(26, 298, "not just the dent count", { size: 14 });
    s += '<rect x="730" y="246" width="200" height="60" rx="6" fill="' + SHEET + '" stroke="' + L + '" stroke-width="2"/>' + txt(740, 264, "the cartographer", { size: 16 }) + txt(740, 282, "asks which rule", { size: 14 }) + txt(740, 298, "produced the route", { size: 14 });
    return wrap("cap", "A cork board pins three incident folders: the straight-liner, a courier dented against the cart after following a dashed straight line labelled the average; the ditherer, a courier with zigzag tracks stalled before the cart; and the slowpoke, a courier asleep beside a tall stack of route sheets while the cart rolls away. Below, the dispatcher and the cartographer study a chart of dents this week under a sign reading diagnose, fix the dispatch rule, re-drive.", s);
  };

  /* ---------- icons: 24×24, flat fills, 1.8px line ---------- */
  var st = ' fill="none" stroke="' + L + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
  function ic(inner) { return '<svg viewBox="0 0 24 24">' + inner + "</svg>"; }
  var icons = {
    square: ic('<rect x="3" y="3" width="18" height="18" rx="2" fill="' + COBBLE + '"' + st + '/><rect x="9.5" y="3" width="5" height="18" fill="' + SAND + '"' + st + '/><rect x="8" y="9" width="8" height="6" fill="' + WOOD + '"' + st + '/>'),
    fog: ic('<path d="M6 16 a4 4 0 0 1 1-7.8 a5 5 0 0 1 9.5 1 a3.5 3.5 0 0 1 .5 6.8 z" fill="' + FOG + '"' + st + '/>'),
    map: ic('<rect x="3" y="4" width="18" height="16" rx="2" fill="' + SHEET + '"' + st + '/><path d="M12 19 q-6 -4 0 -7 q6 -3 0 -7" ' + st + ' stroke="' + LEFT + '"/><circle cx="16" cy="10" r="3.5" fill="' + SKY + '"' + st + '/>'),
    passes: ic('<rect x="3" y="15" width="6" height="6" fill="' + FOG2 + '"' + st + '/><rect x="9" y="10" width="6" height="11" fill="' + FOG + '"' + st + '/><rect x="15" y="4" width="6" height="17" fill="' + SHEET + '"' + st + '/>'),
    watch: ic('<circle cx="12" cy="13.5" r="8" fill="' + SHEET + '"' + st + '/><path d="M12 13.5 V8 M12 5.5 V3 M9.5 3 h5" ' + st + "/>"),
    spyglass: ic('<rect x="3" y="10" width="12" height="5" rx="1.5" fill="' + WOOD + '"' + st + ' transform="rotate(-25 12 12)"/><rect x="14" y="8" width="7" height="8" rx="1.5" fill="' + STEEL + '"' + st + ' transform="rotate(-25 12 12)"/>'),
    card: ic('<rect x="3" y="5" width="18" height="14" rx="2" fill="' + NOTE + '"' + st + '/><circle cx="7" cy="12" r="1.8" fill="' + YEL + '"' + st + '/><circle cx="12" cy="12" r="1.8" fill="' + YEL + '"' + st + '/><circle cx="17" cy="12" r="1.8" fill="' + SHEET + '"' + st + '/>'),
    star: ic('<path d="M12 3 l2.7 6 6.3.6 -4.8 4.3 1.4 6.2 -5.6 -3.3 -5.6 3.3 1.4 -6.2 -4.8 -4.3 6.3 -.6z" fill="' + YEL + '"' + st + "/>"),
    pencil: ic('<path d="M4 20 l2 -6 10 -10 4 4 -10 10 z" fill="' + YEL + '"' + st + '/><path d="M14 6 l4 4" ' + st + "/>"),
    courier: ic('<rect x="3" y="10" width="18" height="8" rx="3" fill="' + STEEL + '"' + st + '/><rect x="6" y="5" width="8" height="5" fill="' + WOOD + '"' + st + '/><circle cx="7.5" cy="19" r="2.5" fill="' + L + '"/><circle cx="16.5" cy="19" r="2.5" fill="' + L + '"/><rect x="15" y="6" width="5" height="4" rx="1" fill="' + SHEET + '"' + st + "/>"),
    sheet: ic('<rect x="5" y="3" width="14" height="18" rx="2" fill="' + SHEET + '"' + st + '/><path d="M12 19 q-5 -4 0 -7 q5 -3 0 -7" ' + st + ' stroke="' + RIGHT + '"/>'),
    cart: ic('<rect x="5" y="9" width="14" height="7" fill="' + WOOD + '"' + st + '/><path d="M3 6 h18 l-2 3 h-14 z" fill="' + BRICK + '"' + st + '/><circle cx="8" cy="19" r="2.3" fill="' + SAND + '"' + st + '/><circle cx="16" cy="19" r="2.3" fill="' + SAND + '"' + st + "/>"),
    clerk: ic('<circle cx="12" cy="7" r="3.5" fill="' + SKIN + '"' + st + '/><rect x="6" y="11" width="12" height="9" rx="3" fill="' + LILAC + '"' + st + '/><path d="M8 15 h8" ' + st + ' stroke="' + BAD + '"/>'),
    tower: ic('<rect x="9" y="9" width="6" height="12" fill="' + WOOD + '"' + st + '/><rect x="6" y="6" width="12" height="4" fill="' + SAND + '"' + st + '/><path d="M5 6 l7 -4 7 4z" fill="' + BRICK + '"' + st + "/>"),
    carto: ic('<circle cx="12" cy="7" r="3.5" fill="' + SKIN2 + '"' + st + '/><rect x="6" y="11" width="12" height="9" rx="3" fill="' + GRASS + '"' + st + '/><path d="M8 4 h8" ' + st + "/>"),
    pin: ic('<circle cx="12" cy="9" r="5" fill="' + YEL + '"' + st + '/><path d="M12 14 v7" ' + st + "/>"),
    joystick: ic('<rect x="3" y="15" width="18" height="6" rx="2" fill="' + STEEL + '"' + st + '/><path d="M12 15 l2 -8" ' + st + '/><circle cx="14.5" cy="5.5" r="2.8" fill="' + BRICK + '"' + st + '/><circle cx="7" cy="18" r="1.3" fill="' + YEL + '"' + st + "/>")
  };

  var out = {};
  Object.keys(scenes).forEach(function (k) { out[k] = scenes[k](); });
  root.FR_ART = out; root.FR_ICONS = icons;
})(typeof window !== "undefined" ? window : this);
