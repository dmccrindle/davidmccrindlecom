// Navigation module
import { state } from './concert-archive/state.js';
import { setSection } from './concert-archive/render.js';

export function toggleMobileMenu() {
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('mobile-menu').classList.toggle('open');
}

export function toggleMobileSectionDD(e) {
  e.stopPropagation();
  const dd = document.getElementById('mobile-section-dd');
  const isOpen = dd.classList.contains('open');
  dd.classList.toggle('open');
  if (!isOpen) {
    const sectionColors = { shows: '#e0177a', artists: '#f5820a', places: '#00a888', venues: '#4a6cf7' };
    dd.innerHTML = ['shows', 'artists', 'places', 'venues'].map(s =>
      `<div class="mobile-section-opt${s === state.section ? ' active' : ''}" onclick="mobileSectionSelect('${s}',event)">
        <span>${s.charAt(0).toUpperCase() + s.slice(1)}</span>
        <span class="mobile-section-count" style="color:${sectionColors[s]}">${document.getElementById(s + '-count').textContent}</span>
      </div>`
    ).join('');
  }
}

export function mobileSectionSelect(s, e) {
  e.stopPropagation();
  document.getElementById('mobile-section-dd').classList.remove('open');
  document.getElementById('mobile-section-label').textContent = s.charAt(0).toUpperCase() + s.slice(1);
  setSection(s);
}
