// Minimal service worker — exists purely to satisfy PWA installability
// criteria (Chrome/Android requires a registered service worker with a
// fetch handler before it will offer to install the app). Deliberately
// does no caching: this app updates frequently, and a caching SW risks
// serving stale JS to installed users. Every request just passes through
// to the network as normal.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty — no respondWith(), so the browser's default
  // network fetch handles every request unchanged.
});
