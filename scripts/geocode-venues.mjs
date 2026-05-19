// One-time geocoder for concert-archive venues.
// Reads the live Google Sheet, geocodes each unique venue via Nominatim,
// merges into public/data/venue-coords.json (preserves existing entries).
//
// Run: node scripts/geocode-venues.mjs

import fs from 'node:fs';
import path from 'node:path';

const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1gxpotmHLzFGaP7GhPWzcEqILO8cB_U0H6YubtvwJ4R4/export?format=csv&gid=1073946958';
const OUT_PATH = path.resolve('public/data/venue-coords.json');
const LOCAL_CSV = path.resolve('public/data/concerts.csv');
const RATE_LIMIT_MS = 1100;
const USER_AGENT = 'davidmccrindle-concert-archive (davidmccrindle@mac.com)';

function parseCSVLine(line) {
  const r = []; let c = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else c += ch;
  }
  r.push(c);
  return r;
}

function keyFor(venue, city, country) {
  return `${venue}|${city}|${country}`.toLowerCase();
}

async function getCSV() {
  try {
    const r = await fetch(SHEETS_CSV_URL);
    if (r.ok) return await r.text();
  } catch {}
  return fs.readFileSync(LOCAL_CSV, 'utf8');
}

async function geocode(venue, city, country) {
  const query = encodeURIComponent(`${venue}, ${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data || !data[0]) return null;
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function main() {
  const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : {};
  const text = await getCSV();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const unique = new Map();
  for (let i = 0; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 8) continue;
    const venue = (cols[5] || '').trim();
    const city = (cols[6] || '').trim();
    const country = (cols[7] || '').trim();
    if (!venue || !city) continue;
    const k = keyFor(venue, city, country);
    if (!unique.has(k)) unique.set(k, { venue, city, country });
  }

  const todo = [...unique.entries()].filter(([k]) => !(k in existing));
  console.log(`Total unique venues: ${unique.size}`);
  console.log(`Already cached:     ${unique.size - todo.length}`);
  console.log(`To geocode:         ${todo.length}`);
  console.log(`Estimated time:     ${Math.ceil((todo.length * RATE_LIMIT_MS) / 1000)}s\n`);

  let done = 0;
  for (const [k, { venue, city, country }] of todo) {
    done++;
    try {
      const coords = await geocode(venue, city, country);
      existing[k] = coords;
      const status = coords ? `[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]` : 'NULL';
      console.log(`${done}/${todo.length}  ${venue}, ${city}  ${status}`);
    } catch (e) {
      console.log(`${done}/${todo.length}  ${venue}, ${city}  ERROR ${e.message}`);
    }
    // Save incrementally so partial runs are not wasted
    if (done % 10 === 0) fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
    await sleep(RATE_LIMIT_MS);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
