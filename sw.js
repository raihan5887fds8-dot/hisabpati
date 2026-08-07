// হিসাব-পাতি অ্যাপের সার্ভিস ওয়ার্কার
// কাজ: (১) অফলাইনে অ্যাপ খোলার ব্যবস্থা করা (২) নামাজের নোটিফিকেশনে ট্যাপ করলে অ্যাপ খোলা/ফোকাস করা

const CACHE_NAME = 'hisheb-pati-v1'; // ফাইল বদলালে ভবিষ্যতে এই নামটা বদলে দিলে পুরনো ক্যাশ ফেলে দিয়ে নতুন করে ডাউনলোড হবে
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// ইনস্টলের সময় মূল ফাইলগুলো ক্যাশে জমা করে রাখা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // কোনো একটা ফাইল না পাওয়া গেলেও যেন পুরো install ব্যর্থ না হয়
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// পুরনো ভার্সনের ক্যাশ মুছে ফেলা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ফাইল আনার কৌশল:
// - নিজের অ্যাপের ফাইল (HTML/manifest/icon) হলে: আগে ক্যাশ, না পেলে নেটওয়ার্ক (অফলাইনে কাজ করার জন্য)
// - বাইরের কিছু (যেমন Firebase, aladhan API) হলে: সরাসরি নেটওয়ার্কে পাঠিয়ে দেওয়া, ক্যাশ না করা
//   (ডাটা সবসময় সবচেয়ে আপডেটেড থাকা দরকার, তাই এগুলো ক্যাশ করা হয় না)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return; // POST ইত্যাদি (Firestore লেখা) সবসময় নেটওয়ার্কেই যাবে

  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // বাইরের ডোমেইন (Firebase SDK, Firestore, aladhan API ইত্যাদি) — ক্যাশে হাত না দিয়ে সরাসরি নেটওয়ার্ক
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // সফলভাবে নতুন কপি পাওয়া গেলে ক্যাশ হালনাগাদ করে রাখা (পরের বার অফলাইনেও কাজে লাগবে)
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // নেটওয়ার্ক না থাকলে ক্যাশ থেকেই দেখানো

      // ক্যাশে থাকলে সাথে সাথে সেটা দেখানো (দ্রুত লোড), না থাকলে নেটওয়ার্কের জন্য অপেক্ষা
      return cached || network;
    })
  );
});

// নামাজের নোটিফিকেশনে ট্যাপ করলে অ্যাপ খোলা বা আগে থেকে খোলা ট্যাবে ফোকাস করা
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
