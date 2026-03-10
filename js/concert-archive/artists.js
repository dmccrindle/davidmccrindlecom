import { state, SHOWS, MONTH_NAMES, LOGO_URL } from './state.js';
import { esc, countryShort } from './data.js';
import { getMap, updateMapMarkers, flyToCity } from './map.js';
import { loadAccordionImage, wikiCache } from './api.js';
import { pushRoute, replaceRoute } from './router.js';

const MN = MONTH_NAMES;

const FEATURED_ARTISTS_HTML = `<div class="featured-strip">
  <button class="feat-card" style="--fc-bg:#8c8c8c" onclick="toggleArtist('Black Rebel Motorcycle Club')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/4b4baa37-e325-4e34-a77f-cd2cd8771783" alt="Black Rebel Motorcycle Club" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#1</div><div class="feat-name">Black Rebel Motorcycle Club</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#f15058" onclick="toggleArtist('Travis')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/6256c66f-a3b3-4269-99e2-8a5da9b72241" alt="Travis" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#2</div><div class="feat-name">Travis</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#d9ab5a" onclick="toggleArtist('Howler')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/d40fa5c6-3c5a-4cf1-8c52-344ca5c0439a" alt="Howler" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#3</div><div class="feat-name">Howler</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#5090ac" onclick="toggleArtist('Strange Names')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/05d2f3a6-aa98-495d-86f3-79f368068b52" alt="Strange Names" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#4</div><div class="feat-name">Strange Names</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#324870" onclick="toggleArtist('Idlewild')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/e1f52e31-c99f-4d65-b608-97076f92ec3a" alt="Idlewild" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#5</div><div class="feat-name">Idlewild</div></div>
  </button>
</div>`;

// Strip leading "The " for sorting so "The Black Angels" files under B
function sortKey(name) {
  return name.replace(/^the\s+/i, '').trim();
}

export function getArtistData() {
  const counts = {}, byArtist = {};
  SHOWS.forEach(s => {
    // For festival shows, skip the headliner (artist col = the festival name)
    // but still include support acts who performed at the festival
    const names = s.festival ? [s.support] : [s.artist, s.support];
    names.filter(Boolean).forEach(a => {
      a.split(';').map(x => x.trim()).filter(Boolean).forEach(name => {
        counts[name] = (counts[name] || 0) + 1;
        if (!byArtist[name]) byArtist[name] = [];
        byArtist[name].push(s);
      });
    });
  });
  return { counts, byArtist };
}

export function renderArtists(animate) {
  const { counts, byArtist } = getArtistData();
  let artists = Object.keys(counts);
  if (state.artistsSearch) {
    const q = state.artistsSearch.toLowerCase();
    artists = artists.filter(a => a.toLowerCase().includes(q));
  }
  const isAlpha = state.sortMode === 'alpha-asc' || state.sortMode === 'alpha-desc';
  if (state.sortMode === 'alpha-asc') artists.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  else if (state.sortMode === 'alpha-desc') artists.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  else artists.sort((a, b) => counts[b] - counts[a]);

  let idx = 0;
  let currentLetter = null;
  const c = document.getElementById('artists-list');
  c.innerHTML = FEATURED_ARTISTS_HTML + artists.map(a => {
    // Letter group divider (alpha mode only)
    let divider = '';
    if (isAlpha) {
      const first = sortKey(a)[0]?.toUpperCase() || '#';
      const letter = /[0-9]/.test(first) ? '#' : first;
      if (letter !== currentLetter) {
        currentLetter = letter;
        divider = `<div class="artist-letter-group">${letter}</div>`;
      }
    }
    const isExp = state.expandedArtist === a;
    const sa = a.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    let acc = '';
    if (isExp) {
      const imgId = 'acc-artist-' + (idx);
      const sorted = byArtist[a].slice().sort((x, y) => y.date.localeCompare(x.date));
      const cached = wikiCache['artist:' + a];
      const loaderHtml = cached ? '' : `<div class="accordion-loader" id="${imgId}-loader"><img src="${LOGO_URL}" alt=""></div>`;
      const imgHtml = cached?.img
        ? `<div class="accordion-img loaded"><img src="${cached.img}" class="show" alt=""></div>`
        : `<div class="accordion-img" id="${imgId}"><img alt=""></div>`;
      acc = `<div class="artist-accordion">${loaderHtml}${imgHtml}${sorted.map(s => {
          const [yr, mo, dy] = s.date.split('-');
          const loc = [s.city, s.country ? countryShort(s.country) : null].filter(Boolean).join(', ');
          // If this artist was a support act on this show, show the headliner on the right instead
          const wasSupport = s.support && s.support.split(';').map(x => x.trim()).includes(a);
          const rightText = wasSupport ? s.artist : s.support;
          return `<div class="show-card" style="animation-delay:0ms">
            <div class="show-day">
              <span class="show-day-month">${MN[parseInt(mo)-1].slice(0,3)}</span>
              <span class="show-day-num">${parseInt(dy)}</span>
              <span class="show-day-year">${yr}</span>
            </div>
            <div class="show-venue-col">
              <div class="show-venue">${esc(s.venue)}</div>
              <div class="show-location">${esc(loc)}</div>
            </div>
            ${rightText ? `<div class="show-support-right">${esc(rightText)}</div>` : ''}
          </div>`;
        }).join('')}</div>`;
      if (!cached) setTimeout(() => loadAccordionImage(imgId, a, 'artist'), 50);
    }
    return `${divider}<div class="artist-row${isExp ? ' expanded' : ''}${animate ? ' animate' : ''}" tabindex="0" role="button" style="animation-delay:${(idx++)*25}ms" onclick="toggleArtist('${sa}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleArtist('${sa}')}">
      <div class="artist-row-header">
        <div class="artist-chevron">›</div>
        <div class="artist-name">${esc(a)}</div>
        <div class="artist-badge">${counts[a]}</div>
      </div>
      ${acc}
    </div>`;
  }).join('');
}

export function toggleArtist(a) {
  const wasExpanded = state.expandedArtist === a;
  state.expandedArtist = wasExpanded ? null : a;
  const scrollEl = document.getElementById('artists-list');
  const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  renderArtists(false);
  if (scrollEl) scrollEl.scrollTop = scrollTop;
  if (!wasExpanded) {
    requestAnimationFrame(() => {
      const el = document.querySelector('.artist-row.expanded');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    const map = getMap();
    if (map) {
      const { byArtist } = getArtistData();
      const artistShows = byArtist[a] || [];
      updateMapMarkers(artistShows);
      const pts = artistShows.filter(s => s.lat).map(s => [s.lat, s.lng]);
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 10, duration: 1 });
      } else if (pts.length === 1) {
        map.flyTo(pts[0], 8, { duration: 1 });
      }
    }
  } else if (wasExpanded) {
    const map = getMap();
    if (map) {
      updateMapMarkers();
      map.setView([30, 5], 2.5);
    }
  }
  pushRoute();
}

export function setSortMode(m) {
  if (m === 'alpha') {
    state.sortMode = state.sortMode === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc';
  } else {
    state.sortMode = 'most';
  }
  const alphaBtn = document.getElementById('btn-alpha');
  const crownBtn = document.getElementById('btn-crown');
  if (alphaBtn) alphaBtn.textContent = state.sortMode === 'alpha-desc' ? 'Z-A' : 'A-Z';
  if (crownBtn) crownBtn.classList.toggle('active', state.sortMode === 'most');
  renderArtists(true);
  replaceRoute();
}

