const CACHE_NAME = 'flexx-v3.9.73';
const ASSETS = [
    './', './index.html', './css/styles.css',
    './js/app.js', './js/core.js', './js/config.js',
    './js/accessibility.js', './js/constants.js', './js/i18n.js',
    './js/observability.js', './js/security.js',
    './manifest.json',
    './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(n => n !== CACHE_NAME ? caches.delete(n) : null))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).catch(() => {
            if (e.request.mode === 'navigate') return caches.match('./index.html');
        }))
    );
});
self.addEventListener('message', e => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
