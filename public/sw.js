// しらべてつくろう!AIラボ 簡易 Service Worker
// アプリシェル(CSS/JS)と アップロード画像を ネットワーク優先・失敗時キャッシュで返す。
// Bot 対話・画像生成などの API は キャッシュせず、ネットが 無ければ そのまま失敗させる。
const CACHE = 'stk-shell-v2';
const PRECACHE = ['/', '/pick', '/kids', '/privacy', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.all(
          PRECACHE.map((u) =>
            fetch(u, { cache: 'no-cache' })
              .then((r) => (r.ok ? c.put(u, r.clone()) : undefined))
              .catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API は キャッシュしない(鮮度優先、オフラインでは そのまま失敗)
  if (url.pathname.startsWith('/api/')) return;

  // アップロード画像・音声・動画は キャッシュファースト
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) c.put(request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      }),
    );
    return;
  }

  // アプリシェル・HTML ページは ネットワーク優先、失敗時キャッシュ
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.destination !== '') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(request)
          .then((hit) => hit ?? caches.match('/pick'))
          .then((hit) => hit ?? caches.match('/kids')),
      ),
  );
});
