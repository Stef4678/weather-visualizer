/* ============================================================
   app.js — application controller for Skyline Weather.
   State, event wiring, location search, rendering pipeline.
   Depends on: utils, store, icons, api, charts, wallpaper.
   ============================================================ */
(function () {
  'use strict';

  const U = window.Utils, Store = window.Store, API = window.API,
    WX = window.WX, Charts = window.Charts, Wallpaper = window.Wallpaper;

  /* ---------- small inline icons used by tiles ---------- */
  const IC = {
    feels: '<svg viewBox="0 0 24 24"><path d="M12 3c3.2 3.6 6 6.6 6 10a6 6 0 0 1-12 0c0-3.4 2.8-6.4 6-10z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 14h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wind: '<svg viewBox="0 0 24 24"><path d="M3 8h9a3 3 0 1 0-3-3M3 12h13a3 3 0 1 1-3 3M3 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    hum: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    uv: '<svg viewBox="0 0 24 24"><path d="M12 3v2M12 19v2M4.6 5.6l1.4 1.4M18 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    press: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    vis: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 1 1 .6-7.95A5.5 5.5 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 2s7 7.4 7 12.5a7 7 0 0 1-14 0C5 9.4 12 2 12 2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    dew: '<svg viewBox="0 0 24 24"><circle cx="8" cy="16" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="9" r="1.8" fill="currentColor"/><circle cx="17.5" cy="16.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  /* quick-starter places shown on the empty welcome screen */
  const POPULAR = [
    { id: 'popular-newyork', name: 'New York', admin1: 'New York', country: 'United States', cc: 'us', lat: 40.7128, lon: -74.006, timezone: 'America/New_York' },
    { id: 'popular-london', name: 'London', admin1: 'England', country: 'United Kingdom', cc: 'gb', lat: 51.5072, lon: -0.1276, timezone: 'Europe/London' },
    { id: 'popular-tokyo', name: 'Tokyo', admin1: 'Tokyo', country: 'Japan', cc: 'jp', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
    { id: 'popular-paris', name: 'Paris', admin1: 'Île-de-France', country: 'France', cc: 'fr', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
    { id: 'popular-singapore', name: 'Singapore', admin1: '', country: 'Singapore', cc: 'sg', lat: 1.3521, lon: 103.8198, timezone: 'Asia/Singapore' },
    { id: 'popular-sydney', name: 'Sydney', admin1: 'New South Wales', country: 'Australia', cc: 'au', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' }
  ];

  /* ---------- dom ---------- */
  function $(id) { return document.getElementById(id); }
  const D = {
    segUnit: $('segUnit'), btnRefresh: $('btnRefresh'),
    horizonChips: $('horizonChips'), spanLabel: $('spanLabel'),
    geoInput: $('geoInput'), geoResults: $('geoResults'), btnLocate: $('btnLocate'),
    btnPin: $('btnPin'), pinLabel: $('pinLabel'),
    favRow: $('favRow'), favChips: $('favChips'), recentRow: $('recentRow'), recentChips: $('recentChips'),
    errCard: $('errCard'), errTitle: $('errTitle'), errMsg: $('errMsg'), btnRetryErr: $('btnRetryErr'),
    welcomeCard: $('welcomeCard'), welcomeIco: $('welcomeIco'), popularChips: $('popularChips'),
    heroCard: $('heroCard'), dataCols: $('dataCols'), dailyCard: $('dailyCard'), actionsCard: $('actionsCard'),
    btnClearLoc: $('btnClearLoc'),
    locName: $('locName'), locSub: $('locSub'), locClock: $('locClock'),
    wxIconHero: $('wxIconHero'), curTemp: $('curTemp'), curUnit: $('curUnit'),
    curHiLo: $('curHiLo'), curCond: $('curCond'), curCondDesc: $('curCondDesc'),
    curFeels: $('curFeels'), tipLine: $('tipLine'), tipText: $('tipText'),
    tileGrid: $('tileGrid'),
    hourlySub: $('hourlySub'), segMetric: $('segMetric'), hourlyWrap: $('hourlyWrap'),
    hourlyChart: $('hourlyChart'), hourlyLegend: $('hourlyLegend'),
    aqCard: $('aqCard'), aqVal: $('aqVal'), aqCat: $('aqCat'), aqChips: $('aqChips'),
    aqNote: $('aqNote'), aqBadge: $('aqBadge'), aqBar: $('aqBar'),
    astroPill: $('astroPill'), sunPathSvg: $('sunPathSvg'), sunRows: $('sunRows'),
    moonGlyph: $('moonGlyph'), moonName: $('moonName'), moonPct: $('moonPct'), moonNext: $('moonNext'),
    dailyTitle: $('dailyTitle'), daysSummary: $('daysSummary'),
    trendWrap: $('trendWrap'), trendChart: $('trendChart'), dailyList: $('dailyList'),
    btnPoster: $('btnPoster'), btnEagle: $('btnEagle'), btnCopy: $('btnCopy'),
    exportMenu: $('exportMenu'),
    confirmOverlay: $('confirmOverlay'), confirmTitle: $('confirmTitle'),
    confirmText: $('confirmText'),
    btnConfirmCancel: $('btnConfirmCancel'), btnConfirmRemove: $('btnConfirmRemove'),
    metaUpdated: $('metaUpdated'), toast: $('toast')
  };

  /* ---------- state ---------- */
  const S = {
    place: null, fc: null, aq: null,
    overlay: Store.overlay(),
    exportAction: null,
    loadToken: 0,
    updAt: 0,
    autoTimer: null, clockTimer: null,
    resObs: null
  };

  const metric = () => Store.unit() === 'c';
  const deg = () => (metric() ? '°C' : '°F');
  const windUnit = () => (metric() ? 'km/h' : 'mph');
  const windSpeedFmt = v => (v == null ? '—' : Math.round(v) + ' ' + windUnit());

  /* ---------- toast ---------- */
  let toastTimer = null;
  function hideToast() { D.toast.hidden = true; }
  /* action (optional) = { label, run } — renders an Undo-style button next to
     the message so a removal can be reversed for a few seconds. */
  function toast(msg, isErr, ms, action) {
    D.toast.textContent = '';
    D.toast.classList.toggle('err', !!isErr);
    const text = document.createElement('span');
    text.textContent = msg;
    D.toast.appendChild(text);
    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => { hideToast(); action.run(); });
      D.toast.appendChild(btn);
    }
    D.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || (action ? 8000 : 2600));
  }

  /* ---------- confirm-before-removal dialog ---------- */
  /* Shown before any removal of a saved/recent location (chip ✕, Pin tap
     to unpin). Discloses the location, the affected list and the fact that
     only Skyline Weather's location list is touched, then asks for a separate
     Cancel / Remove confirmation. Removing without undo is guarded by a short
     Undo toast for extra protection. */
  function hideConfirm() { D.confirmOverlay.hidden = true; D._confirmRemove = null; }
  function confirmRemove(listLabel, place, onConfirm) {
    const name = U.esc(place.name || '');
    const sub = U.esc([place.admin1, place.country].filter(Boolean).join(', '));
    const placeDesc = name + (sub ? ' · ' + sub : '');
    const listEsc = U.esc(listLabel);
    D.confirmTitle.textContent = 'Remove from ' + listLabel + '?';
    D.confirmText.innerHTML =
      '<div class="confirm-place"><b>' + placeDesc + '</b></div>' +
      '<p>This removes <b>' + placeDesc + '</b> from your <b>' + listEsc +
      '</b> list in Skyline Weather. Nothing else is changed — your Eagle library, ' +
      'files and other apps are not affected.</p>' +
      '<p class="confirm-note">There is no direct way to get it back from this list. ' +
      'If you change your mind, an <b>Undo</b> button appears for a few seconds, or you can ' +
      're-find the place by searching for it.</p>';
    D._confirmRemove = onConfirm;
    D.confirmOverlay.hidden = false;
    D.btnConfirmCancel.focus();
  }

  /* ---------- theme ---------- */
  function applyTheme(family, isDay) {
    document.body.dataset.theme = U.themeKey(family, isDay);
  }

  /* =========================================================
     loading & errors
     ========================================================= */
  function showErr(title, msg) {
    D.errTitle.textContent = title;
    D.errMsg.textContent = msg;
    D.errCard.hidden = false;
  }
  function hideErr() { D.errCard.hidden = true; }

  function setLoading(on) {
    D.btnRefresh.classList.toggle('spin', on);
  }

  /* =========================================================
     empty (no location) state — welcome panel + clear
     ========================================================= */
  function showDataState() {
    D.welcomeCard.hidden = true;
    D.heroCard.hidden = false;
    D.dataCols.hidden = false;
    D.dailyCard.hidden = false;
    D.actionsCard.hidden = false;
    D.btnClearLoc.hidden = false;
    D.btnRefresh.disabled = false;
  }
  function renderEmptyState() {
    if (!D.welcomeIco.innerHTML) D.welcomeIco.innerHTML = WX.weatherIcon(2, true); // friendly partly-cloudy sun
    if (!D.popularChips.innerHTML) {
      D.popularChips.innerHTML = POPULAR.map((p, i) =>
        '<button type="button" class="chip" data-i="' + i + '" title="' + U.esc(p.name + (p.country ? ', ' + p.country : '')) + '">' +
        U.esc(p.name) + '</button>').join('');
    }
    D.welcomeCard.hidden = false;
    D.heroCard.hidden = true;
    D.dataCols.hidden = true;
    D.dailyCard.hidden = true;
    D.actionsCard.hidden = true;
    D.btnClearLoc.hidden = true;
    D.btnRefresh.disabled = true;
    D.locClock.textContent = '';
    D.spanLabel.textContent = 'no location';
    D.metaUpdated.textContent = 'no location selected';
    document.title = 'Skyline Weather';
    applyTheme('clear', true);
  }
  function clearLocation() {
    ++S.loadToken;                        // cancel any in-flight request
    clearInterval(S.autoTimer);
    clearInterval(S.clockTimer);
    S.place = null;
    S.fc = null;
    S.aq = null;
    S.updAt = 0;
    S.offset = 0;
    D.geoInput.value = '';
    closeResults();
    Store.setLast(null);                  // app will reopen on the empty welcome
    hideErr();
    setLoading(false);
    updatePinBtn();
    renderPinnedRows();
    renderEmptyState();
    toast('Location cleared — search a place to begin');
  }

  /* =========================================================
     place data pipeline
     ========================================================= */
  async function loadWeather(place, { quiet, force } = {}) {
    if (!place) return;
    S.place = place;
    Store.setLast(place);
    const token = ++S.loadToken;
    setLoading(true);
    if (!quiet) {
      D.locName.textContent = place.name;
      D.locSub.textContent = placeSub(place) || 'loading…';
    }
    try {
      const key = (place.lat.toFixed(3)) + ',' + (place.lon.toFixed(3)) + ',' + Store.unit();
      let data = null;
      if (!force) data = Store.cacheGet(key);   // normal loads may reuse <3 min cache
      if (!data) {                              // force = always hit the network
        data = await API.fetchForecast(place.lat, place.lon, metric());
        Store.cacheSet(key, data);
      }
      if (token !== S.loadToken) return;
      S.fc = data;
      S.updAt = Date.now();
      hideErr();
      showDataState();

      renderAll(place, data);

      /* air quality (best effort) */
      API.fetchAir(place.lat, place.lon).then(aq => {
        if (token === S.loadToken) { S.aq = aq; renderAir(aq); }
      }).catch(() => { D.aqCard.hidden = true; });

      scheduleAutoRefresh();
    } catch (e) {
      if (token !== S.loadToken) return;
      const reason = (e && e.name === 'AbortError') ? 'the request timed out'
        : (e && e.message) || 'unknown error';
      console.error('loadWeather failed for', place.name, e);
      if (S.fc) {
        /* keep showing last good data; just tell the user the refresh failed */
        toast('Could not refresh “' + place.name + '” — ' + reason + '. Showing last data.', true, 4500);
      } else {
        showErr('Could not load weather', 'Network problem for “' + place.name + '” — ' + reason +
          '. Check your connection and retry.');
      }
    } finally {
      if (token === S.loadToken) setLoading(false);
    }
  }

  function scheduleAutoRefresh() {
    clearInterval(S.autoTimer);
    S.autoTimer = setInterval(() => {
      if (S.place && !document.hidden) loadWeather(S.place, { quiet: true });
    }, 1000 * 60 * 10);
  }

  /* =========================================================
     render everything
     ========================================================= */
  function renderAll(place, fc) {
    const cur = fc.current;
    const offset = fc.offset;

    /* each section is isolated: one faulty widget can never take down
       the whole screen or trigger the big error card */
    const safe = (name, fn) => { try { fn(); } catch (err) { console.error('render[' + name + ']', err); } };
    safe('theme', () => applyTheme(U.codeFamily(cur.code), cur.isDay));
    safe('location', () => renderLocation(place, fc, offset));
    safe('hero', () => renderHero(cur, fc, offset));
    safe('tiles', () => renderTileGrid(cur, fc, offset));
    safe('hourly', () => renderHourly(fc, offset));
    safe('daily', () => renderDaily(fc, Store.days()));
    safe('astro', () => renderAstro(fc, offset));
    safe('pin', updatePinBtn);
    safe('pins', renderPinnedRows);
    safe('meta', renderMeta);
    safe('clock', () => startClock(offset));
    safe('eagle', () => {
      D.btnEagle.hidden = !Wallpaper.inEagle();
      if (D.btnEagle.hidden) D.btnPoster.textContent = 'Save wallpaper PNG';
    });
  }

  function renderLocation(place, fc, offset) {
    D.locName.textContent = place.name;
    const sub = placeSub(place);
    D.locSub.textContent = sub ? sub + ' · ' + (fc.timezone || '') : fc.timezone || '';
    document.title = place.name + ' · Skyline Weather';
  }

  function renderHero(cur, fc, offset) {
    const nowW = U.nowWall(offset);
    D.wxIconHero.innerHTML = WX.weatherIcon(cur.code, cur.isDay);
    D.curTemp.textContent = Math.round(cur.temp);
    D.curUnit.textContent = deg();
    const d0 = fc.daily[0] || {};
    D.curHiLo.innerHTML = 'H <b>' + Math.round(d0.tmax || cur.temp) + '°</b> &nbsp;·&nbsp; L <b>' + Math.round(d0.tmin || cur.temp) + '°</b>';
    D.curCond.textContent = U.condName(cur.code);
    D.curCondDesc.textContent = (cur.isDay ? 'Day' : 'Night') + ' · ' + (cur.cloud != null ? 'cloud ' + Math.round(cur.cloud) + '%' : '') +
      (cur.precip ? ' · precip now' : '');
    const diff = cur.feels != null && cur.temp != null ? Math.round(cur.feels - cur.temp) : 0;
    const sign = diff > 0 ? 'warmer' : diff < 0 ? 'colder' : '';
    const diffAbs = Math.abs(diff);
    D.curFeels.textContent = 'Feels like ' + Math.round(cur.feels) + '°' + (diffAbs >= 2 ? ' · ' + diffAbs + '° ' + sign : '');
    D.curFeels.style.display = cur.feels != null ? '' : 'none';

    /* tip */
    const tip = U.suggestion({
      family: U.codeFamily(cur.code), isDay: cur.isDay, temp: cur.temp,
      precipProb: d0.pop, uv: cur.uv, snow: d0.snow
    });
    if (tip) { D.tipText.textContent = tip; D.tipLine.hidden = false; }
    else D.tipLine.hidden = true;
    void nowW;
  }

  /* ---------- tiles ---------- */
  function renderTileGrid(cur, fc, offset) {
    const m = metric();
    const diff = cur.feels != null && cur.temp != null ? Math.round(cur.feels - cur.temp) : 0;
    const tiles = [];
    const feelsSub = diff === 0 ? 'same as air' : (Math.abs(diff) + '° ' + (diff > 0 ? 'warmer' : 'colder') + ' than air');
    tiles.push(tile('feels', 'Feels like', Math.round(cur.feels) + '°', feelsSub, ''));
    const wdir = U.shortDeg(cur.wdir);
    const gustS = cur.gust != null ? ' · gust ' + windSpeedFmt(cur.gust) : '';
    const dial = cur.wdir != null
      ? '<svg class="dial-svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.6"/><circle cx="20" cy="20" r="12" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1"/><path d="M20 5l3.6 7.5h-7.2z" fill="currentColor" transform="rotate(' + ((cur.wdir + 180) % 360) + ' 20 20)"/></svg>'
      : '';
    tiles.push('<div class="tile"><span class="tile-label">' + IC.wind + 'Wind</span>' +
      '<div class="tile-val">' + U.esc(windSpeedFmt(cur.wind)) + dial + '</div>' +
      '<div class="mini">' + U.esc(wdir) + gustS + '</div></div>');
    const humTxt = cur.hum < 30 ? 'dry' : cur.hum < 60 ? 'comfortable' : cur.hum < 80 ? 'humid' : 'very humid';
    tiles.push(tile('hum', 'Humidity', Math.round(cur.hum) + '%', humTxt, ''));
    const uvI = U.uvInfo(cur.uv);
    tiles.push(tile('uv', 'UV index', cur.uv != null ? cur.uv.toFixed(1) : '—', uvI ? uvI.level + ' · daily max ' + (fc.daily[0] && fc.daily[0].uvmax != null ? Math.round(fc.daily[0].uvmax) : '—') : '', uvI ? uvI.cls : ''));
    tiles.push(tile('press', 'Pressure', U.pressText(cur.pressure, m), 'sea level', ''));
    tiles.push(tile('vis', 'Visibility', U.visText(cur.vis, m), 'current', ''));
    tiles.push(tile('cloud', 'Cloud cover', Math.round(cur.cloud) + '%', 'sky', ''));
    const pre = (cur.precip || 0) + (cur.snow || 0);
    tiles.push(tile('drop', 'Precip now', pre > 0 ? pre.toFixed(metric() ? 1 : 2) + (m ? ' mm' : ' in') : '0', m ? 'mm total' : 'inches total', ''));
    tiles.push(tile('dew', 'Dew point', cur.feels ? Math.round(cur.dew != null ? cur.dew : cur.temp - ((100 - cur.hum) / 5)) + '°' : '—', 'moisture in air', ''));

    D.tileGrid.innerHTML = tiles.join('');
  }
  function tile(key, label, val, mini, cls) {
    return '<div class="tile ' + cls + '">' +
      '<span class="tile-label">' + (IC[key] || '') + U.esc(label) + '</span>' +
      '<div class="tile-val">' + U.esc(val) + '</div>' +
      (mini ? '<div class="mini">' + U.esc(mini) + '</div>' : '') +
      '</div>';
  }

  /* ---------- hourly ---------- */
  let hourlyRendered = false;
  function renderHourly(fc, offset) {
    const hours = fc.hourly.slice(0, 48);
    if (!hours.length) return;
    const unit = Store.unit();
    const cfg = {
      unit, overlay: S.overlay, windUnit: windUnit(),
      height: S.overlay ? 250 : 216
    };
    D.hourlyLegend.innerHTML = Charts.legendHTML(S.overlay, windUnit());
    D.hourlySub.textContent = S.overlay ? 'temperature + overlay series' : 'temperature · hover for details';
    syncMetricButtons();
    if (hourlyRendered) drawHourly();
    else requestAnimationFrame(drawHourly);
    function drawHourly() {
      try { Charts.renderHourly(D.hourlyChart, hours, cfg); hourlyRendered = true; }
      catch (e) { console.warn('hourly render failed', e); }
    }
  }

  function syncMetricButtons() {
    D.segMetric.querySelectorAll('.seg-btn').forEach(b => {
      b.classList.toggle('is-on', b.dataset.m === S.overlay);
    });
  }

  /* ---------- daily ---------- */
  function renderDaily(fc, daysN) {
    const daily = fc.daily.slice(0, daysN);
    D.spanLabel.textContent = daysN === 1 ? 'next 24 hours' : 'next ' + daysN + ' days';
    D.dailyTitle.textContent = daysN === 1 ? 'Today at a glance' : daysN + '-day forecast';
    D.daysSummary.textContent = summarizeDays(daily);
    syncChips();
    D.trendWrap.style.display = daily.length > 1 ? '' : 'none';
    if (daily.length > 1) {
      requestAnimationFrame(() => {
        try { Charts.renderTrend(D.trendChart, daily, { height: 168 }); } catch (e) { console.warn(e); }
      });
    }
    renderDailyRows(daily);
  }

  function summarizeDays(daily) {
    if (!daily.length) return '—';
    const m = metric();
    const highs = daily.map(d => d.tmax), lows = daily.map(d => d.tmin);
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const rainTot = daily.reduce((a, d) => a + (d.precip || 0), 0);
    let parts = [];
    parts.push('avg ' + Math.round(avg(highs)) + '° / ' + Math.round(avg(lows)) + '°');
    const maxI = highs.indexOf(Math.max.apply(null, highs));
    parts.push('warmest ' + (maxI === 0 ? 'today' : U.fmtDayName(U.wallStamp(daily[maxI].date))));
    if (rainTot > 0) parts.push('rain ' + (m ? rainTot.toFixed(1) + ' mm' : (rainTot / 25.4).toFixed(2) + ' in'));
    return parts.join(' · ');
  }

  function renderDailyRows(daily) {
    const m = metric();
    let all = [];
    daily.forEach(d => all.push(d.tmin, d.tmax));
    const lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    const span = (hi - lo) || 1;

    D.dailyList.innerHTML = daily.map((d, i) => {
      const st = U.wallStamp(d.date);
      const dayName = i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : U.fmtDayName(st));
      const mid = (d.tmax + d.tmin) / 2;
      const col = Charts.heatColor((mid - lo) / span);
      const left = ((d.tmin - lo) / span) * 100;
      const width = ((d.tmax - d.tmin) / span) * 100;
      const meta = [];
      if (d.pop != null && d.pop > 0) meta.push('<span class="d precip-dot">' + raindrop() + Math.round(d.pop) + '%</span>');
      if (d.rain || d.snow) meta.push('<span class="d">' + (d.snow ? '❄' : '') + (d.rain ? '☔' : '') +
        (d.snow ? (m ? d.snow.toFixed(1) + ' mm' : (d.snow / 25.4).toFixed(2) + ' in') + ' snow' : '') +
        (d.rain ? (m ? d.rain.toFixed(1) : (d.rain / 25.4).toFixed(2)) + (m ? ' mm' : ' in') + ' rain' : '') + '</span>');
      if (d.wind != null) meta.push('<span class="d">' + windArrow(d.wdir) + ' ' + U.shortDeg(d.wdir) + ' ' + Math.round(d.wind) + '</span>');
      if (d.sunrise && d.sunset) meta.push('<span class="d">' + sunIco() + ' ' + U.fmtClock(U.wallStamp(d.sunrise)) + ' / ' + U.fmtClock(U.wallStamp(d.sunset)) + '</span>');
      if (d.uvmax != null && d.uvmax > 2) meta.push('<span class="d">' + uvIco() + ' UV ' + Math.round(d.uvmax) + '</span>');
      return '<div class="day-row">' +
        '<div class="day-name">' + dayName + '<small>' + U.fmtMonthDay(st) + '</small></div>' +
        '<div class="day-ic">' + WX.weatherIcon(d.code, true) + '</div>' +
        '<div class="day-mid"><div class="day-cond">' + U.esc(U.condName(d.code)) + '</div>' +
        '<div class="day-meta">' + meta.join('') + '</div></div>' +
        '<div class="day-temps"><span class="day-lo">' + Math.round(d.tmin) + '°</span>' +
        '<div class="day-bar"><div class="day-range" style="left:' + left.toFixed(1) + '%;width:' + Math.max(2, width).toFixed(1) + '%;background:' + col + '"></div></div>' +
        '<span class="day-hi">' + Math.round(d.tmax) + '°</span></div>' +
        '</div>';
    }).join('');
  }
  function raindrop() { return '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3z" fill="currentColor"/></svg>'; }
  function windArrow(degv) { return '<svg viewBox="0 0 24 24"><path d="M12 20V5m0 0l-5 5m5-5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="rotate(' + ((degv || 0) + 180) + ' 12 12)" fill="none"/></svg>'; }
  function sunIco() { return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; }
  function uvIco() { return '<svg viewBox="0 0 24 24"><path d="M12 3v2M12 19v2M4.6 5.6l1.4 1.4M18 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>'; }

  /* ---------- astro ---------- */
  function renderAstro(fc, offset) {
    const d0 = fc.daily[0] || {};
    const nowW = U.nowWall(offset);
    const cur = fc.current;
    drawSunPath(nowW, d0, cur, offset);
    const phase = U.moonPhase();
    D.moonGlyph.innerHTML = WX.moonPhaseGlyph(phase);
    D.moonName.textContent = phase.name;
    D.moonPct.textContent = 'illumination ' + Math.round(phase.illum * 100) + '%' + (phase.waxing ? ' · waxing' : ' · waning');
    const nf = phase.nextFullIn, nn = phase.nextNewIn;
    const daysF = Math.round(nf / 86400000), daysN = Math.round(nn / 86400000);
    D.moonNext.textContent = (nf < nn ? 'Full moon in ~' + daysF + ' d' : 'New moon in ~' + daysN + ' d') +
      ' · ' + (nf < nn ? U.fmtMonthDay(nowW + nf) : U.fmtMonthDay(nowW + nn));
  }

  function drawSunPath(nowW, d0, cur, offset) {
    const svg = D.sunPathSvg;
    const W = 320, H = 170, cx = W / 2, cy = 132, R = 96;
    const rise = d0.sunrise ? U.wallStamp(d0.sunrise) : null;
    const set = d0.sunset ? U.wallStamp(d0.sunset) : null;
    const isDay = !!cur.isDay;
    let f = 0.5;
    if (rise && set && set > rise) f = U.clamp((nowW - rise) / (set - rise), 0, 1);
    const fracOfDay = d0.daylight ? d0.daylight / 86400 : (rise && set ? (set - rise) / 86400000 : 0.5);

    const sx = cx - R * Math.cos(Math.PI * f);
    const sy = cy - R * Math.sin(Math.PI * f);

    let s = '';
    /* arc band */
    const grad = '<defs><linearGradient id="sunarc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9d4d"/><stop offset=".5" stop-color="#ffd76a"/><stop offset="1" stop-color="#ff8a5c"/></linearGradient></defs>';
    s += grad;
    /* horizon line */
    s += '<line x1="18" y1="' + cy + '" x2="' + (W - 18) + '" y2="' + cy + '" stroke="rgba(255,255,255,.4)" stroke-width="1.4" stroke-linecap="round"/>';
    /* dashed daytime arc track */
    s += '<path d="M ' + (cx - R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy + '" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.4" stroke-dasharray="1 6" stroke-linecap="round"/>';
    /* progress arc */
    const trav = Math.PI * f;
    const ex = cx - R * Math.cos(trav), ey = cy - R * Math.sin(trav);
    s += '<path d="M ' + cx + ' ' + (cy - R) + ' A ' + R + ' ' + R + ' 0 0 1 ' + ex + ' ' + ey + '" fill="none" stroke="url(#sunarc)" stroke-width="3" stroke-linecap="round"/>';

    if (isDay) {
      s += '<circle cx="' + sx + '" cy="' + sy + '" r="7.5" fill="#ffd76a" stroke="rgba(255,255,255,.85)" stroke-width="2"/>';
      s += '<circle cx="' + sx + '" cy="' + sy + '" r="12" fill="rgba(255,215,106,.25)"/>';
    } else {
      s += '<circle cx="' + sx + '" cy="' + sy + '" r="6" fill="none" stroke="#cfd9ef" stroke-width="1.8" stroke-dasharray="2 3"/>';
    }
    /* rise / set markers + labels */
    s += '<circle cx="' + (cx - R) + '" cy="' + cy + '" r="4" fill="#ffb066"/>' +
      '<circle cx="' + (cx + R) + '" cy="' + cy + '" r="4" fill="#ffb066"/>';
    svg.innerHTML = s;
    D.astroPill.textContent = 'daylight ' + U.fmtDuration(d0.daylight) + (fracOfDay ? '' : '');
    const riseT = d0.sunrise ? U.fmtClock(rise) : '—';
    const setT = d0.sunset ? U.fmtClock(set) : '—';
    D.sunRows.innerHTML = '<span><b>' + riseT + '</b> sunrise</span>' +
      '<span>sunset <b>' + setT + '</b></span>';
  }

  /* ---------- air quality ---------- */
  function renderAir(aq) {
    const cat = U.aqiCat(aq.aqi);
    if (!cat) { D.aqCard.hidden = true; return; }
    D.aqCard.hidden = false;
    D.aqVal.textContent = Math.round(aq.aqi);
    D.aqBadge.textContent = cat.label;
    D.aqCat.textContent = cat.label;
    D.aqCat.style.color = cat.color;
    const R = 50, C = 2 * Math.PI * R;
    const off = C * (1 - U.clamp(aq.aqi / 300, 0, 1));
    D.aqBar.style.strokeDasharray = C;
    D.aqBar.style.strokeDashoffset = off;
    D.aqBar.style.stroke = cat.color;
    const pol = [
      ['PM2.5', aq.pm25], ['PM10', aq.pm10], ['O₃', aq.o3],
      ['NO₂', aq.no2], ['SO₂', aq.so2], ['CO', aq.co]
    ];
    D.aqChips.innerHTML = pol.filter(p => p[1] != null).map(p =>
      '<span class="aq-chip">' + p[0] + '<b>' + Math.round(p[1]) + '</b></span>').join('');
    D.aqNote.textContent = U.aqiNote(aq.aqi);
  }

  /* ---------- meta / clock ---------- */
  function renderMeta() {
    if (!S.fc) { D.metaUpdated.textContent = 'no location selected'; return; }
    D.metaUpdated.innerHTML = '<b>updated</b> ' + U.ago(S.updAt);
  }
  function startClock(offset) {
    clearInterval(S.clockTimer);
    const tick = () => {
      const nowW = U.nowWall(offset);
      D.locClock.textContent = U.fmtClock(nowW) + ' local';
    };
    tick();
    S.clockTimer = setInterval(tick, 15000);
    S.offset = offset;
  }

  /* ---------- pinned chips ---------- */
  function updatePinBtn() {
    const p = S.place;
    const fav = !!(p && p.id && Store.isFav(p.id));
    D.btnPin.setAttribute('aria-pressed', String(fav));
    D.pinLabel.textContent = fav ? 'Pinned' : 'Pin';
  }
  /* short disambiguator shown next to a chip name — never repeats the name
     itself and never uses country codes/emojis (fonts may render those as
     plain letters like "DE", and the trailing acronym looked wrong) */
  function chipSub(p) {
    const a = p.admin1 || '', c = p.country || '', n = p.name || '';
    if (a && a !== n && a !== c) return a;
    if (c && c !== n) return c;
    return '';
  }
  function placeChipHTML(p, removable) {
    const name = U.esc(p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name);
    const sub = U.esc(chipSub(p));
    const detail = [p.name, p.admin1, p.country].filter(Boolean).filter((v, i, arr) => v !== arr[0] || i === 0).join(', ');
    return '<button type="button" class="chip' + (removable ? ' has-x' : '') + '" data-id="' + U.esc(p.id) + '" title="' + U.esc(detail) + '">' +
      name + (sub ? '<small style="opacity:.65;font-weight:500"> · ' + sub + '</small>' : '') +
      (removable ? '<span class="chip-x" data-x="' + U.esc(p.id) + '" title="Remove" role="button" aria-label="Remove"><svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"><path d="M2.2 2.2l7.6 7.6M9.8 2.2l-7.6 7.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span>' : '') +
      '</button>';
  }
  function renderPinnedRows() {
    const favs = Store.favorites();
    const recents = Store.recent();
    D.favRow.hidden = favs.length === 0;
    D.recentRow.hidden = recents.length === 0;
    D.favChips.innerHTML = favs.map(f => placeChipHTML(f, true)).join('');
    D.recentChips.innerHTML = recents.map(r => placeChipHTML(r, true)).join('');
  }

  /* ---------- search ---------- */
  const doSearch = U.debounce(async function () {
    const q = D.geoInput.value.trim();
    if (!q) { closeResults(); return; }
    D.geoResults.hidden = false;
    D.geoResults.innerHTML = '<div class="geo-empty">searching…</div>';
    try {
      const items = await API.searchPlaces(q);
      if (q !== D.geoInput.value.trim()) return;
      if (!items.length) {
        D.geoResults.innerHTML = '<div class="geo-empty">No places found for “' + U.esc(q) + '”</div>';
        return;
      }
      D.geoResults.innerHTML = items.map((p, i) =>
        '<button type="button" class="geo-item" data-i="' + i + '">' +
        '<svg class="geo-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.1-6-10a6 6 0 1 1 12 0c0 4.9-6 10-6 10z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="11" r="2.2" fill="currentColor"/></svg>' +
        '<span><b>' + U.esc(p.name) + '</b><small>' +
        U.esc([p.admin1, p.country].filter(Boolean).join(', ')) +
        (p.population ? ' · pop. ' + (p.population / 1000).toFixed(0) + 'k' : '') + '</small></span>' +
        '</button>').join('');
      D._results = items;
      D._active = 0;
      highlightResult(0);
    } catch (e) {
      D.geoResults.innerHTML = '<div class="geo-empty">Search failed — check connection.</div>';
    }
  }, 300);

  function highlightResult(i) {
    const items = D.geoResults.querySelectorAll('.geo-item');
    items.forEach((el, k) => el.classList.toggle('keyed', k === i));
  }
  function closeResults() {
    D.geoResults.hidden = true;
    D.geoResults.innerHTML = '';
    D._results = [];
  }
  function pickResult(i) {
    const p = D._results && D._results[i];
    if (!p) return;
    closeResults();
    D.geoInput.value = '';
    selectPlace(p);
  }

  function selectPlace(p) {
    Store.pushRecent(p);
    renderPinnedRows();
    loadWeather(p);
  }

  /* one-line description of a place (adds an "≈ IP location" tag when
     the coordinates came from an IP-based lookup instead of GPS) */
  function placeSub(p) {
    const parts = [p.admin1, p.country].filter(Boolean);
    if (p.approx) parts.push('≈ IP location');
    return parts.join(' · ') || (p.name || '');
  }

  /* approximate location via public IP-geolocation services (no key needed).
     Several providers are tried in order because free tiers throttle.
     Used automatically whenever precise geolocation is unavailable —
     typical inside Eagle plugin windows. */
  const IP_PROVIDERS = [
    {
      url: 'https://ipwho.is/',
      parse(j) {
        return {
          city: j.city || '', region: j.region || '', country: j.country || '',
          cc: j.country_code || '', tz: (j.timezone && j.timezone.id) || '',
          lat: parseFloat(j.latitude), lon: parseFloat(j.longitude)
        };
      }
    },
    {
      url: 'https://get.geojs.io/v1/ip/geo.json',
      parse(j) {
        return {
          city: j.city || '', region: j.region || '', country: j.country || '',
          cc: j.country_code || '', tz: j.timezone || '',
          lat: parseFloat(j.latitude), lon: parseFloat(j.longitude)
        };
      }
    },
    {
      url: 'https://freeipapi.com/api/json',
      parse(j) {
        return {
          city: j.city || '', region: j.regionName || j.region || '', country: j.countryName || j.country || '',
          cc: j.countryCode || '', tz: j.timeZone || j.timezone || '',
          lat: parseFloat(j.latitude), lon: parseFloat(j.longitude)
        };
      }
    },
    {
      url: 'https://ipapi.co/json/',
      parse(j) {
        return {
          city: j.city || '', region: j.region || '', country: j.country_name || '',
          cc: j.country_code || '', tz: j.timezone || '',
          lat: parseFloat(j.latitude), lon: parseFloat(j.longitude)
        };
      }
    }
  ];

  async function locateViaIP(msg) {
    toast(msg || 'Finding your approximate location…');
    for (const provider of IP_PROVIDERS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(provider.url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const j = await res.json();
        const g = provider.parse(j);
        if (!isFinite(g.lat) || !isFinite(g.lon)) throw new Error('no coordinates in response');
        selectPlace({
          id: 'iploc' + Math.round(g.lat * 10) + '_' + Math.round(g.lon * 10),
          name: g.city || 'My location',
          admin1: g.region || '',
          country: g.country || '',
          cc: String(g.cc).toLowerCase(),
          lat: g.lat, lon: g.lon,
          timezone: g.tz || 'auto',
          approx: true
        });
        toast('Approximate location from your IP: ' + (g.city || 'your area') + (g.country ? ', ' + g.country : ''));
        return;
      } catch (e) {
        console.warn('IP location provider failed:', provider.url, e && e.message);
      }
    }
    toast('Location unavailable — please search your city instead.', true);
  }

  /* ---------- events ---------- */
  function wireEvents() {
    D.segUnit.addEventListener('click', e => {
      const b = e.target.closest('.seg-btn');
      if (!b || b.dataset.unit === Store.unit()) return;
      D.segUnit.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('is-on', x === b));
      Store.setUnit(b.dataset.unit);
      if (S.place) loadWeather(S.place);
    });

    /* refresh = forced network fetch (bypasses the short cache) */
    D.btnRefresh.addEventListener('click', () => {
      if (S.place) loadWeather(S.place, { force: true });
      else toast('Load a place first', true);
    });

    /* clear current location → back to the welcome screen */
    D.btnClearLoc.addEventListener('click', clearLocation);

    /* popular places offered on the welcome screen */
    D.popularChips.addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      const p = POPULAR[+b.dataset.i];
      if (p) selectPlace(p);
    });

    /* horizon chips */
    D.horizonChips.innerHTML = [[1, 'Today'], [3, '3 days'], [5, '5 days'], [7, '7 days'], [10, '10 days']]
      .map(([v, l]) => '<button type="button" class="chip" role="tab" data-days="' + v + '">' + l + '</button>').join('');
    D.horizonChips.addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      Store.setDays(+b.dataset.days);
      if (S.fc) renderDaily(S.fc, +b.dataset.days);
    });

    /* metric overlay */
    D.segMetric.addEventListener('click', e => {
      const b = e.target.closest('.seg-btn');
      if (!b) return;
      S.overlay = S.overlay === b.dataset.m ? null : b.dataset.m;
      Store.setOverlay(S.overlay);
      syncMetricButtons();
      if (S.fc) renderHourly(S.fc, S.offset);
    });

    /* search */
    D.geoInput.addEventListener('input', doSearch);
    D.geoInput.addEventListener('focus', () => { if (D.geoInput.value.trim()) doSearch(); });
    D.geoInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const p = D._results && D._results[D._active || 0]; if (p) pickResult(D._active || 0); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); D._active = Math.min((D._results ? D._results.length : 1) - 1, (D._active || 0) + 1); highlightResult(D._active); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); D._active = Math.max(0, (D._active || 0) - 1); highlightResult(D._active); }
      else if (e.key === 'Escape') closeResults();
    });
    D.geoResults.addEventListener('click', e => {
      const item = e.target.closest('.geo-item');
      if (item) pickResult(+item.dataset.i);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-field')) closeResults();
    });

    /* favorites container delegation */
    D.favChips.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (x) {
        e.stopPropagation();
        const place = Store.favorites().find(f => f.id === x.dataset.x);
        if (!place) return;
        confirmRemove('Saved places', place, () => {
          Store.removeFav(place.id);
          renderPinnedRows();
          updatePinBtn();
          toast('Removed “' + place.name + '” from saved places', false, 8000, {
            label: 'Undo',
            run: () => { Store.toggleFav(place); renderPinnedRows(); updatePinBtn(); }
          });
        });
        return;
      }
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.id) {
        const p = Store.favorites().find(f => f.id === chip.dataset.id);
        if (p) selectPlace(p);
      }
    });
    D.recentChips.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (x) {
        e.stopPropagation();
        const place = Store.recent().find(r => r.id === x.dataset.x);
        if (!place) return;
        confirmRemove('Recent', place, () => {
          Store.removeRecent(place.id);
          renderPinnedRows();
          toast('Removed “' + place.name + '” from recent', false, 8000, {
            label: 'Undo',
            run: () => { Store.pushRecent(place); renderPinnedRows(); }
          });
        });
        return;
      }
      const chip = e.target.closest('.chip');
      if (!chip || !chip.dataset.id) return;
      const p = Store.recent().find(r => r.id === chip.dataset.id);
      if (p) selectPlace(p);
    });

    /* confirm dialog — cancel, backdrop click, Escape and the Remove action */
    D.btnConfirmCancel.addEventListener('click', hideConfirm);
    D.confirmOverlay.addEventListener('click', e => {
      if (e.target === D.confirmOverlay) hideConfirm();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !D.confirmOverlay.hidden) hideConfirm();
    });
    D.btnConfirmRemove.addEventListener('click', () => {
      const run = D._confirmRemove;
      hideConfirm();
      if (run) run();
    });

    D.btnPin.addEventListener('click', () => {
      const p = S.place;
      if (!p || !p.id) return;
      /* unpinning a pinned place is also a removal — confirm first */
      if (Store.isFav(p.id)) {
        confirmRemove('Saved places', p, () => {
          Store.toggleFav(p);
          renderPinnedRows();
          updatePinBtn();
          toast('Removed “' + p.name + '” from saved places', false, 8000, {
            label: 'Undo',
            run: () => { Store.toggleFav(p); renderPinnedRows(); updatePinBtn(); }
          });
        });
        return;
      }
      const added = Store.toggleFav(p);
      renderPinnedRows();
      updatePinBtn();
      toast('Pinned “' + p.name + '” to saved places');
    });

    /* locate — precise geolocation, with an IP-based approximate fallback
       (Eagle plugin windows usually don't expose GPS / permissions) */
    D.btnLocate.addEventListener('click', () => {
      if (!navigator.geolocation) {
        locateViaIP('Geolocation is unavailable here — using approximate IP location…');
        return;
      }
      toast('Locating you…');
      let settled = false;
      const finish = (fn) => { if (!settled) { settled = true; fn(); } };
      navigator.geolocation.getCurrentPosition(
        pos => finish(() => {
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          selectPlace({
            id: 'myloc' + Math.round(lat * 10) + '_' + Math.round(lon * 10),
            name: 'My location',
            admin1: '', country: 'lat ' + lat.toFixed(2) + ', lon ' + lon.toFixed(2),
            cc: '', lat, lon, timezone: 'auto'
          });
        }),
        err => {
          const reason = err.code === 1 ? 'permission denied'
            : err.code === 2 ? 'position unavailable'
              : err.code === 3 ? 'timed out' : 'unavailable';
          console.warn('geolocation failed:', reason, err);
          finish(() => locateViaIP('Precise location ' + reason + ' — trying approximate IP location instead…'));
        },
        { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false }
      );
      /* watchdog: some embedded webviews never call back at all */
      setTimeout(() => finish(() => locateViaIP('Precise location timed out — using approximate IP location…')), 9500);
    });

    /* retry */
    D.btnRetryErr.addEventListener('click', () => { if (S.place) loadWeather(S.place); });

    /* poster / eagle / copy — export lets you pick simple vs whole forecast */
    D.btnPoster.addEventListener('click', () => openExportMenu('download'));
    D.btnEagle.addEventListener('click', () => openExportMenu('eagle'));

    /* chooser menu */
    D.exportMenu.addEventListener('click', e => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      closeExportMenu();
      runExport(S.exportAction, item.dataset.style);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#exportMenu') && !e.target.closest('#btnPoster') && !e.target.closest('#btnEagle')) closeExportMenu();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeExportMenu(); });

    D.btnCopy.addEventListener('click', () => {
      if (!S.fc) return;
      const txt = buildSummary();
      const done = () => toast('Summary copied to clipboard');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
      } else fallbackCopy(txt, done);
    });

    /* resize re-render charts */
    const ro = new ResizeObserver(U.debounce(() => {
      if (S.fc) {
        renderHourly(S.fc, S.offset);
        if (Store.days() > 1 && S.fc.daily.length > 1) {
          try { Charts.renderTrend(D.trendChart, S.fc.daily.slice(0, Store.days()), { height: 168 }); } catch (e) { }
        }
      }
    }, 150));
    ro.observe(D.hourlyWrap);
    ro.observe(D.trendWrap);
    S.resObs = ro;

    /* meta ticking */
    setInterval(renderMeta, 30000);
  }

  function readyForPoster() {
    if (!S.fc || !S.place) { toast('Load a place first', true); return false; }
    return true;
  }

  /* export flow: pick layout (simple weather vs whole forecast), then act */
  function openExportMenu(action) {
    if (!readyForPoster()) return;
    S.exportAction = action;
    const m = D.exportMenu;
    m.hidden = false;
    const anchor = action === 'eagle' ? D.btnEagle : D.btnPoster;
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth || 340;
    const mh = m.offsetHeight || 170;
    let left = r.left;
    if (left + mw > window.innerWidth - 10) left = Math.max(10, window.innerWidth - mw - 10);
    let top = r.bottom + 8;
    if (top + mh > window.innerHeight - 10) top = Math.max(10, r.top - mh - 8);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
  }
  function closeExportMenu() { D.exportMenu.hidden = true; }
  async function runExport(action, style) {
    const simple = style === 'simple';
    try {
      const url = Wallpaper.buildPoster(posterState(), style);
      const fname = posterName(style);
      if (action === 'eagle') {
        await Wallpaper.addToEagle(url, fname, [
          'weather',
          S.place ? S.place.name.toLowerCase().replace(/\s+/g, '-') : 'weather',
          simple ? 'simple-weather' : 'forecast', 'skyline-weather'
        ]);
        toast('Added “' + (simple ? 'Simple weather' : 'Whole forecast') + '” poster to your Eagle library ✓');
        try {
          if (window.eagle && window.eagle.notification && window.eagle.notification.show) {
            window.eagle.notification.show({ title: 'Skyline Weather', body: (simple ? 'Simple' : 'Forecast') + ' poster added to your library.' });
          }
        } catch (e) { }
      } else {
        Wallpaper.download(url, fname);
        toast('Saved ' + fname);
      }
    } catch (e) {
      console.error(e);
      toast('Could not export poster: ' + ((e && e.message) || 'unknown'), true);
    }
  }

  function posterName(style) {
    const p = S.place, d = new Date();
    const kind = style === 'simple' ? 'Simple' : 'Forecast';
    return 'Skyline-' + kind + '-' + p.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '-' +
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.png';
  }
  function posterState() {
    return {
      place: S.place, fc: S.fc, cur: S.fc.current, daily: S.fc.daily,
      unit: Store.unit(), nowWall: U.nowWall(S.offset || 0)
    };
  }
  function buildSummary() {
    const cur = S.fc.current, p = S.place;
    const d0 = S.fc.daily[0] || {};
    const m = metric();
    const lines = [];
    lines.push('☀ ' + p.name + ' — ' + Math.round(cur.temp) + '°' + deg().slice(1) + ', ' + U.condName(cur.code).toLowerCase());
    lines.push('H ' + Math.round(d0.tmax) + '° / L ' + Math.round(d0.tmin) + '° · feels ' + Math.round(cur.feels) + '°');
    lines.push('Wind ' + windSpeedFmt(cur.wind) + ' ' + U.shortDeg(cur.wdir) + ' · humidity ' + Math.round(cur.hum) + '% · UV ' + (cur.uv != null ? cur.uv.toFixed(1) : '—'));
    if (d0.pop != null && d0.pop > 0) lines.push('Rain chance today: ' + Math.round(d0.pop) + '%');
    const days = S.fc.daily.slice(0, Store.days());
    lines.push('Next ' + days.length + ' day' + (days.length > 1 ? 's' : '') + ': ' +
      days.map(d => U.fmtDayName(U.wallStamp(d.date)) + ' ' + Math.round(d.tmin) + '/' + Math.round(d.tmax) + '°').join(', '));
    lines.push('Weather by Open-Meteo · generated by Skyline Weather for Eagle');
    return lines.join('\n');
  }
  function fallbackCopy(txt, done) {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { toast('Copy failed', true); }
    ta.remove();
  }

  function syncChips() {
    const daysN = Store.days();
    D.horizonChips.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-on', +c.dataset.days === daysN));
  }

  /* =========================================================
     init
     ========================================================= */
  function boot() {
    /* unit buttons state */
    D.segUnit.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('is-on', b.dataset.unit === Store.unit()));
    syncChips();
    wireEvents();
    renderPinnedRows();

    /* initial place: only what the user actually chose last time.
       If there is none (first run, or location was cleared),
       show the friendly welcome screen instead of a random city. */
    const p = Store.last();
    if (p && p.lat) loadWeather(p);
    else renderEmptyState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
