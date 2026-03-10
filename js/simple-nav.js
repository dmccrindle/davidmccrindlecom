import './analytics.js';

// Minimal nav JS for non-Concert-Archive pages
// Handles the mobile hamburger menu and nav gradient on scroll

// Nav gradient on scroll
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

window.toggleMobileMenu = function () {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('hamburger');
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    btn.classList.remove('open');
  } else {
    menu.classList.add('open');
    btn.classList.add('open');
  }
};
