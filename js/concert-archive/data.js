import { state, SHOWS, setSHOWS } from './state.js';

// City coordinates
export const CITY_COORDS = {
  "Minneapolis, MN": [44.9778, -93.2650], "Minneapolis MN": [44.9778, -93.2650],
  "St Paul, MN": [44.9537, -93.0900], "St. Paul, MN": [44.9537, -93.0900], "Apple Valley, MN": [44.7319, -93.2177],
  "Maplewood MN": [44.9530, -93.0252], "Maplewood, MN": [44.9530, -93.0252],
  "Pasedena, CA": [34.1478, -118.1445], "Los Angeles, CA": [34.0522, -118.2437],
  "Los Angeles CA": [34.0522, -118.2437], "Los Angeles": [34.0522, -118.2437],
  "San Francisco, CA": [37.7749, -122.4194], "San Francisco CA": [37.7749, -122.4194],
  "San Diego CA": [32.7157, -117.1611], "San Diego, CA": [32.7157, -117.1611],
  "Chicago, IL": [41.8781, -87.6298], "Chicago IL": [41.8781, -87.6298],
  "Urbana IL": [40.1106, -88.2073], "Urbana, IL": [40.1106, -88.2073],
  "Milwaukee WI": [43.0389, -87.9065], "Milwaukee, WI": [43.0389, -87.9065],
  "Madison WI": [43.0731, -89.4012], "Madison, WI": [43.0731, -89.4012],
  "Nashville, TN": [36.1627, -86.7816], "Austin, TX": [30.2672, -97.7431],
  "Las Vegas, NV": [36.1699, -115.1398], "Phoenix, AZ": [33.4484, -112.0740],
  "Tempe AZ": [33.4255, -111.9400], "Tempe, AZ": [33.4255, -111.9400],
  "Boston, MA": [42.3601, -71.0589], "Boston MA": [42.3601, -71.0589],
  "New York City, NY": [40.7128, -74.0060], "New York City NY": [40.7128, -74.0060],
  "Brooklyn NY": [40.6782, -73.9442], "Brooklyn, NY": [40.6782, -73.9442],
  "Seattle WA": [47.6062, -122.3321], "Seattle, WA": [47.6062, -122.3321],
  "Spokane WA": [47.6588, -117.4260], "Spokane, WA": [47.6588, -117.4260],
  "Carrboro NC": [35.9101, -79.0753], "Carrboro, NC": [35.9101, -79.0753],
  "Charleston SC": [32.7765, -79.9311], "Charleston, SC": [32.7765, -79.9311],
  "Wembley, London": [51.5074, -0.1278], "Camden, London": [51.5074, -0.1278],
  "London": [51.5074, -0.1278],
  "Glasgow": [55.8642, -4.2518], "Glasgow ": [55.8642, -4.2518],
  "Edinburgh": [55.9533, -3.1883],
  "Dublin": [53.3498, -6.2603],
  "Manchester": [53.4808, -2.2426], "Newcastle": [54.9783, -1.6178], "Newcastle, England": [54.9783, -1.6178],
  "Bristol": [51.4545, -2.5879], "Cardiff": [51.4816, -3.1791],
  "Birmingham": [52.4862, -1.8904], "Leeds": [53.8008, -1.5491],
  "Sheffield": [53.3811, -1.4701], "Sheffield, England": [53.3811, -1.4701], "Norwich": [52.6309, 1.2974],
  "Nottingham": [52.9548, -1.1581], "Brighton": [50.8225, -0.1372],
  "Preston": [53.7632, -2.7031], "Belfast": [54.5973, -5.9301],
  "Aberdeen": [57.1497, -2.0943], "Dundee": [56.4620, -2.9707],
  "Ayr": [55.4588, -4.6298], "Irvine": [55.6139, -4.6689],
  "Reading": [51.4543, -0.9781], "Balado": [56.2050, -3.5350],
  "Berlin": [52.5200, 13.4050],
  "Oslo": [59.9139, 10.7522],
  "Hultsfred": [57.4906, 15.8428],
  "Vancouver, BC": [49.2827, -123.1207],
  "Portland, OR": [45.5051, -122.6750],
  "St. Louis, MO": [38.6270, -90.1994],
  "Lincoln, England": [53.2307, -0.5406],
  "Medina, MN": [45.0325, -93.5852],
};

// UK city to nation mapping
export const UK_CITY_TO_NATION = {
  'Glasgow': 'Scotland', 'Edinburgh': 'Scotland', 'Aberdeen': 'Scotland', 'Dundee': 'Scotland',
  'Ayr': 'Scotland', 'Irvine': 'Scotland', 'Balado': 'Scotland',
  'London': 'England', 'Wembley London': 'England', 'Camden London': 'England',
  'Manchester': 'England', 'Newcastle': 'England', 'Bristol': 'England', 'Birmingham': 'England',
  'Leeds': 'England', 'Sheffield': 'England', 'Norwich': 'England', 'Nottingham': 'England',
  'Brighton': 'England', 'Preston': 'England', 'Reading': 'England',
  'Cardiff': 'Wales', 'Belfast': 'Northern Ireland',
};

// Country info
export const COUNTRY_INFO = {
  'US': { name: 'United States', short: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
  'UK': { name: 'United Kingdom', short: 'UK', flag: '\u{1F1EC}\u{1F1E7}' },
  'IE': { name: 'Ireland', short: 'IE', flag: '\u{1F1EE}\u{1F1EA}' },
  'DE': { name: 'Germany', short: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
  'Germany': { name: 'Germany', short: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
  'Scotland': { name: 'Scotland', short: 'SCO', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}' },
  'England': { name: 'England', short: 'ENG', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}' },
  'Wales': { name: 'Wales', short: 'WAL', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}' },
  'Northern Ireland': { name: 'Northern Ireland', short: 'NIR', flag: '\u{1F1EC}\u{1F1E7}' },
  'Ireland': { name: 'Ireland', short: 'IE', flag: '\u{1F1EE}\u{1F1EA}' },
  'Sweden': { name: 'Sweden', short: 'SE', flag: '\u{1F1F8}\u{1F1EA}' },
  'Norway': { name: 'Norway', short: 'NO', flag: '\u{1F1F3}\u{1F1F4}' },
  'Canada': { name: 'Canada', short: 'CA', flag: '\u{1F1E8}\u{1F1E6}' },
};

// Full name: "🇺🇸 United States" — used in Places list
export function countryDisplay(code) {
  const info = COUNTRY_INFO[code];
  return info ? `${info.flag} ${info.name}` : code;
}

// Flag only — used in show cards
export function countryShort(code) {
  const info = COUNTRY_INFO[code];
  return info ? info.flag : code;
}

// HTML escape utility
export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// CSV parser
function parseCSVLine(line) {
  const r = [];
  let c = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      q = !q;
    } else if (ch === ',' && !q) {
      r.push(c);
      c = '';
    } else {
      c += ch;
    }
  }
  r.push(c);
  return r;
}

const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1gxpotmHLzFGaP7GhPWzcEqILO8cB_U0H6YubtvwJ4R4/export?format=csv&gid=1073946958';

// Fetch and parse CSV data
export async function parseData() {
  try {
    let response = await fetch(SHEETS_CSV_URL).catch(() => null);
    if (!response || !response.ok) response = await fetch('/data/concerts.csv');
    const text = await response.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const shows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 6) continue;

      const rawDate = (cols[0] || '').trim();
      const artist = (cols[1] || '').trim();
      const support = (cols[2] || '').trim();
      const festival = (cols[3] || '').trim().toLowerCase() === 'yes';
      const tour = (cols[4] || '').trim();
      const venue = (cols[5] || '').trim();
      const city = (cols[6] || '').trim();
      let country = (cols[7] || '').trim();

      if (country === 'UK' && UK_CITY_TO_NATION[city]) {
        country = UK_CITY_TO_NATION[city];
      }
      if (!rawDate || !artist) continue;

      // Parse M/D/YYYY → YYYY-MM-DD
      const dp = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const date = dp ? `${dp[3]}-${dp[1].padStart(2, '0')}-${dp[2].padStart(2, '0')}` : rawDate;

      // Geocode
      const coords = CITY_COORDS[city] || [0, 0];
      shows.push({
        date,
        artist,
        support,
        festival,
        tour,
        venue,
        city,
        country,
        lat: coords[0],
        lng: coords[1]
      });
    }

    shows.sort((a, b) => b.date.localeCompare(a.date));
    setSHOWS(shows);
    return shows;
  } catch (error) {
    console.error('Error loading concert data:', error);
    return [];
  }
}

// Show card shared utilities

const DISC_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.45)" stroke-width="1"/><circle cx="6" cy="6" r="2" stroke="rgba(255,255,255,0.45)" stroke-width="1"/><circle cx="6" cy="6" r="0.8" fill="rgba(255,255,255,0.45)"/></svg>`;

const PILL_COLORS = ['#3e0067', '#005267', '#566700', '#674500', '#006748', '#003e67'];

export function tourHtml(tour) {
  if (!tour) return '';
  return `<div class="show-tour">${DISC_SVG}<span>${esc(tour)}</span></div>`;
}

export function supportPillsHtml(support) {
  if (!support) return '';
  return support.split(';').map((x, i) => {
    const name = x.trim();
    if (!name) return '';
    const color = PILL_COLORS[i % PILL_COLORS.length];
    const ne = esc(name).replace(/"/g, '&quot;');
    return `<span class="support-pill show-link" style="border-color:${color}" data-tt="support" data-name="${ne}" data-nav="artist">${esc(name)}</span>`;
  }).filter(Boolean).join('');
}

// Derive years from shows
export function deriveYears() {
  const ys = [...new Set(SHOWS.map(s => parseInt(s.date.split('-')[0])))].sort((a, b) => b - a);
  state.years = ys;
  if (!ys.includes(state.year)) state.year = ys[0] || 2026;
}
