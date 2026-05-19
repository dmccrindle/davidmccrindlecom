// Per-venue coordinate lookup.
// Strategy: load static venue-coords.json (pre-geocoded once), then any
// new venues encountered get geocoded client-side via Nominatim and
// cached in localStorage so the cost is paid once per browser.

const STATIC_URL = '/data/venue-coords.json';
const LS_KEY = 'concert-archive:venue-coords:v1';
const RATE_LIMIT_MS = 1100;

let staticCoords = null;
let localCache = null;
let queue = [];
let running = false;
let onBatchComplete = null;

function key(venue, city, country) {
  return `${venue}|${city}|${country}`.toLowerCase();
}

function loadLocal() {
  if (localCache) return localCache;
  try { localCache = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { localCache = {}; }
  return localCache;
}

function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(localCache)); } catch {}
}

export async function loadVenueCoords() {
  try {
    const r = await fetch(STATIC_URL);
    staticCoords = r.ok ? await r.json() : {};
  } catch { staticCoords = {}; }
  loadLocal();
}

export function getVenueCoords(venue, city, country) {
  if (!venue) return null;
  const k = key(venue, city, country);
  if (staticCoords && k in staticCoords && staticCoords[k]) return staticCoords[k];
  const lc = loadLocal();
  if (k in lc && lc[k]) return lc[k];
  return null;
}

export function setOnBatchComplete(fn) { onBatchComplete = fn; }

export function queueGeocode(venue, city, country) {
  if (!venue) return;
  const k = key(venue, city, country);
  if (staticCoords && k in staticCoords) return;
  const lc = loadLocal();
  if (k in lc) return;
  queue.push({ venue, city, country, key: k });
  if (!running) processQueue();
}

async function processQueue() {
  running = true;
  while (queue.length) {
    const item = queue.shift();
    try {
      const q = encodeURIComponent(`${item.venue}, ${item.city}, ${item.country}`);
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
      if (r.ok) {
        const data = await r.json();
        localCache[item.key] = (data && data[0]) ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
        saveLocal();
      }
    } catch {}
    if (queue.length === 0) {
      if (onBatchComplete) onBatchComplete();
    } else {
      await new Promise((res) => setTimeout(res, RATE_LIMIT_MS));
    }
  }
  running = false;
}
