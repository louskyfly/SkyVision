/* === DATA LOADER === */
const API = {
  async load(file) {
    try { const r = await fetch(`data/${file}`); return await r.json(); }
    catch(e) { console.warn(`Failed: ${file}`); return null; }
  }
};

/* === STATE === */
let allItems = [];
let currentFilter = 'all';
let lightboxItems = [];
let lightboxIndex = 0;

/* === NAV === */
function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('mobileMenu');
  const navLinks = document.getElementById('navLinks');
  const bubble = document.getElementById('navBubble');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40));
  toggle?.addEventListener('click', () => menu.classList.toggle('open'));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

  // Bubble animation
  const links = navLinks?.querySelectorAll('a');
  if (!links || !bubble) return;

  function moveBubble(el) {
    const linksRect = navLinks.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    bubble.style.left = (elRect.left - linksRect.left) + 'px';
    bubble.style.width = elRect.width + 'px';
  }

  // Set initial position to first link
  moveBubble(links[0]);

  links.forEach(link => {
    link.addEventListener('click', e => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      moveBubble(link);
    });
  });

    // Update on resize
    window.addEventListener('resize', () => {
      const active = navLinks.querySelector('a.active') || links[0];
      moveBubble(active);
    });

    // Scroll-based active section
    const sections = document.querySelectorAll('.section');
    window.addEventListener('scroll', () => {
      let current = links[0];
      sections.forEach(sec => {
        if (scrollY >= sec.offsetTop - 200) current = navLinks.querySelector(`a[href="#${sec.id}"]`) || current;
      });
      if (current && !current.classList.contains('active')) {
        links.forEach(l => l.classList.remove('active'));
        current.classList.add('active');
        moveBubble(current);
      }
    });
  }

/* === GLOW === */
function initGlow() {
  const g = document.getElementById('glow');
  if (!g || innerWidth < 768) return;
  document.addEventListener('mousemove', e => { g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; });
}

/* === SCROLL PROGRESS === */
function initScroll() {
  const bar = document.getElementById('scrollBar');
  addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (scrollY / h * 100) + '%';
  });
}

/* === PARTICLES === */
function initParticles() {
  const container = document.querySelector('.particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (4 + Math.random() * 8) + 's';
    p.style.animationDelay = Math.random() * 8 + 's';
    p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
    container.appendChild(p);
  }
}

/* === SORTIES CARDS === */
function renderSorties(sorties) {
  const grid = document.getElementById('sortiesGrid');
  if (!grid || !sorties) return;
  grid.innerHTML = sorties.map(s => `
    <div class="sortie-card" data-sortie="${s.id}">
      <div class="sortie-cover-wrap">
        <img class="sortie-cover" src="${s.cover}" alt="${s.titre}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#1a1a2e,#16213e)';this.alt=''">
        <div class="sortie-badge">${s.stats.duree}</div>
      </div>
      <div class="sortie-info">
        <div class="sortie-date">${new Date(s.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
        <div class="sortie-title">${s.titre}</div>
        <div class="sortie-lieu">${s.lieu}</div>
        <div class="sortie-desc">${s.description}</div>
        <div class="sortie-stats">
          <div class="sortie-stat"><span>${s.stats.distance}</span> distance</div>
          <div class="sortie-stat"><span>${s.stats.altitude}</span> altitude</div>
          <div class="sortie-stat"><span>${s.stats.duree}</span> vol</div>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.sortie-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.sortie;
      currentFilter = id;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === id));
      filterGallery();
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* === GALLERY === */
function renderFilters(sorties) {
  const bar = document.getElementById('galleryFilters');
  if (!bar) return;
  bar.innerHTML = `<button class="filter-btn active" data-filter="all">Toutes</button>`;
  sorties.forEach(s => {
    bar.innerHTML += `<button class="filter-btn" data-filter="${s.id}">${s.titre}</button>`;
  });
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterGallery();
  });
}

function buildGalleryItems(gallery, sorties) {
  allItems = [];
  if (!gallery || !gallery.galleries) return;
  Object.entries(gallery.galleries).forEach(([key, gal]) => {
    if (gal.items) {
      gal.items.forEach(item => {
        allItems.push({ ...item, sortieId: key });
      });
    }
  });
  // Also add sorties covers as gallery items
  if (sorties) {
    sorties.forEach(s => {
      if (s.cover && !allItems.find(i => i.src === s.cover)) {
        allItems.push({ type: 'image', src: s.cover, alt: s.titre, sortieId: s.id, label: s.titre });
      }
    });
  }
}

function filterGallery() {
  const grid = document.getElementById('masonryGrid');
  if (!grid) return;
  const filtered = currentFilter === 'all' ? allItems : allItems.filter(i => i.sortieId === currentFilter);
  lightboxItems = filtered;

  grid.innerHTML = filtered.map((item, idx) => {
    if (item.type === 'video') {
      return `<div class="masonry-item" data-index="${idx}">
        <video src="${item.src}" muted loop preload="metadata" poster="${item.poster || ''}"></video>
        <div class="masonry-play"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>
        <div class="masonry-overlay"><span class="masonry-label">${item.label || item.alt}</span></div>
      </div>`;
    }
    return `<div class="masonry-item" data-index="${idx}">
      <img src="${item.src}" alt="${item.alt}" loading="lazy">
      <div class="masonry-overlay"><span class="masonry-label">${item.label || item.alt}</span></div>
    </div>`;
  }).join('');

  // Click handlers
  grid.querySelectorAll('.masonry-item').forEach(el => {
    el.addEventListener('click', () => openLightbox(parseInt(el.dataset.index)));
  });

  // Video hover play
  grid.querySelectorAll('.masonry-item video').forEach(v => {
    v.closest('.masonry-item').addEventListener('mouseenter', () => v.play());
    v.closest('.masonry-item').addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
  });

  // GSAP animations
  if (typeof gsap !== 'undefined') {
    gsap.from(grid.children, { y: 40, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' });
  }
}

/* === LIGHTBOX === */
function openLightbox(index) {
  const lb = document.getElementById('lightbox');
  const content = lb.querySelector('.lightbox-content');
  const counter = lb.querySelector('.lightbox-counter');
  lightboxIndex = index;
  const item = lightboxItems[index];
  if (!item) return;

  if (item.type === 'video') {
    content.innerHTML = `<video src="${item.src}" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:var(--r-lg)"></video>`;
  } else {
    content.innerHTML = `<img src="${item.src}" alt="${item.alt}">`;
  }
  counter.textContent = `${index + 1} / ${lightboxItems.length}`;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  document.body.style.overflow = '';
  const video = lb.querySelector('video');
  if (video) video.pause();
}

function navLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxItems.length) % lightboxItems.length;
  openLightbox(lightboxIndex);
}

function initLightbox() {
  const lb = document.getElementById('lightbox');
  lb.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lb.querySelector('.lightbox-prev').addEventListener('click', () => navLightbox(-1));
  lb.querySelector('.lightbox-next').addEventListener('click', () => navLightbox(1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });
}

/* === FUTURE SORTIE MAP === */
async function initFutureMap() {
  const mapEl = document.getElementById('futureMap');
  const legendEl = document.getElementById('futureLegend');
  if (!mapEl) return;

  const res = await API.load('future-sorties.json');
  if (!res) return;
  const lieux = Array.isArray(res) ? res : [];

  const map = L.map(mapEl, { scrollWheelZoom: false }).setView([43.65, 3.45], 9);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  const categories = [...new Set(lieux.map(l => l.categorie))];
  const catColors = { Nature:'#22c55e', Patrimoine:'#f59e0b', Château:'#ef4444', Littoral:'#3b82f6', Village:'#a855f7' };

  lieux.forEach(lieu => {
    const color = catColors[lieu.categorie] || '#3b82f6';
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;background:${color};border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,0.4);">${lieu.icone}</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14]
    });

    L.marker([lieu.lat, lieu.lng], { icon }).addTo(map)
      .bindPopup(`<div class="future-popup"><h4>${lieu.nom}</h4><p>${lieu.description}</p><span>${lieu.categorie}</span></div>`);
  });

  // Fit bounds
  if (lieux.length) {
    const bounds = L.latLngBounds(lieux.map(l => [l.lat, l.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  // Legend chips
  if (legendEl) {
    categories.forEach(cat => {
      const chip = document.createElement('div');
      chip.className = 'future-chip';
      chip.textContent = cat;
      chip.dataset.cat = cat;
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        map.eachLayer(layer => {
          if (layer instanceof L.Marker) {
            const lieuxMatch = lieux.find(l => l.categorie === cat && l.lat === layer.getLatLng().lat);
            if (lieuxMatch) {
              const visible = !chip.classList.contains('active');
              if (visible) layer.addTo(map); else map.removeLayer(layer);
            }
          }
        });
      });
      legendEl.appendChild(chip);
    });
  }
}

/* === SPECS === */
function renderSpecs() {}

/* === GSAP === */
function initAnimations() {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.hero-tag', { y: 30, opacity: 0, duration: 0.8, delay: 0.2 });
  gsap.from('.hero-title', { y: 50, opacity: 0, duration: 1, delay: 0.4 });
  gsap.from('.hero-subtitle', { y: 40, opacity: 0, duration: 0.8, delay: 0.6 });
  gsap.from('.hero-buttons', { y: 30, opacity: 0, duration: 0.8, delay: 0.8 });
  gsap.from('.drone-3d', { y: 80, opacity: 0, scale: 0.7, duration: 1.2, delay: 1 });

  gsap.utils.toArray('.section').forEach(sec => {
    gsap.from(sec.querySelectorAll('.sortie-card, .spec-card'), {
      y: 50, opacity: 0, duration: 0.6, stagger: 0.08,
      scrollTrigger: { trigger: sec, start: 'top 80%' }
    });
  });
}

/* === LENIS === */
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* === PAGE TRANSITIONS === */
function initTransitions() {
  const overlay = document.getElementById('pageTransition');
  if (!overlay) return;

  // Fade in on load
  document.body.classList.add('loading');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
    });
  });

  // Fade out on link click
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.endsWith('.js') || href.endsWith('.css')) return;
    link.addEventListener('click', e => {
      e.preventDefault();
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'all';
      setTimeout(() => { window.location.href = href; }, 350);
    });
  });
}

/* === METEO MODULE === */
async function initMeteo() {
  const wrap = document.getElementById('meteoWrap');
  if (!wrap) return;

  const data = await API.load('meteo.json');
  if (!data) return;

  const circumference = 2 * Math.PI * 50;

  function createGauge(id, value, max, unit, color, label, sub) {
    const pct = Math.min(value / max, 1);
    const offset = circumference * (1 - pct);
    return `
      <div class="meteo-gauge-card">
        <div class="meteo-gauge">
          <svg viewBox="0 0 120 120">
            <circle class="gauge-bg" cx="60" cy="60" r="50"/>
            <circle class="gauge-fill" cx="60" cy="60" r="50"
              stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
              data-target="${offset}"/>
          </svg>
          <div class="gauge-value">
            <div class="gauge-num" style="color:${color}">${value}</div>
            <div class="gauge-unit">${unit}</div>
          </div>
        </div>
        <div class="gauge-label">${label}</div>
        ${sub ? `<div class="gauge-sub">${sub}</div>` : ''}
      </div>`;
  }

  function createInfo(icon, label, value) {
    return `
      <div class="meteo-info-card">
        <div class="meteo-info-icon">${icon}</div>
        <div class="meteo-info-text">
          <div class="label">${label}</div>
          <div class="value">${value}</div>
        </div>
      </div>`;
  }

  const uvLabel = data.indice_uv <= 2 ? 'Faible' : data.indice_uv <= 5 ? 'Modéré' : data.indice_uv <= 7 ? 'Élevé' : 'Très élevé';
  const uvColor = data.indice_uv <= 2 ? '#22c55e' : data.indice_uv <= 5 ? '#eab308' : data.indice_uv <= 7 ? '#f97316' : '#ef4444';

  wrap.innerHTML = `
    <div class="meteo-main">
      <div class="meteo-main-icone">${data.icone}</div>
      <div class="meteo-main-info">
        <h3>${data.temperature}° <span>${data.resume}</span></h3>
        <p>${data.lieu} — ${data.date}</p>
        <div class="meteo-main-details">
          <div class="meteo-main-detail">Ressenti <strong>${data.ressenti}°</strong></div>
          <div class="meteo-main-detail">Min <strong>${data.min}°</strong></div>
          <div class="meteo-main-detail">Max <strong>${data.max}°</strong></div>
        </div>
      </div>
    </div>

    ${createGauge('vent', data.vent.vitesse, 60, 'km/h', '#3b82f6', 'Vent', `${data.vent.direction} · Rafales ${data.vent.rafales} km/h`)}
    ${createGauge('humidite', data.humidite, 100, '%', '#8b5cf6', 'Humidité', `Point de rosée ${data.point_de_rosee}°`)}
    ${createGauge('uv', data.indice_uv, 11, '', uvColor, 'Indice UV', uvLabel)}
    ${createGauge('pression', data.pression, 1050, 'hPa', '#06b6d4', 'Pression', '')}

    ${createInfo('👁️', 'Visibilité', data.visibilite + ' km')}
    ${createInfo('☁️', 'Nuages', data.nuages + '%')}
    ${createInfo('🌧️', 'Précipitations', data.precipitations + ' mm')}
    ${createInfo('🌅', 'Lever / Coucher', `${data.lever_soleil} / ${data.coucher_soleil}`)}

    <div class="meteo-forecast">
      ${data.previsions.map(p => `
        <div class="meteo-forecast-day">
          <div class="day">${p.jour}</div>
          <div class="icon">${p.icone}</div>
          <div class="temps"><span class="hi">${p.max}°</span> <span class="lo">${p.min}°</span></div>
        </div>
      `).join('')}
    </div>`;

  // Animate gauges
  setTimeout(() => {
    wrap.querySelectorAll('.gauge-fill').forEach(circle => {
      circle.style.strokeDashoffset = circle.dataset.target;
    });
  }, 200);
}

/* === LOAD === */
async function load() {
  const [config, sorties, gallery, drone] = await Promise.all([
    API.load('config.json'), API.load('sorties.json'),
    API.load('gallery.json'), API.load('drone.json')
  ]);

  if (config) {
    document.getElementById('siteTitle').textContent = config.site.title;
    document.getElementById('heroTag').textContent = config.site.drone;
    document.getElementById('heroTitle').textContent = config.site.title;
    document.getElementById('heroSubtitle').textContent = config.site.tagline;
  }

  if (sorties) {
    renderSorties(sorties.sorties);
    renderFilters(sorties.sorties);
  }

  if (gallery) {
    buildGalleryItems(gallery, sorties?.sorties);
    filterGallery();
  }

  renderSpecs();
  initFutureMap();
  initMeteo();
  initNav();
  initTransitions();
  initGlow();
  initScroll();
  initParticles();
  initLightbox();
  initSmoothScroll();
  setTimeout(() => { initAnimations(); initLenis(); }, 100);
}

document.addEventListener('DOMContentLoaded', load);