/* ============================================================
   utils.js — formatters, WMO weather-code maps, moon phase,
   timezone-safe time helpers, misc shared utilities.
   Attaches everything to the global namespace.
   ============================================================ */
(function () {
  'use strict';

  const U = {};

  /* ---------- basics ---------- */
  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const a = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, a), ms);
    };
  };
  U.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  U.round = (v, d) => { const p = Math.pow(10, d == null ? 0 : d); return Math.round(v * p) / p; };

  /* ---------- WMO weather codes → human condition ---------- */
  const WMO = {
    0:  'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    56: 'Freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Heavy freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Light showers', 81: 'Rain showers', 82: 'Violent showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm'
  };
  U.condName = (code) => WMO[code] || 'Unknown';
  U.codeFamily = (code) => {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partly';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'storm';
    return 'cloudy';
  };
  U.rainHeaviness = (code) => [51, 53, 55, 56, 57, 80, 61].includes(code) ? 'light'
    : [63, 65, 66, 67, 81, 82].includes(code) ? 'heavy' : 'light';
  U.snowHeaviness = (code) => [71, 77].includes(code) ? 'light' : 'heavy';
  U.themeKey = (family, isDay) => family + (isDay ? '-day' : '-night');

  /* ---------- wind ---------- */
  const CARD = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  U.windDirText = (deg) => {
    if (deg == null) return '';
    return CARD[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
  };

  /* ---------- UV ---------- */
  U.uvInfo = (uv) => {
    if (uv == null) return null;
    if (uv < 3) return { level: 'Low', cls: '' };
    if (uv < 6) return { level: 'Moderate', cls: 'uv-hi' };
    if (uv < 8) return { level: 'High', cls: 'uv-hi' };
    if (uv < 11) return { level: 'Very high', cls: 'uv-vhi' };
    return { level: 'Extreme', cls: 'uv-vhi' };
  };

  /* ---------- air quality (US AQI) ---------- */
  U.aqiCat = (aqi) => {
    if (aqi == null) return null;
    if (aqi <= 50) return { label: 'Good', color: '#5ce08a' };
    if (aqi <= 100) return { label: 'Moderate', color: '#f6d93d' };
    if (aqi <= 150) return { label: 'Unhealthy (sensitive)', color: '#ff9a3c' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#ff6b57' };
    if (aqi <= 300) return { label: 'Very unhealthy', color: '#c46bd8' };
    return { label: 'Hazardous', color: '#b03a4e' };
  };
  U.aqiNote = (aqi) => {
    if (aqi == null) return '';
    if (aqi <= 50) return 'Air is clean — a great day to open the windows.';
    if (aqi <= 100) return 'Acceptable for most; sensitive people should watch activity outdoors.';
    if (aqi <= 150) return 'Sensitive groups: reduce prolonged outdoor exertion.';
    if (aqi <= 200) return 'Everyone may notice effects; limit outdoor time.';
    return 'Health alert — keep outdoor activity to a minimum.';
  };

  /* ---------- moon phase ---------- */
  U.moonPhase = function (epochMs) {
    const t = (epochMs == null ? Date.now() : epochMs) / 1000;
    // synodic month based on known new moon 2000-01-06T18:14:00Z
    const knownNew = 947182440;
    const synodic = 29.530588853 * 86400;
    let age = ((t - knownNew) % synodic + synodic) % synodic;
    const frac = age / synodic;               // 0..1
    const illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;
    const waxing = frac < 0.5;
    const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
      'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    const idx = Math.round(frac * 8) % 8;
    // next event
    const toFull = (1 - frac) * synodic;
    const nextFullIn = frac < 0.5 ? (0.5 - frac) * synodic : (1.5 - frac) * synodic;
    const nextNewIn = (1 - frac) * synodic;
    return {
      age, frac, illum, waxing, idx,
      name: names[idx],
      nextFullIn, nextNewIn, toFull
    };
  };

  /* ---------- time helpers ----------
     The forecast API returns *local wall-clock* strings for the location,
     plus the location's UTC offset in seconds. We render everything in a
     shifted "wall clock" frame so labels match the place, not the machine. */
  U.parseWall = function (str) {
    // accepts 'YYYY-MM-DD' (daily) and 'YYYY-MM-DDTHH:MM' / 'YYYY-MM-DD HH:MM' (hourly)
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(str || '');
    if (!m) return null;
    return { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0) };
  };
  U.wallStamp = function (str) {
    const p = U.parseWall(str);
    if (!p) return NaN;
    return Date.UTC(p.y, p.mo, p.d, p.h, p.mi);
  };
  U.nowWall = function (offsetSec) {
    return Date.now() + (offsetSec || 0) * 1000; // ms in shifted frame
  };
  U.wallDate = function (epochMs) { return new Date(epochMs); };

  const fmtGuard = function (epochMs) { return Number.isFinite(epochMs); };
  U.fmtClock = function (epochMs) {
    if (!fmtGuard(epochMs)) return '—';
    const d = new Date(epochMs);
    let h = d.getUTCHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' ' + ampm;
  };
  U.fmtH = function (epochMs) {
    if (!fmtGuard(epochMs)) return '';
    const d = new Date(epochMs);
    let h = d.getUTCHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return String(h) + ampm;
  };
  U.fmtDayName = function (epochMs) {
    if (!fmtGuard(epochMs)) return '—';
    return new Date(epochMs).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  };
  U.fmtMonthDay = function (epochMs) {
    if (!fmtGuard(epochMs)) return '—';
    return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
  U.isSameWallDay = function (a, b) {
    if (!fmtGuard(a) || !fmtGuard(b)) return false;
    const A = new Date(a), B = new Date(b);
    return A.getUTCFullYear() === B.getUTCFullYear() &&
      A.getUTCMonth() === B.getUTCMonth() &&
      A.getUTCDate() === B.getUTCDate();
  };
  U.fmtDuration = function (sec) {
    if (sec == null) return '—';
    sec = Math.round(sec / 60) * 60;
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    if (h <= 0) return m + ' min';
    return h + ' h ' + String(m).padStart(2, '0') + ' m';
  };
  U.fmtHM = function (sec) { // seconds past midnight or wall epoch → clock
    const d = new Date(sec);
    let h = d.getUTCHours(); const m = d.getUTCMinutes();
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  };
  U.ago = function (ms) {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return s + ' s ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.floor(h / 24) + ' d ago';
  };

  /* ---------- temperature formatting ---------- */
  U.temp = (v, unit, digits) => (v == null ? '—' : U.round(v, digits == null ? 0 : digits) + '°');
  U.num = (v, digits) => (v == null ? '—' : U.round(v, digits == null ? 0 : digits));

  U.shortDeg = function (deg) {
    if (deg == null) return '';
    let v = ((deg % 360) + 360) % 360;
    const arrow = v <= 22.5 || v > 337.5 ? '↑' : v <= 67.5 ? '↗' : v <= 112.5 ? '→' : v <= 157.5 ? '↘'
      : v <= 202.5 ? '↓' : v <= 247.5 ? '↙' : v <= 292.5 ? '←' : '↖';
    return arrow + ' ' + U.windDirText(deg);
  };

  /* condition "story" suggestion */
  U.suggestion = function (opts) {
    const { family, isDay, temp, precipProb, uv, aqi, snow } = opts;
    if (family === 'storm') return 'Thunderstorms around — stay indoors and unplug sensitive gear.';
    if (family === 'snow') return snow && snow > 3 ? 'Snow accumulating — allow extra travel time.' : 'Snow possible — watch for slick surfaces.';
    if (family === 'rain') {
      const t = temp != null && temp <= 2;
      return t ? 'Cold rain — near freezing, watch for ice.' : precipProb >= 60 ? 'Rain likely — keep an umbrella handy.' : 'Rain in the area — a light jacket helps.';
    }
    if (family === 'fog') return 'Foggy — slow down if you are driving.';
    if (family === 'clear' || family === 'partly') {
      if (isDay && uv != null && uv >= 8) return 'Very strong UV — sunscreen, hat and shades advised.';
      if (isDay && uv != null && uv >= 6) return 'UV is high — sunscreen recommended.';
      if (isDay) return 'Nice weather — great for a walk outside.';
      return 'Clear night — great for stargazing.';
    }
    if (family === 'cloudy') return 'Overcast — still fine for outdoor plans.';
    return '';
  };

  /* visibility conversions */
  U.visText = function (meters, metric) {
    if (meters == null) return '—';
    if (metric) return meters >= 1000 ? U.round(meters / 1000, 1) + ' km' : meters + ' m';
    const mi = meters / 1609.344;
    return mi >= 10 ? Math.round(mi) + ' mi' : U.round(mi, 1) + ' mi';
  };
  U.pressText = function (hpa, metric) {
    if (hpa == null) return '—';
    return metric ? Math.round(hpa) + ' hPa' : U.round(hpa * 0.02953, 2) + ' inHg';
  };
  U.windSpeed = (v, metric) => (v == null ? '—' : Math.round(v) + (metric ? ' km/h' : ' mph'));

  window.Utils = U;
})();
