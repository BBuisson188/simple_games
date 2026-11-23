import { createGlobalLeaderboard } from "./global-leaderboard.js";
import { createImmersiveGameplay } from "./immersive-gameplay.js";
import { createAirplaneScenery } from "./airplane-scenery.js";
import { createAircraftPainter } from "./airplane-aircraft.js";

const planes = {
  biplane: {
    name: "Bi-plane",
    turn: 0.9,
    topSpeed: 0.78,
    bankResponse: 8.5,
    note: "Stable turns · slower cruise"
  },
  mustang: {
    name: "Mustang",
    turn: 1.06,
    topSpeed: 1,
    bankResponse: 6.8,
    note: "Balanced speed and handling"
  },
  jet: {
    name: "70s Jet",
    turn: 1.34,
    topSpeed: 1.55,
    bankResponse: 3.4,
    note: "Fastest cruise · wide turns"
  }
};

const stages = [
  {
    name: "Grass Runway",
    terrain: "field",
    enemyPoints: 500,
    enemySpeed: 0.16,
    enemyCount: 16,
    stageBonus: 500,
    fastTime: 34,
    slowTime: 58,
    timeBonus: 1200
  },
  {
    name: "Blue Water Patrol",
    terrain: "water",
    enemyPoints: 650,
    enemySpeed: 0.2,
    enemyCount: 20,
    stageBonus: 800,
    fastTime: 32,
    slowTime: 55,
    timeBonus: 1600
  },
  {
    name: "Farm Country Dash",
    terrain: "farm",
    enemyPoints: 825,
    enemySpeed: 0.24,
    enemyCount: 24,
    stageBonus: 1200,
    fastTime: 30,
    slowTime: 52,
    timeBonus: 2200
  },
  {
    name: "Mountain Pass",
    terrain: "mountain",
    enemyPoints: 1000,
    enemySpeed: 0.3,
    enemyCount: 28,
    stageBonus: 1800,
    fastTime: 28,
    slowTime: 49,
    timeBonus: 3000
  }
];

const LIVES_BONUS = 1000;
const RUNWAY_LIMIT = 24;
const DISTANCE_RATE = 4.2;
const HOSTILE_SHOT_SPEED = 1.7;
const AIRBORNE_MODES = ["takeoff", "flying", "finishing", "crashing"];
const FLIGHT_KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "fire" };
const LEADERBOARD_KEY = "miniGames.airplaneShooterLeaderboard";
const PENDING_GLOBAL_SCORES_KEY = "miniGames.airplaneShooterPendingGlobalScores";
const GAME_ID = "airplane-shooter";
const globalLeaderboard = createGlobalLeaderboard({ gameId: GAME_ID, pendingKey: PENDING_GLOBAL_SCORES_KEY });

function renderPlaneButtons() {
  return Object.entries(planes).map(([id, plane]) => `
    <button class="plane-choice ${id === "mustang" ? "is-selected" : ""}" type="button" data-plane-choice="${id}" aria-pressed="${id === "mustang"}">
      <canvas class="plane-preview" width="220" height="156" data-plane-preview="${id}" aria-hidden="true"></canvas>
      <strong>${plane.name}</strong>
      <span>${plane.note}</span>
    </button>
  `).join("");
}

function renderStageOptions() {
  return stages.map((stage, index) => `
    <option value="${index}">Stage ${index + 1}: ${stage.name}</option>
  `).join("");
}

export function renderAirplaneShooter() {
  return `
    <section class="panel game-panel air-panel">
      <div class="air-game" data-selected-plane="mustang" data-layout="landscape">
        <div class="game-overlay" hidden data-game-overlay></div>
        <div class="game-header air-hangar">
          <div class="air-hangar-nav">
            <button class="secondary-button" type="button" data-menu>← All games</button>
            <button class="secondary-button" type="button" data-show-leaderboard>Leaderboard</button>
          </div>
          <div>
            <h2>Airplane Shooter</h2>
            <p class="intro">Four stages, from the grass runway to the mountain pass.</p>
          </div>
        </div>

        <div class="plane-select" data-plane-select>
          <h3>Choose your plane</h3>
          <div class="plane-choice-grid">
            ${renderPlaneButtons()}
          </div>
          <label class="stage-picker">
            <span>Start stage</span>
            <select data-stage-select>
              ${renderStageOptions()}
            </select>
          </label>
          <button class="primary-button" type="button" data-start-flight>Start Flight</button>
          <p class="air-controls-note">Bank with ← →, change throttle with ↑ ↓, and hold Space to fire. Release to cool down.</p>
        </div>

        <div class="flight-deck" hidden data-flight-deck>
          <div class="canvas-wrap">
            <canvas class="flight-canvas" width="920" height="518" tabindex="-1" aria-label="Airplane Shooter game area"></canvas>
            <div class="air-hud">
              <div class="air-hud-stats">
                <span><small>Score</small><strong data-score>0</strong></span>
                <span><small>Speed</small><strong data-air-speed>0 km/h</strong></span>
                <span><small>Lives</small><strong data-lives>3</strong></span>
              </div>
              <div class="air-hud-actions">
                <button class="air-flight-button" type="button" data-air-pause aria-label="Pause flight">Ⅱ</button>
                <button class="air-flight-button" type="button" data-air-exit-game>Exit Game</button>
              </div>
              <div class="air-route">
                <span data-stage>Grass Runway</span>
                <progress data-air-progress max="100" value="0" aria-label="Stage progress"></progress>
                <strong data-distance>0%</strong>
              </div>
            </div>

            <div class="flight-controls" aria-label="Game controls">
              <div class="control-pad left-pad">
                <button class="control-button" type="button" data-hold="left" aria-label="Bank left">&#8592;</button>
                <button class="control-button" type="button" data-hold="right" aria-label="Bank right">&#8594;</button>
              </div>

              <div class="control-pad right-pad">
                <button class="control-button small-control" type="button" data-throttle-up>Faster</button>
                <div class="throttle-stick" aria-label="Throttle">
                  <span data-throttle-light="4"></span>
                  <span data-throttle-light="3"></span>
                  <span data-throttle-light="2"></span>
                  <span data-throttle-light="1"></span>
                </div>
                <button class="control-button small-control" type="button" data-throttle-down>Slower</button>
                <div class="air-fire">
                  <button class="control-button fire-control" type="button" data-fire>Hold Fire</button>
                  <div class="air-heat">
                    <span data-air-heat-label>Heat</span>
                    <progress data-air-heat max="1" value="0" aria-label="Fire heat"></progress>
                  </div>
                </div>
              </div>
            </div>

            <div class="game-message" data-game-message>
              <strong>Parked on runway</strong>
              <span>Tap Faster until the plane lifts off.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function mountAirplaneShooter(panel) {
  const root = panel.querySelector(".air-game");
  const planeButtons = [...root.querySelectorAll("[data-plane-choice]")];
  const hangar = root.querySelector(".air-hangar");
  const selectScreen = root.querySelector("[data-plane-select]");
  const stageSelect = root.querySelector("[data-stage-select]");
  const flightDeck = root.querySelector("[data-flight-deck]");
  const canvas = root.querySelector(".flight-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = root.querySelector("[data-score]");
  const stageEl = root.querySelector("[data-stage]");
  const livesEl = root.querySelector("[data-lives]");
  const distanceEl = root.querySelector("[data-distance]");
  const speedEl = root.querySelector("[data-air-speed]");
  const progressEl = root.querySelector("[data-air-progress]");
  const heatEl = root.querySelector("[data-air-heat]");
  const heatLabel = root.querySelector("[data-air-heat-label]");
  const fireButton = root.querySelector("[data-fire]");
  const pauseButton = root.querySelector("[data-air-pause]");
  const messageEl = root.querySelector("[data-game-message]");
  const overlayEl = root.querySelector("[data-game-overlay]");
  const throttleLights = [...root.querySelectorAll("[data-throttle-light]")];
  const immersive = createImmersiveGameplay(root, { orientation: "landscape" });
  const drawScenery = createAirplaneScenery();
  const paintAircraft = createAircraftPainter();
  const listeners = new AbortController();
  let viewWidth = canvas.width;
  let viewHeight = canvas.height;
  let pixelRatio = 1;
  let frame;
  let disposed = false;

  const input = { keys: new Set(), pointers: new Map() };
  const state = {
    mode: "select",
    selectedPlane: "mustang",
    selectedStage: 0,
    throttle: 0,
    speed: 0,
    playerX: 0,
    bankVelocity: 0,
    planeY: 0.78,
    runway: 0,
    takeoffBlend: 0,
    distance: 0,
    score: 0,
    enemyScore: 0,
    enemiesShot: 0,
    lives: 3,
    lastTime: 0,
    bulletTimer: 0,
    fireFlash: 0,
    heat: 0,
    overheated: false,
    propSpin: 0,
    crashTime: 0,
    crashX: 0,
    crashY: 0.83,
    crashSpin: 0,
    messageTimer: 0,
    finishGate: null,
    stageTime: 0,
    stallTimer: 0,
    stallWobble: 0,
    stallWarningShown: false,
    enemySchedule: [],
    nextEnemyIndex: 0,
    pausedMode: null,
    bullets: [],
    hostile: [],
    enemies: [],
    bursts: []
  };

  function text(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function held(action) {
    for (const value of input.pointers.values()) if (value === action) return true;
    for (const key of input.keys) if (FLIGHT_KEYS[key] === action) return true;
    return false;
  }

  function clearInputs() {
    input.keys.clear();
    input.pointers.clear();
  }

  function startLoop() {
    if (frame !== undefined) return;
    state.lastTime = 0;
    frame = requestAnimationFrame(loop);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    frame = undefined;
    clearInputs();
  }

  function enterFlight() {
    void immersive.enter().then(() => {
      if (disposed || state.mode === "select") void immersive.exit();
    });
  }

  function stage() {
    return stages[state.selectedStage] || stages[0];
  }

  function setMessage(title, detail) {
    messageEl.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
    messageEl.classList.add("is-visible");
    state.messageTimer = 1.35;
  }

  function setOverlay(title, detail, buttons) {
    overlayEl.hidden = false;
    delete overlayEl.dataset.scoreSaved;
    overlayEl.innerHTML = `
      <div class="overlay-card">
        <h3>${title}</h3>
        <div class="overlay-detail">${detail}</div>
        <div class="overlay-actions">${buttons}</div>
      </div>
    `;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
    overlayEl.innerHTML = "";
    if (state.mode === "paused" && state.pausedMode) {
      state.mode = state.pausedMode;
      state.pausedMode = null;
      enterFlight();
      canvas.focus({ preventScroll: true });
      updateHud();
      startLoop();
    }
  }

  function pause() {
    if (!AIRBORNE_MODES.includes(state.mode)) return;
    state.pausedMode = state.mode;
    state.mode = "paused";
    stopLoop();
    updateHud();
    setOverlay("Flight paused", "<p>Resume from here when you’re ready.</p>",
      '<button class="primary-button" type="button" data-close-overlay>Resume Flight</button><button class="secondary-button" type="button" data-air-exit-game>Exit Game</button>');
    overlayEl.querySelector("[data-close-overlay]").focus({ preventScroll: true });
  }

  function choosePlane(planeId) {
    state.selectedPlane = planeId;
    root.dataset.selectedPlane = planeId;
    planeButtons.forEach((button) => {
      const selected = button.dataset.planeChoice === planeId;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected);
    });
  }

  function updateHud() {
    const distance = Math.min(100, Math.floor(state.distance));
    text(scoreEl, state.score.toLocaleString());
    text(stageEl, stage().name);
    text(livesEl, String(state.lives));
    text(distanceEl, `${distance}%`);
    text(speedEl, `${Math.round(state.speed * 260)} km/h`);
    progressEl.value = distance;
    heatEl.value = state.heat;
    text(heatLabel, state.overheated ? "Cooling" : "Heat");
    fireButton.classList.toggle("is-hot", state.overheated);
    fireButton.classList.toggle("is-firing", state.fireFlash > 0);
    pauseButton.disabled = !AIRBORNE_MODES.includes(state.mode);
    throttleLights.forEach((light) => {
      light.classList.toggle("is-on", state.throttle >= Number(light.dataset.throttleLight));
    });
  }

  function resetStage({ keepRunway = false } = {}) {
    state.mode = keepRunway ? "flying" : "takeoff";
    state.throttle = keepRunway ? Math.max(2, state.throttle) : 0;
    state.speed = keepRunway ? Math.max(0.55, state.speed) : 0;
    state.playerX = 0;
    state.bankVelocity = 0;
    state.planeY = keepRunway ? 0.83 : 0.78;
    state.runway = keepRunway ? 28 : 0;
    state.takeoffBlend = keepRunway ? 1 : 0;
    state.lastTime = 0;
    state.bulletTimer = 0;
    state.crashTime = 0;
    if (!keepRunway) state.stageTime = 0;
    state.stallTimer = 0;
    state.stallWobble = 0;
    state.stallWarningShown = false;
    state.finishGate = null;
    state.bullets = [];
    state.hostile = [];
    state.enemies = [];
    state.bursts = [];
    state.fireFlash = 0;
    state.heat = 0;
    state.overheated = false;
    clearInputs();
  }

  function resizeImmersiveCanvas() {
    if (flightDeck.hidden || !canvas.clientWidth || !canvas.clientHeight) return;
    viewWidth = canvas.clientWidth;
    viewHeight = canvas.clientHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(viewWidth * pixelRatio);
    const height = Math.round(viewHeight * pixelRatio);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    draw();
  }

  function startGame() {
    stopLoop();
    state.selectedStage = Number(stageSelect.value || "0");
    state.score = 0;
    state.enemyScore = 0;
    state.enemiesShot = 0;
    state.lives = 3;
    state.distance = 0;
    prepareEnemySchedule();
    resetStage();
    hangar.hidden = true;
    selectScreen.hidden = true;
    flightDeck.hidden = false;
    overlayEl.classList.add("is-flight-overlay");
    enterFlight();
    hideOverlay();
    canvas.focus({ preventScroll: true });
    resizeImmersiveCanvas();
    updateHud();
    setMessage("Parked on runway", "Tap Faster until the plane lifts off.");
    startLoop();
  }

  function startNextStage() {
    state.selectedStage = Math.min(stages.length - 1, state.selectedStage + 1);
    state.distance = 0;
    prepareEnemySchedule();
    resetStage();
    hideOverlay();
    updateHud();
    setMessage(`Stage ${state.selectedStage + 1}`, `${stage().name}. Throttle up for takeoff.`);
    canvas.focus({ preventScroll: true });
    startLoop();
  }

  function continueAfterCrash() {
    if (state.lives <= 0) {
      restartFromSelect();
      return;
    }
    state.distance = Math.max(0, state.distance - 10);
    resetStage({ keepRunway: true });
    hideOverlay();
    updateHud();
    setMessage("Back in the sky", "Keep flying. Watch for incoming planes.");
    canvas.focus({ preventScroll: true });
    startLoop();
  }

  function restartFromSelect() {
    stopLoop();
    void immersive.exit();
    state.mode = "select";
    state.pausedMode = null;
    state.finishGate = null;
    selectScreen.hidden = false;
    hangar.hidden = false;
    flightDeck.hidden = true;
    overlayEl.classList.remove("is-flight-overlay");
    hideOverlay();
    updateHud();
    root.querySelector("[data-start-flight]").focus({ preventScroll: true });
  }

  function completeStage() {
    if (state.mode !== "flying") return;
    state.mode = "finishing";
    state.finishGate = { depth: 0.98 };
    state.enemies = [];
    state.bullets = [];
    state.hostile = [];
  }

  function showStageComplete() {
    state.mode = "stageComplete";
    state.finishGate = null;
    const currentStage = stage();
    const stageBonus = currentStage.stageBonus;
    const livesBonus = state.lives * LIVES_BONUS;
    const timeBonus = calculateTimeBonus(currentStage, state.stageTime);
    state.score += stageBonus + livesBonus + timeBonus;
    updateHud();

    const isLastStage = state.selectedStage >= stages.length - 1;
    const qualifies = scoreQualifies(state.score);
    setOverlay(
      isLastStage ? "Game Complete" : "Level Complete",
      `${renderScoreBreakdown({
        enemyScore: state.enemyScore,
        enemiesShot: state.enemiesShot,
        stageLabel: `Stage ${state.selectedStage + 1} bonus`,
        stageBonus,
        livesBonus,
        timeBonus,
        total: state.score
      })}${isLastStage && qualifies ? renderFinalScoreForm("Game complete score", state.score) : ""}`,
      isLastStage
        ? `${qualifies ? `<button class="primary-button" type="button" data-save-score>Save Score</button>` : `<button class="primary-button" type="button" data-show-leaderboard>Leaderboard</button>`}<button class="secondary-button" type="button" data-restart-game>Play Again</button>`
        : `<button class="primary-button" type="button" data-next-level>Next Level</button>`
    );
  }

  function renderScoreBreakdown({ enemyScore, enemiesShot, stageLabel, stageBonus, livesBonus, timeBonus, total }) {
    return `
      <dl class="score-breakdown">
        <div><dt>Enemies shot down (${enemiesShot})</dt><dd>${enemyScore}</dd></div>
        <div><dt>${stageLabel}</dt><dd>${stageBonus}</dd></div>
        <div><dt>Lives bonus</dt><dd>${livesBonus}</dd></div>
        <div><dt>Time bonus</dt><dd>${timeBonus}</dd></div>
        <div class="score-total"><dt>Total score</dt><dd>${total}</dd></div>
      </dl>
    `;
  }

  function renderFinalScoreForm(label, total) {
    return `
      <div class="final-score-form">
        <p><strong>${label}: ${total}</strong></p>
        <label>
          <span>Name</span>
          <input data-player-name maxlength="16" autocomplete="off" placeholder="Ace">
        </label>
      </div>
    `;
  }

  function getLeaderboard() {
    try {
      const saved = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
      return Array.isArray(saved)
        ? saved
          .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
          .sort((a, b) => b.score - a.score || String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
          .slice(0, 10)
        : [];
    } catch {
      return [];
    }
  }

  function saveLeaderboard(entries) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 10)));
  }

  function scoreQualifies(score) {
    return score > 0;
  }

  function saveScoreFromOverlay() {
    if (overlayEl.dataset.scoreSaved === "true") return;
    overlayEl.dataset.scoreSaved = "true";
    if (!scoreQualifies(state.score)) {
      showLeaderboard("Leaderboard", { recentEntry: {
        score: state.score,
        stage: state.selectedStage + 1
      } });
      return;
    }
    const nameInput = overlayEl.querySelector("[data-player-name]");
    const name = String(nameInput?.value || "Ace").trim() || "Ace";
    const entries = getLeaderboard();
    const newEntry = {
      id: `score-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.slice(0, 16),
      score: state.score,
      stage: state.selectedStage + 1,
      enemiesShot: state.enemiesShot,
      createdAt: new Date().toISOString()
    };
    entries.push(newEntry);
    entries.sort((a, b) => b.score - a.score);
    const rank = entries.findIndex((entry) => entry.id === newEntry.id) + 1;
    saveLeaderboard(entries);
    globalLeaderboard.queueScore(newEntry.name, newEntry.score);
    globalLeaderboard.syncPendingScores().catch((error) => {
      console.warn("Airplane Shooter global score sync failed; local score remains saved.", error);
    });
    showLeaderboard("Score Saved", { highlightId: newEntry.id, recentEntry: newEntry, rank });
  }

  function formatGlobalDate(date) {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "";
    }
  }

  function renderLeaderboardTable(entries, options = {}) {
    const highlightId = options.highlightId || null;
    const rows = entries.length
      ? entries.map((entry, index) => `
        <tr class="${entry.id === highlightId ? "is-new-score" : ""}">
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.name)}${entry.id === highlightId ? ` <span class="new-score-badge">NEW</span>` : ""}</td>
          <td>${entry.score}</td>
          <td>${entry.pending ? "Pending" : escapeHtml(formatGlobalDate(entry.date || entry.createdAt))}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No scores yet.</td></tr>`;
    const extraRow = options.recentEntry && !entries.some((entry) => entry.id === options.recentEntry.id)
      ? `
        <tr class="score-divider"><td colspan="4"></td></tr>
        <tr class="is-new-score">
          <td>${options.rank ? `Rank ${options.rank}` : "-"}</td>
          <td>Your score <span class="new-score-badge">NEW</span></td>
          <td>${options.recentEntry.score}</td>
          <td>${options.recentEntry.pending ? "Pending" : escapeHtml(formatGlobalDate(options.recentEntry.date || options.recentEntry.createdAt))}</td>
        </tr>
      `
      : "";
    const note = options.error ? `<p class="intro">Global sync pending: ${escapeHtml(options.error)}</p>` : "";
    return `
      ${note}
      <table class="leaderboard-table">
        <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Date</th></tr></thead>
        <tbody>${rows}${extraRow}</tbody>
      </table>
    `;
  }

  function showLeaderboard(title = "Leaderboard", options = {}) {
    if (AIRBORNE_MODES.includes(state.mode)) {
      state.pausedMode = state.mode;
      state.mode = "paused";
      stopLoop();
      state.bankVelocity = 0;
    }

    const entries = globalLeaderboard.getDisplayScores(getLeaderboard());
    setOverlay(
      title,
      renderLeaderboardTable(entries, options),
      `<button class="primary-button" type="button" data-close-overlay>Close</button><button class="secondary-button danger-button" type="button" data-reset-leaderboard>Reset</button>`
    );
    globalLeaderboard.getBestScores(getLeaderboard()).then((result) => {
      if (overlayEl.hidden || !overlayEl.querySelector(".leaderboard-table")) return;
      setOverlay(
        title,
        renderLeaderboardTable(result.scores, { ...options, error: result.error }),
        `<button class="primary-button" type="button" data-close-overlay>Close</button><button class="secondary-button danger-button" type="button" data-reset-leaderboard>Reset</button>`
      );
    }).catch((error) => {
      console.warn("Airplane Shooter global leaderboard refresh failed.", error);
    });
  }

  function confirmResetLeaderboard() {
    setOverlay(
      "Reset Leaderboard?",
      "<p>This clears only the Airplane Shooter leaderboard on this device.</p>",
      `<button class="primary-button danger-button" type="button" data-confirm-reset>Reset Scores</button><button class="secondary-button" type="button" data-show-leaderboard>Cancel</button>`
    );
  }

  function resetLeaderboard() {
    localStorage.removeItem(LEADERBOARD_KEY);
    showLeaderboard("Leaderboard Reset");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function calculateTimeBonus(currentStage, elapsed) {
    if (elapsed >= currentStage.slowTime) return 0;
    if (elapsed <= currentStage.fastTime) return currentStage.timeBonus;
    const range = currentStage.slowTime - currentStage.fastTime;
    const progress = (currentStage.slowTime - elapsed) / range;
    return Math.round(currentStage.timeBonus * progress);
  }

  function buildEnemySchedule(currentStage) {
    const lanes = [0, -0.56, 0.55, -0.62, 0.24, 0.7, -0.30, 0.44];
    const gap = 78 / currentStage.enemyCount;

    return Array.from({ length: currentStage.enemyCount }, (_, index) => {
      const pattern = index < 2 ? "straight" : index % 5 === 4 ? "dive" : index % 4 === 0 ? "straight" : "sweep";
      return {
        at: 7.5 + gap * (index - (index % 4 === 3 ? 0.57 : 0)),
        lane: lanes[(index + state.selectedStage * 2) % lanes.length],
        pattern
      };
    });
  }

  function prepareEnemySchedule() {
    state.enemySchedule = buildEnemySchedule(stage());
    state.nextEnemyIndex = 0;
  }

  function beginCrash(reason = "Crash!") {
    if (!["takeoff", "flying"].includes(state.mode)) return;
    const wasTakeoff = state.mode === "takeoff";
    state.mode = "crashing";
    state.lives -= 1;
    state.crashTime = 0;
    state.crashX = state.playerX;
    state.crashY = wasTakeoff ? state.planeY : 0.83;
    state.crashSpin = 0;
    state.bullets = [];
    state.hostile = [];
    state.enemies = [];
    state.bursts.push({ x: state.playerX, depth: 0.08, age: 0 });
    clearInputs();
    state.bankVelocity = 0;
    setMessage(reason, "Hold tight...");
    updateHud();
  }

  function finishCrash() {
    state.mode = "crashed";
    if (state.lives <= 0) {
      setOverlay(
        "Game Over",
        scoreQualifies(state.score) ? renderFinalScoreForm("Final score", state.score) : `<p>Final score: <strong>${state.score}</strong></p>`,
        `${scoreQualifies(state.score) ? `<button class="primary-button" type="button" data-save-score>Save Score</button>` : `<button class="primary-button" type="button" data-show-leaderboard>Leaderboard</button>`}<button class="secondary-button" type="button" data-restart-game>Restart</button>`
      );
      return;
    }

    setOverlay(
      "Plane Down",
      `${state.lives} lives left. Continue from the sky.`,
      `<button class="primary-button" type="button" data-continue-flight>Continue</button>`
    );
  }

  function fire() {
    if (state.mode !== "flying" || state.bulletTimer > 0 || state.overheated) return;
    state.bullets.push({ x: state.playerX, depth: 0.095 });
    state.bulletTimer = 0.14;
    state.fireFlash = 0.075;
    state.heat = Math.min(1, state.heat + 0.14);
    if (state.heat >= 1) {
      state.overheated = true;
      setMessage("Fire overheated", "Release the trigger to cool faster.");
    }
  }

  function spawnEnemy(scheduleItem) {
    const { lane, pattern } = scheduleItem;
    state.enemies.push({
      x: lane,
      lane,
      age: 0,
      depth: 0.98,
      sweep: pattern === "straight" ? 0.035 : pattern === "sweep" ? 0.24 + state.selectedStage * 0.025 : 0.12,
      direction: lane > 0 ? -1 : 1,
      dive: pattern === "dive",
      armed: pattern === "dive" && state.selectedStage > 0,
      fired: false
    });
  }

  function updateTakeoff(dt, plane) {
    const targetSpeed = (state.throttle / 4) * plane.topSpeed;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 1.8);
    state.runway += state.speed * dt * 24;
    if (state.runway > RUNWAY_LIMIT && state.speed < 0.45 && state.takeoffBlend < 0.18) {
      beginCrash("Runway overrun");
      return;
    }
    if (state.speed > 0.45 && state.runway > 12) {
      state.takeoffBlend = Math.min(1, state.takeoffBlend + dt * (0.62 + state.speed * 0.35));
      state.planeY = 0.78 + state.takeoffBlend * 0.05;
      if (state.takeoffBlend < 0.07) setMessage("Lifting off", "Get ready to bank.");
    }
    if (state.takeoffBlend >= 1) {
      state.mode = "flying";
      setMessage("Wheels up", state.selectedStage > 0
        ? "Bank away from the red shots. Fire in short bursts."
        : "Line up the reticle and hold Fire in short bursts.");
    }
  }

  function updateFlying(dt, plane) {
    const currentStage = stage();
    const targetSpeed = (state.throttle / 4) * plane.topSpeed;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 1.8);
    state.stageTime += dt;
    const targetBank = Number(held("right")) - Number(held("left"));
    const reversing = targetBank !== 0 && Math.sign(targetBank) !== Math.sign(state.bankVelocity) && Math.abs(state.bankVelocity) > 0.08;
    const response = reversing ? plane.bankResponse * 0.48 : plane.bankResponse;
    state.bankVelocity += (targetBank - state.bankVelocity) * Math.min(1, dt * response);
    state.playerX += state.bankVelocity * plane.turn * dt;
    state.playerX = Math.max(-1, Math.min(1, state.playerX));
    state.distance += state.speed * dt * DISTANCE_RATE;
    updateStall(dt);
    if (state.mode !== "flying") return;

    spawnScheduledEnemies();

    if (state.distance >= 100) completeStage();
  }

  function spawnScheduledEnemies() {
    while (state.nextEnemyIndex < state.enemySchedule.length) {
      const scheduleItem = state.enemySchedule[state.nextEnemyIndex];
      if (state.distance < scheduleItem.at) break;
      spawnEnemy(scheduleItem);
      state.nextEnemyIndex += 1;
    }
  }

  function updateStall(dt) {
    const safeSpeed = 0.2;
    if (state.speed < safeSpeed) {
      state.stallTimer += dt;
      state.stallWobble += dt * 8;
      if (state.stallTimer > 1 && !state.stallWarningShown) {
        state.stallWarningShown = true;
        setMessage("Stall warning", "Throttle up fast to recover.");
      }
      if (state.stallTimer > 3.2) {
        beginCrash("Stall crash");
      }
      return;
    }

    const recovery = state.throttle >= 4 ? dt * 1.6 : state.throttle >= 3 ? dt * 1.1 : dt * 0.35;
    state.stallTimer = Math.max(0, state.stallTimer - recovery);
    if (state.stallTimer === 0) {
      state.stallWarningShown = false;
      state.stallWobble = 0;
    } else {
      state.stallWobble += dt * 5;
    }
  }

  function updateObjects(dt) {
    const currentStage = stage();
    state.bulletTimer = Math.max(0, state.bulletTimer - dt);
    state.fireFlash = Math.max(0, state.fireFlash - dt);
    const firing = held("fire");
    state.heat = Math.max(0, state.heat - dt * (firing && !state.overheated ? 0.12 : firing ? 0.46 : 0.72));
    if (state.overheated && state.heat < 0.35) state.overheated = false;
    if (firing) fire();
    state.propSpin += dt * (10 + state.speed * 30);

    state.enemies.forEach((enemy) => {
      enemy.previousDepth = enemy.depth;
      enemy.age += dt;
      enemy.x = enemy.lane + Math.sin(enemy.age * 1.65) * enemy.sweep * enemy.direction;
      enemy.depth -= dt * (currentStage.enemySpeed + state.speed * 0.28 + (enemy.dive && enemy.depth < 0.5 ? 0.16 : 0));
      if (enemy.armed && !enemy.fired && enemy.depth < 0.61) {
        enemy.fired = true;
        state.hostile.push({ x: enemy.x, depth: enemy.depth });
      }
    });

    for (const bullet of state.bullets) {
      const prior = bullet.depth;
      bullet.depth += dt * 1.82;
      let target = null;
      for (const enemy of state.enemies) {
        if (enemy.hit || Math.abs(bullet.x - enemy.x) >= 0.14) continue;
        // Both objects move in depth. Test the swept interval between animation frames.
        if (prior - enemy.previousDepth <= 0.055 && bullet.depth - enemy.depth >= -0.055
            && (!target || enemy.depth < target.depth)) target = enemy;
      }
      if (!target) continue;
      target.hit = true;
      bullet.hit = true;
      state.enemiesShot += 1;
      state.enemyScore += currentStage.enemyPoints;
      state.score += currentStage.enemyPoints;
      state.bursts.push({ x: target.x, depth: target.depth, age: 0, points: currentStage.enemyPoints });
    }

    state.bullets = state.bullets.filter((bullet) => !bullet.hit && bullet.depth < 1.05);
    const collision = state.mode === "flying" && state.enemies.some((enemy) =>
      !enemy.hit && enemy.depth < 0.085 && Math.abs(enemy.x - state.playerX) < 0.21);
    for (const shot of state.hostile) shot.depth -= dt * HOSTILE_SHOT_SPEED;
    const hit = state.mode === "flying" && state.hostile.some((shot) =>
      shot.depth < 0.083 && Math.abs(shot.x - state.playerX) < 0.12);
    if (collision || hit) beginCrash(collision ? "Midair collision" : "Hit by return fire");
    else {
      state.enemies = state.enemies.filter((enemy) => !enemy.hit && enemy.depth >= 0.085);
      state.hostile = state.hostile.filter((shot) => shot.depth >= 0.083);
    }

    state.bursts.forEach((burst) => {
      burst.age += dt;
    });
    state.bursts = state.bursts.filter((burst) => burst.age < 0.72);

    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        messageEl.classList.remove("is-visible");
      }
    }

    if (state.mode === "finishing" && state.finishGate) {
      state.finishGate.depth -= dt * (0.45 + state.speed * 0.12);
      if (state.finishGate.depth < 0.12) {
        showStageComplete();
      }
    }
  }

  function updateCrash(dt) {
    state.crashTime += dt;
    state.crashY += dt * 0.34;
    state.crashSpin += dt * 6.5;
    state.speed *= 0.995;
    if (state.crashTime > 2.4) finishCrash();
  }

  function update(dt) {
    const plane = planes[state.selectedPlane];
    if (state.mode === "takeoff") updateTakeoff(dt, plane);
    if (state.mode === "flying") updateFlying(dt, plane);
    if (state.mode === "crashing") updateCrash(dt);
    updateObjects(dt);
    updateHud();
  }

  function worldToScreen(x, depth) {
    const w = viewWidth;
    const h = viewHeight;
    const horizon = h * 0.34;
    const near = 1 - depth;
    return {
      x: w * 0.5 + x * w * (0.115 + near * 0.17935),
      y: horizon + Math.pow(near, 1.55) * h * 0.56,
      scale: 0.35 + near * 1.8
    };
  }

  function drawBackground() {
    drawScenery(ctx, viewWidth, viewHeight, stage().terrain, state);
    drawRunway();
    drawFinishGate();
  }

  function drawRunway() {
    const w = viewWidth;
    const h = viewHeight;
    const horizon = h * 0.34;
    const fade = 1 - Math.min(1, Math.max(0, state.takeoffBlend));
    const slide = state.takeoffBlend * h * 0.52;
    if (fade <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(0, slide);
    const tarmac = ctx.createLinearGradient(0, horizon, 0, h);
    tarmac.addColorStop(0, "#82928f");
    tarmac.addColorStop(1, "#313f4e");
    ctx.fillStyle = tarmac;
    ctx.beginPath();
    ctx.moveTo(w * 0.46, horizon);
    ctx.lineTo(w * 0.54, horizon);
    ctx.lineTo(w * 0.76, h);
    ctx.lineTo(w * 0.24, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f9edcf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.31, h);
    ctx.lineTo(w * 0.47, horizon);
    ctx.moveTo(w * 0.69, h);
    ctx.lineTo(w * 0.53, horizon);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const near = ((i * 0.1 + state.runway * 0.028) % 1) ** 2;
      const y = horizon + (h - horizon) * near;
      const spread = w * (0.034 + 0.162 * near);
      const size = 1 + 3.7 * near;
      ctx.fillStyle = "#365275";
      for (const side of [-1, 1]) {
        const x = w * 0.5 + side * spread;
        ctx.fillRect(x - size, y - size * 0.55, size * 2, size * 1.45);
        ctx.fillStyle = "#e0f7fe";
        ctx.fillRect(x - size * 0.55, y - size * 0.25, size * 1.1, size * 0.55);
        ctx.fillStyle = "#365275";
      }
    }

    ctx.strokeStyle = "#f9f5d7";
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i += 1) {
      const y = horizon + ((i * 58 + state.runway * 18) % (h - horizon));
      const length = 8 + (y - horizon) * 0.04;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y);
      ctx.lineTo(w * 0.5, y + length);
      ctx.stroke();
    }
    drawRunwayEnd(horizon, h, fade);
    ctx.restore();
  }

  function drawRunwayEnd(horizon, h) {
    const remaining = Math.max(0, RUNWAY_LIMIT - state.runway);
    if (remaining > 9 || state.takeoffBlend > 0.25) return;

    const t = 1 - remaining / 9;
    const y = horizon + Math.pow(t, 1.75) * (h - horizon);
    const width = 48 + t * viewWidth * 0.55;
    const stripeHeight = 8 + t * 16;
    const x = viewWidth / 2 - width / 2;

    ctx.fillStyle = "#f7f2d9";
    ctx.fillRect(x, y, width, stripeHeight);
    const checks = 10;
    for (let i = 0; i < checks; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#20252a" : "#f7f2d9";
      ctx.fillRect(x + (width / checks) * i, y, width / checks, stripeHeight);
    }
  }

  function drawFinishGate() {
    if (state.mode !== "finishing" || !state.finishGate) return;
    const left = worldToScreen(-0.62, state.finishGate.depth);
    const right = worldToScreen(0.62, state.finishGate.depth);
    drawCheckeredFlag(left.x, left.y, left.scale, -1);
    drawCheckeredFlag(right.x, right.y, right.scale, 1);
  }

  function drawCheckeredFlag(x, y, scale, side) {
    const pole = 44 * scale;
    const flagW = 40 * scale;
    const flagH = 28 * scale;
    ctx.strokeStyle = "#f8f0cc";
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y - pole);
    ctx.lineTo(x, y + pole * 0.45);
    ctx.stroke();

    const startX = x + side * 2 * scale;
    const topY = y - pole;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cellW = flagW / 4;
        const drawX = side > 0 ? startX + col * cellW : startX - (col + 1) * cellW;
        ctx.fillStyle = (row + col) % 2 === 0 ? "#f8f8f8" : "#20252a";
        ctx.fillRect(drawX, topY + row * flagH / 3, cellW, flagH / 3);
      }
    }
  }

  function drawBullets() {
    for (const bullet of state.bullets) {
      const nose = worldToScreen(bullet.x, bullet.depth);
      const tail = worldToScreen(bullet.x, Math.max(0, bullet.depth - 0.072));
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(nose.x, nose.y);
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(239,153,64,.68)";
      ctx.lineWidth = 4.8 * nose.scale;
      ctx.stroke();
      ctx.lineWidth = 1.7 * nose.scale;
      ctx.strokeStyle = "#fff5bb";
      ctx.stroke();
    }
    for (const shot of state.hostile) {
      const tip = worldToScreen(shot.x, shot.depth);
      const tail = worldToScreen(shot.x, shot.depth + 0.055);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.strokeStyle = "#d34461";
      ctx.lineWidth = 6.3 * tip.scale;
      ctx.stroke();
      ctx.strokeStyle = "#ffe0d5";
      ctx.lineWidth = 2.6 * tip.scale;
      ctx.stroke();
    }
  }

  function drawEnemies() {
    for (const enemy of [...state.enemies].sort((a, b) => b.depth - a.depth)) {
      const point = worldToScreen(enemy.x, enemy.depth);
      paintAircraft(ctx, "interceptor", point.x, point.y, 0.32 * point.scale * aircraftScale(), {
        bank: Math.cos(enemy.age * 1.65) * enemy.sweep * enemy.direction * 1.7,
        moving: true
      });
      if (enemy.armed && !enemy.fired && enemy.depth < 0.81) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, (16 + (0.81 - enemy.depth) * 25) * point.scale, 0, Math.PI * 2);
        ctx.strokeStyle = "#ff9aab";
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      if (enemy.dive || enemy.depth < 0.32) {
        const radius = 22 * point.scale * aircraftScale();
        ctx.strokeStyle = enemy.depth < 0.32 ? "#ffd38aed" : "#f7e4bd9c";
        ctx.lineWidth = 1.6;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(point.x + side * (radius - 7), point.y + radius * 0.48);
          ctx.lineTo(point.x + side * radius, point.y + radius * 0.48);
          ctx.lineTo(point.x + side * radius, point.y + radius * 0.24);
          ctx.stroke();
        }
      }
    }
  }

  function drawReticle() {
    if (state.mode !== "flying") return;
    const point = worldToScreen(state.playerX, 0.54);
    const aligned = state.enemies.some((enemy) => enemy.depth > 0.2 && enemy.depth < 0.85 && Math.abs(enemy.x - state.playerX) < 0.14);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.shadowColor = "#0d2833";
    ctx.shadowBlur = 4;
    ctx.strokeStyle = aligned ? "#fff3a8" : "#ebf6ecaf";
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.arc(0, 0, 11, -0.42, 0.42);
    ctx.moveTo(-11 * Math.cos(0.42), 11 * Math.sin(0.42));
    ctx.arc(0, 0, 11, Math.PI - 0.42, Math.PI + 0.42, false);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  function drawBursts() {
    for (const burst of state.bursts) {
      const point = worldToScreen(burst.x, burst.depth);
      const age = burst.age / 0.72;
      const spread = (8 + age * 62) * point.scale;
      ctx.save();
      ctx.translate(point.x, point.y);
      for (let i = 0; i < 9; i++) {
        const angle = i * 2.399;
        const dx = Math.cos(angle) * spread * (0.49 + (i % 4) * 0.15);
        const dy = Math.sin(angle) * spread * 0.78 - age * 8;
        const radius = (4 + age * 13) * point.scale * (0.7 + (i % 3) * 0.14);
        ctx.globalAlpha = (1 - age) * 0.56;
        ctx.fillStyle = i % 2 === 0 ? "#2e4650" : "#56656a";
        ctx.beginPath();
        ctx.arc(dx * 0.55, dy * 0.55, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, 1 - age * 1.4);
        ctx.strokeStyle = i % 3 === 0 ? "#fff5b8" : "#f79850";
        ctx.lineWidth = Math.max(1, 2.1 * point.scale);
        ctx.beginPath();
        ctx.moveTo(dx * 0.72, dy * 0.72);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }
      if (age < 0.24) {
        ctx.globalAlpha = 1 - age * 4;
        ctx.fillStyle = "#fff1b0";
        ctx.beginPath();
        ctx.arc(0, 0, (7 + age * 41) * point.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      if (burst.points) {
        ctx.globalAlpha = Math.min(1, 2.5 * (1 - age));
        ctx.textAlign = "center";
        ctx.font = "800 17px system-ui";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#163343";
        ctx.fillStyle = "#fff0b8";
        const label = `+${burst.points}`;
        const y = -20 - age * 28;
        ctx.strokeText(label, 0, y);
        ctx.fillText(label, 0, y);
      }
      ctx.restore();
    }
  }

  function aircraftScale() {
    return Math.max(0.66, Math.min(1.38, viewHeight / 610, viewWidth / 670));
  }

  function drawPlayer() {
    const w = viewWidth;
    const h = viewHeight;
    const stallAmount = Math.min(1, state.stallTimer / 3.2);
    const stallWobble = stallAmount > 0 ? Math.sin(state.stallWobble) * stallAmount : 0;
    const x = w * 0.5 + state.playerX * w * 0.28 + stallWobble * 18;
    const y = h * (state.planeY + stallAmount * 0.07);
    const bank = state.bankVelocity + stallWobble * 0.8;
    const moving = state.speed > 0.12 || state.mode !== "takeoff";
    const size = aircraftScale() * (state.mode === "takeoff" ? 0.9 + state.speed * 0.2 : 1);
    if (state.mode === "takeoff" && state.takeoffBlend < 0.85) {
      ctx.fillStyle = `rgba(15,27,39,${0.36 * (1 - state.takeoffBlend)})`;
      ctx.beginPath();
      ctx.ellipse(x + 16 * size, y + (28 + 43 * state.takeoffBlend) * size, 60 * size, 9 * size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.mode === "flying" && Math.abs(bank) > 0.46) {
      ctx.strokeStyle = "rgba(240,255,250,.40)";
      ctx.lineWidth = 1.4 * size;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * 43 * size, y + side * bank * 12 * size);
        ctx.quadraticCurveTo(x + (side * 47 - bank * 9) * size, y + 24 * size, x + (side * 63 - bank * 20) * size, y + 55 * size);
        ctx.stroke();
      }
    }
    paintAircraft(ctx, state.selectedPlane, x, y, size, {
      bank,
      moving,
      prop: state.propSpin
    });
  }

  function drawCrashPlane() {
    const w = viewWidth;
    const h = viewHeight;
    const x = w * 0.5 + state.crashX * w * 0.28;
    const y = h * state.crashY;
    paintAircraft(ctx, state.selectedPlane, x, y, aircraftScale(), { spin: state.crashSpin });
    ctx.strokeStyle = "rgba(50,50,50,0.45)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 20);
    ctx.quadraticCurveTo(x - 50, y - 55, x - 80, y - 70);
    ctx.stroke();
    ctx.strokeStyle = "rgba(30,30,30,0.22)";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 8);
    ctx.quadraticCurveTo(x - 36, y - 38, x - 70, y - 46);
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    drawBackground();
    drawBullets();
    drawEnemies();
    drawBursts();
    if (state.mode === "crashing" || state.mode === "crashed") {
      drawCrashPlane();
    } else {
      drawPlayer();
    }
    drawReticle();
    const shade = ctx.createLinearGradient(0, 0, 0, viewHeight);
    shade.addColorStop(0, "#112f4773");
    shade.addColorStop(0.2, "#112f4700");
    shade.addColorStop(0.73, "#112f4700");
    shade.addColorStop(1, "#0d2238aa");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  function loop(time) {
    frame = undefined;
    if (!canvas.isConnected || !AIRBORNE_MODES.includes(state.mode)) return;
    const dt = state.lastTime ? Math.min(0.04, (time - state.lastTime) / 1000) : 0;
    state.lastTime = time;
    update(dt);
    draw();
    if (AIRBORNE_MODES.includes(state.mode)) frame = requestAnimationFrame(loop);
  }

  function runButtonCommand(target) {
    const planeButton = target.closest("[data-plane-choice]");
    if (planeButton) {
      choosePlane(planeButton.dataset.planeChoice);
      return true;
    }
    if (target.closest("[data-air-exit-game]")) {
      restartFromSelect();
      return true;
    }
    if (target.closest("[data-air-pause]")) {
      pause();
      return true;
    }
    if (target.closest("[data-start-flight]")) {
      startGame();
      return true;
    }
    if (target.closest("[data-throttle-up]")) {
      changeThrottle(1);
      canvas.focus({ preventScroll: true });
      return true;
    }
    if (target.closest("[data-throttle-down]")) {
      changeThrottle(-1);
      canvas.focus({ preventScroll: true });
      return true;
    }
    if (target.closest("[data-continue-flight]")) {
      continueAfterCrash();
      return true;
    }
    if (target.closest("[data-next-level]")) {
      startNextStage();
      return true;
    }
    if (target.closest("[data-restart-game]")) {
      restartFromSelect();
      return true;
    }
    if (target.closest("[data-show-leaderboard]")) {
      showLeaderboard();
      return true;
    }
    if (target.closest("[data-save-score]")) {
      saveScoreFromOverlay();
      return true;
    }
    if (target.closest("[data-reset-leaderboard]")) {
      confirmResetLeaderboard();
      return true;
    }
    if (target.closest("[data-confirm-reset]")) {
      resetLeaderboard();
      return true;
    }
    if (target.closest("[data-close-overlay]")) {
      hideOverlay();
      return true;
    }
    return false;
  }

  function changeThrottle(direction) {
    if (state.mode !== "takeoff" && state.mode !== "flying") return;
    state.throttle = Math.max(0, Math.min(4, state.throttle + direction));
    updateHud();
  }

  function listen(element, type, handler, options) {
    element.addEventListener(type, handler, { ...options, signal: listeners.signal });
  }

  listen(panel, "click", (event) => {
    if (runButtonCommand(event.target)) event.stopPropagation();
    else if (event.detail === 0 && event.target.closest("[data-fire]")) fire();
  });
  listen(panel, "pointerdown", (event) => {
    if (event.button !== 0 || !AIRBORNE_MODES.includes(state.mode)) return;
    const button = event.target.closest("[data-fire], [data-hold]");
    if (!button) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const action = button.dataset.hold || "fire";
    input.pointers.set(event.pointerId, action);
    if (action === "fire") fire();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    listen(panel, type, (event) => input.pointers.delete(event.pointerId));
  }
  listen(panel, "touchmove", (event) => {
    if (immersive.isActive() && overlayEl.hidden) event.preventDefault();
  }, { passive: false });

  listen(window, "keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.("input, select, textarea")) return;
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) {
      if (state.mode === "paused" && overlayEl.querySelector("[data-close-overlay]")) hideOverlay();
      else pause();
      return;
    }
    if (!AIRBORNE_MODES.includes(state.mode)) return;
    if (event.code === "ArrowUp" || event.code === "ArrowDown") {
      event.preventDefault();
      if (!event.repeat) changeThrottle(event.code === "ArrowUp" ? 1 : -1);
    } else if (FLIGHT_KEYS[event.code] && (event.code !== "Space" || !event.target.closest?.("button"))) {
      event.preventDefault();
      input.keys.add(event.code);
      if (event.code === "Space" && !event.repeat) fire();
    }
  });
  listen(window, "keyup", (event) => input.keys.delete(event.code));
  listen(window, "blur", pause);
  listen(document, "visibilitychange", () => { if (document.hidden) pause(); });
  for (const type of ["fullscreenchange", "webkitfullscreenchange"]) {
    listen(document, type, () => { if (!immersive.isActive()) pause(); });
  }
  const observer = new ResizeObserver(resizeImmersiveCanvas);
  observer.observe(flightDeck);

  for (const preview of root.querySelectorAll("[data-plane-preview]")) {
    const context = preview.getContext("2d");
    paintAircraft(context, preview.dataset.planePreview, preview.width / 2, preview.height / 2, 1.15);
  }
  updateHud();
  return () => {
    disposed = true;
    state.mode = "select";
    stopLoop();
    listeners.abort();
    observer.disconnect();
    immersive.destroy();
  };
}
