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
let hiddenPhotos = JSON.parse(localStorage.getItem('sv_hidden_photos') || '[]');

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

/* ========== GALLERY ========== */
function renderFilters(defaultSorties) {
  const customSorties = JSON.parse(localStorage.getItem('sv_custom_sorties') || '[]');
  const allSorties = [...customSorties, ...(defaultSorties || [])];
  const f = document.getElementById('galleryFilters');
  f.innerHTML = `<button class="filter-btn active" data-filter="all">Toutes</button>` +
    allSorties.map(s => `<button class="filter-btn" data-filter="${s.id}">${s.titre}</button>`).join('');
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
  const visible = allItems.filter(i => !hiddenPhotos.includes(i.src));
  const filtered = currentFilter === 'all' ? visible : visible.filter(i => i.sortieId === currentFilter);
  grid.innerHTML = filtered.map((item, idx) => `
    <div class="masonry-item" data-index="${idx}" data-src="${item.src.substring(0, 80)}">
      ${item.type === 'video'
        ? `<video src="${item.src}" muted loop playsinline ${item.poster ? `poster="${item.poster}"` : ''}></video><div class="masonry-play">▶</div>`
        : `<img src="${item.src}" alt="${item.alt || ''}" loading="lazy" onerror="this.parentElement.style.display='none'">`
      }
      ${item.label ? `<div class="masonry-overlay"><span>${item.label}</span></div>` : ''}
      <div class="masonry-delete" title="Appui long pour supprimer">✕</div>
    </div>
  `).join('');

  lightboxItems = filtered;
  grid.querySelectorAll('.masonry-item').forEach(el => {
    const idx = parseInt(el.dataset.index);
    let pressTimer = null;
    let didLongPress = false;

    el.addEventListener('pointerdown', e => {
      didLongPress = false;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        el.classList.add('deleting');
      }, 500);
    });
    el.addEventListener('pointerup', () => clearTimeout(pressTimer));
    el.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    el.addEventListener('pointermove', () => clearTimeout(pressTimer));

    el.addEventListener('click', e => {
      if (didLongPress || e.target.closest('.masonry-delete')) {
        didLongPress = false;
        const src = filtered[idx]?.src;
        if (src) deleteGalleryPhoto(src, el);
        return;
      }
      openLightbox(idx);
    });

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

function deleteGalleryPhoto(src, el) {
  if (!confirm('Supprimer cette photo ?')) return;
  el.style.opacity = '0';
  el.style.transform = 'scale(0.8)';
  el.style.transition = 'all 0.3s';

  const customSorties = JSON.parse(localStorage.getItem('sv_custom_sorties') || '[]');
  let found = false;
  customSorties.forEach(s => {
    if (s.photos) {
      const before = s.photos.length;
      s.photos = s.photos.filter(p => p.src !== src);
      if (s.photos.length < before) found = true;
    }
    if (s.cover === src) { s.cover = null; found = true; }
  });
  if (found) {
    localStorage.setItem('sv_custom_sorties', JSON.stringify(customSorties));
    window._customSorties = customSorties;
  }

  hiddenPhotos.push(src);
  try { localStorage.setItem('sv_hidden_photos', JSON.stringify(hiddenPhotos)); } catch {}

  importedPhotos = importedPhotos.filter(p => p.src !== src);

  setTimeout(() => {
    allItems = allItems.filter(i => i.src !== src);
    filterGallery();
  }, 300);
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

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 14);
    }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
  }

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
    <div class="legend-toggle" id="legendToggle">Légende ▾</div>
    <div class="legend-items" id="legendItems" style="display:none">
      <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Zone libre (A)</div>
      <div class="legend-item"><div class="legend-dot" style="background:#eab308"></div>Déclaration (B)</div>
      <div class="legend-item"><div class="legend-dot" style="background:#f97316"></div>Autorisation (C)</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>Interdit (D)</div>
      <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div>Lieu d'intérêt</div>
      <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Marqueur GPS</div>
    </div>
  `;
  const legendToggle = document.getElementById('legendToggle');
  const legendItems = document.getElementById('legendItems');
  legendToggle.addEventListener('click', () => {
    const open = legendItems.style.display !== 'none';
    legendItems.style.display = open ? 'none' : '';
    legendToggle.textContent = open ? 'Légende ▾' : 'Légende ▴';
  });

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
    canvas.width = 64; canvas.height = 64;
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let r = 0, g = 0, b = 0, bright = 0, greenCount = 0, warmCount = 0, skinCount = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i+1]; b += data[i+2];
      bright += (data[i] + data[i+1] + data[i+2]) / 3;
      if (data[i+1] > data[i] + 20 && data[i+1] > data[i+2] + 20) greenCount++;
      if (data[i] > 150 && data[i+1] > 100 && data[i+2] < 120) warmCount++;
      if (data[i] > 140 && data[i+1] > 100 && data[i+1] < 180 && data[i+2] > 80 && data[i+2] < 160) skinCount++;
    }
    const avgR = r / total, avgG = g / total, avgB = b / total;
    const greenPct = greenCount / total;
    const avgBright = bright / total;
    if (skinCount / total > 0.15 || warmCount / total > 0.2) return 'personnes';
    if (greenPct > 0.25 || (avgBright > 150 && avgB > avgR * 0.8)) return 'paysage';
    if ((avgR > 130 && avgG < 100 && avgB < 100) || (avgR > 150 && avgG > 100 && avgB < 80) || avgBright < 80) return 'batiments';
    return 'paysage';
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
      personnes: '🧑 Personnes', batiments: '🏛️ Bâtiments', paysage: '🌿 Paysage'
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

/* ========== SWIPE DISCOVER ========== */
function initSwipe(allLocations) {
  const cards = document.getElementById('swipeCards');
  const empty = document.getElementById('swipeEmpty');
  const counter = document.getElementById('swipeCounter');
  const saved = document.getElementById('swipeSaved');
  const savedList = document.getElementById('swipeSavedList');
  const nopeBtn = document.getElementById('swipeNope');
  const likeBtn = document.getElementById('swipeLike');
  const infoBtn = document.getElementById('swipeInfo');
  const resetBtn = document.getElementById('swipeReset');

  let savedIds = JSON.parse(localStorage.getItem('sv_saved_locations') || '[]');
  let queue = allLocations.filter(l => !savedIds.includes(l.id));
  let current = 0;
  let startX = 0, startY = 0, dx = 0, isDragging = false;

  const gradients = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
    'linear-gradient(135deg, #1b0a2a 0%, #2d1b4e 50%, #1a0a3e 100%)',
    'linear-gradient(135deg, #0a192f 0%, #112240 50%, #233554 100%)',
    'linear-gradient(135deg, #1a0000 0%, #2d1010 50%, #3d1a1a 100%)',
    'linear-gradient(135deg, #001a1a 0%, #0d2b2b 50%, #1a3d3d 100%)',
  ];

  function render() {
    if (current >= queue.length) {
      cards.innerHTML = '';
      empty.style.display = '';
      counter.textContent = '';
      renderSaved();
      return;
    }
    empty.style.display = 'none';
    cards.innerHTML = '';
    const remaining = queue.slice(current).reverse();
    remaining.forEach((loc, ri) => {
      const i = remaining.length - 1 - ri;
      const card = document.createElement('div');
      card.className = 'swipe-card' + (i > 0 ? ' behind' : '');
      card.dataset.id = loc.id;
      if (i === 0) {
        const g = gradients[allLocations.indexOf(loc) % gradients.length];
        card.innerHTML = `
          <div class="swipe-card-stamp like">AJOUTER</div>
          <div class="swipe-card-stamp nope">PASSER</div>
          <div class="swipe-card-img">
            <div class="swipe-card-gradient" style="background:${g}">
              <span class="swipe-emoji">${loc.icone}</span>
            </div>
          </div>
          <div class="swipe-card-body">
            <div class="swipe-card-cat">${loc.categorie}</div>
            <div class="swipe-card-name">${loc.nom}</div>
            <div class="swipe-card-desc">${loc.description}</div>
            <div class="swipe-card-meta">${(loc.tags||[]).map(t => `<span class="swipe-card-tag">${t}</span>`).join('')}</div>
            <div class="swipe-card-footer">
              <span class="swipe-card-stat"><strong>${loc.difficulte}</strong> Difficulte</span>
              <span class="swipe-card-stat"><strong>${loc.altitude_recommandee}</strong> Altitude</span>
              <span class="swipe-card-stat"><strong>${loc.meilleure_periode}</strong></span>
            </div>
          </div>
        `;
      } else if (i <= 2) {
        const g = gradients[allLocations.indexOf(loc) % gradients.length];
        card.style.background = g;
        card.style.borderColor = 'rgba(255,255,255,0.15)';
        card.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;opacity:0.15">${loc.icone}</div>`;
      }
      const scale = i === 0 ? 1 : 1 - i * 0.06;
      const translateY = i * 14;
      card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
      card.style.zIndex = 100 - i;
      if (i > 2) card.style.display = 'none';
      cards.appendChild(card);
    });
    counter.textContent = `${current + 1} / ${queue.length}`;
    if (current < queue.length) setupDrag(queue[current]);
  }

  function setupDrag(loc) {
    const card = cards.querySelector('.swipe-card:last-child');
    if (!card) return;

    function onStart(e) {
      isDragging = true;
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      card.style.transition = 'none';
    }
    function onMove(e) {
      if (!isDragging) return;
      dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
      const rotate = dx * 0.12;
      const dy = Math.abs(dx) * 0.05;
      card.style.transform = `translateX(${dx}px) rotate(${rotate}deg) translateY(${-dy}px)`;
      const likeStamp = card.querySelector('.swipe-card-stamp.like');
      const nopeStamp = card.querySelector('.swipe-card-stamp.nope');
      if (dx > 40) {
        likeStamp.style.opacity = Math.min(1, (dx - 40) / 80);
        nopeStamp.style.opacity = 0;
      } else if (dx < -40) {
        nopeStamp.style.opacity = Math.min(1, (-dx - 40) / 80);
        likeStamp.style.opacity = 0;
      } else {
        likeStamp.style.opacity = 0;
        nopeStamp.style.opacity = 0;
      }
    }
    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      card.style.transition = 'transform 0.4s cubic-bezier(.22,1,.36,1)';
      if (dx > 100) {
        flyOut(card, 'right', loc);
      } else if (dx < -100) {
        flyOut(card, 'left', loc);
      } else {
        card.style.transform = '';
        const stamps = card.querySelectorAll('.swipe-card-stamp');
        stamps.forEach(s => s.style.opacity = 0);
        dx = 0;
      }
    }

    card.addEventListener('mousedown', onStart);
    card.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);

    card._cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);
    };
  }

  function flyOut(card, dir, loc) {
    if (card._cleanup) card._cleanup();
    const x = dir === 'right' ? window.innerWidth : -window.innerWidth;
    card.style.transition = 'transform 0.5s cubic-bezier(.22,1,.36,1), opacity 0.5s';
    card.style.transform = `translateX(${x}px) rotate(${dir === 'right' ? 30 : -30}deg)`;
    card.style.opacity = '0';
    if (dir === 'right') {
      savedIds.push(loc.id);
      localStorage.setItem('sv_saved_locations', JSON.stringify(savedIds));
    }
    setTimeout(() => { current++; render(); }, 350);
  }

  function add(loc) {
    if (current >= queue.length) return;
    const card = cards.querySelector('.swipe-card:last-child');
    if (card) flyOut(card, 'right', loc);
  }

  function skip() {
    if (current >= queue.length) return;
    const card = cards.querySelector('.swipe-card:last-child');
    if (card) flyOut(card, 'left', queue[current]);
  }

  function renderSaved() {
    if (savedIds.length === 0) { saved.style.display = 'none'; return; }
    saved.style.display = '';
    savedList.innerHTML = savedIds.map(id => {
      const loc = allLocations.find(l => l.id === id);
      if (!loc) return '';
      return `<div class="swipe-saved-item">
        <span class="saved-emoji">${loc.icone}</span>
        <span class="saved-name">${loc.nom}</span>
        <span class="saved-cat">${loc.categorie}</span>
        <button class="saved-remove" data-id="${loc.id}" title="Retirer">✕</button>
      </div>`;
    }).join('');
    savedList.querySelectorAll('.saved-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        savedIds = savedIds.filter(i => i !== btn.dataset.id);
        localStorage.setItem('sv_saved_locations', JSON.stringify(savedIds));
        renderSaved();
        addSavedMarkersToMap(allLocations);
      });
    });
  }

  if (likeBtn) likeBtn.addEventListener('click', () => { if (current < queue.length) add(queue[current]); });
  if (nopeBtn) nopeBtn.addEventListener('click', () => { if (current < queue.length) skip(); });
  if (infoBtn) infoBtn.addEventListener('click', () => {
    if (current < queue.length) {
      const loc = queue[current];
      alert(`${loc.icone} ${loc.nom}\n\n${loc.description}\n\nConseils: ${loc.conseils}\nPeriode: ${loc.meilleure_periode}\nAltitude: ${loc.altitude_recommandee}`);
    }
  });
  if (resetBtn) resetBtn.addEventListener('click', () => {
    savedIds = [];
    localStorage.removeItem('sv_saved_locations');
    queue = [...allLocations];
    current = 0;
    empty.style.display = 'none';
    render();
  });

  render();
  renderSaved();
  addSavedMarkersToMap(allLocations);
}

function addSavedMarkersToMap(allLocations) {
  if (!window._mainMap) return;
  if (window._savedMapMarkers) window._savedMapMarkers.forEach(m => window._mainMap.removeLayer(m));
  window._savedMapMarkers = [];
  const savedIds = JSON.parse(localStorage.getItem('sv_saved_locations') || '[]');
  savedIds.forEach(id => {
    const loc = allLocations.find(l => l.id === id);
    if (!loc) return;
    const marker = L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({
        className: 'lieu-marker',
        html: `<div style="width:32px;height:32px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${loc.icone}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(window._mainMap);
    marker.bindPopup(`<div class="zone-popup"><h4>⭐ ${loc.nom}</h4><p>${loc.description}</p><span class="zone-tag" style="background:#22c55e">${loc.categorie}</span></div>`);
    window._savedMapMarkers.push(marker);
  });
}

/* ========== SORTIE FORM ========== */
function buildCustomSortieGallery() {
  const customSorties = JSON.parse(localStorage.getItem('sv_custom_sorties') || '[]');
  customSorties.forEach(s => {
    if (s.photos && s.photos.length) {
      s.photos.forEach(photo => {
        if (!allItems.some(i => i.src === photo.src)) {
          allItems.push({ type: 'image', src: photo.src, alt: photo.name, sortieId: s.id, label: s.titre + ' — ' + (photo.categorie || 'autre') });
        }
      });
    }
    if (s.cover && !allItems.some(i => i.src === s.cover)) {
      allItems.push({ type: 'image', src: s.cover, alt: s.titre, sortieId: s.id, label: s.titre });
    }
  });
}

function refreshSortiesAndGallery(defaultSorties, customSorties) {
  renderFilters(defaultSorties);
  renderAllSorties(defaultSorties, customSorties);
  allItems = [];
  buildGalleryItems(window._galleryData, defaultSorties);
  buildCustomSortieGallery();
  filterGallery();
}

function initSortieForm(defaultSorties) {
  const modal = document.getElementById('sortieModal');
  const form = document.getElementById('sortieForm');
  const addBtn = document.getElementById('addSortieBtn');
  const closeBtn = document.getElementById('sortieModalClose');
  const editId = document.getElementById('sortieEditId');
  const title = document.getElementById('sortieModalTitle');
  const deleteBtn = document.getElementById('sortieDeleteBtn');
  const photoUpload = document.getElementById('sortiePhotoUpload');
  const photoInput = document.getElementById('sortiePhotoInput');
  const photoPreview = document.getElementById('sortiePhotoPreview');
  const photoImg = document.getElementById('sortiePhotoImg');
  const photoRemove = document.getElementById('sortiePhotoRemove');

  let customSorties = [];
  try { customSorties = JSON.parse(localStorage.getItem('sv_custom_sorties') || '[]'); } catch { customSorties = []; }
  let pendingPhotos = [];

  function openModal(sortie) {
    form.reset();
    photoPreview.style.display = 'none';
    photoUpload.style.display = '';
    deleteBtn.style.display = 'none';
    pendingPhotos = [];
    if (sortie) {
      editId.value = sortie.id;
      title.textContent = 'Modifier la sortie';
      document.getElementById('sortieTitre').value = sortie.titre || '';
      document.getElementById('sortieDate').value = sortie.date || '';
      document.getElementById('sortieLieu').value = sortie.lieu || '';
      document.getElementById('sortieDesc').value = sortie.description || '';
      document.getElementById('sortieDistance').value = sortie.stats?.distance || '';
      document.getElementById('sortieDuree').value = sortie.stats?.duree || '';
      document.getElementById('sortieAltitude').value = sortie.stats?.altitude || '';
      pendingPhotos = sortie.photos ? [...sortie.photos] : [];
      if (sortie.cover) {
        photoImg.src = sortie.cover;
        photoPreview.style.display = '';
        photoUpload.style.display = 'none';
      }
      deleteBtn.style.display = '';
    } else {
      editId.value = '';
      title.textContent = 'Nouvelle sortie';
      document.getElementById('sortieDate').value = new Date().toISOString().split('T')[0];
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  window._openSortieModal = openModal;
  window._customSorties = customSorties;

  addBtn.addEventListener('click', () => openModal(null));
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function handleSubmit(e) {
    if (e) e.preventDefault();
    try {
      const sortie = {
        id: editId.value || 'custom-' + Date.now(),
        titre: document.getElementById('sortieTitre').value.trim(),
        date: document.getElementById('sortieDate').value,
        lieu: document.getElementById('sortieLieu').value.trim(),
        description: document.getElementById('sortieDesc').value.trim(),
        stats: {
          distance: document.getElementById('sortieDistance').value.trim() || '—',
          duree: document.getElementById('sortieDuree').value.trim() || '—',
          altitude: document.getElementById('sortieAltitude').value.trim() || '—'
        },
        cover: photoPreview.style.display !== 'none' ? photoImg.src : null,
        photos: pendingPhotos,
        custom: true
      };
      if (!sortie.titre || !sortie.date || !sortie.lieu) {
        alert('Remplis au minimum le titre, la date et le lieu.');
        return;
      }
      const idx = customSorties.findIndex(s => s.id === sortie.id);
      if (idx >= 0) customSorties[idx] = sortie;
      else customSorties.unshift(sortie);
      try {
        localStorage.setItem('sv_custom_sorties', JSON.stringify(customSorties));
      } catch (err) {
        alert('Espace de stockage insuffisant. Essayez sans photo.');
        return;
      }
      window._customSorties = customSorties;
      closeModal();
      try {
        refreshSortiesAndGallery(defaultSorties, customSorties);
      } catch (err) {
        console.error('refresh error:', err);
      }
    } catch (err) {
      console.error('submit error:', err);
      alert('Erreur lors de la sauvegarde: ' + err.message);
    }
  }

  form.addEventListener('submit', handleSubmit);

  photoUpload.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => {
    Array.from(photoInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const cat = classifyPhotoSimple(img);
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const max = 1200;
          if (w > max || h > max) {
            if (w > h) { h = Math.round(h * max / w); w = max; }
            else { w = Math.round(w * max / h); h = max; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          pendingPhotos.push({ src: compressed, name: file.name, categorie: cat });
          if (photoPreview.style.display === 'none') {
            photoImg.src = compressed;
            photoPreview.style.display = '';
            photoUpload.style.display = 'none';
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
  photoRemove.addEventListener('click', () => {
    photoPreview.style.display = 'none';
    photoUpload.style.display = '';
    photoInput.value = '';
  });

  deleteBtn.addEventListener('click', () => {
    if (!editId.value) return;
    if (!confirm('Supprimer cette sortie ?')) return;
    customSorties = customSorties.filter(s => s.id !== editId.value);
    try { localStorage.setItem('sv_custom_sorties', JSON.stringify(customSorties)); } catch {}
    closeModal();
    window._customSorties = customSorties;
    refreshSortiesAndGallery(defaultSorties, customSorties);
  });

  document.querySelectorAll('.sorties-grid').forEach(grid => {
    grid.addEventListener('dblclick', e => {
      const card = e.target.closest('.sortie-card');
      if (card && card.dataset.custom === 'true') {
        const id = card.dataset.sortie;
        const s = customSorties.find(x => x.id === id);
        if (s) openModal(s);
      }
    });
  });

  renderAllSorties(defaultSorties, customSorties);
}

function renderAllSorties(defaultSorties, customSorties) {
  const all = [...customSorties, ...defaultSorties];
  const g = document.getElementById('sortiesGrid');
  g.innerHTML = all.map(s => `
    <div class="sortie-card${s.custom ? ' sortie-custom' : ''}" data-sortie="${s.id}" data-custom="${s.custom || false}">
      <div class="sortie-cover-wrap">
        ${s.cover
          ? `<img src="${s.cover}" alt="${s.titre}" onerror="this.style.display='none'">`
          : `<div class="sortie-cover-placeholder">${s.lieu ? s.lieu.charAt(0) : '✈️'}</div>`
        }
        <span class="sortie-badge">${s.stats?.duree || '—'}</span>
        ${s.custom ? '<span class="sortie-badge-custom">✦</span>' : ''}
        ${s.photos && s.photos.length > 1 ? `<span class="sortie-badge-count">${s.photos.length} 📷</span>` : ''}
      </div>
      <div class="sortie-info">
        <div class="sortie-date">${new Date(s.date).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}</div>
        <h3 class="sortie-titre">${s.titre}</h3>
        <div class="sortie-lieu">${s.lieu}</div>
        ${s.description ? `<p class="sortie-desc">${s.description}</p>` : ''}
        <div class="sortie-stats">
          <span class="sortie-stat"><strong>${s.stats?.distance || '—'}</strong> distance</span>
          <span class="sortie-stat"><strong>${s.stats?.duree || '—'}</strong></span>
          <span class="sortie-stat"><strong>${s.stats?.altitude || '—'}</strong></span>
        </div>
        <button class="sortie-edit-btn" data-sortie-id="${s.id}" data-custom="${s.custom || false}" title="Modifier">✎</button>
      </div>
    </div>
  `).join('');

  g.querySelectorAll('.sortie-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.sortie-edit-btn')) return;
      if (card.dataset.custom === 'true') return;
      const id = card.dataset.sortie;
      currentFilter = id;
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === id));
      filterGallery();
    });
  });

  g.querySelectorAll('.sortie-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.sortieId;
      const all = [...(window._customSorties || []), ...defaultSorties];
      const s = all.find(x => x.id === id);
      if (s && window._openSortieModal) window._openSortieModal(s);
    });
  });

  if (typeof gsap !== 'undefined') {
    gsap.from(g.querySelectorAll('.sortie-card'), {
      y: 30, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out'
    });
  }
}

/* ========== NAV HERO BEHAVIOR ========== */
function initNavHeroBehavior() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  document.documentElement.classList.add('scroll-locked');

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
  let r = 0, g = 0, b = 0, bright = 0, warmCount = 0, skinCount = 0;
  const t = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]; g += d[i+1]; b += d[i+2];
    bright += (d[i] + d[i+1] + d[i+2]) / 3;
    if (d[i+1] > d[i] + 20 && d[i+1] > d[i+2] + 20) g++;
    if (d[i] > 150 && d[i+1] > 100 && d[i+2] < 120) warmCount++;
    if (d[i] > 140 && d[i+1] > 100 && d[i+1] < 180 && d[i+2] > 80 && d[i+2] < 160) skinCount++;
  }
  const greenPct = g / t;
  const avgR = r / t, avgG = g / t, avgB = b / t;
  const avgBright = bright / t;
  if (skinCount / t > 0.15) return 'personnes';
  if (warmCount / t > 0.2) return 'personnes';
  if (greenPct > 0.25) return 'paysage';
  if (avgBright > 150 && avgB > avgR * 0.8) return 'paysage';
  if ((avgR > 130 && avgG < 100 && avgB < 100) || (avgR > 150 && avgG > 100 && avgB < 80)) return 'batiments';
  if (avgBright < 80) return 'batiments';
  return 'paysage';
}

function renderImportedFromImport() {
  const grid = document.getElementById('importGrid');
  const cats = document.getElementById('importCategories');
  const catsSet = [...new Set(importedPhotos.map(p => p.category))];
  const catLabels = {
    personnes: '🧑 Personnes', batiments: '🏛️ Bâtiments', paysage: '🌿 Paysage'
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
    renderFilters(sorties.sorties);
  }

  if (gallery && sorties) {
    window._galleryData = gallery;
    buildGalleryItems(gallery, sorties.sorties);
    buildCustomSortieGallery();
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
  initSortieForm(sorties ? sorties.sorties : []);

  if (lieuxData && lieuxData.length) {
    initSwipe(lieuxData);
  }

  setTimeout(() => { initAnimations(); initLenis(); }, 100);
}

document.addEventListener('DOMContentLoaded', load);
