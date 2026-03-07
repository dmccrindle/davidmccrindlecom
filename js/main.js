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
import { toggleMobileMenu, toggleMobileSectionDD, mobileSectionSelect } from './nav.js';
import { state } from './concert-archive/state.js';
import { initRouter } from './concert-archive/router.js';
import './concert-archive/tooltips.js'; // Side-effect: registers tooltip event listeners
import { renderOnThisDay, toggleOnThisDay, closeOnThisDay } from './concert-archive/on-this-day.js';
import { toggleStats } from './concert-archive/stats.js';

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
window.toggleMobileSectionDD = toggleMobileSectionDD;
window.mobileSectionSelect = mobileSectionSelect;
window.toggleOnThisDay = toggleOnThisDay;
window.closeOnThisDay = closeOnThisDay;
window.toggleStats = toggleStats;

// Initialize – handles both cases: DOM still loading or already loaded
async function init() {
  await parseData();
  deriveYears();
  initMap();
  updateMapMarkers();
  render();
  renderOnThisDay();  // Render "On This Day" widget after data is ready

  // Restore state from URL (e.g., /artists/coldplay) and set up back/forward handling
  initRouter(render, setSection, renderShows, renderArtists, renderPlaces, renderVenues);
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
  if (!e.target.closest('.mobile-section-nav')) {
    const dd = document.getElementById('mobile-section-dd');
    if (dd) dd.classList.remove('open');
  }
});
