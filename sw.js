// 초안전 오프라인 서비스워커 (Network-First Dynamic Cache)
const CACHE_NAME = 'khnp-v3';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(k) {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    // 1. 온라인일 때는 인터넷에서 최신 페이지를 정상적으로 열고 캐시에 자동 백업
    fetch(e.request)
      .then(function(res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, copy);
          });
        }
        return res;
      })
      .catch(function() {
        // 2. 오프라인(비행기 모드)일 때는 저장된 캐시에서 즉시 띄움
        return caches.match(e.request).then(function(matched) {
          if (matched) return matched;
          if (e.request.mode === 'navigate') {
            return caches.match('./').then(function(r) {
              return r || caches.match('index.html');
            });
          }
        });
      })
  );
});
