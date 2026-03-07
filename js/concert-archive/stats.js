import { SHOWS } from './state.js';
import { esc } from './data.js';
import { getArtistData } from './artists.js';

const BRMC_IMG = 'https://www.figma.com/api/mcp/asset/b8c57ea7-5d7e-4ffe-abe1-cab5379d4413';

function top5Artists() {
  const { counts } = getArtistData();
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function top5Venues() {
  const counts = {};
  SHOWS.forEach(s => { if (s.venue) counts[s.venue] = (counts[s.venue] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function top5Places() {
  const counts = {};
  SHOWS.forEach(s => { if (s.city) counts[s.city] = (counts[s.city] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function showsByYear() {
  const counts = {};
  SHOWS.forEach(s => {
    const yr = s.date.split('-')[0];
    if (yr) counts[yr] = (counts[yr] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
}

function barChart(items, color) {
  const max = items[0]?.[1] || 1;
  return `<div class="stats-bar-chart">
    <div class="stats-bar-labels">
      ${items.map(([name, count]) => `<div class="stats-bar-label">${esc(name)}</div>`).join('')}
    </div>
    <div class="stats-bar-bars">
      ${items.map(([name, count]) => `<div class="stats-bar" data-tooltip="${esc(name)}: ${count}" style="width:${Math.round(count / max * 100)}%;background:${color}"></div>`).join('')}
    </div>
  </div>`;
}

export function renderStats() {
  const body = document.getElementById('stats-body');
  if (!body) return;

  const artists = top5Artists();
  const venues = top5Venues();
  const places = top5Places();
  const years = showsByYear();
  const topArtist = artists[0]?.[0] || '';
  const yearMax = Math.max(...years.map(([, c]) => c), 1);

  body.innerHTML = `
    <div class="stats-content">
      ${topArtist ? `
      <div class="stats-hero" style="background-image:url('${BRMC_IMG}')">
        <div class="stats-hero-overlay"></div>
        <div class="stats-hero-info">
          <div class="stats-hero-rank">#1!!!</div>
          <div class="stats-hero-name">${esc(topArtist)}</div>
        </div>
      </div>` : ''}
      <div class="stats-charts">
        <div class="stats-chart-col">
          <div class="stats-chart-title">Top 5 Artists</div>
          ${barChart(artists, '#38a6f5')}
        </div>
        <div class="stats-chart-col">
          <div class="stats-chart-title">Top 5 Venues</div>
          ${barChart(venues, '#f56738')}
        </div>
        <div class="stats-chart-col">
          <div class="stats-chart-title">Top 5 Places</div>
          ${barChart(places, '#05bd59')}
        </div>
      </div>
      <div class="stats-year-chart">
        <div class="stats-chart-title">Shows by Year</div>
        <div class="stats-year-bars">
          ${years.map(([yr, count]) =>
            `<div class="stats-year-bar-wrap" data-tooltip="${yr}: ${count}">
              <div class="stats-year-bar" style="height:${Math.round(count / yearMax * 100)}%"></div>
            </div>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

export function toggleStats() {
  const acc = document.getElementById('stats-accordion');
  if (!acc) return;
  const isOpen = acc.classList.toggle('open');
  if (isOpen) renderStats();
}
