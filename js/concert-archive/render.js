import { state, SHOWS } from './state.js';
import { getMap, clearHighlightedMarkers, updateMapMarkers } from './map.js';
import { renderShows } from './shows.js';
import { renderArtists } from './artists.js';
import { renderPlaces } from './places.js';
import { renderVenues } from './venues.js';
import { pushRoute } from './router.js';

export function render() {
  switch (state.section) {
    case 'shows':
      renderShows();
      break;
    case 'artists':
      renderArtists(true);
      break;
    case 'places':
      renderPlaces(true);
      break;
    case 'venues':
      renderVenues(true);
      break;
  }
  updateStats();
}

export function setView(v) {
  const map = getMap();
  state.view = v;
  state.cityFilter = null;
  if (v === 'map') {
    document.body.classList.add('map-mode');
    document.getElementById('btn-map').classList.add('active');
    document.getElementById('btn-list').classList.remove('active');
    if (!map._zoomAdded) {
      map.addControl(L.control.zoom({ position: 'topright' }));
      map._zoomAdded = true;
    }
  } else {
    document.body.classList.remove('map-mode');
    document.getElementById('btn-list').classList.add('active');
    document.getElementById('btn-map').classList.remove('active');
    map.closePopup();
    render();
  }
}

export function setSection(sec) {
  const map = getMap();
  state.section = sec;
  state.expandedArtist = null;
  state.expandedVenue = null;
  state.expandedPlace = null;
  state.cityFilter = null;

  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.stat-card[data-section="${sec}"]`).classList.add('active');

  document.querySelectorAll('.content-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${sec}`).classList.remove('hidden');

  const msl = document.getElementById('mobile-section-label');
  if (msl) msl.textContent = sec.charAt(0).toUpperCase() + sec.slice(1);

  // Reset scroll position on all list panels
  document.querySelectorAll('.list-scroll').forEach(el => { el.scrollTop = 0; });

  if (map) {
    map.closePopup();
    clearHighlightedMarkers();
    updateMapMarkers();
    map.setView([30, 5], 2.5);
  }
  render();
  pushRoute();
}

function flipTile(tile, char) {
  tile.textContent = char;
  tile.classList.remove('flap-flip');
  void tile.offsetWidth; // force reflow to restart animation
  tile.classList.add('flap-flip');
}

function splitFlap(el, target) {
  const CHARS = '0123456789';
  const digits = String(target).split('');

  el.innerHTML = digits.map(() => `<span class="flap-tile">0</span>`).join('');
  const tiles = [...el.querySelectorAll('.flap-tile')];

  tiles.forEach((tile, i) => {
    const targetChar = digits[i];
    const stagger = i * 90;
    const totalFlips = 14 + i * 4; // more flips for later digits = cascade feel
    let step = 0;
    let currentIdx = 0;

    const tick = () => {
      if (step >= totalFlips) {
        flipTile(tile, targetChar);
        return;
      }
      const progress = step / totalFlips;
      // Ease: fast at start (~55ms), slows to ~280ms at the end
      const interval = 55 + Math.pow(progress, 2) * 225;
      currentIdx = (currentIdx + 1) % CHARS.length;
      flipTile(tile, CHARS[currentIdx]);
      step++;
      setTimeout(tick, interval);
    };

    setTimeout(tick, stagger);
  });
}

function setFlapInstant(el, target) {
  const digits = String(target).split('');
  el.innerHTML = digits.map(d => `<span class="flap-tile">${d}</span>`).join('');
}

function updateStats() {
  const showsN = SHOWS.length;
  const artists = new Set();
  SHOWS.forEach(s => {
    // Mirror getArtistData logic: festival headliners don't count, support acts do
    const names = s.festival ? [s.support] : [s.artist, s.support];
    names.filter(Boolean).forEach(col => col.split(';').forEach(a => { if (a.trim()) artists.add(a.trim()); }));
  });
  const places = new Set(SHOWS.map(s => s.city));
  const venues = new Set(SHOWS.map(s => s.venue));

  if (!updateStats._done) {
    updateStats._done = true;
    setTimeout(() => {
      splitFlap(document.getElementById('shows-count'), showsN);
      splitFlap(document.getElementById('artists-count'), artists.size);
      splitFlap(document.getElementById('places-count'), places.size);
      splitFlap(document.getElementById('venues-count'), venues.size);
    }, 600);
  } else {
    setFlapInstant(document.getElementById('shows-count'), showsN);
    setFlapInstant(document.getElementById('artists-count'), artists.size);
    setFlapInstant(document.getElementById('places-count'), places.size);
    setFlapInstant(document.getElementById('venues-count'), venues.size);
  }
}

export function openInfo() {
  document.getElementById('info-modal').classList.add('open');
}

export function closeInfo() {
  document.getElementById('info-modal').classList.remove('open');
}

