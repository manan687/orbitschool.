const CACHE_NAME = 'orbitschool-accounts-v7-2026-11-24-localaccounts-groups-invites-chatboard-commhub-final';
const APP_SHELL = [
  './',
  './index.html',
  './orbit-v2.js',
  './orbit-2.2.js',
  './orbit-next.js',
  './orbit-expansion.js',
  './orbit-life.js',
  './orbit-play.js',
  './orbit-syllabus.js',
  './orbit-study.js',
  './orbit-lingo.js',
  './orbit-arcade.js',
  './orbit-blocky.js',
  './orbit-access.js',
  './orbit-social.js',
  './privacy.html',
  './orbit-next.css',
  './orbit-life.css',
  './orbit-play.css',
  './manifest.webmanifest',
  './robot.png',
  './vendor/tailwind-play.js',
  './vendor/jszip-3.10.1.min.js',
  './icons/orbit-icon-192.png',
  './icons/orbit-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => (key.startsWith('orbit-aiv-shell-') || key.startsWith('orbitschool-shell-') || key.startsWith('orbitschool-oneapp-')) && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Classroom sessions and reports are live server data and must never be read from cache.
  if (url.pathname.includes('/api/')) return;
  // Single-app navigation only. API requests are deliberately never cached.
  if (request.mode === 'navigate') {
    const leaf = url.pathname.split('/').filter(Boolean).pop() || 'index.html';
    const isAppShell = leaf === 'index.html' || url.pathname.endsWith('/');
    if (!isAppShell) {
      event.respondWith(fetch(request).catch(() => new Response('This page needs an internet connection to reach the OrbitSchool server.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })));
      return;
    }
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
