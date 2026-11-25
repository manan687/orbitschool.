/* OrbitSchool Blocky Avatar — replaces the flat 2D character with a shaded, chunky 3D-block figure.
   Same size, same options (skin, hair, outfit, hat, face, accessory). Falls back to the old renderer if the look is unavailable. */
(function () {
  'use strict';
  const OUT = '#25304B', D = 7, E = 5;
  let count = 0;
  const hex = h => { h = String(h || '#888888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const shade = (c, k) => { const [r, g, b] = hex(c), t = k < 0 ? 0 : 255, a = Math.abs(k), m = v => Math.round(v + (t - v) * a); return `rgb(${m(r)},${m(g)},${m(b)})`; };
  // A cuboid seen from a 3/4 angle: front face + lighter top + darker right side.
  function box(x, y, w, h, c, o) {
    o = o || {}; const d = o.d == null ? D : o.d, e = o.e == null ? E : o.e; let s = '';
    if (o.side !== false) s += `<polygon points="${x + w},${y} ${x + w + d},${y - e} ${x + w + d},${y + h - e} ${x + w},${y + h}" fill="${shade(c, -.28)}"/>`;
    if (o.top !== false) s += `<polygon points="${x},${y} ${x + d},${y - e} ${x + w + d},${y - e} ${x + w},${y}" fill="${shade(c, .24)}"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    return `<g stroke="${OUT}" stroke-width=".9" stroke-linejoin="round">${s}</g>`;
  }

  function hairBlocks(L) {
    const c = L.hair, s = L.hairStyle || 'short';
    let b = box(30, s === 'short' ? 12 : 11, 40, s === 'short' ? 8 : 10, c);
    if (s === 'side') b += box(31, 19, 16, 8, c, { side: false, top: false });
    if (s === 'spiky') b += box(33, 5, 8, 8, c, { d: 4, e: 3 }) + box(45, 1, 9, 12, c, { d: 4, e: 3 }) + box(58, 5, 8, 8, c, { d: 4, e: 3 });
    if (s === 'curly') b += [30, 40, 51, 61].map((x, i) => box(x, 5 + (i % 2), 9, 9, c, { d: 4, e: 3 })).join('');
    if (s === 'bob' || s === 'long') { const h = s === 'long' ? 36 : 24; b += box(30, 16, 5, h, c, { side: false, top: false }) + box(65, 16, 5, h, c, { top: false, d: 5, e: 4 }); }
    if (s === 'ponytail') b += box(70, 18, 7, 28, c, { top: false, d: 4, e: 3 });
    if (s === 'twin') b += box(23, 24, 7, 24, c, { side: false, top: false }) + box(70, 24, 7, 24, c, { top: false, d: 4, e: 3 });
    if (s === 'braids') b += box(26, 26, 5, 24, c, { side: false, top: false }) + box(69, 26, 5, 24, c, { top: false, d: 3, e: 3 });
    if (s === 'bun') b += box(43, 1, 14, 10, c, { d: 5, e: 4 });
    return b;
  }
  function hatBlocks(h) {
    if (h === 'cap') return box(31, 8, 38, 10, '#526DE0') + box(44, 16, 34, 4, '#718DF2', { top: false, side: false });
    if (h === 'beanie') return box(30, 6, 40, 14, '#77B8C9') + box(30, 16, 40, 5, '#4D9AAA', { top: false, side: false }) + box(46, 1, 8, 6, '#EAFBFF', { d: 3, e: 2 });
    if (h === 'starband') return box(30, 15, 40, 5, '#E6B9E7', { side: false }) + box(46, 7, 8, 8, '#F7D66D', { d: 3, e: 2 });
    if (h === 'bow') return box(33, 7, 10, 9, '#EF83AE', { d: 4, e: 3 }) + box(53, 7, 10, 9, '#EF83AE', { d: 4, e: 3 }) + box(44, 9, 8, 7, '#F7D66D', { d: 3, e: 2 });
    if (h === 'headphones') return box(30, 8, 40, 4, '#353D69') + box(24, 24, 8, 16, '#7B8CF4', { side: false, d: 4, e: 3 }) + box(68, 24, 8, 16, '#7B8CF4', { d: 4, e: 3 });
    if (h === 'flower') return [[34, 8, '#F18DB7'], [44, 4, '#FFD66B'], [55, 4, '#F18DB7'], [63, 9, '#FFD66B']].map(p => box(p[0], p[1], 7, 7, p[2], { d: 3, e: 2 })).join('');
    if (h === 'crown') return box(32, 12, 36, 6, '#D9A83D') + [33, 46, 59].map(x => box(x, 4, 8, 9, '#F5C85D', { d: 3, e: 2 })).join('');
    if (h === 'helmet') return `<g stroke="#68B8D2" stroke-width="1.6" fill="#A9E4F4" fill-opacity=".45"><rect x="27" y="6" width="46" height="44" rx="3"/><polygon points="73,6 80,1 80,45 73,50"/></g>`;
    return '';
  }
  function faceBlocks(f) {
    const e = '#18243A'; let eyes, mouth;
    if (f === 'wink') eyes = `<rect x="40" y="29" width="5" height="5" fill="${e}"/><rect x="55" y="31" width="7" height="2" fill="${e}"/>`;
    else if (f === 'sleepy' || f === 'focused') eyes = `<rect x="39" y="31" width="7" height="2.4" fill="${e}"/><rect x="55" y="31" width="7" height="2.4" fill="${e}"/>`;
    else if (f === 'excited') eyes = `<rect x="39" y="28" width="7" height="7" fill="#F7C94C" stroke="${e}" stroke-width="1"/><rect x="55" y="28" width="7" height="7" fill="#F7C94C" stroke="${e}" stroke-width="1"/>`;
    else eyes = `<rect x="40" y="28" width="5" height="6" fill="${e}"/><rect x="56" y="28" width="5" height="6" fill="${e}"/><rect x="41" y="29" width="1.6" height="1.6" fill="#fff"/><rect x="57" y="29" width="1.6" height="1.6" fill="#fff"/>`;
    const m = '#8E4554';
    if (f === 'surprised') mouth = `<rect x="47" y="39" width="6" height="7" fill="${m}"/>`;
    else if (f === 'focused' || f === 'sleepy') mouth = `<rect x="45" y="41" width="10" height="2.4" fill="${m}"/>`;
    else if (f === 'laugh') mouth = `<rect x="43" y="39" width="14" height="7" fill="${m}"/><rect x="46" y="43" width="8" height="3" fill="#F39AB7"/>`;
    else mouth = `<rect x="44" y="41" width="12" height="2.4" fill="${m}"/><rect x="42" y="39" width="2.4" height="2.4" fill="${m}"/><rect x="55.6" y="39" width="2.4" height="2.4" fill="${m}"/>`;
    return eyes + `<rect x="34" y="36" width="5" height="3" fill="#F39AB7" opacity=".75"/><rect x="61" y="36" width="5" height="3" fill="#F39AB7" opacity=".75"/>` + mouth;
  }
  function accessoryBack(a) {
    if (a === 'backpack') return box(24, 52, 10, 26, '#806CCB', { d: 4, e: 3 }) + `<rect x="25" y="58" width="8" height="4" fill="#F4D16C"/>`;
    if (a === 'wings') return `<g stroke="${OUT}" stroke-width=".9" fill="#BBA5F5"><polygon points="33,52 12,42 16,70 33,76"/><polygon points="67,52 88,42 84,70 67,76"/></g>`;
    return '';
  }
  function accessoryFront(a) {
    if (a === 'scarf') return box(32, 46, 36, 7, '#5BC7BE', { top: false, d: 6, e: 4 }) + box(58, 52, 7, 18, '#5BC7BE', { top: false, side: false });
    if (a === 'necklace') return box(46, 55, 8, 3, '#E8C66B', { top: false, side: false }) + box(47, 59, 6, 6, '#F4D16C', { top: false, d: 2, e: 2 });
    if (a === 'badge') return box(55, 58, 8, 8, '#FFD56A', { top: false, side: false });
    if (a === 'watch') return box(67, 74, 12, 4, '#39466C', { top: false }) + `<rect x="70" y="74" width="5" height="4" fill="#F5D878"/>`;
    if (a === 'glasses') return `<g fill="#79D7F0" fill-opacity=".3" stroke="#26334F" stroke-width="1.6"><rect x="36" y="26" width="14" height="10"/><rect x="52" y="26" width="14" height="10"/></g><rect x="49" y="29" width="4" height="1.6" fill="#26334F"/>`;
    return '';
  }

  function svg(size, emote, noBg) {
    const L = window.OrbitLife && typeof OrbitLife.avatarLook === 'function' ? OrbitLife.avatarLook() : null;
    if (!L) return null;
    const id = 'orbit-blk-' + (++count), skin = L.skin, leg = L.skirt ? skin : L.pants;
    const body =
      accessoryBack(L.accessory) +
      box(33, 80, 16, 28, leg, { side: false }) + box(51, 80, 16, 28, leg) +
      box(33, 106, 16, 9, L.shoes, { side: false }) + box(51, 106, 16, 9, L.shoes) +
      (L.skirt ? box(31, 76, 38, 16, L.pants) : '') +
      box(33, 48, 34, 32, L.shirt) + `<rect x="33" y="48" width="34" height="4" fill="#fff" opacity=".2"/><rect x="44" y="60" width="8" height="8" fill="#FFF0B8" stroke="#8D7444" stroke-width=".6"/>` +
      box(21, 48, 12, 28, L.shirt, { side: false }) + box(21, 74, 12, 9, skin, { side: false }) +
      box(67, 48, 12, 28, L.shirt) + box(67, 74, 12, 9, skin) +
      accessoryFront(L.accessory === 'watch' ? '' : L.accessory) +
      box(31, 14, 38, 34, skin) + faceBlocks(L.face) + hairBlocks(L) + (L.accessory === 'glasses' ? accessoryFront('glasses') : '') + hatBlocks(L.hat) +
      (L.accessory === 'watch' ? accessoryFront('watch') : '');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 124" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your blocky OrbitSchool avatar" class="orbitschool-avatar-svg orbit-blocky ${emote ? 'animate-avatar-emote' : 'animate-avatar-idle'}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE3F1"/><stop offset=".48" stop-color="#D8E4FF"/><stop offset="1" stop-color="#C7F1F4"/></linearGradient></defs>
      ${noBg ? '' : '<rect x="1" y="1" width="98" height="122" rx="18" fill="url(#'+id+')"/><path d="M8 100 Q25 84 40 102 T92 99 V122 H8Z" fill="#fff" opacity=".18"/>'}
      <g class="orbit-mini-character"><ellipse cx="50" cy="119" rx="32" ry="3.4" fill="#36466B" opacity=".25"/>${body}</g></svg>`;
  }

  const prev = window.renderRobloxAvatarSVG;
  window.renderRobloxAvatarSVG = function (cfg, size, emote) {
    if (typeof state !== 'undefined' && (cfg === state.avatar || cfg == null)) { try { const s = svg(size || 70, emote); if (s) return s; } catch (e) { console.warn('Blocky avatar failed:', e); } }
    return typeof prev === 'function' ? prev.apply(this, arguments) : '';
  };

  /* 2D world fallback (used when WebGL / Three.js is unavailable): draw the same blocky figure on canvas. */
  const cache = { key: '', img: null, ready: false };
  function fallbackImage() {
    const look = window.OrbitLife && OrbitLife.avatarLook ? OrbitLife.avatarLook() : null;
    const key = JSON.stringify(look);
    if (key !== cache.key) {
      cache.key = key; cache.ready = false;
      const s = svg(200, false, true); if (!s) return null;
      const img = new Image();
      img.onload = () => { cache.ready = true; };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
      cache.img = img;
    }
    return cache.ready ? cache.img : null;
  }
  if (window.OrbitLife) {
    OrbitLife.drawAvatarFallback = function (ctx, x, y, scale, t, action) {
      const img = fallbackImage(); if (!img) return;
      const h = 150 * (scale || 1), w = h * 100 / 124;
      const bob = action === 'walk' ? Math.abs(Math.sin((t || 0) * 0.012)) * 5 * (scale || 1) : 0;
      ctx.save(); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, x - w / 2, y - h - bob, w, h);
      ctx.restore();
    };
  }
  /* Old 3D renderer (orbit-v2) calls this when Three.js is missing; the blocky canvas fallback covers it. */
  if (typeof window.attachFallbackControls !== 'function') window.attachFallbackControls = function () {};

  /* Studio "Live character preview": blocky figure on the soft blue stage, drag to rotate. Works without WebGL. */
  function mountPreview(canvas, stage) {
    const c = document.createElement('canvas');
    c.id = 'life-avatar-canvas'; c.setAttribute('aria-label', 'Blocky Orbit avatar preview. Drag to rotate.');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
    canvas.replaceWith(c);
    const ctx = c.getContext('2d'); if (!ctx) return;
    const rt = { yaw: 0, drag: null, w: 300, h: 380 };
    const size = () => {
      const w = Math.max(260, stage.clientWidth), h = Math.max(300, stage.clientHeight), dpr = Math.min(window.devicePixelRatio || 1, 2);
      rt.w = w; rt.h = h; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(size).observe(stage);
    c.addEventListener('pointerdown', e => { rt.drag = e.clientX; c.setPointerCapture?.(e.pointerId); });
    c.addEventListener('pointermove', e => { if (rt.drag != null) { rt.yaw += (e.clientX - rt.drag) * 0.008; rt.drag = e.clientX; } });
    const end = () => { rt.drag = null; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    const loop = t => {
      if (!c.isConnected) return;
      requestAnimationFrame(loop);
      const w = rt.w, h = rt.h, m = Math.min(w, h), cx = w * 0.5, base = h * 0.84;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#dbe9ff'); bg.addColorStop(1, '#9dbcf0');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(37,70,139,.16)'; ctx.beginPath(); ctx.ellipse(cx, base + 4, m * 0.24, m * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      const scale = Math.max(1.1, Math.min(1.9, m / 215));
      ctx.save();
      ctx.translate(cx, base);
      const yaw = rt.yaw + Math.sin(t * 0.0007) * 0.3;
      ctx.transform(Math.cos(yaw), 0, Math.sin(yaw) * 0.18, 1, 0, 0);
      ctx.translate(-cx, -base);
      OrbitLife.drawAvatarFallback(ctx, cx, base, scale, t, '');
      ctx.restore();
    };
    requestAnimationFrame(loop);
  }
  window.OrbitBlocky = { svg, shade, mountPreview };
  setTimeout(() => { try { if (typeof updateHeaderUI === 'function') updateHeaderUI(); if (typeof renderCurrentView === 'function') renderCurrentView(); } catch (e) {} }, 60);
})();
