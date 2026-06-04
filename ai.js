// ----------------------------------------------
//  CONFIG — centralized API_BASE from api.js
// ----------------------------------------------
const API = API_BASE; // Defined by api.js (auto-detects localhost vs production)

// ----------------------------------------------
//  CURSOR
// ----------------------------------------------
const cr = document.getElementById('cr'), cd = document.getElementById('cd');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cd.style.left = mx + 'px'; cd.style.top = my + 'px' });
(function ac() { rx += (mx - rx) * .17; ry += (my - ry) * .17; cr.style.left = rx + 'px'; cr.style.top = ry + 'px'; requestAnimationFrame(ac) })();
document.querySelectorAll('button,a,input,.drop-zone').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('ch'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('ch'));
});

// ----------------------------------------------
//  SERVER HEALTH CHECK
// ----------------------------------------------
async function checkHealth() {
  try {
    const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const d = await r.json();
      document.getElementById('server-status').className = 'status-online';
      document.getElementById('server-status').innerHTML = '<span class="status-dot"></span> AI đang hoạt động';
      const badge = document.getElementById('server-badge');
      if (badge) {
        badge.textContent = `Gemini ${d.model || 'Flash'} - Online`;
        badge.style.color = 'var(--gr)';
      }
    }
  } catch {
    document.getElementById('server-status').className = 'status-offline';
    document.getElementById('server-status').innerHTML = '<span style="width:6px;height:6px;background:#ef4444;border-radius:50%;display:inline-block"></span> Server offline';
    const badge = document.getElementById('server-badge');
    if (badge) {
      badge.textContent = '⚠️ Server chưa chạy - xem README';
      badge.style.color = '#ef4444';
    }
  }
}
checkHealth();
setInterval(checkHealth, 30000);

// Check intent from Virtual Tour
document.addEventListener('DOMContentLoaded', () => {
  const intent = localStorage.getItem('lunar_ai_intent');
  if (intent) {
    localStorage.removeItem('lunar_ai_intent');
    setTimeout(() => sq(intent), 500);
  }
});

// ----------------------------------------------
//  TAB SWITCH
// ----------------------------------------------
function switchTab(id, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('on'));
  if (btn) btn.classList.add('on');
  else document.querySelectorAll('.tab-btn')[0].classList.add('on');
  document.getElementById('tab-' + id).classList.add('on');
}

// ----------------------------------------------
//  CHAT
// ----------------------------------------------
let chatHist = [];
function addMsg(t, role) {
  const m = document.getElementById('chat-msgs'), d = document.createElement('div');
  d.className = 'msg ' + role; d.innerHTML = t; m.appendChild(d); m.scrollTop = m.scrollHeight; return d;
}
function showTyping() {
  const m = document.getElementById('chat-msgs'), d = document.createElement('div');
  d.className = 'msg bot ty'; d.id = 'ty'; d.innerHTML = '<span></span><span></span><span></span>';
  m.appendChild(d); m.scrollTop = m.scrollHeight;
}
function rmTyping() { document.getElementById('ty')?.remove(); }

async function typeText(node, html) {
  const chunks = html.split(/(<[^>]+>|\s+)/g).filter(Boolean);
  let current = '';
  for (const chunk of chunks) {
    current += chunk;
    node.innerHTML = current;
    document.getElementById('chat-msgs').scrollTop = document.getElementById('chat-msgs').scrollHeight;
    if (!chunk.startsWith('<') && chunk.trim() !== '') {
      await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
    }
  }
}

async function readApiError(res) {
  const raw = await res.text();
  let data = null;
  try { data = JSON.parse(raw); } catch { }
  if (res.status === 429) return data?.error || 'Gemini đang hết quota miễn phí. Hãy thử lại sau hoặc đổi API key/project khác.';
  return data?.error || raw || `HTTP ${res.status}`;
}

function speakStory(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
    const voices = synth.getVoices();
    utterance.voice = voices.find(v => v.lang.includes('vi')) || voices[0];
    utterance.lang = 'vi-VN';
    utterance.pitch = 0.85;
    utterance.rate = 1.0;
    synth.speak(utterance);
  }
}

async function sendChat() {
  const inp = document.getElementById('chat-input'), text = inp.value.trim();
  if (!text) return; inp.value = '';
  addMsg(text, 'user'); chatHist.push({ role: 'user', content: text });
  showTyping();
  try {
    rmTyping();
    const msgNode = addMsg('', 'bot');
    let fullReply = '';

    const response = await fetch(`${API}/api/ai/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHist.slice(-12) })
    });

    if (!response.ok) throw new Error(await readApiError(response));

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6);
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            if (data.error) throw new Error(data.error);
            if (data.text) {
              fullReply += data.text;
              msgNode.innerHTML = fullReply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              document.getElementById('chat-msgs').scrollTop = document.getElementById('chat-msgs').scrollHeight;
            }
          } catch (err) { console.error(err); }
        }
      }
    }

    chatHist.push({ role: 'assistant', content: fullReply });

    const formatted = fullReply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (formatted.toLowerCase().includes('đáp án') || formatted.toLowerCase().includes('đúng rồi')) {
      setTimeout(() => {
        msgNode.innerHTML += `<br><br><button onclick="LunarWS.send('claim_artifact', { artifactId: 'quiz-bonus-' + Date.now(), stickerUrl: '', region: 'ai' }); setTimeout(()=>LunarAPI.getPassport().then(d => { showToast('+100 điểm Hộ chiếu! Bạn đang có ' + d.points + ' điểm.') }), 500); this.disabled=true; this.textContent='Đã nhận!';" class="qb" style="background:#00ff8820;color:#00ff88;border-color:#00ff88">🎁 Nhận 100 Điểm Thưởng</button>`;
      }, 500);
    } else if (fullReply.length > 150) {
      setTimeout(() => {
        msgNode.innerHTML += `<div class="quick-row" style="padding:10px 0 0 0;border:none;margin-top:8px"><button class="qb" onclick="sq('Kể thêm cho tôi nghe')">💬 Kể thêm</button><button class="qb" onclick="sq('Đố vui về chủ đề này đi')">🎁 Đố vui</button><button class="qb" onclick="sq('Nó liên quan đến địa danh nổi tiếng nào?')">🗺️ Liên quan địa danh</button></div>`;
        document.getElementById('chat-msgs').scrollTop = document.getElementById('chat-msgs').scrollHeight;
      }, 800);
    }

    speakStory(fullReply);
  } catch (e) { rmTyping(); addMsg(`❌ ${e.message}`, 'bot'); }
}
function sq(t) {
  const tabs = document.querySelectorAll('.tab-btn');
  switchTab('chat', tabs[0]);
  setTimeout(() => { document.getElementById('chat-input').value = t; sendChat(); }, 100);
}

// ----------------------------------------------
//  IMAGE UPLOAD & ANALYZE
// ----------------------------------------------
let selectedFile = null;
function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('img-preview');
    preview.src = e.target.result; preview.style.display = 'block';
    document.getElementById('drop-placeholder').style.display = 'none';
    document.getElementById('analyze-btn').style.display = 'block';
    document.getElementById('img-result').style.display = 'none';
  };
  reader.readAsDataURL(file);
}
function handleDrop(e) {
  e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag');
  const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) handleFile(file);
}
async function analyzeImage() {
  if (!selectedFile) return;
  const btn = document.getElementById('analyze-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích...';
  const result = document.getElementById('img-result');
  result.style.display = 'block'; result.innerHTML = '<div class="spinner"></div>';
  try {
    const fd = new FormData(); fd.append('file', selectedFile);
    const res = await fetch(`${API}/api/ai/analyze-image`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await readApiError(res));
    const data = await res.json();
    result.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:1.2rem">✨</span>
        <span style="font-size:.82rem;font-weight:700;color:var(--c)">KẾT QUẢ PHÂN TÍCH AI</span>
      </div>
      <div style="line-height:1.75">${data.analysis.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    `;
  } catch (e) { result.innerHTML = `<p style="color:#ef4444">❌ ${e.message}</p>`; }
  btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart"></i> Phân tích lại';
}

// ----------------------------------------------
//  ITINERARY
// ----------------------------------------------
function toggleChip(el) { el.classList.toggle('on'); }
async function generateItinerary() {
  const dest = document.getElementById('f-dest').value.trim();
  if (!dest) { showToast('Vui lòng nhập điểm đến!', 'error'); return; }
  const interests = [...document.querySelectorAll('.interest-chip.on')].map(c => c.dataset.v);
  if (!interests.length) { showToast('Chọn ít nhất 1 sở thích!', 'error'); return; }
  const btn = document.getElementById('gen-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI đang lên kế hoạch...';
  const result = document.getElementById('it-result');
  result.style.display = 'block'; result.innerHTML = '<div class="spinner"></div><p style="text-align:center;color:rgba(255,255,255,.4);font-size:.82rem;margin-top:8px">Thầy Đồ đang nghiên cứu lịch trình tối ưu cho bạn...</p>';
  try {
    const res = await fetch(`${API}/api/ai/itinerary`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: dest,
        days: parseInt(document.getElementById('f-days').value),
        budget: document.getElementById('f-budget').value,
        interests,
        travelers: document.getElementById('f-traveler').value,
        start_from: document.getElementById('f-from').value || null,
      })
    });
    if (!res.ok) throw new Error(await readApiError(res));
    const { itinerary } = await res.json();
    renderItinerary(result, itinerary);
  } catch (e) { result.innerHTML = `<p style="color:#ef4444;padding:16px">❌ ${e.message}</p>`; }
  btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> TẠO LỊCH TRÌNH NGAY';
}

function renderItinerary(el, it) {
  if (it.raw) { el.innerHTML = `<div style="font-size:.87rem;line-height:1.75;padding:4px">${it.raw.replace(/\n/g, '<br>')}</div>`; return; }
  let html = `
    <div style="margin-bottom:20px">
      <h3 class="tf ng" style="font-size:1.2rem;font-weight:800;margin-bottom:6px">${it.title || 'Lịch trình du lịch'}</h3>
      <p style="font-size:.84rem;color:rgba(255,255,255,.55);margin-bottom:12px">${it.summary || ''}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${it.best_season ? `<span style="font-size:.75rem;background:rgba(212, 175, 55,.1);border:1px solid rgba(212, 175, 55,.22);color:var(--c);padding:4px 12px;border-radius:99px">🌤️ ${it.best_season}</span>` : ''}
        ${it.total_budget ? `<span style="font-size:.75rem;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.22);color:var(--g);padding:4px 12px;border-radius:99px">💰 ${it.total_budget}</span>` : ''}
      </div>
    </div>
  `;
  (it.days || []).forEach(day => {
    html += `<div class="it-day"><div class="it-day-title">📅 Ngày ${day.day}: ${day.title || ''}</div>`;
    (day.locations || []).forEach(loc => {
      html += `<div class="it-loc">
        <div class="it-time">${loc.time || ''}</div>
        <div class="it-loc-info">
          <h4>${loc.name} ${loc.duration ? `<span style="font-size:.72rem;color:rgba(255,255,255,.38);font-weight:400">(${loc.duration})</span>` : ''}</h4>
          <p>${loc.description || ''}</p>
          ${loc.tip ? `<div class="it-tip">💡 ${loc.tip}</div>` : ''}
        </div>
      </div>`;
    });
    if (day.food) html += `<div style="margin-top:10px;font-size:.78rem;color:rgba(255,255,255,.45);padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">🍜 ${day.food}</div>`;
    if (day.transport) html += `<div style="font-size:.78rem;color:rgba(255,255,255,.45);margin-top:4px">🚗 ${day.transport}</div>`;
    html += `</div>`;
  });
  if (it.tips && it.tips.length) {
    html += `<div style="background:rgba(0,255,136,.06);border:1px solid rgba(0,255,136,.18);border-radius:14px;padding:16px;margin-top:4px">
      <div style="font-size:.78rem;font-weight:700;color:var(--gr);margin-bottom:10px">💡 Mẹo hay từ Thầy Đồ</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:7px">
        ${it.tips.map(t => `<li style="font-size:.8rem;color:rgba(255,255,255,.65)">• ${t}</li>`).join('')}
      </ul>
    </div>`;
  }

  html += `<div id="itineraryMap" style="height: 350px; width: 100%; border-radius: 14px; margin-top: 20px; border: 1px solid rgba(212, 175, 55,0.2); z-index: 1;"></div>`;
  el.innerHTML = html;

  setTimeout(() => drawItineraryMap(it), 300);
}

let itineraryMapInstance = null;
function drawItineraryMap(it) {
  if (itineraryMapInstance) {
    itineraryMapInstance.remove();
    itineraryMapInstance = null;
  }

  const mapEl = document.getElementById('itineraryMap');
  if (!mapEl) return;

  itineraryMapInstance = L.map('itineraryMap').setView([16.0463, 108.2062], 5.5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(itineraryMapInstance);

  const latlngs = [];
  const neonIcon = L.divIcon({
    className: 'neon-marker',
    html: `<div style="background-color: #05d9e8; box-shadow: 0 0 10px #05d9e8, 0 0 20px #05d9e8; width: 12px; height: 12px; border-radius: 50%;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  (it.days || []).forEach(day => {
    (day.locations || []).forEach(loc => {
      if (loc.lat && loc.lng) {
        const pt = [loc.lat, loc.lng];
        latlngs.push(pt);
        L.marker(pt, { icon: neonIcon })
          .addTo(itineraryMapInstance)
          .bindPopup(`<strong style="color: #c026d3;">Ngày ${day.day}: ${loc.name}</strong><br>${loc.description || ''}`);
      }
    });
  });

  if (latlngs.length > 0) {
    const route = L.polyline(latlngs, {
      color: '#c026d3',
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 10'
    }).addTo(itineraryMapInstance);
    itineraryMapInstance.fitBounds(route.getBounds(), { padding: [30, 30] });
  }
}
// Toast utility for ai.html
function showToast(msg, type = 'success') {
  let c = document.getElementById('toastContainer');
  if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; Object.assign(c.style, { position: 'fixed', top: '20px', right: '20px', zIndex: '99999', display: 'flex', flexDirection: 'column', gap: '10px' }); document.body.appendChild(c); }
  const t = document.createElement('div');
  Object.assign(t.style, { padding: '12px 20px', borderRadius: '10px', fontSize: '.85rem', fontFamily: 'Be Vietnam Pro,sans-serif', color: '#fff', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,.4)', animation: 'min .3s ease', maxWidth: '380px', background: type === 'error' ? 'rgba(239,68,68,.18)' : 'rgba(212,175,55,.12)', border: type === 'error' ? '1px solid rgba(239,68,68,.3)' : '1px solid rgba(212,175,55,.3)' });
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3500);
}
