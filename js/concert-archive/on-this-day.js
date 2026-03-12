import { SHOWS, MONTH_NAMES } from './state.js';
import { esc } from './data.js';
import { fetchWikiImage } from './api.js';

function renderMobileOtdTicker(otdShows) {
  const ticker = document.getElementById('mobile-otd-ticker');
  if (!ticker || !otdShows.length) return;

  const items = otdShows.map(s => {
    const year = s.date.split('-')[0];
    return `<span class="otd-ticker-item">On this day in ${year},\u00a0<button class="otd-ticker-artist" data-artist="${esc(s.artist)}">${esc(s.artist)}</button></span><span class="otd-ticker-sep" aria-hidden="true">●</span>`;
  }).join('');

  const duration = Math.max(otdShows.length * 6, 20);
  ticker.innerHTML = `<div class="otd-ticker-track" style="--otd-duration:${duration}s">${items}${items}</div>`;
  document.body.classList.add('has-otd');

  ticker.addEventListener('click', e => {
    const btn = e.target.closest('.otd-ticker-artist');
    if (!btn) return;
    const name = btn.dataset.artist;
    if (window.expandMobileSheet) window.expandMobileSheet();
    if (window.setSection) window.setSection('artists');
    setTimeout(() => { if (window.toggleArtist) window.toggleArtist(name); }, 50);
  });
}

function makeOtdCard(s, wide = false) {
  const year = s.date.split('-')[0];
  const sa = s.artist.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const cardId = `otd-card-${s.date}-${s.artist.replace(/\W/g, '')}`;
  return `<button class="feat-card${wide ? ' feat-card--wide' : ''}" id="${cardId}" style="--fc-bg:#6b6b6b"
    onclick="if(window.setSection)window.setSection('artists');setTimeout(()=>{if(window.toggleArtist)window.toggleArtist('${sa}')},50)">
    <div class="feat-img"><img id="${cardId}-img" src="" alt="${esc(s.artist)}" loading="lazy"></div>
    <div class="feat-footer"><div class="feat-rank">${year}</div><div class="feat-name">${esc(s.artist)}</div></div>
  </button>`;
}

export function renderOnThisDay() {
  const container = document.getElementById('on-this-day');
  if (!container || !SHOWS || !SHOWS.length) return;

  const today  = new Date();
  const todayY = today.getFullYear();
  const mm     = String(today.getMonth() + 1).padStart(2, '0');
  const dd     = String(today.getDate()).padStart(2, '0');
  const mdStr  = `${mm}-${dd}`;

  const otdShows = SHOWS.filter(s => {
    const p = s.date.split('-');
    return p.length === 3 && parseInt(p[0]) < todayY && `${p[1]}-${p[2]}` === mdStr;
  }).sort((a, b) => b.date.localeCompare(a.date));

  if (!otdShows.length) { container.innerHTML = ''; return; }

  renderMobileOtdTicker(otdShows);

  const dateLabel = `${MONTH_NAMES[parseInt(mm) - 1]} ${parseInt(dd)}`;

  let innerHtml;
  if (otdShows.length === 1) {
    innerHtml = makeOtdCard(otdShows[0], true);
  } else if (otdShows.length === 2) {
    innerHtml = `<div class="otd-grid-2">${otdShows.map(s => makeOtdCard(s, false)).join('')}</div>`;
  } else {
    innerHtml = `<div class="featured-strip">${otdShows.map(s => makeOtdCard(s, false)).join('')}</div>`;
  }

  container.innerHTML = `
    <div class="otd-strip open">
      <button class="otd-header" onclick="this.closest('.otd-strip').classList.toggle('open')" aria-label="Toggle On This Day">
        <span class="otd-section-label">On this day — ${dateLabel}</span>
        <span class="otd-chevron">›</span>
      </button>
      <div class="otd-body">${innerHtml}</div>
    </div>`;

  otdShows.forEach(s => {
    const cardId = `otd-card-${s.date}-${s.artist.replace(/\W/g, '')}`;
    const img = document.getElementById(cardId + '-img');
    if (!img || img.getAttribute('src')) return;
    fetchWikiImage(s.artist, 'artist').then(url => {
      if (url && img) img.src = url;
    });
  });
}

export function toggleOnThisDay() {}

export function closeOnThisDay() {
  const strip = document.querySelector('#on-this-day .otd-strip');
  if (strip) strip.classList.remove('open');
}
