import { state, SHOWS } from './state.js';
import { esc } from './data.js';
import { getArtistStats, getVenueStats, getCityStats, fetchWikiImage, wikiCache } from './api.js';
import { setSection } from './render.js';
import { replaceRoute } from './router.js';
import { renderArtists } from './artists.js';
import { renderVenues } from './venues.js';
import { renderPlaces, setPlacesGroup } from './places.js';

let tooltipTimer = null;
const tooltip = document.getElementById('show-tooltip');
let tooltipId = 0;

export function showTooltip(el, type, name) {
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => {
    const thisId = ++tooltipId;
    let statsHtml = '';
    if (type === 'artist' || type === 'support') {
      const st = getArtistStats(name);
      statsHtml = `<div class="tooltip-stat"><strong>${st.count}</strong> show${st.count !== 1 ? 's' : ''} &middot; <strong>${st.cities}</strong> ${st.cities === 1 ? 'city' : 'cities'}</div>
        <div class="tooltip-stat">${st.firstYear}${st.firstYear !== st.lastYear ? ' – ' + st.lastYear : ''}</div>
        <div class="tooltip-hint">Click to view in Artists</div>`;
    } else if (type === 'venue') {
      const st = getVenueStats(name);
      statsHtml = `<div class="tooltip-stat"><strong>${st.count}</strong> show${st.count !== 1 ? 's' : ''} &middot; <strong>${st.artists}</strong> artist${st.artists !== 1 ? 's' : ''}</div>
        <div class="tooltip-stat">${st.firstYear}${st.firstYear !== st.lastYear ? ' – ' + st.lastYear : ''}</div>
        <div class="tooltip-hint">Click to view in Venues</div>`;
    } else if (type === 'city') {
      const st = getCityStats(name);
      statsHtml = `<div class="tooltip-stat"><strong>${st.count}</strong> show${st.count !== 1 ? 's' : ''} &middot; <strong>${st.venues}</strong> venue${st.venues !== 1 ? 's' : ''}</div>
        <div class="tooltip-stat"><strong>${st.artists}</strong> different artist${st.artists !== 1 ? 's' : ''}</div>
        <div class="tooltip-hint">Click to view in Places</div>`;
    }

    const cacheKey = type + ':' + name;
    const cached = wikiCache[cacheKey];
    const imgHtml = cached?.img
      ? `<div class="tooltip-img-wrap loaded"><img src="${cached.img}" class="show" alt=""></div>`
      : `<div class="tooltip-img-wrap" id="tooltip-img-${thisId}"><img alt=""></div>`;

    tooltip.innerHTML = `${imgHtml}<div class="tooltip-title">${esc(name)}</div>${statsHtml}`;

    const r = el.getBoundingClientRect();
    let top = r.bottom + 8, left = r.left;
    if (top + 200 > window.innerHeight) top = r.top - 210;
    tooltip.style.left = Math.min(Math.max(8, left), window.innerWidth - 300) + 'px';
    tooltip.style.top = Math.max(8, top) + 'px';
    tooltip.classList.add('visible');

    if (!cached) {
      fetchWikiImage(name, type).then(imgUrl => {
        if (thisId !== tooltipId) return;
        const wrap = document.getElementById('tooltip-img-' + thisId);
        if (wrap && imgUrl) {
          wrap.classList.add('loaded');
          const img = wrap.querySelector('img');
          img.src = imgUrl;
          img.onload = () => img.classList.add('show');
        }
      });
    }
  }, 350);
}

export function hideTooltip() {
  clearTimeout(tooltipTimer);
  tooltip.classList.remove('visible');
}

function navigateToArtist(name) {
  hideTooltip();
  setSection('artists');
  state.expandedArtist = name;
  renderArtists(false);
  replaceRoute();
  setTimeout(() => {
    const el = document.querySelector('.artist-row.expanded');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function navigateToVenue(name) {
  hideTooltip();
  setSection('venues');
  state.expandedVenue = name;
  renderVenues(false);
  replaceRoute();
  setTimeout(() => {
    const el = document.querySelector('.venue-row.expanded');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function navigateToPlace(city) {
  hideTooltip();
  state.placesGroup = 'cities';
  setSection('places');
  state.expandedPlace = city;
  renderPlaces(false);
  replaceRoute();
  setTimeout(() => {
    const el = document.querySelector('.place-row.expanded');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Event delegation setup
document.addEventListener('mouseenter', e => {
  const el = e.target.closest('.show-link');
  if (el && el.dataset.tt) showTooltip(el, el.dataset.tt, el.dataset.name);
}, true);

document.addEventListener('mouseleave', e => {
  const el = e.target.closest('.show-link');
  if (el) hideTooltip();
}, true);

document.addEventListener('click', e => {
  const el = e.target.closest('.show-link');
  if (!el || !el.dataset.nav) return;
  e.stopPropagation();
  const name = el.dataset.name;
  if (el.dataset.nav === 'artist') navigateToArtist(name);
  else if (el.dataset.nav === 'venue') navigateToVenue(name);
  else if (el.dataset.nav === 'place') navigateToPlace(name);
});

export { navigateToArtist, navigateToVenue, navigateToPlace };
