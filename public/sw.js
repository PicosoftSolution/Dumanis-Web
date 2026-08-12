// Minimal offline "app shell" cache for the DUNAMIS GeoSurvey PWA.
//
// Why this exists: without a service worker, a browser simply CANNOT load
// the app's JS/CSS/HTML at all when there's no network — that's what was
// causing blank pages offline, not the survey-form logic (that part is
// already handled separately via localStorage in utils/offlineSync.js).
//
// Strategy: "network falling back to cache" for same-origin, non-API GET
// requests. Every page/asset that loads successfully while online gets
// cached automatically, so the next time it's requested with no network,
// the cached copy is served instead of failing. API calls (/api/...) are
// intentionally left untouched here — those are handled by the app's own
// offline queue/cache logic, which is more precise about what's safe to
// reuse offline.

const CACHE_NAME = 'dunamis-app-shell-v1';
const SHELL_KEY = '/__app-shell__'; // canonical key for the last-seen index.html, independent of which route was visited

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests on our own origin. Everything else (POST/PUT,
  // cross-origin requests, and anything under /api/) passes through
  // untouched — the app's own offlineSync logic owns that behavior.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache good, basic (same-origin) responses.
        // IMPORTANT: clone() must happen synchronously, right here, before
        // we return `response` to the browser — once it's returned, the
        // browser can start reading its body, and cloning after that point
        // throws "Response body is already used".
        if (response && response.status === 200 && response.type === 'basic') {
          const cacheCopy = response.clone();
          const isNavigate = request.mode === 'navigate';
          const shellCopy = isNavigate ? response.clone() : null;

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
            // React Router "browser" routes (e.g. /dashboard/team-member) are
            // all served by the same index.html — keep one canonical copy so
            // a hard refresh on ANY route can fall back to it while offline,
            // not just the exact path that happened to be cached already.
            if (shellCopy) cache.put(SHELL_KEY, shellCopy);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await caches.match(SHELL_KEY);
          if (shell) return shell;
        }
        throw new Error('offline and not cached');
      })
  );
});
