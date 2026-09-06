/* ============================================================
   wallpaper.js — paints a 1600×900 "weather poster" on a canvas
   and exports it: browser download, or straight into the Eagle
   library via eagle.item.addFromBase64 when running inside Eagle.
   ============================================================ */
(function () {
  'use strict';
  const U = window.Utils;

  /* palette mirrors styles.css themes: top / mid / bottom / accent */
  const PAL = {
    'clear-day': ['#0f6fe0', '#3aa7ff', '#8ed4ff', '#ffd76a'],
    'clear-night': ['#070b26', '#131b4e', '#31408f', '#e7ecff'],
    'partly-day': ['#1d63c9', '#5b9fe8', '#bfdcf8', '#ffd76a'],
    'partly-night': ['#0c1236', '#232f6b', '#55659f', '#e7ecff'],
    'cloudy-day': ['#5a6f8c', '#8da1b6', '#c3cfda', '#f4f8fb'],
    'cloudy-night': ['#0d1320', '#212c42', '#46536b', '#cfdcef'],
    'fog-day': ['#6f8092', '#a3b0bc', '#d9dfe5', '#f4f8fb'],
    'fog-night': ['#1a2028', '#2d3742', '#566270', '#cfdcef'],
    'rain-day': ['#33485f', '#54708c', '#8ba9bf', '#a9e0ff'],
    'rain-night': ['#0a1422', '#16293f', '#3a5577', '#7db8e8'],
    'snow-day': ['#5e84b0', '#9fc0e0', '#e4f0fa', '#ffffff'],
    'snow-night': ['#1b2742', '#37486b', '#6b7f9f', '#ffffff'],
    'storm-day': ['#232b40', '#465069', '#7b8098', '#ffe066'],
    'storm-night': ['#0c0a18', '#241c3d', '#4d3f68', '#ffe066']
  };

  function themePal(family, isDay) {
    return PAL[U.themeKey(family, isDay)] || PAL['cloudy-day'];
  }

  /* ---------- tiny canvas condition glyph ---------- */
  function paintCondition(ctx, code, isDay, cx, cy, s) {
    const fam = U.codeFamily(code);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s / 100, s / 100);

    if (fam === 'clear' || fam === 'partly') {
      if (isDay) {
        ctx.fillStyle = 'rgba(255,214,106,.25)';
        ctx.beginPath(); ctx.arc(0, 0, 52, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd05e';
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#eef3fb';
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill();
        ctx.fillStyle = '#aebbd2';
        ctx.beginPath(); ctx.arc(-9, -9, 5, 0, 7); ctx.fill();
      }
    }
    if (fam === 'partly' || fam === 'cloudy' || fam === 'fog' || fam === 'rain' || fam === 'snow' || fam === 'storm') {
      const cloud = (dx, dy, sc, alpha) => {
        ctx.save(); ctx.translate(dx, dy); ctx.scale(sc, sc);
        ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-26, 4, 24, 0, 7); ctx.arc(-2, -10, 30, 0, 7);
        ctx.arc(24, 2, 22, 0, 7);
        ctx.fill();
        ctx.fillRect(-30, -4, 62, 18);   // flat base
        ctx.restore();
      };
      if (fam === 'cloudy') { cloud(-8, -8, .9, .5); cloud(10, 12, .95, .95); }
      else if (fam === 'fog') { cloud(6, -14, .9, .55); cloud(-4, 6, .9, .8); }
      else if (fam === 'partly') cloud(12, 18, .85, .92);
      else cloud(4, 6, .92, .95);
      if (fam === 'snow') {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        [[-30, 40], [0, 50], [30, 38]].forEach(([x, y], i) => {
          ctx.globalAlpha = .9 - i * .12;
          ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
          ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke();
        });
      }
      if (fam === 'rain') {
        ctx.strokeStyle = '#a9e0ff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.globalAlpha = .95;
        [[-28, 44], [-6, 52], [16, 42], [34, 50]].forEach(([x, y]) => {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 20); ctx.stroke();
        });
      }
      if (fam === 'storm') {
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.moveTo(18, 26); ctx.lineTo(-6, 56); ctx.lineTo(8, 56);
        ctx.lineTo(2, 78); ctx.lineTo(30, 48); ctx.lineTo(14, 48); ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- shared sky painting ---------- */
  function paintSky(ctx, W, H, data) {
    const [c1, c2] = themePal(data.family, data.isDay);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(.55, c2); g.addColorStop(1, themePal(data.family, data.isDay)[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const glow = (x, y, r, col) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    glow(W * 0.12, H * 0.10, W * 0.44, c2);
    glow(W - W * 0.09, H * 0.64, W * 0.40, c1);

    if (!data.isDay) {
      const spots = [[.06, .07], [.26, .05], [.86, .10], [.93, .31], [.19, .15], [.70, .20], [.09, .21], [.78, .42]];
      spots.forEach(([fx, fy], i) => {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 3) * 0.2) + ')';
        ctx.beginPath(); ctx.arc(W * fx, H * fy, 1.6 + (i % 2), 0, 7); ctx.fill();
      });
    }
  }

  /* ---------- main renderer (full forecast poster) ---------- */
  function render(ctx, W, H, data) {
    paintSky(ctx, W, H, data);
    const acc = themePal(data.family, data.isDay)[3];

    ctx.textBaseline = 'alphabetic';
    const ink = data.isDay ? '#ffffff' : '#eef3fb';
    const subInk = 'rgba(255,255,255,.8)';

    /* header */
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    ctx.font = '800 46px Inter,"Segoe UI",sans-serif';
    ctx.fillText(data.place, 90, 120);
    ctx.fillStyle = subInk;
    ctx.font = '600 24px Inter,"Segoe UI",sans-serif';
    ctx.fillText(data.sub, 90, 160);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '700 22px Inter,"Segoe UI",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.clock, W - 90, 130);

    /* weather hero */
    paintCondition(ctx, data.code, data.isDay, 250, 480, 260);
    ctx.textAlign = 'left';
    ctx.font = '300 220px Inter,"Segoe UI",sans-serif';
    ctx.fillStyle = ink;
    ctx.fillText(Math.round(data.temp) + '°', 420, 560);
    ctx.font = '800 44px Inter,"Segoe UI",sans-serif';
    ctx.fillText(data.cond, 432, 630);
    ctx.fillStyle = subInk;
    ctx.font = '600 26px Inter,"Segoe UI",sans-serif';
    ctx.fillText('H ' + Math.round(data.hi) + '°   L ' + Math.round(data.lo) + '°   ·   feels ' + Math.round(data.feels) + '°', 432, 672);

    /* stat chips */
    const chips = [
      ['WIND', data.wind], ['HUMIDITY', data.hum], ['UV', data.uv],
      ['PRECIP', data.pop], ['VISIBILITY', data.vis], ['PRESSURE', data.press]
    ];
    let cx = 90;
    chips.forEach(ch => {
      const w = 235;
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      roundRect(ctx, cx, 730, w, 108, 22); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5;
      roundRect(ctx, cx, 730, w, 108, 22); ctx.stroke();
      ctx.fillStyle = subInk;
      ctx.font = '700 17px Inter,"Segoe UI",sans-serif';
      ctx.fillText(ch[0], cx + 20, 768);
      ctx.fillStyle = ink;
      ctx.font = '800 27px Inter,"Segoe UI",sans-serif';
      ctx.fillText(ch[1], cx + 20, 814);
      cx += w + 16;
    });

    /* daily strip */
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    roundRect(ctx, 90, 890, W - 180, 330, 30); ctx.fill();
    const days = data.days.slice(0, 7);
    const colW = (W - 240) / days.length;
    days.forEach((d, i) => {
      const x = 150 + i * colW + colW / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = i === 0 ? acc : ink;
      ctx.font = '800 26px Inter,"Segoe UI",sans-serif';
      ctx.fillText(d.name, x, 960);
      paintCondition(ctx, d.code, true, x, 1060, 120);
      ctx.fillStyle = ink;
      ctx.font = '700 30px Inter,"Segoe UI",sans-serif';
      ctx.fillText(Math.round(d.hi) + '°', x, 1160);
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = '600 25px Inter,"Segoe UI",sans-serif';
      ctx.fillText(Math.round(d.lo) + '°', x, 1200);
    });

    /* credit */
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.font = '600 19px Inter,"Segoe UI",sans-serif';
    ctx.fillText('Skyline Weather for Eagle  ·  weather by Open-Meteo', W - 90, H - 24);
  }

  /* ---------- simple poster renderer (current conditions only) ---------- */
  function renderSimple(ctx, W, H, data) {
    paintSky(ctx, W, H, data);

    ctx.textBaseline = 'alphabetic';
    const ink = data.isDay ? '#ffffff' : '#eef3fb';
    const subInk = 'rgba(255,255,255,.82)';

    /* header */
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    ctx.font = '800 58px Inter,"Segoe UI",sans-serif';
    ctx.fillText(data.place, 100, 150);
    ctx.fillStyle = subInk;
    ctx.font = '600 27px Inter,"Segoe UI",sans-serif';
    ctx.fillText(data.sub, 100, 198);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '700 24px Inter,"Segoe UI",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.clock, W - 100, 160);

    /* center: glyph + big number */
    paintCondition(ctx, data.code, data.isDay, 340, 530, 330);
    ctx.textAlign = 'left';
    ctx.font = '300 300px Inter,"Segoe UI",sans-serif';
    ctx.fillStyle = ink;
    ctx.fillText(Math.round(data.temp) + '°', 610, 640);
    ctx.font = '800 54px Inter,"Segoe UI",sans-serif';
    ctx.fillText(data.cond, 630, 730);
    ctx.fillStyle = subInk;
    ctx.font = '600 30px Inter,"Segoe UI",sans-serif';
    const hl = ['H ' + Math.round(data.hi) + '°', 'L ' + Math.round(data.lo) + '°'];
    if (data.feels != null) hl.push('feels ' + Math.round(data.feels) + '°');
    ctx.fillText(hl.join('   ·   '), 630, 782);

    /* a few quiet detail chips */
    const chips = [
      ['WIND', data.wind], ['HUMIDITY', data.hum],
      ['UV', data.uv], ['PRECIP', data.pop]
    ];
    let cx = 100;
    chips.forEach(ch => {
      const w = 315;
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      roundRect(ctx, cx, 852, w, 96, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
      roundRect(ctx, cx, 852, w, 96, 20); ctx.stroke();
      ctx.fillStyle = subInk;
      ctx.font = '700 17px Inter,"Segoe UI",sans-serif';
      ctx.fillText(ch[0], cx + 22, 892);
      ctx.fillStyle = ink;
      ctx.font = '800 28px Inter,"Segoe UI",sans-serif';
      ctx.fillText(ch[1], cx + 22, 930);
      cx += w + 18;
    });

    /* credit */
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.font = '600 20px Inter,"Segoe UI",sans-serif';
    ctx.fillText('Skyline Weather for Eagle  ·  weather by Open-Meteo', W - 100, H - 30);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- data assembly + export ---------- */
  function posterData(state) {
    const cur = state.cur, daily = state.daily || [], place = state.place;
    const today = daily[0] || {};
    const metric = state.unit === 'c';
    return {
      place: place.name,
      sub: [place.admin1, place.country].filter(Boolean).join(' · ') || 'Weather',
      clock: U.fmtClock(state.nowWall) + ' · local time',
      family: U.codeFamily(cur.code), isDay: !!cur.isDay,
      code: cur.code,
      temp: cur.temp, cond: U.condName(cur.code),
      hi: today.tmax, lo: today.tmin, feels: cur.feels,
      wind: U.windSpeed(cur.wind, metric),
      hum: Math.round(cur.hum) + '%',
      uv: cur.uv != null ? cur.uv.toFixed(1) : '—',
      pop: (today.pop != null && today.pop > 0) ? Math.round(today.pop) + '%' : '0%',
      vis: U.visText(cur.vis, metric),
      press: U.pressText(cur.pressure, metric),
      days: daily.map((d, i) => ({
        name: i === 0 ? 'TODAY' : U.fmtDayName(U.wallStamp(d.date)).toUpperCase(),
        code: d.code, hi: d.tmax, lo: d.tmin
      }))
    };
  }

  /* style: 'simple' = clean current-conditions poster,
            'full'   = hero + details + 7-day outlook */
  function buildPoster(state, style) {
    const canvas = document.createElement('canvas');
    const simple = style === 'simple';
    canvas.width = 1600;
    canvas.height = simple ? 1000 : 1220;
    const ctx = canvas.getContext('2d');
    const data = posterData(state);
    if (simple) renderSimple(ctx, 1600, 1000, data);
    else render(ctx, 1600, 1220, data);
    return canvas.toDataURL('image/png');
  }

  function inEagle() {
    try { return !!(window.eagle && window.eagle.item && typeof window.eagle.item.addFromBase64 === 'function'); }
    catch (e) { return false; }
  }
  function download(dataURL, name) {
    const a = document.createElement('a');
    a.href = dataURL; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => a.remove(), 200);
  }
  async function addToEagle(dataURL, name, tags) {
    const itemId = await window.eagle.item.addFromBase64(dataURL, {
      name: name.replace(/\.png$/, ''),
      website: 'https://open-meteo.com/',
      tags: tags || ['weather', 'skyline-weather'],
      annotation: 'Generated by Skyline Weather (Open-Meteo data)'
    });
    return itemId;
  }

  window.Wallpaper = { buildPoster, inEagle, download, addToEagle, paintCondition };
})();
