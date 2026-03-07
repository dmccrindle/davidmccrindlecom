// Router module - History API-based URL routing
import { state, SHOWS } from './state.js';
import { getMap, updateMapMarkers, clearHighlightedMarkers, flyToCity } from './map.js';
import { CITY_COORDS } from './data.js';

// Base path for the Concert Archive (lives at /concert-archive/)
const BASE = '/concert-archive';

// Slugify a name for URL use: "Barrowland Ballroom" → "barrowland-ballroom"
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Find original name from slug by matching against a list of actual names
export function unslugify(slug, names) {
  if (!slug) return null;
  const s = slug.toLowerCase();
  return names.find(n => slugify(n) === s) || null;
}

// Build URL path from current state
function buildPath() {
  const sec = state.section || 'shows';
  let path = BASE + '/' + sec;

  if (sec === 'shows' && state.year) {
    path = BASE + '/shows/' + state.year;
  } else if (sec === 'artists' && state.expandedArtist) {
    path = BASE + '/artists/' + slugify(state.expandedArtist);
  } else if (sec === 'places' && state.expandedPlace) {
    path = BASE + '/places/' + slugify(state.expandedPlace);
  } else if (sec === 'venues' && state.expandedVenue) {
    path = BASE + '/venues/' + slugify(state.expandedVenue);
  }

  // Build query params for secondary state
  const params = new URLSearchParams();

  if (sec === 'artists') {
    if (state.sortMode && state.sortMode !== 'alpha-asc') params.set('sort', state.sortMode);
    if (state.artistsSearch) params.set('search', state.artistsSearch);
  } else if (sec === 'places') {
    if (state.placesSortMode && state.placesSortMode !== 'alpha-asc') params.set('sort', state.placesSortMode);
    if (state.placesGroup && state.placesGroup !== 'cities') params.set('group', state.placesGroup);
  } else if (sec === 'venues') {
    if (state.venuesSortMode && state.venuesSortMode !== 'alpha-asc') params.set('sort', state.venuesSortMode);
  } else if (sec === 'shows') {
    if (state.showsSearch) params.set('search', state.showsSearch);
  }

  const qs = params.toString();
  return qs ? path + '?' + qs : path;
}

// Push a new history entry (for navigation actions)
let _skipNextPush = false;

export function pushRoute() {
  if (_skipNextPush) { _skipNextPush = false; return; }
  const path = buildPath();
  if (window.location.pathname + window.location.search !== path) {
    history.pushState(null, '', path);
  }
}

// Replace current history entry (for sort/search changes that shouldn't create history)
export function replaceRoute() {
  const path = buildPath();
  history.replaceState(null, '', path);
}

// Parse URL and return state-like object
export function parseRoute() {
  const fullPath = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  // Strip the base prefix so parsing works the same regardless of where the app is mounted
  const path = fullPath.startsWith(BASE) ? fullPath.slice(BASE.length) || '/' : fullPath;
  const parts = path.split('/').filter(Boolean);

  const result = {
    section: 'shows',
    year: null,
    expandedArtist: null,
    expandedPlace: null,
    expandedVenue: null,
    sortMode: null,
    search: null,
    group: null,
  };

  const sec = parts[0] || 'shows';
  if (['shows', 'artists', 'places', 'venues'].includes(sec)) {
    result.section = sec;
  }

  const slug = parts[1] || null;

  if (sec === 'shows' && slug) {
    const yr = parseInt(slug);
    if (!isNaN(yr)) result.year = yr;
  } else if (sec === 'artists' && slug) {
    // Match slug against actual artist names
    const allArtists = getAllArtistNames();
    result.expandedArtist = unslugify(slug, allArtists);
  } else if (sec === 'places' && slug) {
    const allCities = getAllCityNames();
    result.expandedPlace = unslugify(slug, allCities);
  } else if (sec === 'venues' && slug) {
    const allVenues = getAllVenueNames();
    result.expandedVenue = unslugify(slug, allVenues);
  }

  // Query params
  if (params.has('sort')) result.sortMode = params.get('sort');
  if (params.has('search')) result.search = params.get('search');
  if (params.has('group')) result.group = params.get('group');

  return result;
}

// Helper: get all unique artist names from SHOWS data
function getAllArtistNames() {
  const names = new Set();
  SHOWS.forEach(s => {
    if (s.artist) s.artist.split(';').forEach(a => { if (a.trim()) names.add(a.trim()); });
    if (s.support) s.support.split(';').forEach(a => { if (a.trim()) names.add(a.trim()); });
  });
  return [...names];
}

function getAllCityNames() {
  return [...new Set(SHOWS.map(s => s.city).filter(Boolean))];
}

function getAllVenueNames() {
  return [...new Set(SHOWS.map(s => s.venue).filter(Boolean))];
}

// Apply parsed route to app state and trigger rendering
export function initRouter(renderFn, setSection, renderShows, renderArtists, renderPlaces, renderVenues) {
  // Restore state from initial URL
  applyRoute(setSection, renderShows, renderArtists, renderPlaces, renderVenues);

  // Handle back/forward button
  window.addEventListener('popstate', () => {
    _skipNextPush = true;
    applyRoute(setSection, renderShows, renderArtists, renderPlaces, renderVenues);
  });
}

function applyRoute(setSection, renderShows, renderArtists, renderPlaces, renderVenues) {
  const route = parseRoute();

  // If we're on the concert archive root, just keep defaults
  const p = window.location.pathname;
  if (p === BASE || p === BASE + '/' || p === '/' || p === '') {
    // Still clear any expanded items and reset to shows
    state.expandedArtist = null;
    state.expandedVenue = null;
    state.expandedPlace = null;
    if (state.section !== 'shows') {
      setSection('shows');
    } else {
      renderShows();
    }
    return;
  }

  // Always clear expanded items first — the route will set them if needed
  state.expandedArtist = null;
  state.expandedVenue = null;
  state.expandedPlace = null;

  // Apply section (this also clears expanded items and re-renders)
  if (route.section !== state.section) {
    setSection(route.section);
  }

  // Apply section-specific state
  if (route.section === 'shows') {
    if (route.year && state.years.includes(route.year)) {
      state.year = route.year;
    }
    if (route.search) {
      state.showsSearch = route.search;
      const inp = document.getElementById('shows-search');
      if (inp) { inp.value = route.search; inp.classList.add('open'); }
    } else {
      state.showsSearch = '';
      const inp = document.getElementById('shows-search');
      if (inp) { inp.value = ''; inp.classList.remove('open'); }
    }
    renderShows();

    // Reset map to default view for shows
    const mapS = getMap();
    if (mapS) {
      clearHighlightedMarkers();
      updateMapMarkers();
      mapS.setView([30, 5], 2.5);
    }
  } else if (route.section === 'artists') {
    if (route.sortMode) {
      state.sortMode = route.sortMode;
    } else {
      state.sortMode = 'alpha-asc';
    }
    document.getElementById('btn-alpha')?.classList.toggle('active', state.sortMode.startsWith('alpha'));
    document.getElementById('btn-crown')?.classList.toggle('active', state.sortMode === 'most');

    if (route.search) {
      state.artistsSearch = route.search;
      const inp = document.getElementById('artists-search');
      if (inp) { inp.value = route.search; inp.classList.add('open'); }
    } else {
      state.artistsSearch = '';
      const inp = document.getElementById('artists-search');
      if (inp) { inp.value = ''; inp.classList.remove('open'); }
    }

    // Set expanded artist from route (or leave null if not in URL)
    state.expandedArtist = route.expandedArtist;
    renderArtists(true);

    // Update map: focus on artist's venues or reset to default
    const map = getMap();
    if (map) {
      if (route.expandedArtist) {
        const artistShows = SHOWS.filter(s => {
          const acts = [s.artist, ...(s.support || '').split(';').map(x => x.trim())].filter(Boolean);
          return acts.includes(route.expandedArtist);
        });
        updateMapMarkers(artistShows);
        const pts = artistShows.filter(s => s.lat).map(s => [s.lat, s.lng]);
        if (pts.length > 1) {
          map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 10, duration: 1 });
        } else if (pts.length === 1) {
          map.flyTo(pts[0], 8, { duration: 1 });
        }
        setTimeout(() => {
          const el = document.querySelector('.artist-row.expanded');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        clearHighlightedMarkers();
        updateMapMarkers();
        map.setView([30, 5], 2.5);
      }
    }
  } else if (route.section === 'places') {
    if (route.group) {
      state.placesGroup = route.group;
    }
    document.getElementById('btn-cities')?.classList.toggle('active', state.placesGroup === 'cities');
    document.getElementById('btn-countries')?.classList.toggle('active', state.placesGroup === 'countries');

    if (route.sortMode) {
      state.placesSortMode = route.sortMode;
    } else {
      state.placesSortMode = 'alpha-asc';
    }
    document.getElementById('btn-place-alpha')?.classList.toggle('active', state.placesSortMode.startsWith('alpha'));
    document.getElementById('btn-place-crown')?.classList.toggle('active', state.placesSortMode === 'most');

    // Set expanded place from route (or leave null)
    state.expandedPlace = route.expandedPlace;
    renderPlaces(true);

    // Update map
    const mapP = getMap();
    if (mapP) {
      if (route.expandedPlace) {
        flyToCity(route.expandedPlace);
        setTimeout(() => {
          const el = document.querySelector('.place-row.expanded');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        clearHighlightedMarkers();
        updateMapMarkers();
        mapP.setView([30, 5], 2.5);
      }
    }
  } else if (route.section === 'venues') {
    if (route.sortMode) {
      state.venuesSortMode = route.sortMode;
    } else {
      state.venuesSortMode = 'alpha-asc';
    }
    document.getElementById('btn-venue-alpha')?.classList.toggle('active', state.venuesSortMode.startsWith('alpha'));
    document.getElementById('btn-venue-crown')?.classList.toggle('active', state.venuesSortMode === 'most');

    // Set expanded venue from route (or leave null)
    state.expandedVenue = route.expandedVenue;
    renderVenues(true);

    // Update map
    const mapV = getMap();
    if (mapV) {
      if (route.expandedVenue) {
        const venueShow = SHOWS.find(s => s.venue === route.expandedVenue);
        if (venueShow) flyToCity(venueShow.city);
        setTimeout(() => {
          const el = document.querySelector('.venue-row.expanded');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        clearHighlightedMarkers();
        updateMapMarkers();
        mapV.setView([30, 5], 2.5);
      }
    }
  }
}
