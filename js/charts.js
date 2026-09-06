/* ============================================================
   charts.js — dependency-free SVG charting for the plugin.
   Two charts:
   1) renderHourly  — 48 h "heat" temperature columns with optional
      overlay series (rain probability / wind / humidity / UV)
      and a rich hover tooltip.
   2) renderTrend   — temperature-range band for the selected
      number of days.
   Charts re-render whenever the container resizes.
   ============================================================ */
(function () {
  'use strict';

  const U = window.Utils;

  /* ---- tiny color helpers ---- */
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(c1, c2, t) {
    const a = hex(c1), b = hex(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  const COLD = '#59c4ff', MID = '#ffd05e', HOT = '#ff7a59';
  function heatColor(n) { // n in 0..1
    n = Math.max(0, Math.min(1, n));
    return n < 0.5 ? mix(COLD, MID, n * 2) : mix(MID, HOT, (n - 0.5) * 2);
  }

  function avg(v) { return v == null ? 0 : v; }

  /* =====================================================
     HOURLY CHART
     data: array of hourly rows (t, temp, feels, pop, code, …)
     ===================================================== */
  function renderHourly(svg, data, cfg) {
    const rect = svg.parentNode.getBoundingClientRect();
    const W = Math.max(320, rect.width);
    const H = cfg.height || 260;
    const padL = 46, padR = 14, padT = 18;

    const n = data.length;
    const unit = cfg.unit === 'c' ? '°C' : '°F';
    const overlay = cfg.overlay;                 // null | key

    const temps = data.map(d => avg(d.temp));
    let tMin = Math.min.apply(null, temps), tMax = Math.max.apply(null, temps);
    if (tMin === tMax) { tMin -= 2; tMax += 2; }
    const pad = Math.max(2, (tMax - tMin) * 0.15);
    tMin -= pad; tMax += pad;

    /* layout */
    const panelBot = overlay ? H * 0.60 : H - 34;
    const panelTop = padT + 8;
    const labelH = 26;                          // bottom time labels
    const slotW = (W - padL - padR) / n;
    const barW = Math.max(2.5, Math.min(22, slotW * 0.62));

    const yT = function (v) {
      return panelBot - (v - tMin) / (tMax - tMin) * (panelBot - panelTop);
    };

    /* grid + y axis */
    let grid = '';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = tMin + (tMax - tMin) * i / steps;
      const y = yT(v);
      grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y +
        '" stroke="rgba(255,255,255,.14)" stroke-width="1" stroke-dasharray="' + (i === 0 || i === steps ? '0' : '2 5') + '"/>';
      if (v <= 0 && tMax > 0) continue;
      grid += '<text x="' + (padL - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="10" fill="rgba(255,255,255,.75)" font-weight="600">' +
        Math.round(v) + '°</text>';
    }
    /* zero line emphasis */
    if (tMin < 0 && tMax > 0) {
      const y0 = yT(0);
      grid += '<line x1="' + padL + '" y1="' + y0 + '" x2="' + (W - padR) + '" y2="' + y0 +
        '" stroke="rgba(255,255,255,.42)" stroke-width="1"/>';
    }

    /* overlay panel (bottom band) */
    let overlayMarkup = '';
    let overlayInfo = null;
    if (overlay) {
      const series = data.map(d => avg(d[overlay]));
      let oMin = Math.min.apply(null, series), oMax = Math.max.apply(null, series);
      if (oMin === oMax) { oMax += 1; }
      const oPad = (oMax - oMin) * 0.12;
      oMin -= oPad; oMax += oPad;
      const oTop = panelBot + 22, oBot = H - labelH - 4;
      const yO = function (v) { return oBot - (v - oMin) / (oMax - oMin) * (oBot - oTop); };

      const key = overlay;
      const meta = key === 'precip' ? { col: '#7fd0ff', label: 'rain probability', unit: '%' }
        : key === 'wind' ? { col: '#d9c2ff', label: 'wind', unit: cfg.windUnit || ' km/h' }
          : key === 'hum' ? { col: '#8be5b4', label: 'humidity', unit: '%' }
            : { col: '#ffd76a', label: 'UV index', unit: '' };

      /* area path */
      const xC = i => padL + i * slotW + slotW / 2;
      let d = 'M' + xC(0) + ' ' + yO(series[0]);
      for (let i = 1; i < n; i++) d += ' L' + xC(i) + ' ' + yO(series[i]);
      const close = ' L' + xC(n - 1) + ' ' + oBot + ' L' + xC(0) + ' ' + oBot + ' Z';
      overlayMarkup += '<path d="' + d + close + '" fill="' + meta.col + '" opacity="0.16"/>' +
        '<path d="' + d + '" fill="none" stroke="' + meta.col + '" stroke-width="2" stroke-linejoin="round"/>';
      /* overlay axis: min/max labels */
      overlayMarkup += '<text x="' + (padL - 8) + '" y="' + (oBot + 3.5) + '" text-anchor="end" font-size="9.5" fill="' + meta.col + '" font-weight="700">' + Math.round(oMin) + '</text>' +
        '<text x="' + (padL - 8) + '" y="' + (oTop + 3.5) + '" text-anchor="end" font-size="9.5" fill="' + meta.col + '" font-weight="700">' + Math.round(oMax) + '</text>' +
        '<text x="' + padL + '" y="' + (oTop - 7) + '" font-size="10" fill="rgba(255,255,255,.8)" font-weight="700">' + meta.label + '</text>';
      overlayInfo = { meta, series, yO, oTop, oBot };
      grid += '<line x1="' + padL + '" y1="' + (oTop - 14) + '" x2="' + (W - padR) + '" y2="' + (oTop - 14) + '" stroke="rgba(255,255,255,.1)"/>';
    }

    /* heat columns */
    let bars = '';
    let labelTxt = '';
    const nowWall = data[0] && data[0].t ? U.wallStamp(data[0].t) : null;
    const yZero = yT(0);
    for (let i = 0; i < n; i++) {
      const x = padL + i * slotW + slotW / 2;
      const v = avg(temps[i]);
      const n01 = (v - tMin) / (tMax - tMin);
      const col = heatColor(n01);
      const yTop = Math.min(yT(v), yZero);
      const yB = Math.min(Math.max(yT(v), yZero), panelBot);
      const hgt = Math.max(1.5, yB - yTop);
      const colW = barW;
      const rx = Math.min(4.5, colW / 2);
      bars += '<rect class="h-bar" x="' + (x - colW / 2) + '" y="' + yTop + '" width="' + colW + '" height="' + hgt + '" rx="' + rx + '" fill="' + col + '" opacity="' + (i === 0 ? 1 : 0.9) + '" stroke="' + (i === 0 ? 'rgba(255,255,255,.9)' : 'none') + '" stroke-width="1.2"/>';
      /* value tick for current hour */
      if (i === 0) {
        bars += '<text x="' + x + '" y="' + (yTop - 6) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">' + Math.round(v) + '°</text>';
      }
      /* sparse x labels */
      if (i % 3 === 0 || i === n - 1) {
        const lbl = i === 0 ? 'Now' : U.fmtH(U.wallStamp(data[i].t));
        labelTxt += '<text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.85)" font-weight="' + (i === 0 ? 800 : 600) + '">' + lbl + '</text>';
      }
      /* condition glyph dots row above overlay? keep clean */
      void nowWall;
    }

    /* hover layer */
    let tip = null;
    /* drop any tooltip left over from a previous render pass */
    const stale = svg.parentNode.querySelector('.chart-tip');
    if (stale) stale.remove();
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.innerHTML =
      '<g>' + grid + bars + overlayMarkup + labelTxt + '</g>' +
      '<line id="hv-line" x1="-99" y1="' + panelTop + '" x2="-99" y2="' + (H - labelH) + '" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-dasharray="3 4" opacity="0"/>' +
      '<rect id="hv-catch" x="' + padL + '" y="' + (panelTop - 8) + '" width="' + Math.max(0, W - padL - padR) + '" height="' + Math.max(0, panelBot - panelTop + 12) + '" fill="transparent"/>';

    const line = svg.querySelector('#hv-line');

    function tooltipHTML(i) {
      const d = data[i];
      if (!d) return '';
      const isDay = !!d.day;
      const st = U.wallStamp(d.t);
      const rows = [];
      rows.push('<b>' + (i === 0 ? 'Now' : U.fmtClock(st)) + '</b> ' +
        (U.isSameWallDay(nowWall, st) ? '' : '· ' + U.fmtDayName(st) + ' ' + U.fmtMonthDay(st)));
      rows.push('<span class="tt-cond">' + U.esc(U.condName(d.code)) + '</span>');
      rows.push('<div class="tt-temp">' + Math.round(avg(d.temp)) + '° <em>feels ' + Math.round(avg(d.feels)) + '°</em></div>');
      const cells = [];
      if (d.pop != null && d.pop > 0) cells.push(['💧', Math.round(d.pop) + '%']);
      if (d.wind != null) cells.push(['🌬', Math.round(d.wind) + ' ' + (cfg.windUnit || '')]);
      if (d.gust != null) cells.push(['gust', Math.round(d.gust) + ' ' + (cfg.windUnit || '')]);
      if (d.hum != null) cells.push(['💦', Math.round(d.hum) + '%']);
      if (d.uv != null && d.uv > 0) cells.push(['☀', d.uv.toFixed(1)]);
      if (d.cloud != null) cells.push(['☁', Math.round(d.cloud) + '%']);
      if (d.dew != null) cells.push(['dew', Math.round(d.dew) + '°']);
      if (cells.length) rows.push('<div class="tt-cells">' + cells.map(c => '<span>' + c[0] + ' ' + c[1] + '</span>').join('') + '</div>');
      rows.push('<span class="tt-wx">' + window.WX.weatherIcon(d.code, isDay) + '</span>');
      return rows.join('');
    }

    function placeTip(e, i) {
      const r = svg.getBoundingClientRect();
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'chart-tip';
        svg.parentNode.appendChild(tip);
      }
      const x = padL + i * slotW + slotW / 2;
      tip.innerHTML = tooltipHTML(i);
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      tip.style.display = 'block';
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let tx = px + 14;
      if (tx + tw > r.width - 4) tx = px - tw - 14;
      if (tx < 4) tx = 4;
      let ty = py - th - 10;
      if (ty < 4) ty = py + 16;
      tip.style.left = tx + 'px';
      tip.style.top = ty + 'px';
      line.setAttribute('x1', x); line.setAttribute('x2', x);
      line.setAttribute('opacity', '1');
    }

    svg.onmousemove = function (ev) {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      /* scale client px back into design coordinates (viewBox scaling) */
      const xd = (ev.clientX - r.left) / r.width * W;
      const yd = (ev.clientY - r.top) / r.height * H;
      if (yd < panelTop - 12) return;
      const i = Math.floor((xd - padL) / slotW);
      if (i < 0 || i >= n) return hideTip();
      placeTip(ev, i);
    };
    svg.onmouseleave = hideTip;
    function hideTip() {
      if (tip) tip.style.display = 'none';
      line.setAttribute('opacity', '0');
    }

    return {
      destroy() { svg.onmousemove = svg.onmouseleave = null; }
    };
  }

  /* =====================================================
     DAILY RANGE TREND
     data: daily rows, metric chosen units
     ===================================================== */
  function renderTrend(svg, data, cfg) {
    const rect = svg.parentNode.getBoundingClientRect();
    const W = Math.max(320, rect.width);
    const H = cfg.height || 150;
    const padL = 40, padR = 14, padT = 16, padB = 24;
    const n = data.length;

    const los = data.map(d => avg(d.tmin));
    const his = data.map(d => avg(d.tmax));
    let lo = Math.min.apply(null, los), hi = Math.max.apply(null, his);
    if (lo === hi) { lo -= 2; hi += 2; }
    const pad = Math.max(2, (hi - lo) * 0.18);
    lo -= pad; hi += pad;

    const iw = (W - padL - padR) / n;          // day width
    const xC = i => padL + i * iw + iw / 2;

    const y = function (v) { return padT + (hi - v) / (hi - lo) * (H - padT - padB); };

    let s = '';
    /* grid */
    for (let i = 0; i <= 4; i++) {
      const v = lo + (hi - lo) * i / 4;
      const yy = y(v);
      s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="rgba(255,255,255,.12)" stroke-dasharray="2 5"/>';
      s += '<text x="' + (padL - 7) + '" y="' + (yy + 3.5) + '" text-anchor="end" font-size="10" fill="rgba(255,255,255,.7)" font-weight="600">' + Math.round(v) + '°</text>';
    }

    /* band between min & max */
    let loP = '', hiP = '';
    for (let i = 0; i < n; i++) {
      loP += (i === 0 ? 'M' : 'L') + xC(i) + ' ' + y(los[i]);
      hiP += (i === 0 ? 'M' : 'L') + xC(i) + ' ' + y(his[i]);
    }
    const band = hiP + ' L' + xC(n - 1) + ' ' + y(los[n - 1]) +
      Array.from({ length: n - 1 }, (_, i) => ' L' + xC(n - 2 - i) + ' ' + y(los[n - 2 - i])).join('') + ' Z';
    s += '<path d="' + band + '" fill="url(#bandGrad)" opacity="0.55"/>' +
      '<defs><linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffd76a"/><stop offset="1" stop-color="#59c4ff"/>' +
      '</linearGradient></defs>' +
      '<path d="' + loP + '" fill="none" stroke="#9fd8ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + hiP + '" fill="none" stroke="#ffd76a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

    /* day dots + labels + hi/lo labels */
    for (let i = 0; i < n; i++) {
      const x = xC(i);
      s += '<circle cx="' + x + '" cy="' + y(his[i]) + '" r="3" fill="#ffd76a"/>' +
        '<circle cx="' + x + '" cy="' + y(los[i]) + '" r="3" fill="#9fd8ff"/>';
      const st = U.wallStamp(data[i].date);
      const dayName = i === 0 ? 'Today' : U.fmtDayName(st);
      s += '<text x="' + x + '" y="' + (H - 9) + '" text-anchor="middle" font-size="10.5" fill="rgba(255,255,255,.9)" font-weight="700">' + dayName + '</text>';
      s += '<text x="' + x + '" y="' + (y(his[i]) - 8) + '" text-anchor="middle" font-size="10" fill="#ffe3a3" font-weight="800">' + Math.round(his[i]) + '°</text>';
      s += '<text x="' + x + '" y="' + (y(los[i]) + 15) + '" text-anchor="middle" font-size="10" fill="#cfe9ff" font-weight="700">' + Math.round(los[i]) + '°</text>';
    }

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.innerHTML = s;
  }

  function legendHTML(overlay, windUnit) {
    const base = '<span><i style="background:#ffd05e"></i>high</span><span><i style="background:#59c4ff"></i>low</span>';
    if (!overlay) return base;
    const meta = overlay === 'precip' ? ['#7fd0ff', 'rain probability']
      : overlay === 'wind' ? ['#d9c2ff', 'wind ' + (windUnit || '')]
        : overlay === 'hum' ? ['#8be5b4', 'humidity']
          : ['#ffd76a', 'UV index'];
    return base + '<span><i style="background:' + meta[0] + '"></i>' + meta[1] + '</span>';
  }

  const Charts = { renderHourly, renderTrend, legendHTML, heatColor };
  window.Charts = Charts;
})();
