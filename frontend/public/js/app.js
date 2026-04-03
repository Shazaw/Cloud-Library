/* ============================================================
   CloudLibrary App — v2
   Patterns: shadcn/ui · 21st.dev · UI UX Pro Max · Stitch
   ============================================================ */

// ── Utilities ──────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function formatNum(n) {
  n = parseInt(n) || 0;
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1) + 'k';
  return String(n);
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 2592000) return Math.floor(s/86400) + 'd ago';
  return new Date(d).toLocaleDateString('en-US', { month:'short', year:'numeric' });
}

// Animated number counter (21st.dev pattern)
function animateNum(el, target, suffix = '') {
  if (!el) return;
  let start = 0;
  const dur = 1200;
  const startTime = performance.now();
  function update(now) {
    const t = Math.min((now - startTime) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = Math.floor(ease * target);
    el.textContent = formatNum(val) + suffix;
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = formatNum(target) + suffix;
  }
  requestAnimationFrame(update);
}

// Stars HTML
function starsHtml(rating, interactive = false) {
  rating = parseFloat(rating) || 0;
  let html = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating) ? ' filled' : '';
    html += interactive
      ? `<span class="star${filled} star-pick" data-val="${i}">★</span>`
      : `<span class="star${filled}">★</span>`;
  }
  return html + '</span>';
}

// No emoji genre icons — text-only labels
const GENRE_ICONS = {};

// ── Toast system (UI UX Pro Max feedback) ──────────────────
const TOAST_ICONS = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
function toast(msg, type = 'info', duration = 3500) {
  const tc = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span>${escHtml(msg)}</span>
    <button class="toast-dismiss" aria-label="Dismiss">×</button>`;
  tc.appendChild(el);
  el.querySelector('.toast-dismiss').addEventListener('click', () => removeToast(el));
  setTimeout(() => removeToast(el), duration);
}
function removeToast(el) {
  el.style.animation = 'toast-out 0.25s ease forwards';
  setTimeout(() => el.remove(), 250);
}

// ── Book card component — Goodreads style ──────────────────
function bookCard(book, extraHtml = '') {
  const gradient = book.cover_gradient || `linear-gradient(135deg, ${book.cover_color||'#1a237e'}, #3b82f6)`;
  const gutId = book.gutenberg_id;
  const imgUrl = gutId
    ? `https://www.gutenberg.org/cache/epub/${gutId}/pg${gutId}.cover.medium.jpg`
    : null;

  const coverContent = imgUrl
    ? `<img src="${imgUrl}" alt="${escHtml(book.title)}" class="book-cover-img" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="book-cover-bg" style="background:${gradient};display:none">
         <div class="book-cover-placeholder-text">${escHtml(book.title)}</div>
       </div>`
    : `<div class="book-cover-bg" style="background:${gradient}">
         <div class="book-cover-placeholder-text">${escHtml(book.title)}</div>
       </div>`;

  return `
    <div class="book-card" data-route="/book/${book.id}" role="button" tabindex="0" aria-label="${escHtml(book.title)} by ${escHtml(book.author)}">
      <div class="book-cover">${coverContent}</div>
      <div class="book-info">
        <div class="book-title">${escHtml(book.title)}</div>
        <div class="book-author">${escHtml(book.author)}</div>
        <div class="book-footer">
          <span class="book-genre-tag">${escHtml(book.genre||'General')}</span>
          <span class="book-downloads">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${formatNum(book.download_count||0)}
          </span>
        </div>
        ${extraHtml}
      </div>
    </div>`;
}

// ── Router ──────────────────────────────────────────────────
const Router = (() => {
  const routes = {};
  function on(path, fn) { routes[path] = fn; }

  async function go(path, push = true) {
    if (push && location.pathname + location.search !== path) {
      history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    updateNav(path);

    let fn = routes[path] || routes[path.split('?')[0]];
    let params = {};
    if (!fn) {
      for (const [pattern, handler] of Object.entries(routes)) {
        if (!pattern.includes(':')) continue;
        const regex = '^' + pattern.replace(/:([^/]+)/g,'([^/]+)') + '$';
        const m = path.match(new RegExp(regex));
        if (m) {
          fn = handler;
          [...pattern.matchAll(/:([^/]+)/g)].forEach((k,i) => params[k[1]] = m[i+1]);
          break;
        }
      }
    }
    const app = $('#app');
    app.style.opacity = '0';
    if (fn) await fn(params);
    else app.innerHTML = $('#tpl-404').innerHTML;
    app.style.transition = 'opacity 0.15s ease';
    requestAnimationFrame(() => { app.style.opacity = '1'; });
  }

  window.addEventListener('popstate', () => go(location.pathname + location.search, false));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-route]');
    if (a) { e.preventDefault(); go(a.dataset.route); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const a = e.target.closest('[data-route]');
      if (a) { e.preventDefault(); go(a.dataset.route); }
    }
  });

  return { on, go };
})();

// ── Nav state ───────────────────────────────────────────────
function updateNav(path) {
  $$('.nav-link').forEach(a => {
    const active = a.dataset.route === '/'
      ? path === '/'
      : path.startsWith(a.dataset.route);
    a.classList.toggle('active', active);
  });

  const user = API.getUser();
  const loggedIn = API.isLoggedIn() && user;
  $('#btn-login').style.display  = loggedIn ? 'none' : '';
  $('#btn-register').style.display = loggedIn ? 'none' : '';
  $('#user-menu').style.display  = loggedIn ? '' : 'none';
  $$('.nav-link-auth').forEach(el => el.style.display = loggedIn ? '' : 'none');

  if (loggedIn) {
    const initial = (user.display_name || user.username || 'U')[0].toUpperCase();
    $('#user-initial').textContent = initial;
    const av = $('#user-avatar-btn');
    av.style.background = user.avatar_color || '#3b82f6';
    av.title = user.display_name || user.username;
    $('#dropdown-name').textContent = user.display_name || user.username;
    $('#dropdown-email').textContent = user.email;
  }
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
  $('#navbar').classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// User dropdown
$('#user-avatar-btn')?.addEventListener('click', e => {
  e.stopPropagation();
  $('#user-dropdown').classList.toggle('open');
});
document.addEventListener('click', () => $('#user-dropdown')?.classList.remove('open'));

// Logout
$('#btn-logout')?.addEventListener('click', () => {
  API.clearToken();
  toast('Signed out successfully', 'success');
  Router.go('/');
});

// Mobile menu
$('#menu-toggle')?.addEventListener('click', () => {
  $('#nav-links').classList.toggle('open');
});

// Password show/hide
document.addEventListener('click', e => {
  if (e.target.classList.contains('toggle-pw')) {
    const inp = document.getElementById(e.target.dataset.target);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    e.target.textContent = show ? 'Hide' : 'Show';
  }
});

// ⌘K search shortcut
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const inp = $('#hero-search-input') || $('#lib-search');
    if (inp) { inp.focus(); inp.select(); }
    else Router.go('/library');
  }
});
$('#nav-search-open')?.addEventListener('click', () => Router.go('/library'));

// Auth expiry
window.addEventListener('auth:logout', () => {
  toast('Session expired. Please sign in again.', 'warning');
  Router.go('/login');
});

// ═══════════════════════════════════════════════════════════
// PAGE HANDLERS
// ═══════════════════════════════════════════════════════════

// ── HOME ────────────────────────────────────────────────────
Router.on('/', async () => {
  $('#app').innerHTML = $('#tpl-home').innerHTML;

  // Search
  const doSearch = () => {
    const q = $('#hero-search-input')?.value.trim();
    Router.go(q ? `/library?search=${encodeURIComponent(q)}` : '/library');
  };
  $('#hero-search-btn')?.addEventListener('click', doSearch);
  $('#hero-search-input')?.addEventListener('keydown', e => e.key === 'Enter' && doSearch());

  // CTA gate
  $('#cta-upload-btn')?.addEventListener('click', e => {
    if (!API.isLoggedIn()) { e.preventDefault(); Router.go('/login'); }
  });
  $('#cta-register-btn')?.addEventListener('click', e => {
    if (API.isLoggedIn()) { e.preventDefault(); Router.go('/profile'); }
  });

  // Helper: fill a grid element with book cards
  function fillGrid(id, books, limit = 8) {
    const el = $(id);
    if (!el) return;
    const subset = books.slice(0, limit);
    el.innerHTML = subset.length ? subset.map(b => bookCard(b)).join('') : '';
  }

  // Skeleton placeholders for featured
  const featSkel = $('#featured-skeleton');
  if (featSkel) featSkel.innerHTML = Array(8).fill(
    `<div class="book-card-skeleton">
      <div class="cover-skel"></div>
      <div class="text-skel w-3-4"></div>
      <div class="text-skel w-1-2"></div>
    </div>`
  ).join('');

  // Load everything in parallel
  const [featured, genres, allData, popular, recent,
         adventure, horror, romance, scifi, philosophy] = await Promise.all([
    API.books.featured().catch(() => []),
    API.books.genres().catch(() => []),
    API.books.list({ limit: 1 }).catch(() => ({ total: 0 })),
    API.books.list({ limit: 8, sort: 'downloads' }).catch(() => ({ books: [] })),
    API.books.list({ limit: 8, sort: 'created_at' }).catch(() => ({ books: [] })),
    API.books.list({ limit: 8, genre: 'Adventure', sort: 'downloads' }).catch(() => ({ books: [] })),
    API.books.list({ limit: 8, genre: 'Horror', sort: 'downloads' }).catch(() => ({ books: [] })),
    API.books.list({ limit: 8, genre: 'Romance', sort: 'downloads' }).catch(() => ({ books: [] })),
    API.books.list({ limit: 8, genre: 'Science Fiction', sort: 'downloads' }).catch(() => ({ books: [] })),
    API.books.list({ limit: 8, genre: 'Philosophy', sort: 'downloads' }).catch(() => ({ books: [] })),
  ]);

  // Stats
  const totalBooks = parseInt(allData.total) || 0;
  const totalDl = (popular.books||[]).reduce((a, b) => a + (b.download_count || 0), 0);
  const sb = $('#stat-books'); if (sb) sb.textContent = formatNum(totalBooks);
  const sg = $('#stat-genres'); if (sg) sg.textContent = genres.length;
  const sd = $('#stat-downloads'); if (sd) sd.textContent = formatNum(totalDl) + '+';
  const sbb = $('#stat-banner-books'); if (sbb) sbb.textContent = formatNum(totalBooks);
  const sbg = $('#stat-banner-genres'); if (sbg) sbg.textContent = genres.length;

  // Featured grid
  const grid = $('#featured-grid');
  if (grid) {
    grid.innerHTML = featured.length
      ? featured.map(b => bookCard(b)).join('')
      : '<div class="empty-state"><p>No books yet.</p></div>';
  }

  // Other grids
  fillGrid('#popular-grid', popular.books || [], 8);
  fillGrid('#recent-grid', recent.books || [], 8);
  fillGrid('#genre-adventure-grid', adventure.books || [], 8);
  fillGrid('#genre-horror-grid', horror.books || [], 8);
  fillGrid('#genre-romance-grid', romance.books || [], 8);
  fillGrid('#genre-scifi-grid', scifi.books || [], 8);
  fillGrid('#genre-philosophy-grid', philosophy.books || [], 8);

  // Genre chips — card style
  const chips = $('#genre-chips');
  if (chips) {
    chips.innerHTML = genres.map(g => `
      <div class="genre-chip" data-route="/library?genre=${encodeURIComponent(g.genre)}">
        <span class="genre-chip-name">${escHtml(g.genre)}</span>
        <span class="genre-chip-count">${g.count} book${g.count != 1 ? 's' : ''}</span>
      </div>`).join('');
  }
});

// ── LIBRARY ──────────────────────────────────────────────────
let libState = { page: 1, search: '', genre: 'all', sort: 'created_at' };

Router.on('/library', async () => {
  $('#app').innerHTML = $('#tpl-library').innerHTML;

  const params = new URLSearchParams(location.search);
  libState = { page: 1, search: params.get('search')||'', genre: params.get('genre')||'all', sort: 'created_at' };

  const genres = await API.books.genres().catch(() => []);

  // Populate genre select
  const sel = $('#lib-genre');
  genres.forEach(g => {
    const o = document.createElement('option');
    o.value = g.genre; o.textContent = `${g.genre} (${g.count})`;
    if (g.genre === libState.genre) o.selected = true;
    sel?.appendChild(o);
  });

  // Genre pill quick-filters
  const pills = $('#lib-genre-pills');
  if (pills) {
    pills.innerHTML = `<button class="genre-pill${libState.genre==='all'?' active':''}" data-g="all">All</button>` +
      genres.slice(0, 8).map(g => `<button class="genre-pill${libState.genre===g.genre?' active':''}" data-g="${escHtml(g.genre)}">${escHtml(g.genre)}</button>`).join('');
    pills.addEventListener('click', e => {
      const btn = e.target.closest('[data-g]');
      if (!btn) return;
      libState.genre = btn.dataset.g; libState.page = 1;
      $$('.genre-pill').forEach(p => p.classList.toggle('active', p.dataset.g === libState.genre));
      if (sel) sel.value = libState.genre;
      loadLib();
    });
  }

  // Init inputs
  const si = $('#lib-search'), so = $('#lib-sort');
  if (si) si.value = libState.search;
  if (so) so.value = libState.sort;

  let timer;
  si?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { libState.search = si.value; libState.page = 1; loadLib(); }, 350); });
  sel?.addEventListener('change', () => { libState.genre = sel.value; libState.page = 1; loadLib(); });
  so?.addEventListener('change', () => { libState.sort = so.value; libState.page = 1; loadLib(); });

  loadLib();
});

async function loadLib() {
  const grid = $('#library-grid'), cEl = $('#results-count'), pagEl = $('#pagination');
  if (!grid) return;
  grid.innerHTML = '<div class="skeleton-grid">' + Array(12).fill('<div class="book-card-skeleton"></div>').join('') + '</div>';

  const p = { page: libState.page, limit: 20, sort: libState.sort };
  if (libState.search) p.search = libState.search;
  if (libState.genre !== 'all') p.genre = libState.genre;

  const data = await API.books.list(p).catch(() => ({ books:[], total:0, pages:1 }));
  if (cEl) cEl.textContent = `${data.total} book${data.total!==1?'s':''} found`;
  grid.innerHTML = data.books.length
    ? data.books.map(b => bookCard(b)).join('')
    : `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <h3>No books found</h3>
        <p>Try different search terms or browse all genres.</p>
       </div>`;

  // Pagination
  if (pagEl && data.pages > 1) {
    let html = `<button class="page-btn" ${libState.page===1?'disabled':''} data-page="${libState.page-1}">←</button>`;
    for (let i = 1; i <= data.pages; i++) {
      if (i===1||i===data.pages||Math.abs(i-libState.page)<=2) {
        html += `<button class="page-btn ${i===libState.page?'active':''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i-libState.page)===3) {
        html += '<span style="padding:0 6px;color:var(--text-dim)">…</span>';
      }
    }
    html += `<button class="page-btn" ${libState.page===data.pages?'disabled':''} data-page="${libState.page+1}">→</button>`;
    pagEl.innerHTML = html;
    pagEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { libState.page = parseInt(btn.dataset.page); loadLib(); window.scrollTo(0,0); });
    });
  } else if (pagEl) pagEl.innerHTML = '';
}

// ── BOOK DETAIL ──────────────────────────────────────────────
Router.on('/book/:id', async ({ id }) => {
  $('#app').innerHTML = $('#tpl-book').innerHTML;
  const container = $('#book-detail-container');

  const [book, reviews] = await Promise.all([
    API.books.get(id).catch(() => null),
    API.books.reviews(id).catch(() => [])
  ]);

  if (!book) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
      <h3>Book not found</h3><p>This book may have been removed.</p>
      <a href="/library" data-route="/library" class="btn btn-primary">Browse Library</a>
    </div>`;
    return;
  }

  const gradient = book.cover_gradient || `linear-gradient(135deg, ${book.cover_color||'#1a237e'}, #3b82f6)`;
  const avgRating = parseFloat(book.avg_rating) || 0;
  const loggedIn = API.isLoggedIn();

  container.innerHTML = `
    <div class="book-detail-back">
      <a href="/library" data-route="/library" class="btn btn-ghost btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Library
      </a>
    </div>
    <div class="book-detail-layout">
      <div class="book-detail-cover-wrap">
        <div class="book-detail-cover">
          ${book.gutenberg_id
            ? `<img src="https://www.gutenberg.org/cache/epub/${book.gutenberg_id}/pg${book.gutenberg_id}.cover.medium.jpg"
                    alt="${escHtml(book.title)}" class="book-detail-cover-img" loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
               <div class="book-detail-cover-bg" style="background:${gradient};display:none"></div>`
            : `<div class="book-detail-cover-bg" style="background:${gradient}"></div>`}
        </div>
        ${book.file_size ? `<div class="book-detail-file-info">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${formatBytes(book.file_size)}
        </div>` : ''}
      </div>

      <div class="book-detail-info animate-fade-up">
        <div class="book-detail-genre-row">
          <span class="book-genre-tag">${escHtml(book.genre||'General')}</span>
        </div>
        <h1 class="book-detail-title">${escHtml(book.title)}</h1>
        <div class="book-detail-author">${escHtml(book.author)}</div>

        <div class="rating-display">
          ${starsHtml(avgRating)}
          <span class="rating-count">${avgRating.toFixed(1)} · ${book.review_count} review${book.review_count!==1?'s':''}</span>
        </div>

        <div class="book-detail-meta-grid">
          ${book.year ? `<span class="meta-tag"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${book.year > 0 ? book.year : Math.abs(book.year)+' BC'}</span>` : ''}
          ${book.pages ? `<span class="meta-tag"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${book.pages} pages</span>` : ''}
          ${book.language ? `<span class="meta-tag">${escHtml(book.language)}</span>` : ''}
          <span class="meta-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${formatNum(book.download_count||0)} downloads
          </span>
        </div>

        <p class="book-detail-desc">${escHtml(book.description) || '<em>No description available.</em>'}</p>

        <div class="book-detail-actions">
          <a href="${API.books.download(book.id)}" class="btn btn-primary btn-lg" target="_blank" id="btn-download" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
          ${loggedIn ? `
            <button class="btn btn-secondary" id="btn-library" title="${book.in_library ? 'Remove from library' : 'Save to library'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              ${book.in_library ? '✓ In Library' : 'Save to Library'}
            </button>
            <button class="btn btn-secondary" id="btn-wtr" title="${book.in_want_to_read ? 'Remove from wishlist' : 'Add to wishlist'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ${book.in_want_to_read ? '♥ Wishlisted' : '♡ Wishlist'}
            </button>` : `<a href="/login" data-route="/login" class="btn btn-ghost">Sign in to save</a>`}
        </div>

        <p class="book-detail-uploader">
          ${book.uploaded_by_username
            ? `Contributed by <a href="#">${escHtml(book.uploaded_by_name||book.uploaded_by_username)}</a> · ${timeAgo(book.created_at)}`
            : `<svg style="display:inline-block;vertical-align:middle" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Public domain · Project Gutenberg`}
        </p>
      </div>
    </div>

    <div class="reviews-section">
      <h3>Community Reviews</h3>
      ${loggedIn ? `
        <div class="review-form">
          <div class="review-form-title">${book.my_review ? 'Update Your Review' : 'Write a Review'}</div>
          <div class="star-picker" id="star-picker">${[1,2,3,4,5].map(i=>`<span class="star-pick${book.my_review&&i<=book.my_review.rating?' on':''}" data-val="${i}">★</span>`).join('')}</div>
          <div class="form-group">
            <textarea id="review-text" rows="3" placeholder="Share your thoughts about this book…" style="width:100%">${book.my_review ? escHtml(book.my_review.review_text) : ''}</textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-submit-review">${book.my_review ? 'Update Review' : 'Post Review'}</button>
        </div>` :
        `<p style="color:var(--text-muted);margin-bottom:var(--space-6);font-size:0.9rem"><a href="/login" data-route="/login">Sign in</a> to leave a review.</p>`}
      <div id="reviews-list">
        ${reviews.length
          ? reviews.map(r => `
            <div class="review-card">
              <div class="review-header">
                <div class="reviewer-avatar" style="background:${r.avatar_color||'#3b82f6'}22;color:${r.avatar_color||'#3b82f6'};border:1px solid ${r.avatar_color||'#3b82f6'}44">
                  ${(r.display_name||r.username||'?')[0].toUpperCase()}
                </div>
                <div>
                  <div class="reviewer-name">${escHtml(r.display_name||r.username)}</div>
                  <div class="reviewer-rating">${starsHtml(r.rating)}</div>
                </div>
                <span class="review-date">${timeAgo(r.created_at)}</span>
              </div>
              ${r.review_text ? `<p class="review-text">${escHtml(r.review_text)}</p>` : ''}
            </div>`).join('')
          : `<div class="empty-state" style="padding:var(--space-10) 0">
              <div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <h3>No reviews yet</h3><p>Be the first to share your thoughts!</p>
             </div>`}
      </div>
    </div>`;

  // Library button
  const btnLib = $('#btn-library');
  if (btnLib) {
    let libStatus = book.in_library;
    btnLib.addEventListener('click', async () => {
      btnLib.disabled = true;
      if (!libStatus) {
        await API.users.addToLibrary(book.id, 'saved').catch(e => toast(e.message,'error'));
        btnLib.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>✓ In Library';
        libStatus = 'saved'; toast('Saved to your library!', 'success');
      } else {
        await API.users.removeFromLibrary(book.id).catch(e => toast(e.message,'error'));
        btnLib.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>Save to Library';
        libStatus = null; toast('Removed from library');
      }
      btnLib.disabled = false;
    });
  }

  // WTR button
  const btnWTR = $('#btn-wtr');
  if (btnWTR) {
    let wtrStatus = book.in_want_to_read;
    btnWTR.addEventListener('click', async () => {
      btnWTR.disabled = true;
      if (!wtrStatus) {
        await API.users.addWantToRead(book.id).catch(e => toast(e.message,'error'));
        btnWTR.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>♥ Wishlisted';
        wtrStatus = true; toast('Added to wishlist!', 'success');
      } else {
        await API.users.removeWantToRead(book.id).catch(e => toast(e.message,'error'));
        btnWTR.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>♡ Wishlist';
        wtrStatus = false; toast('Removed from wishlist');
      }
      btnWTR.disabled = false;
    });
  }

  // Star picker
  let selRating = book.my_review?.rating || 0;
  const picks = $$('.star-pick', container);
  picks.forEach(s => {
    s.addEventListener('mouseenter', () => picks.forEach((p,i) => p.classList.toggle('on', i < parseInt(s.dataset.val))));
    s.addEventListener('mouseleave', () => picks.forEach((p,i) => p.classList.toggle('on', i < selRating)));
    s.addEventListener('click', () => { selRating = parseInt(s.dataset.val); picks.forEach((p,i) => p.classList.toggle('on', i < selRating)); });
  });

  // Submit review
  $('#btn-submit-review')?.addEventListener('click', async () => {
    if (!selRating) { toast('Please select a rating', 'warning'); return; }
    const btn = $('#btn-submit-review');
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      await API.books.addReview(book.id, { rating: selRating, review_text: $('#review-text')?.value||'' });
      toast('Review posted!', 'success');
      setTimeout(() => Router.go(`/book/${book.id}`), 500);
    } catch(e) { toast(e.message, 'error'); btn.disabled=false; btn.textContent='Post Review'; }
  });
});

// ── LOGIN ────────────────────────────────────────────────────
Router.on('/login', () => {
  if (API.isLoggedIn()) return Router.go('/');
  $('#app').innerHTML = $('#tpl-login').innerHTML;

  $('#login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = $('#login-error'), errSpan = errEl?.querySelector('span');
    const btn = e.target.querySelector('[type=submit]');
    btn.classList.add('btn-loading'); btn.disabled = true;
    errEl?.classList.remove('show');
    try {
      const { token, user } = await API.auth.login({
        email: $('#login-email').value,
        password: $('#login-password').value,
      });
      API.setToken(token); API.setUser(user);
      toast(`Welcome back, ${user.display_name||user.username}! 👋`, 'success');
      Router.go('/');
    } catch(err) {
      if (errSpan) errSpan.textContent = err.message;
      errEl?.classList.add('show');
      btn.classList.remove('btn-loading'); btn.disabled = false;
    }
  });
});

// ── REGISTER ─────────────────────────────────────────────────
Router.on('/register', () => {
  if (API.isLoggedIn()) return Router.go('/');
  $('#app').innerHTML = $('#tpl-register').innerHTML;

  $('#register-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = $('#register-error'), errSpan = errEl?.querySelector('span');
    const btn = e.target.querySelector('[type=submit]');
    btn.classList.add('btn-loading'); btn.disabled = true;
    errEl?.classList.remove('show');
    try {
      const { token, user } = await API.auth.register({
        username: $('#reg-username').value,
        email:    $('#reg-email').value,
        password: $('#reg-password').value,
        display_name: $('#reg-displayname').value,
      });
      API.setToken(token); API.setUser(user);
      toast(`Welcome to CloudLibrary, ${user.display_name||user.username}! 🎉`, 'success');
      Router.go('/');
    } catch(err) {
      if (errSpan) errSpan.textContent = err.message;
      errEl?.classList.add('show');
      btn.classList.remove('btn-loading'); btn.disabled = false;
    }
  });
});

// ── PROFILE ──────────────────────────────────────────────────
Router.on('/profile', async () => {
  if (!API.isLoggedIn()) return Router.go('/login');
  const user = API.getUser();
  $('#app').innerHTML = $('#tpl-profile').innerHTML;
  const container = $('#profile-container');

  const profile = await API.users.profile(user.id).catch(() => null);
  if (!profile) { container.innerHTML = '<div class="empty-state"><p>Could not load profile.</p></div>'; return; }

  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#a855f7'];
  let selColor = profile.avatar_color || '#3b82f6';

  container.innerHTML = `
    <div class="profile-hero">
      <div class="profile-hero-layout">
        <div class="profile-avatar-lg" id="prof-av" style="background:${selColor}22;color:${selColor};border-color:${selColor}44">
          ${(profile.display_name||profile.username)[0].toUpperCase()}
        </div>
        <div class="profile-info">
          <div class="profile-name">${escHtml(profile.display_name||profile.username)}</div>
          <div class="profile-username">@${escHtml(profile.username)}</div>
          <div class="profile-bio">${escHtml(profile.bio)||'<span class="text-muted">No bio added yet.</span>'}</div>
          <p class="profile-joined">Member since ${new Date(profile.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>
        </div>
      </div>
      <div class="profile-stats-bento">
        <div class="bento-stat"><div class="bento-stat-num" id="bs-lib">—</div><div class="bento-stat-label">In Library</div></div>
        <div class="bento-stat"><div class="bento-stat-num" id="bs-wtr">—</div><div class="bento-stat-label">Want to Read</div></div>
        <div class="bento-stat"><div class="bento-stat-num" id="bs-con">—</div><div class="bento-stat-label">Contributions</div></div>
      </div>
    </div>

    <div class="profile-grid">
      <div class="profile-section">
        <h3>Edit Profile</h3>
        <form id="profile-edit-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="form-group">
            <label>Display Name</label>
            <input type="text" id="pe-name" value="${escHtml(profile.display_name||'')}" placeholder="Your Name" />
          </div>
          <div class="form-group">
            <label>Bio</label>
            <textarea id="pe-bio" rows="4" placeholder="Tell readers about yourself…">${escHtml(profile.bio||'')}</textarea>
          </div>
          <div class="form-group">
            <label>Avatar Color</label>
            <div class="color-picker-row" id="color-picker">
              ${colors.map(c=>`<div class="color-swatch${c===selColor?' selected':''}" data-color="${c}" style="background:${c}" title="${c}"></div>`).join('')}
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </form>
      </div>
      <div class="profile-section">
        <h3>Change Password</h3>
        <form id="password-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="form-group">
            <label>Current Password</label>
            <input type="password" id="pw-current" placeholder="••••••••" />
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" id="pw-new" placeholder="Min. 6 characters" />
          </div>
          <div id="pw-error" class="form-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span></span>
          </div>
          <button type="submit" class="btn btn-ghost">Update Password</button>
        </form>
      </div>
    </div>`;

  // Animate stats
  animateNum($('#bs-lib'), parseInt(profile.library_count)||0);
  animateNum($('#bs-wtr'), parseInt(profile.want_to_read_count)||0);
  animateNum($('#bs-con'), parseInt(profile.contributions_count)||0);

  // Color picker
  $$('.color-swatch').forEach(s => {
    s.addEventListener('click', () => {
      selColor = s.dataset.color;
      $$('.color-swatch').forEach(x => x.classList.toggle('selected', x.dataset.color === selColor));
      const av = $('#prof-av');
      av.style.background = selColor + '22'; av.style.color = selColor; av.style.borderColor = selColor + '44';
    });
  });

  // Save profile
  $('#profile-edit-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.classList.add('btn-loading'); btn.disabled = true;
    try {
      const updated = await API.users.updateProfile({
        display_name: $('#pe-name').value,
        bio: $('#pe-bio').value,
        avatar_color: selColor,
      });
      API.setUser({ ...API.getUser(), ...updated });
      updateNav(location.pathname);
      toast('Profile updated!', 'success');
    } catch(e) { toast(e.message, 'error'); }
    btn.classList.remove('btn-loading'); btn.disabled = false;
    btn.querySelector('.btn-text') ? btn.querySelector('.btn-text').textContent = 'Save Changes' : (btn.textContent = 'Save Changes');
  });

  // Change password
  $('#password-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = $('#pw-error'), errSpan = errEl?.querySelector('span');
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Updating…';
    errEl?.classList.remove('show');
    try {
      await API.users.changePassword({ current_password: $('#pw-current').value, new_password: $('#pw-new').value });
      toast('Password updated!', 'success');
      $('#pw-current').value = ''; $('#pw-new').value = '';
    } catch(err) { if(errSpan) errSpan.textContent = err.message; errEl?.classList.add('show'); }
    btn.disabled = false; btn.textContent = 'Update Password';
  });
});

// ── MY LIBRARY ───────────────────────────────────────────────
Router.on('/my-library', async () => {
  if (!API.isLoggedIn()) return Router.go('/login');
  $('#app').innerHTML = $('#tpl-my-library').innerHTML;

  const books = await API.users.library().catch(() => []);
  let active = 'all';

  // Update tab counts
  const counts = { all: books.length, saved: 0, reading: 0, finished: 0 };
  books.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
  Object.keys(counts).forEach(k => {
    const el = $(`#tab-count-${k}`);
    if (el) el.textContent = counts[k];
  });

  function render() {
    const filtered = active === 'all' ? books : books.filter(b => b.status === active);
    const grid = $('#my-library-grid');
    if (!grid) return;

    const statusMap = {
      saved: '<span class="status-pill status-saved">🔖 Saved</span>',
      reading: '<span class="status-pill status-reading">📖 Reading</span>',
      finished: '<span class="status-pill status-finished">✓ Finished</span>',
    };
    grid.innerHTML = filtered.length
      ? filtered.map(b => bookCard(b, `
          <div style="margin-top:var(--space-2);display:flex;align-items:center;justify-content:space-between">
            ${statusMap[b.status]||''}
            <span style="font-size:0.72rem;color:var(--text-dim)">${timeAgo(b.added_at)}</span>
          </div>`)).join('')
      : `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
          <h3>${active==='all' ? 'Your library is empty' : 'No '+active+' books'}</h3>
          <p>Browse the library and save books you like.</p>
          <a href="/library" data-route="/library" class="btn btn-primary btn-sm">Browse Library</a>
         </div>`;
  }

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      active = btn.dataset.status; render();
    });
  });
  render();
});

// ── WANT TO READ ─────────────────────────────────────────────
Router.on('/want-to-read', async () => {
  if (!API.isLoggedIn()) return Router.go('/login');
  $('#app').innerHTML = $('#tpl-want-to-read').innerHTML;

  const books = await API.users.wantToRead().catch(() => []);
  const grid = $('#wtr-grid');
  grid.innerHTML = books.length
    ? books.map(b => bookCard(b, `<div style="font-size:0.72rem;color:var(--text-dim);margin-top:var(--space-2)">Added ${timeAgo(b.added_at)}</div>`)).join('')
    : `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
        <h3>Your wishlist is empty</h3>
        <p>Find books and click "♡ Wishlist" to add them here.</p>
        <a href="/library" data-route="/library" class="btn btn-primary btn-sm">Browse Library</a>
       </div>`;
});

// ── CONTRIBUTIONS ────────────────────────────────────────────
Router.on('/contributions', async () => {
  if (!API.isLoggedIn()) return Router.go('/login');
  $('#app').innerHTML = $('#tpl-contributions').innerHTML;

  const books = await API.users.contributions().catch(() => []);
  const grid = $('#contrib-grid');
  if (!books.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
      <h3>No contributions yet</h3>
      <p>Be the first to share a public domain book!</p>
      <a href="/upload" data-route="/upload" class="btn btn-primary btn-sm">Upload a Book</a>
     </div>`;
    return;
  }
  grid.innerHTML = books.map(b => bookCard(b, `
    <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2)">
      <a href="/book/${b.id}" data-route="/book/${b.id}" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center">View</a>
      <button class="btn btn-danger btn-sm" data-delete="${b.id}" style="flex:1">Delete</button>
    </div>`)).join('');

  grid.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Permanently delete this book?')) return;
      btn.disabled = true; btn.textContent = 'Deleting…';
      try {
        await API.books.delete(btn.dataset.delete);
        toast('Book deleted', 'success');
        Router.go('/contributions');
      } catch(err) { toast(err.message, 'error'); btn.disabled=false; btn.textContent='Delete'; }
    });
  });
});

// ── UPLOAD ───────────────────────────────────────────────────
Router.on('/upload', () => {
  if (!API.isLoggedIn()) return Router.go('/login');
  $('#app').innerHTML = $('#tpl-upload').innerHTML;

  let selectedFile = null;
  const fileDrop = $('#file-drop'), fileInput = $('#up-file');
  const fileInfo = $('#file-info'), fileDropInner = $('#file-drop-inner');

  function showFile(file) {
    selectedFile = file;
    fileDropInner.style.display = 'none';
    fileInfo.style.display = 'flex';
    $('#file-info-name').textContent = file.name;
    $('#file-info-size').textContent = formatBytes(file.size);
    // Update step indicators
    $$('.upload-step[data-step="1"]').forEach(s => s.classList.remove('active'));
    $$('.upload-step[data-step="2"]').forEach(s => { s.classList.remove('active'); s.classList.add('active'); });
  }

  $('#btn-clear-file')?.addEventListener('click', () => {
    selectedFile = null; fileDropInner.style.display = ''; fileInfo.style.display = 'none';
    $$('.upload-step[data-step="2"]').forEach(s => s.classList.remove('active'));
    $$('.upload-step[data-step="1"]').forEach(s => s.classList.add('active'));
  });

  fileInput?.addEventListener('change', () => { if (fileInput.files[0]) showFile(fileInput.files[0]); });
  fileDrop?.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('drag-over'); });
  fileDrop?.addEventListener('dragleave', () => fileDrop.classList.remove('drag-over'));
  fileDrop?.addEventListener('drop', e => {
    e.preventDefault(); fileDrop.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) { fileInput.files = e.dataTransfer.files; showFile(f); }
  });

  $('#upload-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = $('#upload-error'), errSpan = errEl?.querySelector('span');
    const progWrap = $('#upload-progress'), progFill = $('#progress-fill');
    const btn = $('#upload-submit');
    errEl?.classList.remove('show');

    if (!selectedFile) {
      if (errSpan) errSpan.textContent = 'Please select a book file.';
      errEl?.classList.add('show'); return;
    }

    const fd = new FormData();
    fd.append('file', selectedFile);
    ['title','author','desc','genre','lang','year','pages'].forEach(id => {
      const el = $(`#up-${id}`);
      if (el) fd.append(id === 'desc' ? 'description' : id === 'lang' ? 'language' : id, el.value);
    });

    btn.classList.add('btn-loading'); btn.disabled = true;
    progWrap.style.display = '';
    $$('.upload-step').forEach(s => s.classList.remove('active'));
    $$('.upload-step[data-step="3"]').forEach(s => s.classList.add('active'));

    // Animate progress
    let prog = 0;
    const progTimer = setInterval(() => {
      prog = Math.min(prog + Math.random() * 15, 85);
      progFill.style.width = prog + '%';
    }, 300);

    try {
      const book = await API.books.upload(fd);
      clearInterval(progTimer);
      progFill.style.width = '100%';
      $$('.upload-step[data-step="3"]').forEach(s => s.classList.add('done'));
      toast('Book uploaded successfully! 🎉', 'success');
      setTimeout(() => Router.go(`/book/${book.id}`), 600);
    } catch(err) {
      clearInterval(progTimer);
      if (errSpan) errSpan.textContent = err.message;
      errEl?.classList.add('show');
      progWrap.style.display = 'none';
      btn.classList.remove('btn-loading'); btn.disabled = false;
      $$('.upload-step[data-step="3"]').forEach(s => s.classList.remove('active'));
      $$('.upload-step[data-step="2"]').forEach(s => s.classList.add('active'));
    }
  });
});

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  // Hide loader
  $('#loading-screen')?.remove();

  // Restore session
  if (API.isLoggedIn()) {
    const cached = API.getUser();
    if (cached) updateNav(location.pathname);
    API.auth.me().then(u => { API.setUser(u); updateNav(location.pathname); }).catch(() => {});
  }

  // Intersection Observer for scroll animations (UI UX Pro Max guideline #8)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Navigate to current route
  Router.go(location.pathname + location.search, false);
}

init();
