const CACHE_NAME = 'khnp-alarm-v2';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com'
];

// 1. 서비스워커 설치 시 오프라인 필수 파일 즉시 스마트폰에 저장 (Pre-caching)
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 2. 서비스워커 활성화 및 이전 캐시 정리
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 3. 네트워크 요청 처리: 오프라인(비행기 모드) 시 캐시된 앱 즉시 반환 (Offline-First)
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // 캐시된 버전 먼저 즉시 보여주고, 백그라운드에서 최신 버전 갱신 시도
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(function() {});
        return cachedResponse;
      }

      // 캐시에 없으면 네트워크 시도 후 캐시에 복사본 저장
      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        // 오프라인 상태에서 페이지 이동 시 무조건 index.html 반환
        return caches.match('./').then(function(r) {
          return r || caches.match('index.html');
        });
      });
    })
  );
});
