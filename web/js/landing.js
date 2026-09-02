// ============================================================
//  NAVBAR — efecto blur al hacer scroll
// ============================================================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ============================================================
//  CONTADORES ANIMADOS (mockup hero)
// ============================================================
function animateCounter(el, target, suffix, duration) {
  if (!el) return;
  duration = duration || 1500;
  suffix = suffix || '';
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target + suffix;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start) + suffix;
    }
  }, 16);
}

setTimeout(function () {
  animateCounter(document.getElementById('counter-alertas'), 47);
  animateCounter(document.getElementById('counter-pendientes'), 12);
  animateCounter(document.getElementById('counter-resueltas'), 35);
  animateCounter(document.getElementById('counter-tiempo'), 18, 'm');
}, 800);

// ============================================================
//  SCROLL REVEAL
// ============================================================
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(function (el) { revealObserver.observe(el); });

// ============================================================
//  NAV LINK ACTIVO según sección visible
// ============================================================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.navbar-links a');

const navObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      navLinks.forEach(function (link) {
        link.style.color = '';
        if (link.getAttribute('href') === '#' + entry.target.id) {
          link.style.color = 'var(--accent-teal)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(function (s) { navObserver.observe(s); });

// ============================================================
//  SMOOTH SCROLL para links ancla
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
