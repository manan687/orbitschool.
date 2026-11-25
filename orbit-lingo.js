/* OrbitSchool Lingo Path — Duolingo-style lessons on top of the existing 10 language courses.
   Additive: reads window.OrbitLingoData (exposed by orbit-expansion.js); AI tutor chat stays available as "Classic". */
(function () {
  'use strict';
  const KEY = 'orbit_lingo_duo_v1', MAXH = 5, REGEN = 20 * 60 * 1000, GOAL = 20;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const S = () => (typeof state !== 'undefined' ? state : null);
  const sfx = n => { try { if (typeof playSfx === 'function') playSfx(n); } catch (e) {} };
  const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => fmt(new Date());
  const yest = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };
  const CAN = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  let D = { lang: 'Spanish', done: {}, hearts: MAXH, hAt: Date.now(), xp: { day: '', n: 0 }, streak: { last: '', n: 0 }, claimed: [] };
  try { Object.assign(D, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  const ui = { ses: null, classic: false };
  const data = () => window.OrbitLingoData || {};
  const L = () => (data()[D.lang] ? D.lang : Object.keys(data())[0]);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const items = l => ((data()[l] || {}).lessons || []).map(r => ({ title: r[0], en: String(r[1]).replace(/^Translate:\s*/i, ''), t: r[2], tiles: r.slice(3) }));

  function hearts() {
    if (D.hearts < MAXH) { const g = Math.floor((Date.now() - D.hAt) / REGEN); if (g > 0) { D.hearts = Math.min(MAXH, D.hearts + g); D.hAt = D.hearts >= MAXH ? Date.now() : D.hAt + g * REGEN; save(); } }
    else D.hAt = Date.now();
    return D.hearts;
  }
  function loseHeart() { const h = hearts(); if (h === MAXH) D.hAt = Date.now(); D.hearts = Math.max(0, h - 1); save(); }
  const xpToday = () => (D.xp.day === today() ? D.xp.n : 0);
  const doneArr = l => (D.done[l] = D.done[l] || []);
  const unlocked = (l, u) => u === 0 || !!doneArr(l)[u - 1];
  function speak(t) { if (!CAN) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = (data()[L()] || {}).code || 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); } catch (e) {} }

  /* ---------- lesson builder ---------- */
  function opts(correct, all, key) { const o = [...new Set(shuffle(all.filter(x => x[key] !== correct)).map(x => x[key]))].slice(0, 3); return shuffle([correct].concat(o)); }
  function mkEx(type, it, IT, words) {
    if (type === 'tiles') {
      const toks = it.t.split(' ');
      if (toks.length > 1) return { type, it, tiles: shuffle(toks.concat(shuffle(words.filter(w => !toks.includes(w))).slice(0, 3))), tapped: [], status: null };
      type = 'mc';
    }
    if (type === 'listen' && !CAN) type = 'mcrev';
    if (type === 'mc') return { type, it, opts: opts(it.t, IT, 't'), ans: it.t, sel: null, status: null };
    return { type, it, opts: opts(it.en, IT, 'en'), ans: it.en, sel: null, status: null };
  }
  function build(l, u) {
    const IT = items(l), pool = IT.slice(0, Math.min(IT.length, Math.max(3, u + 2))), f = IT[u];
    const words = [...new Set(IT.flatMap(x => x.t.split(' ').concat(x.tiles)))];
    const ex = [mkEx('mc', f, IT, words), mkEx('listen', f, IT, words), mkEx('tiles', f, IT, words)];
    ex.push({ type: 'match', its: shuffle(pool).slice(0, 4), selL: null, selR: null, done: [], status: null });
    ex[3].L = shuffle(ex[3].its.map((_, i) => i)); ex[3].R = shuffle(ex[3].its.map((_, i) => i));
    ex.push(mkEx('mcrev', f, IT, words));
    let last = f;
    ['tiles', 'listen', 'mc'].forEach(t => { const c = pool.filter(x => x !== last); last = c[Math.floor(Math.random() * c.length)] || f; ex.push(mkEx(t, last, IT, words)); });
    return ex;
  }
  function start(u, practice) {
    const l = L(); if (!unlocked(l, u) || !items(l)[u]) return;
    const prac = !!practice || hearts() <= 0;
    ui.ses = { unit: u, ex: build(l, u), i: 0, wrong: 0, right: 0, prac, fail: false, done: false, gain: 0 };
    ui.classic = false; draw();
  }
  const cur = () => (ui.ses ? ui.ses.ex[ui.ses.i] : null);
  const draw = () => { if (typeof renderCurrentView === 'function') renderCurrentView(); };

  /* ---------- interactions ---------- */
  function judge(ex, ok) {
    const s = ui.ses; ex.status = ok ? 'ok' : 'bad';
    if (ok) { s.right++; sfx('coin'); }
    else {
      s.wrong++; sfx('click');
      if (!s.prac) { loseHeart(); if (hearts() <= 0) s.fail = true; }
      if (!ex.retry && ex.type !== 'match') { const c = mkEx(ex.type, ex.it, items(L()), []); if (ex.type === 'tiles') { c.tiles = shuffle(ex.tiles); } c.retry = true; s.ex.push(c); }
    }
    draw();
  }
  function check() {
    const ex = cur(); if (!ex || ex.status) return;
    if (ex.type === 'tiles') { if (!ex.tapped.length) return; judge(ex, ex.tapped.map(i => ex.tiles[i]).join(' ') === ex.it.t); }
    else if (ex.sel != null) judge(ex, ex.opts[ex.sel] === ex.ans);
  }
  function next() {
    const s = ui.ses; if (!s || !cur() || !cur().status) return;
    if (s.fail) { s.done = true; return draw(); }
    s.i++; if (s.i >= s.ex.length) complete();
    draw();
  }
  function complete() {
    const s = ui.ses, l = L(); s.done = true;
    if (s.prac) return;
    const xp = 10 + (s.wrong === 0 ? 5 : 0); s.gain = xp;
    doneArr(l)[s.unit] = true;
    D.xp = { day: today(), n: xpToday() + xp };
    if (D.streak.last !== today()) { D.streak = { last: today(), n: D.streak.last === yest() ? D.streak.n + 1 : 1 }; }
    const key = today() + '|' + l + '|' + s.unit;
    if (!D.claimed.includes(key)) { D.claimed.push(key); D.claimed = D.claimed.slice(-120); save(); if (typeof addRewards === 'function') addRewards(xp + 5, 6, 'Lingo lesson'); } else save();
  }
  function matchTap(side, idx) {
    const ex = cur(); if (!ex || ex.status || ex.type !== 'match') return;
    if (side === 'L') { ex.selL = idx; if (CAN) speak(ex.its[idx].t); } else ex.selR = idx;
    if (ex.selL != null && ex.selR != null) {
      if (ex.selL === ex.selR) { ex.done.push(ex.selL); ex.selL = ex.selR = null; sfx('coin'); if (ex.done.length === ex.its.length) return judge(ex, true); }
      else { ex.selL = ex.selR = null; ui.ses.wrong++; if (!ui.ses.prac) { loseHeart(); if (hearts() <= 0) { ui.ses.fail = true; ex.status = 'bad'; } } }
    }
    draw();
  }

  /* ---------- views ---------- */
  const ring = () => { const p = Math.min(1, xpToday() / GOAL), c = 2 * Math.PI * 16; return `<svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="16" fill="none" stroke="var(--pc-line)" stroke-width="5"/><circle cx="21" cy="21" r="16" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 21 21)"/><text x="21" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${Math.min(xpToday(), GOAL)}</text></svg>`; };
  function renderPath() {
    const l = L(), IT = items(l), h = hearts(), x = [0, 46, 74, 46, 0, -46];
    const firstOpen = IT.findIndex((_, i) => !doneArr(l)[i]);
    return `<div class="on-page lg"><div class="lg-stats"><span title="Day streak">🔥 <b>${D.streak.last === today() || D.streak.last === yest() ? D.streak.n : 0}</b></span><span title="Hearts">❤️ <b>${h}</b>${h < MAXH ? `<small>${Math.max(1, Math.ceil((REGEN - (Date.now() - D.hAt)) / 60000))}m</small>` : ''}</span><span class="lg-ring" title="Daily goal: ${GOAL} XP">${ring()}</span><button class="lg-classic" onclick="OrbitLingo.classic()">💬 Tutor chat</button></div>
      <div class="lg-langs">${Object.keys(data()).map(n => `<button class="${n === l ? 'on' : ''}" onclick="OrbitLingo.lang('${n}')"><span>${data()[n].flag}</span>${n}</button>`).join('')}</div>
      <div class="lg-banner"><div><small>SECTION 1 · BEGINNER</small><b>${esc(l)}</b></div><span>${data()[l].flag}</span></div>
      <div class="lg-path">${IT.map((it, i) => { const done = !!doneArr(l)[i], open = unlocked(l, i), now = i === firstOpen; return `<div class="lg-row" style="--x:${x[i % 6]}px"><button class="lg-node ${done ? 'done' : open ? 'open' : 'lock'}${now ? ' now' : ''}" ${open ? '' : 'disabled'} onclick="OrbitLingo.start(${i})" aria-label="${esc(it.title)}">${done ? '✔' : open ? '▶' : '🔒'}${now ? '<em>START</em>' : ''}</button><small>${esc(it.title)}</small></div>`; }).join('')}<div class="lg-row" style="--x:0px"><div class="lg-chest">🏆</div><small>${IT.every((_, i) => doneArr(l)[i]) ? 'Section complete!' : 'Finish all units'}</small></div></div>
      <p class="on-muted lg-note">Starter course: lessons practise key phrases with speaking, listening and sentence building. It isn't a full language curriculum.</p></div>`;
  }
  function exBody(ex) {
    const o = (i, txt) => `<button class="lg-opt${ex.sel === i ? ' sel' : ''}${ex.status ? (txt === ex.ans ? ' ok' : ex.sel === i ? ' bad' : '') : ''}" ${ex.status ? 'disabled' : ''} onclick="OrbitLingo.sel(${i})">${esc(txt)}</button>`;
    if (ex.type === 'mc') return `<h2 class="lg-q">How do you say “${esc(ex.it.en)}”?</h2><div class="lg-opts">${ex.opts.map((t, i) => o(i, t)).join('')}</div>`;
    if (ex.type === 'mcrev') return `<h2 class="lg-q">What does this mean?</h2><div class="lg-say">${CAN ? '<button class="lg-spk" onclick="OrbitLingo.say()">🔊</button>' : ''}<b>${esc(ex.it.t)}</b></div><div class="lg-opts">${ex.opts.map((t, i) => o(i, t)).join('')}</div>`;
    if (ex.type === 'listen') return `<h2 class="lg-q">Tap what you hear</h2><button class="lg-spk big" onclick="OrbitLingo.say()">🔊</button><div class="lg-opts">${ex.opts.map((t, i) => o(i, t)).join('')}</div>`;
    if (ex.type === 'tiles') return `<h2 class="lg-q">Translate this sentence</h2><div class="lg-say"><b>${esc(ex.it.en)}</b></div><div class="lg-ans">${ex.tapped.map(i => `<button class="lg-tile" ${ex.status ? 'disabled' : ''} onclick="OrbitLingo.tile(${i})">${esc(ex.tiles[i])}</button>`).join('')}</div><div class="lg-bank">${ex.tiles.map((t, i) => ex.tapped.includes(i) ? `<span class="lg-tile ghost">${esc(t)}</span>` : `<button class="lg-tile" ${ex.status ? 'disabled' : ''} onclick="OrbitLingo.tile(${i})">${esc(t)}</button>`).join('')}</div>`;
    const cell = (side, i, txt) => `<button class="lg-opt${ex.done.includes(i) ? ' ok gone' : ''}${(side === 'L' ? ex.selL : ex.selR) === i ? ' sel' : ''}" ${ex.done.includes(i) || ex.status ? 'disabled' : ''} onclick="OrbitLingo.mt('${side}',${i})">${esc(txt)}</button>`;
    return `<h2 class="lg-q">Tap the matching pairs</h2><div class="lg-match"><div>${ex.L.map(i => cell('L', i, ex.its[i].t)).join('')}</div><div>${ex.R.map(i => cell('R', i, ex.its[i].en)).join('')}</div></div>`;
  }
  function renderSession() {
    const s = ui.ses, h = hearts();
    if (s.done) {
      if (s.fail) return `<div class="on-page lg"><section class="on-panel lg-end"><div class="sb-big">💔</div><h2>Out of hearts</h2><p class="on-muted">A new heart arrives in about ${Math.max(1, Math.ceil((REGEN - (Date.now() - D.hAt)) / 60000))} min. You can keep practising now — it just won't earn XP.</p><div class="on-row" style="justify-content:center"><button class="on-btn" onclick="OrbitLingo.start(${s.unit},true)">Practise without hearts</button><button class="on-btn soft" onclick="OrbitLingo.quit()">Back to path</button></div></section></div>`;
      const acc = Math.round(s.right / Math.max(1, s.right + s.wrong) * 100);
      return `<div class="on-page lg"><section class="on-panel lg-end"><div class="sb-big">${s.prac ? '💪' : '🎉'}</div><h2>${s.prac ? 'Practice complete' : 'Lesson complete!'}</h2><div class="on-row" style="justify-content:center">${s.prac ? '' : `<div class="on-stat"><b>+${s.gain}</b><span>XP</span></div>`}<div class="on-stat"><b>${acc}%</b><span>ACCURACY</span></div><div class="on-stat"><b>${D.streak.n}🔥</b><span>STREAK</span></div></div><div class="on-row" style="justify-content:center;margin-top:14px"><button class="on-btn" onclick="OrbitLingo.quit()">Continue</button></div></section></div>`;
    }
    const ex = cur(), ready = ex.type === 'tiles' ? ex.tapped.length > 0 : ex.sel != null;
    const foot = ex.status ? `<div class="lg-foot ${ex.status}"><div><b>${ex.status === 'ok' ? 'Excellent! ✅' : 'Not quite ❌'}</b>${ex.status === 'bad' && ex.type !== 'match' ? `<small>Correct answer: ${esc(ex.type === 'tiles' ? ex.it.t : ex.ans)}</small>` : ''}</div><button class="lg-go" onclick="OrbitLingo.next()">${s.fail ? 'Continue' : 'Continue'}</button></div>` : (ex.type === 'match' ? '' : `<div class="lg-foot"><button class="lg-go" ${ready ? '' : 'disabled'} onclick="OrbitLingo.check()">Check</button></div>`);
    return `<div class="on-page lg"><div class="lg-top"><button class="sb-x" onclick="OrbitLingo.quit()" aria-label="Quit">✕</button><div class="sb-bar"><i style="width:${s.i / s.ex.length * 100}%"></i></div><span class="lg-h">${s.prac ? '∞' : '❤️ ' + h}</span></div><div class="lg-body">${exBody(ex)}</div>${foot}</div>`;
  }

  window.OrbitLingo = {
    start, check, next,
    sel(i) { const ex = cur(); if (ex && !ex.status) { ex.sel = i; if (ex.type === 'mc' && CAN) speak(ex.opts[i]); draw(); } },
    tile(i) { const ex = cur(); if (!ex || ex.status) return; const k = ex.tapped.indexOf(i); k >= 0 ? ex.tapped.splice(k, 1) : ex.tapped.push(i); draw(); },
    mt: matchTap, say() { const ex = cur(); if (ex) speak(ex.it.t); },
    quit() { ui.ses = null; draw(); },
    lang(n) { D.lang = n; ui.ses = null; save(); draw(); },
    classic() { ui.classic = true; draw(); },
    path() { ui.classic = false; draw(); },
    _cur: cur,
    getInfo: () => ({ lang: L(), streak: D.streak.n, hearts: hearts(), xpToday: xpToday(), done: D.done })
  };

  const orig = window.renderCurrentView;
  window.renderCurrentView = function () {
    const out = orig.apply(this, arguments), s = S(), main = $('main-view');
    if (!s || !main || s.activeTab !== 'lingua' || !Object.keys(data()).length) return out;
    try {
      if (ui.classic) main.insertAdjacentHTML('afterbegin', '<div class="on-page" style="padding-bottom:0"><button class="on-btn soft" onclick="OrbitLingo.path()">← Back to learning path</button></div>');
      else main.innerHTML = ui.ses ? renderSession() : renderPath();
    } catch (e) { console.warn('Orbit Lingo path failed:', e); }
    return out;
  };
})();
