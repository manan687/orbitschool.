/* OrbitSchool Play Layer — animations, game-locked wardrobe, calendar planner.
   Additive: loaded after every other Orbit script; wraps existing functions, never replaces files. */
(function () {
  'use strict';
  const KEY = 'orbit_play_v1';
  const REMOVED = { studylab: 'studyboard', creator: 'avatar' }; // Study Lab + Creator Workshop retired
  const CLOTHES = ['shirts', 'pants', 'hairStyles', 'hairColors', 'hats', 'accessories', 'faces', 'shoes'];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => (typeof state !== 'undefined' ? state : null);
  const toast = (m, i) => { if (typeof showToast === 'function') showToast(m, i); };

  let play = { events: [] };
  try { Object.assign(play, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  if (!Array.isArray(play.events)) play.events = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(play)); } catch (e) {} };

  /* ---------------- 1. ANIMATIONS ---------------- */
  function burst(n) {
    if (reduce) return;
    const cols = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316'], f = document.createDocumentFragment();
    for (let i = 0; i < (n || 26); i++) {
      const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
      p.className = 'play-conf';
      p.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 70}px;--r:${Math.random() * 720 - 360}deg;background:${cols[i % cols.length]};left:50%;top:38%`;
      f.appendChild(p); setTimeout(() => p.remove(), 1500);
    }
    document.body.appendChild(f);
  }
  function floatText(text) {
    const el = document.createElement('div');
    el.className = 'play-float'; el.textContent = text;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1700);
  }
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest && e.target.closest('button,a,[onclick],.game-card,.life-option,.orbit-chip');
    if (!t) return;
    try { navigator.vibrate && navigator.vibrate(8); } catch (_) {}
    if (reduce) return;
    t.classList.remove('play-press'); void t.offsetWidth; t.classList.add('play-press');
    const r = document.createElement('span');
    r.className = 'play-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    document.body.appendChild(r); setTimeout(() => r.remove(), 650);
  }, { passive: true });

  // Every XP / coin reward = confetti + a floating "+XP +coins" pop.
  const origReward = window.addRewards;
  if (typeof origReward === 'function') {
    window.addRewards = function (xp, coins) {
      const out = origReward.apply(this, arguments);
      xp = Number(xp) || 0; coins = Number(coins) || 0;
      if (xp > 0 || coins > 0) { floatText(((xp ? '+' + xp + ' XP ' : '') + (coins ? '+' + coins + ' 🪙' : '')).trim()); burst(); }
      return out;
    };
  }

  /* ---------------- 2. REMOVE STUDY LAB + CREATOR WORKSHOP ---------------- */
  function pruneNav() {
    try { if (typeof SECTIONS !== 'undefined') for (let i = SECTIONS.length - 1; i >= 0; i--) if (REMOVED[SECTIONS[i].id]) SECTIONS.splice(i, 1); } catch (e) {}
  }
  const origSwitch = window.switchTab;
  if (typeof origSwitch === 'function') window.switchTab = function (id) { return origSwitch.call(this, REMOVED[id] || id); };

  /* ---------------- 3. COIN ECONOMY ---------------- */
  // One currency only: coins, earned by studying and spent in the Marketplace. Stars and diamonds are retired.
  function mountCoinBanner() {
    const s = st(), main = $('main-view');
    if (!s || s.activeTab !== 'shop' || !main || $('play-coinbar')) return;
    const d = document.createElement('section');
    d.id = 'play-coinbar'; d.className = 'play-coinbar';
    d.innerHTML = `<div class="pcb-bal">🪙 <b>${Number(s.coins) || 0}</b><small>your coins</small></div><p><b>Everything here is bought with coins.</b> Earn them by studying: chapter quizzes, Lingo lessons, flashcards, focus sessions, finished tasks, boss levels and study games.</p>`;
    const hero = main.querySelector('.orbit-hero,.on-hero'); hero ? hero.insertAdjacentElement('afterend', d) : main.prepend(d);
  }

  /* ---------------- 4. CALENDAR PLANNER ---------------- */
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parse = k => new Date(k + 'T00:00:00');
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const cal = { view: 'month', cursor: new Date(), sel: iso(new Date()) };
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function eventsOn(day) {
    const s = st(), out = [], today = iso(new Date());
    ((s && s.tasks) || []).forEach(t => { if (t.dueDate === day) out.push({ k: 'task', title: t.text, time: '', c: t.done ? 'green' : (day < today ? 'red' : 'blue'), done: !!t.done }); });
    ((s && s.exams) || []).forEach(x => { if (x.date === day) out.push({ k: 'exam', title: '📝 ' + x.title, time: x.time || '', c: 'purple' }); });
    play.events.forEach(e => { if (e.date === day) out.push({ k: 'event', id: e.id, title: e.title, time: e.time || '', c: e.c || 'teal' }); });
    return out.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  }
  const chip = e => `<span class="pc-chip c-${e.c}${e.done ? ' done' : ''}">${e.time ? esc(e.time) + ' ' : ''}${esc(e.title)}</span>`;
  const row = e => `<div class="pc-row c-${e.c}"><span class="pc-dot"></span><div><b>${esc(e.title)}</b><small>${e.time ? esc(e.time) + ' · ' : ''}${{ task: 'Task', exam: 'Exam', event: 'Event' }[e.k]}${e.done ? ' · done ✅' : ''}</small></div>${e.k === 'event' ? `<button class="pc-x" onclick="OrbitPlay.del('${e.id}')" aria-label="Delete event">✕</button>` : ''}</div>`;

  function monthHTML() {
    const c = cal.cursor, y = c.getFullYear(), m = c.getMonth(), start = new Date(y, m, 1 - new Date(y, m, 1).getDay()), today = iso(new Date());
    let h = '<div class="pc-dow">' + DOW.map(d => `<span>${d}</span>`).join('') + '</div><div class="pc-grid">';
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i), k = iso(d), ev = eventsOn(k);
      h += `<button class="pc-cell${d.getMonth() !== m ? ' off' : ''}${k === cal.sel ? ' sel' : ''}" onclick="OrbitPlay.pick('${k}')"><b class="${k === today ? 'today' : ''}">${d.getDate()}</b>${ev.slice(0, 3).map(chip).join('')}${ev.length > 3 ? `<em>+${ev.length - 3} more</em>` : ''}</button>`;
    }
    return h + '</div>';
  }
  function weekHTML() {
    const s = parse(cal.sel), start = addDays(s, -s.getDay()), today = iso(new Date());
    return '<div class="pc-week">' + Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i), k = iso(d), ev = eventsOn(k);
      return `<div class="pc-wcol${k === cal.sel ? ' sel' : ''}"><button class="pc-wh" onclick="OrbitPlay.pick('${k}')">${DOW[i]}<b class="${k === today ? 'today' : ''}">${d.getDate()}</b></button>${ev.map(chip).join('') || '<small class="pc-empty">—</small>'}</div>`;
    }).join('') + '</div>';
  }
  const dayHTML = () => { const ev = eventsOn(cal.sel); return `<div class="pc-list">${ev.map(row).join('') || '<p class="pc-empty">Nothing planned. Enjoy the free time or tap ＋ Create.</p>'}</div>`; };
  function agendaHTML() {
    let h = '', n = 0;
    for (let i = 0; i < 30; i++) { const d = addDays(new Date(), i), ev = eventsOn(iso(d)); if (!ev.length) continue; n++; h += `<div class="pc-ag"><h4>${d.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</h4>${ev.map(row).join('')}</div>`; }
    return `<div class="pc-list">${h || '<p class="pc-empty">Nothing in the next 30 days.</p>'}</div>`;
  }
  function title() {
    if (cal.view === 'month' || cal.view === 'agenda') return cal.cursor.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    const s = parse(cal.sel);
    if (cal.view === 'day') return s.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const a = addDays(s, -s.getDay()), b = addDays(a, 6);
    return a.toLocaleDateString('en', { day: 'numeric', month: 'short' }) + ' – ' + b.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function calInner() {
    const views = [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['agenda', 'Agenda']];
    const body = { month: monthHTML, week: weekHTML, day: dayHTML, agenda: agendaHTML }[cal.view]();
    const side = (cal.view === 'month' || cal.view === 'week') ? `<div class="pc-side"><h3>${parse(cal.sel).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>${dayHTML()}</div>` : '';
    return `<div class="pc-bar"><button class="pc-create" onclick="OrbitPlay.openCreate()">＋ Create</button><button class="pc-btn" onclick="OrbitPlay.today()">Today</button><button class="pc-icon" onclick="OrbitPlay.step(-1)" aria-label="Previous">‹</button><button class="pc-icon" onclick="OrbitPlay.step(1)" aria-label="Next">›</button><h2>${title()}</h2><div class="pc-seg">${views.map(([id, l]) => `<button class="${cal.view === id ? 'on' : ''}" onclick="OrbitPlay.view('${id}')">${l}</button>`).join('')}</div></div>
      <div class="pc-legend"><span class="c-blue"><i></i>Tasks</span><span class="c-green"><i></i>Done</span><span class="c-red"><i></i>Overdue</span><span class="c-purple"><i></i>Exams</span><span class="c-teal"><i></i>My events</span></div>
      <div class="pc-body">${body}</div>${side}`;
  }
  const redraw = () => { const el = $('play-cal'); if (el) el.innerHTML = calInner(); };
  function mountCalendar() {
    const s = st(), main = $('main-view');
    if (!s || s.activeTab !== 'planner' || !main) return;
    const div = document.createElement('section');
    div.id = 'play-cal'; div.className = 'play-cal'; div.innerHTML = calInner();
    const hero = main.querySelector('.orbit-hero');
    hero ? hero.insertAdjacentElement('afterend', div) : main.prepend(div);
  }
  function openCreate(date) {
    closeModal();
    const m = document.createElement('div');
    m.id = 'play-modal'; m.className = 'play-modal';
    m.innerHTML = `<div class="play-sheet" role="dialog" aria-label="Create event"><h3>New event</h3><input id="pm-title" placeholder="Add title" maxlength="80"><div class="pm-two"><input id="pm-date" type="date" value="${date || cal.sel}"><input id="pm-time" type="time"></div><select id="pm-color"><option value="teal">Teal</option><option value="orange">Orange</option><option value="pink">Pink</option><option value="blue">Blue</option><option value="purple">Purple</option></select><div class="pm-act"><button class="pc-btn" onclick="OrbitPlay.close()">Cancel</button><button class="pc-create" onclick="OrbitPlay.saveEvent()">Save</button></div></div>`;
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    document.body.appendChild(m); setTimeout(() => { const t = $('pm-title'); t && t.focus(); }, 30);
  }
  const closeModal = () => { const m = $('play-modal'); m && m.remove(); };

  window.OrbitPlay = {
    view(v) { cal.view = v; redraw(); },
    pick(k) { cal.sel = k; cal.cursor = parse(k); redraw(); },
    today() { cal.sel = iso(new Date()); cal.cursor = new Date(); redraw(); },
    step(n) {
      if (cal.view === 'month' || cal.view === 'agenda') cal.cursor = new Date(cal.cursor.getFullYear(), cal.cursor.getMonth() + n, 1);
      else { cal.sel = iso(addDays(parse(cal.sel), cal.view === 'week' ? 7 * n : n)); cal.cursor = parse(cal.sel); }
      redraw();
    },
    openCreate, close: closeModal,
    saveEvent() {
      const t = ($('pm-title').value || '').trim(), d = $('pm-date').value;
      if (!t || !d) { floatText('Add a title and date'); return; }
      play.events.push({ id: 'ev' + Date.now(), title: t.slice(0, 80), date: d, time: $('pm-time').value || '', c: $('pm-color').value });
      save(); closeModal(); cal.sel = d; cal.cursor = parse(d); redraw(); burst(14); floatText('📅 Event added');
    },
    del(id) { play.events = play.events.filter(e => e.id !== id); save(); redraw(); },
    getInfo: () => ({ customEvents: play.events.length, removedPanels: Object.keys(REMOVED) })
  };

  /* ---------------- WIRING ---------------- */
  const origRender = window.renderCurrentView;
  if (typeof origRender === 'function') {
    window.renderCurrentView = function () {
      const out = origRender.apply(this, arguments);
      const main = $('main-view');
      if (main && !reduce) { main.classList.remove('play-enter'); void main.offsetWidth; main.classList.add('play-enter'); }
      try { mountCalendar(); mountCoinBanner(); } catch (e) { console.warn('Orbit calendar failed:', e); }
      return out;
    };
  }
  function init() {
    pruneNav();
    const old = $('play-stars'); if (old) old.remove();
    const s = st();
    if (s && REMOVED[s.activeTab]) s.activeTab = REMOVED[s.activeTab];
    try { const h = (location.hash || '').slice(1); if (s && h && typeof SECTIONS !== 'undefined' && !REMOVED[h] && SECTIONS.some(x => x.id === h)) s.activeTab = h; } catch (e) {}
    if (typeof renderNav === 'function') renderNav();
    if (typeof window.renderCurrentView === 'function') window.renderCurrentView();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)) : setTimeout(init, 0);
})();
