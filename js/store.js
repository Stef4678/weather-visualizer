/* ============================================================
   store.js — preferences, favorite places, recent places and a
   short response cache. Persists to localStorage when available,
   otherwise keeps everything in memory (still fully functional).
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'skyline.weather.v1';
  let mem = null;      // in-memory fallback
  let lsOk = (function () {
    try {
      const k = '__wv_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  const DEFAULTS = {
    unit: 'f',            // 'c' | 'f'
    days: 7,              // 3 | 5 | 7 | 10
    overlay: null,        // null | 'precip' | 'wind' | 'hum' | 'uv'
    favorites: [],        // [{id,name,admin1,country,cc,lat,lon,timezone}]
    recent: [],           // same shape, most recent first
    last: null            // last viewed place (object or {useMy:true})
  };

  function load() {
    if (lsOk) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const o = JSON.parse(raw);
          mem = Object.assign({}, DEFAULTS, o);
          return mem;
        }
      } catch (e) { /* corrupted — fall through */ }
    }
    if (!mem) mem = Object.assign({}, DEFAULTS);
    return mem;
  }
  function persist() {
    if (!lsOk) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { lsOk = false; }
  }

  const Store = {
    get() { return load(); },
    set(patch) { mem = Object.assign(load(), patch); persist(); },

    unit() { return load().unit; },
    setUnit(u) { this.set({ unit: u }); },

    days() { return load().days; },
    setDays(d) { this.set({ days: d }); },

    overlay() { return load().overlay; },
    setOverlay(m) { this.set({ overlay: m }); },

    last() { return load().last; },
    setLast(p) { this.set({ last: p }); },

    favorites() { return load().favorites; },
    isFav(id) { return load().favorites.some(f => f.id === id); },
    toggleFav(p) {
      const s = load();
      const i = s.favorites.findIndex(f => f.id === p.id);
      if (i >= 0) s.favorites.splice(i, 1);
      else s.favorites.unshift(p);
      persist();
      return i < 0;
    },
    removeFav(id) {
      const s = load();
      s.favorites = s.favorites.filter(f => f.id !== id);
      persist();
    },

    recent() { return load().recent; },
    pushRecent(p) {
      const s = load();
      s.recent = s.recent.filter(r => r.id !== p.id);
      s.recent.unshift(p);
      s.recent = s.recent.slice(0, 6);
      persist();
    },
    removeRecent(id) {
      const s = load();
      s.recent = s.recent.filter(r => r.id !== id);
      persist();
    },

    /* tiny forecast cache: key includes place + unit */
    cacheGet(key) {
      if (!lsOk) return null;
      try {
        const raw = localStorage.getItem('skyline.weather.cache.' + key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (Date.now() - o.ts < 1000 * 60 * 3) return o.data;
        localStorage.removeItem('skyline.weather.cache.' + key);
        return null;
      } catch (e) { return null; }
    },
    cacheSet(key, data) {
      if (!lsOk) return;
      try {
        localStorage.setItem('skyline.weather.cache.' + key,
          JSON.stringify({ ts: Date.now(), data }));
      } catch (e) { lsOk = false; }
    }
  };

  window.Store = Store;
})();
