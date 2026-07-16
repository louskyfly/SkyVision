const API = {
  async load(file) {
    try { const r = await fetch(`data/${file}`); return await r.json(); }
    catch { return null; }
  }
};

let allItems = [];
let currentFilter = 'all';
let lightboxItems = [];
let lightboxIndex = 0;
let gpsWatchId = null;
let gpsMarkers = JSON.parse(localStorage.getItem('sv_gps_markers') || '[]');
let importedPhotos = [];

/* ========== NAV ========== */
function initNav() {
  const nav = document.getElementById('nav');
  const links = document.querySelectorAll('.nav-link');
  const bubble = document.getElementById('navBubble');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  const sections = document.querySelectorAll('.section, .hero');

  function moveBubble(link) {
    if (!link || !bubble) return;
    const r = link.getBoundingClientRect();
    const pr = link.parentElement.getBoundingClientRect();
    bubble.style.width = r.width + 'px';
    bubble.style.left = (r.left - pr.left) + 'px';
  }

  const activeLink = document.querySelector('.nav-link.active');
  if (activeLink) setTimeout(() => moveBubble(activeLink), 100);

  links.forEach(l => {
    l.addEventListener('click', e => {
      links.forEach(x => x.classList.remove('active'));
      l.classList.add('active');
      moveBubble(l);
    });
  });

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 200) current = s.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
      if (l.classList.contains('active')) moveBubble(l);
    });
  });

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  }
  mobileLinks.forEach(l => {
    l.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

/* ========== GLOW ========== */
function initGlow() {
  if (window.innerWidth < 768) return;
  const glow = document.getElementById('glow');
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });
}

/* ========== SCROLL ========== */
function initScroll() {
  window.addEventListener('scroll', () => {
    const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    document.getElementById('scrollBar').style.width = pct + '%';
  });
}

/* ========== PARTICLES ========== */
function initParticles() {
  const c = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const s = Math.random() * 3 + 1;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${Math.random()*10+10}s;animation-delay:${Math.random()*10}s`;
    c.appendChild(p);
  }
}

/* ========== SORTIES ========== */
function renderSorties(sorties) {
  const g = document.getElementById('sortiesGrid');
  g.innerHTML = sorties.map(s => `
    <div class="sortie-card" data-sortie="${s.id}">
      <div class="sortie-cover-wrap">
        <img src="${s.cover}" alt="${s.titre}" onerror="this.style.display='none'">
        <span class="sortie-badge">${s.stats.duree}</span>
      </div>
      <div class="sortie-info">
        <div class="sortie-date">${new Date(s.date).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}</div>
        <h3 class="sortie-titre">${s.titre}</h3>
        <div class="sortie-lieu">${s.lieu}</div>
        <p class="sortie-desc">${s.description}</p>
        <div class="sortie-stats">
          <span class="sortie-stat"><strong>${s.stats.distance}</strong> distance</span>
          <span class="sortie-stat"><strong>${s.stats.duree}</strong></span>
          <span class="sortie-stat"><strong>${s.stats.altitude}</strong></span>
        </div>
      </div>
    </div>
  `).join('');

  g.querySelectorAll('.sortie-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.sortie;
      currentFilter = id;
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === id));
      filterGallery();
    });
  });
}

/* ========== GALLERY ========== */
function renderFilters(sorties) {
  const f = document.getElementById('galleryFilters');
  f.innerHTML = `<button class="filter-btn active" data-filter="all">Toutes</button>` +
    sorties.map(s => `<button class="filter-btn" data-filter="${s.id}">${s.titre}</button>`).join('');
  f.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      f.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentFilter = b.dataset.filter;
      filterGallery();
    });
  });
}

function buildGalleryItems(gallery, sorties) {
  allItems = [];
  if (gallery && gallery.galleries) {
    Object.entries(gallery.galleries).forEach(([id, g]) => {
      if (id === 'all') return;
      g.items.forEach(item => allItems.push({ ...item, sortieId: id }));
    });
  }
  if (sorties) {
    sorties.forEach(s => {
      if (s.cover) allItems.push({ type: 'image', src: s.cover, alt: s.titre, sortieId: s.id, label: s.titre });
    });
  }
}

function filterGallery() {
  const grid = document.getElementById('masonryGrid');
  const filtered = currentFilter === 'all' ? allItems : allItems.filter(i => i.sortieId === currentFilter);
  grid.innerHTML = filtered.map((item, idx) => `
    <div class="masonry-item" data-index="${idx}">
      ${item.type === 'video'
        ? `<video src="${item.src}" muted loop playsinline ${item.poster ? `poster="${item.poster}"` : ''}></video><div class="masonry-play">▶</div>`
        : `<img src="${item.src}" alt="${item.alt || ''}" loading="lazy" onerror="this.parentElement.style.display='none'">`
      }
      ${item.label ? `<div class="masonry-overlay"><span>${item.label}</span></div>` : ''}
    </div>
  `).join('');

  lightboxItems = filtered;
  grid.querySelectorAll('.masonry-item').forEach(el => {
    const idx = parseInt(el.dataset.index);
    el.addEventListener('click', () => openLightbox(idx));
    const vid = el.querySelector('video');
    if (vid) {
      el.addEventListener('mouseenter', () => vid.play());
      el.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
    }
  });

  gsap.from(grid.querySelectorAll('.masonry-item'), {
    y: 30, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out'
  });
}

/* ========== LIGHTBOX ========== */
function openLightbox(i) {
  lightboxIndex = i;
  const lb = document.getElementById('lightbox');
  const content = document.getElementById('lightboxContent');
  const item = lightboxItems[i];
  if (!item) return;
  content.innerHTML = item.type === 'video'
    ? `<video src="${item.src}" controls autoplay style="max-width:90vw;max-height:85vh;border-radius:12px"></video>`
    : `<img src="${item.src}" alt="${item.alt || ''}">`;
  document.getElementById('lightboxCounter').textContent = `${i + 1} / ${lightboxItems.length}`;
  lb.classList.add('open');
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  const v = lb.querySelector('video');
  if (v) v.pause();
}

function navLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxItems.length) % lightboxItems.length;
  openLightbox(lightboxIndex);
}

function initLightbox() {
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => navLightbox(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => navLightbox(1));
  document.getElementById('lightbox').addEventListener('click', e => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });
}

/* ========== MAIN MAP ========== */
function initMainMap(data) {
  const carte = data.carte || {};
  const zones = data.zones || [];
  const lieux = data.lieux || [];

  const tileLayers = {
    carte: L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&format=image%2Fpng', {
      attribution: '&copy; IGN', maxZoom: 18
    }),
    satellite: L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&format=image%2Fjpeg', {
      attribution: '&copy; IGN', maxZoom: 18
    }),
    relief: L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MOUNTAIN.SHADE&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&format=image%2Fjpeg', {
      attribution: '&copy; IGN', maxZoom: 18
    })
  };

  const map = L.map('mainMap', {
    center: [43.65, 3.8],
    zoom: 10,
    layers: [tileLayers.carte],
    scrollWheelZoom: false
  });

  const zoneMarkers = [];
  const lieuMarkers = [];
  const gpsMapMarkers = [];

  zones.forEach(z => {
    const marker = L.circleMarker([z.lat, z.lng], {
      radius: Math.min(z.rayon / 200, 25),
      fillColor: z.couleur,
      fillOpacity: 0.25,
      color: z.couleur,
      weight: 2,
      className: 'zone-circle'
    }).addTo(map);
    marker.bindPopup(`<div class="zone-popup"><h4>${z.icone} ${z.nom}</h4><p>${z.description}</p><span class="zone-tag" style="background:${z.couleur}">${z.categorie} - ${z.type}</span><br><span style="font-size:0.7rem;color:#999">Alt. max: ${z.altitude_max}m</span></div>`);
    zoneMarkers.push({ marker, zone: z });
  });

  lieux.forEach(l => {
    const marker = L.marker([l.lat, l.lng], {
      icon: L.divIcon({
        className: 'lieu-marker',
        html: `<div style="width:32px;height:32px;background:#8b5cf6;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${l.icone}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(map);
    const tags = (l.tags || []).map(t => `<span class="loc-tag">${t}</span>`).join('');
    marker.bindPopup(`<div class="zone-popup"><h4>${l.icone} ${l.nom}</h4><p>${l.description}</p><span class="zone-tag" style="background:#8b5cf6">${l.categorie}</span><div class="loc-tags">${tags}</div><br><span style="font-size:0.7rem;color:#999">Difficulté: ${l.difficulte} | Alt: ${l.altitude_recommandee}</span><br><span style="font-size:0.7rem;color:#666">${l.conseils}</span></div>`);
    lieuMarkers.push({ marker, lieu: l });
  });

  gpsMarkers.forEach((m, i) => {
    const marker = L.marker([m.lat, m.lng], {
      icon: L.divIcon({
        className: 'gps-user-marker',
        html: '<div style="width:24px;height:24px;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    marker.bindPopup(`<div class="zone-popup"><h4>📌 ${m.label || 'Marqueur ' + (i+1)}</h4><p>${m.time || ''}</p></div>`);
    gpsMapMarkers.push(marker);
  });

  const legend = document.getElementById('carteLegend');
  legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Zone libre (A)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#eab308"></div>Déclaration (B)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f97316"></div>Autorisation (C)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Interdit (D)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div>Lieu d'intérêt</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Marqueur GPS</div>
  `;

  document.querySelectorAll('.carte-layer').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.carte-layer').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      map.eachLayer(l => map.removeLayer(l));
      tileLayers[btn.dataset.layer].addTo(map);
      zoneMarkers.forEach(z => z.marker.addTo(map));
      lieuMarkers.forEach(l => l.marker.addTo(map));
      gpsMapMarkers.forEach(m => m.addTo(map));
    });
  });

  document.querySelectorAll('.zone-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.zone-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const z = chip.dataset.zone;
      zoneMarkers.forEach(({ marker, zone }) => {
        if (z === 'all' || z === 'gps') { marker.addTo(map); }
        else if (z === 'lieux') { map.removeLayer(marker); }
        else { zone.type === z || zone.categorie === z ? marker.addTo(map) : map.removeLayer(marker); }
      });
      lieuMarkers.forEach(({ marker }) => {
        z === 'all' || z === 'lieux' || z === 'gps' ? marker.addTo(map) : map.removeLayer(marker);
      });
      gpsMapMarkers.forEach(m => {
        z === 'all' || z === 'gps' ? m.addTo(map) : map.removeLayer(m);
      });
    });
  });

  // Fullscreen toggle
  const fsBtn = document.getElementById('mapFullscreen');
  const wrapper = document.querySelector('.carte-wrapper');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      const isFullscreen = wrapper.classList.toggle('fullscreen');
      const section = wrapper.closest('.section');
      if (section) section.querySelector('.section-header').style.display = isFullscreen ? 'none' : '';
      setTimeout(() => map.invalidateSize(), 200);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && wrapper.classList.contains('fullscreen')) {
        wrapper.classList.remove('fullscreen');
        const section = wrapper.closest('.section');
        if (section) section.querySelector('.section-header').style.display = '';
        setTimeout(() => map.invalidateSize(), 200);
      }
    });
  }

  window._mainMap = map;
  window._gpsMapMarkers = gpsMapMarkers;
}

/* ========== FUTURE MAP (Legacy section removed, merged into main map) ========== */

/* ========== METEO ========== */
function initMeteo(data) {
  const meteo = data.meteo;
  const alertes = data.alertes;
  const wrap = document.getElementById('meteoWrap');
  if (!meteo) return;

  const windKmh = meteo.vent?.vitesse || 0;
  const activeAlerts = [];
  if (alertes) {
    alertes.alertes?.forEach(a => {
      let triggered = false;
      if (a.type === 'vent_fort' && windKmh >= a.seuil) triggered = true;
      if (a.type === 'rafales' && meteo.vent?.rafales >= a.seuil) triggered = true;
      if (a.type === 'pluie' && meteo.precipitations >= a.seuil) triggered = true;
      if (a.type === 'visibilite' && meteo.visibilite <= a.seuil) triggered = true;
      if (a.type === 'uv_extreme' && meteo.indice_uv >= a.seuil) triggered = true;
      if (a.type === 'temperature' && (meteo.temperature >= a.seuil_max || meteo.temperature <= a.seuil_min)) triggered = true;
      if (triggered) activeAlerts.push(a);
    });
  }

  const banner = document.getElementById('alertBanner');
  if (activeAlerts.length > 0) {
    banner.innerHTML = activeAlerts.map(a => `
      <div class="alert-card" style="background:${a.couleur}15;border-color:${a.couleur}">
        <span class="alert-icone">${a.icone}</span>
        <div class="alert-text"><h4>${a.titre}</h4><p>${a.description}</p></div>
      </div>
    `).join('');
  } else {
    banner.innerHTML = `<div class="alert-card" style="background:rgba(34,197,94,0.1);border-color:#22c55e"><span class="alert-icone">✅</span><div class="alert-text"><h4>Conditions favorables</h4><p>Aucune alerte en cours. Bon vol !</p></div></div>`;
  }

  const uvColor = meteo.indice_uv <= 2 ? '#22c55e' : meteo.indice_uv <= 5 ? '#eab308' : meteo.indice_uv <= 7 ? '#f97316' : '#ef4444';
  const windAngle = meteo.vent?.degres || 0;
  const pressionPct = ((meteo.pression - 950) / 100) * 100;

  wrap.innerHTML = `
    <div class="meteo-main">
      <div class="meteo-main-icone">${meteo.icone}</div>
      <div class="meteo-main-temp">${meteo.temperature}°C</div>
      <div class="meteo-main-resume">${meteo.resume} — ${meteo.lieu}</div>
      <div class="meteo-main-details">
        <span>Ressenti ${meteo.ressenti}°</span>
        <span>Min ${meteo.min}° / Max ${meteo.max}°</span>
        <span>${new Date(meteo.date).toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'})}</span>
      </div>
    </div>
    <div class="meteo-gauge-card">
      <h4>Vent</h4>
      <svg class="meteo-gauge-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#3b82f6" stroke-width="6" stroke-dasharray="327" stroke-dashoffset="${327 - (windKmh/60)*327}" stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1.5s ease"/>
        <g transform="rotate(${windAngle} 60 60)">
          <line x1="60" y1="20" x2="60" y2="8" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
          <polygon points="60,5 55,15 65,15" fill="#3b82f6"/>
        </g>
      </svg>
      <div class="meteo-gauge-value">${windKmh} km/h</div>
      <div class="meteo-gauge-label">${meteo.vent?.direction || ''} · Rafales ${meteo.vent?.rafales || 0}</div>
    </div>
    <div class="meteo-gauge-card">
      <h4>Humidité</h4>
      <svg class="meteo-gauge-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#06b6d4" stroke-width="6" stroke-dasharray="327" stroke-dashoffset="${327 - (meteo.humidite/100)*327}" stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1.5s ease"/>
      </svg>
      <div class="meteo-gauge-value">${meteo.humidite}%</div>
      <div class="meteo-gauge-label">Point de rosée ${meteo.point_de_rosee}°</div>
    </div>
    <div class="meteo-gauge-card">
      <h4>Indice UV</h4>
      <svg class="meteo-gauge-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="${uvColor}" stroke-width="6" stroke-dasharray="327" stroke-dashoffset="${327 - (meteo.indice_uv/11)*327}" stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1.5s ease"/>
      </svg>
      <div class="meteo-gauge-value" style="color:${uvColor}">${meteo.indice_uv}</div>
      <div class="meteo-gauge-label">${meteo.indice_uv <= 2 ? 'Faible' : meteo.indice_uv <= 5 ? 'Modéré' : meteo.indice_uv <= 7 ? 'Élevé' : 'Très élevé'}</div>
    </div>
    <div class="meteo-gauge-card">
      <h4>Pression</h4>
      <svg class="meteo-gauge-svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#a855f7" stroke-width="6" stroke-dasharray="327" stroke-dashoffset="${327 - (pressionPct/100)*327}" stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1.5s ease"/>
      </svg>
      <div class="meteo-gauge-value">${meteo.pression} hPa</div>
      <div class="meteo-gauge-label">${meteo.pression > 1013 ? 'Haute' : 'Basse'} pression</div>
    </div>
    <div class="meteo-info-card"><div class="info-label">Visibilité</div><div class="info-value">${meteo.visibilite} km</div></div>
    <div class="meteo-info-card"><div class="info-label">Nuages</div><div class="info-value">${meteo.nuages}%</div></div>
    <div class="meteo-info-card"><div class="info-label">Précipitations</div><div class="info-value">${meteo.precipitations} mm</div></div>
    <div class="meteo-info-card"><div class="info-label">Soleil</div><div class="info-value">${meteo.lever_soleil} → ${meteo.coucher_soleil}</div></div>
    ${meteo.previsions ? `
    <div class="meteo-forecast">
      ${meteo.previsions.map(p => `
        <div class="meteo-forecast-day">
          <div class="day-name">${p.jour}</div>
          <div class="day-icon">${p.icone}</div>
          <div class="day-temps"><span class="day-high">${p.max}°</span> <span class="day-low">${p.min}°</span></div>
        </div>
      `).join('')}
    </div>` : ''}
  `;

  if (alertes?.regles_vol) {
    document.getElementById('reglesVol').innerHTML = `
      <h3>📋 Règles de vol en France</h3>
      <ul>${alertes.regles_vol.map(r => `<li>${r}</li>`).join('')}</ul>
    `;
  }
}

/* ========== GPS ========== */
function initGPS() {
  const toggle = document.getElementById('gpsToggle');
  const markerBtn = document.getElementById('gpsMarkerBtn');
  const clearBtn = document.getElementById('gpsClearBtn');
  const latEl = document.getElementById('gpsLat');
  const lngEl = document.getElementById('gpsLng');
  const accEl = document.getElementById('gpsAccuracy');
  const markersEl = document.getElementById('gpsMarkers');

  function renderMarkers() {
    markersEl.innerHTML = gpsMarkers.map((m, i) => `
      <div class="gps-marker-item">
        <span>📌 ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)} — ${m.label || 'Marqueur ' + (i + 1)}</span>
        <button class="gps-marker-del" data-idx="${i}">×</button>
      </div>
    `).join('');
    markersEl.querySelectorAll('.gps-marker-del').forEach(btn => {
      btn.addEventListener('click', () => {
        gpsMarkers.splice(parseInt(btn.dataset.idx), 1);
        localStorage.setItem('sv_gps_markers', JSON.stringify(gpsMarkers));
        renderMarkers();
      });
    });
  }

  renderMarkers();

  toggle.addEventListener('click', () => {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
      toggle.textContent = 'Activer GPS';
      latEl.textContent = lngEl.textContent = accEl.textContent = '--';
      markerBtn.disabled = true;
      clearBtn.disabled = true;
      return;
    }
    if (!navigator.geolocation) { alert('Géolocalisation non supportée'); return; }
    toggle.textContent = 'Désactiver GPS';
    markerBtn.disabled = false;
    clearBtn.disabled = false;
    gpsWatchId = navigator.geolocation.watchPosition(pos => {
      latEl.textContent = pos.coords.latitude.toFixed(5);
      lngEl.textContent = pos.coords.longitude.toFixed(5);
      accEl.textContent = '±' + Math.round(pos.coords.accuracy) + 'm';

      if (window._mainMap && !window._gpsUserLayer) {
        window._gpsUserLayer = L.layerGroup().addTo(window._mainMap);
      }
    }, err => {
      console.warn('GPS error:', err.message);
    }, { enableHighAccuracy: true, maximumAge: 5000 });
  });

  markerBtn.addEventListener('click', () => {
    if (gpsWatchId === null) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const m = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Vol ' + (gpsMarkers.length + 1), time: new Date().toLocaleTimeString('fr-FR') };
      gpsMarkers.push(m);
      localStorage.setItem('sv_gps_markers', JSON.stringify(gpsMarkers));
      renderMarkers();
      if (window._mainMap) {
        const marker = L.marker([m.lat, m.lng], {
          icon: L.divIcon({
            className: 'gps-user-marker',
            html: '<div style="width:24px;height:24px;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(window._mainMap);
        marker.bindPopup(`<div class="zone-popup"><h4>📌 ${m.label}</h4><p>${m.time}</p></div>`);
        if (window._gpsMapMarkers) window._gpsMapMarkers.push(marker);
      }
    });
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Effacer tous les marqueurs ?')) {
      gpsMarkers = [];
      localStorage.removeItem('sv_gps_markers');
      renderMarkers();
    }
  });

  renderMarkers();
}

/* ========== WIDGETS ========== */
function initWidgets() {
  let compassDeg = 0;
  let altiVal = '--';
  let pitch = 0, roll = 0;
  const compassNeedle = document.getElementById('compassNeedle');
  const compassDegrees = document.getElementById('compassDegrees');
  const altiNeedle = document.getElementById('altiNeedle');
  const altiValue = document.getElementById('altiValue');
  const altiLabel = document.getElementById('altiLabel');
  const iniBubble = document.getElementById('incliBubble');
  const iniBeta = document.getElementById('incliBeta');
  const iniGamma = document.getElementById('incliGamma');

  function handleOrientation(e) {
    if (e.alpha !== null) {
      compassDeg = Math.round(e.alpha);
      if (compassNeedle) compassNeedle.setAttribute('transform', `rotate(${-compassDeg} 100 100)`);
      if (compassDegrees) compassDegrees.textContent = compassDeg + '°';
    }
    if (e.beta !== null) {
      pitch = Math.round(e.beta);
      if (iniBeta) iniBeta.textContent = pitch + '°';
    }
    if (e.gamma !== null) {
      roll = Math.round(e.gamma);
      if (iniGamma) iniGamma.textContent = roll + '°';
    }
    if (iniBubble) {
      const bx = 100 + Math.max(-35, Math.min(35, roll * 0.8));
      const by = 100 + Math.max(-35, Math.min(35, pitch * 0.8));
      iniBubble.setAttribute('transform', `translate(${bx - 100} ${by - 100})`);
    }
  }

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission().then(r => {
        if (r === 'granted') window.addEventListener('deviceorientation', handleOrientation);
      }).catch(() => {});
    }, { once: true });
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(pos => {
      const alt = Math.round(pos.coords.altitude || 0);
      if (alt > 0) {
        altiVal = alt + ' m';
        altiLabel.textContent = 'Altitude GPS';
        if (altiValue) altiValue.textContent = altiVal;
        const angle = Math.min(360, (alt / 900) * 360);
        if (altiNeedle) altiNeedle.setAttribute('transform', `rotate(${angle - 90} 100 100)`);
      }
    }, () => {
      if (altiValue) altiValue.textContent = 'N/A';
      if (altiLabel) altiLabel.textContent = 'GPS indisponible';
    });
  }

  if (!('DeviceOrientationEvent' in window)) {
    if (compassDegrees) compassDegrees.textContent = 'N/A';
    if (iniBeta) iniBeta.textContent = 'N/A';
    if (iniGamma) iniGamma.textContent = 'N/A';
  }
}

/* ========== DJI IMPORT ========== */
function initDJIImport() {
  const zone = document.getElementById('importZone');
  const input = document.getElementById('importInput');
  const grid = document.getElementById('importGrid');
  const cats = document.getElementById('importCategories');
  let currentCatFilter = 'all';

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handleFiles(input.files));

  function classifyPhoto(img, file) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = 64, h = 64;
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let r = 0, g = 0, b = 0, bright = 0;
    let greenCount = 0, blueCount = 0, warmCount = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i+1]; b += data[i+2];
      const lum = (data[i] + data[i+1] + data[i+2]) / 3;
      bright += lum;
      if (data[i+1] > data[i] + 20 && data[i+1] > data[i+2] + 20) greenCount++;
      if (data[i+2] > data[i] && data[i+2] > data[i+1]) blueCount++;
      if (data[i] > 150 && data[i+1] > 100) warmCount++;
    }

    r /= total; g /= total; b /= total;
    bright /= total;
    const greenPct = greenCount / total;
    const bluePct = blueCount / total;

    if (file.name.toUpperCase().includes('DJI') && file.name.toUpperCase().includes('PERSON') || file.name.toUpperCase().includes('DJI_') && bright > 120 && warmCount / total > 0.3) {
      return 'personnes';
    }
    if (greenPct > 0.25) return 'nature';
    if (bluePct > 0.25) return 'eau';
    if (bright > 180 && bluePct < 0.15) return 'ciel';
    if (r > 130 && g < 100 && b < 100) return 'batiments';
    if (r > 150 && g > 100 && b < 80) return 'batiments';

    return 'autre';
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const cat = classifyPhoto(img, file);
          const photo = { name: file.name, src: e.target.result, category: cat };
          importedPhotos.push(photo);
          renderImported();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderImported() {
    const catsSet = [...new Set(importedPhotos.map(p => p.category))];
    const catLabels = {
      personnes: '🧑 Personnes', animaux: '🐾 Animaux', batiments: '🏛️ Bâtiments',
      nature: '🌿 Nature', eau: '💧 Eau', ciel: '☁️ Ciel', vehicules: '🚗 Véhicules', autre: '❓ Autre'
    };

    cats.innerHTML = `<button class="filter-btn active" data-cat="all">Toutes (${importedPhotos.length})</button>` +
      catsSet.map(c => `<button class="filter-btn" data-cat="${c}">${catLabels[c] || c} (${importedPhotos.filter(p => p.category === c).length})</button>`).join('');

    cats.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        cats.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCatFilter = btn.dataset.cat;
        renderGrid();
      });
    });

    renderGrid();
  }

  function renderGrid() {
    const filtered = currentCatFilter === 'all' ? importedPhotos : importedPhotos.filter(p => p.category === currentCatFilter);
    grid.innerHTML = filtered.map(p => `
      <div class="photo-card">
        <img src="${p.src}" alt="${p.name}" loading="lazy">
        <div class="photo-card-info">
          <div class="photo-card-name">${p.name}</div>
          <span class="photo-category ${p.category}">${p.category}</span>
        </div>
      </div>
    `).join('');
  }
}

/* ========== NAV HERO BEHAVIOR ========== */
function initNavHeroBehavior() {
  const nav = document.querySelector('.nav');
  const hero = document.getElementById('hero');
  if (!nav || !hero) return;

  document.documentElement.classList.add('scroll-locked');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nav.classList.add('nav--hero');
        document.documentElement.classList.add('scroll-locked');
      } else {
        nav.classList.remove('nav--hero');
        document.documentElement.classList.remove('scroll-locked');
      }
    });
  }, { threshold: 0.3 });
  observer.observe(hero);

  document.querySelectorAll('.nav-link, .mobile-link, .hero-buttons a').forEach(el => {
    el.addEventListener('click', () => {
      document.documentElement.classList.remove('scroll-locked');
    });
  });
}

/* ========== MINI WIDGETS (Hero) ========== */
function initMiniWidgets() {
  // Meteo mini
  API.load('meteo.json').then(data => {
    if (!data) return;
    const ic = document.getElementById('miniMeteoIcon');
    const temp = document.getElementById('miniMeteoTemp');
    const wind = document.getElementById('miniWindVal');
    if (ic) ic.textContent = data.icone || '☀️';
    if (temp) temp.textContent = (data.temperature || '--') + '°';
    if (wind) wind.textContent = (data.vent?.vitesse || '--') + ' km/h';
  });

  // Compass mini
  function handleOrientationMini(e) {
    if (e.alpha !== null) {
      const deg = Math.round(e.alpha);
      const el = document.getElementById('miniCompassVal');
      if (el) el.textContent = deg + '°';
    }
  }
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission().then(r => {
        if (r === 'granted') window.addEventListener('deviceorientation', handleOrientationMini);
      }).catch(() => {});
    }, { once: true });
  } else {
    window.addEventListener('deviceorientation', handleOrientationMini);
  }

  // Alti mini
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(pos => {
      const alt = Math.round(pos.coords.altitude || 0);
      const el = document.getElementById('miniAltiVal');
      if (el) el.textContent = alt > 0 ? alt + ' m' : 'N/A';
    }, () => {});
  }
}

/* ========== DJI FLY AUTO-IMPORT ========== */
function initDJIAutoImport() {
  if (!('showDirectoryPicker' in window)) return;
  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-sm btn-outline';
  importBtn.textContent = '📂 Scanner dossier DJI Fly';
  importBtn.style.marginTop = '0.5rem';
  const importZone = document.getElementById('importZone');
  if (importZone) importZone.appendChild(importBtn);

  importBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      const djiDir = await findDJIFolder(dirHandle);
      if (!djiDir) { alert('Dossier DJI Fly non trouvé. Sélectionnez le dossier DCIM.'); return; }
      await scanAndImport(djiDir);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('DJI import error:', e);
    }
  });

  async function findDJIFolder(handle) {
    for await (const [name, entry] of handle) {
      if (entry.kind === 'directory' && name.toUpperCase().includes('DJI')) return entry;
      if (entry.kind === 'directory' && name.toUpperCase() === 'DCIM') {
        for await (const [n, e] of entry) {
          if (e.kind === 'directory' && n.toUpperCase().includes('DJI')) return e;
        }
      }
    }
    return null;
  }

  async function scanAndImport(dirHandle) {
    const files = [];
    for await (const [name, entry] of dirHandle) {
      if (entry.kind === 'file' && /\.(jpg|jpeg|png|heic)$/i.test(name)) files.push(entry);
    }
    for (const file of files) {
      const f = await file.getFile();
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const cat = classifyPhotoSimple(img);
          importedPhotos.push({ name: f.name, src: e.target.result, category: cat });
          renderImportedFromImport();
          addImportedToGallery(f.name, e.target.result, cat);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(f);
    }
  }
}

function classifyPhotoSimple(img) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  let g = 0, b = 0, t = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+1] > d[i] + 20 && d[i+1] > d[i+2] + 20) g++;
    if (d[i+2] > d[i] && d[i+2] > d[i+1]) b++;
  }
  if (g / t > 0.25) return 'nature';
  if (b / t > 0.25) return 'eau';
  return 'autre';
}

function renderImportedFromImport() {
  const grid = document.getElementById('importGrid');
  const cats = document.getElementById('importCategories');
  const catsSet = [...new Set(importedPhotos.map(p => p.category))];
  const catLabels = {
    personnes: '🧑 Personnes', animaux: '🐾 Animaux', batiments: '🏛️ Bâtiments',
    nature: '🌿 Nature', eau: '💧 Eau', ciel: '☁️ Ciel', vehicules: '🚗 Véhicules', autre: '❓ Autre'
  };
  cats.innerHTML = `<button class="filter-btn active" data-cat="all">Toutes (${importedPhotos.length})</button>` +
    catsSet.map(c => `<button class="filter-btn" data-cat="${c}">${catLabels[c] || c} (${importedPhotos.filter(p => p.category === c).length})</button>`).join('');
  grid.innerHTML = importedPhotos.map(p => `
    <div class="photo-card">
      <img src="${p.src}" alt="${p.name}" loading="lazy">
      <div class="photo-card-info">
        <div class="photo-card-name">${p.name}</div>
        <span class="photo-category ${p.category}">${p.category}</span>
      </div>
    </div>
  `).join('');
}

function addImportedToGallery(name, src, cat) {
  allItems.push({ type: 'image', src, alt: name, sortieId: 'all', label: name });
  if (currentFilter === 'all') filterGallery();
}

/* ========== ANIMATIONS ========== */
function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.hero-tag', { y: 30, opacity: 0, duration: 0.8, delay: 0.2 });
  gsap.from('.hero-title', { y: 40, opacity: 0, duration: 0.8, delay: 0.4 });
  gsap.from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.8, delay: 0.6 });
  gsap.from('.hero-buttons', { y: 30, opacity: 0, duration: 0.8, delay: 0.8 });
  gsap.from('.drone-img', { y: 50, opacity: 0, duration: 1, delay: 1 });

  gsap.utils.toArray('.section').forEach(s => {
    gsap.from(s.querySelectorAll('.sortie-card, .widget-card, .meteo-gauge-card, .meteo-info-card'), {
      scrollTrigger: { trigger: s, start: 'top 80%' },
      y: 30, opacity: 0, duration: 0.5, stagger: 0.08
    });
  });
}

/* ========== LENIS ========== */
function initLenis() {
  const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ========== TRANSITIONS ========== */
function initTransitions() {
  const pt = document.getElementById('pageTransition');
  gsap.to(pt, { opacity: 0, duration: 0.5 });
}

/* ========== LOAD ========== */
async function load() {
  const [config, sorties, gallery, drone, zonesData, lieuxData, meteoData, alertesData] = await Promise.all([
    API.load('config.json'),
    API.load('sorties.json'),
    API.load('gallery.json'),
    API.load('drone.json'),
    API.load('flight-zones.json'),
    API.load('interesting-locations.json'),
    API.load('meteo.json'),
    API.load('weather-alerts.json')
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

  if (gallery && sorties) {
    buildGalleryItems(gallery, sorties.sorties);
    filterGallery();
  }

  gpsMarkers = JSON.parse(localStorage.getItem('sv_gps_markers') || '[]');

  initMainMap({
    zones: zonesData?.zones || [],
    lieux: lieuxData || []
  });

  initMeteo({
    meteo: meteoData,
    alertes: alertesData
  });

  initNav();
  initTransitions();
  initGlow();
  initScroll();
  initParticles();
  initLightbox();
  initGPS();
  initWidgets();
  initDJIImport();
  initMiniWidgets();
  initDJIAutoImport();
  initNavHeroBehavior();

  setTimeout(() => { initAnimations(); initLenis(); }, 100);
}

document.addEventListener('DOMContentLoaded', load);
