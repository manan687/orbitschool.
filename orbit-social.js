/* OrbitSchool accounts + community. Username and password (no email).
   Progress follows the account: sign in on any device and your data comes with you.
   Community: send a friend request by username, accept or decline, chat with friends, duel friends. */
(function () {
  'use strict';
  const SESSION = 'orbit_session_v3';
  const API = '/api';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, i) => { if (typeof showToast === 'function') showToast(m, i || '✨'); };
  let session = null; try { session = JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch (e) {}
  let mode = 'signup';
  let social = null, groups = [], invites = [], view = { name: 'home' }, pollTimer = null, syncTimer = null;
  const GROUP_FILE_KEYS = ['orbit_flashcard_decks', 'orbit_mistake_book', 'orbit_planner_tasks', 'orbit_exam_calendar'];

  /* ---------- fallback accounts saved in this browser (used when the account server is not running) ---------- */
  async function pbkdf2(pw, salt) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function localAuth(path, body) {
    const ACC = 'orbit_local_accounts';
    let accts = {}; try { accts = JSON.parse(localStorage.getItem(ACC) || '{}'); } catch (e) {}
    const name = String(body.username || '').trim(), l = name.toLowerCase(), pw = String(body.password || '');
    if (path === '/auth/register') {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) throw new Error('Username: 3–20 letters, numbers or underscore.');
      if (pw.length < 6 || pw.length > 100) throw new Error('Password must be at least 6 characters.');
      if (accts[l]) throw new Error('That username is taken. Try another one.');
      const salt = crypto.randomUUID();
      accts[l] = { username: name, salt, hash: await pbkdf2(pw, salt) };
      localStorage.setItem(ACC, JSON.stringify(accts));
    } else {
      const u = accts[l];
      if (!u || (await pbkdf2(pw, u.salt)) !== u.hash) throw new Error('Wrong username or password.');
    }
    return { token: 'local-' + l, username: accts[l].username, progress: {} };
  }

  /* ---------- study groups ---------- */
  const gbtn = (label, onclick, cls) => `<button onclick="${onclick}" class="px-3 py-2 rounded-xl font-game font-bold text-xs ${cls}">${label}</button>`;
  function groupFilesOf(code) {}
  async function shareNow(code) {
    const all = collectProgress(), files = {};
    GROUP_FILE_KEYS.forEach((k) => { if (all[k] != null) files[k] = all[k]; });
    await api('POST', '/groups/files', { code, files });
  }
  function groupsCard() {
    const list = groups.map((g) => `<button onclick="OrbitSocial.openGroup('${esc(g.code)}')" class="w-full text-left flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 text-sm"><span><b>${esc(g.name)}</b> <small class="opacity-70">code ${esc(g.code)}</small></span><span class="opacity-80">${g.members.length} members</span></button>`).join('');
    return card(`<h3 class="font-game text-lg font-bold mb-1">👨‍👩‍👧 Study Groups</h3>
      <p class="text-xs opacity-70 mb-3">Create a group and share its code. Members see each other's flashcards, mistake book, planner and exams.</p>
      <form onsubmit="OrbitSocial.createGroup(event)" class="flex gap-2 mb-3"><input id="grp-new" maxlength="30" placeholder="New group name" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm" /><button type="submit" class="px-3 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs">Create</button></form>
      <form onsubmit="OrbitSocial.joinGroup(event)" class="flex flex-col sm:flex-row gap-2 mb-3"><input id="grp-join-name" maxlength="30" placeholder="Group name" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm" /><input id="grp-join-code" maxlength="8" placeholder="Code" class="w-full sm:w-32 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm uppercase" /><button type="submit" class="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Join</button></form>
      <div class="mb-3">${gbtn('🏆 Leaderboard', 'OrbitSocial.openBoard()', 'bg-amber-500 text-white')}</div>
      ${list || '<p class="text-sm opacity-70">You are not in any group yet.</p>'}`);
  }
  function groupView(g) {
    const inGroup = new Set(g.members.map((x) => String(x.username).toLowerCase()));
    const fl = ((social && social.friends) || []).filter((f) => !inGroup.has(String(f.username).toLowerCase()));
    const friendPick = fl.length ? `<h4 class="text-sm font-bold mt-3 mb-1">Invite your friends</h4>${fl.map((f) => `<div class="flex items-center justify-between py-1 text-sm"><span>${esc(f.username)}</span>${gbtn('Invite', `OrbitSocial.inviteFriend('${esc(g.code)}','${esc(f.username)}')`, 'bg-indigo-600 text-white')}</div>`).join('')}` : '';
    const mem = g.members.map((x) => `<div class="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 text-sm"><span><i class="inline-block w-2.5 h-2.5 rounded-full ${x.online ? 'bg-emerald-500' : 'bg-slate-400'}"></i> <b>${esc(x.username)}</b>${x.me ? ' (you)' : ''}</span>${x.me ? '' : gbtn(x.hasFiles ? 'View files' : 'No files yet', `OrbitSocial.openMemberFiles('${esc(g.code)}','${esc(x.lname)}')`, 'bg-teal-600 text-white')}</div>`).join('');
    return card(`<div class="flex items-center justify-between mb-2"><h3 class="font-game text-lg font-bold">👨‍👩‍👧 ${esc(g.name)}</h3>${gbtn('← Back', 'OrbitSocial.back()', 'bg-slate-200 dark:bg-slate-700')}</div>
      <p class="text-sm mb-2">Group code: <b class="font-mono text-lg">${esc(g.code)}</b> <small class="opacity-70">share this code with people who should join</small></p>
      ${mem}
      ${friendPick}
      <form onsubmit="OrbitSocial.inviteMember(event,'${esc(g.code)}')" class="flex gap-2 mt-3"><input id="grp-invite" maxlength="20" placeholder="Invite by username" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm" /><button type="submit" class="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Invite</button></form>
      <h4 class="text-sm font-bold mt-4 mb-1">Group chat</h4>
      <div id="grp-msgs" class="h-56 overflow-y-auto rounded-2xl bg-slate-100 dark:bg-slate-900 p-3 flex flex-col gap-2"></div>
      <form onsubmit="OrbitSocial.sendGroupChat(event,'${esc(g.code)}')" class="flex gap-2 mt-2"><input id="grp-chat-input" maxlength="500" placeholder="Message the group" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm" /><button type="submit" class="px-3 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs">Send</button></form>
      <div class="flex flex-wrap gap-2 mt-3">${gbtn('Share my files now', `OrbitSocial.shareFilesNow('${esc(g.code)}')`, 'bg-emerald-600 text-white')}${gbtn('Leave group', `OrbitSocial.leaveGroup('${esc(g.code)}')`, 'bg-rose-600 text-white')}</div>`);
  }
  function groupFilesView(v) {
    const back = gbtn('← Back to group', `OrbitSocial.openGroup('${esc(v.code)}')`, 'bg-slate-200 dark:bg-slate-700');
    if (!v.data) return card(`<div class="flex items-center justify-between mb-2"><h3 class="font-game text-lg font-bold">Loading files…</h3>${back}</div>`);
    const f = v.data.files;
    if (!f) return card(`<div class="flex items-center justify-between mb-2"><h3 class="font-game text-lg font-bold">${esc(v.data.username)}</h3>${back}</div><p class="text-sm">${esc(v.data.username)} has not shared any files yet.</p>`);
    const pj = (k) => { try { return JSON.parse(f[k] || '[]') || []; } catch (e) { return []; } };
    const decks = pj('orbit_flashcard_decks'), mistakes = pj('orbit_mistake_book'), tasks = pj('orbit_planner_tasks'), exams = pj('orbit_exam_calendar');
    const sec = (title, body) => `<h4 class="text-sm font-bold mt-4 mb-1">${title}</h4>${body || '<p class="text-xs opacity-60">Nothing here yet.</p>'}`;
    const deckHTML = decks.map((d) => `<div class="mb-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900"><b>🃏 ${esc(d.title || 'Deck')}</b> <small class="opacity-70">${(d.cards || []).length} cards</small>${(d.cards || []).slice(0, 30).map((c) => `<div class="text-xs mt-1">• <b>${esc(c.front)}</b> — ${esc(c.back)}</div>`).join('')}</div>`).join('');
    const mistakeHTML = mistakes.map((m) => `<div class="text-sm py-1 border-b border-slate-200 dark:border-slate-700"><b>${esc(m.subject)}</b>: ${esc(m.question)} <small class="opacity-70">Fix: ${esc(m.fix)}</small></div>`).join('');
    const taskHTML = tasks.map((t) => `<div class="text-sm py-1">${t.done ? '✅' : '⬜'} ${esc(t.text)} <small class="opacity-60">${esc(t.tag || '')}</small></div>`).join('');
    const examHTML = exams.map((x) => `<div class="text-sm py-1">📆 ${esc(x.title)} · ${esc(x.date)}</div>`).join('');
    return card(`<div class="flex items-center justify-between mb-2"><h3 class="font-game text-lg font-bold">📁 ${esc(v.data.username)}'s files</h3>${back}</div>
      <p class="text-xs opacity-60">Last shared: ${v.data.updatedAt ? new Date(v.data.updatedAt).toLocaleString() : '—'}</p>
      ${sec('Flashcard decks', deckHTML)}${sec('Mistake book', mistakeHTML)}${sec('Planner tasks', taskHTML)}${sec('Exam calendar', examHTML)}`);
  }

  /* ---------- group chat + leaderboard ---------- */
  async function loadGroupChat() {
    if (view.name !== 'group') return;
    const box = $('grp-msgs'); if (!box) return;
    try {
      const d = await api('GET', '/groups/chat?code=' + encodeURIComponent(view.code));
      box.textContent = '';
      if (!d.messages.length) { box.innerHTML = '<p class="text-sm opacity-60">No messages yet. Say hello!</p>'; return; }
      d.messages.forEach((m) => {
        const el = document.createElement('div');
        el.className = 'max-w-[78%] px-3 py-2 rounded-2xl text-sm ' + (m.mine ? 'self-end bg-teal-600 text-white' : 'self-start bg-white dark:bg-slate-700');
        el.textContent = (m.mine ? '' : m.from + ': ') + m.text;
        box.appendChild(el);
      });
      box.scrollTop = box.scrollHeight;
    } catch (e) {}
  }
  async function loadBoard() {
    if (view.name !== 'board') return;
    const box = $('board-list'); if (!box) return;
    try {
      const d = await api('GET', '/leaderboard');
      box.textContent = '';
      if (!d.rows.length) { box.innerHTML = '<p class="text-sm opacity-60">No players yet.</p>'; return; }
      d.rows.forEach((r, i) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 py-2 border-b border-slate-200 dark:border-slate-700';
        const rank = document.createElement('b'); rank.className = 'w-7 text-center font-game'; rank.textContent = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
        const av = document.createElement('div'); av.className = 'w-10 h-10 flex items-center justify-center shrink-0';
        try { if (r.avatar && typeof renderRobloxAvatarSVG === 'function') av.innerHTML = renderRobloxAvatarSVG(r.avatar, 40, false); } catch (e) {}
        const info = document.createElement('div'); info.className = 'flex-1 min-w-0';
        const name = document.createElement('div'); name.className = 'font-bold text-sm truncate';
        name.textContent = r.username + ' ';
        const dot = document.createElement('i'); dot.className = 'inline-block w-2 h-2 rounded-full ' + (r.online ? 'bg-emerald-500' : 'bg-slate-400'); name.appendChild(dot);
        const sub = document.createElement('div'); sub.className = 'text-xs opacity-70';
        sub.textContent = 'Level ' + r.level + ' · ' + r.xp + ' XP total · ' + r.badges + ' badges';
        info.appendChild(name); info.appendChild(sub);
        const today = document.createElement('div'); today.className = 'text-right text-sm';
        const t1 = document.createElement('div'); t1.className = 'font-bold'; t1.textContent = '+' + r.xpToday + ' XP today';
        const t2 = document.createElement('div'); t2.className = 'text-[11px] opacity-60';
        t2.textContent = r.resetsAt ? 'resets in ' + Math.max(0, Math.round((r.resetsAt - Date.now()) / 3600000)) + 'h' : 'not active today';
        today.appendChild(t1); today.appendChild(t2);
        row.appendChild(rank); row.appendChild(av); row.appendChild(info); row.appendChild(today);
        box.appendChild(row);
      });
    } catch (e) { box.textContent = e.message; }
  }
  window.OrbitSocialMount = function () {
    const h = $('soc-root');
    if (h) { h.innerHTML = renderSocialHTML(); if (view.name === 'chat') loadChat(); if (view.name === 'group') loadGroupChat(); if (view.name === 'board') loadBoard(); }
    refresh();
  };
  async function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers.Authorization = 'Bearer ' + session.token;
    const isAuth = path === '/auth/register' || path === '/auth/login';
    let r;
    try { r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { if (isAuth) return localAuth(path, body || {}); throw new Error('No connection right now. Check your internet and try again.'); }
    const isJson = (r.headers.get('content-type') || '').includes('application/json');
    const d = isJson ? await r.json().catch(() => ({})) : null;
    if (!isJson && isAuth) return localAuth(path, body || {});
    if (!isJson) throw new Error('OrbitSchool server not found at this address. Start it with "node orbit-server.js" and open the app from that address (for example http://localhost:8080).');
    if (r.status === 401 && session) { signOutLocal(); throw new Error('Please sign in again.'); }
    if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
    return d;
  }

  /* ---------- progress: collect the app's own saved data (no tokens) ---------- */
  function collectProgress() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('orbit') && k !== SESSION) out[k] = localStorage.getItem(k);
    }
    return out;
  }
  function applyProgress(progress) {
    Object.keys(progress || {}).forEach((k) => { try { localStorage.setItem(k, progress[k]); } catch (e) {} });
  }
  async function syncProgress() {
    if (!session) return;
    try { await api('PUT', '/progress', { progress: collectProgress() }); } catch (e) {}
    for (const g of groups) { try { await shareNow(g.code); } catch (e) {} }
  }

  /* ---------- sign-in gate ---------- */
  function showGate(show) {
    const g = $('signin-gate-overlay');
    if (g) g.style.display = show ? 'flex' : 'none';
    // Keep other pop-ups (for example the badge pop-up) from covering the sign-in form.
    let st = $('soc-gate-style');
    if (show) { if (!st) { st = document.createElement('style'); st.id = 'soc-gate-style'; st.textContent = '#badge-modal,#cosmos-intro,.toast-pop{display:none!important}'; document.head.appendChild(st); } }
    else if (st) st.remove();
  }
  function setMode(m) {
    mode = m;
    const su = $('auth-tab-signup'), li = $('auth-tab-login'), btn = $('auth-submit-btn');
    if (su && li) {
      su.style.background = m === 'signup' ? '#f59e0b' : 'transparent'; su.style.color = m === 'signup' ? '#0f172a' : '#e0e7ff';
      li.style.background = m === 'login' ? '#f59e0b' : 'transparent'; li.style.color = m === 'login' ? '#0f172a' : '#e0e7ff';
    }
    if (btn) btn.textContent = m === 'signup' ? 'Create Account & Start 🚀' : 'Sign In 🔓';
    const hint = $('auth-hint'); if (hint) hint.textContent = m === 'signup' ? 'Pick a username and password. Use the same ones on any device to get your progress back.' : 'Use the username and password you created.';
    const err = $('auth-error'); if (err) err.textContent = '';
  }
  async function handleOrbitSignIn(e) {
    if (e && e.preventDefault) e.preventDefault();
    const username = ($('auth-username') || {}).value || '', password = ($('auth-password') || {}).value || '';
    const err = $('auth-error'), btn = $('auth-submit-btn');
    if (err) err.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…'; }
    try {
      const path = mode === 'signup' ? '/auth/register' : '/auth/login';
      const d = await api('POST', path, { username: username.trim(), password });
      session = { token: d.token, username: d.username };
      localStorage.setItem(SESSION, JSON.stringify(session));
      if (mode === 'login') {
        applyProgress(d.progress);
        toast(`Welcome back, ${d.username}! Your progress is restored. 🎉`, '🎉');
        setTimeout(() => location.reload(), 600);
        return;
      }
      if (typeof resetAllProgressForNewAccount === 'function') { try { resetAllProgressForNewAccount(d.username, ''); } catch (x) {} }
      await syncProgress();
      toast(`Welcome, ${d.username}! Your account is ready. 🎉`, '🎉');
      showGate(false); startLoops();
      if (typeof updateHeaderUI === 'function') updateHeaderUI();
      if (typeof renderCurrentView === 'function') renderCurrentView();
    } catch (x) {
      if (err) err.textContent = x.message;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = mode === 'signup' ? 'Create Account & Start 🚀' : 'Sign In 🔓'; }
    }
  }
  function signOutLocal() { session = null; localStorage.removeItem(SESSION); stopLoops(); showGate(true); }
  async function signOut() {
    try { await api('POST', '/auth/logout'); } catch (e) {}
    signOutLocal(); toast('Signed out. Your progress is saved to your account.', '👋');
  }
  window.handleOrbitSignIn = handleOrbitSignIn;
  window.OrbitSocialAuth = { setMode };
  window.resendOrbitOtp = function () {};

  /* ---------- Community panel ---------- */
  const card = (inner) => `<div class="game-card p-5 border-teal-300 dark:border-teal-800 mb-5">${inner}</div>`;
  const btn = (label, onclick, cls) => `<button onclick="${onclick}" class="${cls || 'bg-teal-600 text-white'} px-3 py-2 rounded-xl text-sm font-bold">${label}</button>`;
  function renderSocialHTML() {
    if (!session) return card(`<p class="text-sm">Sign in to add friends, chat and duel.</p>`);
    if (view.name === 'group') { const g = groups.find((x) => x.code === view.code); if (!g) { view = { name: 'home' }; return renderSocialHTML(); } return groupView(g); }
    if (view.name === 'groupfiles') return groupFilesView(view);
    if (view.name === 'board') return card(`<div class="flex items-center justify-between mb-2"><h3 class="font-game text-lg font-bold">🏆 Leaderboard</h3>${gbtn('← Back', 'OrbitSocial.back()', 'bg-slate-200 dark:bg-slate-700')}</div>
      <p class="text-xs opacity-70 mb-2">Every player, ranked by XP earned today. Daily stats reset 24 hours after each player's day starts.</p><div id="board-list" class="text-sm">Loading…</div>`);
    if (!social) return card(`<p class="text-sm">Loading your friends…</p>`);
    if (view.name === 'chat') {
      return card(`<div class="flex items-center justify-between mb-3"><h3 class="font-game text-lg font-bold">💬 ${esc(view.with)}</h3>${btn('← Back', 'OrbitSocial.back()', 'bg-slate-200 dark:bg-slate-700')}</div>
        <div id="soc-msgs" class="h-72 overflow-y-auto rounded-2xl bg-slate-100 dark:bg-slate-900 p-3 flex flex-col gap-2"></div>
        <form onsubmit="OrbitSocial.sendChat(event)" class="flex gap-2 mt-3"><input id="soc-input" maxlength="500" placeholder="Type a message" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm" autocomplete="off"><button class="bg-teal-600 text-white px-4 rounded-xl font-bold">Send</button></form>`);
    }
    if (view.name === 'duel') {
      const d = social.duels.find((x) => x.id === view.id);
      if (!d) { view = { name: 'home' }; return renderSocialHTML(); }
      return card(`<div class="flex items-center justify-between mb-2"><h3 class="font-game text-lg font-bold">⚔️ Duel vs ${esc(d.opponent)}</h3>${btn('← Back', 'OrbitSocial.back()', 'bg-slate-200 dark:bg-slate-700')}</div>${duelBody(d)}`);
    }
    const online = social.friends.filter((f) => f.online).length;
    const incoming = social.incoming.map((r) => `<div class="flex items-center justify-between gap-2 py-2 border-b border-slate-200 dark:border-slate-700"><span class="text-sm"><b>${esc(r.from)}</b> wants to be friends</span><span class="flex gap-2">${btn('Accept', `OrbitSocial.respond('${r.id}',true)`, 'bg-emerald-600 text-white')}${btn('Decline', `OrbitSocial.respond('${r.id}',false)`, 'bg-slate-200 dark:bg-slate-700')}</span></div>`).join('');
    const friends = social.friends.map((f) => `<div class="flex items-center justify-between gap-2 py-2 border-b border-slate-200 dark:border-slate-700"><span class="text-sm flex items-center gap-2"><i class="inline-block w-2.5 h-2.5 rounded-full ${f.online ? 'bg-emerald-500' : 'bg-slate-400'}"></i><b>${esc(f.username)}</b> <small class="opacity-70">${f.online ? 'online' : 'offline'}</small></span><span class="flex gap-2">${btn('Chat', `OrbitSocial.openChat('${esc(f.username)}')`, 'bg-teal-600 text-white')}${btn('Duel ⚔️', `OrbitSocial.challenge('${esc(f.username)}')`, 'bg-indigo-600 text-white')}</span></div>`).join('');
    const duels = social.duels.filter((d) => d.status !== 'finished' || d.winner).slice(0, 8).map((d) => {
      let state = d.status === 'pending' ? (d.challengedByMe ? 'Waiting for them to accept' : 'Challenge from ' + d.opponent) : d.status === 'active' ? (d.myAnswered < d.total ? `Your turn · ${d.myAnswered}/${d.total}` : 'Waiting for ' + d.opponent) : (d.winner === 'draw' ? 'Draw' : d.winner === 'me' ? 'You won 🏆' : d.opponent + ' won');
      return `<button onclick="OrbitSocial.openDuel('${d.id}')" class="w-full text-left flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 text-sm"><span>vs <b>${esc(d.opponent)}</b></span><span class="opacity-80">${esc(state)}</span></button>`;
    }).join('');
    const inviteBox = invites.length ? card(`<h3 class="font-game text-lg font-bold mb-2">📨 Group invitations</h3>${invites.map((v) => `<div class="flex items-center justify-between gap-2 py-2 border-b border-slate-200 dark:border-slate-700 text-sm"><span><b>${esc(v.name)}</b> <small class="opacity-70">from ${esc(v.from)}</small></span><span class="flex gap-2">${gbtn('Accept', `OrbitSocial.acceptInvite('${esc(v.code)}')`, 'bg-emerald-600 text-white')}${gbtn('Decline', `OrbitSocial.declineInvite('${esc(v.code)}')`, 'bg-slate-200 dark:bg-slate-700')}</span></div>`).join('')}`) : '';
    return inviteBox + groupsCard() + card(`
      <div class="flex items-center justify-between mb-3"><h3 class="font-game text-lg font-bold">👥 Friends &amp; Duels</h3><span class="text-xs opacity-70">${online} online · signed in as ${esc(social.me)}</span></div>
      <form onsubmit="OrbitSocial.request(event)" class="flex gap-2 mb-4"><input id="soc-req" maxlength="20" placeholder="Friend's username" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-sm" autocomplete="off"><button class="bg-teal-600 text-white px-4 rounded-xl font-bold text-sm">Send request</button></form>
      ${incoming ? `<h4 class="text-sm font-bold mb-1">Friend requests</h4>${incoming}` : ''}
      <h4 class="text-sm font-bold mt-3 mb-1">Your friends (${social.friends.length})</h4>${friends || '<p class="text-sm opacity-70">No friends yet. Send a request by username above.</p>'}
      ${duels ? `<h4 class="text-sm font-bold mt-3 mb-1">Duels</h4>${duels}` : ''}
      <div class="flex justify-between items-center mt-4"><small class="opacity-60">Duels: 5 quick maths questions each. Both players must finish.</small>${btn('Sign out', 'OrbitSocial.signOut()', 'bg-slate-200 dark:bg-slate-700')}</div>`);
  }
  function duelBody(d) {
    if (d.status === 'pending' && !d.challengedByMe) return `<p class="text-sm mb-3">${esc(d.opponent)} challenged you to a 5-question maths duel.</p><div class="flex gap-2">${btn('Accept duel', `OrbitSocial.acceptDuel('${d.id}',true)`, 'bg-emerald-600 text-white')}${btn('Not now', `OrbitSocial.acceptDuel('${d.id}',false)`, 'bg-slate-200 dark:bg-slate-700')}</div>`;
    if (d.status === 'pending') return `<p class="text-sm">Waiting for ${esc(d.opponent)} to accept. You can come back any time.</p>`;
    if (d.status === 'active' && d.questions.length) {
      const q = d.questions[0];
      return `<p class="text-sm mb-2">Question ${d.myAnswered + 1} of ${d.total} · Score ${d.myScore}</p><div class="text-2xl font-bold text-center my-4">${esc(q.text)}</div><div class="grid grid-cols-2 gap-2">${q.opts.map((o, i) => `<button onclick="OrbitSocial.answer('${d.id}',${i})" class="py-3 rounded-xl border-2 border-indigo-300 font-bold">${o}</button>`).join('')}</div>`;
    }
    if (d.status === 'active') return `<p class="text-sm">You finished (${d.myScore}/${d.total}). Waiting for ${esc(d.opponent)} to finish. Come back when they've answered.</p>`;
    const result = d.winner === 'draw' ? 'It\'s a draw!' : d.winner === 'me' ? '🏆 You won!' : `${esc(d.opponent)} won.`;
    return `<p class="text-lg font-bold mb-1">${result}</p><p class="text-sm">Your score: ${d.myScore}/${d.total} · ${esc(d.opponent)}: ${d.oppScore}/${d.total}</p>`;
  }
  function renderMessages(list) {
    const box = $('soc-msgs'); if (!box) return;
    box.innerHTML = list.length ? list.map((m) => `<div class="max-w-[78%] px-3 py-2 rounded-2xl text-sm ${m.mine ? 'self-end bg-teal-600 text-white rounded-br-sm' : 'self-start bg-white dark:bg-slate-700 rounded-bl-sm'}"></div>`).join('') : '<p class="text-sm opacity-70 m-auto">Say hi! 👋</p>';
    box.querySelectorAll('div').forEach((el, i) => { el.textContent = list[i].text; });
    box.scrollTop = box.scrollHeight;
  }

  function paint(force) {
    const host = $('soc-root');
    if (!host) return;
    const typing = document.activeElement && ['soc-req', 'grp-new', 'grp-join-name', 'grp-join-code', 'grp-invite', 'grp-chat-input'].includes(document.activeElement.id) && document.activeElement.value;
    if (typing && !force) return;
    host.innerHTML = renderSocialHTML();
    if (view.name === 'chat') loadChat();
    if (view.name === 'group') loadGroupChat();
    if (view.name === 'board') loadBoard();
  }
  async function refresh() {
    if (!session) return;
    try { social = await api('GET', '/social'); } catch (e) { return; }
    try { const gd = await api('GET', '/groups'); groups = gd.groups || []; invites = gd.invites || []; } catch (e) { groups = []; invites = []; }
    if (view.name !== 'chat') paint(false);
  }
  async function loadChat() {
    if (view.name !== 'chat' || !session) return;
    try { const d = await api('GET', '/chat?with=' + encodeURIComponent(view.with)); renderMessages(d.messages); } catch (e) {}
  }

  const methods = {
    async request(e) {
      e.preventDefault(); const i = $('soc-req'), to = (i && i.value || '').trim();
      if (!to) return;
      try { await api('POST', '/friends/request', { to }); toast(`Request sent to ${to} 📨`, '📨'); if (i) i.value = ''; await refresh(); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async respond(id, accept) {
      try { await api('POST', '/friends/respond', { id, accept }); toast(accept ? 'You are now friends! 🤝' : 'Request declined', accept ? '🤝' : '👋'); await refresh(); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    openChat(username) { view = { name: 'chat', with: username }; paint(true); },
    async sendChat(e) {
      e.preventDefault(); const i = $('soc-input'), text = (i && i.value || '').trim();
      if (!text) return;
      i.value = '';
      try { await api('POST', '/chat', { to: view.with, text }); loadChat(); }
      catch (x) { toast(x.message, '⚠️'); i.value = text; }
    },
    async challenge(username) {
      try { const d = await api('POST', '/duel/challenge', { to: username }); toast(`Duel sent to ${username} ⚔️`, '⚔️'); view = { name: 'duel', id: d.id }; await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async acceptDuel(id, accept) {
      try { await api('POST', '/duel/accept', { id, accept }); await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    openDuel(id) { view = { name: 'duel', id }; paint(true); },
    async answer(id, choice) {
      try { const r = await api('POST', '/duel/answer', { id, choice }); toast(r.correct ? 'Correct! ✅' : 'Not this one ❌', r.correct ? '✅' : '❌'); await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async createGroup(e) {
      e.preventDefault(); const i = $('grp-new'), name = (i && i.value || '').trim(); if (!name) return;
      try { const g = await api('POST', '/groups/create', { name }); await shareNow(g.code); if (i) i.value = ''; toast(`Group created! Code: ${g.code}`, '👥'); view = { name: 'group', code: g.code }; await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async joinGroup(e) {
      e.preventDefault(); const n = $('grp-join-name'), c = $('grp-join-code');
      const name = (n && n.value || '').trim(), code = (c && c.value || '').trim().toUpperCase();
      if (!name || !code) return toast('Enter the group name and code.', '⚠️');
      try { const g = await api('POST', '/groups/join', { name, code }); await shareNow(g.code); toast(`Joined ${g.name} 🎉`, '👥'); view = { name: 'group', code: g.code }; await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async inviteFriend(code, username) {
      try { const r = await api('POST', '/groups/invite', { code, to: username }); toast(`Invitation sent to ${r.username} 📨`, '📨'); await refresh(); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    openGroup(code) { view = { name: 'group', code }; paint(true); },
    openBoard() { view = { name: 'board' }; paint(true); },
    async sendGroupChat(e, code) {
      e.preventDefault(); const i = $('grp-chat-input'), text = (i && i.value || '').trim(); if (!text) return;
      try { await api('POST', '/groups/chat', { code, text }); if (i) i.value = ''; loadGroupChat(); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async inviteMember(e, code) {
      e.preventDefault(); const i = $('grp-invite'), to = (i && i.value || '').trim(); if (!to) return;
      try { const r = await api('POST', '/groups/invite', { code, to }); if (i) i.value = ''; toast(`Invitation sent to ${r.username} 📨`, '📨'); await refresh(); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async acceptInvite(code) {
      try { const r = await api('POST', '/groups/accept', { code }); await shareNow(r.code); toast(`Joined ${r.name} 🎉`, '👥'); view = { name: 'group', code: r.code }; await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async declineInvite(code) {
      try { await api('POST', '/groups/decline', { code }); toast('Invitation declined', '👋'); await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    async openMemberFiles(code, user) {
      view = { name: 'groupfiles', code, user, data: null }; paint(true);
      try { const d = await api('GET', `/groups/files?code=${encodeURIComponent(code)}&user=${encodeURIComponent(user)}`); view.data = d; paint(true); }
      catch (x) { toast(x.message, '⚠️'); view = { name: 'group', code }; paint(true); }
    },
    async shareFilesNow(code) { try { await shareNow(code); toast('Your files are shared with the group ✅', '📤'); } catch (x) { toast(x.message, '⚠️'); } },
    async leaveGroup(code) {
      if (!confirm('Leave this group? Your shared files will be removed from it.')) return;
      try { await api('POST', '/groups/leave', { code }); toast('You left the group', '👋'); view = { name: 'home' }; await refresh(); paint(true); }
      catch (x) { toast(x.message, '⚠️'); }
    },
    back() { view = { name: 'home' }; paint(true); refresh(); },
    signOut,
  };
  window.OrbitSocial = methods;

  // Community tab: our panel sits above the existing community content.
  // Put the panel at the top of the Community tab after whichever renderer drew the page.
  const origRender = window.renderCurrentView;
  window.renderCurrentView = function () {
    const out = typeof origRender === 'function' ? origRender.apply(this, arguments) : undefined;
    try {
      const main = $('main-view');
      if (main && typeof state !== 'undefined' && (state.activeTab === 'community' || state.activeTab === 'communityhub') && !main.querySelector('#soc-root')) {
        const wrap = document.createElement('div'); wrap.id = 'soc-root'; wrap.className = 'mb-5 px-1';
        wrap.innerHTML = renderSocialHTML();
        main.insertBefore(wrap, main.firstChild);
        if (view.name === 'chat') loadChat();
      }
    } catch (e) {}
    return out;
  };

  function startLoops() {
    stopLoops();
    refresh(); syncTimer = setInterval(syncProgress, 20000);
    pollTimer = setInterval(() => { if (view.name === 'chat') loadChat(); refresh(); }, 4000);
  }
  function stopLoops() { clearInterval(pollTimer); clearInterval(syncTimer); pollTimer = syncTimer = null; }
  // Save when the app goes to the background (leaving the app) and refresh when it comes back.
  document.addEventListener('visibilitychange', () => { if (!session) return; if (document.hidden) syncProgress(); else { syncProgress(); refresh(); } });

  function boot() {
    setMode('signup');
    if (session) { showGate(false); startLoops(); } else showGate(true);
    const remove = ['cls-fab'];
    remove.forEach((id) => { const el = $(id); if (el) el.remove(); });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 200)) : setTimeout(boot, 200);
})();
