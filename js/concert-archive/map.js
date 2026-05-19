import { state, SHOWS } from './state.js';
import { CITY_COORDS } from './data.js';
import { showTooltip, hideTooltip } from './tooltips.js';

let map = null;
let cluster = null;
let markers = [];
let markerCityMap = {};

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
    tap: false,
    minZoom: 2,
    maxZoom: 15,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: false,
    zoomToBoundsOnClick: false,
    maxClusterRadius: 55,
    iconCreateFunction: (c) => {
      const count = c.getChildCount();
      let size = 30;
      if (count >= 50) size = 48;
      else if (count >= 20) size = 40;
      else if (count >= 10) size = 34;
      return L.divIcon({
        className: '',
        html: `<div class="concert-marker-wrap" style="width:${size}px;height:${size}px">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    },
  });

  cluster.on('clusterclick', (e) => {
    const childMarkers = e.layer.getAllChildMarkers();
    const bounds = e.layer.getBounds();
    // If all child markers share the same point (or close to it), open the list.
    // Otherwise, zoom in to expand the cluster.
    const span = Math.max(
      bounds.getNorth() - bounds.getSouth(),
      bounds.getEast() - bounds.getWest(),
    );
    if (span < 0.001 || map.getZoom() >= map.getMaxZoom()) {
      openShowsListFromMarkers(childMarkers);
    } else {
      map.fitBounds(bounds.pad(0.2));
    }
  });

  cluster.on('clustermouseover', (e) => {
    const childMarkers = e.layer.getAllChildMarkers();
    const venues = new Set(childMarkers.map((m) => m._show && m._show.venue).filter(Boolean));
    const cities = new Set(childMarkers.map((m) => m._show && m._show.city).filter(Boolean));
    const el = e.layer.getElement?.() || e.propagatedFrom?.getElement?.();
    if (!el) return;
    if (venues.size === 1) {
      showTooltip(el, 'venue', [...venues][0]);
    } else if (cities.size === 1) {
      showTooltip(el, 'city', [...cities][0]);
    }
  });

  cluster.on('clustermouseout', () => hideTooltip());

  map.addLayer(cluster);

  setTimeout(() => map.invalidateSize(), 100);
  setTimeout(() => map.invalidateSize(), 500);
}

export function updateMapMarkers(filteredShows) {
  if (!cluster) return;
  state._filteredShows = filteredShows || null;
  cluster.clearLayers();
  markers = [];
  markerCityMap = {};

  const showList = filteredShows || SHOWS;

  showList.forEach((s) => {
    if (!s.lat) return;
    const ve = (s.venue || '').replace(/"/g, '&quot;');
    const ce = (s.city || '').replace(/"/g, '&quot;');
    const icon = L.divIcon({
      className: '',
      html: `<div class="concert-marker-wrap dot" data-venue="${ve}" data-cities="${ce}"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const m = L.marker([s.lat, s.lng], { icon });
    m._show = s;

    m.on('click', () => {
      clearHighlightedMarkers();
      const el = m.getElement();
      if (el) {
        const w = el.querySelector('.concert-marker-wrap');
        if (w) w.classList.add('highlighted');
      }
      if (s.venue && window.setSection && window.toggleVenue) {
        // If section isn't venues, OR a city-filter overlay is showing, reset first
        if (state.section !== 'venues' || state.cityFilter) {
          window.setSection('venues'); // clears expandedVenue + cityFilter + restores view-venues
        }
        if (state.expandedVenue !== s.venue) window.toggleVenue(s.venue, { skipFly: true });
      } else if (state.view !== 'map') {
        const cityShows = SHOWS.filter(
          (x) => x.city === s.city && x.country === s.country,
        );
        state.cityFilter = {
          city: s.city,
          country: s.country,
          shows: cityShows,
        };
        if (window.renderCityShows) window.renderCityShows();
      }
      if (window.innerWidth <= 768) {
        document.getElementById('right-panel')?.classList.add('sheet-open');
        document.body.classList.add('sheet-expanded');
      }
    });

    m.on('mouseover', () => {
      const el = m.getElement();
      if (el && s.venue) showTooltip(el, 'venue', s.venue);
    });
    m.on('mouseout', () => hideTooltip());

    cluster.addLayer(m);
    markers.push(m);
    if (!markerCityMap[s.city]) markerCityMap[s.city] = m;
  });
}

function openShowsListFromMarkers(childMarkers) {
  clearHighlightedMarkers();
  if (!childMarkers || childMarkers.length === 0) return;

  const venues = new Set(childMarkers.map((m) => m._show && m._show.venue).filter(Boolean));
  const cities = new Set(childMarkers.map((m) => m._show && m._show.city).filter(Boolean));

  // Single venue → open the venues section with that venue expanded
  if (venues.size === 1 && window.setSection && window.toggleVenue) {
    const venue = [...venues][0];
    if (state.section !== 'venues' || state.cityFilter) {
      window.setSection('venues');
    }
    if (state.expandedVenue !== venue) window.toggleVenue(venue, { skipFly: true });
    if (window.innerWidth <= 768) {
      document.getElementById('right-panel')?.classList.add('sheet-open');
      document.body.classList.add('sheet-expanded');
    }
    return;
  }

  // Multiple venues but a single city → fall back to the city list
  let shows;
  let label;
  if (cities.size === 1) {
    const first = childMarkers[0]._show;
    shows = SHOWS.filter((x) => x.city === first.city && x.country === first.country);
    label = { city: first.city, country: first.country };
  } else {
    shows = childMarkers.map((m) => m._show).filter(Boolean);
    const first = shows[0] || {};
    label = { city: first.city || 'Multiple cities', country: first.country || '' };
  }
  state.cityFilter = { ...label, shows };
  if (window.renderCityShows) window.renderCityShows();
  if (window.innerWidth <= 768) {
    document.getElementById('right-panel')?.classList.add('sheet-open');
    document.body.classList.add('sheet-expanded');
  }
}

export function clearHighlightedMarkers() {
  document
    .querySelectorAll('.concert-marker-wrap.highlighted')
    .forEach((el) => el.classList.remove('highlighted'));
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

// Shift a target lat/lng to the right (in pixel space) by half the right-panel's
// width so the actual point sits in the visible left half of the map rather than
// hidden behind the panel. No-op in map mode (panel is hidden).
function offsetTarget(latLng, zoom) {
  if (state.view === 'map' || !map) return latLng;
  const panel = document.getElementById('right-panel');
  if (!panel) return latLng;
  const rect = panel.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return latLng;
  // Only apply the offset when the panel is acting as a side rail
  // (sits to the right of the map). On mobile the panel is a bottom sheet
  // (left = 0, full width) so we skip the horizontal shift.
  const isSideRail = rect.left > window.innerWidth * 0.4 && rect.right >= window.innerWidth - 4;
  if (!isSideRail) return latLng;
  const point = map.project(latLng, zoom);
  // Center within the visible (non-panel) area, then nudge an extra ~100px
  // further so the marker sits well away from the panel edge.
  point.x += rect.width / 2 + 100;
  return map.unproject(point, zoom);
}

export function flyToCity(cityName) {
  const coords = CITY_COORDS[cityName];
  if (coords && map) {
    const zoom = Math.max(8, map.getZoom());
    const target = offsetTarget(L.latLng(coords[0], coords[1]), zoom);
    map.flyTo(target, zoom, { duration: 1.2 });
    map.once('moveend', () => {
      setTimeout(() => highlightMarkerForCity(cityName), 100);
    });
  }
}

export function flyToCountry(country) {
  const show = SHOWS.find((s) => s.country === country && CITY_COORDS[s.city]);
  if (show) {
    const zoom = Math.max(5, map.getZoom());
    const target = offsetTarget(L.latLng(CITY_COORDS[show.city][0], CITY_COORDS[show.city][1]), zoom);
    map.flyTo(target, zoom, { duration: 1.2 });
    map.once('moveend', () => {
      setTimeout(() => highlightMarkerForCity(show.city), 100);
    });
  }
}
