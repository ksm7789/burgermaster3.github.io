// sw.js
const VERSION = 'bm-20251021-1';

// 현재 서비스워커 파일의 경로를 기준으로 BASE를 자동 계산
const BASE = new URL('./', self.location).pathname; // "/burgermaster3.github.io/"

const CORE = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png'
].map(p => BASE + p);

// 설치: 코어 리소스 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

// 활성화: 구 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === VERSION ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// 페치: 네비게이션은 캐시 우선(오프라인 지원), 정적 파일은 SWR
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 오리진만 처리
  if (url.origin !== self.location.origin) return;

  // HTML 네비게이션 요청
  const isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    event.respondWith(
      caches.match(BASE + 'index.html')
        .then(cached => cached || fetch(req))
        .catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // 기타 정적 리소스: stale-while-revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        const resClone = networkRes.clone();
        caches.open(VERSION).then(cache => cache.put(req, resClone));
        return networkRes;
      }).catch(() => cached); // 네트워크 실패 시 캐시 폴백
      return cached || fetchPromise;
    })
  );
});
