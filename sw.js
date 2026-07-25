const CACHE_NAME = 'hisabpati-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version first.
// Only fall back to the cached copy if there's no internet connection.
// This means updates to index.html / manifest.json / icons show up
// immediately next time the app is opened with internet on -- no
// manual cache-version bump needed.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests for our own origin (the app shell).
  // Google Sheet API calls (script.google.com) and Google Fonts always go straight to the network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(resp => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
