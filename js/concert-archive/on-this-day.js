import { SHOWS, state, MONTH_NAMES } from './state.js';
import { countryShort, esc } from './data.js';
import { fetchWikiImage } from './api.js';

// Render a show row in the same format as the main list
function showRow(s, extraClass = '') {
  const [yr, mo, dy] = s.date.split('-');
  const cDisplay = countryShort(s.country);
  const supportHtml = s.support
    ? s.support.split(';').map(x => esc(x.trim())).filter(Boolean).join('; ')
    : '';
  return `<div class="otd-rest-row${extraClass ? ' ' + extraClass : ''}">
    <div class="show-day" style="width:44px;flex-shrink:0">
      <span class="show-day-month">${MONTH_NAMES[parseInt(mo)-1].slice(0,3)}</span>
      <span class="show-day-num">${parseInt(dy)}</span>
      <span class="show-day-year">${yr}</span>
    </div>
    <div class="show-artist-col">
      <div class="show-artist">${esc(s.artist)}</div>
      ${supportHtml ? `<div class="show-support">${supportHtml}</div>` : ''}
    </div>
    <div class="show-venue-col">
      <div class="show-venue">${esc(s.venue)}</div>
      <div class="show-location">${esc(s.city)}, ${cDisplay}</div>
    </div>
  </div>`;
}

export function renderOnThisDay() {
  const container = document.getElementById('on-this-day');
  if (!container || !SHOWS || !SHOWS.length) return;

  // Today's month-day (MM-DD)
  const today  = new Date();
  const todayY = today.getFullYear();
  const mm     = String(today.getMonth() + 1).padStart(2, '0');
  const dd     = String(today.getDate()).padStart(2, '0');
  const mdStr  = `${mm}-${dd}`;

  // All past shows on exactly this calendar date, most recent first
  const otdShows = SHOWS.filter(s => {
    const p = s.date.split('-');
    return p.length === 3 && parseInt(p[0]) < todayY && `${p[1]}-${p[2]}` === mdStr;
  }).sort((a, b) => b.date.localeCompare(a.date));

  if (!otdShows.length) { container.innerHTML = ''; return; }

  const isOpen    = state.onThisDayOpen;
  const dateLabel = `${MONTH_NAMES[parseInt(mm) - 1]} ${parseInt(dd)}`;
  const featured  = otdShows[0];
  const rest      = otdShows.slice(1);

  container.innerHTML = `
    <div class="otd-widget${isOpen ? ' open' : ''}">

      <button class="otd-header" onclick="toggleOnThisDay()">
        <svg class="otd-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="otd-heading">On this day&nbsp;&nbsp;${dateLabel}</span>
        <span class="otd-badge">${otdShows.length}</span>
      </button>

      <div class="otd-body">

        <!-- Featured artist photo (no text overlay) -->
        <div class="otd-feat-photo-wrap">
          <img class="otd-feat-photo" id="otd-feat-photo" src="" alt="${esc(featured.artist)}" aria-hidden="true">
        </div>

        <!-- Featured show info as a standard row -->
        <div class="otd-featured-rows">
          ${showRow(featured, 'otd-feat-row')}
          ${rest.map(s => showRow(s)).join('')}
        </div>

      </div><!-- /.otd-body -->
    </div><!-- /.otd-widget -->
  `;

  // Async: load artist photo, fade in when ready
  fetchWikiImage(featured.artist, 'artist').then(url => {
    if (!url) return;
    const wrap = container.querySelector('.otd-feat-photo-wrap');
    const img  = document.getElementById('otd-feat-photo');
    if (!img || !wrap) return;
    img.onload = () => { img.classList.add('loaded'); wrap.classList.add('has-photo'); };
    img.src = url;
  });
}

export function toggleOnThisDay() {
  state.onThisDayOpen = !state.onThisDayOpen;
  const widget = document.querySelector('.otd-widget');
  if (widget) widget.classList.toggle('open', state.onThisDayOpen);
}

// Called when user navigates to a different year
export function closeOnThisDay() {
  state.onThisDayOpen = false;
  const widget = document.querySelector('.otd-widget');
  if (widget) widget.classList.remove('open');
}
