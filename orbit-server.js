#!/usr/bin/env node
/* OrbitSchool server — username + password accounts, progress that follows the account to any device,
   friend requests, friend chat and friend duels. Zero dependencies (Node 18+).
   Run:  node orbit-server.js            (PORT=8080 by default)
   Serve over HTTPS in production so passwords travel encrypted. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, 'orbit-data.json');
const MAX_BODY = 3000000;
const ONLINE_MS = 60 * 1000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8' };
const BLOCKED_FILES = new Set(['orbit-data.json', 'orbit-data.json.tmp', 'orbit-server.js', 'package.json', '.env', '.env.example']);

/* ---------- storage (atomic writes) ---------- */
let db = { users: {}, sessions: {}, requests: [], chats: {}, duels: {}, groups: {}, groupChats: {}, seq: 1 };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch (e) {}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(db), (err) => { if (!err) fs.rename(tmp, DATA_FILE, () => {}); });
  }, 300);
}

/* ---------- helpers ---------- */
const lower = (s) => String(s || '').trim().toLowerCase();
const DAY_MS = 24 * 60 * 60 * 1000;
const safeJSON = (s) => { try { return JSON.parse(s || 'null'); } catch (e) { return null; } };
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const nowMs = () => Date.now();
const newId = (n = 10) => crypto.randomBytes(n).toString('base64url').slice(0, n);
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString('hex'); }
function checkPassword(pw, user) {
  const h = Buffer.from(hashPassword(pw, user.salt), 'hex'), want = Buffer.from(user.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
class HttpError extends Error { constructor(code, msg) { super(msg); this.status = code; } }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, data = '';
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, 'That is too much data to send at once.')); req.destroy(); } else data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new HttpError(400, 'Bad request.')); } });
    req.on('error', reject);
  });
}
function authUser(req) {
  const m = /^Bearer ([\w-]{20,})$/.exec(req.headers.authorization || '');
  const lname = m && db.sessions[m[1]];
  const u = lname && db.users[lname];
  if (!u) throw new HttpError(401, 'Please sign in again.');
  u.lastSeen = nowMs();
  return { lname, user: u, token: m[1] };
}
const online = (u) => nowMs() - (u.lastSeen || 0) < ONLINE_MS;
const convKey = (a, b) => [a, b].sort().join('|');

/* ---------- duels: quick maths questions made on the server so both players get the same ones ---------- */
function makeQuestions(n = 5) {
  const out = [], seen = new Set();
  while (out.length < n) {
    const kind = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    let a, b, ans;
    if (kind === '×') { a = 2 + Math.floor(Math.random() * 11); b = 2 + Math.floor(Math.random() * 11); ans = a * b; }
    else if (kind === '+') { a = 10 + Math.floor(Math.random() * 90); b = 10 + Math.floor(Math.random() * 90); ans = a + b; }
    else { a = 20 + Math.floor(Math.random() * 80); b = 5 + Math.floor(Math.random() * (a - 10)); ans = a - b; }
    const text = `${a} ${kind} ${b} = ?`;
    if (seen.has(text)) continue;
    seen.add(text);
    const opts = new Set([ans]);
    while (opts.size < 4) { const d = ans + (Math.floor(Math.random() * 13) - 6) || ans + 7; if (d >= 0) opts.add(d); }
    const shuffled = [...opts].sort(() => Math.random() - 0.5);
    out.push({ text, opts: shuffled, ans: shuffled.indexOf(ans) });
  }
  return out;
}
function duelView(d, lname) {
  const mine = d.a === lname ? 'a' : 'b', theirs = mine === 'a' ? 'b' : 'a';
  const myAns = d.answers[mine] || [], oppAns = d.answers[theirs] || [];
  const finished = d.status === 'finished';
  const score = (arr) => arr.filter((x) => x.correct).length;
  const questions = d.status === 'active' && myAns.length < d.questions.length
    ? d.questions.slice(myAns.length).map((q, i) => ({ index: myAns.length + i, text: q.text, opts: q.opts }))
    : [];
  return {
    id: d.id, opponent: d[theirs + 'Name'], status: d.status, challengedByMe: d.a === lname,
    myAnswered: myAns.length, total: d.questions.length, oppAnswered: oppAns.length,
    questions,
    myScore: finished || d.status === 'active' ? score(myAns) : null,
    oppScore: finished ? score(oppAns) : null,
    winner: finished ? (d.winner === 'draw' ? 'draw' : d.winner === lname ? 'me' : 'them') : null,
  };
}
function finishIfDone(d) {
  if (d.answers.a.length === d.questions.length && d.answers.b.length === d.questions.length && d.status !== 'finished') {
    const sa = d.answers.a.filter((x) => x.correct).length, sb = d.answers.b.filter((x) => x.correct).length;
    d.status = 'finished'; d.winner = sa === sb ? 'draw' : sa > sb ? d.a : d.b; d.finishedAt = nowMs();
  }
}

/* ---------- routes ---------- */
async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  const failsOf = (l) => (db.users[l] && db.users[l].fails || []).filter((t) => nowMs() - t < 15 * 60 * 1000);

  if (m === 'POST' && p === '/api/auth/register') {
    const b = await readBody(req);
    const username = clean(b.username, 20), pw = String(b.password || '');
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) throw new HttpError(400, 'Username: 3–20 letters, numbers or underscore.');
    if (pw.length < 6 || pw.length > 100) throw new HttpError(400, 'Password must be at least 6 characters.');
    const l = lower(username);
    if (db.users[l]) throw new HttpError(409, 'That username is taken. Try another one.');
    const salt = crypto.randomBytes(16).toString('hex');
    db.users[l] = { username, salt, hash: hashPassword(pw, salt), createdAt: nowMs(), progress: {}, lastSeen: nowMs(), friends: [], fails: [] };
    const token = crypto.randomBytes(32).toString('base64url');
    db.sessions[token] = l; save();
    return json(res, 200, { token, username, progress: {} });
  }
  if (m === 'POST' && p === '/api/auth/login') {
    const b = await readBody(req);
    const l = lower(b.username), u = db.users[l];
    if (u && failsOf(l).length >= 8) throw new HttpError(429, 'Too many wrong passwords. Wait 15 minutes and try again.');
    if (!u || !checkPassword(String(b.password || ''), u)) {
      if (u) { u.fails = failsOf(l).concat([nowMs()]); save(); }
      throw new HttpError(401, 'Wrong username or password.');
    }
    u.fails = []; u.lastSeen = nowMs();
    const token = crypto.randomBytes(32).toString('base64url');
    db.sessions[token] = l; save();
    return json(res, 200, { token, username: u.username, progress: u.progress || {} });
  }
  if (m === 'POST' && p === '/api/auth/logout') {
    const m2 = /^Bearer ([\w-]{20,})$/.exec(req.headers.authorization || '');
    if (m2) { delete db.sessions[m2[1]]; save(); }
    return json(res, 200, { ok: true });
  }
  if (m === 'PUT' && p === '/api/progress') {
    const { user } = authUser(req); const b = await readBody(req);
    const clean2 = {};
    for (const [k, v] of Object.entries(b.progress || {})) {
      if (typeof k === 'string' && k.startsWith('orbit') && k !== 'orbit_session_v3' && typeof v === 'string' && v.length < 200000) clean2[k.slice(0, 80)] = v;
    }
    user.progress = clean2;
    // daily performance: each player's day starts at their first sync and resets 24 hours later
    const xpNow = Number(clean2.orbit_xp) || 0, t = nowMs();
    if (!user.day || t - user.day.start >= DAY_MS) user.day = { start: t, xpStart: xpNow };
    if (xpNow < user.day.xpStart) user.day.xpStart = xpNow;
    user.profile = { level: Math.floor(xpNow / 500) + 1, xp: xpNow, coins: Number(clean2.orbit_coins) || 0, avatar: safeJSON(clean2.orbit_avatar), badges: (safeJSON(clean2.orbit_badges) || []).length };
    save();
    return json(res, 200, { ok: true, keys: Object.keys(clean2).length });
  }

  /* friends */
  if (m === 'GET' && p === '/api/social') {
    const { lname, user } = authUser(req);
    const friends = user.friends.map((f) => ({ username: db.users[lower(f)] ? db.users[lower(f)].username : f, online: db.users[lower(f)] ? online(db.users[lower(f)]) : false }));
    const incoming = db.requests.filter((r) => r.to === lname && r.status === 'pending').map((r) => ({ id: r.id, from: db.users[r.from].username }));
    const outgoing = db.requests.filter((r) => r.from === lname && r.status === 'pending').map((r) => ({ id: r.id, to: db.users[r.to].username }));
    const duels = Object.values(db.duels).filter((d) => d.a === lname || d.b === lname).sort((x, y) => y.createdAt - x.createdAt).slice(0, 30).map((d) => duelView(d, lname));
    return json(res, 200, { me: user.username, friends, incoming, outgoing, duels });
  }
  if (m === 'POST' && p === '/api/friends/request') {
    const { lname, user } = authUser(req); const b = await readBody(req);
    const to = lower(b.to);
    if (!db.users[to]) throw new HttpError(404, 'No user with that username.');
    if (to === lname) throw new HttpError(400, 'You cannot add yourself.');
    if (user.friends.map(lower).includes(to)) throw new HttpError(409, 'You are already friends.');
    if (db.requests.some((r) => r.status === 'pending' && ((r.from === lname && r.to === to) || (r.from === to && r.to === lname)))) throw new HttpError(409, 'A request is already waiting between you two.');
    db.requests.push({ id: newId(), from: lname, to, status: 'pending', at: nowMs() }); save();
    return json(res, 200, { ok: true });
  }
  if (m === 'POST' && p === '/api/friends/respond') {
    const { lname, user } = authUser(req); const b = await readBody(req);
    const r = db.requests.find((x) => x.id === String(b.id || '') && x.to === lname && x.status === 'pending');
    if (!r) throw new HttpError(404, 'That request is no longer there.');
    if (b.accept) {
      r.status = 'accepted';
      const other = db.users[r.from];
      if (!user.friends.map(lower).includes(r.from)) user.friends.push(r.from);
      if (!other.friends.map(lower).includes(lname)) other.friends.push(lname);
    } else r.status = 'declined';
    save();
    return json(res, 200, { ok: true });
  }

  /* chat (friends only) */
  if (m === 'GET' && p === '/api/chat') {
    const { lname, user } = authUser(req);
    const with_ = lower(url.searchParams.get('with'));
    if (!user.friends.map(lower).includes(with_)) throw new HttpError(403, 'Chat is for friends only.');
    const msgs = (db.chats[convKey(lname, with_)] || []).slice(-100);
    return json(res, 200, { messages: msgs.map((x) => ({ id: x.id, mine: x.from === lname, text: x.text, at: x.at })) });
  }
  if (m === 'POST' && p === '/api/chat') {
    const { lname, user } = authUser(req); const b = await readBody(req);
    const to = lower(b.to), text = clean(b.text, 500);
    if (!text) throw new HttpError(400, 'Write a message first.');
    if (!user.friends.map(lower).includes(to)) throw new HttpError(403, 'Chat is for friends only.');
    const key = convKey(lname, to);
    (db.chats[key] = db.chats[key] || []).push({ id: newId(), from: lname, text, at: nowMs() });
    db.chats[key] = db.chats[key].slice(-200); save();
    return json(res, 200, { ok: true });
  }

  /* duels (friends only, played when each is online; both answer 5 questions) */
  if (m === 'POST' && p === '/api/duel/challenge') {
    const { lname, user } = authUser(req); const b = await readBody(req);
    const to = lower(b.to);
    if (!user.friends.map(lower).includes(to)) throw new HttpError(403, 'You can only duel friends.');
    if (Object.values(db.duels).some((d) => d.status !== 'finished' && ((d.a === lname && d.b === to) || (d.a === to && d.b === lname)))) throw new HttpError(409, 'A duel with this friend is already open.');
    const id = newId(12);
    db.duels[id] = { id, a: lname, b: to, aName: user.username, bName: db.users[to].username, status: 'pending', questions: makeQuestions(5), answers: { a: [], b: [] }, createdAt: nowMs(), winner: null };
    save();
    return json(res, 200, { ok: true, id });
  }
  if (m === 'POST' && p === '/api/duel/accept') {
    const { lname } = authUser(req); const b = await readBody(req);
    const d = db.duels[String(b.id || '')];
    if (!d || d.b !== lname || d.status !== 'pending') throw new HttpError(404, 'That duel is no longer there.');
    if (b.accept) d.status = 'active'; else { d.status = 'finished'; d.winner = 'draw'; d.declined = true; }
    save();
    return json(res, 200, { ok: true });
  }
  if (m === 'POST' && p === '/api/duel/answer') {
    const { lname } = authUser(req); const b = await readBody(req);
    const d = db.duels[String(b.id || '')];
    if (!d || (d.a !== lname && d.b !== lname) || d.status !== 'active') throw new HttpError(404, 'That duel is not active.');
    const side = d.a === lname ? 'a' : 'b', arr = d.answers[side];
    if (arr.length >= d.questions.length) return json(res, 200, { ok: true });
    const q = d.questions[arr.length], choice = Number(b.choice);
    arr.push({ correct: choice === q.ans, choice });
    finishIfDone(d); save();
    return json(res, 200, { ok: true, correct: choice === q.ans });
  }
  /* study groups: name + code, members share their study files */
  const GROUP_KEYS = ['orbit_flashcard_decks', 'orbit_mistake_book', 'orbit_planner_tasks', 'orbit_exam_calendar'];
  if (m === 'POST' && p === '/api/groups/create') {
    const { lname } = authUser(req); const b = await readBody(req);
    const name = clean(b.name, 30);
    if (name.length < 2) throw new HttpError(400, 'Group name needs at least 2 characters.');
    let code; do { code = newId(6).replace(/[-_]/g, 'X').toUpperCase(); } while (db.groups[code]);
    db.groups[code] = { code, name, owner: lname, members: [lname], files: {}, createdAt: nowMs() }; save();
    return json(res, 200, { code, name });
  }
  if (m === 'POST' && p === '/api/groups/invite') {
    const { lname } = authUser(req); const b = await readBody(req);
    const g = db.groups[clean(b.code, 8).toUpperCase()];
    if (!g || !g.members.includes(lname)) throw new HttpError(404, 'Group not found.');
    const to = lower(b.to);
    if (!db.users[to]) throw new HttpError(404, 'No user with that username.');
    if (g.members.includes(to)) throw new HttpError(409, 'That person is already in the group.');
    g.invites = g.invites || [];
    if (!g.invites.includes(to)) g.invites.push(to);
    save();
    return json(res, 200, { ok: true, username: db.users[to].username });
  }
  if (m === 'POST' && (p === '/api/groups/accept' || p === '/api/groups/decline')) {
    const { lname } = authUser(req); const b = await readBody(req);
    const g = db.groups[clean(b.code, 8).toUpperCase()];
    if (!g || !(g.invites || []).includes(lname)) throw new HttpError(404, 'That invitation is no longer there.');
    g.invites = g.invites.filter((u) => u !== lname);
    if (p.endsWith('/accept')) {
      if (g.members.length >= 30) throw new HttpError(409, 'This group is full.');
      if (!g.members.includes(lname)) g.members.push(lname);
    }
    save();
    return json(res, 200, { ok: true, code: g.code, name: g.name });
  }
  if (m === 'POST' && p === '/api/groups/join') {
    const { lname } = authUser(req); const b = await readBody(req);
    const code = clean(b.code, 8).toUpperCase(), name = clean(b.name, 30).toLowerCase();
    const g = db.groups[code];
    if (!g || g.name.toLowerCase() !== name) throw new HttpError(404, 'No group matches that name and code.');
    if (!g.members.includes(lname)) {
      if (g.members.length >= 30) throw new HttpError(409, 'This group is full.');
      g.members.push(lname); save();
    }
    return json(res, 200, { code, name: g.name });
  }
  if (m === 'GET' && p === '/api/groups') {
    const { lname } = authUser(req);
    const list = Object.values(db.groups).filter((g) => g.members.includes(lname)).map((g) => ({
      code: g.code, name: g.name, owner: db.users[g.owner] ? db.users[g.owner].username : g.owner,
      mine: g.owner === lname,
      members: g.members.map((u) => {
        const acc = db.users[u];
        return { username: acc ? acc.username : u, lname: u, online: acc ? online(acc) : false, hasFiles: !!g.files[u], me: u === lname };
      })
    }));
    const invites = Object.values(db.groups).filter((g) => (g.invites || []).includes(lname)).map((g) => ({ code: g.code, name: g.name, from: db.users[g.owner] ? db.users[g.owner].username : g.owner }));
    return json(res, 200, { groups: list, invites });
  }
  if (m === 'POST' && p === '/api/groups/files') {
    const { lname } = authUser(req); const b = await readBody(req);
    const g = db.groups[clean(b.code, 8).toUpperCase()];
    if (!g || !g.members.includes(lname)) throw new HttpError(404, 'Group not found.');
    const data = {};
    for (const k of GROUP_KEYS) if (typeof (b.files || {})[k] === 'string' && b.files[k].length < 1000000) data[k] = b.files[k];
    g.files[lname] = { updatedAt: nowMs(), data }; save();
    return json(res, 200, { ok: true });
  }
  if (m === 'GET' && p === '/api/groups/files') {
    const { lname } = authUser(req);
    const g = db.groups[clean(url.searchParams.get('code'), 8).toUpperCase()];
    if (!g || !g.members.includes(lname)) throw new HttpError(404, 'Group not found.');
    const who = lower(url.searchParams.get('user'));
    if (!g.members.includes(who)) throw new HttpError(404, 'That member is not in this group.');
    const f = g.files[who];
    return json(res, 200, { username: db.users[who] ? db.users[who].username : who, updatedAt: f ? f.updatedAt : null, files: f ? f.data : null });
  }
  if (m === 'POST' && p === '/api/groups/leave') {
    const { lname } = authUser(req); const b = await readBody(req);
    const g = db.groups[clean(b.code, 8).toUpperCase()];
    if (!g || !g.members.includes(lname)) throw new HttpError(404, 'Group not found.');
    g.members = g.members.filter((u) => u !== lname); delete g.files[lname];
    if (!g.members.length) delete db.groups[g.code];
    else if (g.owner === lname) g.owner = g.members[0];
    save();
    return json(res, 200, { ok: true });
  }
  if (m === 'GET' && p === '/api/groups/chat') {
    const { lname } = authUser(req);
    const g = db.groups[clean(url.searchParams.get('code'), 8).toUpperCase()];
    if (!g || !g.members.includes(lname)) throw new HttpError(404, 'Group not found.');
    const msgs = (db.groupChats[g.code] || []).slice(-100).map((x) => ({ id: x.id, mine: x.from === lname, from: db.users[x.from] ? db.users[x.from].username : x.from, text: x.text, at: x.at }));
    return json(res, 200, { messages: msgs });
  }
  if (m === 'POST' && p === '/api/groups/chat') {
    const { lname } = authUser(req); const b = await readBody(req);
    const g = db.groups[clean(b.code, 8).toUpperCase()];
    if (!g || !g.members.includes(lname)) throw new HttpError(404, 'Group not found.');
    const text = clean(b.text, 500);
    if (!text) throw new HttpError(400, 'Write a message first.');
    (db.groupChats[g.code] = db.groupChats[g.code] || []).push({ id: newId(), from: lname, text, at: nowMs() });
    db.groupChats[g.code] = db.groupChats[g.code].slice(-200); save();
    return json(res, 200, { ok: true });
  }
  if (m === 'GET' && p === '/api/leaderboard') {
    authUser(req);
    const rows = Object.values(db.users).map((u) => {
      const pr = u.profile || {}, d = u.day || { start: 0, xpStart: 0 };
      const expired = !d.start || nowMs() - d.start >= DAY_MS;
      return {
        username: u.username, level: pr.level || 1, xp: pr.xp || 0, coins: pr.coins || 0, badges: pr.badges || 0,
        avatar: pr.avatar || null, online: online(u),
        xpToday: expired ? 0 : Math.max(0, (pr.xp || 0) - (d.xpStart || 0)),
        resetsAt: expired ? null : d.start + DAY_MS
      };
    }).sort((a, b) => b.xpToday - a.xpToday || b.xp - a.xp).slice(0, 100);
    return json(res, 200, { rows, serverTime: nowMs() });
  }
  throw new HttpError(404, 'Not found.');
}

/* ---------- static files ---------- */
function serveStatic(res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || BLOCKED_FILES.has(path.basename(file))) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/.netlify/functions/orbit-chat') {
      let raw = ''; for await (const c of req) { raw += c; if (raw.length > 400000) break; }
      const r = await require('./netlify/functions/orbit-chat.js').handler({ httpMethod: req.method, body: raw, headers: req.headers });
      res.writeHead(r.statusCode || 200, r.headers || { 'Content-Type': 'application/json' });
      return res.end(r.body || '');
    }
    if (url.pathname.startsWith('/api/')) {
      const out = await api(req, res, url);
      return out;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveStatic(res, url);
  } catch (e) {
    const status = e.status || 500;
    json(res, status, { error: status === 500 ? 'Something went wrong. Please try again.' : e.message });
  }
}).listen(PORT, () => console.log(`OrbitSchool running on http://localhost:${PORT}`));
