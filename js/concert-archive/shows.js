import { state, SHOWS, MONTH_NAMES } from './state.js';
import { countryShort, esc, tourHtml, supportPillsHtml } from './data.js';
import { pushRoute, replaceRoute } from './router.js';
import { closeOnThisDay } from './on-this-day.js';

const MN = MONTH_NAMES;

const SETLIST_COUNTRY = {
  'US': 'us', 'UK': 'gb', 'IE': 'ie', 'DE': 'de',
  'Scotland': 'gb', 'England': 'gb', 'Wales': 'gb', 'Northern Ireland': 'gb',
  'Ireland': 'ie', 'Germany': 'de', 'Sweden': 'se', 'Norway': 'no', 'Canada': 'ca',
};

function setlistUrl(s) {
  const [yr, mo, dy] = s.date.split('-');
  const params = new URLSearchParams({ query: s.artist, year: yr });
  const cc = SETLIST_COUNTRY[s.country];
  if (cc) params.set('country', cc);
  // Strip US state suffix (e.g. "Minneapolis, MN" → "Minneapolis") for better city matching
  const city = s.city.replace(/,\s*[A-Z]{2}$/, '');
  params.set('cityName', city);
  return `https://www.setlist.fm/search?${params.toString()}`;
}

export function renderShows() {
  updateYearNav();
  const sl = document.getElementById('shows-list');
  if (sl) sl.scrollTop = 0;

  let shows = SHOWS.filter(s => {
    const yr = parseInt(s.date.split('-')[0]);
    if (yr !== state.year) return false;
    if (state.showType === 'festivals' && !s.festival) return false;
    if (state.showType === 'concerts' && s.festival) return false;
    if (state.showsSearch) {
      const q = state.showsSearch.toLowerCase();
      return s.artist.toLowerCase().includes(q) ||
        (s.support || '').toLowerCase().includes(q) ||
        s.venue.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const c = document.getElementById('shows-list');
  if (!shows.length) {
    c.innerHTML = `<div class="no-shows">No shows found for ${state.year}</div>`;
    return;
  }

  // Collapse On This Day when user scrolls the list
  if (!c._otdScrollBound) {
    c.closest('.list-scroll')?.addEventListener('scroll', () => closeOnThisDay(), { passive: true });
    c._otdScrollBound = true;
  }

  c.innerHTML = shows.map((s, idx) => {
    const [yr, mo, dy] = s.date.split('-');
    const cDisplay = countryShort(s.country);
    const ae = esc(s.artist).replace(/"/g, '&quot;');
    const ve = esc(s.venue).replace(/"/g, '&quot;');
    const ce = esc(s.city).replace(/"/g, '&quot;');
    const pills = supportPillsHtml(s.support);
    const sUrl = setlistUrl(s);
    return `<div class="show-card" style="animation-delay:${idx * 40}ms">
      <div class="show-day">
        <span class="show-day-month">${MN[parseInt(mo)-1].slice(0,3)}</span>
        <span class="show-day-num">${parseInt(dy)}</span>
        <span class="show-day-year">${yr}</span>
      </div>
      <div class="show-artist-col">
        <div class="show-artist-row">
          <div class="show-artist show-link" data-tt="artist" data-name="${ae}" data-nav="artist">${esc(s.artist)}</div>
          <a class="show-setlist-link" href="${sUrl}" target="_blank" rel="noopener" title="View setlist on setlist.fm" aria-label="View setlist for ${ae} on setlist.fm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.8"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </a>
        </div>
        ${tourHtml(s.tour)}
        ${pills ? `<div class="show-support">${pills}</div>` : ''}
      </div>
      <div class="show-venue-col">
        <div class="show-venue show-link" data-tt="venue" data-name="${ve}" data-nav="venue">${esc(s.venue)}</div>
        <div class="show-location show-link" data-tt="city" data-name="${ce}" data-nav="place">${esc(s.city)} ${cDisplay}</div>
      </div>
    </div>`;
  }).join('');
}

function updateShowTypeLabel() {
  const lbl = document.getElementById('show-type-label');
  if (!lbl) return;
  const count = SHOWS.filter(s => {
    const yr = parseInt(s.date.split('-')[0]);
    if (yr !== state.year) return false;
    return state.showType === 'festivals' ? s.festival : !s.festival;
  }).length;
  const text = state.showType === 'festivals' ? 'Festivals' : 'Concerts';
  lbl.textContent = `${text} (${count})`;
}

function updateYearNav() {
  const i = state.years.indexOf(state.year);
  document.getElementById('year-display').textContent = state.year;
  const pb = document.getElementById('prev-year-btn'), nb = document.getElementById('next-year-btn');
  const pl = document.getElementById('prev-year-label'), nl = document.getElementById('next-year-label');
  const pi = i + 1, ni = i - 1;
  if (pi < state.years.length) {
    pl.textContent = state.years[pi];
    pb.disabled = false;
  } else {
    pl.textContent = '—';
    pb.disabled = true;
  }
  if (ni >= 0) {
    nl.textContent = state.years[ni];
    nb.disabled = false;
  } else {
    nl.textContent = '—';
    nb.disabled = true;
  }
  updateShowTypeLabel();
  const mInp = document.getElementById('mobile-search-input');
  if (mInp && state.section === 'shows') mInp.placeholder = `Search ${state.year}`;
}

export function toggleYearDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('year-dropdown');
  const sel = document.getElementById('year-selector');
  const isOpen = dd.classList.contains('open');
  dd.classList.toggle('open');
  sel.classList.toggle('open');
  sel.setAttribute('aria-expanded', !isOpen);
  if (!isOpen) {
    dd.innerHTML = state.years.map(y => {
      const count = SHOWS.filter(s => parseInt(s.date.slice(0, 4)) === y).length;
      return `<div class="year-option${y === state.year ? ' selected' : ''}" onclick="selectYear(${y},event)">${y} <span style="color:#a1a1a1;font-weight:400">(${count})</span></div>`;
    }).join('');
  }
}

export function selectYear(y, e) {
  e && e.stopPropagation();
  state.year = y;
  document.getElementById('year-dropdown').classList.remove('open');
  const sel = document.getElementById('year-selector');
  sel.classList.remove('open');
  sel.setAttribute('aria-expanded', 'false');
  closeOnThisDay();
  renderShows();
  pushRoute();
}

export function changeYear(d) {
  const i = state.years.indexOf(state.year);
  const ni = i - d;
  if (ni >= 0 && ni < state.years.length) {
    state.year = state.years[ni];
    closeOnThisDay();
    renderShows();
    pushRoute();
  }
}

export function focusShowsSearch() {
  const inp = document.getElementById('shows-search');
  if (inp) { inp.focus(); inp.select(); }
}

export function toggleSearch(s) {
  if (s === 'shows') {
    focusShowsSearch();
    return;
  }
  const inp = document.getElementById(`${s}-search`);
  const lbl = document.getElementById(`${s}-search-label`);
  if (inp.classList.contains('open')) {
    inp.classList.remove('open');
    lbl.style.display = '';
    inp.value = '';
    state.artistsSearch = '';
    import('./artists.js').then(m => m.renderArtists(true));
  } else {
    inp.classList.add('open');
    lbl.style.display = 'none';
    inp.focus();
  }
}

export function onSearch(s, v) {
  if (s === 'shows') {
    state.showsSearch = v;
    renderShows();
  } else if (s === 'venues') {
    state.venuesSearch = v;
    import('./venues.js').then(m => m.renderVenues(false));
  } else if (s === 'places') {
    state.placesSearch = v;
    import('./places.js').then(m => m.renderPlaces(false));
  } else {
    state.artistsSearch = v;
    import('./artists.js').then(m => m.renderArtists(false));
  }
  replaceRoute();
}

export function setShowType(type) {
  state.showType = type;
  document.getElementById('stype-concerts')?.classList.toggle('active', type === 'concerts');
  document.getElementById('stype-festivals')?.classList.toggle('active', type === 'festivals');
  document.getElementById('show-type-menu')?.classList.remove('open');
  document.getElementById('show-type-dd')?.classList.remove('open');
  renderShows();
  replaceRoute();
}

export function toggleShowTypeDropdown(e) {
  e.stopPropagation();
  document.getElementById('show-type-menu')?.classList.toggle('open');
  document.getElementById('show-type-dd')?.classList.toggle('open');
}
