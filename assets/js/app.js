/* ════════════════════════════════════════
   OUR LITTLE MUSEUM — App Logic
   ════════════════════════════════════════ */

'use strict';

/* ── STATE ──────────────────────────────── */

const STORAGE_KEY = 'olm_memories';

let memories = [];
let activeMood = 'all';
let activeView = 'gallery';
let currentLightboxId = null;
let editPhotoData = null; // base64

/* ── MOOD CONFIG ─────────────────────────── */

const MOOD_LABELS = {
  joy:       '✦ Joy',
  love:      '♡ Love',
  adventure: '◉ Adventure',
  cozy:      '❋ Cozy',
  silly:     '☻ Silly',
  tender:    '◌ Tender',
  milestone: '★ Milestone',
};

const DEMO_MEMORIES = [
  {
    title: 'Café Window Rain',
    date: '2025-11-06',
    mood: 'cozy',
    story: 'Warm drinks, fogged glass, and your laugh while the city slowed down outside.',
    tags: ['coffee', 'rain', 'quiet afternoon'],
    photo: null,
  },
  {
    title: 'Golden Hour Walk',
    date: '2025-09-18',
    mood: 'love',
    story: 'We walked without a destination and somehow found our favorite evening ever.',
    tags: ['sunset', 'walk', 'golden hour'],
    photo: null,
  },
  {
    title: 'Train to Somewhere New',
    date: '2025-12-21',
    mood: 'adventure',
    story: 'No itinerary, just playlists, shared snacks, and surprise stops.',
    tags: ['trip', 'train', 'weekend'],
    photo: null,
  },
  {
    title: 'First Anniversary Dinner',
    date: '2026-01-14',
    mood: 'milestone',
    story: 'A table for two, a thousand memories between us, and one promise for many more years.',
    tags: ['anniversary', 'dinner'],
    photo: null,
  },
];

/* ── STORAGE ─────────────────────────────── */

function saveMemories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
}

function loadMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    memories = raw ? JSON.parse(raw) : [];
  } catch {
    memories = [];
  }
}

/* ── HELPERS ─────────────────────────────── */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function getFilteredMemories() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  return memories
    .filter(m => activeMood === 'all' || m.mood === activeMood)
    .filter(m => {
      if (!q) return true;
      return [m.title, m.story, m.tags?.join(' ')].some(t => t?.toLowerCase().includes(q));
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function getMemoryPercentWithPhotos() {
  if (!memories.length) return 0;
  const withPhoto = memories.filter(mem => !!mem.photo).length;
  return Math.round((withPhoto / memories.length) * 100);
}

function getThisMonthCount() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return memories.filter(mem => (mem.date || '').startsWith(ym)).length;
}

function getUniqueMoodCount() {
  return new Set(memories.map(mem => mem.mood).filter(Boolean)).size;
}

function truncate(text, max = 160) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function updateInsights() {
  const statTotal = document.getElementById('statTotal');
  const statMonth = document.getElementById('statMonth');
  const statMoods = document.getElementById('statMoods');
  const statPhotos = document.getElementById('statPhotos');

  if (!statTotal || !statMonth || !statMoods || !statPhotos) return;

  statTotal.textContent = String(memories.length);
  statMonth.textContent = String(getThisMonthCount());
  statMoods.textContent = String(getUniqueMoodCount());
  statPhotos.textContent = `${getMemoryPercentWithPhotos()}%`;

  const filtered = getFilteredMemories();
  const spotlight = filtered[0] || memories.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;

  const spotlightTitle = document.getElementById('spotlightTitle');
  const spotlightMeta = document.getElementById('spotlightMeta');
  const spotlightStory = document.getElementById('spotlightStory');
  const spotlightOpen = document.getElementById('spotlightOpen');

  if (!spotlight) {
    spotlightTitle.textContent = 'No memory yet';
    spotlightMeta.textContent = 'Add one to get started';
    spotlightStory.textContent = 'Your most recent memory will appear here with quick access.';
    spotlightOpen.dataset.id = '';
    spotlightOpen.disabled = true;
    return;
  }

  spotlightTitle.textContent = spotlight.title || 'Untitled Memory';
  spotlightMeta.textContent = `${formatDate(spotlight.date)} · ${MOOD_LABELS[spotlight.mood] || spotlight.mood || 'Memory'}`;
  spotlightStory.textContent = truncate(spotlight.story || 'Open this memory to view the full story and details.');
  spotlightOpen.dataset.id = spotlight.id;
  spotlightOpen.disabled = false;
}

/* ── GALLERY RENDER ──────────────────────── */

function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  const empty = document.getElementById('emptyState');
  const filtered = getFilteredMemories();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(cardHTML).join('');

  grid.querySelectorAll('.memory-card').forEach(card => {
    card.addEventListener('click', () => openLightbox(card.dataset.id));
  });
}

function cardHTML(mem) {
  const imgPart = mem.photo
    ? `<img src="${mem.photo}" alt="${escHtml(mem.title)}" loading="lazy" />`
    : `<div class="card-no-photo">◈</div>`;

  const tags = (mem.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

  return `
    <div class="memory-card" data-id="${mem.id}">
      <div class="card-img-wrap">
        ${imgPart}
        <span class="card-mood-badge">${escHtml(MOOD_LABELS[mem.mood] || mem.mood)}</span>
      </div>
      <div class="card-body">
        <div class="card-date">${formatDate(mem.date)}</div>
        <div class="card-title">${escHtml(mem.title)}</div>
        ${mem.story ? `<div class="card-story">${escHtml(mem.story)}</div>` : ''}
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
    </div>`;
}

/* ── TIMELINE RENDER ─────────────────────── */

function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  const filtered = getFilteredMemories();

  if (filtered.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--ink-muted);padding:4rem 0;">No memories to show yet.</p>`;
    return;
  }

  container.innerHTML = filtered.map((mem, i) => `
    <div class="timeline-item" data-id="${mem.id}">
      ${i % 2 === 0 ? `
        <div class="timeline-card" data-id="${mem.id}">
          ${mem.photo ? `<img class="timeline-card-img" src="${mem.photo}" alt="" />` : ''}
          <div class="timeline-card-date">${formatDate(mem.date)}</div>
          <div class="timeline-card-mood">${escHtml(MOOD_LABELS[mem.mood] || '')}</div>
          <div class="timeline-card-title">${escHtml(mem.title)}</div>
        </div>
        <div class="timeline-dot"><div class="timeline-dot-inner"></div></div>
        <div class="timeline-spacer"></div>
      ` : `
        <div class="timeline-spacer"></div>
        <div class="timeline-dot"><div class="timeline-dot-inner"></div></div>
        <div class="timeline-card" data-id="${mem.id}">
          ${mem.photo ? `<img class="timeline-card-img" src="${mem.photo}" alt="" />` : ''}
          <div class="timeline-card-date">${formatDate(mem.date)}</div>
          <div class="timeline-card-mood">${escHtml(MOOD_LABELS[mem.mood] || '')}</div>
          <div class="timeline-card-title">${escHtml(mem.title)}</div>
        </div>
      `}
    </div>`).join('');

  container.querySelectorAll('.timeline-card').forEach(card => {
    card.addEventListener('click', () => openLightbox(card.dataset.id));
  });
}

/* ── EMOTIONS RENDER ─────────────────────── */

function renderEmotions() {
  const container = document.getElementById('emotionsGrid');
  const all = getFilteredMemories();
  const groups = {};

  Object.keys(MOOD_LABELS).forEach(m => { groups[m] = []; });
  all.forEach(mem => { if (groups[mem.mood]) groups[mem.mood].push(mem); });

  const hasAny = Object.values(groups).some(g => g.length > 0);

  if (!hasAny) {
    container.innerHTML = `<p style="color:var(--ink-muted);padding:3rem 0;">No memories yet.</p>`;
    return;
  }

  container.innerHTML = Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([mood, items]) => `
      <div class="emotion-group">
        <div class="emotion-group-header">
          <span class="emotion-group-name">${escHtml(MOOD_LABELS[mood])}</span>
          <span class="emotion-group-count">${items.length}</span>
        </div>
        <div class="emotion-group-items">
          ${items.map(mem => `
            <div class="emotion-item" data-id="${mem.id}">
              <div class="emotion-item-thumb">
                ${mem.photo ? `<img src="${mem.photo}" alt="" />` : '◈'}
              </div>
              <div class="emotion-item-text">
                <div class="emotion-item-title">${escHtml(mem.title)}</div>
                <div class="emotion-item-date">${formatDate(mem.date)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');

  container.querySelectorAll('.emotion-item').forEach(item => {
    item.addEventListener('click', () => openLightbox(item.dataset.id));
  });
}

/* ── RENDER DISPATCHER ───────────────────── */

function renderAll() {
  updateInsights();
  renderGallery();
  renderTimeline();
  renderEmotions();
}

function addDemoMemories() {
  if (memories.length > 0 && !confirm('Add demo memories to your current collection?')) return;

  const seeded = DEMO_MEMORIES.map(mem => ({
    id: generateId(),
    title: mem.title,
    date: mem.date,
    mood: mem.mood,
    story: mem.story,
    tags: [...mem.tags],
    photo: mem.photo,
    created: Date.now() - Math.floor(Math.random() * 500000),
  }));

  memories = [...seeded, ...memories].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  saveMemories();
  renderAll();
}

/* ── LIGHTBOX ────────────────────────────── */

function openLightbox(id) {
  const mem = memories.find(m => m.id === id);
  if (!mem) return;
  currentLightboxId = id;

  document.getElementById('lightboxMood').textContent = MOOD_LABELS[mem.mood] || '';
  document.getElementById('lightboxTitle').textContent = mem.title;
  document.getElementById('lightboxDate').textContent = formatDate(mem.date);
  document.getElementById('lightboxStory').textContent = mem.story || '';
  document.getElementById('lightboxTags').innerHTML = (mem.tags || [])
    .map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

  const img = document.getElementById('lightboxImg');
  if (mem.photo) {
    img.src = mem.photo;
    img.style.display = 'block';
    document.querySelector('.lightbox-img-wrap').style.display = 'flex';
  } else {
    img.style.display = 'none';
    document.querySelector('.lightbox-img-wrap').style.display = 'none';
  }

  document.getElementById('lightboxOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightboxOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  currentLightboxId = null;
}

/* ── MODAL ───────────────────────────────── */

function openModal(mem = null) {
  const form = document.getElementById('memoryForm');
  form.reset();
  editPhotoData = null;

  document.getElementById('uploadPreview').classList.add('hidden');
  document.getElementById('uploadPlaceholder').style.display = 'flex';
  document.getElementById('modalTitle').textContent = mem ? 'Edit Memory' : 'Add a Memory';
  document.getElementById('editId').value = mem ? mem.id : '';

  // Reset mood selection
  document.querySelectorAll('.mood-option').forEach(el => el.classList.remove('selected'));
  document.getElementById('moodInput').value = '';

  if (mem) {
    document.getElementById('titleInput').value = mem.title || '';
    document.getElementById('dateInput').value = mem.date || '';
    document.getElementById('storyInput').value = mem.story || '';
    document.getElementById('tagsInput').value = (mem.tags || []).join(', ');
    document.getElementById('moodInput').value = mem.mood || '';
    document.querySelectorAll('.mood-option').forEach(el => {
      if (el.dataset.mood === mem.mood) el.classList.add('selected');
    });
    if (mem.photo) {
      editPhotoData = mem.photo;
      const preview = document.getElementById('uploadPreview');
      preview.src = mem.photo;
      preview.classList.remove('hidden');
      document.getElementById('uploadPlaceholder').style.display = 'none';
    }
  } else {
    // Default date to today
    document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);
  }

  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ── SAVE MEMORY ─────────────────────────── */

function saveMemory(e) {
  e.preventDefault();

  const title = document.getElementById('titleInput').value.trim();
  const date  = document.getElementById('dateInput').value;
  const mood  = document.getElementById('moodInput').value;
  const story = document.getElementById('storyInput').value.trim();
  const tagsRaw = document.getElementById('tagsInput').value.trim();
  const tags  = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const editId = document.getElementById('editId').value;

  if (!title) { shake(document.getElementById('titleInput')); return; }
  if (!mood)  { shake(document.querySelector('#moodSelect')); return; }

  const photo = editPhotoData || null;

  if (editId) {
    const idx = memories.findIndex(m => m.id === editId);
    if (idx > -1) {
      memories[idx] = { ...memories[idx], title, date, mood, story, tags, photo };
    }
  } else {
    memories.unshift({ id: generateId(), title, date, mood, story, tags, photo, created: Date.now() });
  }

  saveMemories();
  renderAll();
  closeModal();
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  el.addEventListener('animationend', () => el.style.animation = '', { once: true });
}

/* ── DELETE MEMORY ───────────────────────── */

function deleteMemory(id) {
  if (!confirm('Remove this memory from the museum?')) return;
  memories = memories.filter(m => m.id !== id);
  saveMemories();
  renderAll();
  closeLightbox();
}

/* ── PHOTO UPLOAD ────────────────────────── */

function handlePhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 10 * 1024 * 1024) {
    alert('Please choose a photo under 10 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    editPhotoData = e.target.result;
    const preview = document.getElementById('uploadPreview');
    preview.src = editPhotoData;
    preview.classList.remove('hidden');
    document.getElementById('uploadPlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ── EVENT BINDINGS ──────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const byId = (id) => document.getElementById(id);
  const on = (id, event, handler) => {
    const el = byId(id);
    if (el) el.addEventListener(event, handler);
  };

  const handleSurprise = () => {
    const pool = getFilteredMemories();
    const source = pool.length ? pool : memories;
    if (!source.length) {
      openModal();
      return;
    }
    const random = source[Math.floor(Math.random() * source.length)];
    openLightbox(random.id);
  };

  loadMemories();

  // Splash
  on('enterBtn', 'click', () => {
    const splash = byId('splash');
    if (!splash) return;
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.classList.add('hidden');
      const app = byId('app');
      if (app) app.classList.remove('hidden');
      renderAll();
    }, 800);
  });

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeView = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${activeView}`).classList.add('active');
    });
  });

  // Add memory button
  on('addMemoryBtn', 'click', () => openModal());
  on('quickAddBtn', 'click', () => openModal());
  on('emptyAddBtn', 'click', () => openModal());

  on('quickDemoBtn', 'click', addDemoMemories);
  on('emptyDemoBtn', 'click', addDemoMemories);

  on('quickSurpriseBtn', 'click', handleSurprise);

  on('spotlightOpen', 'click', () => {
    const id = byId('spotlightOpen')?.dataset.id;
    if (id) openLightbox(id);
  });

  // Fallback delegated bindings for dynamic/stale DOM states
  document.addEventListener('click', (e) => {
    const target = e.target.closest('#quickAddBtn, #emptyAddBtn, #quickDemoBtn, #emptyDemoBtn, #quickSurpriseBtn, #spotlightOpen');
    if (!target) return;

    if (target.id === 'quickAddBtn' || target.id === 'emptyAddBtn') openModal();
    else if (target.id === 'quickDemoBtn' || target.id === 'emptyDemoBtn') addDemoMemories();
    else if (target.id === 'quickSurpriseBtn') handleSurprise();
    else if (target.id === 'spotlightOpen') {
      const id = target.dataset.id;
      if (id) openLightbox(id);
    }
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Form submit
  document.getElementById('memoryForm').addEventListener('submit', saveMemory);

  // Mood pills (filter)
  document.getElementById('moodFilter').addEventListener('click', (e) => {
    const pill = e.target.closest('.mood-pill');
    if (!pill) return;
    document.querySelectorAll('.mood-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeMood = pill.dataset.mood;
    renderAll();
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', renderAll);

  // Mood select in modal
  document.getElementById('moodSelect').addEventListener('click', (e) => {
    const opt = e.target.closest('.mood-option');
    if (!opt) return;
    document.querySelectorAll('.mood-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    document.getElementById('moodInput').value = opt.dataset.mood;
  });

  // Photo upload
  const uploadArea = document.getElementById('uploadArea');
  const photoInput = document.getElementById('photoInput');

  uploadArea.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => handlePhotoFile(photoInput.files[0]));

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handlePhotoFile(e.dataTransfer.files[0]);
  });

  // Lightbox close
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('lightboxOverlay')) closeLightbox();
  });

  document.getElementById('lightboxEdit').addEventListener('click', () => {
    if (!currentLightboxId) return;
    const mem = memories.find(m => m.id === currentLightboxId);
    closeLightbox();
    openModal(mem);
  });

  document.getElementById('lightboxDelete').addEventListener('click', () => {
    if (currentLightboxId) deleteMemory(currentLightboxId);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeModal();
    }
  });
});
