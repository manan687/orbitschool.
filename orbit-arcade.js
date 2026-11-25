/* OrbitSchool Action Arcade — three real-time games (2 study, 1 fun), no level gate.
   Additive: injects a panel into the existing Arcade tab. Rewards: once per game per day, only at/above the goal score. */
(function () {
  'use strict';
  const KEY = 'orbit_arcade_plus_v1';
  const $ = id => document.getElementById(id);
  const S = () => (typeof state !== 'undefined' ? state : null);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = n => Math.floor(Math.random() * n);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  let D = { best: {}, claimed: [] };
  try { Object.assign(D, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  const GAMES = [
    { id: 'mathdash', name: 'Math Dash', emoji: '➕', tag: 'Study · Maths', goal: 60, desc: 'True or false? Beat the clock and build a combo.' },
    { id: 'typing', name: 'Typing Rain', emoji: '🌧️', tag: 'Study · Words', goal: 40, desc: 'Type the falling words before they hit the ground.' },
    { id: 'flap', name: 'Orbit Flap', emoji: '🚀', tag: 'Fun · Reflex', goal: 5, noCoins: true, desc: 'Tap to fly your rocket through the gaps.' }
  ];
  let run = null;

  /* ---------- shell ---------- */
  function open(id) {
    close(); const g = GAMES.find(x => x.id === id); if (!g) return;
    const m = document.createElement('div'); m.id = 'ap-modal'; m.className = 'ap-modal';
    m.innerHTML = `<div class="ap-box"><div class="ap-top"><b>${g.emoji} ${g.name}</b><span>Score <b id="ap-score">0</b></span><button class="ap-x" onclick="OrbitArcade.close()" aria-label="Close">✕</button></div><div id="ap-stage" class="ap-stage"></div></div>`;
    document.body.appendChild(m);
    run = { id, score: 0, stop() {} };
    GAME_FN[id]($('ap-stage'), api);
  }
  function close() { if (run) { try { run.stop(); } catch (e) {} run = null; } const m = $('ap-modal'); if (m) m.remove(); }
  const api = { set(n) { if (run) run.score = n; const e = $('ap-score'); if (e) e.textContent = n; }, end(n) { finish(n); } };
  function finish(score) {
    if (!run) return; const id = run.id, g = GAMES.find(x => x.id === id); try { run.stop(); } catch (e) {}
    const prev = D.best[id] || 0, isBest = score > prev; if (isBest) D.best[id] = score;
    const s = S(); if (s && s.stats) { s.stats.arcadePlayed = (s.stats.arcadePlayed || 0) + 1; try { safeSave(STORAGE_KEYS.stats, s.stats); } catch (e) {} }
    let note = `Reach ${g.goal} to earn rewards.`; const claim = today() + '|' + id;
    if (score >= g.goal) {
      if (D.claimed.includes(claim)) note = 'Daily reward already claimed — keep chasing your best!';
      else { D.claimed.push(claim); D.claimed = D.claimed.slice(-60); const xp = Math.min(25, 10 + Math.floor(score / g.goal * 5)), c = g.noCoins ? 0 : Math.min(15, 4 + Math.floor(score / g.goal * 3)); note = c ? `+${xp} XP · +${c} 🪙` : `+${xp} XP (fun games give XP only; coins come from studying)`; if (typeof addRewards === 'function') addRewards(xp, c, g.name); }
    }
    save();
    const st = $('ap-stage');
    if (st) st.innerHTML = `<div class="ap-end"><div class="sb-big">${isBest ? '🏅' : '🎮'}</div><h2>Score ${score}</h2><p>${isBest ? 'New personal best!' : 'Best: ' + prev}</p><p class="sb-reward">${esc(note)}</p><div class="on-row" style="justify-content:center"><button class="on-btn" onclick="OrbitArcade.open('${id}')">Play again</button><button class="on-btn soft" onclick="OrbitArcade.close()">Close</button></div></div>`;
    run = { id, score, stop() {} };
  }

  /* ---------- Math Dash ---------- */
  function eq() {
    const o = ['+', '−', '×'][rnd(3)]; let a, b, r;
    if (o === '×') { a = 2 + rnd(11); b = 2 + rnd(10); r = a * b; } else if (o === '+') { a = 10 + rnd(90); b = 10 + rnd(90); r = a + b; } else { a = 20 + rnd(80); b = 5 + rnd(a - 10); r = a - b; }
    const ok = Math.random() < .5, shown = ok ? r : r + (Math.random() < .5 ? -1 : 1) * (1 + rnd(o === '×' ? 9 : 5));
    return { text: `${a} ${o} ${b} = ${shown}`, ok, a, b, o, shown, r };
  }
  function mathdash(st, api) {
    let t = 30, score = 0, combo = 0, cur = eq();
    const draw = () => { st.innerHTML = `<div class="ap-timer"><i style="width:${t / 30 * 100}%"></i></div><div class="ap-eq">${esc(cur.text)}</div><div class="ap-combo">${combo > 1 ? '🔥 x' + combo : '&nbsp;'}</div><div class="ap-tf"><button class="ap-t" onclick="OrbitArcade._ans(true)">✔ True</button><button class="ap-f" onclick="OrbitArcade._ans(false)">✘ False</button></div>`; };
    window.OrbitArcade._ans = v => { if (t <= 0) return; if (v === cur.ok) { combo = Math.min(5, combo + 1); score += 10 + combo * 2; } else { combo = 0; score = Math.max(0, score - 5); t = Math.max(0, t - 2); } api.set(score); cur = eq(); draw(); };
    draw();
    const iv = setInterval(() => { t = Math.max(0, t - .1); if (t <= 0) { clearInterval(iv); api.end(score); } else { const b = st.querySelector('.ap-timer i'); if (b) b.style.width = (t / 30 * 100) + '%'; } }, 100);
    run.stop = () => clearInterval(iv);
  }

  /* ---------- Typing Rain ---------- */
  const WORDS = ['planet', 'orbit', 'galaxy', 'gravity', 'atom', 'energy', 'fraction', 'triangle', 'climate', 'history', 'science', 'neutron', 'equation', 'volcano', 'kingdom', 'algebra', 'capital', 'oxygen', 'island', 'comet', 'magnet', 'prism', 'noun', 'verb', 'tropic', 'glacier', 'canyon', 'empire', 'cell', 'photon', 'angle', 'decimal', 'harvest', 'monsoon', 'valley'];
  function typing(st, api) {
    st.innerHTML = '<div class="ap-rain" id="ap-rain"></div><div class="ap-hud" id="ap-hud">❤️❤️❤️</div><input id="ap-in" class="ap-in" placeholder="Type the word, it clears itself" autocomplete="off" autocapitalize="off" spellcheck="false">';
    const rain = $('ap-rain'), inp = $('ap-in'), hud = $('ap-hud'); inp.focus();
    let words = [], lives = 3, score = 0, last = performance.now(), t0 = last, nextSpawn = 0, raf, over = false;
    const kill = w => { w.el.remove(); words = words.filter(x => x !== w); };
    function loop(now) {
      if (over) return; raf = requestAnimationFrame(loop);
      const dt = Math.min(.05, (now - last) / 1000), el = (now - t0) / 1000; last = now;
      if (el >= nextSpawn) { const w = WORDS[rnd(WORDS.length)]; if (!words.some(x => x.w === w)) { const e = document.createElement('span'); e.className = 'ap-word'; e.textContent = w; e.style.left = (4 + Math.random() * 68) + '%'; rain.appendChild(e); words.push({ w, el: e, y: -6 }); } nextSpawn = el + Math.max(.9, 2.3 - el / 50); }
      const v = 11 + Math.min(14, el / 6);
      words.slice().forEach(x => { x.y += v * dt; x.el.style.top = x.y + '%'; if (x.y >= 90) { kill(x); lives--; hud.textContent = '❤️'.repeat(Math.max(0, lives)); if (lives <= 0 && !over) { over = true; api.end(score); } } });
    }
    inp.addEventListener('input', () => { const val = inp.value.trim().toLowerCase(), w = words.find(x => x.w === val); if (w) { score += w.w.length * 2; kill(w); inp.value = ''; api.set(score); } });
    raf = requestAnimationFrame(loop);
    run.stop = () => { over = true; cancelAnimationFrame(raf); };
  }

  /* ---------- Orbit Flap ---------- */
  function flap(st, api) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 520; c.className = 'ap-canvas'; st.appendChild(c);
    const x = c.getContext('2d'), G = 1500, F = -430, BX = 90, PW = 56, GAP = 155;
    let y = 240, v = 0, pipes = [], score = 0, alive = true, started = false, raf, last = performance.now(), ended = false;
    const tap = () => { if (!alive) return; started = true; v = F; };
    const key = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); tap(); } };
    c.addEventListener('pointerdown', tap); document.addEventListener('keydown', key);
    function loop(now) {
      raf = requestAnimationFrame(loop); const dt = Math.min(.035, (now - last) / 1000); last = now;
      if (started && alive) {
        v += G * dt; y += v * dt;
        pipes.forEach(p => { p.x -= 150 * dt; if (!p.passed && p.x + PW < BX) { p.passed = true; score++; api.set(score); } });
        pipes = pipes.filter(p => p.x > -PW);
        if (!pipes.length || pipes[pipes.length - 1].x < 190) pipes.push({ x: 360, gy: 110 + rnd(260), passed: false });
        if (y < 12 || y > 508 || pipes.some(p => BX + 13 > p.x && BX - 13 < p.x + PW && (y - 13 < p.gy - GAP / 2 || y + 13 > p.gy + GAP / 2))) { alive = false; if (!ended) { ended = true; setTimeout(() => api.end(score), 450); } }
      }
      const g = x.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, '#1b1f4b'); g.addColorStop(1, '#5b3f9a'); x.fillStyle = g; x.fillRect(0, 0, 360, 520);
      x.fillStyle = '#ffffff88'; for (let i = 0; i < 24; i++) x.fillRect((i * 97 + (started ? -now / 40 : 0) % 360 + 360) % 360, (i * 53) % 520, 2, 2);
      pipes.forEach(p => { x.fillStyle = '#34d399'; x.fillRect(p.x, 0, PW, p.gy - GAP / 2); x.fillRect(p.x, p.gy + GAP / 2, PW, 520); x.fillStyle = '#059669'; x.fillRect(p.x - 4, p.gy - GAP / 2 - 14, PW + 8, 14); x.fillRect(p.x - 4, p.gy + GAP / 2, PW + 8, 14); });
      x.save(); x.translate(BX, y); x.rotate(Math.max(-.5, Math.min(.9, v / 600))); x.font = '30px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🚀', 0, 0); x.restore();
      if (!started) { x.fillStyle = '#fff'; x.font = '700 20px sans-serif'; x.textAlign = 'center'; x.fillText('Tap or press Space to fly', 180, 150); }
    }
    raf = requestAnimationFrame(loop);
    run.stop = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', key); };
  }
  const GAME_FN = { mathdash, typing, flap };

  window.OrbitArcade = { open, close, _ans() {}, _eq: eq, _finish(id, n) { run = { id, score: n, stop() {} }; finish(n); }, getInfo: () => ({ best: D.best, games: GAMES.length }) };

  /* ---------- inject into the Arcade tab ---------- */
  const orig = window.renderCurrentView;
  window.renderCurrentView = function () {
    const out = orig.apply(this, arguments), s = S(), main = $('main-view');
    if (!s || !main || s.activeTab !== 'arcade') return out;
    try {
      const sec = document.createElement('section'); sec.className = 'on-panel ap-panel';
      sec.innerHTML = `<div class="ap-head"><h2>🔥 Action Arcade <em>NEW</em></h2><small>Real-time games. No level needed.</small></div><div class="ap-cards">${GAMES.map(g => `<button class="ap-card" onclick="OrbitArcade.open('${g.id}')"><span>${g.emoji}</span><b>${g.name}</b><small>${g.tag}</small><p>${g.desc}</p><i>${D.best[g.id] ? 'Best ' + D.best[g.id] : 'Not played yet'}</i></button>`).join('')}</div>`;
      const hero = main.querySelector('.on-hero,.orbit-hero'); hero ? hero.insertAdjacentElement('afterend', sec) : main.prepend(sec);
    } catch (e) { console.warn('Orbit arcade panel failed:', e); }
    return out;
  };
})();
