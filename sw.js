// DGC Timesheet — Service Worker
// Versioned cache + update-on-demand: when a new version is deployed, the app
// shows an "Update ready" banner; tapping it activates the new SW and reloads.
// Bump TIMESHEET_CACHE on every deploy so the update check actually fires.

const TIMESHEET_CACHE = 'dgc-timesheet-v6';
const PRECACHE = [
  './',
  'index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(TIMESHEET_CACHE).then(cache => cache.addAll(PRECACHE)).catch(() => {})
  );
  // No skipWaiting() here — the page shows the update banner and the
  // user chooses when to switch. skipWaiting happens on message below.
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('dgc-timesheet-') && k !== TIMESHEET_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network-first, cache fallback: always fresh when online, still works offline
  e.respondWith(
    fetch(e.request).then(response => {
      const clone = response.clone();
      caches.open(TIMESHEET_CACHE).then(cache => cache.put(e.request, clone)).catch(() => {});
      return response;
    }).catch(() => caches.match(e.request).then(c => c || new Response('Offline — reconnect and try again.', { status: 503 })))
  );
});
