// make-logo.js — generates logo.png (128×128) with pure Node (zlib), no deps.
// Run: node scripts/make-logo.js  (writes ./logo.png)
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SIZE = 128;
const SS = 3; // supersampling

/* ---------- minimal PNG encoder ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- tiny math ---------- */
const clamp01 = v => Math.max(0, Math.min(1, v));
function mix(a, b, t) { return a + (b - a) * t; }
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

/* ---------- scene ---------- */
function inCircle(px, py, cx, cy, r) {
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}
function inRoundRect(px, py, x, y, w, h, r) {
  const nx = clamp01((px - x) / w) * w + x;
  const ny = clamp01((py - y) / h) * h + y;
  const dx = px - nx, dy = py - ny;
  return dx * dx + dy * dy <= r * r;
}
function inCloud(px, py) {
  return inCircle(px, py, 44, 96, 17) ||
    inCircle(px, py, 63, 86, 21) ||
    inCircle(px, py, 83, 94, 16) ||
    inRoundRect(px, py, 33, 88, 62, 26, 13);
}

const SKY_TOP = hex('#1d7cf5'), SKY_MID = hex('#4fb2ff'), SKY_BOT = hex('#9bdcff');
const SUN = hex('#ffd05e'), SUN_EDGE = hex('#ff9d4d');
const CLOUD = [255, 255, 255], CLOUD_SHADE = hex('#dcebf9');
const OUT_R = 26; // rounded-corner radius of the icon

const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        // rounded-square mask
        const mask = inRoundRect(px, py, 0, 0, SIZE, SIZE, OUT_R) ? 1 : 0;
        if (!mask) continue;
        const t = py / SIZE;
        let cr, cg, cb;
        const skyMix = t < 0.5 ? mix(SKY_TOP, SKY_MID, t * 2) : mix(SKY_MID, SKY_BOT, (t - 0.5) * 2);
        cr = skyMix;
        cg = skyMix;
        cb = skyMix;
        // sun (upper-right, slightly layered behind nothing)
        const sunC = inCircle(px, py, 92, 36, 17);
        const sunE = !sunC && inCircle(px, py, 92, 36, 20);
        if (sunE) { cr = SUN_EDGE[0]; cg = SUN_EDGE[1]; cb = SUN_EDGE[2]; }
        if (sunC) { cr = SUN[0]; cg = SUN[1]; cb = SUN[2]; }
        // clouds
        const inMain = inCloud(px, py);
        const inBack = inCircle(px, py, 26, 66, 14) || inCircle(px, py, 38, 60, 12);
        if (inBack && !inMain) { cr = CLOUD_SHADE[0]; cg = CLOUD_SHADE[1]; cb = CLOUD_SHADE[2]; }
        if (inMain) { cr = CLOUD[0]; cg = CLOUD[1]; cb = CLOUD[2]; }
        // subtle bottom shade inside cloud
        if (inMain && py > 96) { cr *= 0.97; cg *= 0.97; cb *= 0.99; }
        r += cr; g += cg; b += cb; a += 255;
      }
    }
    const n = SS * SS;
    const i = (y * SIZE + x) * 4;
    rgba[i] = Math.round(r / n);
    rgba[i + 1] = Math.round(g / n);
    rgba[i + 2] = Math.round(b / n);
    rgba[i + 3] = Math.round(a / n);
  }
}

const out = path.join(__dirname, '..', 'logo.png');
fs.writeFileSync(out, encodePNG(SIZE, SIZE, rgba));
console.log('wrote', out, rgba.length, 'bytes ->', fs.statSync(out).size);
