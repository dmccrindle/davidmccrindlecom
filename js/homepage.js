// Mobile menu
window.toggleMobileMenu = function() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('hamburger');
  const open = menu.classList.toggle('open');
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open);
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};

// Nav scroll backdrop + hide scroll hint
const scrollHint = document.getElementById('scroll-hint');
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 80);
  if (window.scrollY > 40) scrollHint.classList.add('hidden');
}, { passive: true });

// ── Carousel ──
const SLIDES = [
  { title: 'Record time', subtitle: 'Music is sweet. Tickets are complete.' },
  { title: 'Say, \u201CCheese!\u201D', subtitle: 'Forever snap happy and make pizza that ain\u2019t crappy' },
  { title: 'Work hard. Play hard.', subtitle: 'Not too formal and I play on Normal.' },
  { title: 'I\u2026 drive results?', subtitle: 'I\u2019ve run out of puns and rhymes\u2026 just scroll or click around' },
];
const TOTAL = SLIDES.length;
const AUTO_INTERVAL = 5000;
let current = 0, autoTimer = null, transitioning = false;

const trackLeft = document.getElementById('track-left');
const trackRight = document.getElementById('track-right');
const textEl = document.getElementById('carousel-text');
const titleEl = document.getElementById('carousel-title');
const subtitleEl = document.getElementById('carousel-subtitle');
const dotsContainer = document.getElementById('carousel-dots');

for (let i = 0; i < TOTAL; i++) {
  const dot = document.createElement('div');
  dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goTo(i));
  dotsContainer.appendChild(dot);
}

function updateTracks(idx) {
  trackLeft.style.transform = `translateY(-${(TOTAL - idx) * 100}vh)`;
  trackRight.style.transform = `translateY(-${idx * 100}vh)`;
}

function updateDots(idx) {
  dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
    d.classList.remove('timing');
  });
  requestAnimationFrame(() => requestAnimationFrame(() =>
    dotsContainer.querySelectorAll('.carousel-dot')[idx].classList.add('timing')
  ));
}

function goTo(idx) {
  if (transitioning || idx === current) return;
  transitioning = true;
  const wrap = current === TOTAL - 1 && idx === 0;
  textEl.classList.add('fading');
  if (wrap) {
    trackLeft.style.transform = 'translateY(0vh)';
    trackRight.style.transform = `translateY(-${TOTAL * 100}vh)`;
    setTimeout(() => {
      trackLeft.style.transition = 'none';
      trackRight.style.transition = 'none';
      updateTracks(0);
      trackLeft.offsetHeight;
      trackRight.offsetHeight;
      trackLeft.style.transition = '';
      trackRight.style.transition = '';
    }, 920);
  } else {
    updateTracks(idx);
  }
  setTimeout(() => {
    titleEl.textContent = SLIDES[idx].title;
    subtitleEl.textContent = SLIDES[idx].subtitle;
    textEl.classList.remove('fading');
  }, 400);
  updateDots(idx);
  current = idx;
  setTimeout(() => { transitioning = false; }, 950);
  resetAuto();
}

function next() { goTo((current + 1) % TOTAL); }
function prev() { goTo((current - 1 + TOTAL) % TOTAL); }
function resetAuto() { clearInterval(autoTimer); autoTimer = setInterval(next, AUTO_INTERVAL); }

document.getElementById('prev-btn').addEventListener('click', prev);
document.getElementById('next-btn').addEventListener('click', next);
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
});

let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
}, { passive: true });

updateTracks(0);
updateDots(0);
document.documentElement.style.setProperty('--timer-duration', AUTO_INTERVAL + 'ms');
resetAuto();

// ── Cards scroll ──
const cardsTrack = document.getElementById('cards-track');
const CARD_W = 300 + 24;
const TOTAL_CARDS = 6;
let cardsOffset = 0;

function getCardsLeft() {
  const vw = window.innerWidth;
  const pad = vw <= 900 ? 20 : 40;
  return (vw - Math.min(1280, vw)) / 2 + pad;
}

function applyCardsPadding() {
  cardsTrack.style.paddingLeft = getCardsLeft() + 'px';
}

applyCardsPadding();
window.addEventListener('resize', applyCardsPadding);

window.scrollCards = function(dir) {
  const vw = window.innerWidth;
  const visibleCards = vw <= 600 ? 1 : vw <= 900 ? 2 : 3;
  const maxOffset = Math.max(0, (TOTAL_CARDS - visibleCards) * CARD_W);
  cardsOffset = Math.max(0, Math.min(maxOffset, cardsOffset + dir * CARD_W));
  cardsTrack.style.transform = `translateX(-${cardsOffset}px)`;
  document.getElementById('cards-prev').disabled = cardsOffset === 0;
  document.getElementById('cards-next').disabled = cardsOffset >= maxOffset;
};

// ── Cards swipe ──
const cardsWrap = cardsTrack.closest('.cards-track-wrap');
let cardsTouchStartX = 0;
cardsWrap.addEventListener('touchstart', e => { cardsTouchStartX = e.touches[0].clientX; }, { passive: true });
cardsWrap.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - cardsTouchStartX;
  if (Math.abs(dx) > 40) scrollCards(dx < 0 ? 1 : -1);
}, { passive: true });

// ── Photo gallery ──
const photoTrack = document.getElementById('photo-track');
const photoSlides = photoTrack.querySelectorAll('.photo-slide');
let photoIdx = 0;

window.photoNav = function(dir) {
  photoIdx = (photoIdx + dir + photoSlides.length) % photoSlides.length;
  photoTrack.style.transform = `translateX(-${photoIdx * 100}%)`;
};

// ── Portfolio gate ──
window.checkGate = async function() {
  const input = document.getElementById('gate-password');
  const btn   = document.querySelector('.gate-btn');
  const password = input?.value?.trim();
  if (!password) return;

  btn && (btn.disabled = true);
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, scope: 'portfolio' })
    });
    if (res.ok) {
      window.location.href = '/experience/portfolio/';
    } else {
      input.value = '';
      input.classList.add('gate-error-shake');
      input.placeholder = 'Wrong password';
      setTimeout(() => { input.classList.remove('gate-error-shake'); input.placeholder = 'Password'; }, 600);
    }
  } catch(e) {
    input.value = '';
  } finally {
    btn && (btn.disabled = false);
  }
};

document.getElementById('gate-password')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') checkGate();
});

// ── Scroll fade-in ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
