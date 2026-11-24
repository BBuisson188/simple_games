const CACHE_NAME = "mini-games-v95";
const flightPaths = ["./games/starfighter-3d/", "./assets/starfighter-3d/"]
  .map((path) => new URL(path, self.registration.scope).pathname);

const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./offline.js",
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
  "./games/starfighter-3d-scores.js",
  "./games/starfighter-sinistar.js",
  "./assets/menu/starfighter-3d.jpg",
  "./assets/icons/app-icon-180.png",
  "./assets/icons/app-icon-192.png",
  "./assets/icons/app-icon-512.png",
  "./assets/icons/app-icon.svg",
  "./assets/icons/biplane-front.svg",
  "./assets/menu/mad-libs.jpg",
  "./assets/menu/airplane-shooter.jpg",
  "./assets/menu/chomp-chase.jpg",
  "./assets/menu/starfighter.jpg",
  "./assets/menu/pine-ridge-run.jpg",
  ...[
    "flight.js", "scene.js", "controls.js", "maneuvers.js", "patrol.js", "carrier.js", "carrier-view.js", "craft-geometry.js",
    "fighter-view.js", "jump-view.js", "rebel-view.js", "level-view.js", "aftermath.js", "fighter-wreck.js", "trench.js",
    "vendor/three.module.js", "vendor/three.core.js", "vendor/loaders/GLTFLoader.js",
    "vendor/utils/BufferGeometryUtils.js", "vendor/utils/SkeletonUtils.js"
  ].map((name) => `./games/starfighter-3d/${name}`),
  "./assets/starfighter-3d/kestrel.glb"
];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("mini-games-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const offlineURLs = APP_ASSETS.map((path) => new URL(path, self.registration.scope).href);
let preparing;
self.addEventListener("message", (event) => {
  const { type } = event.data || {};
  const reply = event.ports[0];
  if (!reply || !["arcade-offline-state", "prepare-arcade"].includes(type)) return;
  event.waitUntil((async () => {
    try {
      if (type === "arcade-offline-state" && !(await caches.has(CACHE_NAME))) {
        reply.postMessage({ ready: false });
        return;
      }
      const cache = await caches.open(CACHE_NAME);
      const saved = await Promise.all(offlineURLs.map((url) => cache.match(url)));
      const ready = saved.every(Boolean);
      if (type === "prepare-arcade" && !ready) {
        // addAll commits the complete package or leaves the cache unchanged on failure.
        preparing ??= cache.addAll(offlineURLs.map((url) => new Request(url, { cache: "reload" })))
          .finally(() => { preparing = undefined; });
        await preparing;
      }
      reply.postMessage({ ready: type === "prepare-arcade" || ready });
    } catch {
      reply.postMessage({ error: "Could not save the arcade. Check your connection and available storage, then try again." });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (flightPaths.some((path) => url.pathname.startsWith(path))) {
    if (event.request.cache === "reload") {
      event.respondWith(fetch(event.request).catch(async () => await caches.match(event.request, { cacheName: CACHE_NAME }) || Response.error()));
      return;
    }
    event.respondWith(
      caches.match(event.request, { cacheName: CACHE_NAME }).then((saved) => saved || fetch(event.request))
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(async () => {
    const saved = await caches.match(event.request, { cacheName: CACHE_NAME });
    if (saved) return saved;
    if (event.request.mode === "navigate" && url.pathname === new URL(self.registration.scope).pathname) {
      return await caches.match(self.registration.scope, { cacheName: CACHE_NAME }) || Response.error();
    }
    return Response.error();
  }));
});
