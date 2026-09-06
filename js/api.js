/* ============================================================
   api.js — Open-Meteo client (no API key needed).
   * place search      geocoding-api.open-meteo.com
   * weather forecast  api.open-meteo.com
   * air quality       air-quality-api.open-meteo.com
   All responses are normalized into compact shapes the UI uses.
   ============================================================ */
(function () {
  'use strict';

  const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  const FC = 'https://api.open-meteo.com/v1/forecast';
  const AQ = 'https://air-quality-api.open-meteo.com/v1/air-quality';

  function qs(params) {
    return Object.keys(params)
      .filter(k => params[k] != null && params[k] !== '')
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
  }

  async function getJSON(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 15000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- place search ---------------- */
  function normalizePlace(r) {
    const region = [r.admin1, r.admin2].filter(Boolean).join(', ');
    return {
      id: 'geo' + r.id,
      name: r.name,
      admin1: region || r.country || '',
      country: r.country || '',
      cc: (r.country_code || '').toLowerCase(),
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone || 'auto',
      population: r.population || 0,
      feature: r.feature_code || ''
    };
  }
  async function searchPlaces(query) {
    if (!query || !query.trim()) return [];
    const url = GEO + '?' + qs({
      name: query, count: 8, language: 'en', format: 'json'
    });
    const j = await getJSON(url);
    if (!j || !Array.isArray(j.results)) return [];
    return j.results.map(normalizePlace);
  }

  /* ---------------- units ---------------- */
  function unitParams(metric) {
    return metric
      ? { temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' }
      : { temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch' };
  }

  /* ---------------- forecast ---------------- */
  async function fetchForecast(lat, lon, metric) {
    const params = Object.assign({
      latitude: lat, longitude: lon,
      timezone: 'auto',
      forecast_days: 10,
      current: ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
        'precipitation', 'rain', 'showers', 'snowfall', 'weather_code', 'cloud_cover',
        'pressure_msl', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'visibility', 'uv_index'].join(','),
      hourly: ['temperature_2m', 'apparent_temperature', 'precipitation_probability',
        'precipitation', 'weather_code', 'cloud_cover', 'wind_speed_10m', 'wind_direction_10m',
        'wind_gusts_10m', 'relative_humidity_2m', 'uv_index', 'is_day', 'dew_point_2m'].join(','),
      daily: ['weather_code', 'temperature_2m_max', 'temperature_2m_min',
        'apparent_temperature_max', 'apparent_temperature_min', 'sunrise', 'sunset',
        'daylight_duration', 'uv_index_max', 'precipitation_sum', 'precipitation_probability_max',
        'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant',
        'rain_sum', 'snowfall_sum'].join(',')
    }, unitParams(metric));

    const j = await getJSON(FC + '?' + qs(params));
    return normalizeForecast(j, metric);
  }

  function normalizeForecast(j, metric) {
    const cu = j.current || {};
    const h = j.hourly || {};
    const d = j.daily || {};
    const hourly = [];
    for (let i = 0; i < (h.time || []).length; i++) {
      hourly.push({
        t: h.time[i],
        tz: j.utc_offset_seconds || 0,
        temp: h.temperature_2m && h.temperature_2m[i],
        feels: h.apparent_temperature && h.apparent_temperature[i],
        pop: h.precipitation_probability && h.precipitation_probability[i],
        precip: h.precipitation && h.precipitation[i],
        code: h.weather_code && h.weather_code[i],
        cloud: h.cloud_cover && h.cloud_cover[i],
        wind: h.wind_speed_10m && h.wind_speed_10m[i],
        wdir: h.wind_direction_10m && h.wind_direction_10m[i],
        gust: h.wind_gusts_10m && h.wind_gusts_10m[i],
        hum: h.relative_humidity_2m && h.relative_humidity_2m[i],
        uv: h.uv_index && h.uv_index[i],
        day: h.is_day && h.is_day[i],
        dew: h.dew_point_2m && h.dew_point_2m[i]
      });
    }
    const daily = [];
    for (let i = 0; i < (d.time || []).length; i++) {
      daily.push({
        date: d.time[i],
        tz: j.utc_offset_seconds || 0,
        code: d.weather_code && d.weather_code[i],
        tmax: d.temperature_2m_max && d.temperature_2m_max[i],
        tmin: d.temperature_2m_min && d.temperature_2m_min[i],
        amax: d.apparent_temperature_max && d.apparent_temperature_max[i],
        amin: d.apparent_temperature_min && d.apparent_temperature_min[i],
        sunrise: d.sunrise && d.sunrise[i],
        sunset: d.sunset && d.sunset[i],
        daylight: d.daylight_duration && d.daylight_duration[i],
        uvmax: d.uv_index_max && d.uv_index_max[i],
        pop: d.precipitation_probability_max && d.precipitation_probability_max[i],
        precip: d.precipitation_sum && d.precipitation_sum[i],
        rain: d.rain_sum && d.rain_sum[i],
        snow: d.snowfall_sum && d.snowfall_sum[i],
        wind: d.wind_speed_10m_max && d.wind_speed_10m_max[i],
        gust: d.wind_gusts_10m_max && d.wind_gusts_10m_max[i],
        wdir: d.wind_direction_10m_dominant && d.wind_direction_10m_dominant[i]
      });
    }

    return {
      metric,
      timezone: j.timezone,
      offset: j.utc_offset_seconds || 0,
      current: {
        time: cu.time,
        temp: cu.temperature_2m, hum: cu.relative_humidity_2m,
        feels: cu.apparent_temperature, isDay: !!cu.is_day,
        precip: cu.precipitation, rain: cu.rain, showers: cu.showers, snow: cu.snowfall,
        code: cu.weather_code, cloud: cu.cloud_cover, pressure: cu.pressure_msl,
        wind: cu.wind_speed_10m, wdir: cu.wind_direction_10m, gust: cu.wind_gusts_10m,
        vis: cu.visibility, uv: cu.uv_index
      },
      hourly, daily,
      raw: j
    };
  }

  /* ---------------- air quality ---------------- */
  async function fetchAir(lat, lon) {
    const j = await getJSON(AQ + '?' + qs({
      latitude: lat, longitude: lon,
      current: ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide'].join(','),
      timezone: 'auto'
    }));
    const c = j.current || {};
    return {
      aqi: c.us_aqi,
      pm25: c.pm2_5, pm10: c.pm10, o3: c.ozone,
      no2: c.nitrogen_dioxide, so2: c.sulphur_dioxide, co: c.carbon_monoxide,
      time: c.time
    };
  }

  window.API = { searchPlaces, fetchForecast, fetchAir, unitParams };
})();
