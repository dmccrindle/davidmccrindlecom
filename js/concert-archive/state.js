// State module - holds all shared application state

export let SHOWS = [];

export const LOGO_URL = '/img/favicon.svg';

export const state = {
  view: 'list',
  section: 'shows',
  year: 2026,
  sortMode: 'alpha-asc',
  expandedArtist: null,
  showsSearch: '',
  artistsSearch: '',
  venuesSearch: '',
  placesSearch: '',
  cityShowsSearch: '',
  cityShowsSortMode: 'date',
  years: [],
  cityFilter: null,
  placesSortMode: 'alpha-asc',
  venuesSortMode: 'alpha-asc',
  placesGroup: 'cities',
  expandedVenue: null,
  expandedPlace: null,
  _filteredShows: null, // For map zoom persistence
  onThisDayOpen: true,  // On This Day widget — open by default
  showType: 'concerts',  // 'concerts' | 'festivals'
};

export function setSHOWS(data) {
  SHOWS = data;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
