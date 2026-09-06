# Skyline Weather — an Eagle plugin

A beautiful, visual weather dashboard that runs as a **window plugin** inside
[Eagle](https://eagle.cool) 4 (and also works when opened in any modern browser
during development).

Built with zero runtime dependencies. All weather data comes from the free,
no-API-key **[Open-Meteo](https://open-meteo.com)** APIs.

---

## Screenshots

![Skyline Weather — main dashboard](assets/screenshot%20main.jpg)

<div align="center">
  <img src="assets/Screenshot%202026-09-06%20085642.png" alt="Skyline Weather screenshot 2" width="46%"/>
  <img src="assets/Screenshot%202026-09-06%20085652.png" alt="Skyline Weather screenshot 3" width="46%"/>
  <img src="assets/Screenshot%202026-09-06%20085658.png" alt="Skyline Weather screenshot 4" width="46%"/>
  <img src="assets/Screenshot%202026-09-06%20085716.png" alt="Skyline Weather screenshot 5" width="46%"/>
</div>

---

## Features

- **Animated, theme-aware UI** — the whole app recolors itself to the current
  weather: deep blues for clear days, starfields at night, stormy purple for
  thunderstorms, drifting animated SVG weather icons (sun rays, rain, snow,
  lightning, fog, wind…).
- **Current conditions hero** with big temperature, feels-like, hi/lo and
  detail tiles: humidity, dew point, wind (direction + gusts), UV index,
  pressure, visibility, cloud cover, precipitation.
- **Hourly forecast** — interactive 48-hour SVG chart. Hover any hour for a
  tooltip. Switchable overlay series: precipitation probability, wind,
  humidity, UV.
- **Daily / weekly forecast for 3 · 5 · 7 · 10 days** — temperature-range
  trend chart + day cards (condition, precip chance/amount, hi/lo range bar,
  sunrise, sunset, wind, UV).
- **Unit toggle °C/°F** — °C uses km/h + mm, °F uses mph + in (kept consistent).
- **City / place search** — geocoding with autocomplete, plus pinned favorites,
  a recent-places list and "use my location".
- **Extra widgets (bonus ideas):**
  - **Air quality** (US AQI) ring gauge + pollutant chips (PM2.5, PM10, O₃, NO₂, SO₂, CO).
  - **Sun & Moon card** — live sun-path arc with current position, daylight
    length, computed moon phase glyph & illumination.
  - **UV index gauge** and weather-based *"tip of the hour"* suggestions
    (umbrella / sunscreen / snow chains…).
  - **Wallpaper export** — at export time choose between a clean **Simple
    weather** poster (city, big temperature & current condition) or the
    **Whole forecast** poster (hero + detail stats + 7-day outlook), then save
    it straight into your Eagle library (`eagle.item.addFromBase64`) or
    download it as PNG.
  - **Copy summary** to clipboard, auto-refresh every 10 minutes, refresh
    button, "updated X ago" indicator.
- Fully **responsive**: single-column layout on narrow windows, multi-column
  dashboard on wide ones.

---

## Install (packaged)

1. Build (or grab) the release file: `release/SkylineWeather-1.0.0.eagleplugin`.
2. Double-click it (or drag it onto Eagle / right-click → install) — Eagle 4
   handles the rest.

## Install (development / live reload)

1. Copy this whole folder (the one containing `manifest.json`) anywhere you like.
2. In Eagle: click the **Plugin** button on the toolbar → **Developer Options** →
   **Install from folder / Create plugin**, point it at this folder (or place it
   into your Eagle plugins directory) and enable dev tools if you want to debug.
3. Click the plugin entry to open the window.

Eagle reloads `index.html` each time the window opens, so editing the HTML/CSS/JS
and reopening the plugin window is enough during development.

## Run standalone in a browser (no Eagle)

The plugin is a plain web app with no Eagle API requirement; only the
"save to library" button needs Eagle. Serve the folder, e.g.:

```powershell
python -m http.server 8899   # then open http://127.0.0.1:8899
```

(Opening `index.html` directly via `file://` mostly works too, but a tiny static
server is safer for fetch + clipboard.)

---

## Project structure

```
├─ manifest.json          Eagle 4 window-plugin manifest (id, logo, window size…)
├─ logo.png               plugin icon (128×128, generated)
├─ index.html             app shell
├─ css/styles.css         design system, weather themes, animations
├─ js/
│  ├─ utils.js            formatters, WMO condition maps, moon phase math
│  ├─ store.js            preferences / favorites / cache (localStorage w/ fallback)
│  ├─ icons.js            animated SVG weather-icon engine
│  ├─ api.js              Open-Meteo geocoding + forecast + air-quality client
│  ├─ charts.js           SVG chart renderers (hourly 48 h, daily range trend)
│  ├─ wallpaper.js        canvas poster generator + Eagle/PNG export
│  └─ app.js              state, search, rendering pipeline
├─ scripts/
│  ├─ make-logo.js        regenerates logo.png (pure Node, no deps)
│  └─ build.ps1           packages release/*.eagleplugin
└─ README.md
```

## Privacy

- No tracking, no analytics, no keys. Your city queries and pinned places stay
  in local plugin storage.
- Weather data requests go to `api.open-meteo.com` /
  `geocoding-api.open-meteo.com` / `air-quality-api.open-meteo.com` only.
- **My location** uses your device's GPS when the webview allows it. Inside
  Eagle this is usually blocked, so the plugin automatically falls back to an
  approximate location from one of three public, keyless IP-geolocation
  services (`ipwho.is`, `get.geojs.io`, `freeipapi.com`); results are clearly
  marked “≈ IP location”. No IP lookup ever happens unless you press that
  button.
- Attribution: weather data by [Open-Meteo](https://open-meteo.com)
  (CC BY 4.0).

## Requirements

- **Eagle 4** desktop app (Windows or macOS).
- An internet connection — weather, search and air-quality data come from the
  free [Open-Meteo](https://open-meteo.com) APIs.
- No API keys, no runtime dependencies, no build step required to run.

> Tip: the plugin is plain HTML/CSS/JS — it also runs in any modern browser
> (serve the folder with `python -m http.server 8899`), so you can preview it
> without Eagle.

## Installation

1. Grab the latest package: `release/SkylineWeather-1.0.0.eagleplugin` (or a
   GitHub Release asset).
2. **Double-click** the `.eagleplugin` file, or drag it onto the Eagle window,
   or right-click → install.
3. Open it from the **Plugin** button on the Eagle toolbar → **Skyline Weather**.

### Development install

1. Copy the folder containing `manifest.json` anywhere you like.
2. In Eagle: Plugin → **Developer Options** → install from folder (or place it
   into your Eagle plugins directory).
3. Re-open the plugin window after editing to reload the HTML/CSS/JS.

## Usage

- **Pick a place** — type any city into the search bar and choose a suggestion,
  press **My location** (GPS, with an automatic “≈ IP location” fallback when
  Eagle blocks GPS), or tap a popular/favorite/recent chip.
- **°C / °F** — the unit toggle in the top bar switches everything
  (temperatures, wind, precipitation).
- **Forecast range** — chips switch between Today / 3 / 5 / 7 / 10 days.
- **Hourly** — hover the 48-hour chart for details; use **Rain % / Wind /
  Humidity / UV** to overlay another series.
- **Export** — “Save wallpaper PNG” or “Add to Eagle library” lets you pick a
  **Simple weather** poster or the **Whole forecast** poster.
- **Refresh** — the ↻ button forces a fresh fetch (skips the 3-minute cache);
  the app also auto-refreshes every 10 minutes.
- **Clear** — the ✕ next to the city name clears the location; the app then
  reopens on the welcome screen instead of restoring a city.

## Troubleshooting

| Problem | Solution |
| --- | --- |
| “Location unavailable” | Eagle webviews usually block GPS. My location falls back to an approximate IP location automatically. If that also fails (offline), search your city by name. |
| Weather won't load | Check your connection — requests go to `api.open-meteo.com`. Click **↻ Refresh** (it bypasses the cache) or use the **Retry** button on the error card. |
| Data looks stale | Press **↻ Refresh** — normal loads may reuse a 3-minute cache, refresh never does. |
| Search shows no results | Search needs the geocoding API; check connectivity and try pressing Enter. |
| Old version renders results behind panels | That stacking bug was fixed — update to the latest package. |
| Duplicate plugin entries | The plugin ID is a UUID now; if an older entry with the legacy ID is still installed, remove it in Eagle → Plugins. |

## Contact

- GitHub: [Stef4678/weather-visualizer](https://github.com/Stef4678/weather-visualizer)
- Email: [stefaninfp@gmail.com](mailto:stefaninfp@gmail.com)

## License

MIT © 2026 Kerekes Stefan
