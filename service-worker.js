const CACHE_NAME = "mini-games-v74";
const FLIGHT_CACHE = "mini-games-starfighter-3d-v2";
const flightPaths = ["./games/starfighter-3d/", "./assets/starfighter-3d/"]
  .map((path) => new URL(path, self.registration.scope).pathname);

const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./reset.html",
  "./games/airplane-aircraft.js",
  "./games/airplane-scenery.js",
  "./games/airplane-shooter.js",
  "./games/chomp_chase_game.js",
  "./games/global-leaderboard.js",
  "./games/immersive-gameplay.js",
  "./games/mad-libs.js",
  "./games/pine-ridge-course.js",
  "./games/pine-ridge-run.js",
  "./games/pine-ridge-view.js",
  "./games/starfighter-3d-entry.js",
  "./games/starfighter-sinistar.js",
  "./design/starfighter-3d/kestrel-chase.jpg",
  "./assets/icons/app-icon-180.png",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/app-icon.svg",
  "./assets/icons/biplane-front.svg",
  "./assets/menu/mad-libs.jpg",
  "./assets/menu/airplane-shooter.jpg",
  "./assets/menu/chomp-chase.jpg",
  "./assets/menu/starfighter.jpg",
  "./assets/menu/pine-ridge-run.jpg"
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
          .filter((key) => key.startsWith("mini-games-") && key !== CACHE_NAME && key !== FLIGHT_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // The flight pack is downloaded on demand. Keep its versioned files together.
  if (flightPaths.some((path) => url.pathname.startsWith(path))) {
    // Explicit pack downloads must not pull stale files from an older worker.
    if (event.request.cache === "reload") return;
    event.respondWith(
      caches.open(FLIGHT_CACHE)
        .then((cache) => cache.match(event.request))
        .catch(() => undefined)
        .then((saved) => saved || fetch(event.request))
    );
    return;
  }

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
