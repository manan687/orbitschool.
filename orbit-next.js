/* Orbit Next Universe — additive, local-first product layer.
   This module intentionally preserves the existing Orbit study and AI modules.
   Online accounts, server-backed rewards and real multiplayer are not implied. */
(() => {
  'use strict';

  const STORAGE = {
    metrics: 'orbit_next_metrics_v1', badges: 'orbit_next_badges_v1',
    world: 'orbit_next_world_v1', avatar: 'orbit_next_avatar_v1',
    focus: 'orbit_next_focus_v1', sessions: 'orbit_next_sessions_v1',
    scores: 'orbit_next_scores_v1'
  };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Orbit Next save failed:', e); } };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const safeNumber = (v, min, max, fallback) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; };

  function LOCATIONS_SAFE_ID(id){ return ['central','academy','math','science','words','history','geo','arcade','trophy','market','creator'].includes(id); }
  function safePalette(v){ return Math.max(0,Math.min(4,Math.floor(Number(v)||0))); }
  const rawMetrics = read(STORAGE.metrics, {});
  const metrics = rawMetrics && typeof rawMetrics === 'object' && !Array.isArray(rawMetrics) ? rawMetrics : {};
  const unlocked = new Set(Array.isArray(read(STORAGE.badges, [])) ? read(STORAGE.badges, []) : []);
  const rawWorldPrefs = read(STORAGE.world, { location:'central', visited:[], movementHint:true });
  const worldPrefs = rawWorldPrefs && typeof rawWorldPrefs === 'object' && !Array.isArray(rawWorldPrefs) ? rawWorldPrefs : { location:'central', visited:[], movementHint:true };
  if (!Array.isArray(worldPrefs.visited)) worldPrefs.visited = [];
  if (!LOCATIONS_SAFE_ID(worldPrefs.location)) worldPrefs.location = 'central';
  const rawAvatarPrefs = read(STORAGE.avatar, { palette:0, hair:0, hat:0, emote:'wave' });
  const avatarPrefs = rawAvatarPrefs && typeof rawAvatarPrefs === 'object' && !Array.isArray(rawAvatarPrefs) ? rawAvatarPrefs : { palette:0, hair:0, hat:0, emote:'wave' };
  avatarPrefs.palette = safeNumber(avatarPrefs.palette,0,9,0);
  avatarPrefs.hat = safeNumber(avatarPrefs.hat,0,7,0);
  avatarPrefs.hair = safeNumber(avatarPrefs.hair,0,5,0);
  avatarPrefs.outfit = safeNumber(avatarPrefs.outfit,0,5,0);
  avatarPrefs.accessory = safeNumber(avatarPrefs.accessory,0,5,0);
  avatarPrefs.face = safeNumber(avatarPrefs.face,0,2,0);
  const rawSavedOutfits = read('orbit_next_saved_outfits', []);
  const savedOutfits = Array.isArray(rawSavedOutfits) ? rawSavedOutfits.filter(x => x && typeof x === 'object').slice(0,12) : [];
  const sessions = Array.isArray(read(STORAGE.sessions, [])) ? read(STORAGE.sessions, []) : [];
  const rawScores = read(STORAGE.scores, {});
  const scores = rawScores && typeof rawScores === 'object' && !Array.isArray(rawScores) ? rawScores : {};

  function setMetric(key, value) { metrics[key] = Math.max(0, Number(value) || 0); write(STORAGE.metrics, metrics); checkBadges(); }
  function increment(key, amount=1) { metrics[key] = Math.max(0, Number(metrics[key]) || 0) + amount; write(STORAGE.metrics, metrics); checkBadges(); }

  // 60 launch achievements. Their progress comes from recorded Orbit actions.
  const badgeGroups = [
    {category:'Learning', icon:'📚', rarity:'Common', entries:[
      ['first-steps','First Steps','Complete your first focus session','focus_sessions',1],['curious-mind','Curious Mind','Complete five learning activities','learning_activities',5],['book-explorer','Book Explorer','Complete 25 learning activities','learning_activities',25],['knowledge-hunter','Knowledge Hunter','Complete 50 learning activities','learning_activities',50],['subject-explorer','Subject Explorer','Practise four different subjects','subjects',4],['note-keeper','Note Keeper','Download your first revision sheet','notes_saved',1],['card-collector','Card Collector','Create your first flashcard deck from AI or Notebook','decks_created',1],['recall-rookie','Recall Rookie','Review 50 flashcards','cards_reviewed',50],['revision-hero','Revision Hero','Review 250 flashcards','cards_reviewed',250],['knowledge-voyager','Knowledge Voyager','Complete 100 learning activities','learning_activities',100]
    ]},
    {category:'Mastery', icon:'🧠', rarity:'Rare', entries:[
      ['perfect-start','Perfect Start','Earn a perfect score in a study game','perfect_scores',1],['triple-crown','Triple Crown','Earn three perfect scores','perfect_scores',3],['quiz-champion','Quiz Champion','Complete ten study-game rounds','study_games',10],['boss-challenger','Boss Challenger','Win your first rewarded chapter boss battle','boss_battles',1],['boss-slayer','Boss Slayer','Win five rewarded chapter boss battles','boss_battles',5],['chapter-champion','Chapter Champion','Win ten rewarded chapter boss battles','boss_battles',10],['comeback-king','Comeback Learner','Beat a previous personal best','personal_bests',1],['mistake-detective','Mistake Detective','Resolve 20 saved mistakes','mistakes_reviewed',20],['accuracy-ace','Accuracy Ace','Answer 100 flashcard quiz questions correctly','correct_answers',100],['mastermind','Mastermind','Complete 20 study-game rounds','study_games',20]
    ]},
    {category:'Consistency', icon:'🔥', rarity:'Epic', entries:[
      ['first-spark','First Spark','Complete a focus session','focus_sessions',1],['three-day-star','Three-Day Star','Complete focus sessions on three separate days','study_days',3],['weekly-warrior','Weekly Warrior','Complete five focus sessions in a week','weekly_sessions',5],['two-week-explorer','Ten-Day Scholar','Complete focus sessions on ten separate days','study_days',10],['monthly-achiever','Monthly Achiever','Complete 20 focus sessions in a month','monthly_sessions',20],['steady-learner','Steady Learner','Complete 25 focus sessions','focus_sessions',25],['routine-builder','Routine Builder','Complete seven planner tasks','tasks_completed',7],['goal-getter','Goal Getter','Complete 25 planner tasks','tasks_completed',25],['planner-pro','Planner Pro','Complete 50 planner tasks','tasks_completed',50],['consistency-legend','Consistency Legend','Complete 50 focus sessions','focus_sessions',50]
    ]},
    {category:'Focus', icon:'⏱️', rarity:'Rare', entries:[
      ['focus-rookie','Focus Rookie','Finish your first focus session','focus_sessions',1],['deep-focus','Deep Focus','Complete a session of at least 25 minutes','long_focus_sessions',1],['focus-five','Focus Five','Complete five focus sessions','focus_sessions',5],['focus-ten','Focus Ten','Complete ten focus sessions','focus_sessions',10],['focus-master','Focus Master','Complete 25 focus sessions','focus_sessions',25],['break-smart','Break Smart','Take five planned breaks','breaks_taken',5],['concentration-ace','Concentration Ace','Complete five sessions of at least 30 minutes','thirty_min_focus_sessions',5],['time-keeper','Time Keeper','Complete ten planner tasks','tasks_completed',10],['focus-explorer','Focus Explorer','Try three different focus durations','timer_durations',3],['orbit-zen','Orbit Zen','Complete 50 focus sessions','focus_sessions',50]
    ]},
    {category:'Exploration', icon:'🌍', rarity:'Epic', entries:[
      ['first-arrival','First Arrival','Visit Orbit Central','world_visits',1],['world-traveller','World Traveller','Visit five different locations','unique_worlds',5],['galaxy-explorer','Galaxy Explorer','Visit every launch world','unique_worlds',11],['room-designer','Room Designer','Save a room design','room_designs',1],['style-creator','Style Creator','Save your first avatar style','outfits_saved',1],['fashion-collector','Fashion Collector','Save five avatar styles','outfits_saved',5],['market-explorer','Market Explorer','Visit the Orbit Marketplace','market_visits',1],['room-curator','Room Curator','Place ten room decorations','decorations_placed',10],['builder','Builder','Place five room decorations','decorations_placed',5],['universe-designer','Universe Designer','Visit all launch worlds','unique_worlds',11]
    ]},
    {category:'Arcade', icon:'🎮', rarity:'Legendary', entries:[
      ['game-starter','Game Starter','Play your first arcade game','arcade_games',1],['arcade-adventurer','Arcade Adventurer','Try three different arcade games','unique_games',3],['game-collector','Game Collector','Try all eight launch games','unique_games',8],['high-score','High Score','Beat a personal best','personal_bests',1],['comeback-player','Comeback Player','Improve a game score','score_improvements',1],['puzzle-master','Puzzle Master','Complete five memory rounds','memory_rounds',5],['equation-racer','Equation Racer','Complete five Equation Rush rounds','equation_rounds',5],['word-smith','Word Smith','Complete five Word Forge rounds','word_rounds',5],['arcade-champion','Arcade Champion','Play 25 arcade games','arcade_games',25],['orbit-legend','Orbit Legend','Unlock 50 Orbit achievements','badges_unlocked',50]
    ]}
  ];
  const BADGE_ART = {
    Learning:['🌱','🔎','📘','📚','🧭','📝','🃏','🧠','📖','🌟'],
    Mastery:['💯','👑','🏅','🐉','⚔️','🏰','🔄','🕵️','🎯','🧙'],
    Consistency:['✨','🔥','✨','🛡️','🌙','🧱','🗓️','🎯','📅','🌠'],
    Focus:['⏱️','🪐','5️⃣','🔟','🏆','🌿','🎧','⌛','🔭','☄️'],
    Exploration:['🚪','🧳','🌌','🏡','👕','👗','🛍️','🪴','🧰','🏝️'],
    Arcade:['🎮','🕹️','🎲','🥇','📈','🧩','➗','🔤','🏆','👾']
  };
  const BADGES = badgeGroups.flatMap(g => g.entries.map(([id,name,desc,metric,target], i) => ({
    id,name,desc,metric,target,category:g.category,icon:(BADGE_ART[g.category]||[])[i]||g.icon,
    rarity:i>=9?'Mythic':i>=7?'Legendary':i>=5?'Epic':i>=3?'Rare':'Common',order:i
  })));

  function badgeProgress(b) { return Math.min(b.target, Math.max(0, Number(metrics[b.metric]) || 0)); }
  function rarityLabel(r) { return r.toUpperCase(); }
  function checkBadges() {
    let newly = [];
    for (const b of BADGES) {
      if (!unlocked.has(b.id) && badgeProgress(b) >= b.target) { unlocked.add(b.id); newly.push(b); }
    }
    if (newly.length) {
      write(STORAGE.badges, [...unlocked]);
      metrics.badges_unlocked = unlocked.size;
      write(STORAGE.metrics, metrics);
      newly.slice(0,2).forEach(b => showToast(`Badge unlocked: ${b.name}`, '🏅'));
      if (newly.length > 2) showToast(`${newly.length-2} more achievements unlocked!`, '✨');
    }
  }
  function showToast(message, icon='✨') {
    const old = $('on-toast'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'on-toast'; el.className = 'on-toast'; el.textContent = `${icon} ${message}`;
    document.body.appendChild(el); window.setTimeout(() => el.remove(), 3000);
  }
  function awardCoins(amount, label) {
    const key = `arcade-coins-${today()}`;
    const used = Number(localStorage.getItem(key) || 0);
    const allowed = Math.max(0, Math.min(amount, 50-used));
    if (!allowed) return;
    localStorage.setItem(key, String(used+allowed));
    if (typeof window.addRewards === 'function') window.addRewards(0, allowed, label);
    else if (typeof state !== 'undefined') { state.coins = (Number(state.coins)||0)+allowed; }
  }

  // Final 22-panel information architecture. Older destinations remain available as subviews,
  // while the main navigation groups related tools together.
  try {
    if (typeof SECTIONS !== 'undefined') {
      const finalSections = [
        {id:'dashboard',label:'Dashboard',icon:'🏠',color:'bg-indigo-600',badgeColor:'text-indigo-600'},
        {id:'orbitchat',label:'Orbiter AI',icon:'🤖',color:'bg-indigo-600',badgeColor:'text-indigo-600'},
        {id:'studyboard',label:'Study Board & Insights',icon:'📊',color:'bg-cyan-600',badgeColor:'text-cyan-600'},
        {id:'studylab',label:'Study Lab',icon:'🧪',color:'bg-violet-600',badgeColor:'text-violet-600'},
        {id:'quests',label:'Daily Quests',icon:'🎯',color:'bg-sec-quests',badgeColor:'text-orange-600'},
        {id:'planner',label:'Planner & Exams',icon:'📅',color:'bg-sec-planner',badgeColor:'text-blue-600'},
        {id:'focustimer',label:'Focus Timer',icon:'⏱️',color:'bg-cyan-600',badgeColor:'text-cyan-600'},
        {id:'flashcards',label:'Flashcards',icon:'🃏',color:'bg-sec-flashcards',badgeColor:'text-pink-600'},
        {id:'lingua',label:'Orbit Lingo',icon:'🦉',color:'bg-sec-lingua',badgeColor:'text-emerald-600'},
        {id:'courses',label:'Course Library',icon:'📚',color:'bg-blue-600',badgeColor:'text-blue-600'},
        {id:'boss',label:'Boss Levels',icon:'🐉',color:'bg-sec-boss',badgeColor:'text-red-600'},
        {id:'battles',label:'Battles & Duels',icon:'⚔️',color:'bg-sec-battles',badgeColor:'text-purple-600'},
        {id:'arcade',label:'Arcade Nebula',icon:'🕹️',color:'bg-sec-arcade',badgeColor:'text-lime-600'},
        {id:'orbitworld',label:'Orbit World',icon:'🌌',color:'bg-indigo-600',badgeColor:'text-indigo-600'},
        {id:'avatar',label:'Avatar Studio',icon:'🧍',color:'bg-indigo-500',badgeColor:'text-indigo-500'},
        {id:'trophies',label:'Trophy Galaxy',icon:'🏅',color:'bg-amber-500',badgeColor:'text-amber-600'},
        {id:'shop',label:'Marketplace',icon:'🛍️',color:'bg-sec-shop',badgeColor:'text-green-600'},
        {id:'communityhub',label:'Community Hub',icon:'🌐',color:'bg-sec-community',badgeColor:'text-teal-600'},
        {id:'missions',label:'Island Missions',icon:'🧭',color:'bg-emerald-600',badgeColor:'text-emerald-600'},
        {id:'creator',label:'Creator Workshop',icon:'🎨',color:'bg-pink-600',badgeColor:'text-pink-600'},
        {id:'springdales',label:'SDES GRAM',icon:'🏫',color:'bg-indigo-500',badgeColor:'text-indigo-600'},
        {id:'about',label:'About Us',icon:'ℹ️',color:'bg-slate-600',badgeColor:'text-slate-600'}
      ];
      SECTIONS.splice(0, SECTIONS.length, ...finalSections);
    }
  } catch (e) { console.warn('Orbit navigation grouping could not be applied:', e); }

  // ---------------------- WORLD AND CHARACTER ----------------------
  const LOCATIONS = [
    {id:'central',name:'Orbit Central',emoji:'🌌',desc:'Your universe hub',theme:0x172451,ground:0x5866a4,accent:0x8beaff,activity:'Meet the Orbit Guide',detail:'Check your mission board, choose an island and collect your first star.',tab:'missions'},
    {id:'academy',name:'Academy Island',emoji:'🏫',desc:'Library, classes and study gates',theme:0x172b49,ground:0x3e829c,accent:0x8ce5ff,activity:'Academy Challenge',detail:'Choose a subject, revise a lesson or open a study station.',tab:'studyboard'},
    {id:'math',name:'Math Meadows',emoji:'➗',desc:'Equations, number bridges and puzzles',theme:0x183c45,ground:0x438e78,accent:0xb4f58a,activity:'Equation Bridge',detail:'Solve a short mathematics challenge to power the bridge crystals.',tab:'arcade',game:'equation'},
    {id:'science',name:'Science Bay',emoji:'🧪',desc:'Experiments, specimens and science puzzles',theme:0x163b4d,ground:0x438ba0,accent:0x7ce8e3,activity:'Science Discovery',detail:'Explore scientific facts and test your knowledge with a quick challenge.',tab:'boss'},
    {id:'words',name:'Word Forest',emoji:'📖',desc:'Vocabulary trees and grammar gates',theme:0x173e39,ground:0x478b70,accent:0xa7f0b0,activity:'Word Trail',detail:'Practise vocabulary and language patterns along the forest path.',tab:'lingua'},
    {id:'history',name:'History Ruins',emoji:'🏛️',desc:'Ancient temples and timeline puzzles',theme:0x493323,ground:0x9d7650,accent:0xffd18a,activity:'Timeline Relic',detail:'Put historical events in order and uncover a new relic.',tab:'arcade',game:'timeline'},
    {id:'geo',name:'GeoGlobe Isles',emoji:'🌍',desc:'Continents, oceans and map challenges',theme:0x153a55,ground:0x4385aa,accent:0x9bdcff,activity:'Map Explorer',detail:'Test your knowledge of countries, capitals and physical geography.',tab:'arcade',game:'world'},
    {id:'arcade',name:'Arcade Nebula',emoji:'🕹️',desc:'Study games and high scores',theme:0x291a50,ground:0x8059aa,accent:0xff91d6,activity:'Arcade Portal',detail:'Play study games, creative games and short space adventures.',tab:'arcade'},
    {id:'trophy',name:'Trophy Galaxy',emoji:'🏆',desc:'Your achievement museum',theme:0x3b2a43,ground:0x98734e,accent:0xffdf85,activity:'Trophy Gallery',detail:'View your earned badges and see what you can unlock next.',tab:'trophies'},
    {id:'market',name:'Marketplace Plaza',emoji:'🛍️',desc:'Clothing, room themes and decorations',theme:0x173c48,ground:0x478b80,accent:0xb7ffc9,activity:'Style Your Universe',detail:'Explore colourful clothing, room furniture and decorations you can unlock with Orbit Coins.',tab:'shop'},
    {id:'creator',name:'Style Studio Island',emoji:'🎨',desc:'Dress up your blocky avatar',theme:0x26375a,ground:0x6686bb,accent:0xffc4e4,activity:'Open Avatar Studio',detail:'Try outfits, hair and accessories on your Orbit avatar.',tab:'avatar'}
  ];
  let worldRuntime = null;
  let avatarRuntime = null;
  const keys = Object.create(null);
  let gameRuntime = null;
  let focusTicker = null;
  let focusState = read(STORAGE.focus, {status:'idle',duration:1500,remaining:1500,endsAt:0,subject:'General study',task:'',startedAt:0,sessionId:''});
  let timerChosenDuration = safeNumber(focusState.duration,300,7200,1500);
  let focusCompletedToday = 0;

  const PALETTES = [
    {name:'Comet Blue',skin:0xffd0ae,shirt:0x4f83ff,pants:0x26395e,hair:0x46352d,accent:0x71e0fa},
    {name:'Peach Nova',skin:0xf4b58f,shirt:0xff8c9e,pants:0x70486e,hair:0x4a2c35,accent:0xffd18a},
    {name:'Mint Galaxy',skin:0xd99c76,shirt:0x53c6a0,pants:0x265f5c,hair:0x30262a,accent:0x9bf2d2},
    {name:'Lilac Star',skin:0xffd2b8,shirt:0xa78bfa,pants:0x4e4278,hair:0x59447e,accent:0xf2c8ff},
    {name:'Solar Gold',skin:0x9d6046,shirt:0xf3bf56,pants:0x425777,hair:0x231e28,accent:0xffe79c},
    {name:'Berry Pop',skin:0xf1c1a3,shirt:0xc65bd8,pants:0x563d73,hair:0x36243c,accent:0xffb9ec},
    {name:'Ocean Mint',skin:0xe0ad8f,shirt:0x38a7b9,pants:0x244c65,hair:0x342f42,accent:0x9bf7f1},
    {name:'Coral Sunrise',skin:0xffd2b5,shirt:0xff795e,pants:0x5b456a,hair:0x543a34,accent:0xffd19a},
    {name:'Midnight Comet',skin:0xb8785d,shirt:0x4c5ad6,pants:0x202c52,hair:0x171c32,accent:0xa7b7ff},
    {name:'Lemon Cloud',skin:0xdeb08e,shirt:0xe9c94e,pants:0x536c8b,hair:0x66472f,accent:0xfff3a5}
  ];
  const OUTFITS=[
    {name:'Classic Explorer',shirt:null,pants:null},
    {name:'Space Hoodie',shirt:0x695ce8,pants:0x303b68},
    {name:'Ocean Diver',shirt:0x259cb2,pants:0x245f78},
    {name:'Garden Scout',shirt:0x4ca978,pants:0x315d4a},
    {name:'Royal Star',shirt:0xe1ad42,pants:0x514070},
    {name:'Pixel Artist',shirt:0xd45f9e,pants:0x55416e}
  ];
  const HAIR_STYLES=['Orbit Bob','Side Sweep','Long Locks','Spiky Pixels','Curly Clouds','Ponytail'];
  const HAT_STYLES=['No hat','Star Cap','Golden Crown','Mint Beanie','Space Headphones','Flower Crown','Astronaut Helmet','Wizard Hat'];
  const ACCESSORIES=['None','Backpack','Comet Scarf','Mini Wings','Star Badge','Orbit Bow'];
  function makeMat(THREE,color,roughness=.75,transparent=false,opacity=1){return new THREE.MeshStandardMaterial({color,roughness,transparent,opacity});}
  function effectiveAvatarPalette(){const base=PALETTES[avatarPrefs.palette%PALETTES.length],o=OUTFITS[avatarPrefs.outfit||0]||OUTFITS[0];return {...base,shirt:o.shirt||base.shirt,pants:o.pants||base.pants};}
  function addBox(THREE,parent,w,h,d,color,x,y,z,opts={}){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),makeMat(THREE,color,opts.roughness??.75,opts.transparent??false,opts.opacity??1));
    m.position.set(x,y,z); if(opts.radius) m.castShadow=true; m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  }
  function buildCuteAvatar(THREE){
    const base=PALETTES[avatarPrefs.palette%PALETTES.length];
    const outfit=OUTFITS[avatarPrefs.outfit%OUTFITS.length]||OUTFITS[0];
    const cfg={...base,shirt:outfit.shirt||base.shirt,pants:outfit.pants||base.pants};
    const root=new THREE.Group();
    root.scale.setScalar(.88);
    const torso=new THREE.Group(); root.add(torso);
    const body=addBox(THREE,torso,.92,.92,.55,cfg.shirt,0,1.15,0);
    body.geometry.translate(0,0,0);
    // Little Orbit emblem on the chest.
    const emblem=new THREE.Mesh(new THREE.CircleGeometry(.11,24),new THREE.MeshBasicMaterial({color:cfg.accent})); emblem.position.set(0,1.18,.282); torso.add(emblem);
    // Neck and oversized softly rounded block head.
    addBox(THREE,root,.28,.18,.25,cfg.skin,0,1.68,0);
    const headGroup=new THREE.Group(); headGroup.position.set(0,2.12,0); root.add(headGroup);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.92,.86,.78),makeMat(THREE,cfg.skin)); head.position.y=.12; head.castShadow=true; headGroup.add(head);
    // Soft cheek accents and large friendly eyes.
    [-1,1].forEach(side=>{
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.095,18,14),makeMat(THREE,0x202b49,.25)); eye.position.set(side*.205,.19,.405); headGroup.add(eye);
      const sparkle=new THREE.Mesh(new THREE.SphereGeometry(.03,10,8),new THREE.MeshBasicMaterial({color:0xffffff})); sparkle.position.set(side*.205-.025,.225,.49); headGroup.add(sparkle);
      const cheek=new THREE.Mesh(new THREE.SphereGeometry(.075,12,10),new THREE.MeshBasicMaterial({color:0xf18bb7,transparent:true,opacity:.65})); cheek.position.set(side*.32,-.02,.38); headGroup.add(cheek);
    });
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.075,.014,8,18,Math.PI),makeMat(THREE,0x8d4e55)); smile.position.set(0,-.11,.399); smile.rotation.z=Math.PI; headGroup.add(smile);
    // Hair cap and tufts.
    const hairStyle=avatarPrefs.hair||0;
    addBox(THREE,headGroup,.98,.17,.83,cfg.hair,0,.58,-.01);
    if(hairStyle===0||hairStyle===1||hairStyle===2||hairStyle===4){
      addBox(THREE,headGroup,.28,.25,.29,cfg.hair,-.29,.47,.17);
      addBox(THREE,headGroup,.27,.22,.28,cfg.hair,.12,.49,.18);
    }
    if(hairStyle===1||hairStyle===2){addBox(THREE,headGroup,.18,.62,.22,cfg.hair,-.48,-.18,-.02);addBox(THREE,headGroup,.18,.62,.22,cfg.hair,.48,-.18,-.02);}
    if(hairStyle===3){[-.34,-.12,.12,.34].forEach((x,i)=>addBox(THREE,headGroup,.18,.28,.22,cfg.hair,x,.68+(i%2)*.06,.05));}
    if(hairStyle===4){[-.35,-.12,.12,.35].forEach((x,i)=>{const curl=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),makeMat(THREE,cfg.hair));curl.position.set(x,.48,.12);headGroup.add(curl);});}
    if(hairStyle===5){addBox(THREE,headGroup,.24,.64,.24,cfg.hair,.52,.05,-.12);}
    if(avatarPrefs.hat){
      const hatColour=[0,0x6c7cff,0xffbf63,0x63c9c5,0x34405f,0xf28bb6,0x9ed7f4,0x7657b8][avatarPrefs.hat];
      if(avatarPrefs.hat===4){[-.36,.36].forEach(x=>{const ear=new THREE.Mesh(new THREE.TorusGeometry(.18,.055,8,18),makeMat(THREE,hatColour));ear.position.set(x,.3,0);headGroup.add(ear);});}
      else if(avatarPrefs.hat===5){for(let i=0;i<7;i++){const flower=new THREE.Mesh(new THREE.SphereGeometry(.12,9,8),makeMat(THREE,i%2?0xffe17b:0xffa8ce));flower.position.set(Math.cos(i/7*Math.PI*2)*.43,.68,Math.sin(i/7*Math.PI*2)*.28);headGroup.add(flower);}}
      else if(avatarPrefs.hat===6){const helmet=new THREE.Mesh(new THREE.SphereGeometry(.56,18,14,0,Math.PI*2,0,Math.PI*.55),new THREE.MeshStandardMaterial({color:hatColour,transparent:true,opacity:.55,roughness:.2}));helmet.position.y=.28;headGroup.add(helmet);}
      else if(avatarPrefs.hat===7){const cone=new THREE.Mesh(new THREE.ConeGeometry(.32,.56,6),makeMat(THREE,hatColour));cone.position.y=.94;headGroup.add(cone);}
      else {const hat=new THREE.Mesh(new THREE.CylinderGeometry(.38,.40,.14,24),makeMat(THREE,hatColour));hat.position.y=.78;headGroup.add(hat);const top=new THREE.Mesh(new THREE.SphereGeometry(.25,16,12),makeMat(THREE,hatColour));top.scale.y=.55;top.position.y=.88;headGroup.add(top);}
    }
    if(avatarPrefs.accessory===1){addBox(THREE,root,.42,.48,.18,0x7b65dc,0,1.45,-.38);addBox(THREE,root,.48,.11,.08,0xffd36e,0,1.55,-.49);}
    if(avatarPrefs.accessory===2){addBox(THREE,root,.75,.16,.67,0x49c6c4,0,1.86,.04);}
    if(avatarPrefs.accessory===3){[-1,1].forEach(side=>addBox(THREE,root,.36,.62,.08,0xb5a3ff,side*.72,1.62,-.28,{rz:side*.25}));}
    if(avatarPrefs.accessory===4){const star=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.05,5),makeMat(THREE,0xffd56a));star.position.set(.26,1.3,.31);root.add(star);}
    if(avatarPrefs.accessory===5){addBox(THREE,root,.25,.22,.08,0xff8fbd,0,1.96,.26);}

    const limbs=[];
    [-1,1].forEach((side)=>{
      const arm=new THREE.Group(); arm.position.set(side*.59,1.45,0); root.add(arm);
      addBox(THREE,arm,.28,.54,.3,cfg.shirt,0,-.22,0);
      const hand=new THREE.Mesh(new THREE.BoxGeometry(.25,.22,.27),makeMat(THREE,cfg.skin)); hand.position.y=-.58; arm.add(hand); limbs.push({part:arm,type:'arm',side});
      const leg=new THREE.Group(); leg.position.set(side*.24,.72,0); root.add(leg);
      addBox(THREE,leg,.34,.52,.38,cfg.pants,0,-.21,0);
      addBox(THREE,leg,.4,.2,.52,0xeaf4ff,0,-.52,.08);
      limbs.push({part:leg,type:'leg',side});
    });
    root.userData={head:headGroup,torso,limbs};
    return root;
  }
  function disposeWorld(){
    if(worldRuntime){
      cancelAnimationFrame(worldRuntime.raf);
      if(worldRuntime.resize)worldRuntime.resize.disconnect();
      if(worldRuntime.renderer){worldRuntime.renderer.dispose();worldRuntime.renderer.forceContextLoss?.();}
      worldRuntime.scene?.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose?.());}});
      worldRuntime=null;
    }
    if(avatarRuntime){cancelAnimationFrame(avatarRuntime.raf);avatarRuntime.resize?.disconnect();avatarRuntime.renderer?.dispose();avatarRuntime.scene?.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose?.());}});avatarRuntime=null;}
  }
  function createPortal(THREE,scene,x,z,colour,label){
    const group=new THREE.Group(); group.position.set(x,0,z); scene.add(group);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.4,.18,40),makeMat(THREE,0x242e58)); pad.position.y=.10; pad.receiveShadow=true; group.add(pad);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.82,.11,14,42),makeMat(THREE,colour,.35)); ring.position.y=1.22; group.add(ring);
    const portal=new THREE.Mesh(new THREE.PlaneGeometry(1.48,2.05),new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.28,side:THREE.DoubleSide})); portal.position.y=1.17; group.add(portal);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.15,14,10),new THREE.MeshBasicMaterial({color:0xffffff})); cap.position.set(0,2.35,0); group.add(cap);
    group.userData.portal=label; return group;
  }
  function addTree(THREE,scene,x,z,colour){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,.75,8),makeMat(THREE,0x76523c));trunk.position.set(x,.45,z);scene.add(trunk);
    const crown=new THREE.Mesh(new THREE.SphereGeometry(.52,12,10),makeMat(THREE,colour));crown.position.set(x,.98,z);crown.scale.y=1.1;scene.add(crown);
  }
  function buildWorld3D(){
    const canvas=$('on-world-canvas'); if(!canvas)return;
    if(!window.THREE){renderWorldFallback();return;}
    disposeWorld();
    const THREE=window.THREE, location=LOCATIONS.find(x=>x.id===worldPrefs.location)||LOCATIONS[0];
    const stage=$('on-world-stage');
    let renderer;
    try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch(e){renderWorldFallback();return;}
    const w=Math.max(320,stage.clientWidth),h=Math.max(400,stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(w,h,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const scene=new THREE.Scene();scene.background=new THREE.Color(location.theme);scene.fog=new THREE.Fog(location.theme,20,46);
    const camera=new THREE.PerspectiveCamera(48,w/h,.1,100);camera.position.set(0,7,12);
    const hemi=new THREE.HemisphereLight(0xc6e9ff,0x273050,2.0);scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-5,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(13,14,.7,64),makeMat(THREE,location.ground));floor.position.y=-.38;floor.receiveShadow=true;floor.castShadow=true;scene.add(floor);
    const inner=new THREE.Mesh(new THREE.CylinderGeometry(8.5,8.8,.10,64),makeMat(THREE,0x28345e));inner.position.y=.02;scene.add(inner);
    const outerRing=new THREE.Mesh(new THREE.TorusGeometry(10.5,.12,12,80),makeMat(THREE,location.accent,.25));outerRing.rotation.x=Math.PI/2;outerRing.position.y=.06;scene.add(outerRing);
    // Central Orbit beacon.
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(.72,.95,2.2,8),makeMat(THREE,0x354675));tower.position.set(0,1.1,-2);tower.castShadow=true;scene.add(tower);
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(.63,24,20),new THREE.MeshStandardMaterial({color:location.accent,emissive:location.accent,emissiveIntensity:.6,roughness:.2}));beacon.position.set(0,2.65,-2);scene.add(beacon);
    const beaconRing=new THREE.Mesh(new THREE.TorusGeometry(1.0,.045,8,42),makeMat(THREE,0xffffff,.25));beaconRing.position.copy(beacon.position);beaconRing.rotation.x=.6;scene.add(beaconRing);
    // Platforms and portal gates around the plaza.
    const portalColours=[0x7be7ff,0x8df0ae,0x83bfff,0xffb2d9,0xf4d17a,0x9bf2d2,0xc09bff,0xff91d6,0xffdf85,0xb7ffc9];
    const portalDefs=LOCATIONS.filter(x=>x.id!=='central').map((item,i)=>{const a=-Math.PI/2+i/10*Math.PI*2;return [Math.cos(a)*7.5,Math.sin(a)*7.5,portalColours[i],item.name];});
    const portals=portalDefs.map(p=>createPortal(THREE,scene,p[0],p[1],p[2],p[3]));
    const portalIds=LOCATIONS.filter(x=>x.id!=='central').map(x=>x.id);
    if(location.id!=='central'){portalDefs.push([0,4.9,0x8beaff,'Orbit Central']);portalIds.push('central');portals.push(createPortal(THREE,scene,0,4.9,0x8beaff,'Orbit Central'));}
    // Small side scenery and floating islands give the hub depth.
    addTree(THREE,scene,-8,-1,0x79cfae);addTree(THREE,scene,8,-1,0xb0a1f3);addTree(THREE,scene,-8,5,0xf1a6ce);addTree(THREE,scene,8,5,0x83d8e8);
    // Island-specific landmarks make each destination feel like a place with a purpose.
    if(location.id==='math'){
      [[-2.2,0.5,-2,0x54d5b3],[0,1.0,-2,0xffd36f],[2.2,1.5,-2,0x8b85ff]].forEach(([x,y,z,c])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.15,y+0.6,1.1),makeMat(THREE,c));m.position.set(x,y/2,z);m.castShadow=true;scene.add(m);});
    }else if(location.id==='science'){
      [-2,0,2].forEach((x,i)=>{const glass=new THREE.Mesh(new THREE.CylinderGeometry(.32,.48,.95,16),new THREE.MeshStandardMaterial({color:[0x68d9ef,0x9a8cff,0x7de0a2][i],transparent:true,opacity:.72,roughness:.2}));glass.position.set(x,.65,-2.5);scene.add(glass);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.15,.18,.3,12),makeMat(THREE,0xdff6ff));neck.position.set(x,1.26,-2.5);scene.add(neck);});
    }else if(location.id==='words'){
      addTree(THREE,scene,-2,-2,0x70c98c);addTree(THREE,scene,2,-2,0x83d6aa);addTree(THREE,scene,-3,2,0x5bbd8b);addTree(THREE,scene,3,2,0x9ce4b5);
      for(let i=0;i<4;i++){const book=addBox(THREE,scene,.8,.12,.58,[0xf08c9d,0x7aa7e9,0xf2cf74,0x9b88e8][i],-2.2+i*1.45,1.0,-3.8);book.rotation.y=(i-1.5)*.12;}
    }else if(location.id==='history'){
      for(let i=0;i<4;i++){const col=new THREE.Mesh(new THREE.CylinderGeometry(.22,.27,2.4,8),makeMat(THREE,0xcaa16c));col.position.set(-2.1+i*1.4,1.2,-3);scene.add(col);}const lintel=addBox(THREE,scene,5,.34,.8,0xe2bd82,0,2.45,-3);
    }else if(location.id==='geo'){
      const globe=new THREE.Mesh(new THREE.SphereGeometry(1.05,24,18),makeMat(THREE,0x3b9ad1,.3));globe.position.set(0,1.5,-2.5);scene.add(globe);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35,.06,10,48),makeMat(THREE,0xf4d37d,.3));ring.position.copy(globe.position);ring.rotation.x=.7;scene.add(ring);
    }
    if(location.id==='academy'){
      addBox(THREE,scene,5.2,1.9,.5,0xb9814f,0,.95,-3.6);
      [0xf08c9d,0x7aa7e9,0xf2cf74,0x9b88e8,0x7fd6a4,0xf4a261].forEach((c,i)=>addBox(THREE,scene,.55,.95,.4,c,-2.1+i*.84,1.25,-3.3));
      addBox(THREE,scene,1.2,3.4,1.2,0xe8d9b5,3.9,1.7,-2.6);const roof=new THREE.Mesh(new THREE.ConeGeometry(1,1,4),makeMat(THREE,0xc2553f));roof.position.set(3.9,3.9,-2.6);roof.rotation.y=Math.PI/4;scene.add(roof);
    }else if(location.id==='arcade'){
      [0x7be7ff,0xff91d6,0xffdf85].forEach((c,i)=>{const x=-2.4+i*2.4;addBox(THREE,scene,1.1,1.8,.9,0x2b1f55,x,.9,-3);const sc=new THREE.Mesh(new THREE.BoxGeometry(.82,.62,.06),new THREE.MeshBasicMaterial({color:c}));sc.position.set(x,1.25,-2.52);scene.add(sc);addBox(THREE,scene,.9,.14,.5,0x4a3a8a,x,.62,-2.4);});
    }else if(location.id==='trophy'){
      [[-1.6,1.0],[0,1.6],[1.6,.7]].forEach(([x,h],i)=>{addBox(THREE,scene,1.4,h,1.2,[0xc9ccd6,0xf2c14e,0xcd8a52][i],x,h/2,-3);const cup=new THREE.Mesh(new THREE.CylinderGeometry(.3,.18,.45,14),makeMat(THREE,0xffd84d,.3));cup.position.set(x,h+.3,-3);scene.add(cup);});
    }else if(location.id==='market'){
      [0xff8fa3,0x7fd6a4,0xffd36f].forEach((c,i)=>{const x=-2.6+i*2.6;addBox(THREE,scene,1.9,.8,1,0x8a6340,x,.4,-3);addBox(THREE,scene,2.2,.14,1.5,c,x,1.9,-3.1);[-.9,.9].forEach(dx=>addBox(THREE,scene,.1,1.9,.1,0x6b4a2e,x+dx,.95,-2.5));});
    }else if(location.id==='creator'){
      [0xff9ec7,0x8b85ff,0x54d5b3,0xffd36f].forEach((c,i)=>addBox(THREE,scene,.9,.9,.9,c,-2.4+i*1.6,.45+((i%2)*.9),-3));
    }
    for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2,r=12+Math.sin(i*2)*1.3;
      const star=new THREE.Mesh(new THREE.SphereGeometry(.06+(i%3)*.025,8,8),new THREE.MeshBasicMaterial({color:i%2?0xffffff:location.accent}));star.position.set(Math.cos(a)*r,1.2+(i%4)*.8,Math.sin(a)*r);scene.add(star);
    }
    const avatar=(window.OrbitLife?.buildAvatarModel?.(THREE))||buildCuteAvatar(THREE);avatar.position.set(0,0,2.5);scene.add(avatar);
    const state3={renderer,scene,camera,avatar,beacon,beaconRing,portals,stage,canvas,raf:0,resize:null,move:{x:0,z:0},cameraYaw:0,last:0,drag:null,action:'',actionUntil:0};
    state3.resize=new ResizeObserver(()=>{if(!worldRuntime||worldRuntime!==state3)return;const ww=Math.max(320,stage.clientWidth),hh=Math.max(400,stage.clientHeight);renderer.setSize(ww,hh,false);camera.aspect=ww/hh;camera.updateProjectionMatrix();});state3.resize.observe(stage);
    canvas.addEventListener('pointerdown',e=>{state3.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(state3.drag){state3.cameraYaw+=(e.clientX-state3.drag.x)*.006;state3.drag={x:e.clientX,y:e.clientY};}});
    canvas.addEventListener('pointerup',()=>state3.drag=null);canvas.addEventListener('pointercancel',()=>state3.drag=null);
    worldRuntime=state3;
    const loop=(t)=>{
      if(worldRuntime!==state3)return;state3.raf=requestAnimationFrame(loop);
      const dt=Math.min(.04,(t-state3.last||16)/1000);state3.last=t;
      const moving=Math.abs(state3.move.x)+Math.abs(state3.move.z)>.05;
      if(moving){const len=Math.hypot(state3.move.x,state3.move.z)||1;avatar.position.x+=state3.move.x/len*dt*4.3;avatar.position.z+=state3.move.z/len*dt*4.3;avatar.position.x=Math.max(-9,Math.min(9,avatar.position.x));avatar.position.z=Math.max(-8.4,Math.min(8,avatar.position.z));avatar.rotation.y=Math.atan2(state3.move.x,state3.move.z);}
      if(!state3.travelling){for(let pi=0;pi<portalDefs.length;pi++){const dx=avatar.position.x-portalDefs[pi][0],dz=avatar.position.z-portalDefs[pi][1];if(dx*dx+dz*dz<1.35){state3.travelling=true;const pid=portalIds[pi];stage.classList.add('portal-flash');setTimeout(()=>usePortal(pid),380);break;}}}
      const action=Date.now()<state3.actionUntil?state3.action:'';
      const limbs=avatar.userData.limbs||[];limbs.forEach(l=>{
        if(l.type==='arm'){
          l.part.rotation.x=moving?Math.sin(t*.012)*.5*l.side:Math.sin(t*.002)*.035;
          if(action==='wave'&&l.side===1)l.part.rotation.z=2.15+Math.sin(t*.018)*.22;
          else if(action==='dance')l.part.rotation.z=Math.sin(t*.014+l.side)*.92;
          else l.part.rotation.z=0;
        }else{
          l.part.rotation.x=moving?Math.sin(t*.012)*.55*l.side:0;
          l.part.rotation.z=action==='dance'?Math.sin(t*.014+l.side)*.28:0;
        }
      });
      avatar.position.y=moving?Math.abs(Math.sin(t*.012))*.045:action==='dance'?Math.abs(Math.sin(t*.012))*.12:Math.sin(t*.002)*.035;
      if(action==='dance')avatar.rotation.y+=dt*1.5;
      beacon.rotation.y+=dt*.45;beaconRing.rotation.z+=dt*.35;
      portals.forEach((p,i)=>{p.rotation.y=Math.sin(t*.0008+i)*.04;p.children[2].material.opacity=.18+((Math.sin(t*.002+i)+1)*.08);});
      const offset=new THREE.Vector3(Math.sin(state3.cameraYaw)*11,7,Math.cos(state3.cameraYaw)*11);
      const target=new THREE.Vector3(avatar.position.x,1.15,avatar.position.z);
      camera.position.lerp(target.clone().add(offset),.08);camera.lookAt(target.x,1.0,target.z);
      renderer.render(scene,camera);
    };
    state3.raf=requestAnimationFrame(loop);
  }
  // Lightweight isometric renderer used when the external Three.js library or
  // WebGL is unavailable. It keeps the world visual and interactive offline.
  const colorHex = n => `#${Number(n).toString(16).padStart(6,'0')}`;
  function drawIsoBlock(ctx,cx,topY,w,h,d,front,side,top){
    const dx=d*.42,dy=-d*.30;
    const tl=[cx-w/2,topY],tr=[cx+w/2,topY],br=[cx+w/2,topY+h],bl=[cx-w/2,topY+h];
    ctx.beginPath();ctx.moveTo(...tl);ctx.lineTo(...tr);ctx.lineTo(tr[0]+dx,tr[1]+dy);ctx.lineTo(tl[0]+dx,tl[1]+dy);ctx.closePath();ctx.fillStyle=top;ctx.fill();
    ctx.beginPath();ctx.moveTo(...tr);ctx.lineTo(tr[0]+dx,tr[1]+dy);ctx.lineTo(br[0]+dx,br[1]+dy);ctx.lineTo(...br);ctx.closePath();ctx.fillStyle=side;ctx.fill();
    ctx.beginPath();ctx.moveTo(...tl);ctx.lineTo(...tr);ctx.lineTo(...br);ctx.lineTo(...bl);ctx.closePath();ctx.fillStyle=front;ctx.fill();
    ctx.strokeStyle='rgba(16,27,58,.22)';ctx.lineWidth=Math.max(1,d*.045);ctx.stroke();
  }
  function drawOrbitAvatar2D(ctx,cx,baseY,scale,palette,hat,phase,action=''){
    const c=palette||PALETTES[0],s=scale,bob=action==='dance'?Math.abs(Math.sin(phase*.012))*8:Math.sin(phase*.002)*3;
    const bodyTop=baseY-137*s-bob,headTop=baseY-246*s-bob;
    ctx.save();
    ctx.fillStyle='rgba(3,9,34,.25)';ctx.beginPath();ctx.ellipse(cx,baseY+5*s,62*s,15*s,0,0,Math.PI*2);ctx.fill();
    // Legs.
    const step=(action==='dance'||action==='walk')?Math.sin(phase*.014)*8:0;
    drawIsoBlock(ctx,cx-19*s,baseY-65*s-bob-step,29*s,56*s,14*s,colorHex(c.pants), '#1b2d4c', '#52698c');
    drawIsoBlock(ctx,cx+19*s,baseY-65*s-bob+step,29*s,56*s,14*s,colorHex(c.pants), '#1b2d4c', '#52698c');
    drawIsoBlock(ctx,cx-19*s,baseY-13*s-bob-step,34*s,15*s,17*s,'#eff6ff','#aabbd4','#ffffff');
    drawIsoBlock(ctx,cx+19*s,baseY-13*s-bob+step,34*s,15*s,17*s,'#eff6ff','#aabbd4','#ffffff');
    // Arms behind the torso.
    const armAngle=action==='wave'?.62:action==='dance'?Math.sin(phase*.014)*.55:0;
    ctx.save();ctx.translate(cx-54*s,bodyTop+8*s);ctx.rotate(-armAngle);
    drawIsoBlock(ctx,0,0,23*s,58*s,13*s,colorHex(c.shirt),'#3156ae','#91b6ff');
    drawIsoBlock(ctx,0,52*s,23*s,19*s,13*s,colorHex(c.skin),'#bd806d','#ffd9c2');ctx.restore();
    ctx.save();ctx.translate(cx+54*s,bodyTop+8*s);ctx.rotate(action==='wave'?-1.02:action==='dance'?-armAngle:0);
    drawIsoBlock(ctx,0,0,23*s,58*s,13*s,colorHex(c.shirt),'#3156ae','#91b6ff');
    drawIsoBlock(ctx,0,52*s,23*s,19*s,13*s,colorHex(c.skin),'#bd806d','#ffd9c2');ctx.restore();
    // Torso and Orbit emblem.
    drawIsoBlock(ctx,cx,bodyTop,82*s,78*s,22*s,colorHex(c.shirt),'#3156ae','#a9c6ff');
    ctx.beginPath();ctx.arc(cx,bodyTop+38*s,7*s,0,Math.PI*2);ctx.fillStyle=colorHex(c.accent);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2*s;ctx.stroke();
    if((avatarPrefs.accessory||0)===1){drawIsoBlock(ctx,cx,bodyTop+18*s,72*s,43*s,15*s,'#7b65dc','#443a91','#b4a6ff');}if((avatarPrefs.accessory||0)===2){drawIsoBlock(ctx,cx,bodyTop-5*s,85*s,12*s,24*s,'#49c6c4','#287f87','#a6f0e9');}if((avatarPrefs.accessory||0)===4){ctx.fillStyle='#ffe17a';ctx.fillRect(cx+18*s,bodyTop+25*s,9*s,9*s);}
    // Oversized cute block head.
    ctx.save();ctx.translate(cx,headTop);ctx.rotate(Math.sin(phase*.001)*.025);
    drawIsoBlock(ctx,0,0,98*s,91*s,27*s,colorHex(c.skin),'#bd806d','#ffe0cb');
    // Hair cap and tufts.
    drawIsoBlock(ctx,0,-5*s,103*s,17*s,29*s,colorHex(c.hair),'#241f2b','#766078');
    drawIsoBlock(ctx,-28*s,5*s,20*s,21*s,13*s,colorHex(c.hair),'#241f2b','#766078');
    drawIsoBlock(ctx,22*s,5*s,20*s,18*s,13*s,colorHex(c.hair),'#241f2b','#766078');
    // Face, eyes and cheeks.
    [-19,19].forEach(ex=>{ctx.beginPath();ctx.ellipse(ex*s,43*s,5.2*s,7*s,0,0,Math.PI*2);ctx.fillStyle='#253047';ctx.fill();ctx.beginPath();ctx.arc((ex-1.5)*s,40*s,1.7*s,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();});
    [-1,1].forEach(side=>{ctx.beginPath();ctx.arc(side*34*s,56*s,5*s,0,Math.PI*2);ctx.fillStyle='rgba(242,133,169,.65)';ctx.fill();});
    if((avatarPrefs.face||0)===2){ctx.fillStyle='#99585e';ctx.beginPath();ctx.ellipse(0,57*s,6*s,7*s,0,0,Math.PI*2);ctx.fill();}else if((avatarPrefs.face||0)===1){ctx.fillStyle='#99585e';ctx.fillRect(-7*s,56*s,14*s,2*s);}else{ctx.beginPath();ctx.arc(0,57*s,9*s,.18,Math.PI-.18);ctx.strokeStyle='#99585e';ctx.lineWidth=2*s;ctx.stroke();}
    const hairStyle=avatarPrefs.hair||0;if(hairStyle===1||hairStyle===2){drawIsoBlock(ctx,-49*s,35*s,14*s,52*s,10*s,colorHex(c.hair),'#241f2b','#766078');drawIsoBlock(ctx,49*s,35*s,14*s,52*s,10*s,colorHex(c.hair),'#241f2b','#766078');}if(hairStyle===3){[-30,-10,10,30].forEach((x,i)=>drawIsoBlock(ctx,x*s,-18*s,18*s,18*s,12*s,colorHex(c.hair),'#241f2b','#766078'));}if(hairStyle===5)drawIsoBlock(ctx,49*s,4*s,18*s,38*s,12*s,colorHex(c.hair),'#241f2b','#766078');
    if(hat){const hc=hat===2?'#f9bd50':hat===3?'#65cbbc':hat===4?'#3d4b73':hat===5?'#f28bb6':hat===6?'#98dff4':hat===7?'#7657b8':'#6879ef';if(hat===6){ctx.strokeStyle='rgba(230,248,255,.85)';ctx.lineWidth=7*s;ctx.beginPath();ctx.arc(0,26*s,49*s,Math.PI,Math.PI*2);ctx.stroke();}else if(hat===4){ctx.strokeStyle=hc;ctx.lineWidth=7*s;ctx.beginPath();ctx.arc(-50*s,24*s,18*s,-Math.PI/2,Math.PI/2);ctx.arc(50*s,24*s,18*s,Math.PI/2,Math.PI*1.5);ctx.stroke();}else{drawIsoBlock(ctx,0,-19*s,71*s,12*s,31*s,hc,'#39448d','#c9d0ff');if(hat===2){ctx.fillStyle='#fff0ad';ctx.fillRect(-3*s,-34*s,6*s,16*s);}}}
    ctx.restore();ctx.restore();
  }
  function drawWorldFallbackFrame(rt,t){
    const {canvas,ctx,width,height}=rt,w=width,h=height,loc=LOCATIONS.find(x=>x.id===worldPrefs.location)||LOCATIONS[0];
    ctx.clearRect(0,0,w,h);
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,colorHex(loc.theme));sky.addColorStop(.62,'#27396d');sky.addColorStop(1,'#10172f');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // Distant planets and stars.
    for(let i=0;i<42;i++){const x=(i*97%997)/997*w,y=(i*53%401)/401*h*.65,r=1+(i%3)*.7;ctx.globalAlpha=.3+(i%4)*.12;ctx.fillStyle=i%5===0?'#a7efff':'#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    const planetX=w*.78,planetY=h*.19,planetR=Math.min(65,w*.075);ctx.save();ctx.globalAlpha=.82;ctx.fillStyle=colorHex(loc.accent);ctx.beginPath();ctx.arc(planetX,planetY,planetR,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.25;ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(planetX,planetY,planetR*1.55,planetR*.42,-.22,0,Math.PI*2);ctx.stroke();ctx.restore();
    // Floating central island and orbit rings.
    const groundY=h*.72;ctx.fillStyle='rgba(8,15,42,.38)';ctx.beginPath();ctx.ellipse(w*.5,groundY+18,w*.43,h*.18,0,0,Math.PI*2);ctx.fill();
    const ground=ctx.createRadialGradient(w*.5,groundY-20,30,w*.5,groundY,Math.max(w,h)*.5);ground.addColorStop(0,'#748bd0');ground.addColorStop(.55,colorHex(loc.ground));ground.addColorStop(1,'#26355e');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(w*.5,groundY,w*.42,h*.16,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(157,221,255,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(w*.5,groundY,w*.36,h*.12,-.035,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.17)';ctx.lineWidth=1;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.ellipse(w*.5,groundY,w*(.19+Math.abs(i)*.035),h*(.055+Math.abs(i)*.012),i*.035,0,Math.PI*2);ctx.stroke();}
    // Central beacon.
    const pulse=1+Math.sin(t*.002)*.08;ctx.save();ctx.shadowColor=colorHex(loc.accent);ctx.shadowBlur=26;ctx.fillStyle=colorHex(loc.accent);ctx.beginPath();ctx.arc(w*.5,groundY-111*pulse,18*pulse,0,Math.PI*2);ctx.fill();ctx.restore();
    drawIsoBlock(ctx,w*.5,groundY-105,52,73,22,'#3d5086','#26375e','#93a9e8');
    // Portals around the hub.
    const portalColors=['#81eaff','#a7efb0','#8bbdff','#f4b5d9','#f6d17c','#a1efca','#b99cff','#fa9bdc','#ffda80','#ffc2e4'];
    const portals=LOCATIONS.filter(x=>x.id!=='central').map((item,i)=>{const a=-Math.PI/2+i/10*Math.PI*2;return {x:Math.cos(a)*7.2,z:Math.sin(a)*7.2,label:item.name.toUpperCase().slice(0,12),colour:portalColors[i]};});
    if(worldPrefs.location!=='central')portals.push({x:0,z:4.9,label:'ORBIT CENTRAL',colour:'#8beaff',id:'central'});
    const yaw=rt.cameraYaw||0;
    const project=(x,z)=>{const wx=x*Math.cos(yaw)-z*Math.sin(yaw),wz=x*Math.sin(yaw)+z*Math.cos(yaw),sc=Math.max(.68,Math.min(1.25,1-wz*.012));return {x:w*.5+wx*29*sc,y:groundY+wz*12*sc,sc};};
    portals.sort((a,b)=>a.z-b.z).forEach(p=>{const q=project(p.x,p.z),s=q.sc;ctx.save();ctx.globalAlpha=.9;ctx.fillStyle='rgba(7,14,37,.38)';ctx.beginPath();ctx.ellipse(q.x,q.y,42*s,13*s,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=p.colour;ctx.shadowBlur=17;ctx.strokeStyle=p.colour;ctx.lineWidth=7*s;ctx.beginPath();ctx.ellipse(q.x,q.y-48*s,24*s,38*s,0,Math.PI,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;const g=ctx.createLinearGradient(q.x-19*s,q.y-80*s,q.x+19*s,q.y-7*s);g.addColorStop(0,p.colour+'88');g.addColorStop(1,'rgba(255,255,255,.04)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(q.x,q.y-45*s,19*s,32*s,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(12,20,49,.82)';ctx.font=`800 ${Math.max(9,10*s)}px Inter, sans-serif`;ctx.textAlign='center';ctx.fillText(p.label,q.x,q.y+23*s);ctx.restore();});
    // Decorative voxel trees.
    [[-w*.31,groundY-38],[w*.31,groundY-26],[-w*.38,groundY+10],[w*.37,groundY+14]].forEach((p,i)=>{ctx.fillStyle='#78523f';ctx.fillRect(p[0]-5,p[1]-30,10,39);ctx.fillStyle=['#7bd0b1','#ffb5d4','#a4b3f9','#85d9eb'][i];ctx.beginPath();ctx.arc(p[0],p[1]-43,23,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.24)';ctx.beginPath();ctx.arc(p[0]-7,p[1]-51,7,0,Math.PI*2);ctx.fill();});
    // Player position and selected avatar.
    const px=Number(rt.playerX)||0,pz=Number(rt.playerZ)||2.5,player=project(px,pz);const moving=Math.abs(rt.move.x)+Math.abs(rt.move.z)>.05;const action=Date.now()<rt.actionUntil?rt.action:(moving?'walk':'');
    if(window.OrbitLife?.drawAvatarFallback) window.OrbitLife.drawAvatarFallback(ctx,player.x,player.y,1.05*player.sc,t,action);
    else drawOrbitAvatar2D(ctx,player.x,player.y,1.05*player.sc,effectiveAvatarPalette(),avatarPrefs.hat,t,action);
    // Compatibility chip: this is a locally rendered 2.5D mode, not WebGL.
    ctx.fillStyle='rgba(7,14,37,.58)';ctx.fillRect(14,14,135,28);ctx.fillStyle='#c8f4ff';ctx.font='700 10px Inter, sans-serif';ctx.textAlign='left';ctx.fillText('✦ LIGHTWEIGHT WORLD',24,32);
  }
  function renderWorldFallback(){
    const stage=$('on-world-stage'),old=$('on-world-canvas');if(!stage||!old)return;
    const canvas=document.createElement('canvas');canvas.id='on-world-fallback-canvas';canvas.setAttribute('aria-label','Interactive Orbit isometric world. Use WASD or arrow keys to move.');canvas.style.cssText='display:block;width:100%;height:100%;min-height:500px;touch-action:none;outline:none';old.replaceWith(canvas);
    const ctx=canvas.getContext('2d');if(!ctx){stage.insertAdjacentHTML('afterbegin','<div class="on-fallback-world"><div class="on-fallback-avatar">🧑🏻‍🚀</div><h2>Orbit World</h2><p>Canvas graphics are unavailable in this browser.</p></div>');return;}
    const rt={fallback:true,canvas,ctx,width:0,height:0,raf:0,resize:null,move:{x:0,z:0},playerX:0,playerZ:2.5,cameraYaw:0,last:0,drag:null,action:'',actionUntil:0};
    const resize=()=>{const w=Math.max(320,stage.clientWidth),h=Math.max(430,stage.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);rt.width=w;rt.height=h;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};resize();
    if(typeof ResizeObserver!=='undefined'){rt.resize=new ResizeObserver(resize);rt.resize.observe(stage);}
    canvas.addEventListener('pointerdown',e=>{rt.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(rt.drag){rt.cameraYaw+=(e.clientX-rt.drag.x)*.006;rt.drag={x:e.clientX,y:e.clientY};}});
    canvas.addEventListener('pointerup',()=>rt.drag=null);canvas.addEventListener('pointercancel',()=>rt.drag=null);
    worldRuntime=rt;
    const loop=t=>{if(worldRuntime!==rt)return;rt.raf=requestAnimationFrame(loop);const dt=Math.min(.04,(t-rt.last||16)/1000);rt.last=t;const len=Math.hypot(rt.move.x,rt.move.z)||1;if(len>1.01){rt.move.x/=len;rt.move.z/=len;}if(Math.abs(rt.move.x)+Math.abs(rt.move.z)>.05){rt.playerX=Math.max(-9,Math.min(9,rt.playerX+rt.move.x*dt*4));rt.playerZ=Math.max(-8.4,Math.min(8,rt.playerZ+rt.move.z*dt*4));}
      if(!rt.travelling){const ids=LOCATIONS.filter(x=>x.id!=='central').map(x=>x.id);const ring=ids.map((id,i)=>{const a=-Math.PI/2+i/10*Math.PI*2;return {id,x:Math.cos(a)*7.2,z:Math.sin(a)*7.2};});if(worldPrefs.location!=='central')ring.push({id:'central',x:0,z:4.9});
        const hit=ring.find(p=>(rt.playerX-p.x)*(rt.playerX-p.x)+(rt.playerZ-p.z)*(rt.playerZ-p.z)<1.35);
        if(hit){rt.travelling=true;const st=$('on-world-stage');if(st)st.classList.add('portal-flash');setTimeout(()=>{if(st)st.classList.remove('portal-flash');usePortal(hit.id);},380);}}
      drawWorldFallbackFrame(rt,t);};rt.raf=requestAnimationFrame(loop);
  }
  function renderWorldView(){
    const loc=LOCATIONS.find(x=>x.id===worldPrefs.location)||LOCATIONS[0];
    const visited=new Set(worldPrefs.visited||[]);visited.add('central');
    const places=LOCATIONS.map(l=>`<button class="on-world-place ${l.id===loc.id?'active':''}" onclick="OrbitNext.enterWorld('${l.id}')"><span class="emoji">${l.emoji}</span><span><b>${esc(l.name)}</b><small>${esc(l.desc)}</small></span></button>`).join('');
    const activityButton=loc.game?`<button class="on-btn" onclick="OrbitNext.startGame('${loc.game}')">🎮 Play ${loc.activity}</button>`:`<button class="on-btn" onclick="OrbitNext.openIslandDestination('${loc.tab||'missions'}')">✨ ${loc.activity}</button>`;
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">EXPLORE • DISCOVER • PLAY</div><h1>${esc(loc.name)} ${loc.emoji}</h1><p>${esc(loc.detail||loc.desc)} Use WASD or arrow keys to move; on touchscreens use the directional pad. Drag the scene to look around.</p><div class="on-row" style="margin-top:17px"><div class="on-stat"><b>${visited.size}/${LOCATIONS.length}</b><span>ISLANDS VISITED</span></div><div class="on-stat"><b>${unlocked.size}</b><span>BADGES EARNED</span></div><div class="on-stat"><b>${typeof state!=='undefined'?Number(state.xp)||0:0}</b><span>ORBIT XP</span></div></div></section>
      <div class="on-world-layout"><div class="on-world-stage" id="on-world-stage"><canvas id="on-world-canvas" aria-label="Interactive Orbit world. Use WASD or arrow keys to move."></canvas><div class="on-world-hud"><span class="on-world-chip">🧑‍🚀 ${esc(typeof state!=='undefined'?(state.username||'Explorer'):'Explorer')}</span><span class="on-world-chip">${loc.emoji} ${esc(loc.name)}</span><span class="on-world-chip">✨ ${visited.size} discovered</span></div><div class="on-world-bottom"><div class="on-dpad" aria-label="Movement controls"><button class="up" data-move="forward">▲</button><button class="left" data-move="left">◀</button><button class="down" data-move="back">▼</button><button class="right" data-move="right">▶</button></div><div class="on-row"><button class="on-btn cyan" onclick="OrbitNext.emote()">✨ Emote</button><button class="on-btn pink" onclick="OrbitNext.startIslandChallenge()">🧩 Island mission</button></div></div></div>
      <aside class="on-world-side"><section class="on-panel"><b style="font:800 16px Fredoka">🪐 Explore islands</b><div style="display:grid;gap:7px;margin-top:11px">${places}</div></section><section class="on-panel"><b style="font:800 15px Fredoka">🧭 ${esc(loc.activity||'Island activity')}</b><p class="on-world-tip">${esc(loc.detail||loc.desc)}</p><div style="display:grid;gap:8px;margin-top:10px">${activityButton}<button class="on-btn soft" onclick="OrbitNext.startIslandChallenge()">🧩 Start island challenge</button><button class="on-btn soft" onclick="switchTab('focustimer')">⏱️ Focus Timer</button><button class="on-btn soft" onclick="switchTab('trophies')">🏆 Trophy Galaxy</button></div></section><p class="on-world-tip">World movement is local to this device. The WebGL scene uses Three.js when available; a lightweight canvas scene is used if WebGL is unavailable.</p></aside></div></div>`;
  }
  function mountWorld(){
    const loc=LOCATIONS.find(x=>x.id===worldPrefs.location)||LOCATIONS[0];
    if(!worldPrefs.visited.includes(loc.id)){worldPrefs.visited.push(loc.id);write(STORAGE.world,worldPrefs);increment('world_visits');setMetric('unique_worlds',new Set(worldPrefs.visited).size);if(loc.id==='market')increment('market_visits');}
    buildWorld3D();
    document.querySelectorAll('[data-move]').forEach(btn=>{
      const dir=btn.dataset.move;const vec={forward:[0,-1],back:[0,1],left:[-1,0],right:[1,0]}[dir];
      const down=e=>{e.preventDefault();if(worldRuntime)worldRuntime.move={x:vec[0],z:vec[1]};};
      const up=()=>{if(worldRuntime)worldRuntime.move={x:0,z:0};};
      btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointerleave',up);btn.addEventListener('pointercancel',up);
    });
  }
  function enterWorld(id){if(!LOCATIONS.some(x=>x.id===id))return;worldPrefs.location=id;write(STORAGE.world,worldPrefs);disposeWorld();renderCurrentView();}

  const ISLAND_QUESTIONS={
    math:[{q:'What is 7 × 8?',a:['54','56','64','48'],c:1,e:'7 × 8 = 56.'},{q:'Solve: x + 9 = 17.',a:['6','7','8','9'],c:2,e:'Subtract 9 from both sides: x = 8.'},{q:'What is 2³?',a:['6','8','9','12'],c:1,e:'2 × 2 × 2 = 8.'}],
    science:[{q:'Which process moves heat through liquids by movement?',a:['Conduction','Convection','Reflection','Freezing'],c:1,e:'Convection transfers heat through the movement of a fluid.'},{q:'Which gas do plants use in photosynthesis?',a:['Oxygen','Nitrogen','Carbon dioxide','Hydrogen'],c:2,e:'Plants use carbon dioxide and water to make food.'},{q:'Which force pulls objects towards Earth?',a:['Friction','Magnetism','Gravity','Buoyancy'],c:2,e:'Gravity attracts objects with mass.'}],
    words:[{q:'Which word is an adjective?',a:['Quickly','Beautiful','Run','Yesterday'],c:1,e:'Beautiful describes a noun, so it is an adjective.'},{q:'What does “once in a blue moon” mean?',a:['Very often','Very rarely','At noon','Every day'],c:1,e:'The idiom means something happens very rarely.'},{q:'Choose the correct plural of “child”.',a:['Childs','Childes','Children','Childrens'],c:2,e:'The plural of child is children.'}],
    history:[{q:'The Chola dynasty was mainly associated with which region?',a:['Tamil region','Kashmir valley','Punjab plains','Bengal delta'],c:0,e:'The Cholas were a major dynasty in the Tamil region.'},{q:'What is an inscription?',a:['A written record carved on a surface','A type of coin','A musical instrument','A farming tool'],c:0,e:'Inscriptions are records written or carved on durable surfaces.'},{q:'Who commissioned the Rajarajeshvara temple at Thanjavur?',a:['Rajaraja I','Ashoka','Harsha','Akbar'],c:0,e:'Rajaraja I commissioned the famous temple.'}],
    geo:[{q:'Which is the largest ocean?',a:['Atlantic','Indian','Pacific','Arctic'],c:2,e:'The Pacific is the largest ocean.'},{q:'The continuous movement of water between Earth and air is the…',a:['Rock cycle','Water cycle','Carbon cycle','Life cycle'],c:1,e:'The water cycle includes evaporation, condensation and precipitation.'},{q:'Which imaginary line divides Earth into Northern and Southern Hemispheres?',a:['Prime Meridian','Equator','Tropic of Cancer','International Date Line'],c:1,e:'The Equator is at 0° latitude.'}]
  };
  let islandChallenge=null;
  function startIslandChallenge(){
    const loc=LOCATIONS.find(x=>x.id===worldPrefs.location)||LOCATIONS[0];
    const source=ISLAND_QUESTIONS[loc.id]||ISLAND_QUESTIONS.math;
    islandChallenge={id:loc.id,questions:source.slice(),index:0,score:0,locked:false};
    renderIslandChallenge();
  }
  function renderIslandChallenge(){
    if(!islandChallenge)return;
    const q=islandChallenge.questions[islandChallenge.index];
    const old=$('on-island-quiz');if(old)old.remove();
    const el=document.createElement('div');el.id='on-island-quiz';el.className='on-pop';
    el.innerHTML=`<div class="on-pop-card" style="max-width:560px;text-align:left"><div class="on-row" style="justify-content:space-between"><span class="on-pill">${esc((LOCATIONS.find(x=>x.id===islandChallenge.id)||LOCATIONS[0]).name)} mission</span><button class="on-btn soft" onclick="OrbitNext.closeIslandChallenge()">✕</button></div><h2 style="font:900 24px Fredoka;margin:14px 0">${islandChallenge.index+1} / ${islandChallenge.questions.length} · ${esc(q.q)}</h2><div style="display:grid;gap:8px">${q.a.map((a,i)=>`<button class="on-answer" onclick="OrbitNext.answerIslandChallenge(${i})">${String.fromCharCode(65+i)}. ${esc(a)}</button>`).join('')}</div><p class="on-muted" style="margin-top:14px">Correct answers earn a small daily-limited bonus. Read the explanation after each question.</p></div>`;
    document.body.appendChild(el);
  }
  function answerIslandChallenge(choice){
    if(!islandChallenge||islandChallenge.locked)return;
    const q=islandChallenge.questions[islandChallenge.index];if(!q||choice<0||choice>=q.a.length)return;
    islandChallenge.locked=true;const ok=choice===q.c;if(ok)islandChallenge.score++;
    showModal(ok?'Correct!':'Good try!',ok?'✅':'💡',q.e);
    islandChallenge.index++;
    if(islandChallenge.index>=islandChallenge.questions.length){
      const finished=islandChallenge;islandChallenge=null;const old=$('on-island-quiz');if(old)old.remove();
      if(finished.score>=2){increment('learning_activities');increment('island_challenges');awardCoins(6,'Island challenge completed');showModal('Island mission complete!','🌟',`You answered ${finished.score} out of ${finished.questions.length} correctly. Your island progress has been recorded.`);}
      else showModal('Mission finished','🧭',`You answered ${finished.score} out of ${finished.questions.length} correctly. Revisit this island to practise again.`);
      return;
    }
    islandChallenge.locked=false;renderIslandChallenge();
  }
  function closeIslandChallenge(){islandChallenge=null;const el=$('on-island-quiz');if(el)el.remove();}
  function openIslandDestination(tab){const safe=['studyboard','courses','planner','avatar','boss','flashcards','arcade','trophies','shop','lingua','missions'];switchTab(safe.includes(tab)?tab:'missions');}
  function usePortal(id){const loc=LOCATIONS.find(x=>x.id===id);if(!loc)return;const here=worldPrefs.location===id;showToast(here?`${loc.activity}…`:`Travelling to ${loc.name}…`,loc.emoji);if(here){if(loc.game)startGame(loc.game);else openIslandDestination(loc.tab||'missions');}else enterWorld(id);}
  function emote(){if(worldRuntime){worldRuntime.action='wave';worldRuntime.actionUntil=Date.now()+1100;}if(avatarRuntime){avatarRuntime.action='wave';avatarRuntime.actionUntil=Date.now()+1100;}increment('emotes_used');showToast('Your Orbit character waved hello!','👋');}
  window.addEventListener('keydown',e=>{
    if(typeof state==='undefined'||state.activeTab!=='orbitworld')return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    const map={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
    const dir=map[e.key];if(dir&&worldRuntime){e.preventDefault();const v={forward:[0,-1],back:[0,1],left:[-1,0],right:[1,0]}[dir];worldRuntime.move={x:v[0],z:v[1]};}
  });
  window.addEventListener('keyup',e=>{if(worldRuntime&&typeof state!=='undefined'&&state.activeTab==='orbitworld'&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))worldRuntime.move={x:0,z:0};});

  // ---------------------- TROPHY GALAXY ----------------------
  let badgeFilter='All';
  function renderTrophies(){
    const categories=['All',...badgeGroups.map(g=>g.category)];
    const total=BADGES.length,earned=unlocked.size;
    const filtered=BADGES.filter(b=>(badgeFilter==='All'||b.category===badgeFilter));
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">YOUR ACHIEVEMENTS</div><h1>Trophy Galaxy 🏅</h1><p>Every badge represents something you have actually done in Orbit. Keep learning, exploring and improving to complete your collection.</p><div class="on-row" style="margin-top:17px"><div class="on-stat"><b>${earned}/${total}</b><span>BADGES UNLOCKED</span></div><div class="on-stat"><b>${Math.round(earned/total*100)}%</b><span>COLLECTION</span></div><div class="on-stat"><b>${BADGES.filter(b=>unlocked.has(b.id)&&b.rarity==='Legendary').length}</b><span>LEGENDARY</span></div></div><div class="on-progress" style="height:8px;margin-top:18px;background:rgba(255,255,255,.2)"><span style="width:${earned/total*100}%;background:linear-gradient(90deg,#78edeb,#ffe28b)"></span></div></section><div class="on-section-title"><div><h2>Achievement collection</h2><p>Browse by category and see how close you are.</p></div><span class="on-pill">${total} achievements</span></div><div class="on-category-tabs">${categories.map(c=>`<button class="on-tab ${badgeFilter===c?'active':''}" onclick="OrbitNext.filterBadges('${c}')">${c}</button>`).join('')}</div><div class="on-grid">${filtered.map(b=>{const got=unlocked.has(b.id),n=badgeProgress(b);return `<article class="on-badge rarity-${b.rarity} ${got?'':'locked'}"><div class="on-badge-icon">${got?b.icon:'🔒'}</div><div class="on-row" style="justify-content:space-between"><span class="on-rarity">${b.rarity}</span><span class="on-muted">${got?'Unlocked':'Locked'}</span></div><h3>${esc(b.name)}</h3><p>${esc(b.desc)}</p><div class="on-muted">${got?'Completed':`${n} / ${b.target} progress`}</div><div class="on-progress"><span style="width:${n/b.target*100}%"></span></div></article>`;}).join('')}</div></div>`;
  }
  function filterBadges(c){badgeFilter=c;renderCurrentView();}

  // ---------------------- FOCUS TIMER ----------------------
  function remainingSeconds(){
    if(focusState.status==='running'||focusState.status==='break')return Math.max(0,Math.ceil((focusState.endsAt-Date.now())/1000));
    return Math.max(0,Number(focusState.remaining)||0);
  }
  function formatTime(sec){const n=Math.max(0,Math.floor(sec));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function renderFocusTimer(){
    const rem=remainingSeconds(),dur=focusState.duration||1500,progress=Math.max(0,Math.min(1,1-rem/dur));
    const todaySessions=sessions.filter(s=>s.date===today()&&s.type==='focus').length;
    const totalMin=Math.floor(sessions.filter(s=>s.type==='focus').reduce((a,s)=>a+s.minutes,0));
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">MAKE YOUR TIME COUNT</div><h1>Orbit Focus ⏱️</h1><p>A calm space for focused study. Set a duration, choose a subject and let the Orbit timer keep your session on track.</p><div class="on-row" style="margin-top:15px"><div class="on-stat"><b>${todaySessions}</b><span>SESSIONS TODAY</span></div><div class="on-stat"><b>${totalMin}</b><span>TOTAL FOCUS MIN</span></div><div class="on-stat"><b>${sessions.length}</b><span>RECORDED SESSIONS</span></div></div></section>
      <section class="on-panel" style="margin-top:15px"><div class="on-timer-wrap"><div><div class="on-timer-ring" id="on-timer-ring" style="--progress:${progress*360}deg"><div class="on-timer-inner"><div class="on-timer-planet">🪐</div><div class="on-timer-time" id="on-focus-time">${formatTime(rem)}</div><div class="on-muted" id="on-focus-status">${focusState.status==='running'?'FOCUS IN PROGRESS':focusState.status==='paused'?'PAUSED':'READY WHEN YOU ARE'}</div><div class="on-pill" style="margin-top:8px" id="on-focus-subject">${esc(focusState.subject||'General study')}</div></div></div></div><div class="on-timer-controls"><h2 style="font:900 22px Fredoka;margin:0 0 12px">Set up your session</h2><div class="on-muted" style="margin-bottom:7px">Quick durations</div><div class="on-row">${[15,25,30,45,60].map(m=>`<button class="on-preset ${timerChosenDuration===m*60?'active':''}" onclick="OrbitNext.setDuration(${m})">${m} min</button>`).join('')}</div><div class="on-row" style="margin-top:13px"><div style="flex:1"><label class="on-muted">Custom duration (minutes)</label><input class="on-field" id="on-custom-duration" type="number" min="5" max="120" step="5" value="${Math.round(timerChosenDuration/60)}"></div><div style="flex:1"><label class="on-muted">Subject</label><select class="on-field" id="on-focus-subject-select"><option ${focusState.subject==='General study'?'selected':''}>General study</option>${['Mathematics','Science','English','History','Geography','Computer Science','Hindi','Language learning','Reading'].map(s=>`<option ${focusState.subject===s?'selected':''}>${s}</option>`).join('')}</select></div></div><div style="margin-top:10px"><label class="on-muted">What are you working on? (optional)</label><input class="on-field" id="on-focus-task" maxlength="90" value="${esc(focusState.task||'')}" placeholder="e.g. Revise Chapter 5"></div><div class="on-row" style="margin-top:16px"><button class="on-btn" id="on-focus-primary" onclick="OrbitNext.focusPrimary()">${focusState.status==='running'?'Pause':focusState.status==='paused'?'Resume':'Start focus'}</button><button class="on-btn soft" onclick="OrbitNext.resetFocus()">Reset</button><button class="on-btn cyan" onclick="OrbitNext.startBreak()">Start 5-min break</button></div><p class="on-muted" style="margin-top:12px">The timer uses an end timestamp, so it stays accurate if you switch Orbit pages or temporarily lock your screen. Background notifications depend on device and browser permissions.</p></div></div></section>
      <div class="on-section-title"><div><h2>Recent sessions</h2><p>Your focus history is saved on this device.</p></div></div><section class="on-panel">${sessions.length?sessions.slice(0,8).map(s=>`<div class="on-row" style="justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border-subtle)"><span><b style="font-size:13px">${esc(s.subject)}</b><span class="on-muted"> · ${esc(s.date)}</span></span><span class="on-pill">${s.minutes} min</span></div>`).join(''):'<p class="on-muted">Your completed focus sessions will appear here.</p>'}</section></div>`;
  }
  function updateFocusDisplay(){
    const rem=remainingSeconds(),time=$('on-focus-time'),ring=$('on-timer-ring'),status=$('on-focus-status'),subject=$('on-focus-subject'),primary=$('on-focus-primary');
    if(time)time.textContent=formatTime(rem);
    if(ring)ring.style.setProperty('--progress',`${Math.max(0,Math.min(1,1-rem/(focusState.duration||1500)))*360}deg`);
    if(status)status.textContent=focusState.status==='running'?'FOCUS IN PROGRESS':focusState.status==='paused'?'PAUSED':focusState.status==='break'?'BREAK TIME':'READY WHEN YOU ARE';
    if(subject)subject.textContent=focusState.subject||'General study';
    if(primary)primary.textContent=focusState.status==='running'?'Pause':focusState.status==='paused'?'Resume':'Start focus';
    if(focusState.status==='running'&&rem<=0)completeFocus();
    if(focusState.status==='break'&&rem<=0)finishBreak();
  }
  function persistFocus(){write(STORAGE.focus,focusState);}
  function setDuration(minutes){if(focusState.status==='running'||focusState.status==='paused')return showToast('Reset the current timer before changing its duration.','⏱️');timerChosenDuration=safeNumber(minutes,5,120,25)*60;focusState.duration=timerChosenDuration;focusState.remaining=timerChosenDuration;persistFocus();renderCurrentView();}
  function startFocus(){
    const custom=$('on-custom-duration'),subject=$('on-focus-subject-select'),task=$('on-focus-task');
    const mins=safeNumber(custom?.value||timerChosenDuration/60,5,120,Math.round(timerChosenDuration/60));
    timerChosenDuration=mins*60;
    focusState={status:'running',duration:timerChosenDuration,remaining:timerChosenDuration,endsAt:Date.now()+timerChosenDuration*1000,subject:subject?.value||'General study',task:task?.value.trim()||'',startedAt:Date.now(),sessionId:`focus-${Date.now()}`};persistFocus();if(!focusTicker)focusTicker=setInterval(updateFocusDisplay,1000);
    const durations=read('orbit_next_used_durations',[]);if(!durations.includes(mins)){durations.push(mins);write('orbit_next_used_durations',durations);setMetric('timer_durations',durations.length);}
    showToast('Focus session started. You have got this!','🚀');renderCurrentView();
  }
  function pauseFocus(){if(focusState.status!=='running')return;focusState.remaining=remainingSeconds();focusState.status='paused';focusState.endsAt=0;persistFocus();if(focusTicker){clearInterval(focusTicker);focusTicker=null;}renderCurrentView();}
  function resumeFocus(){if(focusState.status!=='paused')return;focusState.status='running';focusState.endsAt=Date.now()+focusState.remaining*1000;persistFocus();if(!focusTicker)focusTicker=setInterval(updateFocusDisplay,1000);renderCurrentView();}
  function focusPrimary(){if(focusState.status==='running')pauseFocus();else if(focusState.status==='paused')resumeFocus();else startFocus();}
  function completeFocus(){
    if(focusState.status!=='running')return;
    const duration=Math.round((focusState.duration||0)/60),date=today();
    focusState.status='idle';focusState.remaining=0;focusState.endsAt=0;persistFocus();if(focusTicker){clearInterval(focusTicker);focusTicker=null;}
    const session={type:'focus',date,minutes:duration,subject:focusState.subject||'General study',task:focusState.task||'',completedAt:Date.now()};sessions.unshift(session);sessions.splice(100);write(STORAGE.sessions,sessions);
    increment('focus_sessions');increment('learning_activities');
    const subjects=Array.isArray(read('orbit_next_subjects',[]))?read('orbit_next_subjects',[]):[];
    if(session.subject&&!subjects.includes(session.subject)){subjects.push(session.subject);write('orbit_next_subjects',subjects);setMetric('subjects',subjects.length);}
    if(duration>=25){increment('long_focus_sessions');}if(duration>=30){increment('thirty_min_focus_sessions');}
    const cutoff=Date.now()-7*86400000;const weekly=sessions.filter(s=>s.type==='focus'&&Number(s.completedAt||new Date(s.date+'T00:00:00').getTime())>=cutoff&&Number(s.completedAt||0)<=Date.now()).length;setMetric('weekly_sessions',weekly);
    const month=sessions.filter(s=>s.type==='focus'&&s.date.slice(0,7)===date.slice(0,7)).length;setMetric('monthly_sessions',month);
    const usedDays=new Set(sessions.filter(s=>s.type==='focus').map(s=>s.date));setMetric('study_days',usedDays.size);
    if(duration>=15){const daily=Number(localStorage.getItem('orbit_next_focus_rewards_'+date)||0);if(daily<3){awardCoins(5,'Focus session completed');localStorage.setItem('orbit_next_focus_rewards_'+date,String(daily+1));}}
    showModal('Focus session complete!','🌟',`${duration} minutes of focused ${focusState.subject||'study'} time recorded. Take a short break, stretch and enjoy your progress.`);
    renderCurrentView();
  }
  function resetFocus(){focusState.status='idle';focusState.remaining=focusState.duration;focusState.endsAt=0;focusState.startedAt=0;persistFocus();if(focusTicker){clearInterval(focusTicker);focusTicker=null;}renderCurrentView();}
  function startBreak(){if(focusState.status==='running'||focusState.status==='paused')return showToast('Pause or reset your focus session before starting a break.','⏱️');focusState={status:'break',duration:300,remaining:300,endsAt:Date.now()+300000,subject:'Break',task:'Rest and recharge',startedAt:Date.now(),sessionId:`break-${Date.now()}`};persistFocus();if(!focusTicker)focusTicker=setInterval(updateFocusDisplay,1000);showToast('Your five-minute break has started.','🌿');renderCurrentView();}
  function finishBreak(){focusState.status='idle';focusState.remaining=focusState.duration;focusState.endsAt=0;persistFocus();if(focusTicker){clearInterval(focusTicker);focusTicker=null;}increment('breaks_taken');showToast('Break complete. Ready for another session?','✨');renderCurrentView();}
  if(focusState.status==='running'&&remainingSeconds()<=0)completeFocus();
  if(focusState.status==='break'&&remainingSeconds()<=0)finishBreak();
  if(focusState.status==='running'||focusState.status==='break')focusTicker=setInterval(updateFocusDisplay,1000);

  // ---------------------- AVATAR STUDIO ----------------------
  function mountAvatar2DFallback(oldCanvas,stage){
    if(!oldCanvas||!stage)return;
    const canvas=document.createElement('canvas');canvas.id='on-avatar-canvas';canvas.setAttribute('aria-label','Cute block-style Orbit avatar preview');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y';oldCanvas.replaceWith(canvas);
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const rt={fallback:true,canvas,ctx,raf:0,resize:null,action:'',actionUntil:0,yaw:0};
    const resize=()=>{const w=Math.max(260,stage.clientWidth),h=Math.max(300,stage.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);rt.width=w;rt.height=h;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};resize();
    if(typeof ResizeObserver!=='undefined'){rt.resize=new ResizeObserver(resize);rt.resize.observe(stage);}
    let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX};canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag){rt.yaw+=(e.clientX-drag.x)*.008;drag.x=e.clientX;}});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
    avatarRuntime=rt;
    const loop=t=>{if(avatarRuntime!==rt)return;rt.raf=requestAnimationFrame(loop);const w=rt.width,h=rt.height;ctx.clearRect(0,0,w,h);const bg=ctx.createRadialGradient(w*.5,h*.32,12,w*.5,h*.5,Math.max(w,h)*.7);bg.addColorStop(0,'#ffffff');bg.addColorStop(.48,'#dceaff');bg.addColorStop(1,'#91b5ec');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(37,70,139,.12)';ctx.beginPath();ctx.ellipse(w*.5,h*.81,100,18,0,0,Math.PI*2);ctx.fill();const action=Date.now()<rt.actionUntil?rt.action:'';ctx.save();ctx.translate(w*.5,h*.82);ctx.transform(Math.cos(rt.yaw)*1.0,0,Math.sin(rt.yaw)*.22,1,0,0);ctx.translate(-w*.5,-h*.82);((window.OrbitLife&&OrbitLife.drawAvatarFallback)?OrbitLife.drawAvatarFallback(ctx,w*.5,h*.82,1.0,t,action):drawOrbitAvatar2D(ctx,w*.5,h*.82,1.0,effectiveAvatarPalette(),avatarPrefs.hat,t,action));ctx.restore();};rt.raf=requestAnimationFrame(loop);
    const fallback=$('on-avatar-fallback');if(fallback)fallback.style.display='none';
  }
  function mountAvatar3D(){
    const canvas=$('on-avatar-canvas'),stage=canvas?.parentElement;if(!canvas)return;
    if(!window.THREE){mountAvatar2DFallback(canvas,stage);return;}
    const THREE=window.THREE;let renderer;try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch(_){mountAvatar2DFallback(canvas,stage);return;}
    const w=Math.max(260,stage.clientWidth),h=Math.max(300,stage.clientHeight);canvas.style.width='100%';canvas.style.height='100%';canvas.style.position='absolute';canvas.style.inset='0';canvas.style.display='block';renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(w,h,false);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,w/h,.1,50);camera.position.set(0,2.55,8.1);camera.lookAt(0,1.55,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0x7785aa,2.4));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,7,5);scene.add(light);
    const model=(window.OrbitLife?.buildAvatarModel?.(THREE))||buildCuteAvatar(THREE);scene.add(model);model.position.y=-.12;
    const ground=new THREE.Mesh(new THREE.CircleGeometry(1.65,48),new THREE.MeshBasicMaterial({color:0x8a9ddd,transparent:true,opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;scene.add(ground);
    const rt={renderer,scene,camera,model,raf:0,resize:null,action:'',actionUntil:0};rt.resize=new ResizeObserver(()=>{const ww=Math.max(260,stage.clientWidth),hh=Math.max(300,stage.clientHeight);renderer.setSize(ww,hh,false);camera.aspect=ww/hh;camera.updateProjectionMatrix();});rt.resize.observe(stage);avatarRuntime=rt;
    const loop=t=>{if(avatarRuntime!==rt)return;rt.raf=requestAnimationFrame(loop);const action=Date.now()<rt.actionUntil?rt.action:'';model.rotation.y=action==='dance'?Math.sin(t*.003)*.55:Math.sin(t*.00045)*.3;model.position.y=-.12+(action==='dance'?Math.abs(Math.sin(t*.012))*.11:Math.sin(t*.002)*.035);model.userData.head.rotation.y=Math.sin(t*.0012)*.04;for(const limb of (model.userData.limbs||[])){if(limb.type==='arm'){limb.part.rotation.x=0;limb.part.rotation.z=action==='wave'&&limb.side===1?2.15+Math.sin(t*.018)*.22:action==='dance'?Math.sin(t*.014+limb.side)*.92:0;}else{limb.part.rotation.x=0;limb.part.rotation.z=action==='dance'?Math.sin(t*.014+limb.side)*.28:0;}}rt.renderer.render(scene,camera);};rt.raf=requestAnimationFrame(loop);
    const fallback=$('on-avatar-fallback');if(fallback)fallback.style.display='none';
  }
  function renderAvatarStudio(){
    const paletteChoices=PALETTES.map((c,i)=>`<button class="on-choice ${i===avatarPrefs.palette?'active':''}" onclick="OrbitNext.setPalette(${i})"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#${c.shirt.toString(16).padStart(6,'0')};vertical-align:middle;margin-right:5px"></span>${esc(c.name)}</button>`).join('');
    const saved=savedOutfits.slice(0,8).map(o=>`<button class="on-choice" onclick="OrbitNext.loadOutfit('${esc(o.id)}')">${esc(PALETTES[safeNumber(o.palette,0,9,0)].name)} · ${esc(HAT_STYLES[safeNumber(o.hat,0,7,0)])}</button>`).join('');
    const choices=(list,key,current,method)=>list.map((item,i)=>`<button class="on-choice ${current===i?'active':''}" onclick="OrbitNext.${method}(${i})">${esc(item)}</button>`).join('');
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">YOUR CHARACTER, YOUR STYLE</div><h1>Avatar Studio ✨</h1><p>Build an original cute Orbit character. Mix colour palettes, hairstyles, outfits, accessories and headwear, then save favourite looks.</p><div class="on-row" style="margin-top:14px"><div class="on-stat"><b>${PALETTES.length}</b><span>COLOUR STYLES</span></div><div class="on-stat"><b>${HAIR_STYLES.length}</b><span>HAIRSTYLES</span></div><div class="on-stat"><b>${OUTFITS.length}</b><span>OUTFITS</span></div></div></section>
      <div class="on-grid on-avatar-layout" style="grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);margin-top:15px"><section class="on-panel"><div class="on-avatar-stage"><canvas id="on-avatar-canvas" aria-label="Rotating cute Orbit block character"></canvas><div class="on-avatar-placeholder" id="on-avatar-fallback" style="position:absolute;pointer-events:none">🧑🏻‍🚀</div></div><div class="on-row" style="justify-content:center;margin-top:12px"><button class="on-btn" onclick="OrbitNext.emote()">👋 Wave</button><button class="on-btn pink" onclick="OrbitNext.avatarDance()">💃 Celebrate</button></div><p class="on-muted" style="text-align:center;margin-top:8px">Your look is saved locally on this device.</p></section>
      <section class="on-panel"><h2 style="font:900 21px Fredoka;margin:0 0 7px">Character appearance</h2><div class="on-muted">Colour palette</div><div class="on-row">${paletteChoices}</div>
      <div class="on-muted" style="margin:16px 0 7px">Hairstyle</div><div class="on-row">${choices(HAIR_STYLES,'hair',avatarPrefs.hair||0,'setHair')}</div>
      <div class="on-muted" style="margin:16px 0 7px">Outfit</div><div class="on-row">${choices(OUTFITS.map(x=>x.name),'outfit',avatarPrefs.outfit||0,'setOutfit')}</div>
      <div class="on-muted" style="margin:16px 0 7px">Headwear</div><div class="on-row">${choices(HAT_STYLES,'hat',avatarPrefs.hat||0,'setHat')}</div>
      <div class="on-muted" style="margin:16px 0 7px">Accessory</div><div class="on-row">${choices(ACCESSORIES,'accessory',avatarPrefs.accessory||0,'setAccessory')}</div>
      <div class="on-muted" style="margin:16px 0 7px">Face expression</div><div class="on-row">${choices(['Happy','Sleepy','Excited'],'face',avatarPrefs.face||0,'setFace')}</div>
      <div class="on-muted" style="margin:18px 0 7px">Saved looks (${savedOutfits.length}/12)</div><button class="on-btn cyan" onclick="OrbitNext.saveOutfit()">💾 Save this outfit</button><div class="on-row" style="margin-top:9px">${saved||'<span class="on-muted">Your favourite looks will appear here.</span>'}</div></section></div></div>`;
  }
  function setPalette(i){avatarPrefs.palette=safeNumber(i,0,9,0);write(STORAGE.avatar,avatarPrefs);showToast('Character colours updated.','🎨');renderCurrentView();}
  function setHat(i){avatarPrefs.hat=safeNumber(i,0,7,0);write(STORAGE.avatar,avatarPrefs);renderCurrentView();}
  function setHair(i){avatarPrefs.hair=safeNumber(i,0,5,0);write(STORAGE.avatar,avatarPrefs);renderCurrentView();}
  function setOutfit(i){avatarPrefs.outfit=safeNumber(i,0,5,0);write(STORAGE.avatar,avatarPrefs);renderCurrentView();}
  function setAccessory(i){avatarPrefs.accessory=safeNumber(i,0,5,0);write(STORAGE.avatar,avatarPrefs);renderCurrentView();}
  function setFace(i){avatarPrefs.face=safeNumber(i,0,2,0);write(STORAGE.avatar,avatarPrefs);renderCurrentView();}
  function saveOutfit(){
    const signature=`${avatarPrefs.palette}:${avatarPrefs.hair}:${avatarPrefs.outfit}:${avatarPrefs.hat}:${avatarPrefs.accessory}:${avatarPrefs.face}`;
    if(savedOutfits.some(o=>`${o.palette}:${o.hair||0}:${o.outfit||0}:${o.hat}:${o.accessory||0}:${o.face||0}`===signature)){showToast('This outfit is already saved.','👕');return;}
    if(savedOutfits.length>=12)savedOutfits.pop();
    savedOutfits.unshift({id:`outfit-${Date.now()}`,palette:avatarPrefs.palette,hair:avatarPrefs.hair||0,outfit:avatarPrefs.outfit||0,hat:avatarPrefs.hat,accessory:avatarPrefs.accessory||0,face:avatarPrefs.face||0,createdAt:Date.now()});
    write('orbit_next_saved_outfits',savedOutfits);increment('outfits_saved');showToast('New outfit saved!','👕');renderCurrentView();
  }
  function loadOutfit(id){const outfit=savedOutfits.find(o=>o.id===id);if(!outfit)return;avatarPrefs.palette=safeNumber(outfit.palette,0,9,0);avatarPrefs.hair=safeNumber(outfit.hair,0,5,0);avatarPrefs.outfit=safeNumber(outfit.outfit,0,5,0);avatarPrefs.hat=safeNumber(outfit.hat,0,7,0);avatarPrefs.accessory=safeNumber(outfit.accessory,0,5,0);avatarPrefs.face=safeNumber(outfit.face,0,2,0);write(STORAGE.avatar,avatarPrefs);renderCurrentView();showToast('Outfit equipped.','✨');}
  function avatarDance(){if(worldRuntime){worldRuntime.action='dance';worldRuntime.actionUntil=Date.now()+1800;}if(avatarRuntime){avatarRuntime.action='dance';avatarRuntime.actionUntil=Date.now()+1800;}showToast('Orbit celebration! Your character is dancing.','🎉');}

  // ---------------------- ARCADE ----------------------
  const GAME_META=[
    {id:'equation',name:'Equation Rush',type:'Study game',emoji:'🧮',desc:'Solve quick maths questions to charge your space gates.',color:'linear-gradient(135deg,#3454b7,#6f9dec)'},
    {id:'memory',name:'Memory Galaxy',type:'Study game',emoji:'🧠',desc:'Match terms and definitions before the board fills your memory.',color:'linear-gradient(135deg,#7952bd,#c48ce9)'},
    {id:'word',name:'Word Forge',type:'Study game',emoji:'🔤',desc:'Unscramble useful vocabulary and unlock word stars.',color:'linear-gradient(135deg,#2c917f,#6bd7bb)'},
    {id:'world',name:'World Explorer',type:'Study game',emoji:'🌍',desc:'Explore geography through maps, capitals and world facts.',color:'linear-gradient(135deg,#167f95,#72c7d7)'},
    {id:'timeline',name:'Timeline Quest',type:'Study game',emoji:'📜',desc:'Use clues to place important events in the correct order.',color:'linear-gradient(135deg,#a46a37,#e8b36a)'},
    {id:'asteroid',name:'Asteroid Escape',type:'Relax game',emoji:'🚀',desc:'Steer your little ship through a field of drifting asteroids.',color:'linear-gradient(135deg,#182b59,#6c65c8)'},
    {id:'runner',name:'Orbit Runner',type:'Relax game',emoji:'🏃',desc:'Switch lanes, dodge space gates and collect stardust.',color:'linear-gradient(135deg,#3e3c96,#9a72e7)'},
    {id:'builder',name:'Galaxy Builder',type:'Creative game',emoji:'🧱',desc:'Create a tiny colourful space island and save your design.',color:'linear-gradient(135deg,#25836f,#8bd69f)'}
  ];
  const EQUATIONS=[
    {q:'Solve: x + 7 = 15',a:['6','7','8','9'],c:2,e:'Subtract 7 from both sides: x = 8.'},
    {q:'What is 6 × 7?',a:['36','40','42','48'],c:2,e:'6 multiplied by 7 equals 42.'},
    {q:'Simplify: 2³ × 2²',a:['2⁵','2⁶','4⁵','2'],c:0,e:'For the same base, add exponents: 3 + 2 = 5.'},
    {q:'What is 25% of 80?',a:['10','15','20','25'],c:2,e:'25% is one quarter, and 80 ÷ 4 = 20.'},
    {q:'Solve: 3x = 27',a:['6','7','8','9'],c:3,e:'Divide both sides by 3: x = 9.'},
    {q:'What is 9²?',a:['18','72','81','99'],c:2,e:'9 × 9 = 81.'},
    {q:'Which is the smallest?',a:['0.5','0.05','0.55','0.505'],c:1,e:'0.05 is five hundredths, smaller than the others.'},
    {q:'Find the perimeter of a square with side 5 cm.',a:['10 cm','15 cm','20 cm','25 cm'],c:2,e:'Perimeter = 4 × side = 20 cm.'}
  ];
  const WORDS=[['curious','Eager to learn or know something.'],['orbit','The path one object follows around another.'],['ancient','Belonging to the very distant past.'],['observe','To watch carefully and notice details.'],['journey','An act of travelling from one place to another.'],['brilliant','Very clever or exceptionally bright.'],['gravity','The force that attracts objects toward one another.'],['habitat','The natural home of an organism.']];
  const WORLD_QUESTIONS=[
    {q:'Which is the largest ocean on Earth?',a:['Atlantic','Indian','Pacific','Arctic'],c:2,e:'The Pacific Ocean is the largest ocean on Earth.'},
    {q:'What is the capital of Japan?',a:['Seoul','Tokyo','Beijing','Bangkok'],c:1,e:'Tokyo is the capital of Japan.'},
    {q:'Which continent is the Sahara Desert in?',a:['Asia','Africa','Australia','Europe'],c:1,e:'The Sahara is in northern Africa.'},
    {q:'Which imaginary line divides Earth into Northern and Southern Hemispheres?',a:['Prime Meridian','Equator','Tropic of Cancer','Arctic Circle'],c:1,e:'The Equator divides the Northern and Southern Hemispheres.'},
    {q:'Which is the smallest continent by land area?',a:['Europe','Antarctica','Australia','South America'],c:2,e:'Australia is the smallest continent by land area.'},
    {q:'Which river flows through Egypt?',a:['Amazon','Nile','Danube','Thames'],c:1,e:'The Nile is strongly associated with Egypt and northeastern Africa.'},
    {q:'Mount Everest is part of which mountain range?',a:['Andes','Alps','Himalayas','Rockies'],c:2,e:'Mount Everest is in the Himalayas.'},
    {q:'What is the capital of France?',a:['Madrid','Rome','Paris','Lisbon'],c:2,e:'Paris is the capital of France.'}
  ];
  const TIMELINE_QUESTIONS=[
    {q:'Which came earliest in ancient Indian history?',a:['Maurya Empire','Gupta Empire','Mughal Empire','Delhi Sultanate'],c:0,e:'The Maurya Empire began around the 4th century BCE, before the others.'},
    {q:'Which came first?',a:['Construction of the Taj Mahal','Akbar becomes Mughal emperor','First Battle of Panipat','Shah Jahan becomes emperor'],c:2,e:'The First Battle of Panipat took place in 1526.'},
    {q:'Which event happened first?',a:['First powered flight by the Wright brothers','First Moon landing','Internet becomes widely used','First modern Olympic Games'],c:3,e:'The first modern Olympic Games were held in 1896.'},
    {q:'Which came earliest?',a:['End of World War II','Start of World War I','First Moon landing','Fall of the Berlin Wall'],c:1,e:'World War I began in 1914.'},
    {q:'Which happened first?',a:['Indian independence','Dandi March','Quit India Movement','Jallianwala Bagh tragedy'],c:3,e:'The Jallianwala Bagh tragedy happened in 1919.'},
    {q:'Which milestone happened earliest?',a:['First human in space','First Moon landing','First artificial satellite','First space shuttle flight'],c:2,e:'Sputnik 1, the first artificial satellite, launched in 1957.'},
    {q:'Which event came first?',a:['Indian Constitution came into effect','India became independent','First general election in India','Quit India Movement'],c:3,e:'The Quit India Movement began in 1942.'},
    {q:'Which happened earliest?',a:['First iPhone released','World Wide Web proposed','First email sent','First website launched'],c:2,e:'The first network email was sent in 1971.'}
  ];
  const MEMORY_PAIRS=[['🌱','Photosynthesis'],['🪐','Planet'],['💧','Evaporation'],['📐','Geometry'],['📚','Revision'],['🔬','Experiment']];
  function renderArcade(){
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">PLAY WITH PURPOSE</div><h1>Orbit Arcade 🎮</h1><p>Choose a study challenge to practise a skill, or take a short entertainment break. Educational games reward learning progress; relaxation games are for fun.</p><div class="on-row" style="margin-top:15px"><div class="on-stat"><b>${Number(metrics.arcade_games)||0}</b><span>GAMES PLAYED</span></div><div class="on-stat"><b>${Number(metrics.unique_games)||0}/8</b><span>GAMES TRIED</span></div><div class="on-stat"><b>${Math.max(0,...Object.values(scores).map(Number))}</b><span>PERSONAL BEST</span></div></div></section><div class="on-section-title"><div><h2>Choose your game</h2><p>Eight launch games: five study challenges and three creative or relaxation games.</p></div></div><div class="on-grid">${GAME_META.map(g=>`<button class="on-tile" onclick="OrbitNext.startGame('${g.id}')"><div style="height:105px;border-radius:15px;background:${g.color};display:grid;place-items:center;font-size:52px;margin-bottom:12px">${g.emoji}</div><div class="on-row" style="justify-content:space-between"><h3>${g.name}</h3><span class="on-pill">${g.type}</span></div><p>${g.desc}</p><div class="on-row" style="margin-top:12px"><span class="on-btn">Play game →</span></div></button>`).join('')}</div><p class="on-muted" style="margin-top:14px">Game scores and rewards are stored locally on this device. They are not eligible for a global leaderboard until server-side validation is implemented.</p></div>`;
  }
  function startGame(id){
    stopGame();if(!GAME_META.some(g=>g.id===id))return;
    const bank=id==='world'?WORLD_QUESTIONS:id==='timeline'?TIMELINE_QUESTIONS:EQUATIONS;
    gameRuntime={id,score:0,round:0,done:false,questions:[...bank].sort(()=>Math.random()-.5),wordIndex:0,words:[...WORDS].sort(()=>Math.random()-.5),flipped:[],matched:[],moves:0,startedAt:Date.now(),shipX:0.5,lane:1,asteroids:[],lastSpawn:0,gameSeconds:30,grid:(()=>{const saved=read('orbit_next_builder_grid',null);return Array.isArray(saved)&&saved.length===64?saved.map(v=>safeNumber(v,0,5,0)):Array(64).fill(0);})(),buildColor:1};
    if(id==='memory'){gameRuntime.cards=MEMORY_PAIRS.flatMap((p,i)=>[{key:i,side:0,val:p[0]},{key:i,side:1,val:p[1]}]).sort(()=>Math.random()-.5);}
    renderCurrentView();
  }
  function stopGame(){if(gameRuntime?.raf)cancelAnimationFrame(gameRuntime.raf);if(gameRuntime?.interval)clearInterval(gameRuntime.interval);gameRuntime=null;}
  function finishGame(){
    if(!gameRuntime||gameRuntime.done)return;gameRuntime.done=true;
    const g=gameRuntime,id=g.id;const prev=Number(scores[id])||0;
    if(g.score>prev){scores[id]=g.score;write(STORAGE.scores,scores);if(prev>0){increment('score_improvements');increment('personal_bests');}}
    increment('arcade_games');
    const rawUsed=read('orbit_next_games_played',[]);const used=Array.isArray(rawUsed)?rawUsed:[];if(!used.includes(id)){used.push(id);write('orbit_next_games_played',used);setMetric('unique_games',used.length);}
    if(id==='equation')increment('equation_rounds');if(id==='memory')increment('memory_rounds');if(id==='word')increment('word_rounds');if(id==='world')increment('world_rounds');if(id==='timeline')increment('timeline_rounds');
    const studyGame=['equation','memory','word','world','timeline'].includes(id);
    if(studyGame)increment('study_games');
    if(g.perfect&&studyGame)increment('perfect_scores');
    if(studyGame)increment('learning_activities');
    if(id==='builder'){
      const prior=read('orbit_next_builder_saved_grid',[]);const before=Array.isArray(prior)&&prior.length===64?prior:Array(64).fill(0);
      const changed=JSON.stringify(before)!==JSON.stringify(g.grid);const newTiles=g.grid.reduce((n,v,i)=>n+(v&&!before[i]?1:0),0);
      if(changed&&g.grid.some(Boolean)){increment('room_designs');if(newTiles)increment('decorations_placed',newTiles);write('orbit_next_builder_saved_grid',g.grid);}
    }
    const coin=Math.min(10,Math.max(1,Math.floor(g.score/2)+2));awardCoins(coin,'Arcade game complete');
    showModal(g.score>0?'Game complete!':'Nice try!','🏁',`You scored ${g.score}. ${scores[id]===g.score?'Your personal best is now '+g.score+'.':'Your current personal best is '+(scores[id]||0)+'.'} Play again to improve your score.`);
    renderCurrentView();
  }
  function renderGame(){
    const g=gameRuntime;if(!g)return renderArcade();
    if(g.done)return `<div class="on-page"><div class="on-panel on-game-shell"><button class="on-btn soft" onclick="OrbitNext.exitGame()">← Arcade</button><h1 class="on-game-question">Game completed</h1><p class="on-muted" style="text-align:center">Score: ${g.score}</p></div></div>`;
    if(['equation','world','timeline'].includes(g.id)){
      const q=g.questions[g.round%g.questions.length];const gameTitle=g.id==='world'?'🌍 World Explorer':g.id==='timeline'?'📜 Timeline Quest':'🧮 Equation Rush';return `<div class="on-page"><div class="on-panel on-game-shell"><div class="on-game-top"><button class="on-btn soft" onclick="OrbitNext.exitGame()">← Exit</button><span class="on-pill">${gameTitle}</span><b>${g.round+1}/${g.questions.length}</b></div><div class="on-row" style="justify-content:center;margin-top:14px"><span class="on-pill">Score ${g.score}</span><span class="on-pill">Best ${scores[g.id]||0}</span></div><div class="on-game-question">${q.q}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">${q.a.map((a,i)=>`<button class="on-answer" onclick="OrbitNext.answerEquation(${i})">${String.fromCharCode(65+i)}. ${a}</button>`).join('')}</div><p class="on-muted" style="text-align:center;margin-top:15px">Answer the question to move to the next gate.</p></div></div>`;
    }
    if(g.id==='word'){
      const item=g.words[g.wordIndex%g.words.length];let scrambled=item[0].split('').sort(()=>Math.random()-.5).join('');if(scrambled===item[0])scrambled=item[0].split('').reverse().join('');if(g.scrambleIndex!==g.wordIndex){g.scramble=scrambled.toUpperCase();g.scrambleIndex=g.wordIndex;}
      return `<div class="on-page"><div class="on-panel on-game-shell"><div class="on-game-top"><button class="on-btn soft" onclick="OrbitNext.exitGame()">← Exit</button><span class="on-pill">🔤 Word Forge</span><b>${g.wordIndex+1}/8</b></div><div class="on-row" style="justify-content:center;margin-top:15px"><span class="on-pill">Score ${g.score}</span></div><div class="on-game-question" style="letter-spacing:.18em;color:#7f70ef">${g.scramble.split('').join(' ')}</div><p style="text-align:center;font-size:13px;color:var(--on-muted)">${esc(item[1])}</p><div class="on-game-input"><input class="on-field" id="on-word-answer" placeholder="Type the word" autocomplete="off"><button class="on-btn" onclick="OrbitNext.checkWord()">Check</button></div><p class="on-muted" style="text-align:center">Unscramble the letters to match the definition.</p></div></div>`;
    }
    if(g.id==='memory'){
      return `<div class="on-page"><div class="on-panel on-game-shell"><div class="on-game-top"><button class="on-btn soft" onclick="OrbitNext.exitGame()">← Exit</button><span class="on-pill">🧠 Memory Galaxy</span><b>${g.matched.length/2}/${MEMORY_PAIRS.length} pairs</b></div><div class="on-row" style="justify-content:center;margin-top:12px"><span class="on-pill">Moves ${g.moves}</span><span class="on-pill">Matches ${g.matched.length/2}</span></div><div class="on-memory-grid">${g.cards.map((c,i)=>{const open=g.flipped.includes(i)||g.matched.includes(i);return `<button class="on-memory-card ${open?'open':''} ${g.matched.includes(i)?'matched':''}" onclick="OrbitNext.flipMemory(${i})">${open?c.val:'✦'}</button>`;}).join('')}</div><p class="on-muted" style="text-align:center">Match each symbol with its learning word.</p></div></div>`;
    }
    if(g.id==='builder'){
      const colors=['#e9f0ff','#7ed9ef','#9c8afa','#f29cce','#ffd47b','#91d6a7'];
      return `<div class="on-page"><div class="on-panel on-game-shell"><div class="on-game-top"><button class="on-btn soft" onclick="OrbitNext.exitGame()">← Arcade</button><span class="on-pill">🧱 Galaxy Builder</span><b>${g.grid.filter(Boolean).length} blocks</b></div><p class="on-muted" style="text-align:center;margin:14px 0">Choose a colour, then tap the tiles to build your tiny island.</p><div class="on-row" style="justify-content:center;margin-bottom:12px">${colors.map((c,i)=>`<button title="Choose block colour" onclick="OrbitNext.setBuildColor(${i})" style="width:30px;height:30px;border-radius:10px;background:${c};border:3px solid ${g.buildColor===i?'#fff':'rgba(100,110,150,.4)'};box-shadow:${g.buildColor===i?'0 0 0 2px #7770ea':'none'}"></button>`).join('')}</div><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;max-width:440px;margin:auto">${g.grid.map((v,i)=>`<button aria-label="Build tile ${i+1}" onclick="OrbitNext.placeBlock(${i})" style="aspect-ratio:1;border-radius:7px;background:${v?colors[v]:'#dfe5f2'};border:1px solid rgba(80,95,140,.18)"></button>`).join('')}</div><div class="on-row" style="justify-content:center;margin-top:15px"><button class="on-btn soft" onclick="OrbitNext.clearBuild()">Clear island</button><button class="on-btn" onclick="OrbitNext.saveBuild()">💾 Save island</button></div></div></div>`;
    }
    const runner=g.id==='runner';
    return `<div class="on-page"><div class="on-panel on-game-shell"><div class="on-game-top"><button class="on-btn soft" onclick="OrbitNext.exitGame()">← Exit</button><span class="on-pill">${runner?'🏃 Orbit Runner':'🚀 Asteroid Escape'}</span><b id="on-asteroid-score">${g.score}</b></div><canvas id="on-asteroid-canvas" class="on-game-canvas" width="640" height="360" aria-label="${runner?'Change lanes and avoid gates':'Move the spaceship left and right to avoid asteroids'}"></canvas><div class="on-row" style="justify-content:center"><button class="on-btn soft" onpointerdown="OrbitNext.ship(-1)" onpointerup="OrbitNext.ship(0)" onpointerleave="OrbitNext.ship(0)" onpointercancel="OrbitNext.ship(0)">◀ Left</button><button class="on-btn soft" onpointerdown="OrbitNext.ship(1)" onpointerup="OrbitNext.ship(0)" onpointerleave="OrbitNext.ship(0)" onpointercancel="OrbitNext.ship(0)">Right ▶</button></div><p class="on-muted" style="text-align:center">${runner?'Switch lanes to avoid gates and keep your run going.':'Use ← and → or the controls to dodge. Survive for 30 seconds.'}</p></div></div>`;
  }
  function answerEquation(choice){const g=gameRuntime;if(!g||!['equation','world','timeline'].includes(g.id)||g.done)return;const q=g.questions[g.round%g.questions.length];if(choice===q.c){g.score+=10;showToast('Correct! '+q.e,'✅');}else{showToast('Not quite. '+q.e,'💡');}g.round++;if(g.round>=g.questions.length){g.perfect=g.score===g.questions.length*10;finishGame();}else renderCurrentView();}
  function checkWord(){const g=gameRuntime;if(!g||g.id!=='word')return;const answer=$('on-word-answer')?.value.trim().toLowerCase()||'';const item=g.words[g.wordIndex%g.words.length];if(answer===item[0]){g.score+=10;showToast('Correct spelling!','✅');}else showToast(`The word was ${item[0]}. Keep practising!`,'💡');g.wordIndex++;if(g.wordIndex>=8)finishGame();else renderCurrentView();}
  function flipMemory(i){const g=gameRuntime;if(!g||g.id!=='memory'||g.flipped.length===2||g.flipped.includes(i)||g.matched.includes(i))return;g.flipped.push(i);if(g.flipped.length===2){g.moves++;const [a,b]=g.flipped;if(g.cards[a].key===g.cards[b].key){g.matched.push(a,b);g.score+=10;g.flipped=[];if(g.matched.length===g.cards.length){g.perfect=g.moves===MEMORY_PAIRS.length;finishGame();return;}renderCurrentView();}else{renderCurrentView();setTimeout(()=>{if(gameRuntime===g){g.flipped=[];renderCurrentView();}},800);}}else renderCurrentView();}
  function setBuildColor(i){if(!gameRuntime||gameRuntime.id!=='builder')return;gameRuntime.buildColor=safeNumber(i,0,5,1);renderCurrentView();}
  function placeBlock(i){if(!gameRuntime||gameRuntime.id!=='builder'||!Number.isInteger(i)||i<0||i>=64)return;gameRuntime.grid[i]=gameRuntime.grid[i]===gameRuntime.buildColor?0:gameRuntime.buildColor;gameRuntime.score=gameRuntime.grid.filter(Boolean).length;renderCurrentView();}
  function clearBuild(){if(!gameRuntime||gameRuntime.id!=='builder')return;gameRuntime.grid=Array(64).fill(0);gameRuntime.score=0;renderCurrentView();}
  function saveBuild(){if(!gameRuntime||gameRuntime.id!=='builder')return;write('orbit_next_builder_grid',gameRuntime.grid);finishGame();}
  function startRunnerLoop(){
    const g=gameRuntime,canvas=$('on-asteroid-canvas');if(!g||!canvas)return;const ctx=canvas.getContext('2d');let last=0,spawn=0;g.obstacles=[];g.lane=1;g.runnerStart=Date.now();
    const loop=t=>{if(gameRuntime!==g||g.done)return;g.raf=requestAnimationFrame(loop);const dt=Math.min(.04,(t-last||16)/1000);last=t;const elapsed=(Date.now()-g.runnerStart)/1000;g.score=Math.floor(elapsed*2);const counter=$('on-asteroid-score');if(counter)counter.textContent=g.score;const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#121b43';ctx.fillRect(0,0,w,h);
      for(let i=0;i<3;i++){const x=(i+0.5)*w/3;ctx.strokeStyle='rgba(185,200,255,.22)';ctx.setLineDash([12,10]);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.setLineDash([]);}
      if(t-spawn>610){spawn=t;g.obstacles.push({lane:Math.floor(Math.random()*3),y:-28,size:25+Math.random()*12,speed:150+Math.random()*90});}
      g.obstacles.forEach(o=>{o.y+=o.speed*dt;ctx.fillStyle='#ffb66e';ctx.beginPath();ctx.roundRect((o.lane+.5)*w/3-o.size/2,o.y,o.size,o.size,7);ctx.fill();});g.obstacles=g.obstacles.filter(o=>o.y<h+40);
      const sx=(g.lane+.5)*w/3,sy=h-53;ctx.fillStyle='#79e2f4';ctx.beginPath();ctx.moveTo(sx,sy-24);ctx.lineTo(sx-18,sy+17);ctx.lineTo(sx+18,sy+17);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe28d';ctx.beginPath();ctx.arc(sx,sy+20,5,0,Math.PI*2);ctx.fill();
      const hit=g.obstacles.some(o=>o.lane===g.lane&&o.y+o.size>sy-12&&o.y<sy+18);if(hit){g.score=Math.floor(elapsed*2);finishGame();return;}if(elapsed>=30){finishGame();}
    };g.raf=requestAnimationFrame(loop);
  }
  function startAsteroidLoop(){
    const g=gameRuntime,canvas=$('on-asteroid-canvas');if(!g||!canvas)return;const ctx=canvas.getContext('2d');let last=0,spawn=0;g.asteroids=[];g.shipX=.5;g.asteroidMove=0;g.startedAt=Date.now();
    const loop=t=>{if(gameRuntime!==g||g.done)return;g.raf=requestAnimationFrame(loop);const dt=Math.min(.04,(t-last||16)/1000);last=t;const elapsed=(Date.now()-g.startedAt)/1000;g.score=Math.floor(elapsed*2);const counter=$('on-asteroid-score');if(counter)counter.textContent=g.score;
      const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#101a3b';ctx.fillRect(0,0,w,h);
      for(let i=0;i<45;i++){const x=(i*97)%w,y=(i*53+elapsed*12)%h;ctx.fillStyle='rgba(255,255,255,.65)';ctx.fillRect(x,y,2,2);}
      g.shipX=Math.max(.06,Math.min(.94,g.shipX+g.asteroidMove*dt*.75));
      if(t-spawn>580){spawn=t;g.asteroids.push({x:30+Math.random()*(w-60),y:-20,r:12+Math.random()*14,speed:100+Math.random()*110});}
      g.asteroids.forEach(a=>{a.y+=a.speed*dt;ctx.fillStyle='#b2b8d3';ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7b83a8';ctx.beginPath();ctx.arc(a.x-4,a.y-4,a.r*.25,0,Math.PI*2);ctx.fill();});g.asteroids=g.asteroids.filter(a=>a.y<h+40);
      const sx=g.shipX*w,sy=h-48;ctx.fillStyle='#74e3f5';ctx.beginPath();ctx.moveTo(sx,sy-22);ctx.lineTo(sx-17,sy+16);ctx.lineTo(sx+17,sy+16);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe58d';ctx.beginPath();ctx.moveTo(sx-6,sy+16);ctx.lineTo(sx,sy+31+Math.sin(t*.02)*4);ctx.lineTo(sx+6,sy+16);ctx.fill();
      const hit=g.asteroids.some(a=>Math.hypot(a.x-sx,a.y-sy)<a.r+13);if(hit){g.score=Math.max(0,Math.floor(elapsed*2));finishGame();return;}if(elapsed>=30){finishGame();}
    };g.raf=requestAnimationFrame(loop);
  }
  function ship(dir){if(gameRuntime?.id==='asteroid')gameRuntime.asteroidMove=dir;if(gameRuntime?.id==='runner'&&dir!==0)gameRuntime.lane=Math.max(0,Math.min(2,gameRuntime.lane+dir));}
  window.addEventListener('keydown',e=>{if(gameRuntime?.id==='asteroid'){if(e.key==='ArrowLeft'||e.key==='a')ship(-1);if(e.key==='ArrowRight'||e.key==='d')ship(1);}if(gameRuntime?.id==='runner'){if(e.key==='ArrowLeft'||e.key==='a')ship(-1);if(e.key==='ArrowRight'||e.key==='d')ship(1);}});
  window.addEventListener('keyup',e=>{if(gameRuntime&&['ArrowLeft','ArrowRight','a','d'].includes(e.key))ship(0);});
  function exitGame(){stopGame();renderCurrentView();}

  // ---------------------- SHARED VIEW AND UI HELPERS ----------------------
  function showModal(title,icon,body){
    const old=$('on-modal');if(old)old.remove();const el=document.createElement('div');el.id='on-modal';el.className='on-pop';el.innerHTML=`<div class="on-pop-card"><div style="font-size:52px">${icon}</div><h2 style="font:900 25px Fredoka;margin:10px 0">${esc(title)}</h2><p style="font-size:13px;color:var(--on-muted);line-height:1.6">${esc(body)}</p><button class="on-btn" style="margin-top:16px" id="on-modal-close">Continue</button></div>`;document.body.appendChild(el);$('on-modal-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove();});
  }
  function destroyTransient(){disposeWorld();if(gameRuntime?.raf)cancelAnimationFrame(gameRuntime.raf);if(gameRuntime?.interval)clearInterval(gameRuntime.interval);gameRuntime=null;}
  const originalRender=window.renderCurrentView;
  window.renderCurrentView=function(){
    const tab=(typeof state!=='undefined'?state.activeTab:'dashboard');
    if(!['orbitworld','focustimer','trophies','arcade','avatar'].includes(tab)){destroyTransient();return originalRender.apply(this,arguments);}
    document.body.classList.remove('on-chat');
    const main=$('main-view');if(!main)return;
    if(tab==='orbitworld'){stopGame();main.innerHTML=renderWorldView();requestAnimationFrame(()=>mountWorld());}
    else if(tab==='focustimer'){stopGame();main.innerHTML=renderFocusTimer();updateFocusDisplay();}
    else if(tab==='trophies'){stopGame();main.innerHTML=renderTrophies();}
    else if(tab==='arcade'){disposeWorld();main.innerHTML=gameRuntime?renderGame():renderArcade();if(gameRuntime?.id==='asteroid'&&!gameRuntime.raf)startAsteroidLoop();if(gameRuntime?.id==='runner'&&!gameRuntime.raf)startRunnerLoop();}
    else if(tab==='avatar'){disposeWorld();stopGame();main.innerHTML=renderAvatarStudio();requestAnimationFrame(mountAvatar3D);}
    if(typeof renderNav==='function')renderNav();if(typeof updateHeaderUI==='function')updateHeaderUI();
  };

  // Record selected existing study actions without changing their original behaviour.
  function wrap(name, after){const fn=window[name];if(typeof fn!=='function'||fn.__orbitNextWrapped)return;const wrapped=function(){const result=fn.apply(this,arguments);try{after.apply(this,arguments);}catch(e){console.warn('Orbit metric hook:',e);}return result;};wrapped.__orbitNextWrapped=true;window[name]=wrapped;}
  wrap('saveAIPreviewToDeck',()=>{increment('decks_created');});
  wrap('oxMakeCards',()=>{increment('decks_created');});
  wrap('oxDownloadSheet',()=>{increment('notes_saved');});
  wrap('rateSRSCard',(deckId,cardId)=>{if(state.decks?.some(d=>d.id===deckId&&d.cards?.some(c=>c.id===cardId))){increment('cards_reviewed');increment('learning_activities');}});
  wrap('answerDeckQuiz',(isCorrect)=>{if(isCorrect)increment('correct_answers');});
  wrap('clearMistake',(i)=>{if(state.mistakes?.[i]?.cleared)increment('mistakes_reviewed');});
  if(typeof window.togglePlannerTask==='function'&&!window.togglePlannerTask.__orbitNextWrapped){
    const originalToggle=window.togglePlannerTask;
    const trackedToggle=function(i){const wasClaimed=!!state.tasks?.[i]?.rewardClaimed;const result=originalToggle.apply(this,arguments);try{const task=state.tasks?.[i];if(!wasClaimed&&task?.done&&task.rewardClaimed)increment('tasks_completed');}catch(e){console.warn('Orbit task metric:',e);}return result;};
    trackedToggle.__orbitNextWrapped=true;window.togglePlannerTask=trackedToggle;
  }
  if(typeof window.checkBadgeUnlocks==='function'&&!window.checkBadgeUnlocks.__orbitNextWrapped){
    if(localStorage.getItem('orbit_next_last_boss_wins')===null) localStorage.setItem('orbit_next_last_boss_wins',String(Math.max(0,Number(state.stats?.bossesDefeated)||0)));
    const originalCheckBadges=window.checkBadgeUnlocks;
    const trackedBossWins=function(){const result=originalCheckBadges.apply(this,arguments);try{const wins=Math.max(0,Number(state.stats?.bossesDefeated)||0);const previous=Math.max(0,Number(localStorage.getItem('orbit_next_last_boss_wins'))||0);if(wins>previous){const delta=wins-previous;increment('boss_battles',delta);localStorage.setItem('orbit_next_last_boss_wins',String(wins));}}catch(e){console.warn('Orbit boss metric:',e);}return result;};
    trackedBossWins.__orbitNextWrapped=true;window.checkBadgeUnlocks=trackedBossWins;
  }
  if(typeof window.resetAllProgressForNewAccount==='function'&&!window.resetAllProgressForNewAccount.__orbitNextWrapped){
    const originalReset=window.resetAllProgressForNewAccount;
    const resetNextProfile=function(){const result=originalReset.apply(this,arguments);try{
      if(focusTicker){clearInterval(focusTicker);focusTicker=null;}stopGame();disposeWorld();
      [STORAGE.metrics,STORAGE.badges,STORAGE.world,STORAGE.avatar,STORAGE.focus,STORAGE.sessions,STORAGE.scores,
       'orbit_next_saved_outfits','orbit_next_subjects','orbit_next_used_durations','orbit_next_games_played',
       'orbit_next_builder_grid','orbit_next_builder_saved_grid','orbit_next_last_boss_wins']
        .forEach(key=>localStorage.removeItem(key));
      Object.keys(metrics).forEach(key=>delete metrics[key]);unlocked.clear();
      worldPrefs.location='central';worldPrefs.visited=[];worldPrefs.movementHint=true;
      avatarPrefs.palette=0;avatarPrefs.hair=0;avatarPrefs.outfit=0;avatarPrefs.hat=0;avatarPrefs.accessory=0;avatarPrefs.face=0;avatarPrefs.emote='wave';
      savedOutfits.splice(0);sessions.splice(0);Object.keys(scores).forEach(key=>delete scores[key]);
      focusState={status:'idle',duration:1500,remaining:1500,endsAt:0,subject:'General study',task:'',startedAt:0,sessionId:''};timerChosenDuration=1500;
    }catch(e){console.warn('Orbit new-profile reset:',e);}return result;};
    resetNextProfile.__orbitNextWrapped=true;window.resetAllProgressForNewAccount=resetNextProfile;
  }

  // Boot-time recovery for focus sessions and badge progress.
  checkBadges();
  window.addEventListener('beforeunload',()=>{if(worldRuntime)disposeWorld();});

  window.OrbitNext={
    enterWorld,emote,filterBadges,setDuration,focusPrimary,resetFocus,startBreak,
    setPalette,setHat,setHair,setOutfit,setAccessory,setFace,saveOutfit,loadOutfit,avatarDance,startGame,answerEquation,checkWord,flipMemory,ship,exitGame,setBuildColor,placeBlock,clearBuild,saveBuild,startIslandChallenge,answerIslandChallenge,closeIslandChallenge,openIslandDestination,
    showToast,checkBadges,disposeWorld:()=>disposeWorld(),
    getInfo:()=>({badges:BADGES.length,unlocked:unlocked.size,locations:LOCATIONS.length,games:GAME_META.length})
  };

  // Refresh the navigation after adding the new destinations.
  if(typeof renderNav==='function'){try{renderNav();}catch(_){}}
})();
