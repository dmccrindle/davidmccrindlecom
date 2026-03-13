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

  document.querySelectorAll('.stat-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  const activeCard = document.querySelector(`.stat-card[data-section="${sec}"]`);
  activeCard.classList.add('active');
  activeCard.setAttribute('aria-pressed', 'true');

  document.querySelectorAll('.content-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${sec}`).classList.remove('hidden');

  document.querySelectorAll('.mobile-tab').forEach(t => t.classList.toggle('active', t.dataset.section === sec));
  document.querySelectorAll('.mobile-sheet-tab').forEach(t => t.classList.toggle('active', t.dataset.section === sec));

  // Sync mobile search input to new section's search state
  const mobileInput = document.getElementById('mobile-search-input');
  if (mobileInput) {
    const searchValues = { shows: state.showsSearch, artists: state.artistsSearch, places: state.placesSearch, venues: state.venuesSearch };
    mobileInput.value = searchValues[sec] || '';
    if (sec !== 'shows') {
      const labels = { artists: 'Search artists', places: 'Search places', venues: 'Search venues' };
      mobileInput.placeholder = labels[sec] || 'Search';
    }
  }

  // Reset scroll position on all list panels
  document.querySelectorAll('.list-scroll').forEach(el => { el.scrollTop = 0; });

  // Expand the sheet on mobile when switching sections
  if (window.innerWidth <= 768) {
    document.getElementById('right-panel')?.classList.add('sheet-open');
    document.body.classList.add('sheet-expanded');
  }

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

  // Update mobile tab badges
  const setTabBadge = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTabBadge('tab-badge-shows', showsN);
  setTabBadge('tab-badge-artists', artists.size);
  setTabBadge('tab-badge-places', places.size);
  setTabBadge('tab-badge-venues', venues.size);

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
  const el = document.getElementById('concert-overlay');
  el.classList.add('ready');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
}

export function closeInfo() {
  document.getElementById('concert-overlay').classList.remove('open');
  document.cookie = 'ca_seen=1; max-age=31536000; path=/';
}

export function maybeShowInfo() {
  const seen = document.cookie.split(';').some(c => c.trim().startsWith('ca_seen='));
  if (!seen) openInfo();
}

