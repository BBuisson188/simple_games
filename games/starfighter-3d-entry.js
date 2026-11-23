import { createImmersiveGameplay } from "./immersive-gameplay.js";

// Match the flight-pack version in service-worker.js when these resources change.
const FLIGHT_CACHE = "mini-games-starfighter-3d-v2";
const FLIGHT_FILES = [
  "./starfighter-3d/flight.js",
  "./starfighter-3d/scene.js",
  "./starfighter-3d/controls.js",
  "./starfighter-3d/patrol.js",
  "./starfighter-3d/vendor/three.module.js",
  "./starfighter-3d/vendor/three.core.js",
  "./starfighter-3d/vendor/loaders/GLTFLoader.js",
  "./starfighter-3d/vendor/utils/BufferGeometryUtils.js",
  "./starfighter-3d/vendor/utils/SkeletonUtils.js",
  "../assets/starfighter-3d/kestrel.glb"
].map((path) => new URL(path, import.meta.url).href);

export function renderStarfighter3D() {
  return `<section class="panel sf3-panel">
    <div class="sf3-brief" data-sf3-brief>
      <div class="sf3-cover">
        <button class="sf3-button" type="button" data-menu="click">← All games</button>
        <h2>Starfighter 3D</h2>
      </div>
      <div class="sf3-intro">
        <h3>Kestrel asteroid patrol</h3>
        <p>Clear two waves of hostiles. Bank or boost away from red fire, and climb above the asteroid belt for room to turn.</p>
        <p class="sf3-controls-copy">Touch: drag the stick to steer. Hold Fire or Boost with your right thumb.<br>
          Keyboard: arrows or WASD to steer, Q/E to roll, Space to fire, Shift to boost.</p>
        <div class="sf3-start-row">
          <button class="sf3-button sf3-primary" type="button" data-sf3-start disabled>Launch Patrol</button>
          <button class="sf3-button" type="button" data-sf3-retry hidden>Retry download</button>
          <span class="sf3-status" role="status" data-sf3-status>Preparing flight files…</span>
        </div>
      </div>
    </div>
    <div class="sf3-flight" data-sf3-flight hidden>
      <canvas class="sf3-space" tabindex="-1" aria-label="Kestrel chase camera"></canvas>
      <div class="sf3-hud">
        <div class="sf3-readouts">
          <span>Shield <strong data-sf3-shield>3 / 3</strong></span>
          <span>Wave <strong data-sf3-wave>1 / 2</strong></span>
          <span>Hostiles <strong data-sf3-contacts>3</strong></span>
          <span>Target <strong data-sf3-range>—</strong></span>
          <span>Speed <strong data-sf3-speed>—</strong></span>
        </div>
        <div class="sf3-hud-actions">
          <button class="sf3-button" type="button" data-sf3-pause>Pause</button>
          <button class="sf3-button" type="button" data-sf3-exit>Exit Flight</button>
        </div>
      </div>
      <p class="sf3-callout" data-sf3-callout>Track the marked hostile</p>
      <div class="sf3-reticle" data-sf3-reticle aria-hidden="true"></div>
      <div class="sf3-target" data-sf3-target aria-hidden="true"></div>
      <div class="sf3-edge" data-sf3-edge aria-hidden="true" hidden></div>
      <div class="sf3-touch">
        <div class="sf3-stick" data-sf3-stick aria-hidden="true"><span></span></div>
        <div class="sf3-thumbs">
          <button class="sf3-button" type="button" data-sf3-boost>Boost</button>
          <button class="sf3-button sf3-primary" type="button" data-sf3-fire>Fire</button>
        </div>
      </div>
      <div class="sf3-overlay" data-sf3-overlay>
        <div class="sf3-dialog">
          <h3 data-sf3-heading>Launching Kestrel</h3>
          <p data-sf3-detail>Preparing the asteroid belt…</p>
          <button class="sf3-button sf3-primary" type="button" data-sf3-resume hidden>Resume Flight</button>
          <button class="sf3-button sf3-primary" type="button" data-sf3-reset hidden>Restart Patrol</button>
        </div>
      </div>
    </div>
  </section>`;
}

async function cacheFlightFiles() {
  const saved = await caches.open(FLIGHT_CACHE);
  const entries = await Promise.all(FLIGHT_FILES.map((url) => saved.match(url)));
  if (entries.every(Boolean)) return;
  if (!navigator.onLine) throw new Error("Open Starfighter 3D online once to download its flight files.");
  // addAll commits a complete pack only when every response succeeds.
  await saved.addAll(FLIGHT_FILES.map((url) => new Request(url, { cache: "reload" })));
}

export function mountStarfighter3D(panel) {
  const find = (name) => panel.querySelector(`[data-sf3-${name}]`);
  const brief = find("brief");
  const surface = find("flight");
  const start = find("start");
  const status = find("status");
  const retry = find("retry");
  const immersive = createImmersiveGameplay(surface, { orientation: "landscape" });
  const events = new AbortController();
  const options = { signal: events.signal };
  let disposed = false;
  let flightModule;
  let activeFlight;
  let launchId = 0;

  function syncOfflineLabel() {
    if (flightModule && navigator.serviceWorker?.controller && status.dataset.cached === "yes") {
      status.textContent = "Ready offline";
    }
  }

  async function prepare() {
    start.disabled = true;
    retry.hidden = true;
    status.textContent = "Preparing flight files…";
    try {
      try {
        await cacheFlightFiles();
        status.dataset.cached = "yes";
      } catch (error) {
        if (!navigator.onLine) throw error;
      }
      flightModule = await import("./starfighter-3d/flight.js");
      if (disposed) return;
      status.textContent = status.dataset.cached === "yes" ? "Flight files saved" : "Online play available";
      syncOfflineLabel();
      start.disabled = false;
    } catch (error) {
      if (disposed) return;
      status.textContent = navigator.onLine
        ? "Flight files could not load. Try the download again."
        : "Open Starfighter 3D online once to download its flight files.";
      console.warn("Starfighter 3D preparation failed.", error);
      retry.hidden = false;
    }
  }

  function exitFlight() {
    launchId++;
    activeFlight?.();
    activeFlight = undefined;
    void immersive.exit();
    surface.hidden = true;
    brief.hidden = false;
    start.focus({ preventScroll: true });
  }

  async function launch() {
    if (!flightModule || !surface.hidden) return;
    const current = ++launchId;
    brief.hidden = true;
    surface.hidden = false;
    find("overlay").hidden = false;
    find("heading").textContent = "Launching Kestrel";
    find("detail").textContent = "Preparing the asteroid belt…";
    find("resume").hidden = true;
    find("reset").hidden = true;
    const fullscreen = immersive.enter();
    try {
      const cleanup = await flightModule.startFlightTest(surface, () => launchId === current && !disposed, immersive);
      if (launchId !== current || disposed) cleanup?.();
      else activeFlight = cleanup;
    } catch (error) {
      if (launchId !== current || disposed) return;
      find("heading").textContent = "Could not start the flight";
      find("detail").textContent = "Starfighter 3D needs WebGL 2 and a complete flight download. Exit Flight to return to the menu.";
      console.warn("Starfighter 3D launch failed.", error);
    }
    await fullscreen;
    if ((disposed || surface.hidden) && launchId !== current) void immersive.exit();
  }

  start.addEventListener("click", launch, options);
  find("exit").addEventListener("click", exitFlight, options);
  retry.addEventListener("click", prepare, options);
  navigator.serviceWorker?.addEventListener("controllerchange", syncOfflineLabel, options);
  void prepare();

  return () => {
    disposed = true;
    launchId++;
    events.abort();
    activeFlight?.();
    immersive.destroy();
  };
}
