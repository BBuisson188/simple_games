const CACHE_NAME = "mini-games-v25";

const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./reset.html",
  "./games/airplane-shooter.js",
  "./games/mad-libs.js",
  "./games/starfighter-sinistar.js",
  "./games/placeholders.js",
  "./assets/icons/app-icon-180.png",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/app-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        APP_ASSETS.map((asset) => (
          fetch(asset, { cache: "reload" })
            .then((response) => {
              if (!response.ok) throw new Error(`Failed to cache ${asset}`);
              return cache.put(asset, response);
            })
        ))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseCopy));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
