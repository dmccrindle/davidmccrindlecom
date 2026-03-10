import { state, SHOWS, MONTH_NAMES, LOGO_URL } from './state.js';
import { esc, tourHtml, supportPillsHtml } from './data.js';
import { flyToCity, getMap, updateMapMarkers, clearHighlightedMarkers } from './map.js';
import { loadAccordionImage, wikiCache } from './api.js';
import { pushRoute, replaceRoute } from './router.js';

const MN = MONTH_NAMES;

const FEATURED_VENUES_HTML = `<div class="featured-strip">
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="toggleVenue('First Avenue')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/4b4baa37-e325-4e34-a77f-cd2cd8771783" alt="First Avenue" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#1</div><div class="feat-name">First Avenue</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="toggleVenue('Barrowland Ballroom')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/6256c66f-a3b3-4269-99e2-8a5da9b72241" alt="Barrowland Ballroom" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#2</div><div class="feat-name">Barrowland Ballroom</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="toggleVenue('The Garage')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/d40fa5c6-3c5a-4cf1-8c52-344ca5c0439a" alt="The Garage" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#3</div><div class="feat-name">The Garage</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="toggleVenue('Liquid Room')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/05d2f3a6-aa98-495d-86f3-79f368068b52" alt="Liquid Room" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#4</div><div class="feat-name">Liquid Room</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="toggleVenue('Bowery Ballroom')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/e1f52e31-c99f-4d65-b608-97076f92ec3a" alt="Bowery Ballroom" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#5</div><div class="feat-name">Bowery Ballroom</div></div>
  </button>
</div>`;

export function getVenueData() {
  const v = {}, byVenue = {};
  SHOWS.forEach(s => {
    const k = s.venue;
    if (!v[k]) v[k] = { count: 0, city: s.city };
    v[k].count++;
    if (!byVenue[k]) byVenue[k] = [];
    byVenue[k].push(s);
  });
  return { counts: v, byVenue };
}

export function renderVenues(animate) {
  const { counts, byVenue } = getVenueData();
  let entries = Object.entries(counts);
  if (state.venuesSearch) {
    const q = state.venuesSearch.toLowerCase();
    entries = entries.filter(([name, d]) => name.toLowerCase().includes(q) || (d.city || '').toLowerCase().includes(q));
  }
  if (state.venuesSortMode === 'most') entries.sort((a, b) => b[1].count - a[1].count);
  else if (state.venuesSortMode === 'alpha-asc') entries.sort((a, b) => a[0].localeCompare(b[0]));
  else entries.sort((a, b) => b[0].localeCompare(a[0]));
  let idx = 0;
  document.getElementById('venues-list').innerHTML = FEATURED_VENUES_HTML + entries.map(([venue, d]) => {
    const isExp = state.expandedVenue === venue;
    const sv = venue.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    let acc = '';
    if (isExp) {
      const imgId = 'acc-venue-' + (idx);
      const sorted = byVenue[venue].slice().sort((a, b) => b.date.localeCompare(a.date));
      const cached = wikiCache['venue:' + venue];
      const loaderHtml = cached ? '' : `<div class="accordion-loader" id="${imgId}-loader"><img src="${LOGO_URL}" alt=""></div>`;
      const imgHtml = cached?.img
        ? `<div class="accordion-img loaded"><img src="${cached.img}" class="show" alt=""></div>`
        : `<div class="accordion-img" id="${imgId}"><img alt=""></div>`;
      acc = `<div class="artist-accordion">${loaderHtml}${imgHtml}${sorted.map(s => {
          const [yr, mo, dy] = s.date.split('-');
          const ae = esc(s.artist).replace(/"/g, '&quot;');
          const pills = supportPillsHtml(s.support);
          return `<div class="show-card" style="animation-delay:0ms">
            <div class="show-day">
              <span class="show-day-month">${MN[parseInt(mo)-1].slice(0,3)}</span>
              <span class="show-day-num">${parseInt(dy)}</span>
              <span class="show-day-year">${yr}</span>
            </div>
            <div class="show-artist-col">
              <div class="show-artist show-link" data-tt="artist" data-name="${ae}" data-nav="artist">${esc(s.artist)}</div>
              ${tourHtml(s.tour)}
              ${pills ? `<div class="show-support">${pills}</div>` : ''}
            </div>
          </div>`;
        }).join('')}</div>`;
      if (!cached) setTimeout(() => loadAccordionImage(imgId, venue, 'venue'), 50);
    }
    return `<div class="venue-row${isExp ? ' expanded' : ''}${animate ? ' animate' : ''}" tabindex="0" role="button" style="animation-delay:${(idx++)*25}ms" onclick="toggleVenue('${sv}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleVenue('${sv}')}">
      <div class="venue-row-header">
        <div class="venue-chevron">›</div>
        <div style="flex:1;min-width:0">
          <div class="venue-name">${esc(venue)}</div>
          <div class="place-sub">${esc(d.city)}</div>
        </div>
        <div class="artist-badge">${d.count}</div>
      </div>
      ${acc}
    </div>`;
  }).join('');
}

export function toggleVenue(v) {
  const wasExpanded = state.expandedVenue === v;
  state.expandedVenue = wasExpanded ? null : v;
  if (!wasExpanded) {
    const show = SHOWS.find(s => s.venue === v);
    if (show) flyToCity(show.city);
  }
  const scrollEl = document.getElementById('venues-list');
  const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  renderVenues(false);
  if (scrollEl) scrollEl.scrollTop = scrollTop;
  if (!wasExpanded) {
    requestAnimationFrame(() => {
      const el = document.querySelector('.venue-row.expanded');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  } else {
    const map = getMap();
    if (map) {
      clearHighlightedMarkers();
      updateMapMarkers();
      map.setView([30, 5], 2.5);
    }
  }
  pushRoute();
}

export function setVenuesSortMode(m) {
  if (m === 'alpha') {
    state.venuesSortMode = state.venuesSortMode === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc';
  } else {
    state.venuesSortMode = 'most';
  }
  const alphaBtn = document.getElementById('btn-venue-alpha');
  const crownBtn = document.getElementById('btn-venue-crown');
  if (alphaBtn) alphaBtn.textContent = state.venuesSortMode === 'alpha-desc' ? 'Z-A' : 'A-Z';
  if (crownBtn) crownBtn.classList.toggle('active', state.venuesSortMode === 'most');
  renderVenues(true);
  replaceRoute();
}
