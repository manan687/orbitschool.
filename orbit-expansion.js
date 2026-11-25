/* OrbitSchool expansion layer — 22-panel navigation, study dashboard, course path and Lingo. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v;}catch(_){return f;}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn('Orbit save failed',e);}};
  const lingoData={
    Spanish:{flag:'🇪🇸',code:'es-ES',lessons:[
      ['First words','Translate: Hello','Hola','Hola','Buenos','Hola','Gracias'],
      ['Morning greetings','Translate: Good morning','Buenos días','Buenos días','Buenas','días','gracias'],
      ['Polite phrases','Translate: Thank you','Gracias','Gracias','Por','favor','Hola'],
      ['Introductions','Translate: My name is Ana','Me llamo Ana','Me llamo Ana','Yo','soy','Ana'],
      ['Everyday life','Translate: I am a student','Soy estudiante','Soy estudiante','Soy','estudiante','gracias'],
      ['Conversations','Translate: How are you?','¿Cómo estás?','¿Cómo estás?','¿Cómo','estás?','Hola']
    ]},
    French:{flag:'🇫🇷',code:'fr-FR',lessons:[
      ['First words','Translate: Hello','Bonjour','Bonjour','Merci','Salut','Au revoir'],['Morning greetings','Translate: Good morning','Bonjour','Bonjour','Bonsoir','Merci','Salut'],['Polite phrases','Translate: Thank you','Merci','Merci','S’il vous plaît','Bonjour','Pardon'],['Introductions','Translate: My name is Ana','Je m’appelle Ana','Je m’appelle Ana','Je','m’appelle','Ana'],['Everyday life','Translate: I am a student','Je suis étudiant','Je suis étudiant','Je','suis','étudiant'],['Conversations','Translate: How are you?','Comment ça va ?','Comment ça va ?','Comment','ça','va ?']
    ]},
    German:{flag:'🇩🇪',code:'de-DE',lessons:[
      ['First words','Translate: Hello','Hallo','Hallo','Danke','Tschüss','Bitte'],['Morning greetings','Translate: Good morning','Guten Morgen','Guten Morgen','Gute','Nacht','Danke'],['Polite phrases','Translate: Thank you','Danke','Danke','Bitte','Hallo','Guten Tag'],['Introductions','Translate: My name is Ana','Ich heiße Ana','Ich heiße Ana','Ich','heiße','Ana'],['Everyday life','Translate: I am a student','Ich bin Schüler','Ich bin Schüler','Ich','bin','Schüler'],['Conversations','Translate: How are you?','Wie geht es dir?','Wie geht es dir?','Wie','geht','dir?']
    ]},
    Italian:{flag:'🇮🇹',code:'it-IT',lessons:[
      ['First words','Translate: Hello','Ciao','Ciao','Grazie','Arrivederci','Prego'],['Morning greetings','Translate: Good morning','Buongiorno','Buongiorno','Buonanotte','Ciao','Grazie'],['Polite phrases','Translate: Thank you','Grazie','Grazie','Per favore','Ciao','Scusa'],['Introductions','Translate: My name is Ana','Mi chiamo Ana','Mi chiamo Ana','Mi','chiamo','Ana'],['Everyday life','Translate: I am a student','Sono uno studente','Sono uno studente','Sono','uno','studente'],['Conversations','Translate: How are you?','Come stai?','Come stai?','Come','stai?','Ciao']
    ]},
    Portuguese:{flag:'🇧🇷',code:'pt-BR',lessons:[
      ['First words','Translate: Hello','Olá','Olá','Obrigado','Tchau','Por favor'],['Morning greetings','Translate: Good morning','Bom dia','Bom dia','Boa','noite','Obrigado'],['Polite phrases','Translate: Thank you','Obrigado','Obrigado','Por favor','Olá','Desculpe'],['Introductions','Translate: My name is Ana','Meu nome é Ana','Meu nome é Ana','Meu','nome','Ana'],['Everyday life','Translate: I am a student','Eu sou estudante','Eu sou estudante','Eu','sou','estudante'],['Conversations','Translate: How are you?','Como você está?','Como você está?','Como','você','está?']
    ]},
    Hindi:{flag:'🇮🇳',code:'hi-IN',lessons:[
      ['First words','Translate: Hello','नमस्ते','नमस्ते','धन्यवाद','अलविदा','कृपया'],['Morning greetings','Translate: Good morning','सुप्रभात','सुप्रभात','शुभ','रात्रि','नमस्ते'],['Polite phrases','Translate: Thank you','धन्यवाद','धन्यवाद','कृपया','नमस्ते','जी'],['Introductions','Translate: My name is Ana','मेरा नाम आना है','मेरा नाम आना है','मेरा','नाम','आना'],['Everyday life','Translate: I am a student','मैं विद्यार्थी हूँ','मैं विद्यार्थी हूँ','मैं','विद्यार्थी','हूँ'],['Conversations','Translate: How are you?','आप कैसे हैं?','आप कैसे हैं?','आप','कैसे','हैं?']
    ]},
    Japanese:{flag:'🇯🇵',code:'ja-JP',lessons:[
      ['First words','Translate: Hello','Konnichiwa','Konnichiwa','Arigatō','Sayonara','Ohayō'],['Morning greetings','Translate: Good morning','Ohayō gozaimasu','Ohayō gozaimasu','Konbanwa','Arigatō','Hai'],['Polite phrases','Translate: Thank you','Arigatō gozaimasu','Arigatō gozaimasu','Sumimasen','Konnichiwa','Hai'],['Introductions','Translate: My name is Ana','Watashi wa Ana desu','Watashi wa Ana desu','Watashi','wa','Ana'],['Everyday life','Translate: I am a student','Watashi wa gakusei desu','Watashi wa gakusei desu','Watashi','wa','gakusei'],['Conversations','Translate: How are you?','Genki desu ka?','Genki desu ka?','Genki','desu','ka?']
    ]},
    Korean:{flag:'🇰🇷',code:'ko-KR',lessons:[
      ['First words','Translate: Hello','Annyeonghaseyo','Annyeonghaseyo','Gamsahamnida','Annyeong','Ne'],['Morning greetings','Translate: Good morning','Joeun achimieyo','Joeun achimieyo','Annyeong','Gamsahamnida','Ne'],['Polite phrases','Translate: Thank you','Gamsahamnida','Gamsahamnida','Joesonghamnida','Annyeong','Mul'],['Introductions','Translate: My name is Ana','Je ireumeun Ana-yeyo','Je ireumeun Ana-yeyo','Je','ireumeun','Ana-yeyo'],['Everyday life','Translate: I am a student','Jeoneun haksaeng-ieyo','Jeoneun haksaeng-ieyo','Jeoneun','haksaeng-ieyo','Ne'],['Conversations','Translate: How are you?','Jal jinaeseyo?','Jal jinaeseyo?','Jal','jinaeseyo?','Gamsahamnida']
    ]},
    Mandarin:{flag:'🇨🇳',code:'zh-CN',lessons:[
      ['First words','Translate: Hello','Nǐ hǎo','Nǐ hǎo','Xièxie','Zàijiàn','Hǎo'],['Morning greetings','Translate: Good morning','Zǎoshang hǎo','Zǎoshang hǎo','Wǎn ān','Xièxie','Nǐ hǎo'],['Polite phrases','Translate: Thank you','Xièxie','Xièxie','Qǐng','Zàijiàn','Nǐ hǎo'],['Introductions','Translate: My name is Ana','Wǒ jiào Ana','Wǒ jiào Ana','Wǒ','jiào','Ana'],['Everyday life','Translate: I am a student','Wǒ shì xuéshēng','Wǒ shì xuéshēng','Wǒ','shì','xuéshēng'],['Conversations','Translate: How are you?','Nǐ hǎo ma?','Nǐ hǎo ma?','Nǐ','hǎo','ma?']
    ]},
    Arabic:{flag:'🇸🇦',code:'ar-SA',lessons:[
      ['First words','Translate: Hello','Marhaban','Marhaban','Shukran','Ma’a salama','Na’am'],['Morning greetings','Translate: Good morning','Sabah al-khayr','Sabah al-khayr','Masa al-khayr','Shukran','Ahlan'],['Polite phrases','Translate: Thank you','Shukran','Shukran','Min fadlik','Marhaban','Afwan'],['Introductions','Translate: My name is Ana','Ismi Ana','Ismi Ana','Ismi','Ana','Ahlan'],['Everyday life','Translate: I am a student','Ana talib','Ana talib','Ana','talib','Shukran'],['Conversations','Translate: How are you?','Kayfa haluk?','Kayfa haluk?','Kayfa','haluk?','Marhaban']
    ]}
  };
  window.OrbitLingoData=lingoData;
  const LINGO_KEY='orbit_next_lingo_course_v2';
  let lingoState=read(LINGO_KEY,{selected:'Spanish',progress:{},bot:{}});
  if(!lingoState||typeof lingoState!=='object')lingoState={selected:'Spanish',progress:{},bot:{}};
  if(!lingoState.progress||typeof lingoState.progress!=='object')lingoState.progress={};
  if(!lingoState.bot||typeof lingoState.bot!=='object')lingoState.bot={};
  let activeLingoUnit=0, lingoPicked=[], lingoBusy=false;

  function renderStudyBoard(){
    const due=typeof getDueCardsCount==='function'?getDueCardsCount():0;
    const openTasks=Array.isArray(state.tasks)?state.tasks.filter(t=>!t.done).length:0;
    const mistakes=Array.isArray(state.mistakes)?state.mistakes.filter(m=>!m.cleared).length:0;
    const totalFocus=(read('orbit_next_sessions_v1',[])).filter(s=>s.type==='focus').reduce((a,s)=>a+(Number(s.minutes)||0),0);
    const earned=read('orbit_next_badges_v1',[]).length;
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">YOUR PERSONAL LEARNING DASHBOARD</div><h1>Study Board & Insights 📊</h1><p>See the study activity saved on this device and choose your next useful step. These are local records, not school grades.</p><div class="on-row" style="margin-top:15px"><div class="on-stat"><b>${due}</b><span>CARDS DUE</span></div><div class="on-stat"><b>${openTasks}</b><span>OPEN TASKS</span></div><div class="on-stat"><b>${mistakes}</b><span>UNRESOLVED MISTAKES</span></div><div class="on-stat"><b>${totalFocus}</b><span>FOCUS MINUTES</span></div></div></section><div class="on-grid" style="margin-top:14px"><section class="on-panel"><h2>🎯 Recommended next steps</h2><div class="on-row"><button class="on-btn" onclick="switchTab('flashcards')">Review ${due} due cards</button><button class="on-btn soft" onclick="switchTab('planner')">Plan a study session</button><button class="on-btn soft" onclick="switchTab('orbitchat')">Ask Orbiter</button></div></section><section class="on-panel"><h2>🏅 Your achievements</h2><p class="on-muted">${earned} Orbit Next badges unlocked on this device.</p><button class="on-btn cyan" onclick="switchTab('trophies')">Open Trophy Galaxy</button></section></div></div>`;
  }
  function renderStudyLab(){
    const tools=[['📓','Orbit Notebook','Turn notes into summaries, revision material and practice.','orbitchat'],['🃏','Flashcard Workshop','Create decks, practise active recall and schedule reviews.','flashcards'],['📝','Exam Practice','Prepare with chapter-based questions and review explanations.','boss'],['🧠','Weakness Review','Use your saved mistakes and insights to choose what to revise.','studyboard']];
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">YOUR LEARNING WORKSPACE</div><h1>Study Lab 🧪</h1><p>A single home for your study tools. Choose a task and Orbit will take you to the right workspace.</p></section><div class="on-grid" style="margin-top:14px">${tools.map(t=>`<button class="on-panel on-study-tile" onclick="switchTab('${t[3]}')"><div style="font-size:34px">${t[0]}</div><h2>${t[1]}</h2><p class="on-muted">${t[2]}</p><span class="on-pill">Open tool →</span></button>`).join('')}</div></div>`;
  }
  function renderCourseLibrary(){
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">CHOOSE WHAT YOU WANT TO LEARN</div><h1>Course Library 📚</h1><p>Choose a class and continue into chapter-based practice. Curriculum packs should be reviewed and mapped to the student's actual school board.</p></section><section class="on-panel" style="margin-top:14px"><h2>📘 Chapter practice</h2><p class="on-muted">Boss Levels lets you select class, subject, chapter and difficulty before starting a challenge.</p><button class="on-btn" onclick="switchTab('boss')">Choose class and subject →</button></section><section class="on-panel" style="margin-top:12px"><h2>🌐 Language courses</h2><p class="on-muted">Orbit Lingo has beginner pathways in ten languages.</p><button class="on-btn soft" onclick="switchTab('lingua')">Explore language courses</button></section><section class="on-panel" style="margin-top:12px"><h2>🧠 Ask Orbiter</h2><p class="on-muted">Ask for a simple explanation, examples or a practice session about a topic.</p><button class="on-btn soft" onclick="switchTab('orbitchat')">Open AI tutor</button></section></div>`;
  }
  function renderIslandMissions(){
    const entries=[['central','🌌','Visit Orbit Central','Meet the guide and check the hub.'],['academy','🏫','Explore Academy Island','Find the library and learning gates.'],['math','➗','Cross Math Meadows','Solve an equation challenge.'],['science','🧪','Discover Science Bay','Complete a science discovery.'],['words','📖','Walk Word Forest','Complete a vocabulary challenge.'],['history','🏛️','Explore History Ruins','Find the timeline relic.'],['geo','🌍','Visit GeoGlobe Isles','Complete a map challenge.'],['arcade','🕹️','Enter Arcade Nebula','Play a mini-game.'],['trophy','🏆','Visit Trophy Galaxy','Browse your earned achievements.'],['market','🛍️','Visit Marketplace Plaza','Preview clothing and room decorations.'],['creator','🎨','Visit Creator Island','Build a mini island.']];
    const visited=new Set((read('orbit_next_world_v1',{visited:[]}).visited||[]).filter(id=>id!=='pets'));
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">EXPLORE THE UNIVERSE</div><h1>Island Missions 🧭</h1><p>Every island has a destination, an activity and something to discover. This first island set runs locally on your device.</p><div class="on-row" style="margin-top:12px"><div class="on-stat"><b>${visited.size}/${entries.length}</b><span>DESTINATIONS VISITED</span></div></div></section><div class="on-grid" style="margin-top:14px">${entries.map(([id,emoji,title,desc])=>`<article class="on-panel"><div style="font-size:30px">${emoji}</div><h2>${title}</h2><p class="on-muted">${desc}</p><button class="on-btn ${visited.has(id)?'soft':''}" onclick="OrbitNext.enterWorld('${id}')">${visited.has(id)?'Visit again':'Explore island'} →</button></article>`).join('')}</div><p class="on-muted" style="margin-top:10px">Island scenery and challenge content are an expanding first release; not all planned worlds have unique open-world maps yet.</p></div>`;
  }
  function renderCreator(){
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">MAKE SOMETHING YOURS</div><h1>Creator Workshop 🎨</h1><p>Customise your avatar, build a tiny island and save creative designs locally.</p></section><div class="on-grid" style="margin-top:14px"><button class="on-panel on-study-tile" onclick="switchTab('avatar')"><div style="font-size:34px">🧍</div><h2>Avatar Studio</h2><p class="on-muted">Mix palettes, outfits, hairstyles and accessories.</p><span class="on-pill">Customise character →</span></button><button class="on-panel on-study-tile" onclick="switchTab('orbitworld');setTimeout(()=>OrbitNext.enterWorld('creator'),30)"><div style="font-size:34px">🏝️</div><h2>Creator Island</h2><p class="on-muted">Visit the build island and open the mini builder.</p><span class="on-pill">Explore island →</span></button><button class="on-panel on-study-tile" onclick="switchTab('arcade');setTimeout(()=>OrbitNext.startGame('builder'),80)"><div style="font-size:34px">🧱</div><h2>Galaxy Builder</h2><p class="on-muted">Design a small block island and save the pattern.</p><span class="on-pill">Start building →</span></button></div></div>`;
  }
  function renderCommunityHub(){
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">YOUR ORBIT PROFILE</div><h1>Community Hub 🌐</h1><p>Add friends, form study groups, chat with your group, and see how everyone is doing today on the leaderboard.</p></section><div class="on-grid" style="margin-top:14px"><section class="on-panel"><div style="font-size:34px">👥</div><h2>Friends &amp; Study Groups</h2><p class="on-muted">Send friend requests, create or join a study group with its code, chat with your group, and see each member's files.</p><button class="on-btn" onclick="switchTab('community')">Open Community</button></section><section class="on-panel"><div style="font-size:34px">🏆</div><h2>Leaderboard</h2><p class="on-muted">See every player's profile and today's XP. Daily stats reset 24 hours after each player's day starts.</p><button class="on-btn soft" onclick="OrbitSocial.openBoard()">Open leaderboard</button></section></div></div>`;
  }

  function getLingoProgress(lang){const p=lingoState.progress[lang];return Number.isInteger(p)?Math.max(0,Math.min(6,p)):0;}
  function setLingoProgress(lang,value){lingoState.progress[lang]=Math.max(0,Math.min(6,value));write(LINGO_KEY,lingoState);}
  function renderLingo(){
    const lang=lingoState.selected in lingoData?lingoState.selected:'Spanish',course=lingoData[lang],progress=getLingoProgress(lang),unit=course.lessons[activeLingoUnit]||course.lessons[0];
    const lessonBank=[...new Set([...unit[2].split(' '),...unit.slice(3)])].filter(Boolean);
    const words=lingoPicked.length?lingoPicked:[];
    const history=Array.isArray(lingoState.bot[lang])?lingoState.bot[lang]:[];
    return `<div class="on-page"><section class="on-hero"><div class="on-kicker">LANGUAGE LEARNING PATHS</div><h1>Orbit Lingo 🦉</h1><p>Build vocabulary, practise useful phrases and talk with an AI language tutor. Lessons are beginner starter content; full CEFR-level courses require further reviewed curriculum work.</p><div class="on-row" style="margin-top:14px"><div class="on-stat"><b>${Number(state.lingua?.xp)||0}</b><span>LINGO XP</span></div><div class="on-stat"><b>${progress}/6</b><span>UNITS COMPLETED</span></div><div class="on-stat"><b>${Math.round(progress/6*100)}%</b><span>PATH PROGRESS</span></div></div></section>
      <section class="on-panel" style="margin-top:13px"><div class="on-row" style="justify-content:space-between"><h2>🌍 Choose a language</h2><span class="on-pill">10 starter paths</span></div><div class="on-row">${Object.entries(lingoData).map(([name,c])=>`<button class="on-choice ${lang===name?'active':''}" onclick="OrbitExpansion.selectLingo('${name}')">${c.flag} ${name}</button>`).join('')}</div></section>
      <section class="on-panel" style="margin-top:13px"><div class="on-row" style="justify-content:space-between"><div><h2>${course.flag} ${lang} · Beginner Path</h2><p class="on-muted">Complete the six starter units in order.</p></div><span class="on-pill">${progress}/6 complete</span></div><div class="on-progress" style="height:8px"><span style="width:${progress/6*100}%"></span></div><div class="on-course-map" style="margin-top:13px">${course.lessons.map((l,i)=>`<button class="on-course-unit" ${i>progress?'disabled':''} onclick="OrbitExpansion.openLingoUnit(${i})"><span>${i<progress?'✅':i===progress?'✨':'🔒'} UNIT ${i+1}</span><strong>${esc(l[0])}</strong><small>${i<progress?'Completed':i===progress?'Ready to learn':'Complete the previous unit first'}</small></button>`).join('')}</div></section>
      <div class="on-grid" style="margin-top:13px"><section class="on-panel"><div class="on-row" style="justify-content:space-between"><h2>🎯 ${esc(unit[0])}</h2><span class="on-pill">${Math.min(progress+1,6)} / 6</span></div><p class="on-muted">${esc(unit[1])}</p><div class="on-lingo-prompt">${esc(unit[1])}</div><div class="on-row" style="margin-top:12px;min-height:44px">${words.length?words.map((w,i)=>`<button class="on-lingo-word" onclick="OrbitExpansion.removeLingoWord(${i})">${esc(w)} ×</button>`).join(''):'<span class="on-muted">Tap the word tiles to build your answer.</span>'}</div><div class="on-row" style="margin-top:12px">${lessonBank.map((w,i)=>`<button class="on-lingo-word" onclick="OrbitExpansion.addLingoWord('${esc(w)}')">${esc(w)}</button>`).join('')}</div><div class="on-row" style="margin-top:14px"><button class="on-btn soft" onclick="OrbitExpansion.clearLingoWords()">Clear</button><button class="on-btn cyan" onclick="OrbitExpansion.speakLingo()">🔊 Listen</button><button class="on-btn" onclick="OrbitExpansion.checkLingo()">Check answer</button></div><p class="on-muted" style="margin-top:10px">Tip: answer spelling and accents matter. Some scripts are represented using beginner-friendly transliteration in this starter path.</p></section>
      <section class="on-panel"><div class="on-row" style="justify-content:space-between"><h2>🤖 Lingo Bot</h2><span class="on-pill">AI LANGUAGE TUTOR</span></div><p class="on-muted">Practise a short conversation in ${esc(lang)}. The tutor should correct kindly, explain one mistake at a time and keep the level beginner-friendly.</p><div class="on-lingo-chat" id="on-lingo-chat">${history.length?history.map(m=>`<div class="on-lingo-msg ${m.role==='user'?'user':'bot'}">${esc(m.text)}</div>`).join(''):'<div class="on-lingo-msg bot">¡Hola! Choose a language, then ask me to practise a short conversation with you.</div>'}</div><form class="on-row" style="margin-top:10px" onsubmit="OrbitExpansion.askLingo(event)"><input id="on-lingo-input" class="on-field" style="flex:1;min-width:120px" maxlength="500" required placeholder="Write a message in ${esc(lang)} or ask for help…"><button class="on-btn" type="submit" ${lingoBusy?'disabled':''}>Send</button></form><p class="on-muted" style="margin-top:8px">AI replies require the deployed Netlify function. Do not enter private information.</p></section></div></div>`;
  }
  function selectLingo(lang){if(!lingoData[lang])return;lingoState.selected=lang;activeLingoUnit=getLingoProgress(lang);lingoPicked=[];write(LINGO_KEY,lingoState);renderCurrentView();}
  function openLingoUnit(i){const course=lingoData[lingoState.selected];if(!course||i>getLingoProgress(lingoState.selected)||i<0||i>=6)return;activeLingoUnit=i;lingoPicked=[];renderCurrentView();}
  function addLingoWord(w){if(lingoPicked.length<8)lingoPicked.push(w);renderCurrentView();}
  function removeLingoWord(i){lingoPicked.splice(i,1);renderCurrentView();}
  function clearLingoWords(){lingoPicked=[];renderCurrentView();}
  function speakLingo(){const c=lingoData[lingoState.selected],l=c.lessons[activeLingoUnit];if(!('speechSynthesis'in window))return alert('Speech is not supported by this browser.');const u=new SpeechSynthesisUtterance(l[2]);u.lang=c.code;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}
  function checkLingo(){const c=lingoData[lingoState.selected],l=c.lessons[activeLingoUnit],attempt=lingoPicked.join(' ').trim().replace(/\s+/g,' ');if(attempt.toLocaleLowerCase()===String(l[2]).toLocaleLowerCase()){
      const next=Math.max(getLingoProgress(lingoState.selected),activeLingoUnit+1);setLingoProgress(lingoState.selected,next);lingoPicked=[];
      state.lingua=state.lingua||{xp:0,gems:0,hearts:5,streak:0,practicedLangs:[]};state.lingua.xp=(Number(state.lingua.xp)||0)+20;state.lingua.gems=(Number(state.lingua.gems)||0)+2;
      try{localStorage.setItem('orbit_v2_lingo',JSON.stringify(state.lingua));}catch(_){}
      if(typeof addRewards==='function')addRewards(10,3,'Orbit Lingo lesson');
      if(typeof unlockBadge==='function')unlockBadge('b_lingua_1');
      if(window.OrbitNext?.checkBadges)window.OrbitNext.checkBadges();
      alert('Correct! Nice work. Your lesson progress was saved.');
      activeLingoUnit=Math.min(next,5);
    }else{alert('Not quite yet. Listen again, check the word order and try once more.');}
    renderCurrentView();
  }
  async function askLingo(e){e.preventDefault();if(lingoBusy)return;const input=$('on-lingo-input');const text=input?.value.trim();if(!text)return;const lang=lingoState.selected;const list=Array.isArray(lingoState.bot[lang])?lingoState.bot[lang]:[];list.push({role:'user',text});lingoState.bot[lang]=list.slice(-12);write(LINGO_KEY,lingoState);lingoBusy=true;renderCurrentView();
    try{const history=lingoState.bot[lang].slice(-8).map(m=>({role:m.role,content:m.text}));history.unshift({role:'user',content:`You are Orbit Lingo's beginner ${lang} tutor. Speak gently and age-appropriately. Ask only one question at a time. Correct errors kindly, explain the correction in simple English, include a natural ${lang} example and its meaning. Do not claim fluency certification. Student message: ${text}`});
      const r=await fetch('/.netlify/functions/orbit-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:'en',mode:'chat',messages:history})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Lingo AI is unavailable.');
      lingoState.bot[lang].push({role:'assistant',text:String(d.reply||'Try that again.')});lingoState.bot[lang]=lingoState.bot[lang].slice(-12);write(LINGO_KEY,lingoState);
    }catch(err){lingoState.bot[lang].push({role:'assistant',text:`I couldn't reach the tutor just now: ${err.message}. Check the deployed Orbit AI service and try again.`});lingoState.bot[lang]=lingoState.bot[lang].slice(-12);write(LINGO_KEY,lingoState);}finally{lingoBusy=false;renderCurrentView();}
  }

  const originalRender=window.renderCurrentView;
  window.renderCurrentView=function(){
    const tab=state?.activeTab;
    const views={studyboard:renderStudyBoard,studylab:renderStudyLab,courses:renderCourseLibrary,missions:renderIslandMissions,creator:renderCreator,communityhub:renderCommunityHub,lingua:renderLingo};
    if(!views[tab])return originalRender.apply(this,arguments);
    const main=$('main-view');if(!main)return;
    document.body.classList.remove('on-chat');main.innerHTML=views[tab]();
    if(typeof renderNav==='function')renderNav();if(typeof updateHeaderUI==='function')updateHeaderUI();
  };
  window.OrbitExpansion={selectLingo,openLingoUnit,addLingoWord,removeLingoWord,clearLingoWords,speakLingo,checkLingo,askLingo,
    getInfo:()=>({mainPanels:22,languagePaths:Object.keys(lingoData).length,unitsPerLanguage:6})};
})();
