// Main entry point for Concert Archive

import '../css/global.css';
import '../css/concert-archive.css';
import { parseData, deriveYears } from './concert-archive/data.js';
import { initMap, updateMapMarkers } from './concert-archive/map.js';
import { render, setView, setSection, openInfo, closeInfo } from './concert-archive/render.js';
import { renderShows, toggleYearDropdown, selectYear, changeYear, toggleSearch, onSearch, setShowType, focusShowsSearch, toggleShowTypeDropdown } from './concert-archive/shows.js';
import { renderArtists, setSortMode, toggleArtist } from './concert-archive/artists.js';
import { renderPlaces, togglePlace, setPlacesSortMode, setPlacesGroup, togglePlacesGroup, renderCityShows, closeCityFilter, onCityShowsSearch, toggleCityShowsSort } from './concert-archive/places.js';
import { renderVenues, toggleVenue, setVenuesSortMode } from './concert-archive/venues.js';
import { flyToCity, flyToCountry } from './concert-archive/map.js';
import { toggleMobileMenu } from './nav.js';
import { state } from './concert-archive/state.js';
import { initRouter } from './concert-archive/router.js';
import './concert-archive/tooltips.js'; // Side-effect: registers tooltip event listeners
import { renderOnThisDay, toggleOnThisDay, closeOnThisDay } from './concert-archive/on-this-day.js';
import { toggleStats } from './concert-archive/stats.js';

// ── Mobile bottom sheet ───────────────────────────
function isMobile() { return window.innerWidth <= 768; }

function expandMobileSheet() {
  if (!isMobile()) return;
  document.getElementById('right-panel')?.classList.add('sheet-open');
  document.body.classList.add('sheet-expanded');
}

function collapseMobileSheet() {
  if (!isMobile()) return;
  document.getElementById('right-panel')?.classList.remove('sheet-open');
  document.body.classList.remove('sheet-expanded');
}

function toggleMobileSheet() {
  if (!isMobile()) return;
  const panel = document.getElementById('right-panel');
  if (!panel) return;
  if (panel.classList.contains('sheet-open')) collapseMobileSheet();
  else expandMobileSheet();
}

// Unified mobile search: delegates to current section
function onMobileSearch(v) {
  onSearch(state.section, v);
  // Sync the section's own search input
  const map = { shows: 'shows-search', artists: 'artists-search', places: 'places-search', venues: 'venues-search' };
  const inp = document.getElementById(map[state.section]);
  if (inp) inp.value = v;
}

function clearMobileSearch() {
  const inp = document.getElementById('mobile-search-input');
  if (!inp) return;
  inp.value = '';
  onMobileSearch('');
  inp.focus();
}

function clearSearch(section) {
  const ids = { shows: 'shows-search', artists: 'artists-search', places: 'places-search', venues: 'venues-search', cityshows: 'city-shows-search' };
  const inp = document.getElementById(ids[section]);
  if (!inp) return;
  inp.value = '';
  if (section === 'cityshows') {
    onCityShowsSearch('');
  } else {
    onSearch(section, '');
  }
  inp.focus();
}

// Swipe gesture on the mobile sheet handle
function initMobileSheet() {
  const handle = document.getElementById('mobile-sheet-handle');
  const header = document.getElementById('mobile-sheet-header');
  if (!handle) return;

  let startY = 0;
  const onTouchStart = (e) => { startY = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    const delta = e.changedTouches[0].clientY - startY;
    if (delta < -40) expandMobileSheet();
    else if (delta > 40) collapseMobileSheet();
  };

  // Swipe on the whole header, tap-toggle only on the handle pill
  [handle, header].forEach(el => {
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  });
  handle.addEventListener('click', (e) => { e.stopPropagation(); toggleMobileSheet(); });
}

// Attach global functions for inline onclick handlers
window.setView = setView;
window.setSection = setSection;
window.openInfo = openInfo;
window.closeInfo = closeInfo;
window.toggleYearDropdown = toggleYearDropdown;
window.selectYear = selectYear;
window.changeYear = changeYear;
window.toggleSearch = toggleSearch;
window.onSearch = onSearch;
window.focusShowsSearch = focusShowsSearch;
window.setShowType = setShowType;
window.toggleShowTypeDropdown = toggleShowTypeDropdown;
window.setSortMode = setSortMode;
window.toggleArtist = toggleArtist;
window.togglePlace = togglePlace;
window.setPlacesSortMode = setPlacesSortMode;
window.setPlacesGroup = setPlacesGroup;
window.togglePlacesGroup = togglePlacesGroup;
window.closeCityFilter = closeCityFilter;
window.renderCityShows = renderCityShows;
window.onCityShowsSearch = onCityShowsSearch;
window.toggleCityShowsSort = toggleCityShowsSort;
window.flyToCity = flyToCity;
window.flyToCountry = flyToCountry;
window.toggleVenue = toggleVenue;
window.setVenuesSortMode = setVenuesSortMode;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleOnThisDay = toggleOnThisDay;
window.closeOnThisDay = closeOnThisDay;
window.toggleStats = toggleStats;
window.expandMobileSheet = expandMobileSheet;
window.onMobileSearch = onMobileSearch;
window.clearMobileSearch = clearMobileSearch;
window.clearSearch = clearSearch;

// Initialize – handles both cases: DOM still loading or already loaded
async function init() {
  // Set up touch handlers immediately — doesn't need data
  initMobileSheet();

  await parseData();
  deriveYears();
  render();
  renderOnThisDay();
  initRouter(render, setSection, renderShows, renderArtists, renderPlaces, renderVenues);

  // Defer map init until after the first paint so list is interactive first
  requestAnimationFrame(() => requestAnimationFrame(() => {
    initMap();
    updateMapMarkers();
  }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Nav gradient on scroll
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  // Cmd/Ctrl+K → focus the search for the current section
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const sectionSearch = { shows: 'shows-search', artists: 'artists-search', venues: 'venues-search', places: 'places-search' };
    const inp = document.getElementById(sectionSearch[state.section]);
    if (inp) { inp.focus(); inp.select(); }
    return;
  }
  // Escape → clear active section search, or close expanded accordion
  if (e.key === 'Escape') {
    const searches = [
      { id: 'shows-search', key: 'showsSearch', render: () => renderShows() },
      { id: 'artists-search', key: 'artistsSearch', render: () => renderArtists(false) },
      { id: 'venues-search', key: 'venuesSearch', render: () => renderVenues(false) },
      { id: 'places-search', key: 'placesSearch', render: () => renderPlaces(false) },
    ];
    for (const s of searches) {
      const inp = document.getElementById(s.id);
      if (inp && document.activeElement === inp) {
        inp.value = '';
        inp.blur();
        state[s.key] = '';
        s.render();
        return;
      }
    }
    if (state.expandedArtist) { toggleArtist(state.expandedArtist); return; }
    if (state.expandedVenue) { toggleVenue(state.expandedVenue); return; }
    if (state.expandedPlace) { togglePlace(state.expandedPlace); return; }
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.year-selector')) {
    document.getElementById('year-dropdown').classList.remove('open');
    document.getElementById('year-selector').classList.remove('open');
  }
  if (!e.target.closest('.show-type-dd')) {
    document.getElementById('show-type-menu')?.classList.remove('open');
    document.getElementById('show-type-dd')?.classList.remove('open');
  }
});
