import { state, SHOWS, MONTH_NAMES, LOGO_URL } from './state.js';
import { esc, tourHtml, supportPillsHtml, setlistLinkHtml } from './data.js';
import { flyToCity, getMap, updateMapMarkers, clearHighlightedMarkers } from './map.js';
import { loadAccordionImage, wikiCache, fetchWikiImage } from './api.js';
import { pushRoute, replaceRoute } from './router.js';

const MN = MONTH_NAMES;

const FEATURED_VENUES = [
  { name: 'First Avenue',        color: '#1a1a2a' },
  { name: '7th St Entry',        color: '#3a3a3a' },
  { name: 'Barrowland Ballroom', color: '#c03060' },
  { name: 'Varsity Theater',     color: '#7a7a10' },
  { name: 'Fine Line Music Cafe', color: '#4a4ab0' },
];

function buildFeaturedVenuesHtml() {
  const cards = FEATURED_VENUES.map((v, i) => {
    const sv = v.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `<button class="feat-card" data-wiki="${v.name}" data-wiki-type="venue" style="--fc-bg:${v.color}" onclick="toggleVenue('${sv}')">
    <div class="feat-img"><img src="" alt="${v.name}" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#${i + 1}</div><div class="feat-name">${v.name}</div></div>
  </button>`;
  }).join('\n  ');
  return `<div class="featured-strip">\n  ${cards}\n</div>`;
}

function loadFeaturedImages(container) {
  container.querySelectorAll('.feat-card[data-wiki]').forEach(card => {
    const img = card.querySelector('.feat-img img');
    if (!img || img.getAttribute('src')) return;
    fetchWikiImage(card.dataset.wiki, card.dataset.wikiType || 'venue').then(url => {
      if (url && img) img.src = url;
    });
  });
}

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
  const venuesList = document.getElementById('venues-list');
  const featuredVenues = state.venuesSearch ? '' : buildFeaturedVenuesHtml();
  venuesList.innerHTML = featuredVenues + entries.map(([venue, d]) => {
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
              <div class="show-artist-row">
                <div class="show-artist show-link" data-tt="artist" data-name="${ae}" data-nav="artist">${esc(s.artist)}</div>
                ${setlistLinkHtml(s)}
              </div>
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
  if (featuredVenues) requestAnimationFrame(() => loadFeaturedImages(venuesList));
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
