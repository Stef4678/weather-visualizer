/* ============================================================
   icons.js — hand-built, animated SVG weather icon engine.
   No external assets. Every icon is composed from small vector
   parts (sun, moon, clouds, rain, snow, lightning…) and CSS
   keyframes from styles.css do the animation.
   ============================================================ */
(function () {
  'use strict';

  const S = function (n) { return String(Math.round(n * 10) / 10); };

  /* ---------- cloud silhouette (fixed path in 120 box) ---------- */
  const CLOUD_D = 'M28 78C20 78 14 72 14 65C14 57 20 51 28 50C30 40 40 33 52 34C58 26 70 24 79 29C90 24 102 31 104 42C112 44 116 53 113 61C117 66 116 74 110 78Z';
  const cloudPath = function () {
    return '<path class="w-cld" d="' + CLOUD_D + '" fill="#ffffff"/>' +
      '<ellipse cx="68" cy="79" rx="45" ry="7" fill="#0b1830" opacity="0.07"/>';
  };
  function cloudGroup(dx, dy, scale, extra) {
    const tr = 'translate(' + dx + ' ' + dy + ')' + (scale && scale !== 1 ? ' scale(' + scale + ')' : '');
    return '<g class="w-drift" transform="' + tr + '">' + cloudPath() + (extra || '') + '</g>';
  }

  /* ---------- sun ---------- */
  function sunParts(cx, cy, r) {
    let rays = '';
    const r0 = r + 2, r1 = r * 1.62;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      rays += '<line x1="' + S(cx + Math.cos(a) * r0) + '" y1="' + S(cy + Math.sin(a) * r0) +
        '" x2="' + S(cx + Math.cos(a) * r1) + '" y2="' + S(cy + Math.sin(a) * r1) +
        '" stroke="#ffd05e" stroke-width="4.6" stroke-linecap="round"/>';
    }
    return '<g class="w-spin">' + rays + '</g>' +
      '<g class="w-sun">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 5) + '" fill="rgba(255,208,94,.25)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#ffd05e"/>' +
      '<circle cx="' + S(cx - r * 0.28) + '" cy="' + S(cy - r * 0.28) + '" r="' + S(r * 0.42) + '" fill="rgba(255,255,255,.65)"/>' +
      '</g>';
  }

  /* ---------- moon (parametric lit region) ---------- */
  const MOON_C = '#eef3fb';
  function moonDisc(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + MOON_C + '"/>' +
      '<circle cx="' + S(cx - r * 0.3) + '" cy="' + S(cy - r * 0.3) + '" r="' + S(r * 0.16) + '" fill="#b6c4da" opacity=".5"/>' +
      '<circle cx="' + S(cx + r * 0.35) + '" cy="' + S(cy + r * 0.05) + '" r="' + S(r * 0.1) + '" fill="#b6c4da" opacity=".5"/>' +
      '<circle cx="' + S(cx + r * 0.05) + '" cy="' + S(cy + r * 0.38) + '" r="' + S(r * 0.12) + '" fill="#b6c4da" opacity=".5"/>';
  }
  function litMoon(cx, cy, r, frac, waxing) {
    frac = Math.max(0, Math.min(1, frac));
    if (frac >= 0.985) return moonDisc(cx, cy, r);
    const a = r * (1 - 2 * frac);           // signed terminator half-axis
    const top = cy - r, bot = cy + r;
    let p = 'M' + cx + ' ' + top + ' A' + r + ' ' + r + ' 0 0 1 ' + cx + ' ' + bot;
    if (a >= 0) p += ' A' + S(a) + ' ' + r + ' 0 0 0 ' + cx + ' ' + top;
    else p += ' A' + S(-a) + ' ' + r + ' 0 0 1 ' + cx + ' ' + top;
    p += ' Z';
    let g = '<path d="' + p + '" fill="' + MOON_C + '"/>';
    if (frac > 0.4) g += '<circle cx="' + S(cx - r * 0.3) + '" cy="' + S(cy - r * 0.25) + '" r="' + S(r * 0.13) + '" fill="#b6c4da" opacity=".4"/>';
    if (!waxing) g = '<g transform="translate(' + (cx * 2) + ' 0) scale(-1 1)">' + g + '</g>';
    return g;
  }
  function star(x, y, r, delay) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ffffff" class="w-tw" style="animation-delay:' + delay + 's"/>';
  }

  /* ---------- droplets / snow ---------- */
  function droplets(xs, y0, len, heavy) {
    let s = '';
    xs.forEach(function (x, i) {
      const l = len + (heavy ? (i % 2) * 3 : 0);
      s += '<line class="w-drop" style="animation-delay:-' + (i * 0.27).toFixed(2) + 's" ' +
        'x1="' + x + '" y1="' + y0 + '" x2="' + S(x + 3) + '" y2="' + S(y0 + l) + '" ' +
        'stroke="#a9e0ff" stroke-width="' + (heavy ? 4 : 3.2) + '" stroke-linecap="round"/>';
    });
    return s;
  }
  function flake() {
    return '<circle r="2.1" fill="#ffffff"/>' +
      '<path d="M-5.5 0H5.5M0-5.5V5.5M-3.9-3.9L3.9 3.9M3.9-3.9L-3.9 3.9" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>';
  }
  function snowfall(xs, y0) {
    let s = '';
    xs.forEach(function (x, i) {
      s += '<g class="w-fall" style="animation-delay:-' + (i * 0.8).toFixed(2) + 's">' +
        '<g class="w-sway" style="animation-delay:-' + (i * 0.4).toFixed(2) + 's">' +
        '<g transform="translate(' + x + ' ' + y0 + ')">' + flake() + '</g></g></g>';
    });
    return s;
  }

  /* ---------- composer ---------- */
  const LS = [32, 50, 68, 88];                       // light precip columns
  const HV = [30, 44, 58, 72, 86, 99];               // heavy precip columns
  const SNL = [34, 52, 70, 88];                      // light snow
  const SNH = [28, 45, 62, 79, 96];                  // heavy snow

  function inner(code, isDay, phase) {
    const fam = window.Utils.codeFamily(code);
    const clouds = cloudGroup(-12, -2, 1);

    switch (fam) {
      case 'clear': {
        if (isDay) return sunParts(60, 60, 26);
        return litMoon(58, 56, 30, phase.frac, phase.waxing) +
          star(24, 26, 1.6, 0) + star(92, 20, 1.3, 1.1) + star(100, 52, 1.1, 2.2) +
          star(40, 14, 1.2, 1.7) + star(16, 60, 1.1, .6) + star(86, 90, 1.5, 2.8);
      }
      case 'partly': {
        const lum = isDay ? sunParts(38, 38, 21) : litMoon(34, 36, 19, phase.frac, phase.waxing) + star(96, 22, 1.3, .4) + star(14, 96, 1.1, 1.9);
        return lum + cloudGroup(-12, 18, 1);
      }
      case 'cloudy':
        return cloudGroup(-18, -22, .62, '') + cloudGroup(-12, 8, 1);
      case 'fog':
        return cloudGroup(-16, -20, .68, '') + cloudGroup(-6, -2, .92, '') +
          '<rect class="w-fogline" x="28" y="82" width="62" height="5" rx="2.5" fill="#ffffff"/>' +
          '<rect class="w-fogline" style="animation-delay:-1.6s" x="36" y="92" width="54" height="5" rx="2.5" fill="#ffffff" opacity=".92"/>' +
          '<rect class="w-fogline" style="animation-delay:-3.2s" x="24" y="102" width="70" height="5" rx="2.5" fill="#ffffff" opacity=".8"/>';
      case 'rain': {
        const heavy = window.Utils.rainHeaviness(code) === 'heavy';
        return cloudGroup(-12, -12, 1) + (heavy ? droplets(HV, 74, 16, true) : droplets(LS, 74, 13, false));
      }
      case 'snow': {
        const heavy = window.Utils.snowHeaviness(code) === 'heavy';
        return cloudGroup(-12, -12, 1) + (heavy ? snowfall(SNH, 76) : snowfall(SNL, 76));
      }
      case 'storm':
        return cloudGroup(-12, -14, 1) +
          '<g class="w-bolt"><path d="M64 74 L48 96 L58 96 L54 114 L76 90 L64 90 L71 74 Z" fill="#ffe066" style="filter:drop-shadow(0 2px 7px rgba(255,214,64,.85))"/></g>';
      default:
        return clouds;
    }
  }

  /* public: full weather icon svg markup */
  function weatherIcon(code, isDay) {
    const phase = window.Utils.moonPhase();
    return '<svg class="wx' + (isDay ? '' : ' wx-n') + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      inner(code, isDay, phase) + '</svg>';
  }

  /* public: big standalone moon-phase glyph (astro card) */
  function moonPhaseGlyph(phase) {
    const frac = phase.frac;
    let body;
    if (frac >= 0.985) body = moonDisc(60, 60, 46);
    else {
      const a = 46 * (1 - 2 * frac);
      const top = 14, bot = 106;
      let p = 'M60 14 A46 46 0 0 1 60 106';
      if (a >= 0) p += ' A' + S(a) + ' 46 0 0 0 60 14';
      else p += ' A' + S(-a) + ' 46 0 0 1 60 14';
      p += ' Z';
      body = '<path d="' + p + '" fill="' + MOON_C + '"/>';
      if (frac > 0.4) body += '<circle cx="42" cy="44" r="7" fill="#b6c4da" opacity=".45"/>' +
        '<circle cx="72" cy="64" r="5" fill="#b6c4da" opacity=".4"/>';
      if (!phase.waxing) body = '<g transform="translate(120 0) scale(-1 1)">' + body + '</g>';
    }
    return '<svg class="wx" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>';
  }

  window.WX = { weatherIcon, moonPhaseGlyph };
})();
