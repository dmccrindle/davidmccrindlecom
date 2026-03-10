import { state, SHOWS, MONTH_NAMES, LOGO_URL } from './state.js';
import { countryDisplay, countryShort, esc, tourHtml, supportPillsHtml } from './data.js';
import { flyToCity, flyToCountry, getMap, updateMapMarkers, clearHighlightedMarkers } from './map.js';
import { loadAccordionImage, wikiCache, fetchWikiImage } from './api.js';
import { pushRoute, replaceRoute } from './router.js';

const MN = MONTH_NAMES;

const FEATURED_PLACES_HTML = `<div class="featured-strip">
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="togglePlace('Minneapolis')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/4b4baa37-e325-4e34-a77f-cd2cd8771783" alt="Minneapolis" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#1</div><div class="feat-name">Minneapolis</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="togglePlace('London')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/6256c66f-a3b3-4269-99e2-8a5da9b72241" alt="London" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#2</div><div class="feat-name">London</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="togglePlace('Glasgow')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/d40fa5c6-3c5a-4cf1-8c52-344ca5c0439a" alt="Glasgow" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#3</div><div class="feat-name">Glasgow</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="togglePlace('Edinburgh')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/05d2f3a6-aa98-495d-86f3-79f368068b52" alt="Edinburgh" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#4</div><div class="feat-name">Edinburgh</div></div>
  </button>
  <button class="feat-card" style="--fc-bg:#6b6b6b" onclick="togglePlace('New York')">
    <div class="feat-img"><img src="https://www.figma.com/api/mcp/asset/e1f52e31-c99f-4d65-b608-97076f92ec3a" alt="New York" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">#5</div><div class="feat-name">New York</div></div>
  </button>
</div>`;

export function getPlaceData() {
  const byCity = {};
  SHOWS.forEach(s => {
    const k = s.city;
    if (!byCity[k]) byCity[k] = { count: 0, country: s.country, shows: [] };
    byCity[k].count++;
    byCity[k].shows.push(s);
  });
  return byCity;
}

export function renderPlaces(animate) {
  const byCity = getPlaceData();
  const countryCounts = {};
  SHOWS.forEach(s => { const k = s.country || 'Unknown'; countryCounts[k] = (countryCounts[k] || 0) + 1; });

  // Update group toggle button label with count
  const groupBtn = document.getElementById('btn-places-group');
  if (groupBtn) {
    const lbl = groupBtn.querySelector('.places-group-label');
    if (lbl) {
      const count = state.placesGroup === 'cities' ? Object.keys(byCity).length : Object.keys(countryCounts).length;
      lbl.textContent = `${state.placesGroup === 'cities' ? 'Cities' : 'Countries'} (${count})`;
    }
  }

  if (state.placesGroup === 'countries') {
    let entries = Object.entries(countryCounts);
    if (state.placesSearch) {
      const q = state.placesSearch.toLowerCase();
      entries = entries.filter(([country]) => country.toLowerCase().includes(q));
    }
    if (state.placesSortMode === 'most') entries.sort((a, b) => b[1] - a[1]);
    else if (state.placesSortMode === 'alpha-asc') entries.sort((a, b) => a[0].localeCompare(b[0]));
    else entries.sort((a, b) => b[0].localeCompare(a[0]));
    let idx = 0;
    document.getElementById('places-list').innerHTML = FEATURED_PLACES_HTML + entries.map(([country, count]) => {
      const sc = country.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<div class="place-row${animate ? ' animate' : ''}" tabindex="0" role="button" style="animation-delay:${(idx++)*30}ms" onclick="flyToCountry('${sc}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();flyToCountry('${sc}')}">
        <div class="place-row-header">
          <div class="place-name">${countryDisplay(country)}</div>
          <div class="artist-badge">${count}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    let entries = Object.entries(byCity);
    if (state.placesSearch) {
      const q = state.placesSearch.toLowerCase();
      entries = entries.filter(([city]) => city.toLowerCase().includes(q));
    }
    if (state.placesSortMode === 'most') entries.sort((a, b) => b[1].count - a[1].count);
    else if (state.placesSortMode === 'alpha-asc') entries.sort((a, b) => a[0].localeCompare(b[0]));
    else entries.sort((a, b) => b[0].localeCompare(a[0]));
    let idx = 0;
    document.getElementById('places-list').innerHTML = FEATURED_PLACES_HTML + entries.map(([city, d]) => {
      const sc = city.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const isExp = state.expandedPlace === city;
      let acc = '';
      if (isExp) {
        const imgId = 'acc-place-' + (idx);
        const sorted = d.shows.slice().sort((a, b) => b.date.localeCompare(a.date));
        const cached = wikiCache['city:' + city];
        const loaderHtml = cached ? '' : `<div class="accordion-loader" id="${imgId}-loader"><img src="${LOGO_URL}" alt=""></div>`;
        const imgHtml = cached?.img
          ? `<div class="accordion-img loaded"><img src="${cached.img}" class="show" alt=""></div>`
          : `<div class="accordion-img" id="${imgId}"><img alt=""></div>`;
        acc = `<div class="artist-accordion">${loaderHtml}${imgHtml}${sorted.map(s => {
            const [yr, mo, dy] = s.date.split('-');
            const ae = esc(s.artist).replace(/"/g, '&quot;');
            const ve = esc(s.venue).replace(/"/g, '&quot;');
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
              <div class="show-venue-col">
                <div class="show-venue show-link" data-tt="venue" data-name="${ve}" data-nav="venue">${esc(s.venue)}</div>
              </div>
            </div>`;
          }).join('')}</div>`;
        if (!cached) setTimeout(() => loadAccordionImage(imgId, city, 'city'), 50);
      }
      return `<div class="place-row${isExp ? ' expanded' : ''}${animate ? ' animate' : ''}" tabindex="0" role="button" style="animation-delay:${(idx++)*30}ms" onclick="togglePlace('${sc}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePlace('${sc}')}">
        <div class="place-row-header">
          <div class="place-chevron">›</div>
          <div style="flex:1;min-width:0">
            <div class="place-name">${esc(city)}</div>
            <div class="place-sub">${countryDisplay(d.country)}</div>
          </div>
          <div class="artist-badge">${d.count}</div>
        </div>
        ${acc}
      </div>`;
    }).join('');
  }
}

export function togglePlace(c) {
  const wasExpanded = state.expandedPlace === c;
  state.expandedPlace = wasExpanded ? null : c;
  if (!wasExpanded) flyToCity(c);
  const scrollEl = document.getElementById('places-list');
  const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  renderPlaces(false);
  if (scrollEl) scrollEl.scrollTop = scrollTop;
  if (!wasExpanded) {
    requestAnimationFrame(() => {
      const el = document.querySelector('.place-row.expanded');
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

export function setPlacesSortMode(m) {
  if (m === 'alpha') {
    state.placesSortMode = state.placesSortMode === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc';
  } else {
    state.placesSortMode = 'most';
  }
  const alphaBtn = document.getElementById('btn-place-alpha');
  const crownBtn = document.getElementById('btn-place-crown');
  if (alphaBtn) alphaBtn.textContent = state.placesSortMode === 'alpha-desc' ? 'Z-A' : 'A-Z';
  if (crownBtn) crownBtn.classList.toggle('active', state.placesSortMode === 'most');
  renderPlaces(true);
  replaceRoute();
}

export function setPlacesGroup(g) {
  state.placesGroup = g;
  renderPlaces(true);
  replaceRoute();
}

export function togglePlacesGroup() {
  setPlacesGroup(state.placesGroup === 'cities' ? 'countries' : 'cities');
}

function renderCityShowsList() {
  const cf = state.cityFilter;
  if (!cf) return;

  const q = state.cityShowsSearch.toLowerCase();
  let shows = cf.shows.filter(s => {
    if (!q) return true;
    return s.artist.toLowerCase().includes(q) ||
      s.venue.toLowerCase().includes(q) ||
      (s.support || '').toLowerCase().includes(q);
  });

  if (state.cityShowsSortMode === 'popular') {
    const artistCounts = {};
    SHOWS.forEach(s => { artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1; });
    shows = shows.slice().sort((a, b) => (artistCounts[b.artist] || 0) - (artistCounts[a.artist] || 0));
  } else {
    shows = shows.slice().sort((a, b) => b.date.localeCompare(a.date));
  }

  let idx = 0;
  document.getElementById('city-shows-list').innerHTML = shows.map(s => {
    const [yr, mo, dy] = s.date.split('-');
    const ae = esc(s.artist).replace(/"/g, '&quot;');
    const ve = esc(s.venue).replace(/"/g, '&quot;');
    const pills = supportPillsHtml(s.support);
    return `<div class="show-card" style="animation-delay:${(idx++) * 30}ms">
      <div class="show-day">
        <span class="show-day-month">${MN[parseInt(mo) - 1].slice(0, 3)}</span>
        <span class="show-day-num">${parseInt(dy)}</span>
        <span class="show-day-year">${yr}</span>
      </div>
      <div class="show-artist-col">
        <div class="show-artist show-link" data-tt="artist" data-name="${ae}" data-nav="artist">${esc(s.artist)}</div>
        ${tourHtml(s.tour)}
        ${pills ? `<div class="show-support">${pills}</div>` : ''}
      </div>
      <div class="show-venue-col">
        <div class="show-venue show-link" data-tt="venue" data-name="${ve}" data-nav="venue">${esc(s.venue)}</div>
      </div>
    </div>`;
  }).join('');
}

export function renderCityShows() {
  const cf = state.cityFilter;
  if (!cf) return;

  document.querySelectorAll('.content-view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-city-shows').classList.remove('hidden');

  // Reset search state and input
  state.cityShowsSearch = '';
  state.cityShowsSortMode = 'date';
  const inp = document.getElementById('city-shows-search');
  if (inp) inp.value = '';
  const crownBtn = document.getElementById('btn-city-crown');
  if (crownBtn) crownBtn.classList.remove('active');

  // Sync mobile search to city shows context
  const mobileInput = document.getElementById('mobile-search-input');
  if (mobileInput) { mobileInput.value = ''; mobileInput.placeholder = `Search ${cf.city}`; }

  // Title: "City 🇮🇪 (4)"
  const flag = countryShort(cf.country);
  document.getElementById('city-shows-title').textContent =
    `${cf.city}${flag ? ' ' + flag : ''} (${cf.shows.length})`;

  // Reset photo
  const wrap = document.getElementById('city-shows-photo-wrap');
  const img = document.getElementById('city-shows-photo');
  if (wrap) wrap.classList.remove('has-photo');
  if (img) { img.src = ''; img.classList.remove('loaded'); }

  renderCityShowsList();

  // Async: load city photo
  fetchWikiImage(cf.city, 'city').then(url => {
    if (!url) return;
    const w = document.getElementById('city-shows-photo-wrap');
    const i = document.getElementById('city-shows-photo');
    if (!w || !i) return;
    i.onload = () => { i.classList.add('loaded'); w.classList.add('has-photo'); };
    i.src = url;
  });
}

export function onCityShowsSearch(v) {
  state.cityShowsSearch = v;
  renderCityShowsList();
}

export function toggleCityShowsSort() {
  state.cityShowsSortMode = state.cityShowsSortMode === 'date' ? 'popular' : 'date';
  const crownBtn = document.getElementById('btn-city-crown');
  if (crownBtn) crownBtn.classList.toggle('active', state.cityShowsSortMode === 'popular');
  renderCityShowsList();
}

export function closeCityFilter() {
  state.cityFilter = null;
  state.cityShowsSearch = '';
  state.cityShowsSortMode = 'date';
  document.getElementById('view-city-shows').classList.add('hidden');
  document.getElementById(`view-${state.section}`).classList.remove('hidden');
  // Restore mobile search to section context
  const mobileInput = document.getElementById('mobile-search-input');
  if (mobileInput) {
    mobileInput.value = '';
    const labels = { shows: `Search ${state.year || ''}`, artists: 'Search artists', places: 'Search places', venues: 'Search venues' };
    mobileInput.placeholder = labels[state.section] || 'Search';
  }
  import('./render.js').then(m => m.render());
}
