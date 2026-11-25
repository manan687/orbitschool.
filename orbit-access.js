/* OrbitSchool access + daily plan: text size, high contrast, daily reminders, and a "Today's plan" card on the Study Board. */
(function () {
  'use strict';
  const KEY = 'orbit_access_v1';
  const $ = id => document.getElementById(id);
  const S = () => (typeof state !== 'undefined' ? state : null);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  let A = { size: 0, contrast: false, remindDay: '' };
  try { Object.assign(A, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} };

  const css = document.createElement('style');
  css.textContent = `
  html[data-ts="1"]{font-size:112%}html[data-ts="2"]{font-size:126%}
  html.hc body{background:#000!important;color:#fff!important}
  html.hc .card,html.hc .on-panel,html.hc .on-hero,html.hc [class*=rounded]{border-color:#fff!important}
  html.hc button{outline:2px solid #fff!important}
  .ac-fab{position:fixed;left:14px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:65;width:44px;height:44px;border-radius:50%;border:2px solid #6366f1;background:#fff;color:#312e81;font:800 15px Inter,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer}
  @media(min-width:1024px){.ac-fab{bottom:18px}}
  .ac-modal{position:fixed;inset:0;z-index:99986;background:rgba(10,12,35,.6);display:flex;align-items:center;justify-content:center;padding:14px}
  .ac-box{width:min(420px,100%);background:#fff;color:#1e293b;border-radius:20px;padding:20px;display:grid;gap:12px}
  .ac-box h3{margin:0;font:600 19px Fredoka,Inter,sans-serif}
  .ac-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}
  .ac-box button{padding:10px 14px;border-radius:12px;border:1px solid #cbd5e1;background:transparent;color:inherit;font:700 14px Inter,system-ui,sans-serif;cursor:pointer}
  .ac-box button.on{background:#4f46e5;color:#fff;border-color:#4f46e5}
  .ac-plan{margin:0 0 14px;padding:14px;border-radius:18px;background:#eef2ff;color:#1e1b4b;border:1px solid #c7d2fe}
  .ac-plan h3{margin:0 0 8px;font:600 17px Fredoka,Inter,sans-serif}
  .ac-plan ol{margin:0;padding-left:20px;display:grid;gap:6px}
  .ac-plan button{margin-left:6px;padding:4px 10px;border-radius:9px;border:0;background:#4f46e5;color:#fff;font:700 12px Inter,system-ui,sans-serif;cursor:pointer}
  .dark .ac-plan{background:#1e1b4b;color:#e0e7ff;border-color:#3730a3}`;
  document.head.appendChild(css);

  function applyPrefs() {
    const h = document.documentElement;
    h.dataset.ts = String(A.size || 0);
    h.classList.toggle('hc', !!A.contrast);
  }

  /* ---- settings panel ---- */
  function openPanel() {
    close();
    const m = document.createElement('div'); m.id = 'ac-modal'; m.className = 'ac-modal';
    const remind = 'Notification' in window ? (Notification.permission === 'granted' ? '✅ Reminders are on' : 'Turn on daily reminders') : 'Reminders not supported here';
    m.innerHTML = `<div class="ac-box" role="dialog" aria-label="Accessibility and reminders"><h3>Accessibility &amp; reminders</h3>
      <div class="ac-row"><span>Text size</span><span><button data-ts="0" class="${A.size === 0 ? 'on' : ''}">A</button> <button data-ts="1" class="${A.size === 1 ? 'on' : ''}">A+</button> <button data-ts="2" class="${A.size === 2 ? 'on' : ''}">A++</button></span></div>
      <div class="ac-row"><span>High contrast</span><button id="ac-hc" class="${A.contrast ? 'on' : ''}">${A.contrast ? 'On' : 'Off'}</button></div>
      <div class="ac-row"><span>Daily reminder</span><button id="ac-rem">${remind}</button></div>
      <div class="ac-row"><span></span><button id="ac-close">Done</button></div></div>`;
    m.addEventListener('click', e => {
      if (e.target === m || e.target.id === 'ac-close') return close();
      const ts = e.target.dataset && e.target.dataset.ts;
      if (ts != null && e.target.tagName === 'BUTTON') { A.size = Number(ts); save(); applyPrefs(); openPanel(); }
      if (e.target.id === 'ac-hc') { A.contrast = !A.contrast; save(); applyPrefs(); openPanel(); }
      if (e.target.id === 'ac-rem') requestReminders();
    });
    document.body.appendChild(m);
    const first = m.querySelector('button'); if (first) first.focus();
  }
  function close() { const m = $('ac-modal'); if (m) m.remove(); }
  function requestReminders() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(p => { if (p === 'granted') { A.remindDay = ''; save(); remindCheck(); } openPanel(); });
  }
  function remindCheck() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const s = S(); if (!s) return;
    const due = (s.tasks || []).filter(t => !t.done && (!t.dueDate || t.dueDate <= today())).length;
    if (due && A.remindDay !== today()) {
      A.remindDay = today(); save();
      try { new Notification('OrbitSchool', { body: `You have ${due} task${due > 1 ? 's' : ''} to finish today. Let's go! 🚀`, tag: 'orbit-daily' }); } catch (e) {}
    }
  }

  /* ---- today's plan on the Study Board ---- */
  function planCard() {
    const s = S(), bank = window.OrbitBank || {}, keys = Object.keys(bank);
    const due = typeof getDueCardsCount === 'function' ? getDueCardsCount() : 0;
    let best = {}; try { best = (JSON.parse(localStorage.getItem('orbit_study_v1') || '{}').best) || {}; } catch (e) {}
    const task = (s.tasks || []).find(t => !t.done);
    const weak = keys.findIndex(k => !(best[k] >= 70)); // first chapter without a 70%+ score
    const weakIdx = weak >= 0 ? weak : (keys.length ? 0 : -1);
    const items = [];
    if (due) items.push(`Review <b>${due}</b> flashcard${due > 1 ? 's' : ''} <button onclick="switchTab('flashcards')">Open</button>`);
    if (task) items.push(`Finish: ${esc(task.text)} <button onclick="switchTab('planner')">Open</button>`);
    if (weakIdx >= 0) items.push(`Quiz: ${esc(keys[weakIdx].split('|')[2] || keys[weakIdx])} <button onclick="OrbitStudy.start(${weakIdx})">Start</button>`);
    items.push(`Play a study game: Math Dash <button onclick="OrbitArcade.open('mathdash')">Play</button>`);
    return `<section class="ac-plan"><h3>🗓️ Today's plan</h3><ol>${items.map(i => `<li>${i}</li>`).join('')}</ol></section>`;
  }
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const origRender = window.renderCurrentView;
  window.renderCurrentView = function () {
    const out = origRender.apply(this, arguments), s = S(), main = $('main-view');
    if (s && main && s.activeTab === 'studyboard' && !main.querySelector('.ac-plan')) {
      try { const wrap = document.createElement('div'); wrap.innerHTML = planCard(); const hero = main.querySelector('.on-hero'); (hero ? hero.parentNode : main).insertBefore(wrap.firstElementChild, hero ? hero.nextSibling : main.firstChild); } catch (e) {}
    }
    return out;
  };

  function boot() {
    applyPrefs();
    if (!$('ac-fab')) {
      const b = document.createElement('button'); b.id = 'ac-fab'; b.className = 'ac-fab';
      b.setAttribute('aria-label', 'Accessibility and reminder settings'); b.title = 'Text size, contrast and reminders';
      b.textContent = 'Aa'; b.onclick = openPanel; document.body.appendChild(b);
    }
    setTimeout(remindCheck, 2500);
    setInterval(remindCheck, 60 * 1000);
    if (typeof renderCurrentView === 'function') renderCurrentView();
  }
  window.OrbitAccess = { open: openPanel, close, getInfo: () => ({ ...A }) };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 350)) : setTimeout(boot, 350);
})();
