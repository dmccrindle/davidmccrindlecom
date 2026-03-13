import { parseData, deriveYears } from './data.js';
import { render } from './render.js';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysXxlSN04_8dQsLqZNKRF4R6mN8m03M1SpcNgJ61uv6dQsCzd8xv5y_yjjiu8_aOq9hw/exec';

export function openAddShow() {
  document.getElementById('add-show-modal').classList.add('open');
  setTimeout(() => document.getElementById('as-date').focus(), 50);
}

export function closeAddShow() {
  document.getElementById('add-show-modal').classList.remove('open');
  document.getElementById('add-show-form').reset();
  setStatus('');
}

function setStatus(msg, isError) {
  const el = document.getElementById('as-status');
  el.textContent = msg;
  el.className = 'as-status' + (isError ? ' error' : msg ? ' success' : '');
}

export async function submitAddShow(e) {
  e.preventDefault();
  const btn = document.getElementById('as-submit');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  setStatus('');

  // Convert YYYY-MM-DD → M/D/YYYY for the sheet
  const rawDate = document.getElementById('as-date').value;
  const [y, m, d] = rawDate.split('-');
  const sheetDate = `${parseInt(m)}/${parseInt(d)}/${y}`;

  const data = {
    date: sheetDate,
    artist: document.getElementById('as-artist').value.trim(),
    support: document.getElementById('as-support').value.trim(),
    festival: document.getElementById('as-festival').checked ? 'Yes' : '',
    tour: document.getElementById('as-tour').value.trim(),
    venue: document.getElementById('as-venue').value.trim(),
    city: document.getElementById('as-city').value.trim(),
    country: document.getElementById('as-country').value.trim(),
    friends: document.getElementById('as-friends').value.trim(),
    notes: document.getElementById('as-notes').value.trim(),
  };

  try {
    // no-cors: Apps Script doesn't return CORS headers, but the write still happens
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setStatus('Show added!');
    setTimeout(async () => {
      closeAddShow();
      await parseData();
      deriveYears();
      render();
    }, 1000);
  } catch (err) {
    setStatus('Error saving. Try again.', true);
    btn.disabled = false;
    btn.textContent = 'Add Show';
  }
}
