// হিসাবপাতি — অফলাইন সার্ভিস ওয়ার্কার
// অ্যাপে বড় পরিবর্তন করলে নিচের সংখ্যাটা বাড়িয়ে দিন (v2 → v3), তাহলে নতুন ভার্সন লোড হবে
const CACHE = 'hisheb-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png'];
// Firebase SDK ও ফন্ট — এগুলো অফলাইনেও লাগে
const EXTERNAL = [
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(u => c.add(u)));
    await Promise.allSettled(EXTERNAL.map(u => c.add(new Request(u, {mode:'cors'}))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firestore-এর নিজস্ব নেটওয়ার্ক কল — ক্যাশ করা যাবে না (SDK নিজেই অফলাইন সামলায়)
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts.')) return;
  if (url.hostname.endsWith('firebaseio.com')) return;

  // পেজ নেভিগেশন: নেট থাকলে নতুনটা, না থাকলে ক্যাশ থেকে
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // বাকি সব (ফন্ট, SDK, আইকন): ক্যাশে থাকলে ওটাই, না থাকলে নেট থেকে এনে জমিয়ে রাখো
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch (_) {
      return hit || Response.error();
    }
  })());
});

// নামাজের নোটিফিকেশনে ট্যাপ করলে অ্যাপ খুলবে
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});
