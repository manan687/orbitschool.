/* OrbitSchool 2.2 — Chapter Boss Battles, guarded rewards and AI study tools.
   This release keeps the existing 2.1 experience and adds a modular 2.2 layer.
   Progress and reward limits in this browser build are local-device safeguards;
   a production server ledger is still required for tamper-resistant rewards. */
(() => {
  'use strict';

  const BOSS_HISTORY_KEY = 'orbit_v22_boss_daily_claims';
  const $ = (id) => document.getElementById(id);
  const esc22 = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const read22 = (key, fallback) => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (_) { return fallback; }
  };
  const write22 = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn('Orbit 2.2 could not save local data:', error); }
  };
  const today22 = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const shuffle22 = (items) => {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const q22 = (question, options, answerIndex, explanation) => ({ question, options, answerIndex, explanation });

  // Small, reviewed starter packs. Other class/chapter combinations can use the
  // configured Netlify AI function; Orbit does not invent a syllabus silently.
  const CHAPTER_BANK = {
    '7|Mathematics|Exponents and Powers': [
      q22('What is 2³?', ['6','8','9','12'], 1, '2³ means 2 × 2 × 2 = 8.'),
      q22('What is the value of 10⁰?', ['0','10','1','100'], 2, 'Any non-zero number raised to the power zero equals 1.'),
      q22('Simplify 3² × 3³.', ['3⁶','3⁵','9⁵','3'], 1, 'When multiplying powers with the same base, add the exponents: 3² × 3³ = 3⁵.'),
      q22('Which is the expanded form of 5⁴?', ['5 × 4','5 + 5 + 5 + 5','5 × 5 × 5 × 5','4 × 4 × 4 × 4 × 4'], 2, 'The exponent tells how many times the base is used as a factor.'),
      q22('Write 4,500,000 in standard form.', ['45 × 10⁵','4.5 × 10⁶','4.5 × 10⁵','450 × 10⁴'], 1, 'Move the decimal point six places to get 4.5 × 10⁶.'),
      q22('What is 7²?', ['14','21','49','77'], 2, '7² = 7 × 7 = 49.')
    ],
    '7|Mathematics|Simple Equations': [
      q22('Solve: x + 9 = 17.', ['6','7','8','9'], 2, 'Subtract 9 from both sides: x = 17 − 9 = 8.'),
      q22('Solve: 4x = 28.', ['6','7','8','9'], 1, 'Divide both sides by 4: x = 7.'),
      q22('Solve: x ÷ 5 = 6.', ['11','25','30','35'], 2, 'Multiply both sides by 5: x = 30.'),
      q22('Solve: 2x + 3 = 13.', ['4','5','6','8'], 1, 'Subtract 3 to get 2x = 10, then divide by 2.'),
      q22('Solve: x − 7 = 12.', ['5','12','19','84'], 2, 'Add 7 to both sides: x = 19.'),
      q22('Which value satisfies 3x = 24?', ['6','7','8','9'], 2, 'When x = 8, 3 × 8 = 24.')
    ],
    '7|Science|Heat': [
      q22('What is the normal human body temperature, approximately?', ['27°C','37°C','47°C','57°C'], 1, 'Normal body temperature is approximately 37°C, though it varies slightly.'),
      q22('Which instrument is designed to measure human body temperature?', ['Rain gauge','Clinical thermometer','Barometer','Compass'], 1, 'A clinical thermometer is designed for measuring body temperature.'),
      q22('Which process transfers heat through liquids and gases by movement of the fluid?', ['Conduction','Convection','Reflection','Freezing'], 1, 'Convection transfers heat through the movement of warmer and cooler parts of a fluid.'),
      q22('Why does a sea breeze usually blow during the day?', ['Sea heats faster than land','Land heats faster than sea','The Moon pulls the air','The sea has no air'], 1, 'During the day, land generally warms faster; cooler air from over the sea moves towards land.'),
      q22('Which mode of heat transfer can occur through empty space?', ['Conduction','Convection','Radiation','All require air'], 2, 'Radiation can travel through a vacuum; sunlight reaches Earth this way.'),
      q22('A metal spoon becomes hot when left in hot tea mainly because of:', ['Conduction','Convection','Evaporation','Condensation'], 0, 'Heat travels through the metal spoon by conduction.')
    ],
    '7|Science|Acids, Bases and Salts': [
      q22('An acidic solution turns blue litmus:', ['Red','Green','Blue','Yellow'], 0, 'Acids turn blue litmus red.'),
      q22('A basic solution turns red litmus:', ['Red','Blue','Black','Colourless'], 1, 'Bases turn red litmus blue.'),
      q22('Which of these is naturally acidic?', ['Lemon juice','Soap solution','Baking soda solution','Lime water'], 0, 'Lemon juice contains citric acid.'),
      q22('A substance used to neutralise excess stomach acid is usually:', ['An antacid','A strong acid','A fuel','A detergent'], 0, 'Antacids are mild bases that help neutralise excess stomach acid.'),
      q22('What is formed when an acid reacts with a base?', ['Only oxygen','Salt and water','Only sugar','Metal and carbon'], 1, 'Neutralisation generally forms salt and water.'),
      q22('Turmeric indicator turns reddish-brown in a:', ['Basic substance','Neutral substance only','Pure water only','Strongly acidic substance'], 0, 'Turmeric changes to reddish-brown in a basic solution.')
    ],
    '7|Science|Life Processes in Plants': [
      q22('Which green pigment absorbs light for photosynthesis?', ['Haemoglobin','Chlorophyll','Melanin','Keratin'], 1, 'Chlorophyll in green plant parts absorbs light energy.'),
      q22('Which gas do green plants take in for photosynthesis?', ['Oxygen','Nitrogen','Carbon dioxide','Hydrogen'], 2, 'Plants use carbon dioxide and water to make food during photosynthesis.'),
      q22('Which tissue transports water from roots to other plant parts?', ['Phloem','Xylem','Epidermis','Cork'], 1, 'Xylem transports water and minerals through the plant.'),
      q22('Which tissue transports prepared food in plants?', ['Phloem','Xylem','Root cap','Stomata'], 0, 'Phloem carries food made in leaves to other parts.'),
      q22('Tiny pores on many leaves that help in gas exchange are called:', ['Stomata','Petals','Nodes','Sepals'], 0, 'Stomata are tiny pores, usually surrounded by guard cells.'),
      q22('Loss of water vapour from plant surfaces is called:', ['Respiration','Transpiration','Pollination','Germination'], 1, 'Transpiration is the loss of water vapour, mainly through leaves.')
    ],
    '7|Science|Electric Current and its Effects': [
      q22('An electric circuit works when it is:', ['Open','Closed','Broken','Without a cell'], 1, 'A closed path allows electric current to flow.'),
      q22('Which device protects a circuit by melting when excessive current flows?', ['Switch','Fuse','Bulb','Cell holder'], 1, 'A fuse wire melts and breaks the circuit when current is too high.'),
      q22('The heating effect of current is used in a:', ['Electric iron','Compass','Mirror','Thermometer'], 0, 'An electric iron uses a heating element that becomes hot when current flows.'),
      q22('Which part of an electric bulb glows when current passes through it?', ['Glass cover','Filament','Base cap','Support wire only'], 1, 'The thin filament becomes hot and glows.'),
      q22('A coil of wire around an iron core carrying current can make an:', ['Electromagnet','Insulator','Permanent battery','Plastic magnet'], 0, 'Electric current through a coil can magnetise an iron core.'),
      q22('What is the main purpose of a switch in a circuit?', ['Store electricity','Open or close the circuit','Increase wire length','Measure temperature'], 1, 'A switch controls whether the circuit is complete or broken.')
    ],
    '7|History|Tribes, Nomads and Settled Communities': [
      q22('Many pastoral nomadic groups moved from place to place mainly to:', ['Find grazing land and water','Build factories','Avoid all trade','Mine coal'], 0, 'Pastoral groups moved with their animals in search of pasture and water.'),
      q22('The Banjaras were widely known as:', ['Traders and transporters','Temple architects only','Sea explorers only','Forest officials'], 0, 'Banjaras transported and traded goods over long distances.'),
      q22('The Gonds were an important tribal community mainly associated with:', ['Central India','The Arctic','The Sahara','The Pacific islands'], 0, 'Gond communities lived across large parts of central India.'),
      q22('The Ahom kingdom developed in the region of the:', ['Brahmaputra valley','Thar Desert','Malabar coast','Deccan plateau only'], 0, 'The Ahoms established a powerful kingdom in the Brahmaputra valley.'),
      q22('Shifting cultivation involves:', ['Moving cultivation plots after some years','Growing crops only in pots','Never changing fields','Only growing fruit trees'], 0, 'In shifting cultivation, a plot is used for a period and cultivation later shifts elsewhere.'),
      q22('Tribal societies often organised people through:', ['Kinship and clans','Modern stock exchanges','Computer networks','Railway zones'], 0, 'Kinship ties and clan identities were important in many tribal communities.')
    ],
    '7|History|New Kings and Kingdoms': [
      q22('Powerful landlords or warrior chiefs who served kings were often called:', ['Samantas','Scribes','Artisans','Pilgrims'], 0, 'Samantas were subordinate chiefs or landlords who could become powerful.'),
      q22('Which Chola ruler built the Rajarajeshvara temple at Thanjavur?', ['Rajaraja I','Ashoka','Harsha','Akbar'], 0, 'Rajaraja I commissioned the famous Rajarajeshvara temple at Thanjavur.'),
      q22('Rajendra I was a ruler of the:', ['Chola dynasty','Mughal dynasty','Maurya dynasty','Gupta dynasty'], 0, 'Rajendra I was a Chola ruler and successor of Rajaraja I.'),
      q22('Many details about Chola local administration are known from:', ['Inscriptions','Modern films','Radio broadcasts','Printed newspapers'], 0, 'Chola inscriptions provide information about local assemblies and administration.'),
      q22('A brahmadeya was generally a:', ['Land grant to Brahmanas','Military ship','Market tax','Type of coin'], 0, 'Brahmadeya refers to land granted to Brahmanas.'),
      q22('Irrigation tanks were important in the Tamil region because they:', ['Stored water for agriculture','Produced iron','Measured rainfall only','Carried armies'], 0, 'Tanks stored water and supported cultivation, especially in areas with seasonal rainfall.')
    ],
    '7|Geography|Water': [
      q22('The continuous movement of water between Earth and the atmosphere is called:', ['Rock cycle','Water cycle','Carbon dating','Soil profile'], 1, 'The water cycle includes evaporation, condensation and precipitation.'),
      q22('The change of water vapour into tiny liquid droplets is:', ['Evaporation','Condensation','Infiltration','Sublimation only'], 1, 'Cooling water vapour causes condensation and cloud formation.'),
      q22('Most ocean waves are caused by:', ['Wind','Earthquakes only','Moonlight','Underwater plants'], 0, 'Wind blowing across the ocean surface produces most waves.'),
      q22('The regular rise and fall of ocean water is called:', ['Tides','Currents','Waves only','Rainfall'], 0, 'Tides are the periodic rise and fall of sea level, influenced mainly by the Moon and also the Sun.'),
      q22('The average salinity of ocean water is approximately:', ['3.5 parts per thousand','35 parts per thousand','350 parts per thousand','0 parts per thousand'], 1, 'Average ocean salinity is about 35 parts per thousand.'),
      q22('Ocean currents are best described as:', ['Large streams of moving ocean water','Clouds over the sea','Rocks on the seabed','Tides at the shore'], 0, 'Ocean currents are continuous movements of ocean water in particular directions.')
    ],
    '7|Computer Science|Artificial Intelligence': [
      q22('What does AI stand for?', ['Automated Internet','Artificial Intelligence','Advanced Input','Applied Information'], 1, 'AI stands for Artificial Intelligence.'),
      q22('A system designed to perform one specific task intelligently is commonly called:', ['ANI','AGI','ASI','HTML'], 0, 'Artificial Narrow Intelligence (ANI) is designed for specific tasks.'),
      q22('Which field helps computers understand and process human language?', ['NLP','GPS','CSS','RAM'], 0, 'Natural Language Processing (NLP) deals with human language.'),
      q22('Computer vision mainly helps computers to:', ['Interpret images and videos','Print only text','Increase battery size','Create electricity'], 0, 'Computer vision enables analysis of visual information.'),
      q22('An AI system that uses recent data or past interactions to improve responses may use:', ['Limited memory','No input','A printer cable','A screen saver'], 0, 'Limited-memory systems use stored or recent information for decisions.'),
      q22('Which is a sensible way to use an AI answer for schoolwork?', ['Check it against reliable learning material','Copy it without reading','Assume it is always correct','Share private passwords with it'], 0, 'AI can make mistakes, so students should check important answers against trusted material.')
    ],
    '7|Computer Science|HTML Tags and CSS': [
      q22('Which HTML tag creates a paragraph?', ['<h1>','<p>','<img>','<br>'], 1, 'The p element represents a paragraph.'),
      q22('Which HTML tag creates a hyperlink?', ['<a>','<table>','<div>','<title>'], 0, 'The a element creates a link, usually with an href attribute.'),
      q22('In CSS, which symbol selects an element by class?', ['#','.','@','&'], 1, 'A class selector begins with a dot, for example .note.'),
      q22('Which tag is commonly used to link an external CSS file?', ['<script>','<style>','<link>','<meta>'], 2, 'A link element in the head can connect an external stylesheet.'),
      q22('Which attribute tells an anchor tag the destination address?', ['src','href','alt','class'], 1, 'The href attribute specifies the link destination.'),
      q22('Which CSS selector uses an element ID?', ['.header','#header','header()','@header'], 1, 'An ID selector starts with #, such as #header.')
    ],
    '7|English|Grammar: Interjections and Idioms': [
      q22('Which word is an interjection expressing sudden surprise?', ['Although','Wow!','Because','Between'], 1, '“Wow!” is an interjection showing a sudden feeling.'),
      q22('What does the idiom “once in a blue moon” mean?', ['Very often','Very rarely','At midnight','In the morning'], 1, 'It means something happens very rarely.'),
      q22('Choose the interjection that expresses pain.', ['Ouch!','Meanwhile','Unless','Across'], 0, '“Ouch!” is commonly used to express pain.'),
      q22('What does “break the ice” mean?', ['Break frozen water','Start a friendly conversation','End a friendship','Work in winter'], 1, 'The idiom means to make people feel more comfortable and begin talking.'),
      q22('Which sentence uses an interjection correctly?', ['Hurray! We won the match.','We hurray the won match.','The match hurray won.','Won hurray match we.'], 0, '“Hurray!” expresses excitement at the beginning of the sentence.'),
      q22('What does “a piece of cake” mean in an idiom?', ['A dessert','Something very easy','A difficult test','A birthday gift'], 1, 'The idiom means a task is very easy.')
    ]
  };
  window.OrbitBank = CHAPTER_BANK; // read-only access for the Study Board quiz

  const CLASSES = Array.from({length:12}, (_,i)=>String(i+1));
  const getSubjects = (grade) => {
    const n = Number(grade);
    if (n <= 5) return ['Mathematics','English','Environmental Studies','Computer Studies'];
    if (n <= 8) return ['Mathematics','Science','History','Geography','Civics','English','Computer Science'];
    if (n <= 10) return ['Mathematics','Science','History','Geography','Civics','English','Computer Science'];
    return ['Mathematics','Physics','Chemistry','Biology','English','Computer Science','Economics'];
  };
  const getChapters = (grade, subject) => Object.keys(CHAPTER_BANK)
    .filter(key => key.startsWith(`${grade}|${subject}|`))
    .map(key => key.split('|')[2]);

  let bossSetup = { grade:'', subject:'', chapter:'', customChapter:'', difficulty:'standard' };
  let bossSession = null;
  let bossGenerating = false;
  let bossDailyClaims = read22(BOSS_HISTORY_KEY, {});
  if (!bossDailyClaims || typeof bossDailyClaims !== 'object' || Array.isArray(bossDailyClaims)) bossDailyClaims = {};

  function chapterKey() {
    return `${bossSetup.grade}|${bossSetup.subject}|${bossSetup.chapter === '__custom__' ? bossSetup.customChapter.trim() : bossSetup.chapter}`;
  }
  function actualChapter() { return bossSetup.chapter === '__custom__' ? bossSetup.customChapter.trim() : bossSetup.chapter; }

  function renderBossSetup() {
    const subjects = bossSetup.grade ? getSubjects(bossSetup.grade) : [];
    const chapters = bossSetup.grade && bossSetup.subject ? getChapters(bossSetup.grade, bossSetup.subject) : [];
    const showCustom = bossSetup.chapter === '__custom__' || chapters.length === 0;
    return `
      <div class="orbit-hero orbit-gradient-boss22">
        <div><div class="orbit-kicker">OrbitSchool 2.2 · CHAPTER MASTERY</div><h1>🐉 Boss Battle Arena</h1><p>Choose your class, subject and exact chapter. Then challenge the guardian with questions matched to your learning level.</p></div>
        <div class="orbit-boss-hero-creature" aria-hidden="true">🐲</div>
      </div>
      <section class="orbit-panel orbit-boss-setup">
        <div class="orbit-section-head"><div><span class="orbit-badge">YOUR LEARNING PATH</span><h2>Prepare your challenge</h2><p>Step 1: choose your class. Step 2: choose a subject. Step 3: choose a chapter.</p></div><span class="orbit-boss-step-mark">01 / 03</span></div>
        <div class="orbit-boss-select-grid">
          <label><span>🎓 Class</span><select id="boss22-grade" onchange="orbitBossGradeChanged(this.value)"><option value="">Choose your class</option>${CLASSES.map(n=>`<option value="${n}" ${bossSetup.grade===n?'selected':''}>Class ${n}</option>`).join('')}</select></label>
          <label><span>📚 Subject</span><select id="boss22-subject" onchange="orbitBossSubjectChanged(this.value)" ${bossSetup.grade?'':'disabled'}><option value="">${bossSetup.grade?'Choose a subject':'Choose class first'}</option>${subjects.map(s=>`<option value="${esc22(s)}" ${bossSetup.subject===s?'selected':''}>${esc22(s)}</option>`).join('')}</select></label>
          <label><span>📖 Chapter</span><select id="boss22-chapter" onchange="orbitBossChapterChanged(this.value)" ${bossSetup.subject?'':'disabled'}><option value="">${bossSetup.subject?'Choose a chapter':'Choose subject first'}</option>${chapters.map(ch=>`<option value="${esc22(ch)}" ${bossSetup.chapter===ch?'selected':''}>${esc22(ch)}</option>`).join('')}<option value="__custom__" ${bossSetup.chapter==='__custom__'?'selected':''}>＋ My own chapter / topic</option></select></label>
          <label><span>⚡ Difficulty</span><select id="boss22-difficulty" onchange="orbitBossDifficultyChanged(this.value)"><option value="easy" ${bossSetup.difficulty==='easy'?'selected':''}>Starter</option><option value="standard" ${bossSetup.difficulty==='standard'?'selected':''}>Standard</option><option value="challenge" ${bossSetup.difficulty==='challenge'?'selected':''}>Challenge</option></select></label>
        </div>
        ${showCustom && bossSetup.subject ? `<label class="orbit-boss-custom-label"><span>✏️ Enter the chapter title</span><input id="boss22-custom" maxlength="100" value="${esc22(bossSetup.customChapter)}" placeholder="Type the chapter name from your textbook" oninput="orbitBossCustomChanged(this.value)"></label>` : ''}
        <div class="orbit-boss-selection-note">${chapters.length ? 'Built-in chapter packs are available for selected Class 7 topics. Other chapters can be generated by Orbiter when the AI service is configured.' : 'Use the exact chapter title from your book. Orbiter can prepare an age-appropriate question set when the AI service is configured.'}</div>
        <button class="orbit-btn orbit-btn-wide orbit-boss-start" onclick="startOrbitBoss22()" ${bossGenerating?'disabled':''}>${bossGenerating?'Preparing your battle…':'⚔️ Start Chapter Boss Battle'}</button>
        <p class="orbit-footnote">Rewards are for completing a chapter challenge, not for repeatedly tapping an answer. First-clear coin rewards are limited to once per chapter per day on this device.</p>
      </section>
      <section class="orbit-grid-2 orbit-boss-info-grid">
        <div class="orbit-panel"><h2>🧠 Real learning first</h2><p>Each answer is locked once selected. Read the explanation after every question and use mistakes to decide what to revise.</p></div>
        <div class="orbit-panel"><h2>🏅 Fair rewards</h2><p>Coins are awarded only after a successful battle, with a daily first-clear limit for the selected chapter.</p></div>
      </section>`;
  }

  function renderBossBattle() {
    const session = bossSession;
    if (!session) return renderBossSetup();
    if (session.done) {
      const pct = Math.round(session.correct / session.questions.length * 100);
      const passed = session.passed;
      return `<div class="orbit-hero orbit-gradient-boss22"><div><div class="orbit-kicker">BATTLE REPORT</div><h1>${passed?'🏆 Guardian defeated!':'🛡️ Keep training, Cadet!'}</h1><p>${esc22(session.chapter)} · Class ${esc22(session.grade)} · ${esc22(session.subject)}</p></div><div class="orbit-boss-result-score"><b>${session.correct}/${session.questions.length}</b><span>${pct}% correct</span></div></div>
        <section class="orbit-panel orbit-boss-result"><div class="orbit-boss-result-icon">${passed?'🌟':'💫'}</div><h2>${passed?'Chapter mastered':'Battle complete'}</h2><p>${passed?'You reached the mastery target. Great work!':'You need a little more revision before this guardian is defeated. Review the explanations and try again.'}</p>
          <div class="orbit-boss-reward-row"><span>✨ ${session.rewardXp||0} XP earned</span><span>🪙 ${session.rewardCoins||0} coins earned</span></div>
          <div class="orbit-boss-result-actions"><button class="orbit-btn" onclick="orbitBossReplay22()">↻ Practise this chapter again</button><button class="orbit-btn orbit-btn-soft" onclick="orbitBossBackToSetup22()">Choose another chapter</button></div>
          ${session.replayMessage?`<div class="orbit-callout">${esc22(session.replayMessage)}</div>`:''}
        </section>
        <section class="orbit-panel"><h2>📘 Review your answers</h2><div class="orbit-boss-review-list">${session.questions.map((q,i)=>`<article class="orbit-boss-review-item"><b>${i+1}. ${esc22(q.question)}</b><span class="${session.results[i]?.correct?'is-correct':'is-wrong'}">${session.results[i]?.correct?'✓ Correct':'✕ Review this'}</span><small>${esc22(q.explanation)}</small></article>`).join('')}</div></section>`;
    }
    const q = session.questions[session.index];
    if (!q) return '';
    const total = session.questions.length;
    const progress = Math.round(session.index / total * 100);
    const hp = Math.max(0, 100 - Math.round(session.correct / total * 100));
    return `<div class="orbit-hero orbit-gradient-boss22"><div><div class="orbit-kicker">CLASS ${esc22(session.grade)} · ${esc22(session.subject.toUpperCase())}</div><h1>🐉 ${esc22(session.chapter)} Guardian</h1><p>${esc22(session.difficultyLabel)} challenge · Focus on understanding, not speed.</p></div><div class="orbit-boss-hero-creature orbit-boss-fighting" aria-hidden="true">🐲</div></div>
      <section class="orbit-panel orbit-boss-fight-panel">
        <div class="orbit-boss-progress-head"><span>QUESTION ${session.index+1} OF ${total}</span><b>${session.correct} correct</b></div><div class="orbit-boss-progress"><i style="width:${progress}%"></i></div>
        <div class="orbit-boss-health"><span>Guardian shield</span><div><i style="width:${hp}%"></i></div><b>${hp}%</b></div>
        <div class="orbit-boss-question-card"><span class="orbit-badge">${esc22(session.subject)} · ${esc22(session.difficultyLabel)}</span><h2>${esc22(q.question)}</h2><div class="orbit-boss-options">${q.options.map((option,i)=>{
          let cls='';
          if(session.locked && i===q.answerIndex) cls=' correct-answer';
          if(session.locked && session.feedback && i===session.feedback.choice && !session.feedback.correct) cls=' wrong-answer';
          return `<button class="orbit-boss-option${cls}" ${session.locked?'disabled':''} onclick="answerOrbitBoss22(${i})"><span>${String.fromCharCode(65+i)}</span>${esc22(option)}</button>`;
        }).join('')}</div>
        ${session.locked?`<div class="orbit-boss-feedback ${session.feedback.correct?'feedback-good':'feedback-review'}"><b>${session.feedback.correct?'✨ Direct hit!':'💡 Good learning moment'}</b><p>${esc22(q.explanation)}</p></div>`:''}
      </div>
      <div class="orbit-boss-fight-footer"><span>🛡️ One answer per question</span><button class="orbit-btn orbit-btn-soft" onclick="orbitBossExit22()">Exit battle</button></div>
      </section>`;
  }

  function makeSession(questions) {
    const count = questions.length;
    bossSession = {
      grade: bossSetup.grade,
      subject: bossSetup.subject,
      chapter: actualChapter(),
      chapterId: chapterKey(),
      difficulty: bossSetup.difficulty,
      difficultyLabel: bossSetup.difficulty === 'easy' ? 'Starter' : bossSetup.difficulty === 'challenge' ? 'Challenge' : 'Standard',
      questions: shuffle22(questions).map(q => ({...q, options:q.options.slice()})),
      index:0, correct:0, locked:false, done:false, passed:false, feedback:null, results:[], rewardXp:0, rewardCoins:0,
      minCorrect:bossSetup.difficulty === 'challenge' ? count : bossSetup.difficulty === 'easy' ? Math.ceil(count * 0.6) : Math.ceil(count * 0.7)
    };
    renderCurrentView();
  }

  async function startOrbitBoss22() {
    if (bossGenerating) return;
    const grade = $('boss22-grade')?.value || bossSetup.grade;
    const subject = $('boss22-subject')?.value || bossSetup.subject;
    const chapter = $('boss22-chapter')?.value || bossSetup.chapter;
    const custom = $('boss22-custom')?.value ?? bossSetup.customChapter;
    const difficulty = $('boss22-difficulty')?.value || bossSetup.difficulty;
    bossSetup = {grade,subject,chapter,customChapter:custom,difficulty};
    const title = actualChapter();
    if (!grade || !subject || !chapter || (chapter==='__custom__' && !title)) {
      showToast('Choose your class, subject and chapter first.','📚');
      renderCurrentView();
      return;
    }
    const bank = CHAPTER_BANK[chapterKey()];
    if (bank) {
      let pack = bank;
      if (difficulty === 'easy') pack = bank.slice(0, Math.min(4, bank.length));
      else if (difficulty === 'standard') pack = bank.slice(0, Math.min(6, bank.length));
      else pack = bank.slice(0, Math.min(6, bank.length));
      makeSession(pack);
      return;
    }
    bossGenerating = true;
    renderCurrentView();
    try {
      const count = difficulty === 'easy' ? 6 : difficulty === 'challenge' ? 10 : 8;
      const prompt = `Create exactly ${count} multiple-choice questions for a school student in Class ${grade}. Subject: ${subject}. Textbook chapter/topic: ${title}. Difficulty: ${difficulty}. Make questions suitable for this class, factually accurate, clear and not ambiguous. Use exactly four answer options per question, one correct answer, and a short explanation. Do not include material beyond the stated school level. Return JSON with this schema: {"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}. Do not use Markdown fences.`;
      const response = await fetch('/.netlify/functions/orbit-chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'boss-questions',lang:'en',messages:[{role:'user',content:prompt}]})
      });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || 'The chapter question service is unavailable.');
      const questions = Array.isArray(data.questions) ? data.questions : [];
      const clean = questions.map(item => ({
        question:String(item.question||'').trim().slice(0,500),
        options:Array.isArray(item.options)?item.options.map(x=>String(x).trim().slice(0,200)).slice(0,4):[],
        answerIndex:Number(item.answerIndex),
        explanation:String(item.explanation||'').trim().slice(0,700)
      })).filter(item=>item.question&&item.options.length===4&&item.options.every(Boolean)&&Number.isInteger(item.answerIndex)&&item.answerIndex>=0&&item.answerIndex<4&&item.explanation);
      if(clean.length<5) throw new Error('The generated questions did not pass Orbit quality checks. Try again or choose a built-in chapter.');
      makeSession(clean.slice(0,count));
    } catch (error) {
      showToast(error.message || 'Could not prepare this chapter. Check the AI service setup.','⚠️');
      renderCurrentView();
    } finally {
      bossGenerating = false;
      if (!bossSession) renderCurrentView();
    }
  }

  function answerOrbitBoss22(choice) {
    const session = bossSession;
    if (!session || session.done || session.locked) return;
    const q = session.questions[session.index];
    if (!q || !Number.isInteger(choice) || choice<0 || choice>=q.options.length) return;
    // Lock synchronously before doing anything else. Repeated clicks cannot score twice.
    session.locked = true;
    const correct = choice === q.answerIndex;
    if (correct) {
      session.correct++;
      playSfx('click');
    } else {
      playSfx('error');
    }
    session.feedback = {choice,correct};
    session.results[session.index] = {choice,correct};
    renderCurrentView();
    window.setTimeout(() => {
      if (bossSession !== session || session.done) return;
      session.index++;
      session.locked = false;
      session.feedback = null;
      if (session.index >= session.questions.length) completeBoss22(session);
      else renderCurrentView();
    }, 950);
  }

  function completeBoss22(session) {
    if (!session || session.done) return;
    session.done = true;
    session.passed = session.correct >= session.minCorrect;
    if (session.passed) {
      const dayKey = today22();
      const dailyKey = `${dayKey}|${session.chapterId}`;
      const alreadyClaimed = !!bossDailyClaims[dailyKey];
      const bossRewardsToday = Object.keys(bossDailyClaims).filter(key => key.startsWith(`${dayKey}|`)).length;
      if (!alreadyClaimed && bossRewardsToday < 5) {
        const base = session.difficulty === 'challenge' ? 135 : session.difficulty === 'easy' ? 60 : 90;
        session.rewardXp = base;
        session.rewardCoins = session.difficulty === 'challenge' ? 45 : session.difficulty === 'easy' ? 18 : 30;
        bossDailyClaims[dailyKey] = Date.now();
        // Keep only recent local claim records so storage does not grow forever.
        const entries = Object.entries(bossDailyClaims).sort((a,b)=>b[1]-a[1]).slice(0,500);
        bossDailyClaims = Object.fromEntries(entries);
        write22(BOSS_HISTORY_KEY,bossDailyClaims);
        addRewards(session.rewardXp,session.rewardCoins,`Chapter boss cleared: ${session.chapter}`);
        if (state.stats) {
          state.stats.bossesDefeated = (Number(state.stats.bossesDefeated)||0)+1;
          safeSave(STORAGE_KEYS.stats,state.stats);
        }
        if (state.quests?.[3]) {
          state.quests[3].progress = Math.min(Number(state.quests[3].target)||1,(Number(state.quests[3].progress)||0)+1);
          safeSave(STORAGE_KEYS.quests,state.quests);
        }
        if (typeof checkBadgeUnlocks === 'function') checkBadgeUnlocks();
        session.replayMessage = 'First-clear reward collected for this chapter today. Come back tomorrow for another chapter reward.';
      } else if (alreadyClaimed) {
        session.replayMessage = 'You have already collected today’s first-clear reward for this chapter. This replay is for practice, so no extra coins or XP were added.';
      } else {
        session.replayMessage = 'You have reached the daily limit of five rewarded chapter battles. You can keep practising, but the next reward becomes available tomorrow.';
      }
    } else {
      session.replayMessage = 'No reward was claimed because the mastery target was not reached. Review the explanations and try again.';
    }
    renderCurrentView();
  }

  function resetBossSession() { bossSession=null; bossGenerating=false; }
  function orbitBossBackToSetup22() { resetBossSession(); renderCurrentView(); }
  function orbitBossReplay22() { resetBossSession(); startOrbitBoss22(); }
  function orbitBossExit22() { resetBossSession(); renderCurrentView(); }

  window.orbitEscapeHTML22 = esc22;
  window.attackBoss = function(){ showToast('The old rapid-reward boss mode has been retired. Choose a chapter in the new arena.','🛡️'); };
  window.orbitBossGradeChanged = (value) => { bossSetup.grade=value; bossSetup.subject=''; bossSetup.chapter=''; bossSetup.customChapter=''; renderCurrentView(); };
  window.orbitBossSubjectChanged = (value) => { bossSetup.subject=value; const available=getChapters(bossSetup.grade,value); bossSetup.chapter=available.length?'':'__custom__'; bossSetup.customChapter=''; renderCurrentView(); };
  window.orbitBossChapterChanged = (value) => { bossSetup.chapter=value; bossSetup.customChapter=''; renderCurrentView(); };
  window.orbitBossDifficultyChanged = (value) => { bossSetup.difficulty=value; };
  window.orbitBossCustomChanged = (value) => { bossSetup.customChapter=value; };
  window.startOrbitBoss22 = startOrbitBoss22;
  window.answerOrbitBoss22 = answerOrbitBoss22;
  window.orbitBossBackToSetup22 = orbitBossBackToSetup22;
  window.orbitBossReplay22 = orbitBossReplay22;
  window.orbitBossExit22 = orbitBossExit22;

  // New-profile reset: remove Orbit 2.x data too, preventing an earlier local
  // previous profile's extra economy, arcade or room state from appearing in the next profile.
  const originalReset = window.resetAllProgressForNewAccount;
  if (typeof originalReset === 'function') {
    window.resetAllProgressForNewAccount = function(...args) {
      const result = originalReset.apply(this,args);
      [
        'orbit_gems','orbit_v2_pet_system','orbit_v2_reminders','orbit_v2_arcade_progress',
        'orbit_v2_world','orbit_v2_lingo','orbit_v2_social_cleaned','orbit_v2_quest_day',BOSS_HISTORY_KEY
      ].forEach(key=>localStorage.removeItem(key));
      state.gems=0;
      state.reminderSettings={revisionEnabled:false,revisionTime:'19:00',taskTime:'18:00',lastRevisionSent:'',lastTaskSent:''};
      state.arcadeProgress={claimed:[],best:{},played:0};
      state.worldState={owned:['desk','lamp'],placed:['desk','lamp']};
      state.lingoProgress={completed:{},lessons:0,current:{}};
      bossDailyClaims={}; resetBossSession();
      return result;
    };
  }

  // Render the new chapter-based arena without disturbing the rest of 2.1.
  const renderPrevious = window.renderCurrentView;
  if (typeof renderPrevious === 'function') {
    window.renderCurrentView = function() {
      if (state.activeTab !== 'boss') return renderPrevious.apply(this,arguments);
      document.body.classList.remove('on-chat');
      const main = $('main-view');
      if (main) main.innerHTML = renderBossBattle();
      if (typeof renderNav === 'function') renderNav();
      if (typeof updateHeaderUI === 'function') updateHeaderUI();
    };
  }

  // Replace the fake offline template flashcards with a real server-generated
  // draft. If the configured AI endpoint is unavailable, show the honest error.
  window.generateFlashcardsWithAI = async function() {
    const input = $('ai-topic-input')?.value.trim();
    if (!input) { showToast('Enter a topic or paste some study notes first.','📝'); return; }
    const button = $('btn-ai-gen');
    if (button) { button.disabled=true; button.textContent='Generating real study cards…'; }
    try {
      const response = await fetch('/.netlify/functions/orbit-chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'flashcards',lang:'en',messages:[{role:'user',content:`Create 6 to 10 accurate study flashcards from this topic or source text. If it is only a topic, make age-appropriate foundational cards and do not invent highly specific facts. Topic/source: ${input}. Return JSON only using {"cards":[{"front":"question or key term","back":"accurate concise answer","hint":"short recall hint"}]}.`} ]})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||'The AI flashcard service is unavailable.');
      const cards=Array.isArray(data.cards)?data.cards.map(card=>({front:String(card.front||'').trim().slice(0,300),back:String(card.back||'').trim().slice(0,700),hint:String(card.hint||'').trim().slice(0,200)})).filter(card=>card.front&&card.back):[];
      if(cards.length<4) throw new Error('The generated cards did not pass Orbit quality checks. Please try a more specific topic.');
      aiPreviewCards=cards;
      if(typeof unlockBadge==='function') unlockBadge('b_ai_gen');
      showToast(`${cards.length} AI-generated cards are ready to review. Edit them before saving.`,'✨');
      renderCurrentView();
    } catch(error) {
      showToast(error.message||'Could not generate cards. Check that the Orbit AI function is deployed and configured.','⚠️');
      if(button) { button.disabled=false; button.textContent='Try again ✨'; }
    }
  };

  // 2.2 visual system for the chapter arena.
  const style=document.createElement('style');
  style.id='orbit-v22-styles';
  style.textContent=`
    .orbit-gradient-boss22{background:radial-gradient(circle at 82% 18%,#fb718566,transparent 23%),linear-gradient(115deg,#7f1d1d,#dc2626 55%,#f97316)}
    .orbit-boss-hero-creature{font-size:clamp(64px,11vw,104px);filter:drop-shadow(0 12px 18px #450a0a66);animation:orbitBossFloat 3s ease-in-out infinite}
    .orbit-boss-step-mark{font:900 12px Inter,system-ui;letter-spacing:.13em;color:var(--text-muted)}
    .orbit-boss-setup{margin-top:16px;padding:clamp(17px,3vw,28px)}
    .orbit-boss-select-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:20px}
    .orbit-boss-select-grid label,.orbit-boss-custom-label{display:grid;gap:7px;min-width:0;font:700 13px 'Fredoka',system-ui;color:var(--text-main)}
    .orbit-boss-select-grid select,.orbit-boss-custom-label input{width:100%;min-height:48px;border:1.5px solid var(--border-subtle);border-radius:13px;padding:10px 12px;background:var(--bg-app);color:var(--text-main);font:600 13px Inter,system-ui;outline-offset:2px}
    .orbit-boss-select-grid select:disabled{opacity:.5;cursor:not-allowed}
    .orbit-boss-custom-label{margin-top:14px}
    .orbit-boss-selection-note{margin-top:14px;padding:11px 13px;border-radius:13px;background:var(--bg-app);color:var(--text-muted);font-size:11px;line-height:1.6}
    .orbit-boss-start{min-height:52px;margin-top:17px;font-size:15px;background:linear-gradient(110deg,#dc2626,#f97316);box-shadow:0 4px 0 #991b1b}
    .orbit-boss-info-grid{margin-top:14px}
    .orbit-boss-fight-panel{margin-top:16px;padding:clamp(15px,3vw,26px)}
    .orbit-boss-progress-head,.orbit-boss-health{display:flex;align-items:center;justify-content:space-between;gap:12px;font:800 11px Inter,system-ui;color:var(--text-muted)}
    .orbit-boss-progress{height:9px;border-radius:99px;background:var(--bg-app);overflow:hidden;margin:9px 0 18px}.orbit-boss-progress i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#f97316,#facc15);transition:width .3s}
    .orbit-boss-health{margin-bottom:20px}.orbit-boss-health>div{height:11px;flex:1;border-radius:99px;background:#fee2e2;overflow:hidden}.orbit-boss-health>div i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f97316);transition:width .35s}.dark .orbit-boss-health>div{background:#451a1a}
    .orbit-boss-question-card{max-width:850px;margin:0 auto;padding:clamp(15px,3vw,28px);border:1px solid var(--border-subtle);border-radius:21px;background:linear-gradient(150deg,var(--bg-card),var(--bg-app));}
    .orbit-boss-question-card h2{font:700 clamp(19px,3vw,26px) 'Fredoka',system-ui;line-height:1.35;margin:15px 0 18px;color:var(--text-main)}
    .orbit-boss-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .orbit-boss-option{display:flex;align-items:center;gap:11px;min-height:56px;padding:11px 13px;border:1.5px solid var(--border-subtle);border-radius:14px;background:var(--bg-card);color:var(--text-main);text-align:left;font:600 13px Inter,system-ui;transition:transform .15s,border-color .15s,background .15s}
    .orbit-boss-option:not(:disabled):hover{border-color:#f97316;transform:translateY(-2px)}.orbit-boss-option:disabled{cursor:default;opacity:.88}
    .orbit-boss-option>span{display:grid;place-items:center;flex:none;width:27px;height:27px;border-radius:9px;background:var(--bg-app);font:900 11px Inter,system-ui}
    .orbit-boss-option.correct-answer{border-color:#16a34a;background:#f0fdf4;color:#166534}.dark .orbit-boss-option.correct-answer{background:#052e16;color:#bbf7d0}
    .orbit-boss-option.wrong-answer{border-color:#ef4444;background:#fef2f2;color:#991b1b}.dark .orbit-boss-option.wrong-answer{background:#450a0a;color:#fecaca}
    .orbit-boss-feedback{margin-top:14px;padding:13px 15px;border-radius:14px;font-size:12px;line-height:1.6}.orbit-boss-feedback p{margin:4px 0 0;color:inherit}.feedback-good{background:#dcfce7;color:#166534}.feedback-review{background:#fff7ed;color:#9a3412}.dark .feedback-good{background:#052e16;color:#bbf7d0}.dark .feedback-review{background:#431407;color:#fed7aa}
    .orbit-boss-fight-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:15px;color:var(--text-muted);font-size:11px;font-weight:700}
    .orbit-boss-result{margin-top:16px;text-align:center;padding:clamp(20px,4vw,36px)}.orbit-boss-result-icon{font-size:58px}.orbit-boss-result h2{font-size:27px;margin:8px 0}.orbit-boss-result>p{margin:0 auto 14px;max-width:560px}
    .orbit-boss-result-score{padding:13px 19px;border-radius:18px;border:1px solid #ffffff55;background:#ffffff18;text-align:center}.orbit-boss-result-score b{display:block;font:800 27px 'Fredoka',system-ui}.orbit-boss-result-score span{font-size:11px}
    .orbit-boss-reward-row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:18px 0}.orbit-boss-reward-row span{padding:9px 13px;border-radius:12px;background:var(--bg-app);font:700 12px 'Fredoka',system-ui}
    .orbit-boss-result-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:13px}.orbit-boss-review-list{display:grid;gap:9px}.orbit-boss-review-item{display:grid;gap:6px;padding:12px;border:1px solid var(--border-subtle);border-radius:13px}.orbit-boss-review-item>b{font-size:13px}.orbit-boss-review-item>span{font-size:11px;font-weight:900}.orbit-boss-review-item>small{font-size:11px;line-height:1.5;color:var(--text-muted)}.orbit-boss-review-item .is-correct{color:#16a34a}.orbit-boss-review-item .is-wrong{color:#ea580c}
    @keyframes orbitBossFloat{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8px) rotate(4deg)}}
    @media(max-width:620px){.orbit-boss-select-grid,.orbit-boss-options{grid-template-columns:1fr}.orbit-boss-result-actions{display:grid}.orbit-boss-result-actions button{width:100%}.orbit-boss-hero-creature{font-size:54px}.orbit-boss-fight-footer{align-items:flex-start;flex-direction:column}}
    @media(prefers-reduced-motion:reduce){.orbit-boss-hero-creature{animation:none!important}.orbit-boss-option,.orbit-boss-progress i,.orbit-boss-health>div i{transition:none!important}}
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);

  // Expose the current revision so support/debug pages can report it accurately.
  window.ORBIT_AIV_VERSION = '2.2';
  console.info('OrbitSchool 2.2 chapter battle layer loaded.');
})();
