/* OrbitSchool 2.1 — study-first experience layer.
   This file extends the original Orbit app without deleting its existing modules.
   Progress is saved locally in this build. Shared online accounts, friends and
   real-time multiplayer still require a connected production backend. */
(() => {
  'use strict';

  const V2 = {
    gemsKey: 'orbit_gems', reminderKey: 'orbit_v2_reminders',
    arcadeKey: 'orbit_v2_arcade_progress', worldKey: 'orbit_v2_world', lingoKey: 'orbit_v2_lingo',
    migratedKey: 'orbit_v2_social_cleaned'
  };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => Math.max(0, Number(n) || 0).toLocaleString();
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Orbit save failed', e); } };
  const read = (key, fallback) => { try { const x = localStorage.getItem(key); return x ? JSON.parse(x) : fallback; } catch (_) { return fallback; } };

  // Preserve older Orbit progress and extend it with the new economy.
  state.gems = Math.max(0, Number(localStorage.getItem(V2.gemsKey)) || 0);
  state.reminderSettings = read(V2.reminderKey, { revisionEnabled:false, revisionTime:'19:00', taskTime:'18:00', lastRevisionSent:'', lastTaskSent:'' });
  state.arcadeProgress = read(V2.arcadeKey, { claimed:[], best:{}, played:0 });
  state.worldState = read(V2.worldKey, { owned:['desk','lamp'], placed:['desk','lamp'] });
  state.lingoProgress = read(V2.lingoKey, { completed:{}, lessons:0 });
  if (!state.social || typeof state.social !== 'object') state.social = { friends:[], squad:'My Study Squad', messages:[], pending:[] };
  // Remove seeded/demo users from earlier local builds: a new Orbit profile starts empty.
  if (!localStorage.getItem(V2.migratedKey)) {
    state.social.friends = [];
    state.social.messages = [];
    state.social.pending = [];
    save(STORAGE_KEYS.social, state.social);
    localStorage.setItem(V2.migratedKey, '1');
  }
  state.social.pending = Array.isArray(state.social.pending) ? state.social.pending : [];
  state.social.friends = Array.isArray(state.social.friends) ? state.social.friends : [];
  state.social.messages = Array.isArray(state.social.messages) ? state.social.messages : [];
  state.reminderSettings = {revisionEnabled:false,revisionTime:'19:00',taskTime:'18:00',lastRevisionSent:'',lastTaskSent:'',...state.reminderSettings};
  state.lingoProgress.completed = state.lingoProgress.completed && typeof state.lingoProgress.completed === 'object' ? state.lingoProgress.completed : {};
  state.lingoProgress.current = state.lingoProgress.current && typeof state.lingoProgress.current === 'object' ? state.lingoProgress.current : {};
  state.lingoProgress.lessons = Math.max(0,Number(state.lingoProgress.lessons)||0);

  // Reset daily quests once per local calendar day.
  const QUEST_DAY_KEY='orbit_v2_quest_day';
  function ensureDailyQuestReset(){
    const today=localISO(new Date());
    if(localStorage.getItem(QUEST_DAY_KEY)!==today){
      state.quests=(Array.isArray(state.quests)?state.quests:[]).map(q=>({...q,progress:0,claimed:false}));
      safeSave(STORAGE_KEYS.quests,state.quests);
      localStorage.setItem(QUEST_DAY_KEY,today);
    }
  }
  ensureDailyQuestReset();

  const WORLD_DECOR = [
    {id:'desk',name:'Study Desk',emoji:'🪑',price:0,desc:'Your home base for learning.'},
    {id:'lamp',name:'Star Lamp',emoji:'💡',price:0,desc:'A warm glow for your study room.'},
    {id:'bookshelf',name:'Galaxy Bookshelf',emoji:'📚',price:150,desc:'Show off your learning collection.'},
    {id:'plant',name:'Cosmic Plant',emoji:'🪴',price:90,desc:'A little green in your universe.'},
    {id:'trophy',name:'Trophy Shelf',emoji:'🏆',price:220,desc:'Display your hard-earned achievements.'},
    {id:'window',name:'Nebula Window',emoji:'🌌',price:260,desc:'Look out into the Orbit galaxy.'},
    {id:'rug',name:'Planet Rug',emoji:'🪐',price:130,desc:'A cosy place to relax in your room.'},
    {id:'globe',name:'Knowledge Globe',emoji:'🌍',price:180,desc:'Explore the world from your room.'}
  ];

  function saveEconomy() { localStorage.setItem(V2.gemsKey, String(state.gems)); updateHeaderUI(); }
  function addGems(amount, reason='') { return; // gems retired: coins are the only currency

    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (!n) return;
    state.gems += n; saveEconomy(); playSfx('coin');
    if (reason) showToast(`${reason} (+${n} 🪙)`, '🪙');
  }
  const originalAddRewards = window.addRewards;
  window.addRewards = function(xpGain, coinGain, reason='') {
    return originalAddRewards(xpGain, coinGain, reason);
  };
  const originalUpdateHeader = window.updateHeaderUI;
  window.updateHeaderUI = function() {
    originalUpdateHeader();
    const gemPill = $('hdr-gems');
    if (gemPill) gemPill.textContent = money(state.gems);
  };

  // 3D avatar and room renderer. Falls back to a styled preview if WebGL is unavailable.
  let orbitThree = null;
  function stopOrbitThree() {
    if (!orbitThree) return;
    const old = orbitThree;
    try {
      cancelAnimationFrame(old.raf);
      old.resizeObserver?.disconnect();
      if(old.canvas){old.canvas.onpointerdown=null;old.canvas.onpointermove=null;old.canvas.onpointerup=null;old.canvas.onpointercancel=null;old.canvas.onwheel=null;old.canvas.ondblclick=null;}
      old.scene?.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(material => material?.dispose());
      });
      old.renderer?.dispose();
    } catch (err) { console.warn('Orbit 3D cleanup warning:', err); }
    orbitThree = null;
  }
  function mat(color, roughness=0.68, metalness=0) {
    const T=window.THREE;
    return new T.MeshStandardMaterial({color:color||'#64748b',roughness,metalness});
  }
  function box(group,w,h,d,color,x,y,z,opts={}) {
    const T=window.THREE;
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color,opts.roughness,opts.metalness));
    mesh.position.set(x,y,z);
    if(opts.rx)mesh.rotation.x=opts.rx;if(opts.ry)mesh.rotation.y=opts.ry;if(opts.rz)mesh.rotation.z=opts.rz;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  function buildAvatar3D(cfg=state.avatar) {
    const T=window.THREE, root=new T.Group();
    const find=(cat)=>(AVATAR_CATALOG[cat]||[]).find(x=>x.id===cfg[cat])||(AVATAR_CATALOG[cat]||[])[0]||{};
    const skin=find('Skin'),hair=find('Hair'),face=find('Face'),shirt=find('Shirt'),pants=find('Pants'),hat=find('Hats'),glass=find('Glasses'),cape=find('Capes'),shoes=find('Shoes'),body=find('Body');
    const skinColor=skin.color||'#FDBA74',shirtColor=shirt.color||'#3B82F6',pantsColor=pants.color||'#334155';
    // Backpack/cape layer first so it sits behind the body.
    if(cape.style&&cape.style!=='none'){
      if(cape.style==='wings'){
        [-1,1].forEach(side=>{const wing=box(root,.58,.88,.12,'#c084fc',side*.72,1.63,-.38,{rz:side*.22});wing.rotation.y=side*.18;});
      }else if(cape.style==='jetpack'){
        [-1,1].forEach(side=>{
          const tank=new T.Mesh(new T.CylinderGeometry(.15,.17,.76,16),mat(cape.color||'#38bdf8',.35,.45));
          tank.position.set(side*.43,1.55,-.48);tank.castShadow=true;root.add(tank);
          const cap=new T.Mesh(new T.CylinderGeometry(.18,.18,.1,16),mat('#facc15',.28,.5));cap.position.set(side*.43,1.96,-.48);root.add(cap);
          const nozzle=new T.Mesh(new T.ConeGeometry(.13,.25,12),mat('#fb923c',.3,.2));nozzle.position.set(side*.43,1.08,-.48);nozzle.rotation.x=Math.PI;root.add(nozzle);
        });
      }else{
        const cloak=box(root,1.16,1.38,.09,cape.color||'#8b5cf6',0,1.52,-.34,{rz:.02});
        cloak.rotation.x=-.06;
      }
    }
    // Torso and small chest badge.
    box(root,1.02,1.08,.62,shirtColor,0,1.55,0,{roughness:.72});
    box(root,.2,.2,.035,'#fef3c7',0,1.69,.333,{roughness:.35,metalness:.25});
    // Articulated arms: these pivot at the shoulders for idle and wave animations.
    const makeArm=(x,side)=>{
      const pivot=new T.Group();pivot.position.set(x,2.02,0);root.add(pivot);
      box(pivot,.34,.66,.4,shirtColor,0,-.31,0);
      box(pivot,.3,.55,.36,skinColor,0,-.88,0);
      box(pivot,.31,.27,.34,skinColor,0,-1.27,.015);
      pivot.userData.side=side;return pivot;
    };
    const leftArm=makeArm(-.69,'left'),rightArm=makeArm(.69,'right');
    // Separated legs, with feet that read clearly in a block-character silhouette.
    const makeLeg=(x)=>{
      const pivot=new T.Group();pivot.position.set(x,.98,0);root.add(pivot);
      box(pivot,.43,.62,.47,pantsColor,0,-.27,0);
      box(pivot,.39,.38,.43,pantsColor,0,-.76,0);
      box(pivot,.48,.23,.62,shoes.color||'#f8fafc',0,-1.04,.1);
      return pivot;
    };
    const leftLeg=makeLeg(-.25),rightLeg=makeLeg(.25);
    // Oversized block head on its own pivot.
    const head=new T.Group();head.position.set(0,2.55,0);root.add(head);
    box(head,.9,.9,.78,skinColor,0,0,0);
    // Ears and nose make the face read from more angles.
    box(head,.1,.2,.12,skinColor,-.5,-.02,0);box(head,.1,.2,.12,skinColor,.5,-.02,0);
    const eyeWhite=mat('#ffffff',.4),eyeDark=mat('#172033',.32),mouthMat=mat('#9f3b46',.5);
    const eyes=[];
    [-.2,.2].forEach(x=>{
      const eyeGroup=new T.Group();eyeGroup.position.set(x,.08,.405);head.add(eyeGroup);
      const white=new T.Mesh(new T.SphereGeometry(.09,14,12),eyeWhite);white.scale.set(1,1.12,.28);eyeGroup.add(white);
      const pupil=new T.Mesh(new T.SphereGeometry(.045,12,10),eyeDark);pupil.position.set(0,-.005,.022);eyeGroup.add(pupil);eyes.push(eyeGroup);
    });
    const mouth=new T.Mesh(new T.BoxGeometry(face.style==='smirk'?.2:.24,.045,.025),mouthMat);mouth.position.set(face.style==='smirk'?.06:0,-.19,.405);head.add(mouth);
    if(face.style==='star'){
      eyes.forEach((eye,i)=>{eye.clear();const star=new T.Mesh(new T.OctahedronGeometry(.095),mat('#facc15',.28,.12));star.position.z=.02;eye.add(star);});
    }
    // Hair silhouette with style-dependent geometry.
    if(hair.style&&hair.style!=='none'){
      const hc=hair.color||'#1e293b';
      if(hair.style==='mohawk'){
        const strip=box(head,.22,.42,.65,hc,0,.57,-.02);strip.rotation.z=-.05;
      }else if(hair.style==='flame'){
        [-.25,0,.25].forEach((x,i)=>{const spike=new T.Mesh(new T.ConeGeometry(.2,.55,5),mat(hc));spike.position.set(x,.56,0);spike.rotation.z=(i-1)*-.35;head.add(spike);});
        box(head,.91,.16,.8,hc,0,.43,-.02);
      }else if(hair.style==='bob'){
        box(head,.98,.25,.84,hc,0,.43,-.02);box(head,.16,.56,.83,hc,-.42,.08,.02);box(head,.16,.56,.83,hc,.42,.08,.02);
      }else{
        box(head,.94,.19,.84,hc,0,.47,-.02);
        [-.3,-.1,.13,.34].forEach((x,i)=>{const spike=new T.Mesh(new T.ConeGeometry(.16,.34,5),mat(hc));spike.position.set(x,.66,.03);spike.rotation.z=(i-1.5)*-.24;head.add(spike);});
      }
    }
    // Hats and glasses are separate meshes so wardrobe selection feels tangible.
    if(hat.style&&hat.style!=='none'){
      const hatColor=hat.color||'#facc15';box(head,1.0,.14,.86,hatColor,0,.58,0,{metalness:hat.style==='crown'?.25:0});
      if(hat.style==='crown')[-.3,-.1,.1,.3].forEach(x=>{const peak=new T.Mesh(new T.ConeGeometry(.09,.32,4),mat('#facc15',.25,.3));peak.position.set(x,.8,0);head.add(peak);});
      if(hat.style==='mushroom'){const cap=new T.Mesh(new T.SphereGeometry(.58,16,10,0,Math.PI*2,0,Math.PI/2),mat('#ef4444'));cap.scale.y=.55;cap.position.y=.63;head.add(cap);}
      if(hat.style==='grad')box(head,1.22,.06,.95,'#1f2937',0,.7,0);
    }
    if(glass.style&&glass.style!=='none'){
      const frame=glass.style==='shades'?'#111827':'#0f172a',lens=glass.style==='shades'?'#1f2937':'#67e8f9';
      [-.2,.2].forEach(x=>{box(head,.34,.18,.07,lens,x,.08,.47);box(head,.37,.045,.09,frame,x,.19,.47);box(head,.045,.23,.09,frame,x-.17,.08,.47);box(head,.045,.23,.09,frame,x+.17,.08,.47);});
      box(head,.16,.045,.07,frame,0,.1,.48);
    }
    const proportions={classic:[1,1,1],tall:[.92,1.14,.94],broad:[1.12,1.02,1.04],compact:[.9,.9,.94]};
    const scale=proportions[body.style]||proportions.classic;
    root.scale.set(scale[0],scale[1],scale[2]);
    root.userData.parts={leftArm,rightArm,leftLeg,rightLeg,head,eyes};
    root.userData.face=face.style||'happy';
    root.userData.emote=cfg.Emotes||'emote_wave';
    return root;
  }
  function mountThreeScene(canvasId, mode='avatar') {
    const canvas=$(canvasId);
    if(!canvas) return;
    stopOrbitThree();
    const fallback=$('three-fallback-'+mode);
    if(fallback){fallback.style.display='grid';fallback.style.opacity='1';fallback.style.pointerEvents='auto';}
    canvas.style.opacity='0';
    canvas.style.pointerEvents='none';
    canvas.style.display='block';
    const T=window.THREE;
    if(!T || !T.WebGLRenderer){attachFallbackControls(fallback,mode);return;} // The styled and interactive CSS character remains visible.
    let renderer=null;
    try {
      const parent=canvas.parentElement || canvas;
      const rect=parent.getBoundingClientRect();
      const width=Math.max(320,Math.round(rect.width || 560));
      const height=Math.max(360,Math.round(rect.height || (mode==='room'?520:460)));
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
      renderer.setSize(width,height,false);
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=T.PCFSoftShadowMap;
      if('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace=T.SRGBColorSpace;
      if(renderer.toneMapping!==undefined && T.ACESFilmicToneMapping!==undefined){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;}

      const scene=new T.Scene();
      scene.background=new T.Color(mode==='room'?'#11152d':'#11142d');
      scene.fog=new T.Fog(mode==='room'?'#11152d':'#11142d',12,30);
      const camera=new T.PerspectiveCamera(34,width/height,.1,100);
      const cameraHome=mode==='room'?new T.Vector3(7.2,4.7,8.6):new T.Vector3(4.0,3.15,7.1);
      camera.position.copy(cameraHome);camera.lookAt(0,1.42,0);

      scene.add(new T.HemisphereLight('#e8f1ff','#29304d',2.25));
      const key=new T.DirectionalLight('#fff1d3',3.4);key.position.set(-4,8,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
      const fill=new T.DirectionalLight('#8b9dff',1.25);fill.position.set(4,3,-4);scene.add(fill);
      const rim=new T.PointLight('#a855f7',34,12);rim.position.set(3,3,2);scene.add(rim);
      const pink=new T.PointLight('#ec4899',17,9);pink.position.set(-3,2,2);scene.add(pink);

      const floor=new T.Mesh(new T.CircleGeometry(mode==='room'?8:4.4,72),mat(mode==='room'?'#202a4c':'#20284c'));
      floor.rotation.x=-Math.PI/2;floor.position.y=-.2;floor.receiveShadow=true;scene.add(floor);
      // Subtle glowing stage ring gives the avatar a showroom / game-character look.
      if(mode==='avatar'){
        const platform=new T.Group();scene.add(platform);
        const base=new T.Mesh(new T.CylinderGeometry(1.45,1.55,.32,64),mat('#171e39',.38,.5));base.position.y=-.02;base.castShadow=true;base.receiveShadow=true;platform.add(base);
        const trim=new T.Mesh(new T.CylinderGeometry(1.36,1.43,.08,64),mat('#6d5dfc',.3,.38));trim.position.y=.17;trim.castShadow=true;platform.add(trim);
        const ring=new T.Mesh(new T.TorusGeometry(1.48,.035,12,90),new T.MeshStandardMaterial({color:'#facc15',emissive:'#d97706',emissiveIntensity:.42,metalness:.7,roughness:.22}));ring.rotation.x=Math.PI/2;ring.position.y=.14;platform.add(ring);
        const innerRing=new T.Mesh(new T.TorusGeometry(1.08,.018,8,72),new T.MeshStandardMaterial({color:'#a5b4fc',emissive:'#818cf8',emissiveIntensity:.55}));innerRing.rotation.x=Math.PI/2;innerRing.position.y=.215;platform.add(innerRing);
        const avatar=buildAvatar3D(state.avatar);avatar.position.set(0,.42,0);platform.add(avatar);
        // Floating stars and spinning collectible coins decorate the dressing-room preview.
        const stars=[];
        for(let i=0;i<34;i++){
          const star=new T.Mesh(new T.OctahedronGeometry(.035+(i%3)*.012),mat(i%3===0?'#fde68a':i%3===1?'#c4b5fd':'#67e8f9',.28,.18));
          const a=i/34*Math.PI*2,r=2.05+(i%5)*.19;star.position.set(Math.cos(a)*r,.35+(i%7)*.39,Math.sin(a)*r);star.userData.baseY=star.position.y;stars.push(star);scene.add(star);
        }
        const coins=[];
        for(let i=0;i<4;i++){
          const coin=new T.Mesh(new T.CylinderGeometry(.16,.16,.045,32),new T.MeshStandardMaterial({color:'#fbbf24',metalness:.78,roughness:.2,emissive:'#92400e',emissiveIntensity:.2}));
          coin.rotation.x=Math.PI/2;coin.position.set(Math.cos(i*1.57)*2.15,1.05+(i%2)*.52,Math.sin(i*1.57)*2.15);coin.userData.orbit={angle:i*1.57,r:2.15,y:coin.position.y};scene.add(coin);coins.push(coin);
        }
        // A soft spotlight underneath the character creates a showroom platform.
        const spot=new T.PointLight('#8b5cf6',24,5);spot.position.set(0,.5,0);scene.add(spot);
        return startAnimation({canvas,renderer,scene,camera,avatar,platform,coins,stars,mode,fallback,cameraHome});
      }

      // Room / home view: desk, screen, shelf, window, lamp, plants and trophies.
      const room=new T.Group();scene.add(room);
      const back=box(room,12,6.5,.22,'#29345e',0,2.8,-4.1);back.receiveShadow=true;
      box(room,.22,6.2,8.4,'#354273',-6,2.8,0);
      box(room,3.15,.52,1.3,'#8b5e3c',1.65,.68,-1.55);
      [-.75, .75, 3.7].forEach((x)=>box(room,.16,.9,.16,'#70452f',x,.12,-1.15));
      box(room,1.18,.72,.12,'#0c1634',1.62,1.38,-2.12);
      box(room,1.05,.59,.06,'#38bdf8',1.62,1.38,-2.04);
      // Floating shelf with books.
      box(room,2.35,.14,.42,'#7c4b32',-3.35,2.38,-3.05);
      for(let i=0;i<6;i++)box(room,.2,.72+(i%2)*.12,.23,['#f59e0b','#38bdf8','#a78bfa','#34d399','#fb7185','#f8fafc'][i],-4.2+i*.34,2.78,-3.03,{rz:(i%2?-.04:.04)});
      // Glowing nebula window.
      const windowMesh=box(room,2.1,1.72,.09,'#0c1739',-1.1,3.35,-3.88);windowMesh.material.emissive=new T.Color('#3730a3');windowMesh.material.emissiveIntensity=.65;
      box(room,.08,1.82,.1,'#a5b4fc',-1.1,3.35,-3.78);box(room,2.1,.08,.1,'#a5b4fc',-1.1,3.35,-3.78);
      // Floor rug, lamp and room decorations.
      const rug=new T.Mesh(new T.CircleGeometry(1.55,48),mat('#6545b6'));rug.rotation.x=-Math.PI/2;rug.position.set(.55,-.12,1.25);room.add(rug);
      box(room,.14,1.05,.14,'#fbbf24',3.55,.53,-1.45);const lampShade=new T.Mesh(new T.ConeGeometry(.38,.35,16),mat('#fbbf24',.3,.25));lampShade.position.set(3.55,1.18,-1.45);room.add(lampShade);
      for(let i=0;i<4;i++)box(room,.62,.12,.6,['#f59e0b','#38bdf8','#a78bfa','#34d399'][i],-3.1,.23+i*.38,-2.6);
      if(state.worldState.owned.includes('plant')){const pot=new T.Mesh(new T.CylinderGeometry(.22,.3,.42,16),mat('#c084fc'));pot.position.set(3,.2,.5);room.add(pot);[-.2,0,.2].forEach(x=>{const leaf=new T.Mesh(new T.SphereGeometry(.22,12,10),mat('#22c55e'));leaf.scale.set(.65,1.5,.5);leaf.position.set(3+x,.65,.5);room.add(leaf);});}
      if(state.worldState.owned.includes('trophy')){const cup=new T.Mesh(new T.CylinderGeometry(.28,.2,.34,16),mat('#facc15',.3,.45));cup.position.set(2.8,1.5,-1.8);room.add(cup);}
      if(state.worldState.owned.includes('globe')){const globe=new T.Mesh(new T.SphereGeometry(.38,20,16),mat('#38bdf8',.24,.4));globe.position.set(-3,2.9,-2.7);room.add(globe);}
      const avatar=buildAvatar3D(state.avatar);avatar.position.set(-1.25,.12,.35);avatar.scale.set(.72,.72,.72);room.add(avatar);
      const stars=[];for(let i=0;i<16;i++){const star=new T.Mesh(new T.OctahedronGeometry(.035),mat('#fde68a'));star.position.set(-1.9+Math.random()*1.5,2.45+Math.random()*1.25,-3.7);star.userData.baseY=star.position.y;stars.push(star);room.add(star);}
      return startAnimation({canvas,renderer,scene,camera,avatar,stars,mode,fallback,cameraHome});

      function startAnimation(config){
        const {canvas,renderer,scene,camera,avatar,platform,coins=[],stars=[],mode,fallback,cameraHome}=config;
        let dragging=false,lastX=0,lastY=0,autoRotate=true,fallbackHideScheduled=false;
        const animateStarted=performance.now();
        const updateSize=()=>{
          const r=canvas.parentElement?.getBoundingClientRect()||canvas.getBoundingClientRect();
          const w=Math.max(320,Math.round(r.width||560)),h=Math.max(360,Math.round(r.height||(mode==='room'?520:460)));
          renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
        };
        canvas.style.touchAction='none';
        canvas.onpointerdown=e=>{dragging=true;autoRotate=false;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);};
        canvas.onpointermove=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;avatar.rotation.y+=dx*.012;avatar.rotation.x=Math.max(-.16,Math.min(.16,avatar.rotation.x+dy*.002));lastX=e.clientX;lastY=e.clientY;};
        canvas.onpointerup=()=>{dragging=false;};canvas.onpointercancel=()=>{dragging=false;};
        canvas.onwheel=e=>{e.preventDefault();const f=e.deltaY>0?1.045:.955;camera.position.multiplyScalar(f);const target=new T.Vector3(0,1.42,0);const distance=camera.position.distanceTo(target);camera.position.setLength(Math.max(mode==='room'?7.2:5.0,Math.min(mode==='room'?17:11,distance)));camera.lookAt(target);};
        canvas.ondblclick=()=>{avatar.rotation.set(0,0,0);camera.position.copy(cameraHome);camera.lookAt(0,1.42,0);autoRotate=true;};
        const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(updateSize):null;resizeObserver?.observe(canvas.parentElement||canvas);
        const record={renderer,scene,camera,avatar,platform,stars,coins,raf:0,mode,canvas,resizeObserver};
        orbitThree=record;
        const animate=()=>{
          const t=(performance.now()-animateStarted)/1000;
          if(mode==='avatar'){
            if(autoRotate)avatar.rotation.y+=.0018;
            avatar.position.y=.42+Math.sin(t*2.15)*.045;
            const parts=avatar.userData.parts||{};
            if(parts.head){parts.head.rotation.y=Math.sin(t*.85)*.045;parts.head.rotation.z=Math.sin(t*1.3)*.018;}
            const emoteActive=performance.now()<(avatar.userData.emoteUntil||0);
            const emote=avatar.userData.emote||'emote_wave';
            if(parts.leftArm){
              parts.leftArm.rotation.x=emoteActive&&emote==='emote_cheer'?-1.35:Math.sin(t*1.8)*.07;
              parts.rightArm.rotation.x=emoteActive?(emote==='emote_cheer'?-1.35:emote==='emote_genius'?-1.0:-1.45):Math.sin(t*1.8+1)*.07;
              parts.rightArm.rotation.z=emoteActive&&emote!=='emote_cheer'?(emote==='emote_genius'?.28:-.32):0;
            }
            if(emoteActive&&emote==='emote_cosmic')avatar.rotation.y+=.035;
            if(emoteActive&&emote==='emote_cheer')avatar.position.y=.42+Math.abs(Math.sin(t*12))*.22;
            if(parts.leftLeg){parts.leftLeg.rotation.x=Math.sin(t*1.8)*.035;parts.rightLeg.rotation.x=-Math.sin(t*1.8)*.035;}
            if(platform)platform.rotation.y=Math.sin(t*.25)*.04;
            coins.forEach((coin,i)=>{const o=coin.userData.orbit;coin.position.x=Math.cos(t*.5+o.angle)*o.r;coin.position.z=Math.sin(t*.5+o.angle)*o.r;coin.rotation.y=t*1.8+i;coin.position.y=o.y+Math.sin(t*2+i)*.09;});
            stars.forEach((star,i)=>{star.position.y=star.userData.baseY+Math.sin(t*1.4+i)*.06;star.rotation.y+=.012;});
          }else{
            avatar.position.y=.12+Math.sin(t*1.7)*.035;
            stars.forEach((star,i)=>{star.position.y=star.userData.baseY+Math.sin(t+i)*.05;star.rotation.y+=.01;});
          }
          try{renderer.render(scene,camera);if(fallback&&!fallbackHideScheduled){fallbackHideScheduled=true;fallback.style.opacity='0';fallback.style.pointerEvents='none';setTimeout(()=>{if(fallback)fallback.style.display='none';},260);}canvas.style.opacity='1';canvas.style.pointerEvents='auto';}
          catch(err){console.warn('Orbit renderer stopped; using the visible fallback.',err);canvas.style.opacity='0';canvas.style.pointerEvents='none';if(fallback){fallback.style.display='grid';fallback.style.opacity='1';fallback.style.pointerEvents='auto';attachFallbackControls(fallback,mode);}stopOrbitThree();return;}
          record.raf=requestAnimationFrame(animate);
        };
        updateSize();animate();
      }
    } catch(err) {
      console.warn('Orbit 3D preview unavailable; the styled character remains visible.',err);
      canvas.style.opacity='0';
      canvas.style.pointerEvents='none';
      if(fallback){fallback.style.display='grid';fallback.style.opacity='1';fallback.style.pointerEvents='auto';attachFallbackControls(fallback,mode);}
      try{renderer?.dispose();}catch(_){}
      orbitThree=null;
    }
  }

  function rotateAvatar(direction){
    if(orbitThree?.avatar){orbitThree.avatar.rotation.y+=(Number(direction)||1)*.52;}
    else{const model=$('three-fallback-avatar')?.querySelector('.orbit-fallback-avatar');if(model){const current=Number(model.dataset.angle),angle=(Number.isFinite(current)?current:-18)+(Number(direction)||1)*24;model.dataset.angle=String(angle);model.style.transform=`translateX(-50%) rotateY(${angle}deg) scale(calc(var(--body-x,1)*var(--orbit-zoom,1)),calc(var(--body-y,1)*var(--orbit-zoom,1)))`;}}
  }
  function resetAvatarView(){
    if(orbitThree?.avatar){orbitThree.avatar.rotation.set(0,0,0);}
    const model=$('three-fallback-avatar')?.querySelector('.orbit-fallback-avatar');if(model){model.style.setProperty('--orbit-zoom','1');model.style.transform='translateX(-50%) rotateY(-18deg) scale(var(--body-x,1),var(--body-y,1))';model.dataset.angle='-18';}
  }
  function playAvatarEmote(id=state.avatar.Emotes||'emote_wave'){
    playSfx('coin');
    if(orbitThree?.avatar){orbitThree.avatar.userData.emote=id;orbitThree.avatar.userData.emoteUntil=performance.now()+1500;return;}
    const model=$('three-fallback-avatar')?.querySelector('.orbit-fallback-avatar');
    if(model){model.dataset.emote=id;model.classList.remove('celebrate');void model.offsetWidth;model.classList.add('celebrate');setTimeout(()=>model.classList.remove('celebrate'),1500);}
  }
  window.rotateAvatar=rotateAvatar;window.resetAvatarView=resetAvatarView;window.playAvatarEmote=playAvatarEmote;

  window.addEventListener('resize',()=>{
    if(!orbitThree || !['avatar','world'].includes(state.activeTab)) return;
    const isRoom=state.activeTab==='world';
    const canvasId=isRoom?'orbit-world-canvas':'orbit-avatar-canvas';
    const canvas=$(canvasId);
    if(canvas){const r=canvas.parentElement?.getBoundingClientRect();if(r && orbitThree.renderer){orbitThree.renderer.setSize(Math.max(320,Math.round(r.width||560)),Math.max(360,Math.round(r.height||460)),false);orbitThree.camera.aspect=Math.max(320,r.width||560)/Math.max(360,r.height||460);orbitThree.camera.updateProjectionMatrix();}}
  });

  // Additional learning and world modules.
  if (Array.isArray(SECTIONS)) {
    if (!SECTIONS.some(s=>s.id==='intelligence')) SECTIONS.splice(2,0,{id:'intelligence',label:'Orbit Intelligence',icon:'🧠',color:'bg-indigo-600',badgeColor:'text-indigo-600'});
    if (!SECTIONS.some(s=>s.id==='world')) SECTIONS.splice(SECTIONS.findIndex(s=>s.id==='avatar')+1,0,{id:'world',label:'Orbit World',icon:'🌌',color:'bg-violet-600',badgeColor:'text-violet-600'});
    SECTIONS.forEach(s=>{
      if(s.id==='springdales') s.label='SDES GRAM';
      if(s.id==='about') s.label='About Us';
      if(s.id==='lingua') s.label='Orbit Lingo';
      if(s.id==='planner') s.label='Orbit Planner';
      if(s.id==='avatar') s.label='3D Avatar Studio';
      if(s.id==='shop') s.label='Marketplace';
      if(s.id==='quests') s.label='Daily Quests';
    });
  }

  function openOrbiterPrompt(prompt) {
    switchTab('orbitchat');
    setTimeout(()=>{const input=$('ch-input');if(input){input.value=prompt;input.focus();}},100);
  }
  function renderIntelligenceView() {
    const due=getDueCardsCount();
    const openTasks=state.tasks.filter(t=>!t.done);
    const unresolved=state.mistakes.filter(m=>!m.cleared);
    const nextExam=state.exams.filter(e=>e.date && new Date(e.date+'T23:59:59')>=new Date()).sort((a,b)=>a.date.localeCompare(b.date))[0];
    const subjectCounts={}; unresolved.forEach(m=>subjectCounts[m.subject]=(subjectCounts[m.subject]||0)+1);
    const weak=Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1])[0];
    const suggestions=[];
    if(due) suggestions.push({icon:'🃏',title:`Review ${due} due flashcards`,desc:'A short recall session helps keep older learning fresh.',action:"switchTab('flashcards')"});
    if(unresolved.length) suggestions.push({icon:'🔍',title:`Revisit ${unresolved.length} mistakes`,desc:weak?`${weak[0]} appears most often in your unresolved mistake book.`:'Turn mistakes into practice questions.',action:"switchTab('planner'); plannerSubTab='mistakes'; renderCurrentView()"});
    if(openTasks.length) suggestions.push({icon:'✅',title:`Complete your next study task`,desc:`${openTasks.length} task${openTasks.length===1?'':'s'} still waiting in your planner.`,action:"switchTab('planner')"});
    if(nextExam) suggestions.push({icon:'📅',title:`Prepare for ${esc(nextExam.title)}`,desc:`Your next saved exam is ${esc(nextExam.date)}.`,action:"switchTab('planner'); plannerSubTab='exams'; renderCurrentView()"});
    if(!suggestions.length) suggestions.push({icon:'🌱',title:'Build your first learning routine',desc:'Add a task, create a flashcard deck or ask Orbiter to explain a topic.',action:"switchTab('planner')"});
    return `<div class="orbit-hero orbit-gradient-indigo"><div><div class="orbit-kicker">YOUR PERSONAL LEARNING STRATEGIST</div><h1>🧠 Orbit Intelligence</h1><p>Orbit looks at the study activity saved in this profile and helps you choose a useful next step. It is your progress coach; Orbiter remains your AI tutor.</p></div><div class="orbit-hero-stat"><b>Level ${getLevel()}</b><span>${money(state.xp)} total XP</span></div></div>
      <div class="orbit-grid-4">
        <div class="orbit-panel"><span>🃏</span><b>${due}</b><small>Cards due</small></div><div class="orbit-panel"><span>✅</span><b>${openTasks.length}</b><small>Open tasks</small></div><div class="orbit-panel"><span>🔍</span><b>${unresolved.length}</b><small>Unresolved mistakes</small></div><div class="orbit-panel"><span>🔥</span><b>${state.streak}</b><small>Study streak days</small></div>
      </div>
      <div class="orbit-panel"><div class="orbit-section-head"><div><h2>🎯 Your next best steps</h2><p>Suggestions based on your saved planner, flashcards and mistake book.</p></div><button class="orbit-btn orbit-btn-soft" onclick="openOrbiterPrompt('Help me make a realistic study plan from my current subjects, weak topics and upcoming exams. Ask me for any missing information.')">Ask Orbiter to plan</button></div>
        <div class="orbit-recommendations">${suggestions.map(s=>`<button class="orbit-recommendation" onclick="${s.action}"><span>${s.icon}</span><span><b>${s.title}</b><small>${s.desc}</small></span><strong>→</strong></button>`).join('')}</div>
      </div>
      <div class="orbit-grid-2"><div class="orbit-panel"><h2>📚 Study smarter</h2><p>Turn a difficult topic into a clear explanation, a short quiz or a set of revision cards.</p><div class="orbit-button-row"><button class="orbit-btn" onclick="openOrbiterPrompt('Explain a difficult topic to me step by step, using simple examples. Ask which topic I want first.')">Explain a topic</button><button class="orbit-btn orbit-btn-soft" onclick="openOrbiterPrompt('Quiz me on a topic I am studying. Ask one question at a time and explain my mistakes.')">Quiz me</button></div></div>
      <div class="orbit-panel"><h2>🗺️ Build a study plan</h2><p>Use the planner for your routine and the AI tutor for explanations. Keep sessions short, realistic and balanced.</p><div class="orbit-button-row"><button class="orbit-btn" onclick="switchTab('planner')">Open planner</button><button class="orbit-btn orbit-btn-soft" onclick="switchTab('flashcards')">Review cards</button></div></div></div>
      <p class="orbit-footnote">Data note: these recommendations use information stored in this browser profile. They are not a clinical, school-graded or server-generated assessment.</p>`;
  }

  // 3D Avatar creator with real orbit/drag preview and the original item catalog.
  function renderAvatarFallback3D(cfg=state.avatar){
    const find=(cat)=>(AVATAR_CATALOG[cat]||[]).find(x=>x.id===cfg[cat])||(AVATAR_CATALOG[cat]||[])[0]||{};
    const skin=find('Skin'),hair=find('Hair'),shirt=find('Shirt'),pants=find('Pants'),hat=find('Hats'),glass=find('Glasses'),cape=find('Capes'),shoes=find('Shoes'),body=find('Body');
    const shape={classic:[1,1],tall:[.92,1.12],broad:[1.12,1.02],compact:[.9,.9]}[body.style]||[1,1];
    return `<div class="orbit-fallback-scene">
      <div class="orbit-fallback-sky-orb orbit-fallback-sky-one"></div><div class="orbit-fallback-sky-orb orbit-fallback-sky-two"></div>
      <div class="orbit-fallback-stars"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i></div>
      <div class="orbit-fallback-coins"><b>🪙</b><b>✦</b><b>🪙</b><b>✧</b></div>
      <div class="orbit-fallback-pedestal"><span></span><i></i></div>
      <div class="orbit-fallback-avatar" data-angle="-18" style="--skin:${esc(skin.color||'#FDBA74')};--hair:${esc(hair.color||'#1e293b')};--shirt:${esc(shirt.color||'#3b82f6')};--pants:${esc(pants.color||'#334155')};--hat:${esc(hat.color||'#facc15')};--shoes:${esc(shoes.color||'#f8fafc')};--cape:${esc(cape.color||'#8b5cf6')};--body-x:${shape[0]};--body-y:${shape[1]}">
        <div class="fb-cape fb-cape-${esc(cape.style||'none')}" style="display:${cape.style&&cape.style!=='none'?'block':'none'}"></div>
        <div class="fb-arm fb-arm-left"><i></i></div><div class="fb-arm fb-arm-right"><i></i></div>
        <div class="fb-leg fb-leg-left"><i></i></div><div class="fb-leg fb-leg-right"><i></i></div>
        <div class="fb-torso"><span>✦</span><b class="fb-torso-badge">ORBIT</b></div>
        <div class="fb-head"><div class="fb-hair" style="display:${hair.style&&hair.style!=='none'?'block':'none'}"></div><div class="fb-face"><i></i><i></i><b></b></div><div class="fb-glasses" style="display:${glass.style&&glass.style!=='none'?'block':'none'}"></div><div class="fb-hat" style="display:${hat.style&&hat.style!=='none'?'block':'none'}"></div></div>
      </div>
      <div class="orbit-fallback-ground-glow"></div><div class="orbit-fallback-caption">ORBIT AVATAR · 360° PREVIEW</div>
    </div>`;
  }

  function renderAvatar3DView() {
    const categories=Object.keys(AVATAR_CATALOG),items=AVATAR_CATALOG[avatarTab]||[];
    const tabIcons={Skin:'🧑',Hair:'💇',Face:'😊',Shirt:'👕',Pants:'👖',Hats:'🧢',Glasses:'👓',Capes:'🪽',Shoes:'👟',Body:'🧍',Emotes:'🎭'};
    return `<div class="orbit-studio-page orbit-roblox-studio">
      <div class="orbit-studio-topbar"><div class="orbit-studio-brand"><span class="orbit-studio-brand-mark">✦</span><div><b>AVATAR EDITOR</b><small>Make your character yours</small></div></div><div class="orbit-studio-wallet"><span>🪙 ${money(state.coins)}</span><span>🪙 ${money(state.gems)}</span><span>✨ LV ${getLevel()}</span></div></div>
      <div class="orbit-studio-hero"><div><span class="orbit-studio-eyebrow">ORBIT CHARACTER CUSTOMISATION</span><h1>Build your look.</h1><p>Choose your style, mix and match your collection, and see every change on your live character preview.</p></div><div class="orbit-studio-hero-actions"><button class="orbit-studio-action orbit-studio-action-light" onclick="randomizeAvatar()">🎲 Random outfit</button><button class="orbit-studio-action" onclick="renameCadet()">✏️ Rename</button></div></div>
      <div class="orbit-studio-main-grid">
        <section class="orbit-character-panel">
          <div class="orbit-character-panel-head"><div><span class="orbit-studio-eyebrow">YOUR CHARACTER</span><h2>${esc(state.username||'Orbit Cadet')}</h2><small>Drag to rotate · Scroll to zoom · Double-click to reset</small></div><span class="orbit-online-indicator"><i></i> PREVIEW LIVE</span></div>
          <div class="orbit-avatar-preview-wrap">
            <div id="three-fallback-avatar" class="orbit-3d-fallback">${renderAvatarFallback3D(state.avatar)}</div>
            <canvas id="orbit-avatar-canvas" class="orbit-3d-canvas" aria-label="Interactive 3D Orbit character preview"></canvas>
          </div>
          <div class="orbit-character-controls"><button onclick="rotateAvatar(-1)" title="Rotate left">⟲</button><button onclick="resetAvatarView()" title="Reset character">↺</button><button onclick="rotateAvatar(1)" title="Rotate right">⟳</button><button class="orbit-character-emote" onclick="playAvatarEmote()">🙌 Celebrate</button></div>
          <div class="orbit-character-stats"><div><small>WARDROBE ITEMS</small><b>${state.ownedItems.length}</b></div><div><small>CHARACTER LEVEL</small><b>${getLevel()}</b></div><div><small>STYLE</small><b>Custom</b></div></div>
          <div class="orbit-studio-tip">✨ Your look is saved automatically on this device.</div>
        </section>
        <section class="orbit-wardrobe-panel">
          <div class="orbit-wardrobe-head"><div><span class="orbit-studio-eyebrow">CUSTOMISE</span><h2>Wardrobe</h2><p>Select a category, then tap an item to equip or unlock it.</p></div><span class="orbit-wardrobe-count">${items.length} ITEMS</span></div>
          <div class="orbit-wardrobe-categories">${categories.map(c=>`<button class="orbit-wardrobe-tab ${avatarTab===c?'active':''}" onclick="avatarTab='${c}';playSfx('click');renderCurrentView()">${c==='Skin'?'🧑':c==='Hair'?'💇':c==='Face'?'😊':c==='Shirt'?'👕':c==='Pants'?'👖':c==='Hats'?'🧢':c==='Glasses'?'👓':c==='Capes'?'🪽':c==='Shoes'?'👟':c==='Body'?'🧍':'🎭'} <span>${esc(c)}</span></button>`).join('')}</div>
          <div class="orbit-wardrobe-items">${items.map(it=>{const owned=state.ownedItems.includes(it.id),isEmote=avatarTab==='Emotes',equipped=isEmote?state.avatar.Emotes===it.id:state.avatar[avatarTab]===it.id,locked=getLevel()<(it.reqLv||1);return `<button class="orbit-wardrobe-item ${equipped?'equipped':''} ${locked&&!owned?'locked':''}" onclick="selectOrBuyAvatarItem('${avatarTab}','${it.id}')"><span class="orbit-wardrobe-swatch" style="--swatch:${esc(it.color||'#a78bfa')};background:linear-gradient(145deg,${esc(it.color||'#a78bfa')},#fff6)">${tabIcons[avatarTab]||'✦'}</span><span class="orbit-wardrobe-item-text"><b>${esc(it.name)}</b><small>${owned?(isEmote?(equipped?'▶ Play selected emote':'▶ Play emote'):equipped?'✓ Equipped':'Owned'):locked?`🔒 Level ${it.reqLv}`:`🪙 ${money(it.price)}`}</small></span><em class="orbit-rarity rarity-${esc(it.rarity||'Common')}">${esc(it.rarity||'Common')}</em>${equipped?'<span class="orbit-equipped-check">✓</span>':''}</button>`;}).join('')}</div>
          <div class="orbit-wardrobe-footer"><span>🔒 Some items unlock as you learn and level up.</span><button onclick="switchTab('shop')">Visit Marketplace →</button></div>
        </section>
      </div>
      <section class="orbit-outfit-strip"><div><span class="orbit-studio-eyebrow">SAVE YOUR STYLE</span><h2>Outfit presets</h2><p>Keep up to three different looks ready to switch between.</p></div><div class="orbit-outfit-row">${[0,1,2].map(i=>`<button class="orbit-outfit-slot ${state.outfits[i]?'saved':''}" onclick="handleOutfitSlot(${i})"><span>${state.outfits[i]?'👕':'＋'}</span><b>Outfit ${i+1}</b><small>${state.outfits[i]?'Saved look':'Save current look'}</small></button>`).join('')}</div></section>
    </div>`;
  }

  // 3D Orbit World: a personal room with furniture that can be earned, not bought for real money.
  function buyWorldDecor(id) {
    const d=WORLD_DECOR.find(x=>x.id===id);if(!d||state.worldState.owned.includes(id))return;
    if(state.coins<d.price)return showToast(`You need ${d.price} coins.`,'🪙');
    state.coins-=d.price;localStorage.setItem(STORAGE_KEYS.coins,state.coins);state.worldState.owned.push(id);state.worldState.placed.push(id);save(V2.worldKey,state.worldState);updateHeaderUI();playSfx('coin');renderCurrentView();
  }
  function renderWorldView() {
    return `<div class="orbit-hero orbit-gradient-space"><div><div class="orbit-kicker">YOUR PERSONAL UNIVERSE</div><h1>🌌 Orbit World</h1><p>A 3D study room for your avatar, trophies and favourite decorations. Earn coins through learning and make this space yours.</p></div><div class="orbit-hero-stat"><b>${state.worldState.owned.length}</b><span>Room items owned</span></div></div>
      <section class="orbit-panel"><div class="orbit-section-head"><div><h2>🏡 Your room</h2><p>Rotate your avatar in the 3D room and arrange your earned decorations.</p></div><span class="orbit-badge">3D INTERACTIVE</span></div><div class="orbit-world-preview-wrap"><div id="three-fallback-room" class="orbit-3d-fallback orbit-room-fallback"><div class="orbit-room-window">✦ · ✧ · ✦</div><div class="orbit-room-shelf">📚 📘 📗 📙</div><div class="orbit-room-desk"><span>💻</span><i></i></div><div class="orbit-room-avatar">${renderAvatarFallback3D(state.avatar)}</div><div class="orbit-room-floor"></div><small>YOUR ORBIT ROOM · ALWAYS READY</small></div><canvas id="orbit-world-canvas" class="orbit-3d-canvas orbit-world-canvas" aria-label="Interactive three-dimensional Orbit study room"></canvas></div></section>
      <section class="orbit-panel"><h2>🛋️ Room collection</h2><p class="orbit-muted">Buy decorations with earned Orbit Coins.</p><div class="orbit-decor-grid">${WORLD_DECOR.map(d=>{const owned=state.worldState.owned.includes(d.id);return `<div class="orbit-decor"><span>${d.emoji}</span><b>${d.name}</b><small>${d.desc}</small><button class="orbit-btn ${owned?'orbit-btn-soft':''}" ${owned?'disabled':''} onclick="buyWorldDecor('${d.id}')">${owned?'✓ Owned':`🪙 ${d.price}`}</button></div>`;}).join('')}</div></section>`;
  }

  // Orbit Lingo: learning path, skill practice, pronunciation and mistake-safe feedback.
  const LINGO_LESSON_PACKS = {
    Spanish:[
      {title:'Greetings',q:'Translate: “Good morning”',words:['Buenos','días','gracias','adiós'],ans:'Buenos días',say:'Buenos días'},
      {title:'Polite phrases',q:'Translate: “Thank you very much”',words:['Muchas','gracias','por','favor','hola'],ans:'Muchas gracias',say:'Muchas gracias'},
      {title:'Everyday conversation',q:'Translate: “How are you?”',words:['¿Cómo','estás?','buenos','días'],ans:'¿Cómo estás?',say:'¿Cómo estás?'}
    ],
    French:[
      {title:'Greetings',q:'Translate: “Good morning”',words:['Bonjour','merci','au','revoir'],ans:'Bonjour',say:'Bonjour'},
      {title:'Polite phrases',q:'Translate: “Thank you very much”',words:['Merci','beaucoup','bonjour','pardon'],ans:'Merci beaucoup',say:'Merci beaucoup'},
      {title:'Everyday conversation',q:'Translate: “How are you?”',words:['Comment','ça','va?','merci'],ans:'Comment ça va?',say:'Comment ça va?'}
    ],
    Japanese:[
      {title:'Greetings · Romaji',q:'Translate: “Good morning”',words:['Ohayō','gozaimasu','arigatō','sayonara'],ans:'Ohayō gozaimasu',say:'おはようございます'},
      {title:'Polite phrases · Romaji',q:'Translate: “Thank you”',words:['Arigatō','gozaimasu','konnichiwa','neko'],ans:'Arigatō gozaimasu',say:'ありがとうございます'},
      {title:'Everyday conversation · Romaji',q:'Translate: “I am a student”',words:['Watashi','wa','gakusei','desu','mizu'],ans:'Watashi wa gakusei desu',say:'私は学生です'}
    ],
    German:[
      {title:'Greetings',q:'Translate: “Good morning”',words:['Guten','Morgen','Danke','Hallo'],ans:'Guten Morgen',say:'Guten Morgen'},
      {title:'Polite phrases',q:'Translate: “Thank you very much”',words:['Vielen','Dank','Guten','Tag'],ans:'Vielen Dank',say:'Vielen Dank'},
      {title:'Everyday conversation',q:'Translate: “How are you?”',words:['Wie','geht','es','dir?','Danke'],ans:'Wie geht es dir?',say:'Wie geht es dir?'}
    ],
    Korean:[
      {title:'Greetings · Romanisation',q:'Translate: “Hello”',words:['Annyeonghaseyo','gamsahamnida','mul','haksaeng'],ans:'Annyeonghaseyo',say:'안녕하세요'},
      {title:'Polite phrases · Romanisation',q:'Translate: “Thank you”',words:['Gamsahamnida','annyeong','ne','mul'],ans:'Gamsahamnida',say:'감사합니다'},
      {title:'Everyday conversation · Romanisation',q:'Translate: “I am a student”',words:['Jeoneun','haksaengimnida','annyeonghaseyo','gamsahamnida'],ans:'Jeoneun haksaengimnida',say:'저는 학생입니다'}
    ],
    Mandarin:[
      {title:'Greetings · Pinyin',q:'Translate: “Good morning”',words:['Zǎoshang','hǎo','xièxie','nǐ'],ans:'Zǎoshang hǎo',say:'早上好'},
      {title:'Polite phrases · Pinyin',q:'Translate: “Thank you”',words:['Xièxie','nǐ','zàijiàn','hǎo'],ans:'Xièxie nǐ',say:'谢谢你'},
      {title:'Everyday conversation · Pinyin',q:'Translate: “I am a student”',words:['Wǒ','shì','xuéshēng','nǐ','hǎo'],ans:'Wǒ shì xuéshēng',say:'我是学生'}
    ],
    Hindi:[
      {title:'Greetings',q:'Translate: “Hello / greetings”',words:['नमस्ते','धन्यवाद','अलविदा','किताब'],ans:'नमस्ते',say:'नमस्ते'},
      {title:'Polite phrases',q:'Translate: “Thank you”',words:['धन्यवाद','कृपया','नमस्ते','पानी'],ans:'धन्यवाद',say:'धन्यवाद'},
      {title:'Everyday conversation',q:'Translate: “Knowledge is power”',words:['ज्ञान','ही','शक्ति','है','पुस्तक'],ans:'ज्ञान ही शक्ति है',say:'ज्ञान ही शक्ति है'}
    ],
    Arabic:[
      {title:'Greetings · Transliteration',q:'Translate: “Peace be upon you”',words:['As-salamu','alaykum','shukran','marhaban'],ans:'As-salamu alaykum',say:'السلام عليكم'},
      {title:'Polite phrases · Transliteration',q:'Translate: “Thank you”',words:['Shukran','afwan','marhaban','kitab'],ans:'Shukran',say:'شكراً'},
      {title:'Everyday conversation · Transliteration',q:'Translate: “Hello”',words:['Marhaban','shukran','sabah','khayr'],ans:'Marhaban',say:'مرحباً'}
    ],
    Italian:[
      {title:'Greetings',q:'Translate: “Good morning”',words:['Buongiorno','grazie','arrivederci','ciao'],ans:'Buongiorno',say:'Buongiorno'},
      {title:'Polite phrases',q:'Translate: “Thank you very much”',words:['Grazie','mille','buongiorno','prego'],ans:'Grazie mille',say:'Grazie mille'},
      {title:'Everyday conversation',q:'Translate: “How are you?”',words:['Come','stai?','grazie','ciao'],ans:'Come stai?',say:'Come stai?'}
    ],
    Portuguese:[
      {title:'Greetings',q:'Translate: “Good morning”',words:['Bom','dia','obrigado','olá'],ans:'Bom dia',say:'Bom dia'},
      {title:'Polite phrases',q:'Translate: “Thank you”',words:['Obrigado','obrigada','bom','dia'],ans:'Obrigado',say:'Obrigado'},
      {title:'Everyday conversation',q:'Translate: “How are you?”',words:['Como','vai?','obrigado','olá'],ans:'Como vai?',say:'Como vai?'}
    ]
  };
  function currentLingoPack(lang=state.lingua.selectedLang||'Spanish') {
    const pack=LINGO_LESSON_PACKS[lang]||LINGO_LESSON_PACKS.Spanish;
    const idx=Math.min(pack.length-1,Math.max(0,Number(state.lingoProgress.current?.[lang]||0)));
    return {...pack[idx],index:idx};
  }

  function renderOrbitLingo() {
    const lang=state.lingua.selectedLang||'Spanish';
    const cur=LINGUA_COURSES[lang]||LINGUA_COURSES.Spanish;
    const lesson=currentLingoPack(lang);
    const complete=state.lingoProgress.completed[lang]||0;
    const pack=LINGO_LESSON_PACKS[lang]||LINGO_LESSON_PACKS.Spanish;
    const courseComplete=Number(state.lingoProgress.current?.[lang]||0)>=pack.length;
    const lessonActivity=courseComplete
      ? `<div class="orbit-empty">🎉<b>Starter path completed!</b><span>You finished the available starter lessons in ${esc(lang)}. Your progress is saved. More course units can be added as Orbit's language library grows.</span></div>`
      : `<p class="orbit-question">${esc(lesson.q)}</p><div class="orbit-word-answer">${linguaSelectedWords.length?linguaSelectedWords.map((w,i)=>`<button onclick="linguaSelectedWords.splice(${i},1);renderCurrentView()">${esc(w)} ×</button>`).join(''):'Tap the words below to build your answer.'}</div><div class="orbit-word-bank">${lesson.words.map(w=>`<button onclick="linguaSelectedWords.push('${esc(w).replace(/'/g,"\\'")}');playSfx('click');renderCurrentView()">${esc(w)}</button>`).join('')}</div><div class="orbit-button-row"><button class="orbit-btn orbit-btn-soft" onclick="linguaSelectedWords=[];renderCurrentView()">Reset</button><button class="orbit-btn" onclick="checkOrbitLingoAnswer()">Check answer ✓</button></div><p class="orbit-footnote">A mistake is part of learning. You can retry and review the phrase without losing your progress.</p>`;
    return `<div class="orbit-hero orbit-gradient-green"><div><div class="orbit-kicker">LANGUAGE LEARNING STUDIO</div><h1>🌍 Orbit Lingo</h1><p>Build vocabulary, form sentences, listen and practise pronunciation. Lessons are short, colourful and designed around real learning.</p></div><div class="orbit-hero-stat"><b>${state.lingua.xp||0} XP</b><span>${state.lingua.streak||0} day practice streak</span></div></div>
      <div class="orbit-lingo-stats"><div>🪙 <b>${state.coins}</b><small>Coins</small></div><div>❤️ <b>${state.lingua.hearts}</b><small>Practice energy</small></div><div>✅ <b>${state.lingoProgress.lessons}</b><small>Lessons completed</small></div><div>📘 <b>${complete}</b><small>${lang} practices</small></div></div>
      <section class="orbit-panel"><div class="orbit-section-head"><div><h2>Choose your language</h2><p>Pick one language and build a regular practice habit.</p></div></div><div class="orbit-language-grid">${Object.entries(LINGUA_COURSES).map(([name,c])=>`<button class="orbit-language ${lang===name?'active':''}" onclick="selectLinguaLang('${name}')"><span>${c.flag}</span><b>${name}</b><small>${state.lingoProgress.completed[name]||0} practices</small></button>`).join('')}</div></section>
      <div class="orbit-lingo-layout"><section class="orbit-panel"><div class="orbit-lesson-head"><div><span class="orbit-badge">BEGINNER PATH · UNIT ${Math.min(pack.length,lesson.index+1)}</span><h2>${cur.flag} ${lang}: ${esc(lesson.title)}</h2></div><button class="orbit-btn orbit-btn-soft" onclick="speakLingo('${lang}')">🔊 Listen</button></div>${lessonActivity}</section>
      <aside class="orbit-panel"><h2>🗣️ Speaking practice</h2><p>Listen to the phrase and repeat it aloud. Pronunciation support depends on voices available on this device.</p><button class="orbit-btn orbit-btn-wide" onclick="speakLingo('${lang}')">🔊 Hear phrase</button><button class="orbit-btn orbit-btn-soft orbit-btn-wide" onclick="openOrbiterPrompt('Please help me practise beginner ${lang}. Start a friendly conversation, use short phrases, correct my mistakes kindly and ask one question at a time.')">🤖 Practise with Orbiter</button><div class="orbit-lingo-progress"><b>Learning path</b><div class="orbit-path-step done">✓ Unit 1 · First phrases</div><div class="orbit-path-step ${complete>=1?'done':'locked'}">${complete>=1?'✓':'🔒'} Unit 2 · Everyday conversation</div><div class="orbit-path-step ${complete>=2?'done':'locked'}">${complete>=2?'✓':'🔒'} Unit 3 · Build confidence</div></div></aside></div>`;
  }
  function speakLingo(lang) {
    if(!('speechSynthesis' in window))return showToast('Speech playback is not supported in this browser.','🔊');
    const c=LINGUA_COURSES[lang]||LINGUA_COURSES.Spanish;const lesson=currentLingoPack(lang);const u=new SpeechSynthesisUtterance(lesson.say||c.greeting);const voices=speechSynthesis.getVoices();const codes={Spanish:'es',French:'fr',Japanese:'ja',German:'de',Korean:'ko',Mandarin:'zh',Hindi:'hi',Arabic:'ar',Italian:'it',Portuguese:'pt'};const voice=voices.find(v=>v.lang.toLowerCase().startsWith(codes[lang]||'en'));if(voice)u.voice=voice;u.lang=codes[lang]||'en';speechSynthesis.cancel();speechSynthesis.speak(u);
  }
  function checkOrbitLingoAnswer() {
    const lang=state.lingua.selectedLang||'Spanish';
    const pack=LINGO_LESSON_PACKS[lang]||LINGO_LESSON_PACKS.Spanish;
    const idx=Number(state.lingoProgress.current?.[lang]||0);
    if(idx>=pack.length){showToast(`You completed the ${lang} starter path. More lessons will arrive in a future course update.`,'🎉');return;}
    const cur=pack[idx],answer=linguaSelectedWords.join(' ').trim();
    if(answer.toLowerCase()===cur.ans.toLowerCase()){
      const today=localISO(new Date());
      const yesterday=localISO(new Date(Date.now()-86400000));
      const last=state.lingoProgress.lastPracticeDate||'';
      if(last!==today){state.lingua.streak=last===yesterday?(state.lingua.streak||0)+1:1;state.lingoProgress.lastPracticeDate=today;}
      state.lingua.xp=(state.lingua.xp||0)+30;
      state.lingua.hearts=Math.min(5,(state.lingua.hearts||0)+1);
      state.lingoProgress.completed[lang]=(state.lingoProgress.completed[lang]||0)+1;
      state.lingoProgress.lessons++;
      state.lingoProgress.current=state.lingoProgress.current||{};
      state.lingoProgress.current[lang]=idx+1;
      if(state.quests?.[1])state.quests[1].progress=Math.min(state.quests[1].target,state.quests[1].progress+1);
      safeSave(STORAGE_KEYS.quests,state.quests);safeSave(STORAGE_KEYS.lingua,state.lingua);
      save(V2.lingoKey,state.lingoProgress);addRewards(35,12,`${lang} practice completed`);addGems(1,'Lingo practice');
      linguaSelectedWords=[];unlockBadge('b_lingua_1');launchConfetti();
      showToast('Excellent work! You built the sentence correctly.','🌟');
    } else {
      state.lingua.hearts=Math.max(0,(state.lingua.hearts||0)-1);safeSave(STORAGE_KEYS.lingua,state.lingua);playSfx('error');showToast('Not quite. Try rearranging the words or listen again.','💚');
    }
    renderCurrentView();
  }

  // Planner: date/priority-aware tasks plus time-based reminders. Notifications fire while app is active.
  function requestOrbitNotifications() {
    if(!('Notification' in window))return showToast('Notifications are not supported in this browser.','🔔');
    Notification.requestPermission().then(p=>showToast(p==='granted'?'Notifications enabled.':'Notifications were not enabled.',p==='granted'?'🔔':'ℹ️'));
  }
  function renderPlannerV2() {
    const tabs=[['tasks','✅ Tasks'],['reminders','🔔 Reminders'],['exams','📆 Exams'],['mistakes','🔍 Mistake book'],['plan7','🗓️ Study plan']];
    const now=new Date();const due=state.tasks.filter(t=>!t.done&&t.dueDate&&new Date(t.dueDate+'T23:59:59')<now).length;
    return `<div class="orbit-hero orbit-gradient-blue"><div><div class="orbit-kicker">PLAN • FOCUS • REVISE</div><h1>📅 Orbit Planner</h1><p>Organise school work, plan exam preparation, protect focus time and receive revision reminders at the time you choose.</p></div><div class="orbit-hero-stat"><b>${state.tasks.filter(t=>!t.done).length}</b><span>Open tasks${due?` · ${due} overdue`:''}</span></div></div>
      <div class="orbit-panel orbit-focus-row"><div><span class="orbit-kicker">FOCUS SESSION</span><h2>25 minutes of focused learning</h2><p>Short, intentional sessions are easier to repeat.</p></div><div class="orbit-focus-controls"><button class="orbit-btn" onclick="startFocusTimer(25)">▶ 25 min</button><button class="orbit-btn orbit-btn-soft" onclick="startFocusTimer(45)">45 min</button><button class="orbit-btn orbit-btn-soft" onclick="stopFocusTimer()">Stop</button></div></div>
      <div class="orbit-tab-row">${tabs.map(([id,label])=>`<button class="orbit-chip ${plannerSubTab===id?'active':''}" onclick="plannerSubTab='${id}';renderCurrentView()">${label}</button>`).join('')}</div>
      <section class="orbit-panel">${renderPlannerV2Content()}</section>`;
  }
  function renderPlannerV2Content() {
    if(plannerSubTab==='tasks')return `<div class="orbit-section-head"><div><h2>📚 Study task board</h2><p>Set a deadline and priority; complete real tasks to earn XP and coins.</p></div></div><form class="orbit-task-form" onsubmit="addPlannerTask(event)"><input id="new-task-input" required maxlength="100" placeholder="e.g. Revise fractions and solve 10 questions"><select id="new-task-tag"><option>General</option><option>Math</option><option>Science</option><option>English</option><option>History</option><option>Geography</option><option>Flashcards</option><option>Lingua</option></select><input id="new-task-date" type="date" min="${localISO(new Date())}"><select id="new-task-priority"><option value="Normal">Normal priority</option><option value="High">High priority</option><option value="Low">Low priority</option></select><button class="orbit-btn" type="submit">+ Add task</button></form><div class="orbit-task-list">${state.tasks.length?state.tasks.map((t,i)=>`<article class="orbit-task ${t.done?'done':''}"><label><input type="checkbox" ${t.done?'checked':''} onchange="togglePlannerTask(${i})"><span><b>${esc(t.text)}</b><small>${esc(t.tag||'General')} · ${t.dueDate?`Due ${esc(t.dueDate)}`:'No deadline'} · ${esc(t.priority||'Normal')} priority</small></span></label><button class="orbit-icon-btn" onclick="deletePlannerTask(${i})" aria-label="Delete task">✕</button></article>`).join(''):'<div class="orbit-empty">📝<b>Your planner is ready.</b><span>Add your first task and choose when it should be done.</span></div>'}</div>`;
    if(plannerSubTab==='reminders')return `<h2>🔔 Revision and task reminders</h2><p class="orbit-muted">Choose a daily time. Reminders are checked while Orbit is open; browser notifications need your permission.</p><div class="orbit-reminder-card"><div><b>Flashcard revision</b><small>Remind me when cards are due.</small></div><label class="orbit-switch"><input type="checkbox" id="rev-enabled" ${state.reminderSettings.revisionEnabled?'checked':''} onchange="saveRevisionSettings()"><span></span></label><input type="time" id="rev-time" value="${esc(state.reminderSettings.revisionTime||'19:00')}" onchange="saveRevisionSettings()"></div><div class="orbit-reminder-card"><div><b>Task reminder time</b><small>Notify about tasks due today.</small></div><input type="time" id="task-time" value="${esc(state.reminderSettings.taskTime||'18:00')}" onchange="saveRevisionSettings()"></div><div class="orbit-button-row"><button class="orbit-btn" onclick="requestOrbitNotifications()">Allow notifications</button><button class="orbit-btn orbit-btn-soft" onclick="checkOrbitScheduledReminders(true)">Test reminder</button></div><div class="orbit-callout">📌 For notifications when the app is completely closed, Orbit needs a configured service worker plus a push-notification server. This version checks while the app is running.</div>`;
    if(plannerSubTab==='exams')return renderPlannerSubContent.call(window).includes('Exam Calendar')?renderPlannerSubContent.call(window):`<p>Exam calendar is ready in the original planner.</p>`;
    if(plannerSubTab==='mistakes')return renderPlannerSubContent.call(window);
    if(plannerSubTab==='plan7')return renderPlannerSubContent.call(window);
    return '';
  }
  window.addPlannerTask=function(e){e.preventDefault();const text=$('new-task-input')?.value.trim();if(!text)return;state.tasks.unshift({id:'task_'+Date.now(),text,tag:$('new-task-tag')?.value||'General',dueDate:$('new-task-date')?.value||'',priority:$('new-task-priority')?.value||'Normal',done:false,rewardClaimed:false,reminded:false});safeSave(STORAGE_KEYS.tasks,state.tasks);showToast('Study task added to your planner.','📝');renderCurrentView();};
  window.togglePlannerTask=function(i){const t=state.tasks[i];if(!t)return;if(!t.done){t.done=true;if(!t.rewardClaimed){t.rewardClaimed=true;addRewards(30,12,'Study task completed');if(state.quests?.[2])state.quests[2].progress=Math.min(state.quests[2].target,state.quests[2].progress+1);safeSave(STORAGE_KEYS.quests,state.quests);}}else{t.done=false;}safeSave(STORAGE_KEYS.tasks,state.tasks);renderCurrentView();};
  window.deletePlannerTask=function(i){state.tasks.splice(i,1);safeSave(STORAGE_KEYS.tasks,state.tasks);renderCurrentView();};
  window.saveRevisionSettings=function(){state.reminderSettings.revisionEnabled=!!$('rev-enabled')?.checked;state.reminderSettings.revisionTime=$('rev-time')?.value||state.reminderSettings.revisionTime;state.reminderSettings.taskTime=$('task-time')?.value||state.reminderSettings.taskTime;save(V2.reminderKey,state.reminderSettings);showToast('Reminder settings saved.','🔔');};
  function checkOrbitScheduledReminders(force=false){
    const now=new Date(),today=localISO(now),hm=now.toTimeString().slice(0,5);
    if(state.reminderSettings.revisionEnabled&&getDueCardsCount()>0&&(force||hm>=state.reminderSettings.revisionTime)&&state.reminderSettings.lastRevisionSent!==today){state.reminderSettings.lastRevisionSent=today;const msg=`You have ${getDueCardsCount()} flashcards ready for revision.`;if('Notification'in window&&Notification.permission==='granted')new Notification('Orbit revision time',{body:msg});showToast(msg,'🃏');save(V2.reminderKey,state.reminderSettings);}
    const tasks=state.tasks.filter(t=>!t.done&&t.dueDate===today&&!t.reminded);
    if(tasks.length&&(force||hm>=state.reminderSettings.taskTime)&&state.reminderSettings.lastTaskSent!==today){tasks.forEach(t=>t.reminded=true);state.reminderSettings.lastTaskSent=today;const msg=`${tasks.length} study task(s) are due today.`;if('Notification'in window&&Notification.permission==='granted')new Notification('Orbit planner reminder',{body:msg});showToast(msg,'📅');save(V2.reminderKey,state.reminderSettings);safeSave(STORAGE_KEYS.tasks,state.tasks);}
  }
  window.checkOrbitScheduledReminders=checkOrbitScheduledReminders;

  // Flashcard revision reminder control wraps the original full flashcard workspace.
  const originalFlashcards=window.renderFlashcardsView;
  window.renderFlashcardsView=function(){
    const due=getDueCardsCount();
    return `<section class="orbit-panel orbit-revision-strip"><div><b>⏰ Scheduled revision</b><small>${due?`${due} card(s) are due now.`:'Your due-card queue is clear.'} Choose a time and Orbit will remind you while it is open.</small></div><div class="orbit-revision-controls"><input type="time" id="flash-rev-time" value="${esc(state.reminderSettings.revisionTime||'19:00')}" onchange="setFlashRevisionTime(this.value)"><button class="orbit-btn" onclick="enableFlashcardReminder()">${state.reminderSettings.revisionEnabled?'✓ Reminder on':'Set reminder'}</button></div></section>`+originalFlashcards();
  };
  window.setFlashRevisionTime=function(value){state.reminderSettings.revisionTime=value||'19:00';save(V2.reminderKey,state.reminderSettings);};
  window.enableFlashcardReminder=function(){const tm=$('flash-rev-time')?.value||'19:00';state.reminderSettings.revisionTime=tm;state.reminderSettings.revisionEnabled=true;save(V2.reminderKey,state.reminderSettings);if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();showToast(`Daily revision reminder set for ${tm}.`,'🔔');renderCurrentView();};

  // Orbit Lingo and world functions exposed for inline UI callbacks.
  window.speakLingo=speakLingo;window.checkOrbitLingoAnswer=checkOrbitLingoAnswer;window.buyWorldDecor=buyWorldDecor;window.openOrbiterPrompt=openOrbiterPrompt;

  // A 20-game arcade. Short games earn smaller rewards than genuine study actions.
  const ORBIT_GAMES = [
    ['memory','Memory Match','🧠',2,'Memory','memory','Match six pairs of cosmic symbols.'],
    ['number','Number Rush','🔢',3,'Math','quiz','Solve quick number challenges.'],
    ['word','Word Builder','🔤',4,'Words','word','Unscramble a word in time.'],
    ['pattern','Pattern Master','🧩',5,'Logic','pattern','Find the next number in a pattern.'],
    ['runner','Space Runner','🚀',6,'Reflex','click','Tap ten drifting stars.'],
    ['blocks','Brain Blocks','🧱',7,'Math','quiz','Complete short mental-maths rounds.'],
    ['color','Color Switch','🎨',8,'Focus','color','Choose the named colour, not the colour of the text.'],
    ['blaster','Math Blaster','🛸',9,'Math','quiz','Blast through five arithmetic questions.'],
    ['puzzle','Puzzle Quest','🗝️',10,'Logic','quiz','Solve bite-sized logic puzzles.'],
    ['typing','Speed Typing','⌨️',11,'Words','typing','Type the displayed word accurately.'],
    ['jump','Orbit Jump','🌙',12,'Reflex','reaction','Wait for GO, then tap as quickly as you can.'],
    ['maze','Logic Maze','🧭',13,'Logic','quiz','Choose the logical route out.'],
    ['hunt','Word Hunt','🔎',14,'Words','quiz','Find the correct word or definition.'],
    ['defender','Galaxy Defender','🛡️',15,'Reflex','click','Catch ten incoming space sparks.'],
    ['sudoku','Sudoku Challenge','🔲',16,'Logic','sudoku','Complete one mini 4×4 number puzzle.'],
    ['treasure','Treasure Hunt','🪙',17,'Luck & Logic','hunt','Find the hidden treasure within three tries.'],
    ['reaction','Reaction Master','⚡',18,'Reflex','reaction','Measure your reaction time.'],
    ['code','Code Breaker','🔐',19,'Logic','code','Crack a three-digit code using clues.'],
    ['cosmic','Cosmic Quiz','🌌',20,'Knowledge','quiz','Answer a mixed knowledge round.'],
    ['boss','Ultimate Brain Boss','👑',21,'Mastery','quiz','Finish a final five-question brain challenge.']
  ].map(([id,name,emoji,level,category,type,desc])=>({id,name,emoji,level,category,type,desc}));
  let arcadeSession=null;
  const QUIZ_BANK=[
    {q:'What is 12 × 8?',a:['86','96','108','88'],correct:1,why:'12 × 8 = 96.'},
    {q:'Which planet is known as the Red Planet?',a:['Venus','Mars','Jupiter','Mercury'],correct:1,why:'Mars looks reddish because of iron-rich dust.'},
    {q:'What is the process by which plants make food?',a:['Respiration','Digestion','Photosynthesis','Transpiration'],correct:2,why:'Photosynthesis uses light energy to make food.'},
    {q:'What is the plural of “child”?',a:['Childs','Children','Childes','Childrens'],correct:1,why:'The irregular plural is children.'},
    {q:'Which is a prime number?',a:['21','27','29','33'],correct:2,why:'29 has exactly two factors: 1 and 29.'},
    {q:'How many sides does a hexagon have?',a:['5','6','7','8'],correct:1,why:'A hexagon has six sides.'},
    {q:'Which gas do humans need for respiration?',a:['Oxygen','Nitrogen','Carbon dioxide','Helium'],correct:0,why:'Humans use oxygen during cellular respiration.'},
    {q:'What is 3² + 4²?',a:['12','25','49','14'],correct:1,why:'9 + 16 = 25.'},
    {q:'Which word is an adjective?',a:['Quickly','Happiness','Bright','Run'],correct:2,why:'Bright describes a noun.'},
    {q:'Which direction is opposite to east?',a:['North','South','West','North-east'],correct:2,why:'West is opposite east.'}
  ];
  const WORD_BANK=[{word:'PLANET',scramble:'TALPEN'},{word:'ORBIT',scramble:'TIBOR'},{word:'SCIENCE',scramble:'CENICES'},{word:'GALAXY',scramble:'YAXLAG'},{word:'PUZZLE',scramble:'ZUELZP'}];
  function startArcadeGame(id){const g=ORBIT_GAMES.find(x=>x.id===id);if(!g)return;if(getLevel()<g.level){showToast(`Reach Orbit Level ${g.level} to unlock ${g.name}.`,'🔒');return;}arcadeSession={id,score:0,step:0,questionIndex:0,flipped:[],matched:[],cards:[],hits:0,attempts:0,phase:'ready',started:0};if(g.type==='memory'){const faces=['🌟','🚀','🪐','📚','🪙','🧠'];arcadeSession.cards=[...faces,...faces].sort(()=>Math.random()-.5).map((v,i)=>({v,i}));}if(g.type==='hunt')arcadeSession.treasure=Math.floor(Math.random()*9);if(g.type==='reaction')arcadeSession.phase='wait';if(g.type==='word'||g.type==='typing'){const w=WORD_BANK[Math.floor(Math.random()*WORD_BANK.length)];arcadeSession.word=w;}if(g.type==='color'){const names=['RED','BLUE','GREEN','PURPLE'];arcadeSession.target=names[Math.floor(Math.random()*names.length)];}save(V2.arcadeKey,state.arcadeProgress);renderCurrentView();}
  function finishArcadeGame(){if(!arcadeSession)return;const id=arcadeSession.id,first=!state.arcadeProgress.claimed.includes(id);state.arcadeProgress.played++;state.stats.arcadePlayed=(state.stats.arcadePlayed||0)+1;safeSave(STORAGE_KEYS.stats,state.stats);state.arcadeProgress.best[id]=Math.max(state.arcadeProgress.best[id]||0,arcadeSession.score||0);if(first){state.arcadeProgress.claimed.push(id);addRewards(15,7,`${ORBIT_GAMES.find(g=>g.id===id).name} cleared`);addGems(1,'First clear bonus');}else showToast('Replay recorded! First-clear rewards are already claimed.','🎮');save(V2.arcadeKey,state.arcadeProgress);playSfx('levelup');launchConfetti();arcadeSession=null;renderCurrentView();}
  function answerArcadeQuiz(choice){const q=QUIZ_BANK[arcadeSession.questionIndex%QUIZ_BANK.length];if(choice===q.correct){arcadeSession.score++;playSfx('coin');showToast('Correct! '+q.why,'✨');}else{playSfx('error');showToast('Good try. '+q.why,'💡');}arcadeSession.questionIndex++;if(arcadeSession.questionIndex>=5)finishArcadeGame();else renderCurrentView();}
  function flipMemory(index){if(!arcadeSession||arcadeSession.flipped.length>=2||arcadeSession.matched.includes(index)||arcadeSession.flipped.includes(index))return;arcadeSession.flipped.push(index);if(arcadeSession.flipped.length===2){const [a,b]=arcadeSession.flipped;if(arcadeSession.cards[a].v===arcadeSession.cards[b].v){arcadeSession.matched.push(a,b);arcadeSession.score++;arcadeSession.flipped=[];if(arcadeSession.matched.length===12){finishArcadeGame();return;}renderCurrentView();}else{renderCurrentView();setTimeout(()=>{if(!arcadeSession)return;arcadeSession.flipped=[];renderCurrentView();},650);}}else renderCurrentView();}
  function checkArcadeWord(e){e.preventDefault();const val=$('arcade-word-answer')?.value.trim().toUpperCase();if(val===arcadeSession.word.word){arcadeSession.score=1;showToast('Perfect spelling!','🔤');finishArcadeGame();}else showToast('Try again — look carefully at the letters.','💡');}
  function checkArcadeTyping(e){e.preventDefault();const val=$('arcade-typing-answer')?.value.trim().toUpperCase();if(val===arcadeSession.word.word){arcadeSession.score=1;showToast('Accurate typing!','⌨️');finishArcadeGame();}else showToast('Not quite. Check each letter and try again.','💡');}
  function checkArcadePattern(e){e.preventDefault();const val=Number($('arcade-pattern-answer')?.value);if(val===32){arcadeSession.score=1;finishArcadeGame();}else showToast('Try again: the number doubles each time.','🧩');}
  function hitArcadeTarget(){arcadeSession.hits++;arcadeSession.score=arcadeSession.hits;if(arcadeSession.hits>=10)finishArcadeGame();else renderCurrentView();}
  function selectArcadeColor(name){if(name===arcadeSession.target){arcadeSession.score=1;finishArcadeGame();}else showToast('Read the colour name carefully!','🎨');}
  function beginReaction(){arcadeSession.phase='waiting';renderCurrentView();const wait=1200+Math.random()*2600;setTimeout(()=>{if(!arcadeSession||arcadeSession.phase!=='waiting')return;arcadeSession.phase='go';arcadeSession.started=performance.now();renderCurrentView();},wait);}
  function recordReaction(){if(!arcadeSession)return;if(arcadeSession.phase!=='go'){showToast('Too early! Wait until GO appears.','⚡');return;}const ms=Math.round(performance.now()-arcadeSession.started);arcadeSession.score=Math.max(1,Math.round(1000/ms*100));showToast(`Reaction time: ${ms} ms`,'⚡');finishArcadeGame();}
  function pickTreasure(i){arcadeSession.attempts++;if(i===arcadeSession.treasure){arcadeSession.score=1;showToast('Treasure found!','🪙');finishArcadeGame();}else if(arcadeSession.attempts>=3){showToast('The treasure was hidden in another tile. Try another round!','🗺️');arcadeSession=null;renderCurrentView();}else renderCurrentView();}
  function checkArcadeCode(e){e.preventDefault();const val=$('arcade-code-answer')?.value;if(val==='243'){arcadeSession.score=1;finishArcadeGame();}else showToast('Hint: the first two digits are 2 and 4; the digits add up to 9.','🔐');}
  function checkSudoku(value){if(Number(value)===3){arcadeSession.score=1;finishArcadeGame();}else showToast('Not quite. Check the row and column rules.','🔲');}
  function renderArcadeGame(){const g=ORBIT_GAMES.find(x=>x.id===arcadeSession.id);if(!g)return '';let play='';
    if(g.type==='memory')play=`<p class="orbit-muted">Find all six matching pairs.</p><div class="orbit-memory-grid">${arcadeSession.cards.map((c,i)=>`<button onclick="flipMemory(${i})" class="orbit-memory-card">${arcadeSession.matched.includes(i)||arcadeSession.flipped.includes(i)?c.v:'❔'}</button>`).join('')}</div><p>${arcadeSession.matched.length/2}/6 pairs matched</p>`;
    else if(g.type==='word')play=`<div class="orbit-game-prompt"><b>Unscramble: ${arcadeSession.word.scramble}</b><form onsubmit="checkArcadeWord(event)" class="orbit-inline-form"><input id="arcade-word-answer" autocomplete="off" placeholder="Your word"><button class="orbit-btn">Check</button></form></div>`;
    else if(g.type==='typing')play=`<div class="orbit-game-prompt"><span class="orbit-badge">TYPE EXACTLY</span><h2>${arcadeSession.word.word}</h2><p>Type the word exactly as shown, then submit.</p><form onsubmit="checkArcadeTyping(event)" class="orbit-inline-form"><input id="arcade-typing-answer" autocomplete="off" autocapitalize="characters" placeholder="Type the word"><button class="orbit-btn">Submit</button></form></div>`;
    else if(g.type==='pattern')play=`<div class="orbit-game-prompt"><b>2, 4, 8, 16, ?</b><form onsubmit="checkArcadePattern(event)" class="orbit-inline-form"><input id="arcade-pattern-answer" type="number" placeholder="Next number"><button class="orbit-btn">Check</button></form></div>`;
    else if(g.type==='click')play=`<div class="orbit-game-prompt"><b>Tap 10 stars to complete the run.</b><div class="orbit-target-zone"><button onclick="hitArcadeTarget()">${g.id==='runner'?'🚀':'✨'}</button></div><p>${arcadeSession.hits}/10 collected</p></div>`;
    else if(g.type==='color')play=`<div class="orbit-game-prompt"><b>Tap the colour name: ${arcadeSession.target}</b><div class="orbit-color-options">${['RED','BLUE','GREEN','PURPLE'].map((c,i)=>`<button style="background:${['#ef4444','#3b82f6','#22c55e','#9333ea'][i]}" onclick="selectArcadeColor('${c}')">${c}</button>`).join('')}</div></div>`;
    else if(g.type==='reaction')play=`<div class="orbit-game-prompt"><h2>${arcadeSession.phase==='wait'?'Ready?':'WAIT FOR GO…'}${arcadeSession.phase==='go'?'GO!':''}</h2>${arcadeSession.phase==='wait'?'<button class="orbit-btn" onclick="beginReaction()">Start reaction test</button>':arcadeSession.phase==='waiting'?'<button class="orbit-btn orbit-btn-warn" onclick="recordReaction()">Wait…</button>':'<button class="orbit-btn orbit-btn-success" onclick="recordReaction()">TAP NOW!</button>'}</div>`;
    else if(g.type==='hunt')play=`<div class="orbit-game-prompt"><b>Find the hidden gem · ${3-arcadeSession.attempts} picks left</b><div class="orbit-treasure-grid">${Array.from({length:9},(_,i)=>`<button onclick="pickTreasure(${i})">${arcadeSession.attempts>0?'📦':'❔'}</button>`).join('')}</div></div>`;
    else if(g.type==='code')play=`<div class="orbit-game-prompt"><b>Crack the code</b><p>It is a 3-digit code. The hundreds digit is 2, the tens digit is 4, and all three digits add up to 9.</p><form onsubmit="checkArcadeCode(event)" class="orbit-inline-form"><input id="arcade-code-answer" inputmode="numeric" maxlength="3" placeholder="3-digit code"><button class="orbit-btn">Unlock</button></form></div>`;
    else if(g.type==='sudoku')play=`<div class="orbit-game-prompt"><b>Mini 4×4 puzzle</b><p>Choose the missing number in this row: 1 · 2 · ? · 4</p><div class="orbit-button-row">${[1,2,3,4].map(n=>`<button class="orbit-btn orbit-btn-soft" onclick="checkSudoku(${n})">${n}</button>`).join('')}</div></div>`;
    else {const q=QUIZ_BANK[arcadeSession.questionIndex%QUIZ_BANK.length];play=`<div class="orbit-game-prompt"><span class="orbit-badge">QUESTION ${arcadeSession.questionIndex+1}/5</span><h2>${q.q}</h2><div class="orbit-quiz-options">${q.a.map((a,i)=>`<button onclick="answerArcadeQuiz(${i})">${esc(a)}</button>`).join('')}</div><p class="orbit-muted">Score: ${arcadeSession.score}</p></div>`;}
    return `<section class="orbit-panel orbit-active-game"><div class="orbit-section-head"><div><span class="orbit-badge">${g.category} · LEVEL ${g.level}</span><h2>${g.emoji} ${g.name}</h2><p>${g.desc}</p></div><button class="orbit-btn orbit-btn-soft" onclick="arcadeSession=null;renderCurrentView()">← Arcade</button></div>${play}</section>`;
  }
  function renderArcadeV2(){
    if(arcadeSession)return renderArcadeGame();
    return `<div class="orbit-hero orbit-gradient-lime"><div><div class="orbit-kicker">SHORT PLAY • BIG BRAIN</div><h1>🕹️ Orbit Arcade</h1><p>Twenty bite-sized games. Earn unlocks by learning, revising and reaching new Orbit levels. Arcade rewards are deliberately smaller than study rewards.</p></div><div class="orbit-hero-stat"><b>${state.arcadeProgress.played}</b><span>Rounds played</span></div></div><div class="orbit-panel"><div class="orbit-section-head"><div><h2>🎮 Game library</h2><p>Games unlock as you gain XP and level up through genuine study activity.</p></div><span class="orbit-badge">20 GAMES</span></div><div class="orbit-game-grid">${ORBIT_GAMES.map(g=>{const unlocked=getLevel()>=g.level;const cleared=state.arcadeProgress.claimed.includes(g.id);return `<button class="orbit-game-tile ${unlocked?'':'locked'}" ${unlocked?`onclick="startArcadeGame('${g.id}')"`:'disabled'}><span>${g.emoji}</span><b>${g.name}</b><small>${g.desc}</small><em>${cleared?'✓ Cleared':unlocked?'▶ Play':`🔒 Level ${g.level}`}</em></button>`;}).join('')}</div><p class="orbit-footnote">Learning earns the main XP and coin rewards. Arcade games give small completion bonuses, with a one-time gem bonus on first clear.</p></div>`;
  }
  window.startArcadeGame=startArcadeGame;window.flipMemory=flipMemory;window.checkArcadeWord=checkArcadeWord;window.checkArcadeTyping=checkArcadeTyping;window.checkArcadePattern=checkArcadePattern;window.hitArcadeTarget=hitArcadeTarget;window.selectArcadeColor=selectArcadeColor;window.beginReaction=beginReaction;window.recordReaction=recordReaction;window.pickTreasure=pickTreasure;window.checkArcadeCode=checkArcadeCode;window.checkSudoku=checkSudoku;window.answerArcadeQuiz=answerArcadeQuiz;

  // Safe social setup: no sample users, no fabricated messages, no false online claims.
  function renderCommunityV2(){
    const code='ORBIT-'+String((state.username||'CADET').replace(/[^a-z0-9]/gi,'').toUpperCase()).slice(0,5)+'-'+String(Math.abs((state.username||'ORBIT').split('').reduce((a,c)=>a+c.charCodeAt(0),0))%9000+1000);
    return `<div class="orbit-hero orbit-gradient-teal"><div><div class="orbit-kicker">LEARN TOGETHER</div><h1>👥 Orbit Community</h1><p>Your friends list starts empty. Orbit will only show people after a genuine friend request is accepted by a connected account system.</p></div><div class="orbit-hero-stat"><b>${state.social.friends.length}</b><span>Accepted friends</span></div></div><div class="orbit-grid-2"><section class="orbit-panel"><h2>🤝 Your friends</h2>${state.social.friends.length?state.social.friends.map((f,i)=>`<div class="orbit-friend-row"><span>🧑‍🚀</span><b>${esc(f)}</b><small>Accepted locally</small></div>`).join(''):'<div class="orbit-empty">🪐<b>No friends added yet.</b><span>This is intentional. No sample people or bots are added to your list.</span></div>'}<div class="orbit-callout">Online friend search, request delivery and acceptance require shared accounts and a server database. This offline build does not pretend to send requests to real people.</div></section><section class="orbit-panel"><h2>📨 Invite code</h2><p>Share this profile code outside Orbit. It is an identifier preview, not a live invitation link.</p><div class="orbit-invite-code">${code}</div><button class="orbit-btn orbit-btn-wide" onclick="navigator.clipboard?.writeText('${code}').then(()=>showToast('Code copied.','📋')).catch(()=>showToast('Copy is unavailable.','ℹ️'))">Copy profile code</button><h3>Study together safely</h3><ul class="orbit-simple-list"><li>Keep your profile private.</li><li>Only connect with people you know.</li><li>Report or block unsafe behaviour once online community tools are enabled.</li></ul></section></div>`;
  }
  function renderBattlesV2(){return `<div class="orbit-hero orbit-gradient-violet"><div><div class="orbit-kicker">KNOWLEDGE ARENA</div><h1>⚔️ Study Battles & Duels</h1><p>Practise with a local solo challenge or play a pass-and-play duel with someone beside you.</p></div><div class="orbit-hero-stat"><b>${state.stats.quizzesDone||0}</b><span>Quiz sessions</span></div></div><div class="orbit-grid-2"><section class="orbit-panel"><h2>🤖 Solo practice duel</h2><p>Answer five questions and see your score. This is a practice opponent, not a real online player.</p><button class="orbit-btn" onclick="startDuelV2('solo')">Start solo challenge</button></section><section class="orbit-panel"><h2>👥 Pass-and-play duel</h2><p>Two players use the same device and take turns answering the same five questions.</p><button class="orbit-btn" onclick="startDuelV2('local')">Start local 1v1</button></section></div><section class="orbit-panel"><h2>🌐 Online friend battles</h2><p>Real-time battles between separate accounts need a shared authentication and realtime database backend. No fake rival names are shown in this version.</p><span class="orbit-badge">ONLINE BACKEND NOT CONNECTED</span></section>${renderDuelSession()}`;}
  let duelV2=null;
  function startDuelV2(mode){duelV2={mode,round:0,scores:[0,0],turn:0,playerNames:mode==='local'?['Player 1','Player 2']:[state.username||'You','Practice Bot'],questions:QUIZ_BANK.slice(0,5)};renderCurrentView();}
  function answerDuelV2(choice){if(!duelV2)return;const q=duelV2.questions[duelV2.round];if(choice===q.correct){duelV2.scores[duelV2.turn]++;playSfx('coin');}else playSfx('error');if(duelV2.mode==='solo'&&duelV2.turn===0)duelV2.turn=1;else{duelV2.round++;duelV2.turn=0;}if(duelV2.round>=duelV2.questions.length){const win=duelV2.scores[0]>duelV2.scores[1]?0:duelV2.scores[0]===duelV2.scores[1]?-1:1;if(win===0){addRewards(35,18,'Study duel completed');unlockBadge('b_duel_1');}showToast(win<0?'It is a tie!':`${duelV2.playerNames[win]} wins the practice duel!`,'⚔️');duelV2.done=true;}renderCurrentView();}
  function renderDuelSession(){if(!duelV2)return '';if(duelV2.done)return `<section class="orbit-panel"><h2>🏁 Duel complete</h2><div class="orbit-grid-2"><div><b>${esc(duelV2.playerNames[0])}</b><h1>${duelV2.scores[0]}</h1></div><div><b>${esc(duelV2.playerNames[1])}</b><h1>${duelV2.scores[1]}</h1></div></div><button class="orbit-btn" onclick="duelV2=null;renderCurrentView()">Back to arena</button></section>`;const q=duelV2.questions[duelV2.round];const player=duelV2.playerNames[duelV2.turn];return `<section class="orbit-panel"><span class="orbit-badge">ROUND ${duelV2.round+1}/5</span><h2>${esc(player)}'s turn</h2><div class="orbit-duel-score">${esc(duelV2.playerNames[0])}: ${duelV2.scores[0]} · ${esc(duelV2.playerNames[1])}: ${duelV2.scores[1]}</div><h3>${esc(q.q)}</h3><div class="orbit-quiz-options">${q.a.map((a,i)=>`<button onclick="answerDuelV2(${i})">${esc(a)}</button>`).join('')}</div></section>`;}
  window.startDuelV2=startDuelV2;window.answerDuelV2=answerDuelV2;

  function renderLeaderboardV2(){return `<div class="orbit-hero orbit-gradient-gold"><div><div class="orbit-kicker">YOUR PROGRESS</div><h1>🏆 Orbit Hall of Achievement</h1><p>Track your personal learning milestones. We do not fill this board with invented players or scores.</p></div><div class="orbit-hero-stat"><b>Level ${getLevel()}</b><span>Your Orbit rank</span></div></div><section class="orbit-panel"><div class="orbit-leader-row"><span>🥇</span>${renderRobloxAvatarSVG(state.avatar,52,false)}<div><b>${esc(state.username||'Your profile')}</b><small>Your saved profile · ${money(state.xp)} XP</small></div><strong>LOCAL</strong></div><div class="orbit-callout">A global or friends leaderboard will appear when Orbit accounts and server-side score validation are connected. Local browser scores are not presented as worldwide rankings.</div></section>`;}

  // Expanded About description and enlarged development-team credits.
  function renderAboutV2(){
    const developers=[
      {name:'Arihaan Mahajan',role:'UI & Hardware (Orbit)',bio:"The creator behind Orbit's visual design and hardware bridge. Arihaan shaped how users see and interact with the app while connecting it to physical hardware components."},
      {name:'Manan Mahajan',role:'AI & Software (Orbit)',bio:"The brain behind Orbit's intelligence and code. Manan built the core software system and integrated the AI features that make Orbit smart and responsive."},
      {name:'Virat Sharma',role:'UI & Hardware (SDES Gram)',bio:"The builder behind SDES Gram's interface and hardware. Virat designed the user experience on screen and engineered the physical hardware side of the project."},
      {name:'Aarav Sharma',role:'Software (SDES Gram)',bio:"The developer powering SDES Gram under the hood. Aarav wrote and structured the core software that keeps every feature working reliably."}
    ];
    return `<div class="orbit-about-page orbit-about-reveal">
      <div class="orbit-hero orbit-gradient-space orbit-about-hero"><div><div class="orbit-kicker">A PLACE TO LEARN, CREATE AND GROW</div><h1>🌌 About Us</h1><p>OrbitSchool brings learning, creativity and personal progress into one colourful student experience.</p></div><div class="orbit-about-orbit-mark">✦ ORBITSCHOOL ✦</div></div>
      <section class="orbit-panel orbit-about-story"><span class="orbit-about-label">THE IDEA</span><h2>More than a study planner. Your learning space.</h2>
        <p>OrbitSchool is designed to make everyday learning feel more organised, motivating and rewarding. It gives students a place to ask questions, understand difficult concepts, plan their schoolwork, practise what they have learned and see their progress over time.</p>
        <p>Orbiter is the AI study companion for explanations, questions and guided practice. Orbit Intelligence turns saved study activity into useful next-step suggestions, helping students notice revision that is due, tasks still to complete and topics that deserve another look.</p>
        <p>Orbit Lingo adds language practice through vocabulary, sentence-building and short lessons. Quizzes, chapter challenges and the study-break arcade add playful ways to practise knowledge. Students can earn experience and coins through meaningful learning activity, then use progress to unlock character customisation, accessories and decorations for their personal Orbit space.</p>
        <p>Some functions in this build save data locally on the current device. Shared accounts, cross-device sync, live online battles, cloud friend requests and notifications delivered while the app is closed require their production services to be connected and tested before a global launch.</p>
      </section>
      <section class="orbit-panel orbit-team-panel orbit-team-panel-xl"><div class="orbit-team-heading"><span class="orbit-about-label">THE PEOPLE BEHIND ORBITSCHOOL</span><h2>👨‍💻 Meet the Developers</h2><p>Select a developer card to read about their contribution.</p></div>
        <div class="orbit-developer-grid orbit-developer-details-grid">${developers.map(d=>`<details class="orbit-developer-card orbit-developer-toggle"><summary><span class="orbit-developer-avatar">${d.name.charAt(0)}</span><b>${d.name}</b><small>${d.role}</small><span class="orbit-developer-hint">View profile <span aria-hidden="true">＋</span></span></summary><p class="orbit-developer-bio">${d.bio}</p></details>`).join('')}</div>
      </section>
      <section class="orbit-mentor-card orbit-mentor-card-xl"><div class="orbit-mentor-glow"></div><span class="orbit-about-label">SPECIAL THANKS · MENTOR & GUIDE</span><div class="orbit-mentor-icon">🎓</div><h2>Arvind Mahajan</h2><p>With heartfelt appreciation for the guidance, encouragement and support behind the OrbitSchool project.</p><span class="orbit-mentor-signature">A guiding force behind the journey</span></section>
    </div>`;
  }


  // Replace fake friend leaderboard entries and original demo duel.
  const originalRenderCurrent=window.renderCurrentView;
  window.renderCurrentView=function(){
    stopOrbitThree();
    const main=$('main-view');
    if(state.activeTab==='intelligence'){document.body.classList.remove('on-chat');main.innerHTML=renderIntelligenceView();}
    else if(state.activeTab==='world'){document.body.classList.remove('on-chat');main.innerHTML=renderWorldView();setTimeout(()=>mountThreeScene('orbit-world-canvas','room'),80);}
    else if(state.activeTab==='avatar'){document.body.classList.remove('on-chat');main.innerHTML=renderAvatar3DView();setTimeout(()=>mountThreeScene('orbit-avatar-canvas','avatar'),80);}
    else if(state.activeTab==='shop'){document.body.classList.remove('on-chat');main.innerHTML=renderMarketplaceFallback();}
    else if(state.activeTab==='lingua'){document.body.classList.remove('on-chat');main.innerHTML=renderOrbitLingo();}
    else if(state.activeTab==='planner'){document.body.classList.remove('on-chat');main.innerHTML=renderPlannerV2();initTimerDisplay();}
    else if(state.activeTab==='flashcards'){document.body.classList.remove('on-chat');main.innerHTML=renderFlashcardsView();}
    else if(state.activeTab==='quests'){document.body.classList.remove('on-chat');main.innerHTML=renderQuestsV2();}
    else if(state.activeTab==='community'){document.body.classList.remove('on-chat');main.innerHTML='<div id="soc-root" class="mb-5 px-1"></div>';if(window.OrbitSocialMount)window.OrbitSocialMount();}
    else if(state.activeTab==='battles'){document.body.classList.remove('on-chat');main.innerHTML=renderBattlesV2();}
    else if(state.activeTab==='arcade'){document.body.classList.remove('on-chat');main.innerHTML=renderArcadeV2();}
    else if(state.activeTab==='leaderboard'){document.body.classList.remove('on-chat');main.innerHTML=renderLeaderboardV2();}
    else if(state.activeTab==='about'){document.body.classList.remove('on-chat');main.innerHTML=renderAboutV2();}
    else {originalRenderCurrent();}
    renderNav(); updateHeaderUI();
  };

  // Daily quest progress is driven by real learning activity, never manual check-ins.
  function renderQuestsV2(){
    const steps=[
      {icon:'🃏',action:`switchTab('flashcards')`,label:'Open flashcards and review due cards'},
      {icon:'🌍',action:`switchTab('lingua')`,label:'Complete an Orbit Lingo lesson'},
      {icon:'📅',action:`switchTab('planner')`,label:'Add and complete study tasks'},
      {icon:'👑',action:`switchTab('boss')`,label:'Practise in a subject boss challenge'}
    ];
    return `<div class="orbit-hero orbit-gradient-gold"><div><div class="orbit-kicker">REAL LEARNING • REAL REWARDS</div><h1>🎯 Daily Orbit Quests</h1><p>Quests advance when you complete the matching learning activity. There are no manual progress buttons.</p></div><div class="orbit-hero-stat"><b>${state.quests.filter(q=>q.claimed).length}/${state.quests.length}</b><span>Rewards claimed</span></div></div><div class="orbit-grid-2">${state.quests.map((q,idx)=>{const target=Math.max(1,Number(q.target)||1),progress=Math.min(target,Math.max(0,Number(q.progress)||0)),pct=Math.round(progress/target*100),ready=progress>=target&&!q.claimed,step=steps[idx]||steps[0];return `<section class="orbit-panel"><div class="orbit-section-head"><div><span class="orbit-badge">DAILY MISSION ${idx+1}</span><h2>${step.icon} ${esc(q.title)}</h2></div><b>✨ ${Number(q.xp)||0} XP · 🪙 ${Number(q.coins)||0}</b></div><div class="orbit-meter"><div><span>Progress</span><b>${progress}/${target}</b></div><i><span style="width:${pct}%;background:linear-gradient(90deg,#f59e0b,#f97316)"></span></i></div>${q.claimed?`<div class="orbit-callout">✅ Reward claimed. Great work!</div>`:ready?`<button class="orbit-btn orbit-btn-wide" onclick="claimQuest(${idx})">Claim reward 🎉</button>`:`<button class="orbit-btn orbit-btn-soft orbit-btn-wide" onclick="${step.action}">${step.label} →</button>`}</section>`;}).join('')}</div><p class="orbit-footnote">Quest rewards are additional bonuses. Your main progression still comes from meaningful study, revision and practice.</p>`;
  }
  window.advanceQuest=function(){showToast('Complete the matching study activity to progress this quest.','🎯');};

  // Apply footer and interface polish once the DOM is ready.
  window.addEventListener('DOMContentLoaded',()=>{
    const style=document.createElement('style');
    style.textContent=`
      .orbit-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 24px;border-radius:26px;color:#fff;box-shadow:0 8px 0 rgba(15,23,42,.12);flex-wrap:wrap}
      .orbit-hero h1{font:700 clamp(24px,4vw,34px) 'Fredoka',system-ui;margin:3px 0 7px}.orbit-hero p{max-width:760px;color:rgba(255,255,255,.85);font-size:14px;line-height:1.6;margin:0}.orbit-kicker{font-size:10px;letter-spacing:.16em;font-weight:900;opacity:.78}.orbit-hero-stat{min-width:115px;padding:14px 18px;border:1px solid #ffffff55;border-radius:18px;background:#ffffff1a;text-align:center}.orbit-hero-stat b{display:block;font:700 23px 'Fredoka',system-ui}.orbit-hero-stat span{font-size:11px;opacity:.8}
      .orbit-gradient-indigo{background:linear-gradient(115deg,#4338ca,#6366f1 58%,#a78bfa)}.orbit-gradient-violet{background:linear-gradient(115deg,#6d28d9,#8b5cf6 55%,#c084fc)}.orbit-gradient-green{background:linear-gradient(115deg,#047857,#10b981 60%,#6ee7b7)}.orbit-gradient-blue{background:linear-gradient(115deg,#1d4ed8,#0ea5e9 65%,#67e8f9)}.orbit-gradient-space{background:linear-gradient(115deg,#111827,#312e81 55%,#7c3aed)}.orbit-gradient-lime{background:linear-gradient(115deg,#3f6212,#65a30d 60%,#84cc16)}.orbit-gradient-teal{background:linear-gradient(115deg,#0f766e,#0d9488 60%,#2dd4bf)}.orbit-gradient-gold{background:linear-gradient(115deg,#92400e,#d97706 60%,#fbbf24)}
      .orbit-panel{background:var(--bg-card);border:2px solid var(--border-subtle);border-radius:23px;padding:19px;box-shadow:0 5px 0 rgba(15,23,42,.055);min-width:0}.orbit-panel h2{font:700 20px 'Fredoka',system-ui;margin:0 0 7px}.orbit-panel p{font-size:13px;line-height:1.55;color:var(--text-muted);margin:3px 0 12px}.orbit-muted,.orbit-footnote{font-size:12px;color:var(--text-muted);line-height:1.55}.orbit-footnote{margin:12px 0 0}.orbit-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}.orbit-section-head p{margin:0}.orbit-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.orbit-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.orbit-button-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.orbit-btn{border:0;background:linear-gradient(110deg,#4f46e5,#7c3aed);color:#fff;padding:10px 15px;border-radius:13px;font:700 13px 'Fredoka',system-ui;box-shadow:0 4px 0 #312e81;cursor:pointer;min-height:42px}.orbit-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #312e81}.orbit-btn-soft{background:var(--bg-app);color:var(--text-main);border:1px solid var(--border-subtle);box-shadow:none}.orbit-btn-success{background:#16a34a;box-shadow:0 4px 0 #166534}.orbit-btn-warn{background:#eab308;color:#422006;box-shadow:0 4px 0 #a16207}.orbit-btn-wide{width:100%;margin-top:9px}.orbit-badge{display:inline-flex;padding:5px 9px;border-radius:20px;background:#eef2ff;color:#4338ca;font-size:10px;font-weight:900;letter-spacing:.08em}.dark .orbit-badge{background:#312e81;color:#ddd6fe}
      .orbit-recommendations{display:grid;gap:9px}.orbit-recommendation{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border-subtle);border-radius:15px;background:var(--bg-app);text-align:left;color:var(--text-main);cursor:pointer}.orbit-recommendation>span:first-child{font-size:24px}.orbit-recommendation span:nth-child(2){flex:1}.orbit-recommendation b,.orbit-recommendation small{display:block}.orbit-recommendation small{font-size:11px;color:var(--text-muted);margin-top:3px}.orbit-recommendation strong{font-size:20px;color:#6366f1}.orbit-panel>p{max-width:800px}.orbit-dashboard-intro{border-radius:24px;padding:18px 22px;background:linear-gradient(115deg,#111827,#312e81 58%,#7c3aed);color:white;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;box-shadow:0 7px 0 #1e1b4b}.orbit-dashboard-intro h1{font:700 25px 'Fredoka',system-ui;margin:4px 0}.orbit-dashboard-intro p{font-size:13px;max-width:700px;color:#ddd6fe}.orbit-dashboard-rewards{display:grid;gap:8px;padding:12px;border-radius:16px;background:#ffffff18;font:700 13px 'Fredoka',system-ui}.orbit-dashboard-intro+.game-card{margin-top:0}.orbit-grid-4 .orbit-panel{display:grid;gap:4px;text-align:center}.orbit-grid-4 .orbit-panel span{font-size:22px}.orbit-grid-4 .orbit-panel b{font:700 25px 'Fredoka',system-ui}.orbit-grid-4 .orbit-panel small{color:var(--text-muted);font-size:11px}
      .orbit-avatar-layout,.orbit-lingo-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:14px}.orbit-avatar-stage{background:linear-gradient(135deg,#dbeafe,#ede9fe);color:#1e293b}.dark .orbit-avatar-stage{background:linear-gradient(135deg,#172554,#312e81);color:#f8fafc}.orbit-stage-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;margin-bottom:8px}.orbit-stage-head span{opacity:.7}.orbit-3d-canvas{display:block;width:100%;height:360px;border-radius:18px;touch-action:none;cursor:grab;background:linear-gradient(145deg,#dbeafe,#c4b5fd)}.orbit-3d-canvas:active{cursor:grabbing}.orbit-world-canvas{height:min(58vh,510px);background:#172554}.orbit-3d-fallback{text-align:center;padding:15px}.orbit-3d-fallback p{font-size:12px;color:var(--text-muted)}.orbit-avatar-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.orbit-category-tabs,.orbit-accessory-row,.orbit-outfit-row,.orbit-tab-row{display:flex;gap:7px;flex-wrap:wrap;margin:11px 0}.orbit-chip{border:1px solid var(--border-subtle);background:var(--bg-app);color:var(--text-main);border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800;cursor:pointer}.orbit-chip.active{background:#4f46e5;color:white;border-color:#4f46e5}.orbit-item-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:370px;overflow:auto}.orbit-item{border:1px solid var(--border-subtle);border-radius:14px;padding:9px;background:var(--bg-app);color:var(--text-main);text-align:left;display:grid;gap:5px;cursor:pointer}.orbit-item.equipped{border:2px solid #6366f1;background:#eef2ff}.dark .orbit-item.equipped{background:#312e81}.orbit-item-swatch{height:42px;border-radius:10px;display:grid;place-items:center;color:#111827;font-size:13px}.orbit-item b{font-size:12px}.orbit-item small{font-size:10px;color:var(--text-muted)}
      .orbit-rarity{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:900}.orbit-meter>div{display:flex;justify-content:space-between;font-size:11px;font-weight:800}.orbit-meter i{display:block;height:8px;background:var(--bg-app);border-radius:20px;overflow:hidden;margin-top:5px}.orbit-meter i span{display:block;height:100%;border-radius:20px}
      .orbit-decor-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.orbit-decor{padding:12px;border:1px solid var(--border-subtle);border-radius:15px;background:var(--bg-app);display:grid;gap:5px}.orbit-decor>span{font-size:27px}.orbit-decor b{font-size:12px}.orbit-decor small{font-size:10px;color:var(--text-muted);min-height:27px}.orbit-decor button{margin-top:5px}
      .orbit-lingo-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.orbit-lingo-stats>div{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:14px;padding:12px;text-align:center;font-size:17px}.orbit-lingo-stats b,.orbit-lingo-stats small{display:block}.orbit-lingo-stats small{font-size:10px;color:var(--text-muted)}.orbit-language-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.orbit-language{padding:9px;border:1px solid var(--border-subtle);border-radius:13px;background:var(--bg-app);color:var(--text-main);display:grid;gap:3px;justify-items:center;cursor:pointer}.orbit-language span{font-size:23px}.orbit-language b{font-size:11px}.orbit-language small{font-size:9px;color:var(--text-muted)}.orbit-language.active{border:2px solid #10b981;background:#ecfdf5}.dark .orbit-language.active{background:#064e3b}.orbit-lesson-head{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}.orbit-question{font:700 21px 'Fredoka',system-ui;color:var(--text-main)!important;margin:17px 0}.orbit-word-answer{min-height:60px;padding:12px;border:2px dashed #10b981;border-radius:15px;display:flex;gap:7px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--text-muted)}.orbit-word-answer button,.orbit-word-bank button{padding:8px 12px;border-radius:11px;border:1px solid #a7f3d0;background:#d1fae5;color:#064e3b;font-weight:800;font-size:12px}.orbit-word-bank{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.orbit-lingo-progress{margin-top:16px;display:grid;gap:7px}.orbit-path-step{padding:10px;border-radius:12px;background:var(--bg-app);font-size:12px;font-weight:800}.orbit-path-step.done{color:#059669}.orbit-path-step.locked{opacity:.6}
      .orbit-focus-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.orbit-focus-row h2{margin:2px 0}.orbit-focus-controls{display:flex;gap:7px;flex-wrap:wrap}.orbit-task-form{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:7px;margin:10px 0 16px}.orbit-task-form input,.orbit-task-form select,.orbit-inline-form input,.orbit-reminder-card input{min-width:0;border:1px solid var(--border-subtle);background:var(--bg-app);color:var(--text-main);padding:10px;border-radius:11px;font-size:12px}.orbit-task-list{display:grid;gap:8px}.orbit-task{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:11px;border:1px solid var(--border-subtle);border-radius:13px}.orbit-task label{display:flex;align-items:center;gap:10px;min-width:0;cursor:pointer}.orbit-task label span b,.orbit-task label span small{display:block}.orbit-task label span b{font-size:13px}.orbit-task label span small{font-size:10px;color:var(--text-muted);margin-top:3px}.orbit-task.done{opacity:.62}.orbit-task.done b{text-decoration:line-through}.orbit-icon-btn{border:0;background:transparent;color:#ef4444;font-size:17px;cursor:pointer}.orbit-empty{text-align:center;padding:24px;display:grid;justify-items:center;gap:6px;color:var(--text-muted)}.orbit-empty b{color:var(--text-main)}.orbit-reminder-card{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--border-subtle);border-radius:14px;padding:12px;margin:10px 0}.orbit-reminder-card b,.orbit-reminder-card small{display:block}.orbit-reminder-card small{font-size:11px;color:var(--text-muted);margin-top:3px}.orbit-callout{padding:11px 13px;margin-top:12px;border-radius:13px;background:#eff6ff;color:#1e40af;font-size:11px;line-height:1.5}.dark .orbit-callout{background:#172554;color:#bfdbfe}.orbit-switch input{accent-color:#4f46e5}.orbit-revision-strip{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px 17px;border-color:#f9a8d4}.orbit-revision-strip b,.orbit-revision-strip small{display:block}.orbit-revision-strip small{font-size:11px;color:var(--text-muted);margin-top:3px}.orbit-revision-controls{display:flex;gap:7px;align-items:center}.orbit-revision-controls input{padding:8px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--bg-app);color:var(--text-main)}
      .orbit-game-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.orbit-game-tile{display:grid;gap:6px;text-align:left;align-content:start;padding:13px;border:1px solid var(--border-subtle);border-radius:16px;background:var(--bg-app);color:var(--text-main);cursor:pointer;min-height:155px}.orbit-game-tile>span{font-size:29px}.orbit-game-tile b{font:700 14px 'Fredoka',system-ui}.orbit-game-tile small{font-size:10px;color:var(--text-muted);line-height:1.4}.orbit-game-tile em{font-size:10px;font-weight:900;color:#4f46e5;font-style:normal;margin-top:auto}.orbit-game-tile.locked{opacity:.62;filter:saturate(.55);cursor:not-allowed}.orbit-active-game{border-color:#a78bfa}.orbit-active-game h2{margin:2px 0}.orbit-game-prompt{max-width:650px;margin:18px auto;text-align:center;padding:18px;border-radius:17px;background:var(--bg-app)}.orbit-game-prompt h2{font-size:22px;margin:12px}.orbit-quiz-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}.orbit-quiz-options button,.orbit-color-options button{padding:12px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--bg-card);color:var(--text-main);font-weight:800;cursor:pointer}.orbit-memory-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;max-width:400px;margin:12px auto}.orbit-memory-card{height:72px;border-radius:13px;border:2px solid #a5b4fc;background:#e0e7ff;font-size:27px;cursor:pointer}.orbit-inline-form{display:flex;gap:8px;justify-content:center;margin-top:14px}.orbit-inline-form input{max-width:220px}.orbit-target-zone{display:grid;place-items:center;min-height:120px}.orbit-target-zone button{width:78px;height:78px;border:0;border-radius:50%;font-size:42px;background:linear-gradient(145deg,#facc15,#f97316);box-shadow:0 7px 0 #b45309;cursor:pointer;animation:orbitPulse .8s ease-in-out infinite alternate}.orbit-color-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}.orbit-color-options button{color:white}.orbit-treasure-grid{display:grid;grid-template-columns:repeat(3,60px);justify-content:center;gap:8px;margin:14px}.orbit-treasure-grid button{height:55px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--bg-card);font-size:22px}.orbit-duel-score{font:700 15px 'Fredoka',system-ui;margin:10px 0}.orbit-leader-row{display:flex;align-items:center;gap:12px;padding:13px;border:2px solid #fbbf24;border-radius:16px}.orbit-leader-row div{flex:1}.orbit-leader-row b,.orbit-leader-row small{display:block}.orbit-leader-row small{font-size:11px;color:var(--text-muted)}.orbit-leader-row strong{font:700 23px 'Fredoka',system-ui;color:#d97706}.orbit-simple-list{font-size:12px;color:var(--text-muted);padding-left:20px;line-height:1.9}.orbit-invite-code{font:800 21px 'Fredoka',system-ui;letter-spacing:.1em;padding:13px;text-align:center;border-radius:13px;background:var(--bg-app);margin:12px 0}.orbit-about-copy p{font-size:14px;line-height:1.8;color:var(--text-muted);max-width:none;margin:10px 0}.orbit-about-copy h2{font-size:24px}.orbit-footnote{font-size:10px}
      #hdr-gem-pill{display:flex;align-items:center;gap:5px;padding:6px 9px;border-radius:11px;background:#f5f3ff;border:1px solid #ddd6fe;color:#6d28d9;font:700 12px 'Fredoka',system-ui}.dark #hdr-gem-pill{background:#2e1065;border-color:#6d28d9;color:#ddd6fe}.orbit-progress-footer{text-align:center;padding:13px 15px 20px;color:var(--text-muted);font:700 11px 'Fredoka',system-ui;letter-spacing:.08em}

      .orbit-studio-page{display:grid;gap:16px;animation:orbitPageEnter .5s cubic-bezier(.2,.75,.25,1) both}.orbit-item-pro{animation:orbitCardEnter .35s ease both}.orbit-item-pro:nth-child(2n){animation-delay:.035s}.orbit-item-pro:nth-child(3n){animation-delay:.07s}.orbit-studio-hero{padding:26px 28px;min-height:145px}.orbit-studio-hero h1{font-size:clamp(28px,4vw,40px)!important}.orbit-avatar-layout-pro{grid-template-columns:minmax(0,1.12fr) minmax(360px,.88fr);align-items:stretch}.orbit-avatar-stage-pro{padding:16px;background:linear-gradient(145deg,#111827,#20285a 55%,#4338ca);border:2px solid #7165f0;color:#fff;box-shadow:0 9px 0 #201957,0 18px 32px #10132d40}.dark .orbit-avatar-stage-pro{background:linear-gradient(145deg,#090f20,#1b2051 58%,#39277b)}.orbit-stage-head{align-items:center;margin-bottom:12px}.orbit-stage-head>div{display:grid;gap:3px}.orbit-stage-head b{font:700 17px 'Fredoka',system-ui}.orbit-stage-head small{font-size:10px;color:#c7d2fe}.orbit-live-tag{display:inline-flex;align-items:center;gap:6px;border:1px solid #ffffff30;border-radius:20px;padding:6px 9px;color:#bbf7d0;font-size:9px;font-weight:900;letter-spacing:.1em}.orbit-live-tag i{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80;animation:orbitLivePulse 1.5s infinite}.orbit-avatar-preview-wrap{height:460px;position:relative;overflow:hidden;border-radius:20px;border:1px solid #ffffff20;background:radial-gradient(ellipse at 50% 42%,#4553a6 0%,#202b61 42%,#111a3b 100%);isolation:isolate}.orbit-3d-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .35s ease;z-index:2}.orbit-3d-fallback{display:grid;position:absolute;inset:0;z-index:1;overflow:hidden;background:radial-gradient(ellipse at 50% 36%,#5362bf 0%,#26346f 48%,#151d43 100%);transition:opacity .3s ease}.orbit-fallback-scene{position:relative;width:100%;height:100%;min-height:420px;perspective:950px;overflow:hidden}.orbit-fallback-stars i{position:absolute;color:#fde68a;text-shadow:0 0 14px #facc15;animation:orbitStarFloat 3s ease-in-out infinite;font-style:normal}.orbit-fallback-stars i:nth-child(1){left:13%;top:18%;font-size:23px}.orbit-fallback-stars i:nth-child(2){left:78%;top:14%;animation-delay:.5s}.orbit-fallback-stars i:nth-child(3){left:84%;top:58%;font-size:19px;animation-delay:1s}.orbit-fallback-stars i:nth-child(4){left:23%;top:63%;animation-delay:1.4s}.orbit-fallback-stars i:nth-child(5){left:64%;top:29%;animation-delay:.8s}.orbit-fallback-stars i:nth-child(6){left:9%;top:43%;animation-delay:1.8s}.orbit-fallback-coins b{position:absolute;font-size:30px;animation:orbitCoinFloat 2.5s ease-in-out infinite}.orbit-fallback-coins b:nth-child(1){left:15%;top:44%}.orbit-fallback-coins b:nth-child(2){right:16%;top:37%;color:#fef08a;font-size:23px;animation-delay:.6s}.orbit-fallback-coins b:nth-child(3){right:22%;top:69%;animation-delay:1.1s}.orbit-fallback-platform{position:absolute;width:245px;height:72px;border-radius:50%;left:50%;bottom:39px;transform:translateX(-50%) rotateX(62deg);background:linear-gradient(180deg,#b69cff,#5132a9 70%,#24165e);border:5px solid #facc15;box-shadow:0 15px 0 #1e1759,0 24px 38px #080c25aa,0 0 35px #a78bfa}.orbit-fallback-platform:before{content:'';position:absolute;inset:12px 23px;border-radius:50%;border:3px solid #e9d5ff;box-shadow:0 0 15px #c4b5fd}.orbit-fallback-avatar{--skin:#fdbA74;--shirt:#3b82f6;--pants:#334155;position:absolute;z-index:2;left:50%;bottom:75px;width:190px;height:300px;transform:translateX(-50%) rotateY(-18deg);transform-style:preserve-3d;animation:orbitFallbackIdle 3s ease-in-out infinite;filter:drop-shadow(0 15px 15px #05081770)}.orbit-fallback-avatar>div{position:absolute;transform-style:preserve-3d;box-shadow:inset -9px -8px 0 #00000018, inset 4px 4px 0 #ffffff20}.fb-head{left:47px;top:5px;width:96px;height:88px;border-radius:13px;background:var(--skin);border:3px solid #111827;transform:translateZ(16px);box-shadow:inset -11px -7px 0 #00000018,8px 0 0 #00000028}.fb-head:before{content:'';position:absolute;right:-16px;top:7px;width:15px;height:73px;background:color-mix(in srgb,var(--skin),#000 18%);transform:skewY(-8deg);border:2px solid #111827;border-left:0}.fb-hair{position:absolute;left:-3px;top:-10px;width:96px;height:24px;border-radius:14px 14px 5px 5px;background:var(--hair);border:2px solid #111827;box-shadow:0 7px 0 var(--hair)}.fb-face{position:absolute;top:35px;left:0;width:100%;display:flex;justify-content:center;gap:28px}.fb-face i{width:8px;height:10px;border-radius:50%;background:#111827}.fb-face b{position:absolute;top:20px;width:22px;height:8px;border-bottom:3px solid #8b3742;border-radius:50%}.fb-glasses{position:absolute;left:12px;top:32px;width:70px;height:24px;border:4px solid #111827;border-radius:8px;box-shadow:inset 0 0 0 20px #67e8f944}.fb-hat{position:absolute;left:-6px;top:-23px;width:103px;height:17px;border-radius:9px 9px 3px 3px;background:var(--hat);border:3px solid #111827}.fb-torso{position:absolute;left:35px;top:102px;width:120px;height:99px;border-radius:9px;background:var(--shirt);border:3px solid #111827;transform:translateZ(10px);display:grid;place-items:center;font-size:23px;color:#fff8}.fb-arm{position:absolute;top:105px;width:32px;height:94px;border:3px solid #111827;border-radius:9px;background:var(--shirt);transform-origin:50% 12%;z-index:1}.fb-arm i{position:absolute;bottom:-31px;left:0;width:26px;height:35px;border:2px solid #111827;border-radius:8px;background:var(--skin)}.fb-arm-left{left:8px;transform:rotate(8deg)}.fb-arm-right{right:5px;transform:rotate(-8deg)}.fb-leg{position:absolute;top:194px;width:48px;height:76px;border:3px solid #111827;border-radius:7px;background:var(--pants);z-index:0}.fb-leg i{position:absolute;bottom:-20px;left:-4px;width:55px;height:24px;border:3px solid #111827;border-radius:8px;background:var(--shoes)}.fb-leg-left{left:47px}.fb-leg-right{right:39px}.fb-cape{position:absolute;left:36px;top:108px;width:125px;height:145px;background:var(--cape);clip-path:polygon(10% 0,90% 0,100% 100%,0 100%);transform:translateZ(-17px);border:2px solid #111827}.orbit-fallback-avatar.celebrate .fb-arm-right{animation:orbitFallbackWave .7s ease-in-out 2}.orbit-fallback-avatar.celebrate[data-emote='emote_cheer'] .fb-arm-left{animation:orbitFallbackCheer .65s ease-in-out 2}.orbit-fallback-avatar.celebrate[data-emote='emote_cosmic']{animation:orbitFallbackSpin 1.4s ease-in-out 1}.orbit-fallback-avatar.celebrate[data-emote='emote_genius'] .fb-arm-right{animation:orbitFallbackCheer .7s ease-in-out 2}.orbit-fallback-caption{position:absolute;bottom:12px;left:0;right:0;text-align:center;color:#c7d2fe;font:800 9px 'Fredoka',system-ui;letter-spacing:.2em}.orbit-avatar-control-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.orbit-avatar-control-row .orbit-btn{font-size:11px;padding:9px 11px;min-height:38px}.orbit-avatar-footer{display:flex;justify-content:space-between;gap:7px;flex-wrap:wrap;border-top:1px solid #ffffff24;margin-top:14px;padding-top:12px;color:#dbeafe;font:700 10px 'Fredoka',system-ui}.orbit-wardrobe-panel{background:linear-gradient(180deg,var(--bg-card),var(--bg-app));border-color:#c4b5fd}.orbit-kicker-dark{color:#8b5cf6;opacity:1}.orbit-wardrobe-panel .orbit-section-head{align-items:center}.orbit-wardrobe-panel .orbit-section-head h2{font-size:26px;margin:2px 0}.orbit-wardrobe-panel .orbit-section-head p{font-size:11px;margin:0}.orbit-category-tabs{max-height:125px;overflow:auto;padding:2px 1px 8px}.orbit-chip{font-family:'Fredoka',system-ui;font-size:11px;white-space:nowrap}.orbit-chip.active{box-shadow:0 3px 0 #312e81}.orbit-item-grid-pro{grid-template-columns:repeat(2,minmax(0,1fr));max-height:495px;gap:9px}.orbit-item-pro{position:relative;min-height:112px;display:flex;align-items:center;gap:10px;padding:10px;text-align:left;border:2px solid var(--border-subtle);background:var(--bg-card);box-shadow:0 3px 0 #0f172a0a;transition:transform .16s,border-color .16s,box-shadow .16s}.orbit-item-pro:hover{transform:translateY(-2px);box-shadow:0 7px 16px #4f46e51b}.orbit-item-pro.equipped{border-color:#8b5cf6;background:#f5f3ff;box-shadow:0 4px 0 #8b5cf6}.dark .orbit-item-pro.equipped{background:#2e1065}.orbit-item-pro .orbit-item-swatch{width:46px;height:46px;flex:none;border:2px solid #ffffff90;border-radius:14px;box-shadow:inset 0 -5px 0 #00000018;display:grid;place-items:center;color:#fff;text-shadow:0 1px 3px #000}.orbit-item-meta{display:grid;gap:4px;min-width:0}.orbit-item-meta b{font:700 12px 'Fredoka',system-ui;overflow-wrap:anywhere}.orbit-item-meta small{font-size:9px;color:var(--text-muted)}.orbit-rarity{position:absolute;right:7px;top:7px;font:800 8px 'Inter',sans-serif;text-transform:uppercase;letter-spacing:.04em;font-style:normal;color:#64748b}.orbit-rarity.rarity-Rare{color:#2563eb}.orbit-rarity.rarity-Epic{color:#9333ea}.orbit-rarity.rarity-Legendary{color:#d97706}.orbit-outfit-panel{border-color:#ddd6fe}.orbit-outfit-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.orbit-outfit-slot{display:grid;justify-items:center;gap:5px;border:2px dashed #a78bfa;border-radius:17px;padding:14px;background:var(--bg-app);color:var(--text-main);cursor:pointer}.orbit-outfit-slot.saved{border-style:solid;background:#f5f3ff}.dark .orbit-outfit-slot.saved{background:#312e81}.orbit-outfit-slot span{font-size:25px}.orbit-outfit-slot b{font:700 13px 'Fredoka',system-ui}.orbit-outfit-slot small{font-size:10px;color:var(--text-muted)}.orbit-studio-note{text-align:center;color:var(--text-muted);font-size:10px;padding:2px 0 14px}.orbit-about-page{display:grid;gap:16px;max-width:1150px;margin:0 auto}.orbit-about-hero{padding:28px;min-height:180px;overflow:hidden;position:relative}.orbit-about-hero h1{font-size:38px!important}.orbit-about-orbit-mark{font:800 20px 'Fredoka',system-ui;border:2px solid #ffffff55;border-radius:50%;width:126px;height:126px;display:grid;place-items:center;color:#fef3c7;box-shadow:0 0 0 12px #ffffff12,0 0 48px #c4b5fd66}.orbit-about-story{padding:28px}.orbit-about-story h2{font:700 28px 'Fredoka',system-ui;margin:6px 0 15px}.orbit-about-story p{font-size:14px;line-height:1.85;margin:13px 0;color:var(--text-muted)}.orbit-about-label{font:900 10px 'Inter',sans-serif;letter-spacing:.16em;color:#8b5cf6}.orbit-team-panel{padding:28px;border-color:#c4b5fd}.orbit-team-heading h2{font:700 30px 'Fredoka',system-ui;margin:7px 0}.orbit-team-heading p{color:var(--text-muted)}.orbit-developer-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-top:18px}.orbit-developer-card{position:relative;overflow:hidden;min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border-radius:20px;border:2px solid #c4b5fd;background:linear-gradient(145deg,#eef2ff,#faf5ff 55%,#fff);color:#312e81;box-shadow:0 6px 0 #8b5cf633}.dark .orbit-developer-card{background:linear-gradient(145deg,#1e1b4b,#312e81);color:#ede9fe}.orbit-developer-number{position:absolute;top:9px;left:12px;font:900 10px 'Inter',sans-serif;color:#8b5cf6}.orbit-developer-avatar{width:62px;height:62px;border-radius:19px;display:grid;place-items:center;background:linear-gradient(145deg,#7c3aed,#ec4899);color:white;font:700 29px 'Fredoka',system-ui;box-shadow:0 6px 0 #4c1d95}.orbit-developer-card>b{font:700 22px 'Fredoka',system-ui;letter-spacing:.03em}.orbit-developer-card>small{font-size:10px;color:#8b5cf6;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.orbit-mentor-card{position:relative;overflow:hidden;display:grid;justify-items:center;text-align:center;padding:34px 24px;border-radius:25px;color:#fff;background:linear-gradient(120deg,#1e1b4b,#5b21b6 55%,#be185d);box-shadow:0 8px 0 #2e1065}.orbit-mentor-glow{position:absolute;width:280px;height:280px;border-radius:50%;background:#c4b5fd35;filter:blur(30px);top:-130px;right:-30px}.orbit-mentor-card>*:not(.orbit-mentor-glow){position:relative}.orbit-mentor-icon{font-size:42px;margin:8px}.orbit-mentor-card h2{font:700 clamp(30px,5vw,44px) 'Fredoka',system-ui;margin:0 0 6px}.orbit-mentor-card p{color:#e9d5ff;max-width:600px;font-size:13px;line-height:1.6}.orbit-progress-footer{display:none!important}#orbit-sdes-footer{display:none!important}
      @keyframes orbitPageEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes orbitCardEnter{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes orbitLivePulse{50%{opacity:.3;transform:scale(.72)}}@keyframes orbitStarFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-10px) rotate(35deg)}}@keyframes orbitCoinFloat{0%,100%{transform:translateY(0) rotateY(0)}50%{transform:translateY(-13px) rotateY(180deg)}}@keyframes orbitFallbackIdle{0%,100%{translate:0 0}50%{translate:0 -7px}}@keyframes orbitFallbackWave{0%,100%{transform:rotate(-8deg)}35%,70%{transform:rotate(-125deg)}}
      @media(prefers-reduced-motion:reduce){.orbit-studio-page,.orbit-item-pro,.orbit-live-tag i,.orbit-fallback-stars i,.orbit-fallback-coins b,.orbit-fallback-avatar,.orbit-fallback-avatar.celebrate .fb-arm-right{animation:none!important;transition:none!important}}
      @media(max-width:850px){.orbit-avatar-layout-pro{grid-template-columns:1fr}.orbit-avatar-preview-wrap{height:430px}.orbit-developer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.orbit-avatar-preview-wrap{height:390px}.orbit-fallback-scene{min-height:390px}.orbit-fallback-avatar{transform:translateX(-50%) rotateY(-18deg) scale(.88);transform-origin:bottom center}.orbit-developer-card{min-height:155px}.orbit-developer-card>b{font-size:18px}.orbit-outfit-slot{padding:10px 6px}.orbit-avatar-footer{font-size:9px}}
      /* Orbit 2.1: dressing-room UI, visible fallback and motion polish. */
      .orbit-roblox-studio{max-width:1450px;margin:0 auto;display:grid;gap:17px;animation:orbitPageEnter .38s ease both}
      .orbit-studio-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 17px;border:1px solid #ffffff22;border-radius:19px;background:linear-gradient(105deg,#171a37,#29204f 58%,#45265f);color:#fff;box-shadow:0 6px 0 #11132b}
      .orbit-studio-brand{display:flex;align-items:center;gap:10px}.orbit-studio-brand-mark{width:39px;height:39px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#8b5cf6,#ec4899);font-size:23px;box-shadow:0 4px 0 #3b176f}.orbit-studio-brand b,.orbit-studio-brand small{display:block}.orbit-studio-brand b{font:900 12px 'Inter',sans-serif;letter-spacing:.14em}.orbit-studio-brand small{color:#c4b5fd;font-size:10px;margin-top:3px}.orbit-studio-wallet{display:flex;gap:8px;flex-wrap:wrap}.orbit-studio-wallet span{padding:8px 10px;background:#ffffff14;border:1px solid #ffffff2e;border-radius:12px;font:700 11px 'Fredoka',system-ui}
      .orbit-studio-hero{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:21px 24px;border-radius:22px;background:linear-gradient(110deg,#4c1d95,#6d28d9 52%,#be185d);color:#fff;box-shadow:0 7px 0 #3b0764;flex-wrap:wrap}.orbit-studio-hero h1{font:700 clamp(28px,4vw,39px) 'Fredoka',system-ui;margin:4px 0}.orbit-studio-hero p{font-size:13px;color:#f3e8ff;max-width:600px;margin:0}.orbit-studio-eyebrow{font:900 9px 'Inter',sans-serif;letter-spacing:.18em;color:#a78bfa}.orbit-studio-hero .orbit-studio-eyebrow{color:#f5d0fe}.orbit-studio-hero-actions{display:flex;gap:8px;flex-wrap:wrap}.orbit-studio-action{border:1px solid #ffffff44;border-radius:12px;padding:10px 14px;background:#ffffff21;color:white;font:700 12px 'Fredoka',system-ui;cursor:pointer;transition:transform .18s,background .18s}.orbit-studio-action:hover{transform:translateY(-3px);background:#ffffff32}.orbit-studio-action-light{background:#fff;color:#5b21b6;border-color:#fff}
      .orbit-studio-main-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(370px,.88fr);gap:16px;align-items:stretch}.orbit-character-panel{padding:17px;border-radius:22px;border:1px solid #c4b5fd;background:linear-gradient(180deg,#221c4a,#151a36 75%);color:#fff;box-shadow:0 7px 0 #0c1028;min-width:0}.orbit-character-panel-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.orbit-character-panel-head h2{font:700 23px 'Fredoka',system-ui;margin:3px 0}.orbit-character-panel-head small{font-size:10px;color:#c4b5fd}.orbit-online-indicator{font:900 9px 'Inter',sans-serif;letter-spacing:.12em;color:#a7f3d0;display:flex;align-items:center;gap:7px;white-space:nowrap}.orbit-online-indicator i{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 4px #34d39925;animation:orbitLivePulse 1.6s ease-in-out infinite}
      .orbit-avatar-preview-wrap{position:relative;height:510px;overflow:hidden;border:1px solid #ffffff20;border-radius:19px;background:radial-gradient(ellipse at 50% 38%,#5552a5 0%,#29306a 42%,#111a3b 100%);isolation:isolate}.orbit-avatar-preview-wrap>.orbit-3d-fallback{position:absolute;inset:0;z-index:1;display:grid;place-items:stretch;padding:0;min-height:0;opacity:1;transition:opacity .25s ease}.orbit-avatar-preview-wrap>.orbit-3d-canvas{position:absolute;inset:0;z-index:2;width:100%;height:100%;opacity:0;transition:opacity .25s ease;background:transparent}
      .orbit-fallback-scene{position:relative;width:100%;height:100%;min-height:100%;perspective:1100px;overflow:hidden;background:radial-gradient(ellipse at 52% 43%,#5961be55 0%,transparent 53%)}.orbit-fallback-sky-orb{position:absolute;width:220px;height:220px;border-radius:50%;filter:blur(2px);opacity:.32;animation:orbitSkyFloat 8s ease-in-out infinite}.orbit-fallback-sky-one{top:20px;left:calc(50% - 230px);background:radial-gradient(circle,#ec4899,transparent 70%)}.orbit-fallback-sky-two{right:calc(50% - 240px);bottom:20px;background:radial-gradient(circle,#38bdf8,transparent 70%);animation-delay:-4s}.orbit-fallback-pedestal{position:absolute;left:50%;bottom:55px;transform:translateX(-50%);width:260px;height:65px;border-radius:50%;background:linear-gradient(180deg,#7771de,#302766 60%,#171a3c);box-shadow:0 14px 25px #070b25aa,0 0 42px #a78bfa55}.orbit-fallback-pedestal:before{content:'';position:absolute;inset:8px 22px;border-radius:50%;border:3px solid #facc15;box-shadow:0 0 18px #facc1588}.orbit-fallback-pedestal span{position:absolute;inset:-7px 16px 30px;border-radius:50%;border-top:4px solid #d8b4fe;box-shadow:0 -5px 14px #c4b5fd66}.orbit-fallback-pedestal i{position:absolute;left:50%;top:20px;width:45%;height:18px;transform:translateX(-50%);border-radius:50%;background:#b8a8ff55;filter:blur(9px)}.orbit-fallback-avatar{bottom:105px;width:210px;height:320px;filter:drop-shadow(0 18px 17px #070b28aa);transform:translateX(-50%) rotateY(-18deg) scale(var(--body-x,1),var(--body-y,1))}.orbit-fallback-avatar>div{box-shadow:inset -10px -8px 0 #00000020,inset 4px 4px 0 #ffffff28}.fb-head{left:52px;top:5px;width:104px;height:96px;border-radius:14px;background:var(--skin);border:3px solid #101528;box-shadow:inset -11px -7px 0 #00000018,8px 0 0 #00000028}.fb-head:before{right:-17px;width:16px;height:78px}.fb-hair{width:104px;height:28px;box-shadow:0 8px 0 var(--hair)}.fb-face{top:38px;gap:31px}.fb-face i{width:9px;height:11px}.fb-torso{left:38px;top:112px;width:132px;height:108px;border-radius:10px}.fb-torso:before{content:'';position:absolute;right:-14px;top:5px;width:12px;height:calc(100% - 10px);background:color-mix(in srgb,var(--shirt),#000 24%);border:2px solid #101528;border-left:0;transform:skewY(-8deg) translateZ(-5px);transform-origin:left}.fb-torso:after{content:'';position:absolute;left:4px;right:5px;top:-12px;height:10px;background:color-mix(in srgb,var(--shirt),#fff 22%);border:2px solid #101528;border-bottom:0;transform:skewX(-25deg)}.fb-torso-badge{font:900 8px 'Inter',sans-serif;letter-spacing:.12em;background:#fff2;padding:3px 5px;border-radius:4px}.fb-arm{top:114px;width:35px;height:102px;border-radius:10px}.fb-arm i{width:29px;height:36px}.fb-arm-left{left:7px;animation:orbitFallbackArmIdle 3s ease-in-out infinite}.fb-arm-right{right:4px;animation:orbitFallbackArmIdle 3s ease-in-out infinite reverse}.fb-leg{top:213px;width:52px;height:78px}.fb-leg-left{left:50px;animation:orbitFallbackLegIdle 3s ease-in-out infinite}.fb-leg-right{right:41px;animation:orbitFallbackLegIdle 3s ease-in-out infinite reverse}.fb-cape{left:38px;top:116px;width:140px;height:154px}.fb-cape-jetpack{left:45px;top:121px;width:120px;height:94px;clip-path:none;border:0;background:linear-gradient(90deg,transparent 0 8%,#38bdf8 8% 34%,#0e7490 34% 39%,transparent 39% 61%,#38bdf8 61% 88%,#0e7490 88% 93%,transparent 93%);filter:drop-shadow(0 4px 2px #070b25)}.fb-cape-wings{clip-path:polygon(50% 0,100% 18%,84% 88%,52% 72%,16% 100%,0 24%)}.orbit-fallback-ground-glow{position:absolute;left:50%;bottom:105px;transform:translateX(-50%);width:230px;height:35px;border-radius:50%;background:#a78bfa55;filter:blur(19px)}.orbit-fallback-caption{bottom:15px;color:#c7d2fe;font-size:9px;letter-spacing:.22em}
      .orbit-fallback-stars{position:absolute;inset:0;pointer-events:none}.orbit-fallback-stars i{position:absolute;color:#fef08a;font-size:17px;font-style:normal;text-shadow:0 0 12px #fef08a;animation:orbitStarFloat 2.6s ease-in-out infinite}.orbit-fallback-stars i:nth-child(1){top:16%;left:17%}.orbit-fallback-stars i:nth-child(2){top:25%;right:18%;animation-delay:-.6s}.orbit-fallback-stars i:nth-child(3){top:58%;left:12%;animation-delay:-1.1s}.orbit-fallback-stars i:nth-child(4){top:49%;right:11%;animation-delay:-1.7s}.orbit-fallback-stars i:nth-child(5){top:77%;left:24%;animation-delay:-.9s}.orbit-fallback-stars i:nth-child(6){top:72%;right:21%;animation-delay:-1.3s}.orbit-fallback-stars i:nth-child(7){top:12%;right:34%;animation-delay:-2s}.orbit-fallback-coins{position:absolute;inset:0;pointer-events:none}.orbit-fallback-coins b{position:absolute;font-size:25px;animation:orbitCoinFloat 2.8s ease-in-out infinite}.orbit-fallback-coins b:nth-child(1){top:35%;left:16%}.orbit-fallback-coins b:nth-child(2){top:18%;right:23%;animation-delay:-.7s}.orbit-fallback-coins b:nth-child(3){top:60%;right:13%;animation-delay:-1.4s}.orbit-fallback-coins b:nth-child(4){top:55%;left:22%;animation-delay:-2s}
      .orbit-character-controls{display:flex;gap:8px;justify-content:center;margin:12px 0}.orbit-character-controls button{width:43px;height:40px;border-radius:12px;border:1px solid #ffffff32;background:#ffffff14;color:#fff;font-size:20px;font-weight:800;cursor:pointer;transition:transform .16s,background .16s}.orbit-character-controls button:hover{transform:translateY(-3px);background:#8b5cf655}.orbit-character-controls .orbit-character-emote{width:auto;padding:0 15px;background:linear-gradient(100deg,#7c3aed,#db2777);font:700 12px 'Fredoka',system-ui}.orbit-character-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:11px;border-radius:14px;background:#ffffff0b;border:1px solid #ffffff15}.orbit-character-stats>div{display:grid;gap:4px;text-align:center}.orbit-character-stats small{font:800 8px 'Inter',sans-serif;letter-spacing:.08em;color:#a5b4fc}.orbit-character-stats b{font:700 16px 'Fredoka',system-ui}.orbit-studio-tip{text-align:center;color:#c4b5fd;font-size:10px;padding-top:10px}
      .orbit-wardrobe-panel{padding:17px;border-radius:22px;border:1px solid #d8b4fe;background:linear-gradient(180deg,var(--bg-card),var(--bg-app));box-shadow:0 7px 0 #6d28d922;min-width:0}.orbit-wardrobe-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:13px}.orbit-wardrobe-head h2{font:700 25px 'Fredoka',system-ui;margin:4px 0}.orbit-wardrobe-head p{font-size:11px;color:var(--text-muted);margin:0}.orbit-wardrobe-count{border-radius:99px;padding:7px 9px;background:#ede9fe;color:#6d28d9;font:900 9px 'Inter',sans-serif;white-space:nowrap}.dark .orbit-wardrobe-count{background:#312e81;color:#ddd6fe}.orbit-wardrobe-categories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0;padding-bottom:11px;border-bottom:1px solid var(--border-subtle)}.orbit-wardrobe-tab{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px 5px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--bg-app);color:var(--text-main);font:700 10px 'Fredoka',system-ui;cursor:pointer;transition:all .16s}.orbit-wardrobe-tab.active{background:linear-gradient(110deg,#6d28d9,#a855f7);border-color:#7c3aed;color:white;box-shadow:0 3px 0 #4c1d95}.orbit-wardrobe-tab:hover{transform:translateY(-2px)}.orbit-wardrobe-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:450px;overflow:auto;padding:3px 3px 8px}.orbit-wardrobe-item{position:relative;display:flex;align-items:center;gap:9px;min-width:0;min-height:82px;padding:10px;border:2px solid var(--border-subtle);border-radius:14px;background:var(--bg-card);color:var(--text-main);text-align:left;cursor:pointer;transition:transform .17s,border-color .17s,box-shadow .17s}.orbit-wardrobe-item:hover{transform:translateY(-3px);border-color:#a78bfa;box-shadow:0 7px 14px #6d28d91c}.orbit-wardrobe-item.equipped{border-color:#8b5cf6;background:#f5f3ff;box-shadow:0 3px 0 #8b5cf6}.dark .orbit-wardrobe-item.equipped{background:#2e1065}.orbit-wardrobe-item.locked{opacity:.82}.orbit-wardrobe-swatch{flex:none;width:43px;height:43px;border:2px solid #ffffffab;border-radius:12px;display:grid;place-items:center;color:#fff;font-size:18px;text-shadow:0 2px 4px #0008;box-shadow:inset 0 -5px 0 #0002}.orbit-wardrobe-item-text{display:grid;gap:4px;min-width:0}.orbit-wardrobe-item-text b{font:700 12px 'Fredoka',system-ui;overflow-wrap:anywhere}.orbit-wardrobe-item-text small{font-size:9px;color:var(--text-muted)}.orbit-wardrobe-item em{position:absolute;right:7px;top:6px;font:900 7px 'Inter',sans-serif;text-transform:uppercase;font-style:normal;letter-spacing:.04em;color:#64748b}.orbit-equipped-check{position:absolute;right:8px;bottom:6px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#16a34a;color:white;font-size:10px}.orbit-wardrobe-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:9px}.orbit-wardrobe-footer button{border:0;background:transparent;color:#7c3aed;font:700 10px 'Fredoka',system-ui;cursor:pointer}
      .orbit-outfit-strip{display:grid;grid-template-columns:minmax(190px,.72fr) minmax(0,1.28fr);align-items:center;gap:15px;padding:17px 19px;border:1px solid #c4b5fd;border-radius:20px;background:linear-gradient(110deg,var(--bg-card),#f5f3ff);box-shadow:0 5px 0 #6d28d915}.dark .orbit-outfit-strip{background:linear-gradient(110deg,#171d33,#2a1e4e)}.orbit-outfit-strip h2{font:700 22px 'Fredoka',system-ui;margin:3px 0}.orbit-outfit-strip p{font-size:10px;color:var(--text-muted);margin:0}.orbit-outfit-strip .orbit-outfit-row{margin:0}.orbit-outfit-slot{transition:transform .17s,border-color .17s}.orbit-outfit-slot:hover{transform:translateY(-3px);border-color:#7c3aed}
      .orbit-world-preview-wrap{position:relative;height:min(62vh,560px);min-height:420px;overflow:hidden;border-radius:19px;border:1px solid #ffffff22;background:#11152d;isolation:isolate}.orbit-world-preview-wrap>.orbit-3d-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2;opacity:0;transition:opacity .25s}.orbit-world-preview-wrap>.orbit-3d-fallback{position:absolute;inset:0;z-index:1;display:grid;opacity:1;padding:0;transition:opacity .25s}.orbit-room-fallback{background:radial-gradient(ellipse at 50% 40%,#3e4f96,#171936 72%);overflow:hidden}.orbit-room-window{position:absolute;top:7%;left:30%;width:40%;height:32%;display:grid;place-items:center;border:10px solid #8b8dea;border-radius:12px;background:linear-gradient(145deg,#191b4e,#4338a4 58%,#0ea5e9);color:#fff;font-size:24px;letter-spacing:15px;box-shadow:0 0 38px #818cf866}.orbit-room-shelf{position:absolute;top:16%;left:4%;padding:10px 15px;border-radius:9px;background:#75482f;border-bottom:8px solid #432b26;font-size:23px;box-shadow:0 7px 15px #05081755}.orbit-room-desk{position:absolute;right:7%;top:50%;width:35%;height:18px;border-radius:7px;background:#9a633d;box-shadow:0 10px 0 #68432f}.orbit-room-desk span{position:absolute;left:40%;top:-62px;padding:6px 17px;border-radius:5px;background:#111827;border:5px solid #94a3b8;font-size:35px}.orbit-room-desk i{position:absolute;left:12%;right:12%;top:15px;height:110px;border-left:11px solid #795035;border-right:11px solid #795035}.orbit-room-avatar{position:absolute;left:8%;bottom:7%;width:39%;height:55%;overflow:hidden}.orbit-room-avatar .orbit-fallback-scene{min-height:0;background:transparent}.orbit-room-avatar .orbit-fallback-sky-orb,.orbit-room-avatar .orbit-fallback-stars,.orbit-room-avatar .orbit-fallback-coins,.orbit-room-avatar .orbit-fallback-pedestal,.orbit-room-avatar .orbit-fallback-ground-glow,.orbit-room-avatar .orbit-fallback-caption{display:none}.orbit-room-avatar .orbit-fallback-avatar{transform:translateX(-50%) rotateY(-18deg) scale(.7);bottom:0}.orbit-room-floor{position:absolute;left:0;right:0;bottom:0;height:24%;background:linear-gradient(180deg,#4c3d85,#211b45);border-top:5px solid #a78bfa;transform:perspective(300px) rotateX(7deg);transform-origin:bottom}.orbit-room-fallback>small{position:absolute;bottom:12px;left:0;right:0;text-align:center;color:#ddd6fe;font:900 9px 'Inter',sans-serif;letter-spacing:.2em;z-index:4}
      .orbit-developer-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.orbit-developer-card{min-height:245px;padding:20px;gap:12px;border-radius:24px;box-shadow:0 9px 0 #8b5cf644;transition:transform .2s,box-shadow .2s}.orbit-developer-card:hover{transform:translateY(-6px);box-shadow:0 14px 22px #6d28d922}.orbit-developer-avatar{width:88px;height:88px;border-radius:26px;font-size:43px;box-shadow:0 8px 0 #4c1d95;outline:5px solid #a78bfa36}.orbit-developer-card>b{font-size:27px}.orbit-developer-card>small{font-size:11px}.orbit-team-panel-xl{padding:34px}.orbit-team-heading h2{font-size:38px}.orbit-team-heading p{font-size:14px}.orbit-mentor-card-xl{min-height:300px;padding:48px 28px;box-shadow:0 11px 0 #2e1065}.orbit-mentor-card-xl .orbit-mentor-icon{font-size:58px}.orbit-mentor-card-xl h2{font-size:clamp(40px,6vw,58px)}.orbit-mentor-card-xl p{font-size:15px;max-width:720px}.orbit-mentor-signature{display:inline-block;margin-top:14px;padding:9px 14px;border:1px solid #ffffff48;border-radius:99px;background:#ffffff15;color:#f5d0fe;font:700 10px 'Fredoka',system-ui;letter-spacing:.08em}
      @keyframes orbitSkyFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.08)}}@keyframes orbitFallbackArmIdle{0%,100%{rotate:0deg}50%{rotate:3deg}}@keyframes orbitFallbackLegIdle{0%,100%{translate:0 0}50%{translate:0 -2px}}@keyframes orbitFallbackCheer{0%,100%{rotate:0deg}35%,70%{rotate:-125deg}}@keyframes orbitFallbackSpin{to{transform:translateX(-50%) rotateY(342deg) scale(var(--body-x,1),var(--body-y,1))}}
      @media(max-width:980px){.orbit-studio-main-grid{grid-template-columns:1fr}.orbit-avatar-preview-wrap{height:490px}.orbit-wardrobe-items{max-height:340px}.orbit-developer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:600px){.orbit-studio-topbar{align-items:flex-start;flex-direction:column}.orbit-studio-wallet{width:100%}.orbit-studio-hero{padding:17px}.orbit-avatar-preview-wrap{height:420px}.orbit-wardrobe-categories{grid-template-columns:repeat(3,minmax(0,1fr))}.orbit-outfit-strip{grid-template-columns:1fr}.orbit-developer-grid{grid-template-columns:1fr 1fr}.orbit-developer-card{min-height:190px;padding:12px}.orbit-developer-avatar{width:66px;height:66px;font-size:32px}.orbit-developer-card>b{font-size:19px}.orbit-mentor-card-xl{min-height:250px;padding:30px 18px}}
      @media(prefers-reduced-motion:reduce){.orbit-roblox-studio,.orbit-wardrobe-item,.orbit-wardrobe-tab,.orbit-developer-card,.orbit-fallback-avatar,.orbit-fallback-sky-orb{animation:none!important;transition:none!important}}
      /* Legacy pet styling removed; no pet UI is shipped in this build. */
      .orbit-fallback-scene.is-dragging{cursor:grabbing!important}.orbit-fallback-avatar{will-change:transform,translate}.orbit-character-panel,.orbit-wardrobe-panel{animation:orbitPanelRise .42s cubic-bezier(.2,.75,.25,1) both}.orbit-wardrobe-panel{animation-delay:.08s}@keyframes orbitPanelRise{from{opacity:0;translate:0 16px}to{opacity:1;translate:0 0}}

            @keyframes orbitPulse{to{transform:scale(1.08)}}
      @media(max-width:850px){.orbit-avatar-layout,.orbit-lingo-layout{grid-template-columns:1fr}.orbit-grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-game-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-decor-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-language-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-task-form{grid-template-columns:1fr 1fr}.orbit-task-form input:first-child{grid-column:1/-1}.orbit-3d-canvas{height:330px}}
      @media(max-width:520px){.orbit-hero{padding:17px}.orbit-panel{padding:14px}.orbit-grid-2{grid-template-columns:1fr}.orbit-lingo-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-quiz-options{grid-template-columns:1fr}.orbit-task-form{grid-template-columns:1fr}.orbit-task-form input:first-child{grid-column:auto}.orbit-revision-controls{width:100%}.orbit-revision-controls input{flex:1}.orbit-game-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.orbit-memory-card{height:58px}}
    `;
    document.head.appendChild(style);
    // Header gem indicator.
    const coin=$('hdr-coin-pill');
    
    // No promotional footer is added to the app shell.
    // Rename legacy labels visible in persistent navigation and modal text.
    const more=$('more-sheet')?.querySelector('h3');if(more)more.textContent='All OrbitSchool Modules';
    const badgeReward=$('badge-modal-reward');if(badgeReward)badgeReward.textContent=badgeReward.textContent.replace('Aura XP','XP');
    updateHeaderUI();
  });

  // Timer reminders while the tab is open. Browser background delivery needs a push backend.
  setInterval(()=>{try{ensureDailyQuestReset();checkOrbitScheduledReminders(false);}catch(e){}},30000);
  window.addEventListener('beforeunload',stopOrbitThree);
})();
