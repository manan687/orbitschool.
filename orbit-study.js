/* OrbitSchool Study Layer — Study Board (quizzes, mistakes, cards, progress) + Course Library (JKBOSE / CBSE).
   Additive: wraps renderCurrentView for the 'studyboard' and 'courses' tabs only. */
(function () {
  'use strict';
  const KEY = 'orbit_study_v1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const S = () => (typeof state !== 'undefined' ? state : null);
  const toast = (m, i) => { if (typeof showToast === 'function') showToast(m, i); };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  let data = { best: {}, history: [], claimed: [], board: 'jkbose', cls: 7 };
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  const ui = { sub: 'overview', quiz: null, subj: null };

  const bank = () => window.OrbitBank || {};
  const keys = () => Object.keys(bank());
  const label = k => { const p = k.split('|'); return { cls: p[0], subj: p[1], ch: p[2] }; };

  /* ---------------- QUIZ ENGINE ---------------- */
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function start(i) {
    const k = keys()[i]; if (!k) return;
    ui.quiz = { key: k, qs: shuffle(bank()[k]), i: 0, score: 0, picked: null, done: false, reward: '' };
    ui.sub = 'quiz';
    if (S().activeTab !== 'studyboard') return window.switchTab('studyboard');
    renderCurrentView();
  }
  function logMistake(q, k) {
    const s = S(); if (!s || !Array.isArray(s.mistakes)) return;
    if (s.mistakes.some(m => m.question === q.question && !m.cleared)) return;
    const l = label(k);
    s.mistakes.unshift({ id: 'm_' + Date.now() + Math.random().toString(36).slice(2, 5), subject: `${l.subj} · ${l.ch}`, question: q.question, fix: `${q.explanation} (Answer: ${q.options[q.answerIndex]})`, cleared: false });
    try { safeSave(STORAGE_KEYS.mistakes, s.mistakes); } catch (e) {}
  }
  function pick(n) {
    const z = ui.quiz; if (!z || z.picked != null || z.done) return;
    const q = z.qs[z.i]; z.picked = n;
    if (n === q.answerIndex) z.score++; else logMistake(q, z.key);
    if (typeof playSfx === 'function') { try { playSfx(n === q.answerIndex ? 'coin' : 'click'); } catch (e) {} }
    renderCurrentView();
  }
  function next() {
    const z = ui.quiz; if (!z || z.picked == null) return;
    z.i++; z.picked = null;
    if (z.i >= z.qs.length) finish(z);
    renderCurrentView();
  }
  function finish(z) {
    z.done = true;
    const pct = Math.round(z.score / z.qs.length * 100), s = S();
    data.best[z.key] = Math.max(data.best[z.key] || 0, pct);
    data.history.unshift({ key: z.key, pct, at: today() }); data.history = data.history.slice(0, 30);
    if (s && s.stats) { s.stats.quizzesDone = (s.stats.quizzesDone || 0) + 1; try { safeSave(STORAGE_KEYS.stats, s.stats); } catch (e) {} }
    const claim = today() + '|' + z.key;
    if (pct >= 60 && !data.claimed.includes(claim)) {
      data.claimed.push(claim); data.claimed = data.claimed.slice(-80);
      z.reward = `+${20 + z.score * 5} XP · +${10 + z.score * 2} 🪙`;
      persist();
      if (typeof addRewards === 'function') addRewards(20 + z.score * 5, 10 + z.score * 2, 'Chapter quiz');
    } else { z.reward = pct >= 60 ? 'Reward already claimed for this chapter today — practice is still great!' : 'Score 60% or more to earn rewards. Review the explanations and try again!'; persist(); }
    try { if (typeof unlockBadge === 'function' && s.stats.quizzesDone >= 1) unlockBadge('b_quiz_1'); if (typeof unlockBadge === 'function' && s.stats.quizzesDone >= 10) unlockBadge('b_quiz_10'); } catch (e) {}
  }

  /* ---------------- STUDY BOARD ---------------- */
  const TABS = [['overview', '🏠 Overview'], ['quiz', '❓ Quiz'], ['mistakes', '🔍 Mistakes'], ['cards', '🃏 Cards'], ['progress', '📈 Progress']];
  const stat = (n, l) => `<div class="on-stat"><b>${n}</b><span>${l}</span></div>`;

  function tabOverview() {
    const s = S(), due = typeof getDueCardsCount === 'function' ? getDueCardsCount() : 0, st = s.stats || {};
    const open = (s.tasks || []).filter(t => !t.done).length, mis = (s.mistakes || []).filter(m => !m.cleared).length;
    const weak = keys().map((k, i) => ({ k, i, b: data.best[k] })).filter(x => x.b == null || x.b < 70).slice(0, 4);
    return `<div class="on-row">${stat(due, 'CARDS DUE')}${stat(open, 'OPEN TASKS')}${stat(mis, 'MISTAKES TO FIX')}${stat(st.quizzesDone || 0, 'QUIZZES DONE')}</div>
      <section class="on-panel" style="margin-top:14px"><h2>🎯 Practice next</h2>${weak.length ? `<div class="sb-list">${weak.map(x => `<button class="sb-item" onclick="OrbitStudy.start(${x.i})"><b>${esc(label(x.k).ch)}</b><small>Class ${esc(label(x.k).cls)} · ${esc(label(x.k).subj)} · ${x.b == null ? 'not tried yet' : 'best ' + x.b + '%'}</small></button>`).join('')}</div>` : '<p class="on-muted">Every chapter is at 70%+. Brilliant work! 🌟</p>'}</section>
      <section class="on-panel" style="margin-top:12px"><h2>⚡ Quick actions</h2><div class="on-row"><button class="on-btn" onclick="OrbitStudy.sub('quiz')">Start a quiz</button><button class="on-btn soft" onclick="switchTab('flashcards')">Review ${due} cards</button><button class="on-btn soft" onclick="switchTab('planner')">Open planner</button><button class="on-btn soft" onclick="switchTab('courses')">Course Library</button></div></section>`;
  }
  function tabQuiz() {
    const z = ui.quiz;
    if (!z) {
      const groups = {}; keys().forEach((k, i) => { const l = label(k); (groups[l.subj] = groups[l.subj] || []).push([k, i]); });
      return `<section class="on-panel"><h2>❓ Choose a chapter quiz</h2><p class="on-muted">Wrong answers go straight into your Mistake Book so you can fix them later.</p>${Object.keys(groups).map(g => `<h3 class="sb-h">${esc(g)}</h3><div class="sb-list">${groups[g].map(([k, i]) => `<button class="sb-item" onclick="OrbitStudy.start(${i})"><b>${esc(label(k).ch)}</b><small>Class ${esc(label(k).cls)} · ${bank()[k].length} questions${data.best[k] != null ? ' · best ' + data.best[k] + '%' : ''}</small></button>`).join('')}</div>`).join('') || '<p class="on-muted">No question packs loaded.</p>'}</section>`;
    }
    const l = label(z.key);
    if (z.done) {
      const pct = Math.round(z.score / z.qs.length * 100);
      return `<section class="on-panel sb-result"><div class="sb-big">${pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div><h2>${z.score} / ${z.qs.length} correct (${pct}%)</h2><p class="on-muted">${esc(l.ch)}</p><p class="sb-reward">${esc(z.reward)}</p><div class="on-row" style="justify-content:center"><button class="on-btn" onclick="OrbitStudy.again()">Try again</button><button class="on-btn soft" onclick="OrbitStudy.sub('mistakes')">See mistakes</button><button class="on-btn soft" onclick="OrbitStudy.quit()">All quizzes</button></div></section>`;
    }
    const q = z.qs[z.i];
    return `<section class="on-panel"><div class="sb-top"><small>${esc(l.subj)} · ${esc(l.ch)}</small><button class="sb-x" onclick="OrbitStudy.quit()">✕ Quit</button></div><div class="sb-bar"><i style="width:${z.i / z.qs.length * 100}%"></i></div><h2 class="sb-q">Q${z.i + 1}. ${esc(q.question)}</h2><div class="sb-opts">${q.options.map((o, n) => `<button class="sb-opt${z.picked != null ? (n === q.answerIndex ? ' ok' : n === z.picked ? ' bad' : '') : ''}" ${z.picked != null ? 'disabled' : ''} onclick="OrbitStudy.pick(${n})"><span>${'ABCD'[n]}</span>${esc(o)}</button>`).join('')}</div>${z.picked != null ? `<div class="sb-expl ${z.picked === q.answerIndex ? 'ok' : 'bad'}"><b>${z.picked === q.answerIndex ? '✅ Correct!' : '❌ Not quite — saved to Mistake Book'}</b><p>${esc(q.explanation)}</p><button class="on-btn" onclick="OrbitStudy.next()">${z.i + 1 >= z.qs.length ? 'See result' : 'Next question →'}</button></div>` : ''}</section>`;
  }
  function tabMistakes() {
    const ms = S().mistakes || [], open = ms.filter(m => !m.cleared).length;
    return `<section class="on-panel"><h2>🔍 Mistake Book <small class="on-muted">(${open} to fix)</small></h2><div class="sb-list">${ms.map((m, i) => `<div class="sb-m${m.cleared ? ' done' : ''}"><div><b>${esc(m.question)}</b><small>${esc(m.subject)}</small><p>💡 ${esc(m.fix)}</p></div>${m.cleared ? '<span>✅</span>' : `<button class="on-btn soft" onclick="clearMistake(${i})">Got it +XP</button>`}</div>`).join('') || '<p class="on-muted">No mistakes yet. Take a quiz — wrong answers land here automatically.</p>'}</div></section>
      <section class="on-panel" style="margin-top:12px"><h3 class="sb-h">＋ Add your own</h3><form class="sb-form" onsubmit="addMistakeEntry(event)"><input id="m-subj" placeholder="Subject" required><input id="m-q" placeholder="What went wrong?" required><input id="m-fix" placeholder="Correct method / answer" required><button class="on-btn">Save mistake</button></form></section>`;
  }
  function tabCards() {
    const due = typeof getDueCardsCount === 'function' ? getDueCardsCount() : 0;
    return `<section class="on-panel"><h2>🃏 Flashcards</h2><div class="on-row">${stat(due, 'DUE NOW')}${stat((S().stats || {}).cardsReviewed || 0, 'REVIEWED')}</div><div class="on-row" style="margin-top:12px"><button class="on-btn" onclick="switchTab('flashcards')">${due ? 'Review ' + due + ' due cards' : 'Open flashcards'}</button><button class="on-btn soft" onclick="switchTab('planner')">Schedule revision</button></div></section>`;
  }
  function tabProgress() {
    const st = S().stats || {}, rows = keys().filter(k => data.best[k] != null);
    return `<div class="on-row">${stat(st.quizzesDone || 0, 'QUIZZES')}${stat(st.mistakesCleared || 0, 'MISTAKES FIXED')}${stat(st.bossesDefeated || 0, 'BOSSES BEATEN')}${stat(st.arcadePlayed || 0, 'GAMES PLAYED')}</div>
      <section class="on-panel" style="margin-top:14px"><h2>📈 Best score per chapter</h2>${rows.map(k => `<div class="sb-prog"><span>${esc(label(k).ch)}</span><div class="sb-bar"><i style="width:${data.best[k]}%"></i></div><b>${data.best[k]}%</b></div>`).join('') || '<p class="on-muted">Finish a quiz to see your progress here.</p>'}</section>
      <section class="on-panel" style="margin-top:12px"><h2>🕘 Recent attempts</h2>${data.history.slice(0, 6).map(h => `<div class="sb-prog"><span>${esc(label(h.key).ch)}</span><small>${esc(h.at)}</small><b>${h.pct}%</b></div>`).join('') || '<p class="on-muted">Nothing yet.</p>'}</section>`;
  }
  function renderBoard() {
    const body = { overview: tabOverview, quiz: tabQuiz, mistakes: tabMistakes, cards: tabCards, progress: tabProgress }[ui.sub]();
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">QUIZZES • MISTAKES • CARDS • PROGRESS</div><h1>Study Board 📊</h1><p>Everything you need to revise, in one place. Records are saved on this device.</p></section><div class="sb-tabs">${TABS.map(([id, l]) => `<button class="${ui.sub === id ? 'on' : ''}" onclick="OrbitStudy.sub('${id}')">${l}</button>`).join('')}</div><div style="margin-top:12px">${body}</div></div>`;
  }

  /* ---------------- COURSE LIBRARY ---------------- */
  const BOARDS = {
    jkbose: { name: 'JKBOSE', full: 'J&K Board of School Education', emoji: '🏔️', main: true },
    cbse: { name: 'CBSE', full: 'Central Board of Secondary Education', emoji: '🏛️', main: true }
  };
  function packsFor(cls, subj) {
    const want = subj === 'Social Science' ? ['History', 'Geography'] : [subj];
    return keys().map((k, i) => ({ k, i })).filter(x => { const l = label(x.k); return l.cls === String(cls) && want.includes(l.subj); });
  }
  const shelf = (ic, t, d, tab) => `<button class="cl-shelf" onclick="switchTab('${tab}')"><span>${ic}</span><b>${t}</b><small>${d}</small></button>`;
  const base = x => String(x).replace(/\s*\(.*\)\s*$/, '');
  function renderLibrary() {
    const SY = window.OrbitSyllabus, b = BOARDS[data.board] ? data.board : 'jkbose', c = Number(data.cls) || 7, info = SY.info(b, c), subs = info.subjects;
    const sel = ui.subj && subs.includes(ui.subj) ? ui.subj : null, packs = sel ? packsFor(c, base(sel)) : [], ch = sel ? SY.chapters(b, c, base(sel)) : null;
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">SYLLABUS • CLASS 1 TO 12 • JKBOSE & CBSE</div><h1>Course Library 📚</h1><p>Choose your board and class to read what you study, then jump into practice. Checked against 2026-27 notices.</p></section>
      <div class="cl-boards">${Object.entries(BOARDS).map(([id, x]) => `<button class="cl-board${b === id ? ' on' : ''}" onclick="OrbitStudy.board('${id}')"><span>${x.emoji}</span><div><b>${x.name}</b><small>${x.full}</small></div>${id === 'jkbose' ? '<em>MAIN</em>' : ''}</button>`).join('')}</div>
      <div class="cl-cls">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => `<button class="${c === n ? 'on' : ''}" onclick="OrbitStudy.cls(${n})">Class ${n}</button>`).join('')}</div>
      <section class="on-panel" style="margin-top:12px"><h2>${BOARDS[b].name} · Class ${c}</h2><p class="on-muted">${esc(info.stage)}</p><ul class="sy-notes">${info.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul><div class="on-row">${info.links.map(l => `<a class="on-btn soft" href="${l[1]}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join('')}</div></section>
      <section class="on-panel" style="margin-top:12px"><h2>Subjects</h2><div class="cl-subs">${subs.map(s => { const n = packsFor(c, base(s)).length, has = !!SY.chapters(b, c, base(s)); return `<button class="cl-sub${sel === s ? ' on' : ''}" onclick="OrbitStudy.subj('${s.replace(/'/g, "\\'")}')"><b>${esc(s)}</b><small>${has ? 'Chapters listed' : n ? n + ' practice pack' + (n > 1 ? 's' : '') : 'Tap for details'}</small></button>`; }).join('')}</div>
      ${sel ? `<h3 class="sb-h">${esc(sel)}</h3>${ch ? `<ol class="sy-ch">${ch.list.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p class="on-muted">${esc(ch.note)}</p>` : '<p class="on-muted">The chapter-by-chapter list for this subject isn\'t built into Orbit yet. Open the official syllabus above for the full, current list.</p>'}${packs.length ? `<h3 class="sb-h">Practice quizzes</h3><div class="sb-list">${packs.map(p => `<button class="sb-item" onclick="OrbitStudy.start(${p.i})"><b>${esc(label(p.k).ch)}</b><small>${bank()[p.k].length} questions${data.best[p.k] != null ? ' · best ' + data.best[p.k] + '%' : ''} · Start quiz →</small></button>`).join('')}</div>` : `<div class="on-row" style="margin-top:8px"><button class="on-btn" onclick="switchTab('boss')">Boss Levels</button><button class="on-btn soft" onclick="switchTab('orbitchat')">Ask Orbiter</button></div>`}` : ''}
      <p class="on-muted" style="margin-top:10px">Subject lists are a guide and can vary by school and stream. The official syllabus always decides. Built-in practice quizzes cover Class 7 only.</p></section>
      <h3 class="sb-h" style="margin-top:16px">More in your library</h3><div class="cl-shelves">${shelf('🦉', 'Orbit Lingo', 'Language courses', 'lingua')}${shelf('🃏', 'Flashcards', 'Spaced revision', 'flashcards')}${shelf('🐉', 'Boss Levels', 'Chapter battles', 'boss')}${shelf('📊', 'Study Board', 'Quizzes & mistakes', 'studyboard')}${shelf('🏫', 'SDES GRAM', 'School magazine', 'springdales')}${shelf('🤖', 'Orbiter AI', 'Ask anything', 'orbitchat')}</div></div>`;
  }

  window.OrbitStudy = {
    start, pick, next,
    sub(id) { ui.sub = id; if (id !== 'quiz') ui.quiz = ui.quiz && ui.quiz.done ? null : ui.quiz; renderCurrentView(); },
    quit() { ui.quiz = null; ui.sub = 'quiz'; renderCurrentView(); },
    again() { const i = keys().indexOf(ui.quiz.key); ui.quiz = null; start(i); },
    board(id) { data.board = id; ui.subj = null; persist(); renderCurrentView(); },
    cls(n) { data.cls = n; ui.subj = null; persist(); renderCurrentView(); },
    subj(s) { ui.subj = ui.subj === s ? null : s; renderCurrentView(); },
    getInfo: () => ({ packs: keys().length, best: data.best })
  };

  const orig = window.renderCurrentView;
  window.renderCurrentView = function () {
    const out = orig.apply(this, arguments), s = S(), main = $('main-view');
    if (!s || !main || (s.activeTab !== 'studyboard' && s.activeTab !== 'courses')) return out;
    try { main.innerHTML = s.activeTab === 'studyboard' ? renderBoard() : renderLibrary(); } catch (e) { console.warn('Orbit study view failed:', e); }
    return out;
  };
})();
