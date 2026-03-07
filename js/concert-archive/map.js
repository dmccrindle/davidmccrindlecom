import { state, SHOWS } from './state.js';
import { CITY_COORDS } from './data.js';

let map = null;
let markers = [];
let markerCityMap = {};
let _markersAnimated = false; // animate only on first render

export function getMap() {
  return map;
}

export function getMarkers() {
  return markers;
}

export function getMarkerCityMap() {
  return markerCityMap;
}

export function initMap() {
  map = L.map('map', {
    center: [30, 5],
    zoom: 2.5,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: true,
    dragging: true,
    doubleClickZoom: true,
    minZoom: 2,
    maxZoom: 15,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 100);
  setTimeout(() => map.invalidateSize(), 500);

  map.on('zoomend', () => updateMapMarkers(state._filteredShows || null));
}

function clusterPrecision() {
  const z = map ? map.getZoom() : 2.5;
  if (z < 4) return 0;
  if (z < 6) return 1;
  return 2;
}

export function updateMapMarkers(filteredShows) {
  state._filteredShows = filteredShows || null;
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  markerCityMap = {};

  const prec = clusterPrecision();
  const groups = {};
  const showList = filteredShows || SHOWS;

  showList.forEach(s => {
    if (!s.lat) return;
    const k = `${s.lat.toFixed(prec)},${s.lng.toFixed(prec)}`;
    if (!groups[k]) groups[k] = { lat: s.lat, lng: s.lng, shows: [], cities: new Set(), city: s.city, country: s.country };
    groups[k].shows.push(s);
    groups[k].cities.add(s.city);
  });

  const animate = !_markersAnimated;
  _markersAnimated = true;

  let delay = 0;
  Object.values(groups).forEach(g => {
    const isDot = g.shows.length === 1;
    const sz = isDot ? 10 : 30;
    const icon = L.divIcon({
      className: '',
      html: `<div class="concert-marker-wrap${isDot ? ' dot' : ''}" style="${animate ? `animation-delay:${delay}ms` : 'animation:none'}" data-cities="${[...g.cities].map(c => c.replace(/"/g, '&quot;')).join('|')}">${isDot ? '' : g.shows.length}</div>`,
      iconSize: [sz, sz],
      iconAnchor: [sz / 2, sz / 2],
    });

    const m = L.marker([g.lat, g.lng], { icon }).addTo(map);

    g.cities.forEach(c => {
      markerCityMap[c] = m;
    });

    m.on('click', () => {
      clearHighlightedMarkers();
      const el = m.getElement();
      if (el) {
        const w = el.querySelector('.concert-marker-wrap');
        if (w) w.classList.add('highlighted');
      }
      if (state.view !== 'map') {
        state.cityFilter = { city: g.city, country: g.country, shows: g.shows };
        if (window.renderCityShows) window.renderCityShows();
      }
    });

    markers.push(m);
    delay += 30;
  });
}

export function clearHighlightedMarkers() {
  document.querySelectorAll('.concert-marker-wrap.highlighted').forEach(el => el.classList.remove('highlighted'));
}

export function highlightMarkerForCity(cityName) {
  clearHighlightedMarkers();
  const m = markerCityMap[cityName];
  if (m) {
    const el = m.getElement();
    if (el) {
      const w = el.querySelector('.concert-marker-wrap');
      if (w) w.classList.add('highlighted');
    }
  }
}

export function flyToCity(cityName) {
  const coords = CITY_COORDS[cityName];
  if (coords && map) {
    map.flyTo(coords, 8, { duration: 1.2 });
    map.once('moveend', () => {
      setTimeout(() => highlightMarkerForCity(cityName), 100);
    });
  }
}

export function flyToCountry(country) {
  const show = SHOWS.find(s => s.country === country && CITY_COORDS[s.city]);
  if (show) {
    map.flyTo(CITY_COORDS[show.city], 5, { duration: 1.2 });
    map.once('moveend', () => {
      setTimeout(() => highlightMarkerForCity(show.city), 100);
    });
  }
}
