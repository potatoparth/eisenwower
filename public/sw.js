// Kill-switch worker: evicts the previous vite-plugin-pwa service worker
// and any Workbox caches it created, then unregisters itself.
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|google-fonts-cache|gstatic-fonts-cache/.test(name);
  return hasWorkboxBucket;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const workboxCacheNames = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(workboxCacheNames.map((name) => caches.delete(name)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

self.addEventListener("fetch", () => {});