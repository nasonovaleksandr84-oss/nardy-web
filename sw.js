// Страница — сначала из сети, чтобы новая версия приходила сразу. Файлы сборки с хешем
// в имени не меняются, поэтому их берём из кэша. Без сети всё работает из кэша.
const CACHE = 'nardy-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  ),
);

// GitHub Pages разрешает хранить страницу 10 минут — для страницы этот кэш обходим,
// иначе после выкладки телефон ещё долго показывает старую версию.
async function fromNetwork(request, cache, fresh = false) {
  const response = await fetch(fresh ? new Request(request.url, { cache: 'no-cache' }) : request);
  if (response.ok) void cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (request.mode === 'navigate') {
        try {
          return await fromNetwork(request, cache, true);
        } catch {
          return (await cache.match(request, { ignoreSearch: true })) ?? Response.error();
        }
      }
      return (await cache.match(request)) ?? fromNetwork(request, cache);
    }),
  );
});
