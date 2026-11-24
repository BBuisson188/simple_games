const VERSION = "v98";
const scope = new URL(self.registration.scope);
const packPrefix = `mini-games-offline:${scope.pathname}:`;
const CACHE_NAME = packPrefix + VERSION;
const ROUTES = packPrefix + "clients";
const marker = new URL("./offline-manifest.json", scope).href;
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
  "./games/starfighter-3d-audio.js",
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
    "fighter-view.js", "jump-view.js", "rebel-view.js", "level-view.js", "aftermath.js", "fighter-wreck.js", "hoth.js", "trench.js",
    "vendor/three.module.js", "vendor/three.core.js", "vendor/loaders/GLTFLoader.js",
    "vendor/utils/BufferGeometryUtils.js", "vendor/utils/SkeletonUtils.js"
  ].map((name) => `./games/starfighter-3d/${name}`),
  "./assets/starfighter-3d/kestrel.glb"
];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

const offlineURLs = APP_ASSETS.map((path) => new URL(path, scope).href);
const assetURLs = new Set(offlineURLs);
const currentRoute = new Map();
const routeKey = (id) => new URL(`./.offline-client/${encodeURIComponent(id)}`, scope).href;
let routes;
const routeCache = () => routes ??= caches.open(ROUTES);
let preparing;

function packVersion(name) {
  if (name.startsWith(packPrefix)) return Number(/^v(\d+)$/.exec(name.slice(packPrefix.length))?.[1]) || 0;
  return name === "mini-games-v97" ? 97 : 0;
}

async function inspectPack(name) {
  if (!name || !await caches.has(name)) return null;
  const cache = await caches.open(name);
  const keys = new Set((await cache.keys()).map((request) => request.url));
  if (!keys.has(scope.href) || !keys.has(new URL("app.js", scope).href)) return null;
  const meta = keys.has(marker) ? await (await cache.match(marker)).json().catch(() => null) : null;
  // v97 used addAll and shipped this same URL list without a marker.
  const urls = meta?.version === `v${packVersion(name)}` && meta.files
    ? Object.keys(meta.files).map((file) => new URL(file, scope).href)
    : name === "mini-games-v97" ? offlineURLs : null;
  return urls?.length && urls.every((url) => keys.has(url)) ? { name, cache, meta } : null;
}

async function availablePacks() {
  const names = (await caches.keys()).filter(packVersion).sort((a, b) => packVersion(b) - packVersion(a));
  return (await Promise.all(names.map(inspectPack))).filter(Boolean);
}

async function readRoute(id) {
  if (!id) return null;
  if (!currentRoute.has(id)) {
    const route = (await routeCache()).match(routeKey(id)).then(async (response) => response ? response.text() : null);
    currentRoute.set(id, route);
  }
  return currentRoute.get(id);
}

async function pinRoute(id, name) {
  if (!id) return;
  currentRoute.set(id, name);
  const cache = await routeCache();
  if (name) await cache.put(routeKey(id), new Response(name));
  else await cache.delete(routeKey(id));
}

async function prunePacks() {
  const packs = await availablePacks();
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const ids = new Set(windows.map((client) => routeKey(client.id)));
  const routeStore = await routeCache();
  const files = await routeStore.keys();
  const protectedNames = new Set(packs.slice(0, 2).map(({ name }) => name));
  // Keep older versions that still have an open window; remove their route when it closes.
  for (const file of files) {
    if (ids.has(file.url)) protectedNames.add(await (await routeStore.match(file)).text());
    else currentRoute.delete(decodeURIComponent(new URL(file.url).pathname.split("/").at(-1)));
  }
  for (const file of files) if (!ids.has(file.url)) await routeStore.delete(file);
  await Promise.all(packs.filter(({ name }) => !protectedNames.has(name)).map(({ name }) => caches.delete(name)));
}

self.addEventListener("activate", (event) => {
  // Claim without discarding the last usable offline version.
  event.waitUntil(self.clients.claim());
});

async function fingerprint(response, path) {
  const textual = path === "./" || /\.(?:html|js|css|json|svg)$/.test(path);
  const data = textual
    ? new TextEncoder().encode((await response.text()).replaceAll("\r\n", "\n"))
    : await response.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildPack() {
  const response = await fetch(`${marker}?version=${VERSION}`, { cache: "reload" });
  if (!response.ok) throw new Error("The offline inventory could not be fetched.");
  const meta = await response.json();
  if (meta.version !== VERSION || Object.keys(meta.files || {}).length !== APP_ASSETS.length ||
    !APP_ASSETS.every((path) => /^[0-9a-f]{64}$/.test(meta.files?.[path] || ""))) {
    throw new Error("The offline inventory is not ready for this version.");
  }
  const previous = (await availablePacks()).find(({ name }) => name !== CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);
  const candidates = new Set((await cache.keys()).map((request) => request.url));
  async function save(path, url) {
    const hash = meta.files[path];
    const staged = candidates.has(url) && await cache.match(url);
    if (staged && (await fingerprint(staged, path)) === hash) return;
    const reused = await previous?.cache.match(url);
    if (reused && (previous.meta?.files[path] === hash || (!previous.meta && (await fingerprint(reused.clone(), path)) === hash))) {
      await cache.put(url, reused);
      return;
    }
    const download = await fetch(url, { cache: "reload" });
    if (!download.ok || (await fingerprint(download.clone(), path)) !== hash) {
      throw new Error("An arcade file changed or couldn't finish downloading.");
    }
    await cache.put(url, download);
  }
  // Keep memory low on iPad and finish each batch before retry is allowed.
  for (let i = 0; i < APP_ASSETS.length; i += 4) {
    const batch = await Promise.allSettled(APP_ASSETS.slice(i, i + 4).map((path, j) => save(path, offlineURLs[i + j])));
    if (batch.some(({ status }) => status === "rejected")) throw new Error("Offline update incomplete.");
  }
  await cache.put(marker, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
  await prunePacks().catch(() => {});
}

self.addEventListener("message", (event) => {
  const { type } = event.data || {};
  const reply = event.ports[0];
  if (!reply || !["arcade-offline-state", "prepare-arcade"].includes(type)) return;
  event.waitUntil((async () => {
    try {
      const pinned = type === "arcade-offline-state" && await readRoute(event.source?.id);
      const ready = Boolean(await inspectPack(pinned || CACHE_NAME));
      if (!ready && type === "prepare-arcade") {
        preparing ??= buildPack().finally(() => { preparing = undefined; });
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
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (event.request.mode === "navigate" && [scope.pathname, new URL("index.html", scope).pathname].includes(url.pathname)) {
    event.respondWith((async () => {
      let live;
      try { live = await fetch(event.request); } catch { /* Try a complete offline pack. */ }
      if (live?.ok) {
        await pinRoute(event.resultingClientId, null).catch(() => {});
        return live;
      }
      const [offline] = await availablePacks();
      if (!offline) return live || Response.error();
      await pinRoute(event.resultingClientId, offline.name).catch(() => {});
      return await offline.cache.match(scope.href) || live || Response.error();
    })());
    return;
  }
  if (!assetURLs.has(url.href) && !event.clientId) return;
  event.respondWith((async () => {
    const pinned = await readRoute(event.clientId).catch(() => null);
    if (pinned) {
      const oldResponse = await caches.match(event.request, { cacheName: pinned });
      if (oldResponse) return oldResponse;
      if (assetURLs.has(url.href)) return Response.error();
    }
    if (!assetURLs.has(url.href)) return fetch(event.request);
    // A partial update must not supply random files to a live page.
    const ready = async () => await caches.match(marker, { cacheName: CACHE_NAME });
    if (event.request.cache !== "reload" && flightPaths.some((path) => url.pathname.startsWith(path)) && await ready()) {
      const cached = await caches.match(event.request, { cacheName: CACHE_NAME });
      if (cached) return cached;
    }
    try {
      const live = await fetch(event.request);
      if (live.ok) return live;
      return await ready() && await caches.match(event.request, { cacheName: CACHE_NAME }) || live;
    } catch {
      return await ready() && await caches.match(event.request, { cacheName: CACHE_NAME }) || Response.error();
    }
  })());
});
