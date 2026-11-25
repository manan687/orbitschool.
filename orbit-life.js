/* OrbitSchool Life & Home update — additive local-first character, room and economy experience. */
(() => {
  'use strict';

  const KEY = 'orbitschool_life_home_v1';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (_) { return fallback; } };
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(life)); } catch (e) { console.warn('OrbitSchool life data could not be saved:', e); } };
  const levelNow = () => (typeof getLevel === 'function' ? getLevel() : Math.floor((Number(state?.xp) || 0) / 500) + 1);
  const coinBalance = () => Math.max(0, Number(state?.coins) || 0);
  const toast = (message, icon='✨') => {
    if (window.OrbitNext?.showToast) window.OrbitNext.showToast(message, icon);
    else if (typeof showToast === 'function') showToast(message, icon);
    else alert(message);
  };
  const saveCoins = () => {
    localStorage.setItem('orbit_coins', String(state.coins));
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
  };
  const spend = (amount) => {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (coinBalance() < amount) { toast(`You need ${amount} Orbit Coins for this item. Earn coins by studying and completing missions.`, '🪙'); return false; }
    state.coins = coinBalance() - amount;
    saveCoins();
    if (typeof playSfx === 'function') playSfx('coin');
    return true;
  };

  const DEFAULT = {
    avatar: { style:'boy', skin:'#F2C6A8', shirt:'blue', pants:'navy', hairStyle:'short', hairColor:'brown', hat:'none', accessory:'none', face:'smile', shoes:'white' },
    owned: {
      shirts:['blue','cream'], pants:['navy'], hairStyles:['short','side','long','ponytail'], hairColors:['brown','dark'],
      hats:['none'], accessories:['none'], faces:['smile','focused'], shoes:['white'],
      furniture:['desk','lamp','bed','rug','shelf','plant'],
      wallThemes:['nebula'], floorThemes:['wood']
    },
    room:{ decor:['desk','lamp','bed','rug','shelf','plant'], wall:'nebula', floor:'wood', accent:'violet' },
    savedLooks:[], worldSub:'explore', shopTab:'wardrobe'
  };
  const merge = (base, value) => {
    const out = {...base, ...(value && typeof value === 'object' ? value : {})};
    for (const k of Object.keys(base)) if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = merge(base[k], out[k]);
    return out;
  };
  const life = merge(DEFAULT, read(KEY, DEFAULT));
  for (const group of Object.keys(DEFAULT.owned)) {
    if (!Array.isArray(life.owned[group])) life.owned[group] = DEFAULT.owned[group].slice();
  }
  // Remove legacy pet-shop data from the visible OrbitSchool profile.
  delete life.owned.pets; delete life.owned.petAccessories;
  delete life.activePet; delete life.petStats; delete life.petAccessory; delete life.petSnacks; delete life.petName; delete life.petBond;
  try { localStorage.removeItem('orbit_v2_pet_system'); } catch (_) {}
  life.owned.furniture = life.owned.furniture.filter(id => id !== 'petbed');
  life.room.decor = Array.isArray(life.room.decor) ? life.room.decor.filter(id => id !== 'petbed') : DEFAULT.room.decor.slice();
  life.shopTab = life.shopTab === 'room' ? 'room' : 'wardrobe';
  write();

  const SHIRTS = [
    {id:'blue',name:'Comet Blue Tee',color:'#5B83E8',price:0,level:1},{id:'cream',name:'Cloud Cream Tee',color:'#F4ECDD',price:0,level:1},
    {id:'rose',name:'Rose Pop Tee',color:'#EF83AE',price:95,level:2},{id:'mint',name:'Mint Breeze Tee',color:'#60C9A8',price:105,level:2},
    {id:'sunset',name:'Sunset Orange Tee',color:'#F18C5A',price:120,level:3},{id:'violet',name:'Nebula Violet Tee',color:'#9474E8',price:125,level:3},
    {id:'midnight',name:'Midnight Tee',color:'#273554',price:145,level:4},{id:'coral',name:'Coral Star Tee',color:'#F06D72',price:145,level:4},
    {id:'lemon',name:'Lemon Glow Tee',color:'#EEC957',price:175,level:5}
  ];
  const PANTS = [
    {id:'navy',name:'Explorer Navy Pants',color:'#344664',price:0,level:1},{id:'denim',name:'Denim Blue Pants',color:'#477BB8',price:90,level:2},
    {id:'lavender',name:'Lavender Joggers',color:'#8F80C7',price:110,level:3},{id:'mint',name:'Mint Joggers',color:'#4DA88E',price:110,level:3},
    {id:'charcoal',name:'Charcoal Cargo Pants',color:'#3D4554',price:130,level:4},{id:'berry',name:'Berry Street Pants',color:'#864E85',price:155,level:5},
    {id:'sand',name:'Sandstone Shorts',color:'#C29B70',price:180,level:6},{id:'rose',name:'Rose Joggers',color:'#CE7EA8',price:150,level:4},
    {id:'teal',name:'Lagoon Trousers',color:'#348F92',price:165,level:5},{id:'star_skirt',name:'Starlight Skirt',color:'#A77CE5',price:210,level:6,style:'skirt'}
  ];
  const HAIR_STYLES = [
    {id:'short',name:'Short Crop',price:0,level:1},{id:'side',name:'Side Sweep',price:0,level:1},
    {id:'long',name:'Long Locks',price:125,level:2},{id:'curly',name:'Curly Clouds',price:150,level:3},
    {id:'ponytail',name:'Star Ponytail',price:155,level:3},{id:'spiky',name:'Pixel Spikes',price:135,level:3},
    {id:'braids',name:'Comet Braids',price:210,level:5},{id:'bob',name:'Cloud Bob',price:145,level:3},
    {id:'bun',name:'Double Star Buns',price:180,level:4},{id:'twin',name:'Twin Tails',price:220,level:5}
  ];
  const HAIR_COLORS = [
    {id:'brown',name:'Chestnut',color:'#684637',price:0,level:1},{id:'dark',name:'Midnight',color:'#252638',price:0,level:1},
    {id:'gold',name:'Honey Gold',color:'#D89A43',price:95,level:2},{id:'pink',name:'Galaxy Pink',color:'#D96DAA',price:125,level:3},
    {id:'violet',name:'Amethyst',color:'#8866CA',price:135,level:3},{id:'mint',name:'Mint Glow',color:'#55B7A1',price:160,level:4},
    {id:'silver',name:'Moon Silver',color:'#B8C7D9',price:195,level:6}
  ];
  const HATS = [
    {id:'none',name:'No Headwear',emoji:'—',price:0,level:1},{id:'cap',name:'Orbit Cap',emoji:'🧢',price:110,level:2},
    {id:'headphones',name:'Neon Headphones',emoji:'🎧',price:185,level:3},{id:'flower',name:'Flower Crown',emoji:'🌼',price:175,level:3},
    {id:'crown',name:'Little Star Crown',emoji:'👑',price:360,level:6},{id:'helmet',name:'Explorer Helmet',emoji:'🪖',price:320,level:5},
    {id:'beanie',name:'Cloud Beanie',emoji:'🧢',price:145,level:3},{id:'starband',name:'Starlight Headband',emoji:'✨',price:125,level:3},
    {id:'bow',name:'Comet Hair Bow',emoji:'🎀',price:115,level:2}
  ];
  const ACCESSORIES = [
    {id:'none',name:'No Accessory',emoji:'—',price:0,level:1},{id:'backpack',name:'School Backpack',emoji:'🎒',price:125,level:2},
    {id:'scarf',name:'Comet Scarf',emoji:'🧣',price:105,level:2},{id:'glasses',name:'Smart Specs',emoji:'🤓',price:135,level:3},
    {id:'wings',name:'Mini Star Wings',emoji:'🪽',price:320,level:6},{id:'badge',name:'Orbit Chest Badge',emoji:'✨',price:85,level:2},
    {id:'necklace',name:'Planet Necklace',emoji:'📿',price:145,level:3},{id:'watch',name:'Study Timer Watch',emoji:'⌚',price:175,level:4}
  ];
  const FACES = [
    {id:'smile',name:'Happy Smile',emoji:'😊',price:0,level:1},{id:'focused',name:'Focused',emoji:'😌',price:0,level:1},
    {id:'excited',name:'Excited',emoji:'🤩',price:65,level:2},{id:'sleepy',name:'Sleepy',emoji:'😴',price:65,level:2},
    {id:'surprised',name:'Surprised',emoji:'😮',price:95,level:3},{id:'wink',name:'Wink',emoji:'😉',price:125,level:4},
    {id:'laugh',name:'Laughing',emoji:'😆',price:115,level:3}
  ];
  const SHOES = [
    {id:'white',name:'Cloud Sneakers',color:'#F5F7FF',price:0,level:1},{id:'red',name:'Comet Red Sneakers',color:'#EC6868',price:100,level:2},
    {id:'blue',name:'Skyline Sneakers',color:'#5F8BDB',price:110,level:3},{id:'mint',name:'Mint Sneakers',color:'#59BFA3',price:120,level:3},
    {id:'black',name:'Night Runner Shoes',color:'#293247',price:145,level:4},{id:'pink',name:'Bubblegum Sneakers',color:'#F18DB7',price:155,level:4},
    {id:'gold',name:'Solar Sneakers',color:'#E9B94F',price:210,level:6}
  ];
  const FURNITURE = [
    {id:'desk',name:'Study Desk',emoji:'🪑',desc:'A cosy base for your study sessions.',price:0,level:1},
    {id:'lamp',name:'Star Lamp',emoji:'💡',desc:'A warm light for evening revision.',price:0,level:1},
    {id:'bed',name:'Cloud Bed',emoji:'🛏️',desc:'A soft rest spot for your avatar.',price:0,level:1},
    {id:'rug',name:'Orbit Rug',emoji:'🟣',desc:'A soft centrepiece for the room.',price:0,level:1},
    {id:'shelf',name:'Book Shelf',emoji:'📚',desc:'Keep your favourite books close.',price:0,level:1},
    {id:'plant',name:'Cosmic Plant',emoji:'🪴',desc:'A little greenery for the room.',price:0,level:1},
    {id:'aquarium',name:'Mini Star Aquarium',emoji:'🐠',desc:'A glowing aquarium with tiny fish.',price:320,level:4},
    {id:'projector',name:'Nebula Projector',emoji:'🌌',desc:'Projects a soft galaxy onto the wall.',price:295,level:4},
    {id:'trophyshelf',name:'Trophy Display',emoji:'🏆',desc:'Showcase your earned achievements.',price:360,level:5},
    {id:'window',name:'Moonlight Window',emoji:'🪟',desc:'A large window with a planet view.',price:245,level:3},
    {id:'guitar',name:'Pixel Guitar',emoji:'🎸',desc:'A creative corner for your room.',price:250,level:4},
    {id:'beanbag',name:'Nebula Beanbag',emoji:'🛋️',desc:'A soft chair for reading breaks.',price:190,level:3},
    {id:'wallart',name:'Orbit Wall Art',emoji:'🖼️',desc:'A colourful framed space illustration.',price:150,level:2},
    {id:'gamingchair',name:'Comet Gaming Chair',emoji:'🪑',desc:'A colourful, comfy chair beside your desk.',price:390,level:5},
    {id:'ceilingstars',name:'Ceiling Star Lights',emoji:'🌟',desc:'Tiny stars that glow above your room.',price:280,level:4},
    {id:'planetmobile',name:'Planet Mobile',emoji:'🪐',desc:'A moving solar-system decoration.',price:340,level:5},
    {id:'windowseat',name:'Moon Window Seat',emoji:'🛋️',desc:'A cosy seat beside the galaxy window.',price:310,level:5}
  ];
  const WALL_THEMES = [
    {id:'nebula',name:'Nebula Violet',color:'#555F93',price:0,level:1},{id:'mint',name:'Mint Aurora',color:'#7DAFA5',price:260,level:3},
    {id:'rose',name:'Rose Galaxy',color:'#C38DAA',price:300,level:4},{id:'blue',name:'Blue Horizon',color:'#748EBB',price:280,level:3},
    {id:'peach',name:'Peach Sunrise',color:'#C9937E',price:350,level:5},{id:'midnight',name:'Midnight Space',color:'#29365D',price:420,level:6}
  ];
  const FLOOR_THEMES = [
    {id:'wood',name:'Warm Wood',color:'#886B5C',price:0,level:1},{id:'light',name:'Cloud Maple',color:'#CDAF88',price:190,level:2},
    {id:'mint',name:'Sea Glass',color:'#82A99C',price:250,level:3},{id:'violet',name:'Amethyst Floor',color:'#78678F',price:310,level:4}
  ];

  let shopTab = life.shopTab === 'room' ? 'room' : 'wardrobe';
  let avatarCategory = 'style';
  let runtime = null;
  let worldSub = life.worldSub || 'explore';
  let previousRender = window.renderCurrentView;
  let sceneFrame = 0;

  function isOwned(group,id){ return Array.isArray(life.owned[group]) && life.owned[group].includes(id); }
  function itemFor(group,id){ return ({shirts:SHIRTS,pants:PANTS,hairStyles:HAIR_STYLES,hairColors:HAIR_COLORS,hats:HATS,accessories:ACCESSORIES,faces:FACES,shoes:SHOES,furniture:FURNITURE,wallThemes:WALL_THEMES,floorThemes:FLOOR_THEMES}[group]||[]).find(x=>x.id===id); }
  function updateAvatar(key,value){
    life.avatar[key]=value;
    if(key==='style'){
      if(value==='girl' && ['short','side','spiky'].includes(life.avatar.hairStyle)) life.avatar.hairStyle='ponytail';
      if(value==='boy' && ['ponytail','braids','twin','bun'].includes(life.avatar.hairStyle)) life.avatar.hairStyle='short';
    }
    write(); updateHeader(); toast('Character updated!', '🎨'); renderCurrentView();
  }
  function updateHeader(){ if(typeof updateHeaderUI==='function') updateHeaderUI(); }
  function buyItem(group,id){
    const item=itemFor(group,id); if(!item)return;
    if(isOwned(group,id)){toast('Already in your collection.','✅');return;}
    if(levelNow()<item.level){toast(`${item.name} unlocks at Level ${item.level}. Keep learning to unlock it.`, '🔒');return;}
    if(!spend(item.price))return;
    life.owned[group].push(id);
    write(); updateHeader();
    toast(`${item.name} added to your collection!`, '🛍️');
    renderCurrentView();
  }
  function equipItem(group,id){
    if(!isOwned(group,id)){toast('Unlock this item in the shop first.','🔒');return;}
    life.avatar[group==='shirts'?'shirt':group==='pants'?'pants':group==='hairStyles'?'hairStyle':group==='hairColors'?'hairColor':group==='hats'?'hat':group==='accessories'?'accessory':group==='faces'?'face':'shoes']=id;
    write(); updateHeader(); renderCurrentView();
  }
  function buyFurniture(id){
    const item=itemFor('furniture',id); if(!item)return;
    if(isOwned('furniture',id)){toggleFurniture(id);return;}
    if(levelNow()<item.level){toast(`${item.name} unlocks at Level ${item.level}.`,'🔒');return;}
    if(!spend(item.price))return;
    life.owned.furniture.push(id);life.room.decor.push(id);write();toast(`${item.name} purchased and placed in your room!`,'🏡');renderCurrentView();
  }
  function toggleFurniture(id){
    if(!isOwned('furniture',id)){toast('Purchase this decoration first.','🔒');return;}
    const i=life.room.decor.indexOf(id); if(i>=0)life.room.decor.splice(i,1); else life.room.decor.push(id);
    write(); if(typeof OrbitNext!=='undefined')toast('Room layout updated.','🪴');renderCurrentView();
  }
  function currencyLine(){return `<div class="life-wallet"><span>✨ ${Number(state?.xp)||0} XP</span><span>🪙 ${coinBalance()} Orbit Coins</span><span>🏅 Level ${levelNow()}</span></div>`;}

  function renderAvatarView(){
    const cats=[['style','Character'],['shirts','Shirts'],['pants','Pants & skirts'],['hairStyles','Hair styles'],['hairColors','Hair colour'],['hats','Headwear'],['accessories','Accessories'],['faces','Expressions'],['shoes','Shoes']];
    const prefs=life.avatar;
    const category=cats.find(x=>x[0]===avatarCategory)||cats[0];
    let controls='';
    if(avatarCategory==='style'){
      controls=`<div class="life-choice-grid">${[['boy','🧑🏻‍🚀','Boy character','A classic explorer look'],['girl','👩🏻‍🚀','Girl character','A different hairstyle and styling option']].map(([id,emoji,name,desc])=>`<button class="life-style-card ${prefs.style===id?'selected':''}" onclick="OrbitLife.setAvatar('style','${id}')"><span>${emoji}</span><b>${name}</b><small>${desc}</small>${prefs.style===id?'<em>Selected</em>':''}</button>`).join('')}</div>
        <div class="life-subtitle">Skin tone</div><div class="life-swatches">${['#F2C6A8','#DCA27E','#B97857','#8C553F','#F0D5B8','#A86F55'].map(c=>`<button aria-label="Skin tone ${c}" class="life-swatch ${prefs.skin===c?'chosen':''}" style="--swatch:${c}" onclick="OrbitLife.setAvatar('skin','${c}')"></button>`).join('')}</div>`;
    }else{
      const itemGroup=avatarCategory;
      const list=({shirts:SHIRTS,pants:PANTS,hairStyles:HAIR_STYLES,hairColors:HAIR_COLORS,hats:HATS,accessories:ACCESSORIES,faces:FACES,shoes:SHOES})[itemGroup]||[];
      const equipped=prefs[({shirts:'shirt',pants:'pants',hairStyles:'hairStyle',hairColors:'hairColor',hats:'hat',accessories:'accessory',faces:'face',shoes:'shoes'}[itemGroup])];
      controls=`<div class="life-item-grid">${list.map(item=>{
        const owned=isOwned(itemGroup,item.id),active=equipped===item.id;
        return `<button class="life-option ${active?'selected':''} ${owned?'':'locked'}" onclick="${owned?`OrbitLife.equip('${itemGroup}','${item.id}')`:`OrbitLife.goShop('${itemGroup}')`}"><span class="life-option-preview" ${item.color?`style="--item-color:${item.color}"`:''}>${item.emoji|| (item.color?'<i></i>':'✨')}</span><b>${esc(item.name)}</b><small>${owned?(active?'Equipped':'Owned'):`🪙 ${item.price} · Level ${item.level}`}</small></button>`;
      }).join('')}</div><p class="life-helper">Items you don't own are marked with a lock. Open the Marketplace to unlock them with Orbit Coins after reaching the required level.</p><button class="life-btn soft" onclick="OrbitLife.goShop('${itemGroup}')">Open Marketplace →</button>`;
    }
    return `<div class="life-page"><section class="life-hero avatar-hero"><div><div class="life-kicker">MAKE YOUR ORBIT YOURS</div><h1>Avatar Studio ✨</h1><p>Choose a boy or girl character, build a look with colourful clothing, hairstyles, expressions and accessories, then save your favourite style.</p>${currencyLine()}</div></section>
      <div class="life-avatar-layout"><section class="life-card life-avatar-preview"><div class="life-preview-top"><span class="life-pill">LIVE CHARACTER PREVIEW</span><span class="life-muted">Drag to rotate</span></div><div class="life-canvas-stage" id="life-avatar-stage"><canvas id="life-avatar-canvas" aria-label="Rotating OrbitSchool character preview"></canvas><div class="life-canvas-shine"></div></div><div class="life-preview-controls"><button class="life-btn" onclick="OrbitLife.emote('wave')">👋 Wave</button><button class="life-btn pink" onclick="OrbitLife.emote('dance')">🎉 Celebrate</button><button class="life-btn soft" onclick="OrbitLife.randomLook()">🎲 Random look</button></div><div class="life-nameplate"><b>${esc(state?.username||'Orbit Explorer')}</b><span>${prefs.style==='girl'?'Girl':'Boy'} character · Level ${levelNow()}</span><small>Outfits, colours and expressions are shared across both character styles.</small></div></section>
      <section class="life-card life-custom-panel"><div class="life-section-head"><div><span class="life-kicker">WARDROBE</span><h2>Character customisation</h2></div><span class="life-pill">${life.savedLooks.length}/10 saved looks</span></div><div class="life-category-tabs">${cats.map(([id,label])=>`<button class="life-tab ${avatarCategory===id?'active':''}" onclick="OrbitLife.setCategory('${id}')">${label}</button>`).join('')}</div><div class="life-controls-area"><div class="life-subtitle">${category[1]}</div>${controls}</div><div class="life-save-row"><button class="life-btn cyan" onclick="OrbitLife.saveLook()">💾 Save outfit</button><button class="life-btn soft" onclick="OrbitLife.goShop('shirts')">🛍️ Shop more styles</button></div>${life.savedLooks.length?`<div class="life-subtitle">Saved looks</div><div class="life-saved-grid">${life.savedLooks.map((o,i)=>`<button class="life-saved" onclick="OrbitLife.loadLook(${i})">👕 ${esc(o.name||`Look ${i+1}`)}</button>`).join('')}</div>`:''}</section></div></div>`;
  }
  function renderMarketplace(){
    const tab=shopTab==='room'?'room':'wardrobe';
    const tabs=[['wardrobe','👕 Wardrobe'],['room','🏡 Room & decorations']];
    let content='';
    if(tab==='wardrobe'){
      const groups=[['shirts','Colourful shirts'],['pants','Pants & skirts'],['hairStyles','Hairstyles'],['hairColors','Hair colours'],['hats','Headwear'],['accessories','Accessories'],['faces','Expressions'],['shoes','Shoes']];
      content=groups.map(([g,title])=>`<section class="life-store-group"><h3>${title}</h3><div class="life-store-grid compact">${({shirts:SHIRTS,pants:PANTS,hairStyles:HAIR_STYLES,hairColors:HAIR_COLORS,hats:HATS,accessories:ACCESSORIES,faces:FACES,shoes:SHOES}[g]||[]).map(item=>{const owned=isOwned(g,item.id),equipped=life.avatar[({shirts:'shirt',pants:'pants',hairStyles:'hairStyle',hairColors:'hairColor',hats:'hat',accessories:'accessory',faces:'face',shoes:'shoes'}[g]) ]===item.id;return `<article class="life-store-item compact-item"><div class="life-store-art small" ${item.color?`style="--item-color:${item.color};background:linear-gradient(145deg,${item.color},#ffffff88)"`:''}>${item.emoji||'✨'}</div><b>${esc(item.name)}</b><small>Level ${item.level} · 🪙 ${item.price}</small><button class="life-buy-btn ${equipped?'selected':''}" ${owned?'disabled':`onclick="OrbitLife.buy('${g}','${item.id}')"`}>${equipped?'Equipped':owned?'Owned':levelNow()<item.level?`Unlock at Level ${item.level}`:'Unlock'}</button></article>`;}).join('')}</div></section>`).join('');
    }
    if(tab==='room'){
      content=`<section class="life-store-group"><h3>🪑 Furniture & decorations</h3><div class="life-store-grid">${FURNITURE.map(item=>{const owned=isOwned('furniture',item.id),placed=life.room.decor.includes(item.id);return `<article class="life-store-item"><div class="life-store-art">${item.emoji}</div><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p><div class="life-store-meta"><span>Level ${item.level}</span><b>🪙 ${item.price}</b></div><button class="life-buy-btn ${placed?'selected':''}" onclick="${owned?`OrbitLife.toggleFurniture('${item.id}')`:`OrbitLife.buyFurniture('${item.id}')`}">${owned?(placed?'Remove from room':'Place in room'):'Purchase & place'}</button></article>`;}).join('')}</div></section><section class="life-store-group"><h3>🎨 Wall themes</h3><div class="life-store-grid compact">${WALL_THEMES.map(item=>{const owned=isOwned('wallThemes',item.id);return `<article class="life-store-item compact-item"><div class="life-theme-swatch" style="--theme:${item.color}"></div><b>${esc(item.name)}</b><small>Level ${item.level} · 🪙 ${item.price}</small><button class="life-buy-btn" onclick="OrbitLife.buyRoomStyle('wallThemes','${item.id}')">${life.room.wall===item.id?'Applied':owned?'Apply':'Unlock & apply'}</button></article>`;}).join('')}</div></section><section class="life-store-group"><h3>🪵 Floor themes</h3><div class="life-store-grid compact">${FLOOR_THEMES.map(item=>{const owned=isOwned('floorThemes',item.id);return `<article class="life-store-item compact-item"><div class="life-theme-swatch" style="--theme:${item.color}"></div><b>${esc(item.name)}</b><small>Level ${item.level} · 🪙 ${item.price}</small><button class="life-buy-btn" onclick="OrbitLife.buyRoomStyle('floorThemes','${item.id}')">${life.room.floor===item.id?'Applied':owned?'Apply':'Unlock & apply'}</button></article>`;}).join('')}</div></section>`;
    }
    return `<div class="life-page"><section class="life-hero market-hero"><div><div class="life-kicker">EARN THROUGH LEARNING</div><h1>Orbit Marketplace 🛍️</h1><p>Unlock colourful outfits, character accessories, furniture and room themes with the Orbit Coins you earn through study. XP raises your level and opens new collections.</p>${currencyLine()}</div></section><section class="life-card life-market-card"><div class="life-section-head"><div><span class="life-kicker">YOUR COLLECTION</span><h2>Choose your next upgrade</h2></div><span class="life-wallet-balance">🪙 ${coinBalance()} Coins</span></div><div class="life-category-tabs">${tabs.map(([id,label])=>`<button class="life-tab ${tab===id?'active':''}" onclick="OrbitLife.setShopTab('${id}')">${label}</button>`).join('')}</div><div class="life-market-content">${content}</div><p class="life-muted life-economy-note">Study tools remain free. XP unlocks levels; Orbit Coins purchase optional cosmetics and room decorations.</p></section></div>`;
  }

  function renderRoomView(){
    const decor=FURNITURE.filter(x=>life.room.decor.includes(x.id));
    return `<div class="life-page"><section class="life-hero room-hero"><div><div class="life-kicker">YOUR OWN LITTLE CORNER OF THE UNIVERSE</div><h1>My 3D Room 🏡</h1><p>A cosy interactive room with your block-style avatar, study desk, living corner, trophy displays and custom wall and floor themes. Drag to orbit the view and scroll to zoom.</p>${currencyLine()}</div></section>
      <nav class="life-room-nav"><button onclick="OrbitLife.showExplore()">🌍 Explore islands</button><button class="active" onclick="OrbitLife.showRoom()">🏡 My room</button><button onclick="OrbitLife.setShopTab('room');switchTab('shop')">🛍️ Furniture shop</button><button onclick="switchTab('avatar')">🎨 Character studio</button></nav>
      <div class="life-room-layout"><section class="life-card life-room-card"><div class="life-preview-top"><span class="life-pill">LIVE 3D ROOM PREVIEW</span><span class="life-muted">Drag to rotate · Scroll to zoom · Double-tap to reset</span></div><div class="life-room-stage" id="life-room-stage"><canvas id="life-room-canvas" aria-label="Interactive 3D OrbitSchool bedroom"></canvas><div class="life-room-label">✦ YOUR ORBIT HOME ✦</div></div><div class="life-room-actions"><button class="life-btn cyan" onclick="OrbitLife.roomEmote('wave')">👋 Wave</button><button class="life-btn pink" onclick="OrbitLife.roomEmote('dance')">🎉 Celebrate</button><button class="life-btn soft" onclick="OrbitLife.setShopTab('room');switchTab('shop')">🛍️ Decorate room</button><button class="life-btn soft" onclick="OrbitLife.toggleLights()">💡 Toggle lighting</button></div></section>
      <aside class="life-card life-room-side"><div class="life-section-head"><div><span class="life-kicker">YOUR SPACE</span><h2>Room inventory</h2></div><span class="life-pill">${decor.length} placed</span></div><div class="life-room-inventory">${decor.map(x=>`<div class="life-room-item"><span>${x.emoji}</span><b>${esc(x.name)}</b><button onclick="OrbitLife.toggleFurniture('${x.id}')">Remove</button></div>`).join('')||'<p class="life-muted">Your room is waiting for its first decoration.</p>'}</div><div class="life-room-note"><h3>🎨 Room themes</h3><p>Current walls: <b>${esc((WALL_THEMES.find(x=>x.id===life.room.wall)||WALL_THEMES[0]).name)}</b><br>Current floor: <b>${esc((FLOOR_THEMES.find(x=>x.id===life.room.floor)||FLOOR_THEMES[0]).name)}</b></p><button class="life-btn" onclick="OrbitLife.setShopTab('room');switchTab('shop')">Open themes & furniture →</button></div><div class="life-room-note"><h3>🧍 Your character</h3><p>Your selected Avatar Studio look appears in your room and on your dashboard.</p><button class="life-btn soft" onclick="switchTab('avatar')">Customise character →</button></div></aside></div></div>`;
  }

  function renderAboutView(){
    const people=[
      {initial:'AM',name:'Arihaan Mahajan',role:'UI Designer — OrbitSchool',colour:'#6478E8',bio:'Arihaan leads the user-interface and visual design of OrbitSchool, shaping the platform’s identity, layouts and overall experience. He designs dashboards, navigation, interactive panels and the visual systems that connect the study tools, AI features and game-inspired world. His aim is to make the platform feel modern, welcoming and easy to use while keeping the learning experience clear and consistent across devices.'},
      {initial:'MM',name:'Manan Mahajan',role:'Creator of Orbiter AI · Contributor to OrbitSchool’s foundation',colour:'#159C93',bio:'Manan designed and developed Orbiter, the AI chatbot integrated into OrbitSchool. Orbiter acts as an in-app study companion where students can ask questions, practise concepts and get explanations of difficult topics. Alongside creating Orbiter, Manan contributed to the thinking and development that brought the platform’s AI-supported learning experience together, helping make study assistance available directly inside OrbitSchool.'},
      {initial:'AS',name:'Aarav Sharma',role:'Creator of AI Vidyalaya · Foundation of SDES GRAM',colour:'#D28B36',bio:'Aarav created the original concept and foundation of AI Vidyalaya, establishing the ideas, thinking and initial direction behind the project. Those concepts and the approach developed through AI Vidyalaya later became an important part of OrbitSchool’s foundation and vision, where they were reimagined and developed further. Aarav also established the base structure of SDES GRAM, creating the starting framework for its school-related section.'},
      {initial:'VS',name:'Virat Sharma',role:'UI Designer — SDES GRAM',colour:'#9A6BD3',bio:'Virat designed the user interface of SDES GRAM, shaping how students see, navigate and interact with the school section. He organised the presentation of its pages and information into a clear, accessible layout, helping students explore school news, view magazine content and find important school information in one place.'}
    ];
    return `<div class="life-page"><section class="life-hero about-hero"><div><div class="life-kicker">THE PEOPLE AND IDEAS BEHIND THE PLATFORM</div><h1>About Us · Credits & Acknowledgements</h1><p>OrbitSchool is a student-developed project shaped by creativity, experimentation and teamwork. Different ideas and contributions have come together to form one learning platform.</p></div></section><section class="life-card about-story"><span class="life-kicker">OUR STORY</span><h2>Different ideas. One shared vision.</h2><p>OrbitSchool brings together study tools, AI-supported learning, creative features and a personalised virtual world. Its development has grown through individual projects and collaboration, with each contributor helping shape a different part of the experience.</p><p>The original thinking behind AI Vidyalaya helped inform OrbitSchool’s direction; Orbiter brought an AI study companion into the app; and SDES GRAM adds a dedicated school information space.</p></section><section class="life-card about-team"><div class="life-section-head"><div><span class="life-kicker">CREDITS</span><h2>Meet the creators</h2><p class="life-muted">Select a card to read about each person's contribution.</p></div></div><div class="life-people-grid">${people.map(p=>`<details class="life-person"><summary><span class="life-person-avatar" style="--person:${p.colour}">${p.initial}</span><b>${p.name}</b><small>${esc(p.role)}</small><span class="life-person-open">View contribution <i>＋</i></span></summary><p>${p.bio}</p></details>`).join('')}</div></section><section class="life-mentor-card"><div class="life-mentor-mark">🎓</div><span class="life-kicker">SPECIAL THANKS · MENTOR & GUIDE</span><h2>Mr. Arvind Mahajan</h2><p>With sincere appreciation for his guidance, encouragement and support throughout the OrbitSchool journey. His mentorship has helped inspire the team, strengthen ideas and keep the project moving forward.</p><span class="life-mentor-signature">A guiding force behind the journey</span></section><section class="life-thanks"><span>✦</span><h2>Built through creativity. Strengthened through collaboration.</h2><p>Thank you to everyone who has contributed ideas, time, testing and effort to OrbitSchool.</p></section></div>`;
  }

  // ---------------------- ORIGINAL BLOCK-STYLE CHARACTER MODEL ----------------------
  const HEX = (v) => Number.parseInt(String(v).replace('#',''),16) || 0xffffff;
  function mat(T,color,roughness=.72,opts={}){return new T.MeshStandardMaterial({color:HEX(color),roughness,metalness:opts.metalness||0,transparent:!!opts.transparent,opacity:opts.opacity??1});}
  function box(T,parent,w,h,d,color,x,y,z,opts={}){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(T,color,opts.roughness??.75,opts));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function sphere(T,parent,r,color,x,y,z,scale=[1,1,1]){const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat(T,color,.46));m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;}
  function buildAvatar(T){
    const a=life.avatar;
    const skin=a.skin||'#F2C6A8';
    const shirt=itemFor('shirts',a.shirt)?.color||'#5B83E8';
    const pants=itemFor('pants',a.pants)?.color||'#344664';
    const hair=itemFor('hairColors',a.hairColor)?.color||'#684637';
    const shoes=itemFor('shoes',a.shoes)?.color||'#F5F7FF';
    const root=new T.Group();
    root.scale.set(.88,.88,.88);
    const limbs=[];

    // Back items are attached first so they sit behind the same classic block body.
    if(a.accessory==='backpack'){
      box(T,root,.62,.78,.28,'#7864C8',0,1.48,-.43);
      box(T,root,.43,.16,.09,'#F6D16A',0,1.72,-.59);
      box(T,root,.36,.23,.08,'#9B8BE3',0,1.35,-.60);
    }
    if(a.accessory==='wings'){
      [-1,1].forEach(side=>box(T,root,.58,.88,.12,'#A99AF3',side*.72,1.56,-.42,{transparent:true,opacity:.88}));
    }

    // Original torso and chest detail.
    box(T,root,1.02,1.08,.62,shirt,0,1.55,0,{roughness:.72});
    box(T,root,.20,.20,.035,'#FFF0B8',0,1.70,.333,{roughness:.35,metalness:.18});
    box(T,root,.22,.19,.24,skin,0,2.10,0);

    // Articulated arms retain the original blocky silhouette and can wave/dance.
    const makeArm=(x,side)=>{
      const pivot=new T.Group();pivot.position.set(x,2.02,0);root.add(pivot);
      box(T,pivot,.34,.66,.40,shirt,0,-.31,0);
      box(T,pivot,.30,.55,.36,skin,0,-.88,0);
      box(T,pivot,.31,.27,.34,skin,0,-1.27,.015);
      limbs.push({part:pivot,type:'arm',side});
      return pivot;
    };
    const leftArm=makeArm(-.69,-1),rightArm=makeArm(.69,1);

    // Separate legs, shaped like the original block avatar.
    if(a.pants==='star_skirt'){
      const skirt=new T.Mesh(new T.CylinderGeometry(.44,.62,.40,8),mat(T,pants));
      skirt.position.set(0,.83,0);skirt.castShadow=true;root.add(skirt);
    }
    const makeLeg=(x,side)=>{
      const pivot=new T.Group();pivot.position.set(x,.98,0);root.add(pivot);
      box(T,pivot,.43,.62,.47,pants,0,-.27,0);
      box(T,pivot,.39,.38,.43,pants,0,-.76,0);
      box(T,pivot,.48,.23,.62,shoes,0,-1.04,.10);
      limbs.push({part:pivot,type:'leg',side});
      return pivot;
    };
    const leftLeg=makeLeg(-.25,-1),rightLeg=makeLeg(.25,1);

    // Oversized square head: the original Orbit block-character proportions.
    const head=new T.Group();head.position.set(0,2.55,0);root.add(head);
    box(T,head,.90,.90,.78,skin,0,0,0);
    box(T,head,.10,.20,.12,skin,-.50,-.02,0);box(T,head,.10,.20,.12,skin,.50,-.02,0);

    // Eyes and expressions.
    const eyeY=.08,eyeZ=.405;
    if(a.face==='wink'){
      sphere(T,head,.09,'#172033',-.20,eyeY,eyeZ,[.86,1.05,.30]);
      box(T,head,.17,.035,.035,'#172033',.20,eyeY,.425);
    }else if(a.face==='sleepy'||a.face==='focused'){
      box(T,head,.17,.035,.04,'#172033',-.20,eyeY,.43);
      box(T,head,.17,.035,.04,'#172033',.20,eyeY,.43);
    }else{
      sphere(T,head,a.face==='surprised'?.095:.085,'#172033',-.20,eyeY,eyeZ,[.86,1.08,.32]);
      sphere(T,head,a.face==='surprised'?.095:.085,'#172033',.20,eyeY,eyeZ,[.86,1.08,.32]);
      sphere(T,head,.028,'#FFFFFF',-.225,.12,.438,[1,1,.35]);sphere(T,head,.028,'#FFFFFF',.175,.12,.438,[1,1,.35]);
    }
    sphere(T,head,.075,'#F39AB7',-.34,-.13,.405,[1,.66,.25]);sphere(T,head,.075,'#F39AB7',.34,-.13,.405,[1,.66,.25]);
    if(a.face==='surprised')sphere(T,head,.062,'#934F5E',0,-.20,.422,[.72,1,.35]);
    else if(a.face==='focused'||a.face==='sleepy')box(T,head,.20,.028,.028,'#914F5A',0,-.20,.43);
    else {const smile=new T.Mesh(new T.TorusGeometry(a.face==='laugh'?.13:.095,.018,7,18,Math.PI),mat(T,'#914F5A'));smile.position.set(0,-.20,.425);smile.rotation.z=Math.PI;head.add(smile);}

    // Hair keeps the block silhouette while supporting all existing hairstyle options.
    box(T,head,.96,.18,.82,hair,0,.46,-.02);
    const lock=(x,y,z,w=.20,h=.38,d=.23)=>box(T,head,w,h,d,hair,x,y,z);
    if(a.hairStyle==='short'){lock(-.34,.40,.12,.28,.25,.25);lock(.12,.44,.12,.30,.23,.25);}
    if(a.hairStyle==='side'){lock(-.35,.39,.12,.28,.27,.25);lock(-.28,.21,.39,.24,.43,.12);}
    if(a.hairStyle==='long'){lock(-.47,.02,-.03,.19,.88,.22);lock(.47,.02,-.03,.19,.88,.22);}
    if(a.hairStyle==='bob'){lock(-.47,.06,.02,.22,.62,.25);lock(.47,.06,.02,.22,.62,.25);lock(0,.37,.25,.78,.16,.20);}
    if(a.hairStyle==='bun'){sphere(T,head,.22,hair,0,.70,-.22);lock(-.42,.05,-.02,.18,.56,.20);lock(.42,.05,-.02,.18,.56,.20);}
    if(a.hairStyle==='twin'){[-1,1].forEach(side=>{lock(side*.48,.02,-.02,.20,.58,.22);sphere(T,head,.19,hair,side*.54,.34,-.14);});}
    if(a.hairStyle==='curly'){[-.40,-.20,0,.20,.40].forEach((x,i)=>sphere(T,head,.15,hair,x,.55+(i%2)*.06,.12));lock(-.49,-.02,-.02,.19,.66,.22);lock(.49,-.02,-.02,.19,.66,.22);}
    if(a.hairStyle==='ponytail'){lock(.46,.02,-.20,.20,.64,.24);sphere(T,head,.17,hair,.56,-.07,-.28);}
    if(a.hairStyle==='spiky'){[-.38,-.19,0,.19,.38].forEach((x,i)=>{const cone=new T.Mesh(new T.ConeGeometry(.13,.34,5),mat(T,hair));cone.position.set(x,.64+(i%2)*.04,.08);cone.rotation.z=(i-2)*.13;head.add(cone);});}
    if(a.hairStyle==='braids'){[-1,1].forEach(side=>{lock(side*.49,.02,-.02,.18,.62,.20);for(let i=0;i<3;i++)sphere(T,head,.105,hair,side*.49,-.12-i*.17,.04);});}

    // Headwear uses the same square head and remains independently visible.
    if(a.hat==='cap'){box(T,head,.94,.14,.82,'#526DE0',0,.56,.02);box(T,head,.62,.08,.46,'#718DF2',0,.50,.34);}
    if(a.hat==='beanie'){box(T,head,1.0,.25,.85,'#77B8C9',0,.60,-.02);sphere(T,head,.11,'#EAFBFF',0,.77,0);}
    if(a.hat==='starband'){box(T,head,1.04,.09,.90,'#E6B9E7',0,.55,.01);sphere(T,head,.12,'#F7D66D',0,.67,.31);}
    if(a.hat==='bow'){sphere(T,head,.13,'#EF83AE',-.36,.58,.18,[1,.7,.7]);sphere(T,head,.13,'#EF83AE',-.18,.58,.18,[1,.7,.7]);sphere(T,head,.07,'#F7D66D',-.27,.58,.20);}
    if(a.hat==='headphones'){[-1,1].forEach(side=>{const cup=new T.Mesh(new T.TorusGeometry(.19,.055,8,18),mat(T,'#353D69'));cup.position.set(side*.56,.15,0);head.add(cup);box(T,head,.15,.24,.16,'#7B8CF4',side*.56,.15,.04);});}
    if(a.hat==='flower'){for(let i=0;i<5;i++)sphere(T,head,.10,i%2?'#FFD66B':'#F18DB7',Math.cos(i/5*Math.PI*2)*.40,.60,Math.sin(i/5*Math.PI*2)*.28);}
    if(a.hat==='crown'){[-.27,-.09,.09,.27].forEach(x=>{const c=new T.Mesh(new T.ConeGeometry(.09,.28,4),mat(T,'#F5C85D'));c.position.set(x,.70,.02);head.add(c);});box(T,head,.70,.09,.18,'#C99B2E',0,.57,.02);}
    if(a.hat==='helmet'){const cap=new T.Mesh(new T.SphereGeometry(.58,18,14,0,Math.PI*2,0,Math.PI*.52),new T.MeshStandardMaterial({color:0xA9E4F4,transparent:true,opacity:.42,roughness:.18}));cap.position.y=.24;head.add(cap);}

    // Wearable accessories.
    if(a.accessory==='scarf')box(T,root,.88,.17,.70,'#5BC7BE',0,2.04,.06);
    if(a.accessory==='necklace')sphere(T,root,.09,'#F4D16C',0,1.35,.34,[.7,1.1,.5]);
    if(a.accessory==='watch'){box(T,root,.18,.13,.30,'#39466C',.70,1.05,.12);box(T,root,.10,.08,.025,'#F5D878',.70,1.05,.28);}
    if(a.accessory==='glasses'){[-1,1].forEach(side=>{const frame=mat(T,'#26334F');const lens=box(T,head,.34,.18,.06,'#79D7F0',side*.20,.07,.47,{transparent:true,opacity:.58});box(T,head,.38,.045,.085,'#26334F',side*.20,.18,.47);box(T,head,.045,.23,.08,'#26334F',side*.38,.07,.47);});box(T,head,.12,.04,.07,'#26334F',0,.10,.48);}
    if(a.accessory==='badge')sphere(T,root,.105,'#FFD56A',.30,1.68,.34);
    if(a.accessory==='backpack'){/* backpack already placed behind torso */}
    if(a.accessory==='wings'){/* wings already placed behind torso */}

    root.userData={head,limbs,body:root,style:a.style||'boy'};
    return root;
  }
  function cleanupRuntime(){
    if(!runtime)return;
    cancelAnimationFrame(runtime.raf||0);runtime.resize?.disconnect();runtime.resize?.disconnect?.();
    runtime.renderer?.dispose?.();runtime.renderer?.forceContextLoss?.();
    runtime.scene?.traverse?.(o=>{o.geometry?.dispose?.();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose?.());});
    runtime=null;
  }
  function mountThree(canvas,stage,scene,camera,kind,model){
    const T=window.THREE;if(!T){mountCanvasFallback(canvas,stage,kind);return;}
    let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch(_){mountCanvasFallback(canvas,stage,kind);return;}
    const width=Math.max(300,stage.clientWidth),height=Math.max(320,stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(width,height,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    scene.add(new T.HemisphereLight(0xE8F4FF,0x59627C,1.8));const key=new T.DirectionalLight(0xFFF1D9,2.0);key.position.set(-4,7,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
    const rt={renderer,scene,camera,model,canvas,stage,kind,raf:0,resize:null,last:0,drag:null,yaw:kind==='room'?.55:0,zoom:0,action:'',actionUntil:0};
    rt.resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(runtime!==rt)return;const w=Math.max(300,stage.clientWidth),h=Math.max(320,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}):null;rt.resize?.observe(stage);
    canvas.addEventListener('pointerdown',e=>{rt.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(rt.drag){rt.yaw+=(e.clientX-rt.drag.x)*.008;rt.zoom=Math.max(-1.2,Math.min(1.5,rt.zoom+(e.clientY-rt.drag.y)*-.006));rt.drag={x:e.clientX,y:e.clientY};}});
    canvas.addEventListener('pointerup',()=>rt.drag=null);canvas.addEventListener('pointercancel',()=>rt.drag=null);
    canvas.addEventListener('wheel',e=>{if(kind==='room'||kind==='avatar'){e.preventDefault();rt.zoom=Math.max(-1.8,Math.min(2.4,rt.zoom+e.deltaY*.002));}},{passive:false});
    canvas.addEventListener('dblclick',()=>{rt.yaw=0;rt.zoom=0;});
    runtime=rt;
    const loop=t=>{
      if(runtime!==rt)return;rt.raf=requestAnimationFrame(loop);const dt=Math.min(.05,(t-rt.last||16)/1000);rt.last=t;
      if(kind==='avatar'&&model){model.rotation.y=rt.yaw+Math.sin(t*.0005)*.025;model.position.y=Math.sin(t*.002)*.035;animateModel(model,t,rt.action,rt.actionUntil);camera.position.z=8.4-rt.zoom;camera.lookAt(0,1.55,0);}
      if(kind==='room'){
        if(rt.model?.avatar){rt.model.avatar.rotation.y=Math.sin(t*.00045)*.05;animateModel(rt.model.avatar,t,'',0);}
        if(rt.cameraTarget){const radius=8.4+rt.zoom;rt.camera.position.x=Math.sin(rt.yaw)*radius;rt.camera.position.z=Math.cos(rt.yaw)*radius;rt.camera.lookAt(rt.cameraTarget.x,rt.cameraTarget.y,rt.cameraTarget.z);}
      }
      renderer.render(scene,camera);
    };rt.raf=requestAnimationFrame(loop);
  }
  function animateModel(model,t,action,actionUntil){const act=Date.now()<actionUntil?action:'';for(const l of model.userData.limbs||[]){if(l.type==='arm'){l.part.rotation.z=act==='wave'&&l.side===1?2.1+Math.sin(t*.018)*.18:act==='dance'?Math.sin(t*.014+l.side)*.7:Math.sin(t*.002+l.side)*.025;}else l.part.rotation.x=act==='dance'?Math.sin(t*.014+l.side)*.25:0;}}

  function sceneBase(T,background=0x1B2850){const scene=new T.Scene();scene.background=new T.Color(background);scene.fog=new T.Fog(background,15,34);return scene;}
  function mountAvatar(){const canvas=$('life-avatar-canvas'),stage=$('life-avatar-stage');if(!canvas||!stage)return;const T=window.THREE;
    if(window.OrbitBlocky&&OrbitBlocky.mountPreview){OrbitBlocky.mountPreview(canvas,stage);return;}
    if(!T){mountCanvasFallback(canvas,stage,'avatar');return;}
    const scene=sceneBase(T,0xD9E7FF),camera=new T.PerspectiveCamera(36,stage.clientWidth/Math.max(1,stage.clientHeight),.1,50);camera.position.set(0,2.55,8.4);camera.lookAt(0,1.55,0);
    const model=buildAvatar(T);scene.add(model);const disc=new T.Mesh(new T.CylinderGeometry(1.6,1.7,.12,48),mat(T,'#A7BDEB'));disc.position.y=-.12;scene.add(disc);const ring=new T.Mesh(new T.TorusGeometry(1.7,.035,8,60),mat(T,'#7C83ED'));ring.rotation.x=Math.PI/2;ring.position.y=-.04;scene.add(ring);
    mountThree(canvas,stage,scene,camera,'avatar',model);
  }
  function addPlant(T,scene,x,z){const pot=new T.Mesh(new T.CylinderGeometry(.28,.22,.45,12),mat(T,'#C97D5F'));pot.position.set(x,.25,z);scene.add(pot);[-1,0,1].forEach((s,i)=>{const leaf=new T.Mesh(new T.ConeGeometry(.19,.82,7),mat(T,['#61B98C','#76D19C','#4A9A77'][i]));leaf.position.set(x+s*.16,.8,z);leaf.rotation.z=-s*.3;scene.add(leaf);});}
  function addBookShelf(T,scene,x,z){for(let y=.65;y<2.2;y+=.67){box(T,scene,1.05,.12,.48,'#845B49',x,y,z);for(let i=0;i<4;i++){const colors=['#E77C8F','#779DD9','#E8C36E','#7DC6A0'];const b=box(T,scene,.15,.42,.33,colors[(i+Math.floor(y))%4],x-.37+i*.24,y+.27,z);b.rotation.z=(i%2?-.06:.04);}}box(T,scene,1.18,2.35,.58,'#805640',x,1.17,z,{roughness:.9});box(T,scene,1.0,2.12,.06,'#B07D59',x,1.18,z+.31);}
  function mountRoom(){const canvas=$('life-room-canvas'),stage=$('life-room-stage');if(!canvas||!stage)return;const T=window.THREE;if(!T){mountCanvasFallback(canvas,stage,'room');return;}
    const scene=sceneBase(T,0x1B2446),camera=new T.PerspectiveCamera(43,stage.clientWidth/Math.max(1,stage.clientHeight),.1,70);camera.position.set(5.4,4.8,8.6);const target=new T.Vector3(0,1.45,0);camera.lookAt(target);
    const wall=(WALL_THEMES.find(x=>x.id===life.room.wall)||WALL_THEMES[0]).color;
    const floor=(FLOOR_THEMES.find(x=>x.id===life.room.floor)||FLOOR_THEMES[0]).color;
    box(T,scene,10,.22,8,floor,0,-.12,0);box(T,scene,10,5.2,.24,wall,0,2.48,-4);box(T,scene,.24,5.2,8,wall,-5,2.48,0);
    // Subtle floor planks, baseboards and room trim make the interior feel like a finished game space.
    for(let z=-3.4;z<=3.2;z+=.82)box(T,scene,9.8,.018,.025,'#D8C9B8',0,.01,z,{roughness:.95});
    box(T,scene,9.85,.16,.12,'#D8C7B1',0,.16,-3.82);box(T,scene,.12,.16,7.85,'#D8C7B1',-4.83,.16,0);
    box(T,scene,9.9,.12,.18,'#E6D9C8',0,5.08,-3.82);
    // Window and moonlit view.
    box(T,scene,2.0,1.75,.12,'#E6D9BB',-2.7,3.0,-3.83);box(T,scene,1.72,1.48,.05,'#6C9FCA',-2.7,3.0,-3.72);box(T,scene,.09,1.48,.07,'#E8E1D0',-2.7,3,-3.66);box(T,scene,1.72,.08,.07,'#E8E1D0',-2.7,3,-3.66);
    sphere(T,scene,.34,'#F6E2A5',-3.22,3.38,-3.61);for(let i=0;i<8;i++)sphere(T,scene,.035,'#FFFFFF',-3.9+(i%4)*.42,2.55+Math.floor(i/4)*.6,-3.6);
    // Layered curtains and floating planet silhouettes beyond the window.
    box(T,scene,.18,2.0,.14,'#8A78B4',-3.72,3.0,-3.75);box(T,scene,.18,2.0,.14,'#8A78B4',-1.68,3.0,-3.75);
    sphere(T,scene,.23,'#D78C82',-2.15,2.74,-3.56);sphere(T,scene,.12,'#8EB9DA',-3.82,2.64,-3.55);
    const clock=new T.Mesh(new T.CylinderGeometry(.3,.3,.07,24),mat(T,'#E9D6B2'));clock.rotation.x=Math.PI/2;clock.position.set(.25,3.3,-3.82);scene.add(clock);box(T,scene,.035,.18,.02,'#414B69',.25,3.36,-3.75);box(T,scene,.14,.025,.02,'#414B69',.31,3.3,-3.75);
    // Door at the right wall.
    box(T,scene,.12,2.35,1.25,'#795541',4.8,1.15,-1.95);sphere(T,scene,.055,'#F5CF6B',4.68,1.12,-1.7);
    const decor=new Set(life.room.decor);
    if(decor.has('rug')){const rug=new T.Mesh(new T.CylinderGeometry(2.0,2.0,.06,48),mat(T,'#7C70C5'));rug.scale.z=.75;rug.position.set(0,.02,.8);scene.add(rug);const r2=new T.Mesh(new T.TorusGeometry(1.35,.035,6,48),mat(T,'#EBCB85'));r2.rotation.x=Math.PI/2;r2.position.set(0,.07,.8);scene.add(r2);}
    if(decor.has('desk')){
      box(T,scene,2.45,.16,.95,'#A97855',1.55,1.2,-2.55);[-1,1].forEach(x=>[-1,1].forEach(z=>box(T,scene,.13,1.15,.13,'#79543F',1.55+x*1.02,.57,-2.55+z*.37)));
      box(T,scene,.92,.67,.12,'#2D395A',1.52,1.72,-2.88);box(T,scene,.82,.55,.06,'#6CC4D5',1.52,1.72,-2.79);box(T,scene,.3,.11,.55,'#3C486B',1.52,1.32,-2.55);
      box(T,scene,.38,.08,.18,'#343C59',.68,1.31,-2.5);for(let i=0;i<3;i++)box(T,scene,.22,.06,.32,['#E8C777','#C97E8B','#7DAED6'][i],2.1,1.32,-2.42+i*.12);
      if(decor.has('lamp')){const stem=new T.Mesh(new T.CylinderGeometry(.045,.06,.72,10),mat(T,'#D1B76F'));stem.position.set(2.5,1.62,-2.6);scene.add(stem);const shade=new T.Mesh(new T.ConeGeometry(.3,.36,12,1,true),mat(T,'#F2D78B'));shade.position.set(2.5,2.12,-2.6);scene.add(shade);const light=new T.PointLight(0xFFD98D,1.1,4);light.position.set(2.5,2.2,-2.6);scene.add(light);}
    }
    if(decor.has('bed')){box(T,scene,2.1,.62,2.25,'#7B5F80',-2.75,.36,-1.35);box(T,scene,2.08,.26,2.18,'#A9C1E8',-2.75,.76,-1.35);box(T,scene,.75,.2,.52,'#F0E6F1',-3.3,.92,-2.05);box(T,scene,1.98,.12,1.12,'#879BDD',-2.75,.93,-.85);box(T,scene,.12,1.45,2.35,'#805F54',-3.82,.8,-1.35);}
    if(decor.has('shelf'))addBookShelf(T,scene,3.8,-3.35);
    if(decor.has('plant'))addPlant(T,scene,4.0,.35);
    if(decor.has('aquarium')){box(T,scene,1.0,.78,.48,'#557D9B',-4,1.5,1.9,{transparent:true,opacity:.5});for(let i=0;i<3;i++)sphere(T,scene,.08,['#F8C96D','#EF8F9E','#7CDAE2'][i],-4.2+i*.2,1.45+(i%2)*.2,2.2);}
    if(decor.has('projector')){const orb=sphere(T,scene,.2,'#B4A4F4',-.25,2.45,-3.7);const glow=new T.PointLight(0x9C8AFF,.8,5);glow.position.copy(orb.position);scene.add(glow);}
    if(decor.has('trophyshelf')){box(T,scene,1.15,.14,.42,'#A77B44',.4,2.45,-3.65);for(let i=0;i<3;i++){const cup=new T.Mesh(new T.CylinderGeometry(.09,.15,.28,8),mat(T,'#F0C95D'));cup.position.set(.05+i*.35,2.68,-3.61);scene.add(cup);}}
    if(decor.has('window')){box(T,scene,2.3,2.0,.08,'#D7E2F7',1.8,3.3,-3.77);box(T,scene,2.0,1.7,.04,'#557EA8',1.8,3.3,-3.69);}
    if(decor.has('guitar')){box(T,scene,.32,.85,.16,'#C58B51',-4.2,.8,-.15);sphere(T,scene,.25,'#DDA05D',-4.2,1.0,-.15);}
    if(decor.has('beanbag')){const bean=new T.Mesh(new T.SphereGeometry(.62,16,12),mat(T,'#9A78CE'));bean.scale.set(1,.72,1);bean.position.set(3.35,.5,1.8);scene.add(bean);}
    if(decor.has('wallart')){box(T,scene,1.2,.9,.1,'#D7C28E',-.2,2.65,-3.78);box(T,scene,1.0,.7,.05,'#445E9D',-.2,2.65,-3.7);sphere(T,scene,.18,'#EACF7D',-.2,2.65,-3.62);}
    if(decor.has('gamingchair')){box(T,scene,.92,.95,.72,'#5B68B2',.15,.75,.95);box(T,scene,.78,.18,.62,'#3E4B8C',.15,.28,.98);box(T,scene,.16,.62,.16,'#707CA3',.15,.02,.98);}
    if(decor.has('ceilingstars')){for(let i=0;i<22;i++){const star=sphere(T,scene,.045,'#F9E9A8',-4.25+(i*41%86)/10,4.65+(i%3)*.13,-3.55+(i%4)*.8);star.userData.twinkle=i;}}
    if(decor.has('planetmobile')){const pole=new T.Mesh(new T.CylinderGeometry(.025,.025,.85,8),mat(T,'#D6C38E'));pole.position.set(2.8,4.38,-2.4);scene.add(pole);[[0,'#7DB8D8'],[.38,'#E5A17E'],[-.38,'#A58BDA']].forEach(([offset,color],i)=>sphere(T,scene,.22,color,2.8+offset,3.92-(i%2)*.24,-2.4));}
    if(decor.has('windowseat')){box(T,scene,1.7,.38,.68,'#9C789F',-2.55,1.1,-2.1);box(T,scene,1.55,.16,.58,'#E4BBD2',-2.55,1.34,-2.1);}
    // A seated-looking avatar at the study corner.
    const chair=box(T,scene,.64,.72,.55,'#5669A8',-.65,.55,.75);chair.position.set(-.65,.55,.75);
    box(T,scene,.56,.15,.5,'#7B8BC1',-.65,.97,.75);
    const avatar=buildAvatar(T);avatar.scale.setScalar(.58);avatar.position.set(-.82,0,1.02);avatar.rotation.y=-.35;scene.add(avatar);
    // Soft warm room lamp and floating star specks.
    const ambient=new T.PointLight(0x9BBAFF,.55,10);ambient.position.set(-1.2,3.6,1.2);scene.add(ambient);
    for(let i=0;i<15;i++)sphere(T,scene,.025,'#F4E9B6',-4.2+(i*37%84)/10,.9+(i*19%35)/10,-3.4+(i%3)*.25);
    mountThree(canvas,stage,scene,camera,'room',{avatar,cameraTarget:target});
    if(runtime&&!roomLightsOn)runtime.scene.traverse(o=>{if(o.isPointLight)o.visible=false;});
  }

  function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function drawCanvasCharacter(ctx,cx,baseY,s,t,action=''){
    const a=life.avatar,shirt=itemFor('shirts',a.shirt)?.color||'#5B83E8',pants=itemFor('pants',a.pants)?.color||'#344664',hair=itemFor('hairColors',a.hairColor)?.color||'#684637',skin=a.skin||'#F2C6A8',shoe=itemFor('shoes',a.shoes)?.color||'#F5F7FF';
    const wave=action==='wave'?Math.sin(t*.018)*.35:action==='dance'?Math.sin(t*.014)*.20:Math.sin(t*.002)*.015;
    const step=action==='dance'?Math.sin(t*.012)*5:0;
    ctx.save();
    ctx.fillStyle='rgba(21,35,70,.22)';ctx.beginPath();ctx.ellipse(cx,baseY+6*s,60*s,13*s,0,0,Math.PI*2);ctx.fill();
    // Backpack/wings sit behind the original rectangular torso.
    if(a.accessory==='backpack'){ctx.fillStyle='#7864C8';ctx.fillRect(cx-19*s,baseY-153*s,38*s,79*s);ctx.fillStyle='#F6D16A';ctx.fillRect(cx-13*s,baseY-139*s,26*s,10*s);}
    if(a.accessory==='wings'){ctx.fillStyle='#BCAAF5';ctx.globalAlpha=.9;ctx.fillRect(cx-83*s,baseY-158*s,22*s,82*s);ctx.fillRect(cx+61*s,baseY-158*s,22*s,82*s);ctx.globalAlpha=1;}
    // Legs and shoes, in the original block-character proportions.
    ctx.fillStyle=pants;
    if(a.pants==='star_skirt'){ctx.beginPath();ctx.moveTo(cx-43*s,baseY-94*s);ctx.lineTo(cx+43*s,baseY-94*s);ctx.lineTo(cx+35*s,baseY-61*s);ctx.lineTo(cx-35*s,baseY-61*s);ctx.closePath();ctx.fill();}
    ctx.fillRect(cx-29*s,baseY-78*s-step,25*s,62*s);ctx.fillRect(cx+4*s,baseY-78*s+step,25*s,62*s);
    ctx.fillStyle=shoe;ctx.fillRect(cx-33*s,baseY-17*s-step,32*s,17*s);ctx.fillRect(cx+2*s,baseY-17*s+step,32*s,17*s);
    // Torso and separate arms.
    ctx.fillStyle=shirt;ctx.fillRect(cx-44*s,baseY-163*s,88*s,91*s);
    ctx.save();ctx.translate(cx-61*s,baseY-158*s);ctx.fillRect(-10*s,0,22*s,66*s);ctx.fillStyle=skin;ctx.fillRect(-10*s,62*s,22*s,20*s);ctx.restore();
    ctx.save();ctx.translate(cx+61*s,baseY-158*s);ctx.rotate(wave);ctx.fillStyle=shirt;ctx.fillRect(-12*s,0,24*s,66*s);ctx.fillStyle=skin;ctx.fillRect(-11*s,62*s,22*s,20*s);ctx.restore();
    ctx.fillStyle=skin;ctx.fillRect(cx-10*s,baseY-176*s,20*s,17*s);
    if(a.accessory==='scarf'){ctx.fillStyle='#5BC7BE';ctx.fillRect(cx-29*s,baseY-176*s,58*s,13*s);ctx.fillRect(cx+17*s,baseY-168*s,11*s,30*s);}
    if(a.accessory==='badge'){ctx.fillStyle='#FFD56A';ctx.beginPath();ctx.arc(cx+27*s,baseY-137*s,7*s,0,Math.PI*2);ctx.fill();}
    // Large square head, matching the 3D Avatar Studio model.
    ctx.save();ctx.translate(cx,baseY-255*s);
    ctx.fillStyle=skin;ctx.fillRect(-49*s,0,98*s,94*s);
    // Hair silhouette and styles.
    ctx.fillStyle=hair;ctx.fillRect(-52*s,-9*s,104*s,22*s);
    if(['long','ponytail','braids','twin','bun','bob','curly'].includes(a.hairStyle)){ctx.fillRect(-52*s,8*s,16*s,77*s);ctx.fillRect(36*s,8*s,16*s,77*s);}
    if(a.hairStyle==='side')ctx.fillRect(-34*s,10*s,25*s,34*s);
    if(a.hairStyle==='bob')ctx.fillRect(-47*s,68*s,94*s,18*s);
    if(a.hairStyle==='bun'){ctx.beginPath();ctx.arc(0,-5*s,13*s,0,Math.PI*2);ctx.fill();}
    if(a.hairStyle==='twin'){[-1,1].forEach(side=>{ctx.beginPath();ctx.arc(side*50*s,22*s,12*s,0,Math.PI*2);ctx.fill();});}
    if(a.hairStyle==='curly'){[-34,-17,0,17,34].forEach((x,i)=>{ctx.beginPath();ctx.arc(x*s,2*s+(i%2)*4*s,11*s,0,Math.PI*2);ctx.fill();});}
    if(a.hairStyle==='spiky'){[-32,-15,2,19,36].forEach(x=>{ctx.beginPath();ctx.moveTo(x*s,0);ctx.lineTo((x+7)*s,-20*s);ctx.lineTo((x+15)*s,0);ctx.fill();});}
    if(a.hairStyle==='ponytail'){ctx.fillRect(42*s,16*s,13*s,52*s);}
    if(a.hairStyle==='braids'){[-1,1].forEach(side=>{for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(side*48*s,(25+i*17)*s,7*s,0,Math.PI*2);ctx.fill();}});}
    // Expression.
    ctx.fillStyle='#253047';
    if(a.face==='sleepy'||a.face==='focused'){ctx.fillRect(-27*s,39*s,17*s,3*s);ctx.fillRect(10*s,39*s,17*s,3*s);}
    else if(a.face==='wink'){ctx.beginPath();ctx.arc(-18*s,39*s,5*s,0,Math.PI*2);ctx.fill();ctx.fillRect(10*s,39*s,17*s,3*s);}
    else{ctx.beginPath();ctx.arc(-18*s,39*s,a.face==='surprised'?6*s:5*s,0,Math.PI*2);ctx.arc(18*s,39*s,a.face==='surprised'?6*s:5*s,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#F39AB7';ctx.beginPath();ctx.arc(-34*s,57*s,6*s,0,Math.PI*2);ctx.arc(34*s,57*s,6*s,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#914F5A';ctx.lineWidth=2.5*s;ctx.beginPath();
    if(a.face==='surprised'){ctx.ellipse(0,66*s,5*s,7*s,0,0,Math.PI*2);ctx.stroke();}
    else if(a.face==='focused'||a.face==='sleepy'){ctx.moveTo(-8*s,66*s);ctx.lineTo(8*s,66*s);ctx.stroke();}
    else{ctx.arc(0,59*s,10*s,.15,Math.PI-.15);ctx.stroke();}
    // Selected headwear.
    if(a.hat==='cap'){ctx.fillStyle='#596EDB';ctx.fillRect(-48*s,-16*s,96*s,13*s);ctx.fillRect(-28*s,-25*s,58*s,12*s);}
    if(a.hat==='crown'){ctx.fillStyle='#F3C557';ctx.fillRect(-31*s,-19*s,62*s,9*s);[-22,0,22].forEach(x=>{ctx.beginPath();ctx.moveTo(x*s,-19*s);ctx.lineTo((x-5)*s,-36*s);ctx.lineTo((x+5)*s,-36*s);ctx.fill();});}
    if(a.hat==='beanie'){ctx.fillStyle='#77B8C9';ctx.fillRect(-51*s,-19*s,102*s,20*s);ctx.beginPath();ctx.arc(0,-18*s,9*s,0,Math.PI*2);ctx.fill();}
    if(a.hat==='starband'){ctx.fillStyle='#E6B9E7';ctx.fillRect(-52*s,-4*s,104*s,8*s);ctx.fillStyle='#F7D66D';ctx.fillRect(-6*s,-17*s,12*s,12*s);}
    if(a.hat==='bow'){ctx.fillStyle='#EF83AE';ctx.fillRect(-47*s,-14*s,15*s,12*s);ctx.fillRect(-33*s,-14*s,15*s,12*s);}
    if(a.hat==='headphones'){ctx.strokeStyle='#353D69';ctx.lineWidth=7*s;ctx.beginPath();ctx.arc(0,17*s,53*s,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle='#7B8CF4';ctx.fillRect(-56*s,13*s,11*s,27*s);ctx.fillRect(45*s,13*s,11*s,27*s);}
    if(a.hat==='flower'){ctx.fillStyle='#F18DB7';[-18,0,18].forEach(x=>{ctx.beginPath();ctx.arc(x*s,-4*s,7*s,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#FFD66B';ctx.fillRect(-3*s,-8*s,7*s,7*s);}
    if(a.hat==='helmet'){ctx.fillStyle='rgba(169,228,244,.52)';ctx.strokeStyle='#9BDDED';ctx.lineWidth=3*s;ctx.beginPath();ctx.arc(0,22*s,54*s,Math.PI,Math.PI*2);ctx.fill();ctx.stroke();}
    if(a.accessory==='glasses'){ctx.strokeStyle='#26334F';ctx.lineWidth=3*s;ctx.strokeRect(-34*s,31*s,27*s,18*s);ctx.strokeRect(7*s,31*s,27*s,18*s);ctx.beginPath();ctx.moveTo(-7*s,39*s);ctx.lineTo(7*s,39*s);ctx.stroke();}
    ctx.restore();ctx.restore();
  }
  function mountCanvasFallback(canvas,stage,kind){const ctx=canvas.getContext('2d');if(!ctx){stage.insertAdjacentHTML('beforeend','<p class="life-muted">This browser cannot create a canvas preview.</p>');return;}const rt={canvas,stage,ctx,kind,raf:0,width:0,height:0,resize:null,last:0,yaw:0,drag:null,action:'',actionUntil:0};const resize=()=>{const w=Math.max(300,stage.clientWidth),h=Math.max(320,stage.clientHeight),d=Math.min(devicePixelRatio||1,1.5);rt.width=w;rt.height=h;canvas.width=w*d;canvas.height=h*d;canvas.style.width='100%';canvas.style.height='100%';ctx.setTransform(d,0,0,d,0,0);};resize();if(typeof ResizeObserver!=='undefined'){rt.resize=new ResizeObserver(resize);rt.resize.observe(stage);}canvas.addEventListener('pointerdown',e=>{rt.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(rt.drag){rt.yaw+=(e.clientX-rt.drag.x)*.01;rt.drag={x:e.clientX,y:e.clientY};}});canvas.addEventListener('pointerup',()=>rt.drag=null);canvas.addEventListener('pointercancel',()=>rt.drag=null);runtime=rt;const loop=t=>{if(runtime!==rt)return;rt.raf=requestAnimationFrame(loop);drawFallback(rt,t);};rt.raf=requestAnimationFrame(loop);}
  function drawFallback(rt,t){const {ctx,w}= {ctx:rt.ctx,w:rt.width},W=rt.width,H=rt.height;ctx.clearRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,rt.kind==='room'?'#26365C':'#DDEAFF');g.addColorStop(1,rt.kind==='room'?'#111A31':'#91B5E7');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<30;i++){ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc((i*83)%W,(i*47)%H,1.5,0,Math.PI*2);ctx.fill();}
    if(rt.kind==='avatar'){ctx.fillStyle='rgba(65,91,151,.18)';ctx.beginPath();ctx.ellipse(W*.5,H*.84,W*.25,13,0,0,Math.PI*2);ctx.fill();drawCanvasCharacter(ctx,W*.5,H*.84,Math.min(1.05,H/480),t,rt.action);}
    if(rt.kind==='room'){
      ctx.fillStyle='#697BAA';ctx.beginPath();ctx.moveTo(W*.08,H*.52);ctx.lineTo(W*.88,H*.44);ctx.lineTo(W*.95,H*.84);ctx.lineTo(W*.08,H*.94);ctx.closePath();ctx.fill();ctx.fillStyle='#4A587D';ctx.fillRect(W*.08,H*.18,W*.8,H*.35);ctx.fillStyle='#8FBADB';ctx.fillRect(W*.17,H*.23,W*.2,H*.18);ctx.strokeStyle='#EADFC8';ctx.lineWidth=6;ctx.strokeRect(W*.17,H*.23,W*.2,H*.18);
      // Bed, desk, monitor and shelf are visibly drawn in the fallback too.
      ctx.fillStyle='#7A5C72';ctx.fillRect(W*.13,H*.57,W*.25,H*.18);ctx.fillStyle='#AEC8E8';ctx.fillRect(W*.14,H*.54,W*.23,H*.07);ctx.fillStyle='#A77A55';ctx.fillRect(W*.53,H*.55,W*.3,H*.05);ctx.fillRect(W*.56,H*.60,W*.025,H*.2);ctx.fillRect(W*.78,H*.60,W*.025,H*.2);ctx.fillStyle='#202A48';ctx.fillRect(W*.63,H*.39,W*.12,H*.15);ctx.fillStyle='#75C4D8';ctx.fillRect(W*.64,H*.4,W*.1,H*.12);ctx.fillStyle='#805740';ctx.fillRect(W*.81,H*.31,W*.09,H*.32);ctx.fillStyle='#D28E63';ctx.fillRect(W*.84,H*.37,W*.04,H*.025);ctx.fillStyle='#8FD1AE';ctx.beginPath();ctx.arc(W*.9,H*.52,17,0,Math.PI*2);ctx.fill();drawCanvasCharacter(ctx,W*.42,H*.82,.58,t,'');
    }
  }

  function setCategory(id){avatarCategory=id;renderCurrentView();}
  function setShopTab(id){shopTab=id==='room'?'room':'wardrobe';life.shopTab=shopTab;write();if(state?.activeTab==='shop')renderCurrentView();}
  function buyRoomStyle(group,id){const item=itemFor(group,id);if(!item)return;if(isOwned(group,id)){life.room[group==='wallThemes'?'wall':'floor']=id;write();toast(`${item.name} applied to your room.`,'🎨');renderCurrentView();return;}if(levelNow()<item.level){toast(`${item.name} unlocks at Level ${item.level}.`,'🔒');return;}if(!spend(item.price))return;life.owned[group].push(id);life.room[group==='wallThemes'?'wall':'floor']=id;write();toast(`${item.name} unlocked and applied!`,'🏡');renderCurrentView();}
  function goShop(group){shopTab=group==='furniture'||group==='room'?'room':'wardrobe';life.shopTab=shopTab;write();switchTab('shop');}
  function showRoom(){worldSub='room';life.worldSub='room';write();switchTab('orbitworld');}
  function showExplore(){worldSub='explore';life.worldSub='explore';write();switchTab('orbitworld');}
  function roomEmote(action){if(runtime){runtime.action=action;runtime.actionUntil=Date.now()+1500;}toast(action==='wave'?'Your avatar waved hello!':'Your avatar celebrated!','🎉');}
  let roomLightsOn=true;
  function toggleLights(){roomLightsOn=!roomLightsOn;toast(roomLightsOn?'Room lights switched on.':'Room lights dimmed.','💡');if(runtime?.scene){runtime.scene.traverse(o=>{if(o.isPointLight)o.visible=roomLightsOn;});}}
  function emote(action){if(runtime){runtime.action=action;runtime.actionUntil=Date.now()+1700;}toast(action==='wave'?'Your character waved hello!':'Your character is celebrating!','✨');}
  function randomLook(){const pick=(group)=>life.owned[group][Math.floor(Math.random()*life.owned[group].length)]||DEFAULT.avatar[{shirts:'shirt',pants:'pants',hairStyles:'hairStyle'}[group]];life.avatar.shirt=pick('shirts');life.avatar.pants=pick('pants');life.avatar.hairStyle=pick('hairStyles');life.avatar.hairColor=pick('hairColors');life.avatar.hat=pick('hats');life.avatar.accessory=pick('accessories');life.avatar.face=pick('faces');life.avatar.shoes=pick('shoes');write();updateHeader();renderCurrentView();}
  function saveLook(){if(life.savedLooks.length>=10){toast('Your 10 saved looks are full. Remove an older look first.','👕');return;}const copy={...life.avatar,name:`Look ${life.savedLooks.length+1}`};life.savedLooks.unshift(copy);write();toast('Outfit saved to your wardrobe!','💾');renderCurrentView();}
  function loadLook(i){const item=life.savedLooks[i];if(!item)return;life.avatar={...life.avatar,...item};write();updateHeader();renderCurrentView();}
  function setWorldSub(id){worldSub=id==='room'?'room':'explore';life.worldSub=worldSub;write();renderCurrentView();}
  function mountPage(tab){window.OrbitNext?.disposeWorld?.();cleanupRuntime();const main=$('main-view');if(!main)return;
    if(tab==='avatar'){main.innerHTML=renderAvatarView();requestAnimationFrame(mountAvatar);}
    else if(tab==='shop'){main.innerHTML=renderMarketplace();}
    else if(tab==='orbitworld'&&worldSub==='room'){main.innerHTML=renderRoomView();requestAnimationFrame(mountRoom);}
    else if(tab==='about'){main.innerHTML=renderAboutView();}
    if(typeof renderNav==='function')renderNav();if(typeof updateHeaderUI==='function')updateHeaderUI();
  }

  // Use the new character identity consistently in compact avatars around the app.
  let miniAvatarSvgCounter = 0;
  function miniAvatarSvg(size=70, emote=false){
    const a=life.avatar;
    const skin=a.skin||'#F2C6A8';
    const shirt=itemFor('shirts',a.shirt)?.color||'#5B83E8';
    const pants=itemFor('pants',a.pants)?.color||'#344664';
    const hair=itemFor('hairColors',a.hairColor)?.color||'#684637';
    const shoes=itemFor('shoes',a.shoes)?.color||'#F5F7FF';
    const id=`orbit-mini-avatar-${++miniAvatarSvgCounter}`;
    const outline='#25304B';
    let back='';
    if(a.accessory==='backpack') back=`<rect x="20" y="64" width="13" height="31" fill="#806CCB" stroke="${outline}" stroke-width="1.7"/><rect x="21" y="71" width="11" height="5" fill="#F4D16C"/>`;
    if(a.accessory==='wings') back=`<path d="M31 66 L12 58 L17 82 L31 91Z" fill="#BBA5F5" stroke="${outline}" stroke-width="1.5"/><path d="M69 66 L88 58 L83 82 L69 91Z" fill="#BBA5F5" stroke="${outline}" stroke-width="1.5"/>`;
    let hairBack='';
    if(['long','ponytail','braids','twin','bun','bob','curly'].includes(a.hairStyle)) hairBack=`<rect x="23" y="34" width="9" height="29" fill="${hair}" stroke="${outline}" stroke-width="1.2"/><rect x="68" y="34" width="9" height="29" fill="${hair}" stroke="${outline}" stroke-width="1.2"/>`;
    if(a.hairStyle==='ponytail') hairBack+=`<rect x="71" y="34" width="10" height="31" fill="${hair}" stroke="${outline}" stroke-width="1.2"/><circle cx="78" cy="34" r="5" fill="${hair}"/>`;
    if(a.hairStyle==='twin') hairBack+=`<rect x="15" y="31" width="9" height="23" fill="${hair}" stroke="${outline}" stroke-width="1.2"/><rect x="76" y="31" width="9" height="23" fill="${hair}" stroke="${outline}" stroke-width="1.2"/>`;
    if(a.hairStyle==='braids') hairBack+=`<g fill="${hair}" stroke="${outline}" stroke-width=".8"><circle cx="27" cy="48" r="4"/><circle cx="27" cy="56" r="4"/><circle cx="73" cy="48" r="4"/><circle cx="73" cy="56" r="4"/></g>`;
    if(a.hairStyle==='bun') hairBack+=`<rect x="40" y="3" width="20" height="11" fill="${hair}" stroke="${outline}" stroke-width="1.2"/><rect x="42" y="1" width="16" height="8" fill="${hair}"/>`;
    let fringe=`<rect x="23" y="12" width="54" height="13" fill="${hair}" stroke="${outline}" stroke-width="1.5"/>`;
    if(a.hairStyle==='side') fringe+=`<rect x="24" y="19" width="21" height="15" fill="${hair}" stroke="${outline}" stroke-width="1.1"/>`;
    if(a.hairStyle==='short') fringe+=`<rect x="27" y="20" width="17" height="7" fill="${hair}"/><rect x="48" y="18" width="23" height="8" fill="${hair}"/>`;
    if(a.hairStyle==='spiky') fringe+=`<path d="M24 15 L31 3 L39 15 L48 1 L56 15 L66 4 L76 16Z" fill="${hair}" stroke="${outline}" stroke-width="1.2"/>`;
    if(a.hairStyle==='curly') fringe+=`<g fill="${hair}" stroke="${outline}" stroke-width="1"><rect x="23" y="8" width="12" height="12"/><rect x="35" y="4" width="12" height="14"/><rect x="48" y="5" width="12" height="13"/><rect x="61" y="8" width="14" height="12"/></g>`;
    if(a.hairStyle==='bob') fringe+=`<rect x="22" y="31" width="10" height="29" fill="${hair}" stroke="${outline}" stroke-width="1.1"/><rect x="68" y="31" width="10" height="29" fill="${hair}" stroke="${outline}" stroke-width="1.1"/><rect x="28" y="9" width="44" height="8" fill="${hair}"/>`;
    let eyes=''; let mouth='';
    if(a.face==='wink') eyes=`<circle cx="41" cy="39" r="3.1" fill="#18243A"/><path d="M56 39 L64 39" stroke="#18243A" stroke-width="2.4" stroke-linecap="square"/>`;
    else if(a.face==='sleepy'||a.face==='focused') eyes=`<path d="M37 39 H45 M55 39 H63" stroke="#18243A" stroke-width="2.8" stroke-linecap="square"/>`;
    else if(a.face==='excited') eyes=`<path d="M37 36 L40 32 L43 36 L47 39 L43 42 L40 46 L37 42 L33 39Z M56 36 L59 32 L62 36 L66 39 L62 42 L59 46 L56 42 L52 39Z" fill="#F7C94C" stroke="#18243A" stroke-width="1"/>`;
    else eyes=`<circle cx="41" cy="39" r="3.3" fill="#18243A"/><circle cx="60" cy="39" r="3.3" fill="#18243A"/><circle cx="42" cy="38" r=".9" fill="#FFFFFF"/><circle cx="61" cy="38" r=".9" fill="#FFFFFF"/>`;
    if(a.face==='surprised') mouth=`<ellipse cx="51" cy="51" rx="3.4" ry="4.4" fill="#8E4554"/>`;
    else if(a.face==='focused'||a.face==='sleepy') mouth=`<path d="M46 51 H56" stroke="#8E4554" stroke-width="2.2" stroke-linecap="square"/>`;
    else if(a.face==='wink') mouth=`<path d="M45 49 Q53 55 60 49" fill="none" stroke="#8E4554" stroke-width="2.2"/>`;
    else if(a.face==='laugh') mouth=`<path d="M43 48 Q51 61 60 48Z" fill="#8E4554"/>`;
    else mouth=`<path d="M44 49 Q51 56 59 49" fill="none" stroke="#8E4554" stroke-width="2.2" stroke-linecap="square"/>`;
    let hat='';
    if(a.hat==='cap') hat=`<rect x="23" y="8" width="55" height="9" fill="#526DE0" stroke="${outline}" stroke-width="1.4"/><rect x="47" y="14" width="34" height="5" fill="#718DF2" stroke="${outline}" stroke-width="1.1"/>`;
    if(a.hat==='beanie') hat=`<rect x="22" y="4" width="56" height="15" fill="#77B8C9" stroke="${outline}" stroke-width="1.5"/><rect x="22" y="15" width="56" height="5" fill="#4D9AAA"/><circle cx="50" cy="4" r="4" fill="#EAFBFF"/>`;
    if(a.hat==='starband') hat=`<rect x="22" y="15" width="56" height="5" fill="#E6B9E7" stroke="${outline}" stroke-width="1"/><path d="M50 2 L53 9 L61 9 L55 14 L57 21 L50 17 L43 21 L45 14 L39 9 L47 9Z" fill="#F7D66D"/>`;
    if(a.hat==='bow') hat=`<path d="M33 10 L21 2 L22 17 L36 15Z M36 10 L48 2 L47 17 L34 15Z" fill="#EF83AE" stroke="${outline}" stroke-width="1.2"/><rect x="32" y="8" width="7" height="7" fill="#F7D66D"/>`;
    if(a.hat==='headphones') hat=`<path d="M21 31 V22 Q21 4 50 4 Q79 4 79 22 V31" fill="none" stroke="#353D69" stroke-width="5"/><rect x="17" y="27" width="9" height="17" fill="#7B8CF4" stroke="${outline}" stroke-width="1.1"/><rect x="74" y="27" width="9" height="17" fill="#7B8CF4" stroke="${outline}" stroke-width="1.1"/>`;
    if(a.hat==='flower') hat=`<g stroke="${outline}" stroke-width=".7"><circle cx="34" cy="12" r="5" fill="#F18DB7"/><circle cx="44" cy="7" r="5" fill="#FFD66B"/><circle cx="55" cy="7" r="5" fill="#F18DB7"/><circle cx="66" cy="12" r="5" fill="#FFD66B"/><circle cx="50" cy="11" r="4" fill="#FFF2B4"/></g>`;
    if(a.hat==='crown') hat=`<path d="M28 18 L27 3 L40 12 L50 0 L60 12 L73 3 L72 18Z" fill="#F5C85D" stroke="#9A6D24" stroke-width="1.6"/><rect x="28" y="16" width="44" height="5" fill="#D9A83D" stroke="#9A6D24" stroke-width="1"/>`;
    if(a.hat==='helmet') hat=`<path d="M20 31 Q20 2 50 2 Q80 2 80 31" fill="#A9E4F4" fill-opacity=".58" stroke="#68B8D2" stroke-width="2.2"/><rect x="19" y="28" width="62" height="4" fill="#DDF8FF" fill-opacity=".8"/>`;
    let accessory='';
    if(a.accessory==='scarf') accessory+=`<rect x="29" y="60" width="42" height="7" fill="#5BC7BE" stroke="${outline}" stroke-width="1.3"/><path d="M62 64 L68 84 L61 84 L57 65Z" fill="#5BC7BE" stroke="${outline}" stroke-width="1"/>`;
    if(a.accessory==='necklace') accessory+=`<path d="M40 64 Q50 80 60 64" fill="none" stroke="#E8C66B" stroke-width="2.4"/><circle cx="50" cy="76" r="3.2" fill="#F4D16C" stroke="#9B762B" stroke-width=".8"/>`;
    if(a.accessory==='badge') accessory+=`<circle cx="64" cy="77" r="5" fill="#FFD56A" stroke="#9B762B" stroke-width="1"/><path d="M64 73 L65 76 L68 77 L65 79 L64 82 L62 79 L59 77 L62 76Z" fill="#FFFFFF"/>`;
    if(a.accessory==='watch') accessory+=`<rect x="73" y="83" width="6" height="9" fill="#39466C"/><rect x="74" y="85" width="4" height="4" fill="#F5D878"/>`;
    if(a.accessory==='glasses') accessory+=`<g fill="#79D7F0" fill-opacity=".28" stroke="#26334F" stroke-width="2"><rect x="32" y="34" width="16" height="10"/><rect x="53" y="34" width="16" height="10"/><path d="M48 38 H53"/></g>`;
    let lower='';
    if(a.pants==='star_skirt') lower=`<path d="M31 96 H69 L75 118 H25Z" fill="${pants}" stroke="${outline}" stroke-width="1.8"/>`;
    else lower=`<rect x="33" y="96" width="15" height="25" fill="${pants}" stroke="${outline}" stroke-width="1.7"/><rect x="52" y="96" width="15" height="25" fill="${pants}" stroke="${outline}" stroke-width="1.7"/>`;
    const smileBadge=`<rect x="46" y="73" width="8" height="8" fill="#FFF0B8" stroke="#8D7444" stroke-width=".7"/>`;
    const longArms=`<rect x="13" y="63" width="15" height="22" fill="${shirt}" stroke="${outline}" stroke-width="1.7"/><rect x="14" y="83" width="13" height="14" fill="${skin}" stroke="${outline}" stroke-width="1.5"/><rect x="72" y="63" width="15" height="22" fill="${shirt}" stroke="${outline}" stroke-width="1.7"/><rect x="73" y="83" width="13" height="14" fill="${skin}" stroke="${outline}" stroke-width="1.5"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 124" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your selected OrbitSchool avatar" class="orbitschool-avatar-svg ${emote?'animate-avatar-emote':'animate-avatar-idle'}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE3F1"/><stop offset=".48" stop-color="#D8E4FF"/><stop offset="1" stop-color="#C7F1F4"/></linearGradient><linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".65"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>
      <rect x="1" y="1" width="98" height="122" rx="18" fill="url(#${id})"/><circle cx="14" cy="17" r="3" fill="#FFFFFF" opacity=".8"/><circle cx="85" cy="21" r="2.5" fill="#FFFFFF" opacity=".9"/><path d="M8 96 Q25 78 40 98 T92 95 V122 H8Z" fill="#FFFFFF" opacity=".16"/>
      <g class="orbit-mini-character">${back}${hairBack}
        <ellipse cx="50" cy="119" rx="33" ry="3" fill="#36466B" opacity=".2"/>
        <rect x="30" y="60" width="40" height="37" fill="${shirt}" stroke="${outline}" stroke-width="2"/><path d="M33 63 H67 V67 H33Z" fill="#FFFFFF" opacity=".22"/>${smileBadge}
        ${longArms}${lower}
        <rect x="29" y="117" width="20" height="6" fill="${shoes}" stroke="${outline}" stroke-width="1.5"/><rect x="51" y="117" width="20" height="6" fill="${shoes}" stroke="${outline}" stroke-width="1.5"/>
        <rect x="44" y="55" width="12" height="8" fill="${skin}" stroke="${outline}" stroke-width="1"/>
        <rect x="25" y="13" width="50" height="46" fill="${skin}" stroke="${outline}" stroke-width="2"/><rect x="21" y="32" width="4" height="12" fill="${skin}" stroke="${outline}" stroke-width="1"/><rect x="75" y="32" width="4" height="12" fill="${skin}" stroke="${outline}" stroke-width="1"/>
        ${fringe}${eyes}<circle cx="34" cy="48" r="4" fill="#F39AB7" opacity=".72"/><circle cx="67" cy="48" r="4" fill="#F39AB7" opacity=".72"/>${mouth}${accessory}${hat}
      </g><rect x="1" y="1" width="98" height="122" rx="18" fill="url(#${id}-shine)" pointer-events="none"/>
    </svg>`;
  }
  const originalAvatarSvgRenderer = window.renderRobloxAvatarSVG;
  window.renderRobloxAvatarSVG = function(cfg,size=70,emoteActive=false){
    if(cfg===state.avatar || cfg==null) return miniAvatarSvg(size,emoteActive);
    return typeof originalAvatarSvgRenderer==='function' ? originalAvatarSvgRenderer(cfg,size,emoteActive) : miniAvatarSvg(size,emoteActive);
  };

  // Route only the selected experience screens through this additive layer.
  window.renderCurrentView=function(){
    const tab=state?.activeTab;
    if(['avatar','shop','about'].includes(tab)){mountPage(tab);return;}
    if(tab==='orbitworld'){
      if(worldSub==='room'){mountPage('orbitworld');return;}
      cleanupRuntime();
      if(typeof previousRender==='function')previousRender.apply(this,arguments);
      requestAnimationFrame(()=>{
        const main=$('main-view');if(!main||$('life-world-subnav'))return;
        const nav=document.createElement('div');nav.id='life-world-subnav';nav.className='life-world-subnav';nav.innerHTML=`<button class="${worldSub==='explore'?'active':''}" onclick="OrbitLife.setWorldSub('explore')">🌍 Explore Islands</button><button onclick="OrbitLife.showRoom()">🏡 My 3D Room</button>`;
        main.prepend(nav);
      });
      return;
    }
    cleanupRuntime();
    if(typeof previousRender==='function')return previousRender.apply(this,arguments);
  };

  // Reset the new profile-specific cosmetics and room only when the app's local-profile reset runs.
  if(typeof window.resetAllProgressForNewAccount==='function'&&!window.resetAllProgressForNewAccount.__lifeWrapped){
    const oldReset=window.resetAllProgressForNewAccount;
    const wrapped=function(){const result=oldReset.apply(this,arguments);try{localStorage.removeItem(KEY);Object.assign(life,merge(DEFAULT,DEFAULT));write();}catch(e){console.warn('Orbit life reset:',e);}return result;};
    wrapped.__lifeWrapped=true;window.resetAllProgressForNewAccount=wrapped;
  }

  window.OrbitLife={avatarLook:()=>{const a=life.avatar;return {skin:a.skin||'#F2C6A8',shirt:itemFor('shirts',a.shirt)?.color||'#5B83E8',pants:itemFor('pants',a.pants)?.color||'#344664',hair:itemFor('hairColors',a.hairColor)?.color||'#684637',shoes:itemFor('shoes',a.shoes)?.color||'#F5F7FF',hairStyle:a.hairStyle,face:a.face,hat:a.hat,accessory:a.accessory,skirt:a.pants==='star_skirt'};},setAvatar:updateAvatar,setCategory,equip:equipItem,buy:buyItem,buyFurniture,toggleFurniture,buyRoomStyle,setShopTab,goShop,showRoom,showExplore,roomEmote,toggleLights,emote,randomLook,saveLook,loadLook,setWorldSub,getInfo:()=>({roomItems:life.room.decor.length,avatarStyle:life.avatar.style,level:levelNow(),coins:coinBalance(),wallThemes:life.owned.wallThemes.length,floorThemes:life.owned.floorThemes.length}),getAvatarConfig:()=>({...life.avatar}),buildAvatarModel:buildAvatar,drawAvatarFallback:drawCanvasCharacter};
  // Ensure existing dashboard avatar calls receive the selected OrbitSchool look after a boot-time rerender.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(typeof renderCurrentView==='function')renderCurrentView();},{once:true});
})();
