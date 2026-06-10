// map.js - MapLibre GL JS implementation
let map;
let markers = [];
let allHeritage = [];

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  try {
    const { data } = await LunarAPI.getHeritage();
    // Keep only entries with coordinates
    allHeritage = data.filter(h => h.lat && h.lng);
    renderList(allHeritage);
    addMarkers(allHeritage);
  } catch (e) {
    document.getElementById('heritageList').innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Lỗi tải dữ liệu. Vui lòng thử lại.</div>`;
  }

  // Search filter
  document.getElementById('searchInput').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = allHeritage.filter(h =>
      h.name.toLowerCase().includes(q) || (h.province && h.province.toLowerCase().includes(q))
    );
    renderList(filtered);
  });
});

function initMap() {
  // Vietnam bounding box: SW [102.14, 8.18] → NE [109.46, 23.39]
  const VN_SW = [102.144, 8.179];
  const VN_NE = [109.464, 23.393];

  map = new maplibregl.Map({
    container: 'map',
    // Full vector map with roads, labels & buildings (OpenFreeMap – no API key needed)
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [108.2062, 16.0463], // [lng, lat] — central Vietnam
    zoom: 5.5,
    minZoom: 4.8,
    maxZoom: 14,
    // Hard lock: users cannot pan/zoom outside Vietnam
    maxBounds: [
      [99.5,  6.0],  // SW – a little extra room for the border
      [112.0, 24.5]  // NE
    ]
  });

  // Fit precisely to Vietnam on first load
  map.on('load', () => {
    map.fitBounds([VN_SW, VN_NE], { padding: 32, duration: 600 });
  });

  // Navigation control (bottom-right, no compass)
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  map.addControl(new maplibregl.FullscreenControl(), 'top-right');
}

function addMarkers(list) {
  // Clean up existing markers
  markers.forEach(m => m.remove());
  markers = [];

  list.forEach(h => {
    if (h.lat && h.lng) {
      const coords = [h.lng, h.lat]; // MapLibre expects [lng, lat]

      // Create a simple colored circle element
      const el = document.createElement('div');
      el.className = 'custom-div-icon';
      el.style.backgroundColor = 'var(--accent)';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.9)';

      const marker = new maplibregl.Marker(el).setLngLat(coords).addTo(map);

      const img = apiImg(h.image_url) || '';
      const popupContent = `
        <div style="font-family: 'Be Vietnam Pro', sans-serif; color: #0a0b10; padding: 4px;">
          <h3 style="margin:0 0 6px; font-size:16px; font-weight:700; color:#0a0b10;">${h.name}</h3>
          <p style="margin:0 0 12px; font-size:12px; color:#555;">📍 ${h.province || ''}</p>
          ${img ? `<img src="${img}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:12px; border: 1px solid #eee;">` : ''}
          <a href="${h.page || '#'}" style="display:inline-block; padding: 8px 14px; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; text-decoration:none; font-weight:600; font-size:13px; border-radius:6px; width:100%; text-align:center; box-sizing:border-box; transition: opacity 0.2s;">Khám phá ngay</a>
        </div>`;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);
      marker.setPopup(popup);

      // Fly to location when marker is clicked
      el.addEventListener('click', () => {
        map.flyTo({ center: coords, zoom: 10, duration: 1.5 });
      });

      h.marker = marker; // store reference for focusHeritage
      markers.push(marker);
    }
  });
}

function renderList(list) {
  const container = document.getElementById('heritageList');
  if (list.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Không tìm thấy di sản nào</div>';
    return;
  }
  container.innerHTML = list.map(h => {
    const img = apiImg(h.image_url) || '';
    const cats = h.categories || (h.type ? [h.type] : []);
    const safeName = h.name.replace(/'/g, "\\'");
    return `
      <button class="heritage-item" onclick="focusHeritage('${safeName}')">
        ${img ? `<img src="${img}" alt="${h.name}">` : '<div style="width:54px;height:54px;background:rgba(255,255,255,0.1);border-radius:10px;flex-shrink:0;'></div>'}
        <div class="info">
          <h4>${h.name}</h4>
          <p>📍 ${h.province || cats.join(', ')}</p>
        </div>
      </button>\`; 
  }).join('');

  window.currentRenderedList = list;
}

function focusHeritage(name) {
  const h = allHeritage.find(item => item.name === name);
  if (!h) return;
  if (h.lat && h.lng && h.marker) {
    const coords = [h.lng, h.lat];
    map.flyTo({ center: coords, zoom: 10, duration: 1.5 });
    setTimeout(() => h.marker.togglePopup(), 1500);
  }
}

function toggleVideoModal() {
  const modal = document.getElementById('video-modal');
  if (modal.style.display === 'none' || modal.style.display === '') {
    const iframes = modal.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      if (iframe.dataset.src && !iframe.src) {
        iframe.src = iframe.dataset.src;
      }
    });
    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
    const iframes = modal.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.src = iframe.src);
  }
}

function apiImg(url) {
  return url?.startsWith('/') ? (LunarAPI.apiBase() || 'http://localhost:8000') + url : url;
}
