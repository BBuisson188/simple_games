import { createImmersiveGameplay } from "./immersive-gameplay.js";
import { askOfflineWorker } from "../offline.js";

const FLIGHT_CACHE_PREFIX = "mini-games-starfighter-3d-";

export function renderStarfighter3D() {
  return `<section class="panel sf3-panel">
    <div class="sf3-brief" data-sf3-brief>
      <div class="sf3-cover">
        <button class="sf3-button" type="button" data-menu="click">← All games</button>
        <h2>Starfighter 3D</h2>
      </div>
      <div class="sf3-intro">
        <h3>Choose a level</h3>
        <p>Fly three stages, from Verdant Orbit to the Death Star trench. Start at Stage 1 to fly them in order, or pick a later stage to test it directly.</p>
        <p class="sf3-controls-copy">Touch: drag the stick to steer. Hold Fire or Boost with your right thumb.<br>
          Keyboard: arrows or WASD to steer, Q/E to roll, Space to fire, Shift to boost, T to launch a locked torpedo.</p>
        <div class="sf3-start-row">
          <label class="sf3-difficulty"><span id="sf3-fighter-label">Your ship</span>
            <select class="sf3-button" data-sf3-fighter aria-labelledby="sf3-fighter-label">
              <option value="jedi">Jedi Fighter</option>
              <option value="rebel">Rebel Fighter</option>
            </select>
          </label>
          <label class="sf3-difficulty">Difficulty
            <select class="sf3-button" data-sf3-difficulty aria-describedby="sf3-difficulty-help">
              <option value="rookie">Rookie</option>
              <option value="standard">Standard</option>
              <option value="ace">Ace</option>
            </select>
          </label>
          <label class="sf3-difficulty"><span id="sf3-carrier-label">Level</span>
            <select class="sf3-button" data-sf3-carrier aria-labelledby="sf3-carrier-label">
              <option value="ironwake">1 · Verdant Orbit</option>
              <option value="longbow">2 · Fleet Battle</option>
              <option value="trench">3 · Death Star Trench</option>
            </select>
          </label>
          <button class="sf3-button sf3-primary" type="button" data-sf3-start disabled>Launch Patrol</button>
          <button class="sf3-button" type="button" data-sf3-retry hidden>Retry download</button>
          <span class="sf3-status" role="status" data-sf3-status>Preparing flight files…</span>
        </div>
        <p id="sf3-difficulty-help" class="sf3-controls-copy" data-sf3-difficulty-help></p>
      </div>
    </div>
    <div class="sf3-flight" data-sf3-flight hidden>
      <canvas class="sf3-space" tabindex="-1" aria-label="Fighter chase camera"></canvas>
      <div class="sf3-hud">
        <div class="sf3-readouts">
          <span>Shield <strong data-sf3-shield>3 / 3</strong></span>
          <span>Stage <strong data-sf3-stage>Fighters</strong></span>
          <span>Fighters down <strong data-sf3-kills>0 / 8</strong></span>
          <span>Hostiles <strong data-sf3-contacts>0</strong></span>
          <span data-sf3-wingmen hidden>Wingmen <strong data-sf3-allies>7</strong><small data-sf3-wing-skill></small></span>
          <span>Target <strong data-sf3-range>—</strong></span>
          <span>Speed <strong data-sf3-speed>—</strong></span>
        </div>
        <div class="sf3-hud-actions">
          <button class="sf3-button" type="button" data-sf3-pause>Pause</button>
          <button class="sf3-button" type="button" data-sf3-exit>Exit Flight</button>
        </div>
      </div>
      <p class="sf3-callout" data-sf3-callout>Hyperspace signatures</p>
      <div class="sf3-lock-banner" data-sf3-lock hidden>
        <span data-sf3-lock-status></span><progress aria-label="Torpedo lock" data-sf3-lock-meter max="1" value="0"></progress>
      </div>
      <div class="sf3-reticle" data-sf3-reticle aria-hidden="true"></div>
      <div class="sf3-target" data-sf3-target aria-hidden="true"></div>
      <div class="sf3-edge" data-sf3-edge aria-hidden="true" hidden></div>
      <div class="sf3-touch">
        <div class="sf3-stick" data-sf3-stick aria-hidden="true"><span></span></div>
        <div class="sf3-thumbs">
          <button class="sf3-button sf3-torpedo" type="button" data-sf3-torpedo hidden disabled>Torpedo</button>
          <button class="sf3-button" type="button" data-sf3-boost>Boost</button>
          <button class="sf3-button sf3-primary" type="button" data-sf3-fire>Fire</button>
        </div>
      </div>
      <div class="sf3-overlay" data-sf3-overlay>
        <div class="sf3-dialog">
          <h3 data-sf3-heading>Launching fighter</h3>
          <p data-sf3-detail>Preparing the asteroid belt…</p>
          <button class="sf3-button sf3-primary" type="button" data-sf3-resume hidden>Resume Flight</button>
          <button class="sf3-button sf3-primary" type="button" data-sf3-reset hidden>Restart Stage</button>
          <button class="sf3-button sf3-primary" type="button" data-sf3-next hidden>Jump to next stage</button>
        </div>
      </div>
    </div>
  </section>`;
}

async function waitForFlightUpdate() {
  const workers = navigator.serviceWorker;
  const previous = workers?.controller;
  if (!previous || !globalThis.caches) return;
  const oldPackExists = async () => (await caches.keys().catch(() => []))
    .some((name) => name.startsWith(FLIGHT_CACHE_PREFIX));
  if (!(await oldPackExists())) return;
  // A previous worker serves its heavy modules cache-first until the replacement claims this page.
  if (workers.controller === previous) {
    void workers.getRegistration().then((registration) => registration?.update()).catch(() => {});
  }
  const deadline = performance.now() + 8500;
  // controllerchange can arrive before the new worker finishes cleaning up old caches.
  while (performance.now() < deadline) {
    if (!(await oldPackExists()) && workers.controller?.state === "activated") return;
    await new Promise((resolve) => setTimeout(resolve, 160));
  }
  if (await oldPackExists()) throw new Error("Waiting for the updated arcade to take control.");
}

export function mountStarfighter3D(panel) {
  const find = (name) => panel.querySelector(`[data-sf3-${name}]`);
  const brief = find("brief");
  const surface = find("flight");
  const start = find("start");
  const status = find("status");
  const retry = find("retry");
  const difficulty = find("difficulty");
  const carrier = find("carrier");
  const fighter = find("fighter");
  const descriptions = {
    rookie: "Slower fighters, wider aim assist, and a quicker torpedo lock.",
    standard: "Faster fighters, tighter aim assist, and more return fire.",
    ace: "Fighters close to your cruise speed, with faster attacks and a tighter torpedo lock."
  };
  const difficultyKey = "mini-games-starfighter-3d-difficulty";
  const fighterKey = "mini-games-starfighter-3d-fighter";
  try {
    const saved = localStorage.getItem(difficultyKey);
    if (Object.hasOwn(descriptions, saved)) difficulty.value = saved;
    if (localStorage.getItem(fighterKey) === "rebel") fighter.value = "rebel";
  } catch { /* Storage can be unavailable in private or embedded browsers. */ }
  function updateDifficulty() {
    find("difficulty-help").textContent = descriptions[difficulty.value];
    try { localStorage.setItem(difficultyKey, difficulty.value); } catch { /* Optional preference. */ }
  }
  const immersive = createImmersiveGameplay(surface, { orientation: "landscape" });
  const events = new AbortController();
  const options = { signal: events.signal };
  let disposed = false;
  let flightModule;
  let activeFlight;
  let launchId = 0;

  async function syncOfflineLabel() {
    if (!flightModule || disposed) return;
    const ready = await askOfflineWorker("arcade-offline-state").catch(() => false);
    if (!disposed) status.textContent = ready ? "Ready for offline use" : "Save for offline from All games";
  }

  async function prepare() {
    start.disabled = true;
    retry.hidden = true;
    status.textContent = "Preparing flight files…";
    try {
      await waitForFlightUpdate();
      flightModule = await import("./starfighter-3d/flight.js");
      if (disposed) return;
      status.textContent = "Flight ready";
      start.disabled = false;
      void syncOfflineLabel();
    } catch (error) {
      if (disposed) return;
      status.textContent = navigator.onLine
        ? "Flight files could not load. Try the download again."
        : "Go online and choose Prepare offline from All games.";
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

  async function launch(destination) {
    const advancing = typeof destination === "string";
    if (!flightModule || (!surface.hidden && !advancing)) return;
    const current = ++launchId;
    if (advancing) {
      activeFlight?.();
      activeFlight = undefined;
      carrier.value = destination;
    }
    const fighterVariant = fighter.value;
    const fighterName = fighter.selectedOptions[0].textContent;
    brief.hidden = true;
    surface.hidden = false;
    find("overlay").hidden = false;
    find("heading").textContent = `Launching ${fighterName}`;
    surface.querySelector("canvas").setAttribute("aria-label", `${fighterName} chase camera`);
    find("detail").textContent = carrier.value === "trench" ? "Destroy the exhaust port on the Death Star."
      : carrier.value === "longbow" ? "Preparing the fleet battle…" : "Preparing the asteroid belt…";
    find("resume").hidden = true;
    find("reset").hidden = true;
    find("next").hidden = true;
    const fullscreen = immersive.isActive() ? Promise.resolve() : immersive.enter();
    try {
      const cleanup = await flightModule.startFlightTest(surface, () => launchId === current && !disposed,
        immersive, difficulty.value, carrier.value, fighterVariant);
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
  find("next").addEventListener("click", (event) => {
    if (event.currentTarget.hidden) return;
    const destination = event.currentTarget.dataset.level;
    if (destination === "brief") exitFlight();
    else if (destination === "longbow" || destination === "trench") void launch(destination);
  }, options);
  retry.addEventListener("click", prepare, options);
  difficulty.addEventListener("change", updateDifficulty, options);
  fighter.addEventListener("change", () => {
    try { localStorage.setItem(fighterKey, fighter.value); } catch { /* Optional preference. */ }
  }, options);
  navigator.serviceWorker?.addEventListener("controllerchange", syncOfflineLabel, options);
  updateDifficulty();
  void prepare();

  return () => {
    disposed = true;
    launchId++;
    events.abort();
    activeFlight?.();
    immersive.destroy();
  };
}
