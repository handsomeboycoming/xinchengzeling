/* ============================================================
   sw.js - Service Worker (离线缓存)
   欣成则灵 PWA
   ============================================================ */

const CACHE_NAME = 'xinchengzeling-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/js/supabase.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/sync.js',
  '/js/app.js',
  '/js/pages/home.js',
  '/js/pages/memories.js',
  '/js/pages/dates.js',
  '/js/pages/plans.js',
  '/js/pages/notes.js',
  '/js/pages/wishlist.js',
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：缓存优先（静态资源），网络优先（API）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase API 请求：网络优先，不缓存
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
