const planes = {
  biplane: {
    name: "Bi-plane",
    color: "#c9482c",
    accent: "#f6c453",
    turn: 0.9,
    topSpeed: 0.78,
    bankResponse: 8.5,
    note: "Steady and easy.",
    prop: true
  },
  mustang: {
    name: "Mustang",
    color: "#2d6fab",
    accent: "#e9edf0",
    turn: 1.06,
    topSpeed: 1,
    bankResponse: 6.8,
    note: "Balanced fighter.",
    prop: true
  },
  jet: {
    name: "70s Jet",
    color: "#586371",
    accent: "#ff7a45",
    turn: 1.34,
    topSpeed: 1.55,
    bankResponse: 3.4,
    note: "Fast and twitchy.",
    prop: false
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
const LEADERBOARD_KEY = "miniGames.airplaneShooterLeaderboard";
let currentGame = null;

function renderPlaneButtons() {
  return Object.entries(planes).map(([id, plane]) => `
    <button class="plane-choice ${id === "mustang" ? "is-selected" : ""}" type="button" data-plane-choice="${id}">
      <canvas class="plane-preview" width="110" height="78" data-plane-preview="${id}" aria-hidden="true"></canvas>
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
  if (typeof document !== "undefined") {
    setTimeout(() => initAirplaneShooter(), 0);
  }

  return `
    <section class="panel game-panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
        <button class="secondary-button" type="button" data-show-leaderboard>Leaderboard</button>
      </div>
      <div class="air-game" data-selected-plane="mustang" data-layout="portrait">
        <div class="game-overlay" hidden data-game-overlay></div>
        <div class="game-header">
          <div>
            <h2>Airplane Shooter</h2>
            <p class="intro">Throttle up, lift off, bank left or right, and shoot down incoming planes.</p>
          </div>
        </div>

        <div class="layout-toggle" aria-label="Layout">
          <button class="secondary-button is-selected" type="button" data-layout-choice="portrait">Portrait</button>
          <button class="secondary-button" type="button" data-layout-choice="landscape">Landscape</button>
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
          <button class="primary-button" type="button" data-start-flight>Start Level</button>
        </div>

        <div class="flight-deck" hidden data-flight-deck>
          <div class="canvas-wrap">
            <canvas class="flight-canvas" width="520" height="620" aria-label="Airplane Shooter game area"></canvas>
            <div class="game-stats surface-stats" aria-live="polite">
              <span>Stage <strong data-stage>1</strong></span>
              <span>Score <strong data-score>0</strong></span>
              <span>Lives <strong data-lives>3</strong></span>
              <span>Distance <strong data-distance>0%</strong></span>
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
                <button class="control-button fire-control" type="button" data-fire>Fire</button>
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

function initAirplaneShooter() {
  const root = document.querySelector(".air-game");
  if (!root) return;
  const panel = root.closest(".game-panel");
  if (currentGame) currentGame.stop();

  const planeButtons = [...root.querySelectorAll("[data-plane-choice]")];
  const layoutButtons = [...root.querySelectorAll("[data-layout-choice]")];
  const selectScreen = root.querySelector("[data-plane-select]");
  const stageSelect = root.querySelector("[data-stage-select]");
  const flightDeck = root.querySelector("[data-flight-deck]");
  const canvas = root.querySelector(".flight-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = root.querySelector("[data-score]");
  const stageEl = root.querySelector("[data-stage]");
  const livesEl = root.querySelector("[data-lives]");
  const distanceEl = root.querySelector("[data-distance]");
  const messageEl = root.querySelector("[data-game-message]");
  const overlayEl = root.querySelector("[data-game-overlay]");
  const throttleLights = [...root.querySelectorAll("[data-throttle-light]")];

  const input = { left: false, right: false };
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
    enemies: [],
    bursts: []
  };

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
      state.lastTime = 0;
      requestAnimationFrame(loop);
    }
  }

  function choosePlane(planeId) {
    state.selectedPlane = planeId;
    root.dataset.selectedPlane = planeId;
    planeButtons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.planeChoice === planeId);
    });
  }

  function setLayout(layout) {
    root.dataset.layout = layout;
    canvas.width = layout === "landscape" ? 920 : 520;
    canvas.height = layout === "landscape" ? 518 : 620;
    layoutButtons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.layoutChoice === layout);
    });
    draw();
  }

  function updateHud() {
    scoreEl.textContent = state.score;
    stageEl.textContent = String(state.selectedStage + 1);
    livesEl.textContent = String(state.lives);
    distanceEl.textContent = `${Math.min(100, Math.floor(state.distance))}%`;
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
    state.stageTime = 0;
    state.stallTimer = 0;
    state.stallWobble = 0;
    state.stallWarningShown = false;
    state.finishGate = null;
    state.bullets = [];
    state.enemies = [];
    state.bursts = [];
    input.left = false;
    input.right = false;
  }

  function startGame() {
    state.selectedStage = Number(stageSelect.value || "0");
    state.score = 0;
    state.enemyScore = 0;
    state.enemiesShot = 0;
    state.lives = 3;
    state.distance = 0;
    prepareEnemySchedule();
    resetStage();
    selectScreen.hidden = true;
    flightDeck.hidden = false;
    hideOverlay();
    updateHud();
    setMessage("Parked on runway", "Tap Faster until the plane lifts off.");
    requestAnimationFrame(loop);
  }

  function startNextStage() {
    state.selectedStage = Math.min(stages.length - 1, state.selectedStage + 1);
    state.distance = 0;
    prepareEnemySchedule();
    resetStage();
    hideOverlay();
    updateHud();
    setMessage(`Stage ${state.selectedStage + 1}`, `${stage().name}. Throttle up for takeoff.`);
    requestAnimationFrame(loop);
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
    requestAnimationFrame(loop);
  }

  function restartFromSelect() {
    state.mode = "select";
    state.finishGate = null;
    selectScreen.hidden = false;
    flightDeck.hidden = true;
    hideOverlay();
    updateHud();
  }

  function completeStage() {
    if (state.mode !== "flying") return;
    state.mode = "finishing";
    state.finishGate = { depth: 0.98 };
    state.enemies = [];
    state.bullets = [];
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
      })}${isLastStage ? renderFinalScoreForm("Game complete score", state.score) : ""}`,
      isLastStage
        ? `<button class="primary-button" type="button" data-save-score>Save Score</button><button class="secondary-button" type="button" data-restart-game>Play Again</button>`
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
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveLeaderboard(entries) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 10)));
  }

  function saveScoreFromOverlay() {
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
    showLeaderboard("Score Saved", { highlightId: newEntry.id, recentEntry: newEntry, rank });
  }

  function showLeaderboard(title = "Leaderboard", options = {}) {
    if (["takeoff", "flying", "finishing", "crashing"].includes(state.mode)) {
      state.pausedMode = state.mode;
      state.mode = "paused";
      input.left = false;
      input.right = false;
      state.bankVelocity = 0;
    }

    const entries = getLeaderboard();
    const highlightId = options.highlightId || null;
    const rows = entries.length
      ? entries.map((entry, index) => `
        <tr class="${entry.id === highlightId ? "is-new-score" : ""}">
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.name)}${entry.id === highlightId ? ` <span class="new-score-badge">NEW</span>` : ""}</td>
          <td>${entry.score}</td>
          <td>${entry.stage}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No scores yet.</td></tr>`;
    const extraRow = options.recentEntry && !entries.some((entry) => entry.id === options.recentEntry.id)
      ? `
        <tr class="score-divider"><td colspan="4"></td></tr>
        <tr class="is-new-score">
          <td>Rank ${options.rank}</td>
          <td>Your score <span class="new-score-badge">NEW</span></td>
          <td>${options.recentEntry.score}</td>
          <td>${options.recentEntry.stage}</td>
        </tr>
      `
      : "";

    setOverlay(
      title,
      `
        <table class="leaderboard-table">
          <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Stage</th></tr></thead>
          <tbody>${rows}${extraRow}</tbody>
        </table>
      `,
      `<button class="primary-button" type="button" data-close-overlay>Close</button><button class="secondary-button danger-button" type="button" data-reset-leaderboard>Reset</button>`
    );
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
    const lanes = [-0.72, -0.45, -0.18, 0, 0.18, 0.45, 0.72];
    const start = 10;
    const end = 92;
    const gap = (end - start) / currentStage.enemyCount;

    return Array.from({ length: currentStage.enemyCount }, (_, index) => {
      const lane = lanes[(index * 3 + state.selectedStage) % lanes.length];
      return {
        at: start + gap * index + gap * 0.45,
        lane,
        used: false
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
    state.enemies = [];
    state.bursts.push({ x: state.playerX, depth: 0.08, age: 0 });
    input.left = false;
    input.right = false;
    state.bankVelocity = 0;
    setMessage(reason, "Hold tight...");
    updateHud();
  }

  function finishCrash() {
    state.mode = "crashed";
    if (state.lives <= 0) {
      setOverlay(
        "Game Over",
        renderFinalScoreForm("Final score", state.score),
        `<button class="primary-button" type="button" data-save-score>Save Score</button><button class="secondary-button" type="button" data-restart-game>Restart</button>`
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
    if (state.mode !== "flying" || state.bulletTimer > 0) return;
    state.bullets.push({ x: state.playerX, depth: 0.18 });
    state.bulletTimer = 0.22;
  }

  function spawnEnemy(scheduleItem) {
    const jitter = (Math.random() * 0.18) - 0.09;
    state.enemies.push({
      x: Math.max(-0.82, Math.min(0.82, scheduleItem.lane + jitter)),
      depth: 0.98,
      drift: Math.random() > 0.5 ? 0.06 : -0.06,
      wobble: Math.random() * Math.PI * 2
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
      setMessage("Lifting off", "The runway is dropping away. Get ready to bank.");
    }
    if (state.takeoffBlend >= 1) {
      state.mode = "flying";
      setMessage("Wheels up", "Bank left or right and fire at enemy planes.");
    }
  }

  function updateFlying(dt, plane) {
    const currentStage = stage();
    const targetSpeed = (state.throttle / 4) * plane.topSpeed;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 1.8);
    state.stageTime += dt;
    const targetBank = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const reversing = targetBank !== 0 && Math.sign(targetBank) !== Math.sign(state.bankVelocity) && Math.abs(state.bankVelocity) > 0.08;
    const response = reversing ? plane.bankResponse * 0.48 : plane.bankResponse;
    state.bankVelocity += (targetBank - state.bankVelocity) * Math.min(1, dt * response);
    state.playerX += state.bankVelocity * plane.turn * dt;
    state.playerX = Math.max(-1, Math.min(1, state.playerX));
    state.distance += state.speed * dt * DISTANCE_RATE;
    updateStall(dt);

    spawnScheduledEnemies();

    if (state.distance >= 100) completeStage();
  }

  function spawnScheduledEnemies() {
    while (state.nextEnemyIndex < state.enemySchedule.length) {
      const scheduleItem = state.enemySchedule[state.nextEnemyIndex];
      if (state.distance < scheduleItem.at) break;
      scheduleItem.used = true;
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
    state.propSpin += dt * (10 + state.speed * 30);

    state.bullets.forEach((bullet) => {
      bullet.depth += dt * 1.45;
    });
    state.bullets = state.bullets.filter((bullet) => bullet.depth < 1.05);

    state.enemies.forEach((enemy) => {
      enemy.wobble += dt * 3;
      enemy.x += Math.sin(enemy.wobble) * enemy.drift * dt;
      enemy.depth -= dt * (currentStage.enemySpeed + state.speed * 0.28);
    });

    state.bullets.forEach((bullet) => {
      state.enemies.forEach((enemy) => {
        if (enemy.hit) return;
        if (Math.abs(bullet.x - enemy.x) < 0.16 && Math.abs(bullet.depth - enemy.depth) < 0.09) {
          enemy.hit = true;
          bullet.hit = true;
          state.enemiesShot += 1;
          state.enemyScore += currentStage.enemyPoints;
          state.score += currentStage.enemyPoints;
          state.bursts.push({ x: enemy.x, depth: enemy.depth, age: 0 });
        }
      });
    });

    state.bullets = state.bullets.filter((bullet) => !bullet.hit);
    state.enemies = state.enemies.filter((enemy) => {
      if (enemy.hit) return false;
      if (enemy.depth < 0.08) {
        if (state.mode === "flying" && Math.abs(enemy.x - state.playerX) < 0.32) {
          beginCrash();
        }
        return false;
      }
      return true;
    });

    state.bursts.forEach((burst) => {
      burst.age += dt;
    });
    state.bursts = state.bursts.filter((burst) => burst.age < 0.55);

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
    const w = canvas.width;
    const h = canvas.height;
    const horizon = h * 0.34;
    const near = 1 - depth;
    return {
      x: w * 0.5 + x * w * (0.12 + near * 0.26),
      y: horizon + Math.pow(near, 1.55) * h * 0.6,
      scale: 0.35 + near * 1.8
    };
  }

  function drawBackground() {
    const w = canvas.width;
    const h = canvas.height;
    const horizon = h * 0.34;
    const currentStage = stage();

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#5faee8");
    sky.addColorStop(0.55, "#a9ddfb");
    sky.addColorStop(1, "#e6f7ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    drawClouds(horizon);

    if (currentStage.terrain === "water") {
      drawWater(horizon);
    } else if (currentStage.terrain === "mountain") {
      drawField(horizon, "#718850", "#41633f");
      drawMountains(horizon);
    } else if (currentStage.terrain === "farm") {
      drawField(horizon, "#9dbb5f", "#5f943d");
      drawFarmRows(horizon);
    } else {
      drawField(horizon, "#82c66f", "#4f9b5d");
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(0, horizon - 2, w, 4);
    drawRunway();
    drawFinishGate();
    if (state.takeoffBlend > 0.35 || state.mode === "flying" || state.mode === "crashing") {
      drawTerrainStripes();
    }
  }

  function drawClouds(horizon) {
    const w = canvas.width;
    const drift = (state.distance * 5 + state.runway * 1.5) % (w + 220);
    const clouds = [
      { x: 80, y: horizon * 0.28, s: 1.05 },
      { x: 310, y: horizon * 0.18, s: 0.75 },
      { x: 520, y: horizon * 0.35, s: 0.9 }
    ];

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    clouds.forEach((cloud) => {
      const x = ((cloud.x - drift * 0.25) % (w + 220)) - 90;
      drawCloud(x, cloud.y, cloud.s);
    });
  }

  function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30 * scale, y + 3 * scale, 30 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 26 * scale, y + 4 * scale, 24 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 2 * scale, y - 9 * scale, 22 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawField(horizon, top, bottom) {
    const h = canvas.height;
    const ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, top);
    ground.addColorStop(1, bottom);
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, canvas.width, h - horizon);

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i += 1) {
      const y = horizon + ((i * 82 + state.distance * 9) % (h - horizon));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(canvas.width * 0.25, y + 24, canvas.width * 0.65, y - 18, canvas.width, y + 10);
      ctx.stroke();
    }
  }

  function drawWater(horizon) {
    const h = canvas.height;
    const water = ctx.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, "#4ca9d7");
    water.addColorStop(1, "#1f6792");
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, canvas.width, h - horizon);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const y = horizon + ((i * 56 + state.distance * 10) % (h - horizon));
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.quadraticCurveTo(canvas.width * 0.5, y + 14, canvas.width - 30, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 16; i += 1) {
      const x = (i * 73 + state.distance * 11) % canvas.width;
      const y = horizon + 40 + ((i * 41 + state.distance * 14) % (h - horizon - 40));
      ctx.fillRect(x, y, 34, 3);
    }
  }

  function drawMountains(horizon) {
    ctx.fillStyle = "#536563";
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(70, horizon - 70);
    ctx.lineTo(150, horizon);
    ctx.lineTo(235, horizon - 95);
    ctx.lineTo(335, horizon);
    ctx.lineTo(430, horizon - 65);
    ctx.lineTo(canvas.width, horizon);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8f9c8d";
    ctx.beginPath();
    ctx.moveTo(70, horizon - 70);
    ctx.lineTo(50, horizon - 25);
    ctx.lineTo(91, horizon - 27);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(235, horizon - 95);
    ctx.lineTo(205, horizon - 30);
    ctx.lineTo(268, horizon - 34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(430, horizon - 65);
    ctx.lineTo(405, horizon - 22);
    ctx.lineTo(458, horizon - 24);
    ctx.closePath();
    ctx.fill();
  }

  function drawFarmRows(horizon) {
    ctx.strokeStyle = "rgba(90, 70, 40, 0.22)";
    for (let i = 0; i < 8; i += 1) {
      const x = i * 78 + ((state.distance * 6) % 78);
      ctx.beginPath();
      ctx.moveTo(x, horizon);
      ctx.lineTo(x - 120, canvas.height);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(120, 82, 39, 0.26)";
    for (let i = 0; i < 10; i += 1) {
      const y = horizon + ((i * 70 + state.distance * 12) % (canvas.height - horizon));
      ctx.fillRect(0, y, canvas.width, 12);
    }
  }

  function drawRunway() {
    const w = canvas.width;
    const h = canvas.height;
    const horizon = h * 0.34;
    const fade = 1 - Math.min(1, Math.max(0, state.takeoffBlend));
    const slide = state.takeoffBlend * h * 0.52;
    if (fade <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(0, slide);
    ctx.fillStyle = "#454b52";
    ctx.beginPath();
    ctx.moveTo(w * 0.46, horizon);
    ctx.lineTo(w * 0.54, horizon);
    ctx.lineTo(w * 0.76, h);
    ctx.lineTo(w * 0.24, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.31, h);
    ctx.lineTo(w * 0.47, horizon);
    ctx.moveTo(w * 0.69, h);
    ctx.lineTo(w * 0.53, horizon);
    ctx.stroke();

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
    const width = 48 + t * canvas.width * 0.55;
    const stripeHeight = 8 + t * 16;
    const x = canvas.width / 2 - width / 2;

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

  function drawTerrainStripes() {
    const w = canvas.width;
    const h = canvas.height;
    const horizon = h * 0.34;
    ctx.strokeStyle = "rgba(25, 70, 44, 0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      const y = horizon + ((i * 72 + state.distance * 8) % (h - horizon));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 14);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(24, 72, 45, 0.18)";
    for (let i = 0; i < 12; i += 1) {
      const near = ((i * 0.17 + state.distance * 0.012) % 1);
      const y = horizon + Math.pow(near, 1.4) * (h - horizon);
      const x = (i * 97 + state.distance * 23) % w;
      const size = 3 + near * 16;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.8, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlaneShape(x, y, scale, planeId, bank = 0, options = {}) {
    const plane = planes[planeId];
    const isEnemy = options.enemy;
    const propMoving = options.propMoving;
    const spin = options.spin || 0;
    const crashed = options.crashed;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bank * 0.35 + (crashed ? spin : 0));
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#162426";
    ctx.lineWidth = 2;

    if (planeId === "biplane") drawBiplane(plane, isEnemy, propMoving, spin);
    if (planeId === "mustang") drawMustang(plane, isEnemy, propMoving, spin);
    if (planeId === "jet") drawJet(plane, isEnemy);

    ctx.restore();
  }

  function planeColor(plane, isEnemy) {
    return isEnemy ? "#8f3030" : plane.color;
  }

  function drawPropeller(y, moving, spin) {
    ctx.strokeStyle = moving ? "rgba(235,245,255,0.7)" : "#252a2d";
    ctx.lineWidth = moving ? 2 : 4;
    if (moving) {
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(spin);
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "rgba(235,245,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(0, y, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(-14, y);
    ctx.lineTo(14, y);
    ctx.moveTo(0, y - 8);
    ctx.lineTo(0, y + 8);
    ctx.stroke();
  }

  function drawBiplane(plane, isEnemy, propMoving, spin) {
    const body = isEnemy ? "#b94a48" : "#f2331e";
    const wing = isEnemy ? "#d7b66a" : "#f6c21a";
    const stripe = isEnemy ? "#f8e7a3" : "#f2f2f2";
    const cockpit = "#5b95d9";
    const trim = "#000";
    const strut = "#2f2f2f";
    const tire = "#5c5c5c";

    ctx.save();
    ctx.scale(0.28, 0.28);
    ctx.translate(-256, -245);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;

    // Far nose cap behind the body.
    ctx.beginPath();
    ctx.moveTo(236, 74);
    ctx.quadraticCurveTo(256, 50, 276, 74);
    ctx.lineTo(272, 92);
    ctx.quadraticCurveTo(256, 86, 240, 92);
    ctx.closePath();
    ctx.fillStyle = "#f2f2f2";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(243, 73);
    ctx.quadraticCurveTo(256, 59, 269, 73);
    ctx.lineTo(267, 82);
    ctx.quadraticCurveTo(256, 79, 245, 82);
    ctx.closePath();
    ctx.fillStyle = "#b98649";
    ctx.fill();
    ctx.stroke();

    // Upper wings.
    ctx.beginPath();
    ctx.moveTo(56, 130);
    ctx.quadraticCurveTo(56, 112, 77, 112);
    ctx.lineTo(215, 112);
    ctx.quadraticCurveTo(231, 112, 231, 129);
    ctx.lineTo(231, 136);
    ctx.quadraticCurveTo(231, 152, 215, 152);
    ctx.lineTo(77, 152);
    ctx.quadraticCurveTo(56, 152, 56, 134);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(281, 129);
    ctx.quadraticCurveTo(281, 112, 297, 112);
    ctx.lineTo(435, 112);
    ctx.quadraticCurveTo(456, 112, 456, 130);
    ctx.lineTo(456, 134);
    ctx.quadraticCurveTo(456, 152, 435, 152);
    ctx.lineTo(297, 152);
    ctx.quadraticCurveTo(281, 152, 281, 136);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = stripe;
    ctx.fillRect(124, 112, 34, 40);
    ctx.strokeRect(124, 112, 34, 40);
    ctx.fillRect(354, 112, 34, 40);
    ctx.strokeRect(354, 112, 34, 40);

    // Lower wings.
    ctx.beginPath();
    ctx.moveTo(70, 222);
    ctx.quadraticCurveTo(70, 203, 92, 203);
    ctx.lineTo(220, 203);
    ctx.quadraticCurveTo(241, 203, 241, 221);
    ctx.lineTo(241, 229);
    ctx.quadraticCurveTo(241, 247, 220, 247);
    ctx.lineTo(92, 247);
    ctx.quadraticCurveTo(70, 247, 70, 228);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(271, 221);
    ctx.quadraticCurveTo(271, 203, 292, 203);
    ctx.lineTo(420, 203);
    ctx.quadraticCurveTo(442, 203, 442, 222);
    ctx.lineTo(442, 228);
    ctx.quadraticCurveTo(442, 247, 420, 247);
    ctx.lineTo(292, 247);
    ctx.quadraticCurveTo(271, 247, 271, 229);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = stripe;
    ctx.fillRect(126, 203, 36, 44);
    ctx.strokeRect(126, 203, 36, 44);
    ctx.fillRect(350, 203, 36, 44);
    ctx.strokeRect(350, 203, 36, 44);

    // Interplane struts.
    ctx.strokeStyle = strut;
    ctx.lineWidth = 7;
    [
      [104, 152, 122, 203],
      [134, 152, 122, 203],
      [170, 152, 206, 203],
      [200, 152, 170, 203],
      [408, 152, 390, 203],
      [378, 152, 390, 203],
      [342, 152, 306, 203],
      [312, 152, 342, 203]
    ].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Fuselage.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(227, 90);
    ctx.bezierCurveTo(237, 86, 247, 84, 256, 84);
    ctx.bezierCurveTo(265, 84, 275, 86, 285, 90);
    ctx.lineTo(285, 261);
    ctx.bezierCurveTo(285, 291, 276, 322, 265, 350);
    ctx.lineTo(259, 367);
    ctx.quadraticCurveTo(256, 377, 253, 367);
    ctx.lineTo(247, 350);
    ctx.bezierCurveTo(236, 322, 227, 291, 227, 261);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    // Canopy.
    ctx.beginPath();
    ctx.ellipse(256, 166, 22, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = cockpit;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(256, 166, 28, 30, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center rear fin.
    ctx.beginPath();
    ctx.moveTo(256, 236);
    ctx.bezierCurveTo(245, 236, 242, 247, 242, 268);
    ctx.lineTo(242, 345);
    ctx.bezierCurveTo(242, 359, 247, 374, 256, 391);
    ctx.bezierCurveTo(265, 374, 270, 359, 270, 345);
    ctx.lineTo(270, 268);
    ctx.bezierCurveTo(270, 247, 267, 236, 256, 236);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    // Tailplanes.
    ctx.beginPath();
    ctx.moveTo(138, 287);
    ctx.bezierCurveTo(166, 271, 199, 268, 230, 275);
    ctx.lineTo(238, 322);
    ctx.bezierCurveTo(203, 327, 167, 327, 139, 323);
    ctx.bezierCurveTo(123, 321, 121, 297, 138, 287);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(374, 287);
    ctx.bezierCurveTo(346, 271, 313, 268, 282, 275);
    ctx.lineTo(274, 322);
    ctx.bezierCurveTo(309, 327, 345, 327, 373, 323);
    ctx.bezierCurveTo(389, 321, 391, 297, 374, 287);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(172, 306);
    ctx.lineTo(229, 306);
    ctx.moveTo(283, 306);
    ctx.lineTo(340, 306);
    ctx.stroke();

    ctx.strokeStyle = strut;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(256, 391);
    ctx.lineTo(256, 407);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 416, 8, 0, Math.PI * 2);
    ctx.fillStyle = tire;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();

    // Keep the propeller animated separately so the SVG-style body can stay crisp.
    ctx.save();
    ctx.translate(0, -50);
    if (propMoving) {
      ctx.rotate(spin || 0);
      ctx.fillStyle = "rgba(70,70,70,0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(spin || 0);
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.moveTo(0, -20);
      ctx.lineTo(0, 20);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#999";
    ctx.fill();
    ctx.restore();
  }

  function drawMustang(plane, isEnemy, propMoving, spin) {
    const body = isEnemy ? "#8f9aa2" : "#d9d9dc";
    const shadow = isEnemy ? "#4f5056" : "#444";
    const red = isEnemy ? "#c74b46" : "#f2331e";
    const yellow = isEnemy ? "#d6b040" : "#f1be1a";
    const cockpit = isEnemy ? "#6db4df" : "#4fa9ee";
    const trim = "#000";
    const panel = "#7a7a7a";

    ctx.save();
    ctx.scale(0.28, 0.28);
    ctx.translate(-256, -250);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;

    // Spinner and checker nose band. The propeller is intentionally animated separately.
    ctx.beginPath();
    ctx.moveTo(237, 97);
    ctx.quadraticCurveTo(256, 64, 275, 97);
    ctx.lineTo(272, 110);
    ctx.quadraticCurveTo(256, 105, 240, 110);
    ctx.closePath();
    ctx.fillStyle = red;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(226, 102, 60, 30);
    ctx.fillStyle = yellow;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = red;
    ctx.fillRect(226, 102, 15, 15);
    ctx.fillRect(256, 102, 15, 15);
    ctx.fillRect(241, 117, 15, 15);
    ctx.fillRect(271, 117, 15, 15);

    // Main wings.
    ctx.beginPath();
    ctx.moveTo(38, 196);
    ctx.quadraticCurveTo(38, 166, 72, 164);
    ctx.lineTo(210, 154);
    ctx.quadraticCurveTo(231, 152, 231, 176);
    ctx.lineTo(231, 258);
    ctx.quadraticCurveTo(231, 276, 212, 275);
    ctx.lineTo(74, 252);
    ctx.quadraticCurveTo(38, 246, 38, 221);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(474, 196);
    ctx.quadraticCurveTo(474, 166, 440, 164);
    ctx.lineTo(302, 154);
    ctx.quadraticCurveTo(281, 152, 281, 176);
    ctx.lineTo(281, 258);
    ctx.quadraticCurveTo(281, 276, 300, 275);
    ctx.lineTo(438, 252);
    ctx.quadraticCurveTo(474, 246, 474, 221);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = panel;
    ctx.lineWidth = 2;
    [[98, 172, 94, 246], [150, 161, 148, 260], [362, 260, 374, 161], [414, 246, 420, 172], [72, 198, 230, 208], [282, 208, 440, 198]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    ctx.fillStyle = shadow;
    ctx.fillRect(154, 155, 32, 118);
    ctx.fillRect(326, 155, 32, 118);
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(186, 155, 24, 118);
    ctx.fillRect(302, 155, 24, 118);

    // Fuselage.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(226, 132);
    ctx.bezierCurveTo(235, 129, 245, 128, 256, 128);
    ctx.bezierCurveTo(267, 128, 277, 129, 286, 132);
    ctx.lineTo(289, 270);
    ctx.bezierCurveTo(289, 311, 278, 355, 266, 395);
    ctx.lineTo(261, 413);
    ctx.quadraticCurveTo(256, 426, 251, 413);
    ctx.lineTo(246, 395);
    ctx.bezierCurveTo(234, 355, 223, 311, 223, 270);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadow;
    ctx.fillRect(223, 268, 66, 28);
    ctx.fillStyle = red;
    ctx.fillRect(246, 295, 20, 118);

    // Canopy.
    ctx.beginPath();
    ctx.ellipse(256, 198, 17, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = cockpit;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(239, 198);
    ctx.quadraticCurveTo(256, 168, 273, 198);
    ctx.stroke();
    ctx.strokeStyle = "#8fd0ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 170);
    ctx.lineTo(256, 228);
    ctx.stroke();

    // Tailplanes.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(126, 326);
    ctx.quadraticCurveTo(126, 295, 158, 300);
    ctx.lineTo(229, 312);
    ctx.quadraticCurveTo(246, 315, 246, 333);
    ctx.lineTo(246, 364);
    ctx.quadraticCurveTo(246, 377, 230, 378);
    ctx.lineTo(154, 373);
    ctx.quadraticCurveTo(126, 371, 126, 346);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(386, 326);
    ctx.quadraticCurveTo(386, 295, 354, 300);
    ctx.lineTo(283, 312);
    ctx.quadraticCurveTo(266, 315, 266, 333);
    ctx.lineTo(266, 364);
    ctx.quadraticCurveTo(266, 377, 282, 378);
    ctx.lineTo(358, 373);
    ctx.quadraticCurveTo(386, 371, 386, 346);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = panel;
    ctx.lineWidth = 2;
    [[168, 313, 168, 375], [344, 313, 344, 375], [142, 351, 244, 351], [268, 351, 370, 351]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Star roundel.
    ctx.fillStyle = "#14379e";
    ctx.beginPath();
    ctx.arc(108, 202, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(74, 195, 68, 14);
    ctx.beginPath();
    ctx.moveTo(108, 180);
    ctx.lineTo(114, 193);
    ctx.lineTo(128, 194);
    ctx.lineTo(117, 203);
    ctx.lineTo(120, 217);
    ctx.lineTo(108, 209);
    ctx.lineTo(96, 217);
    ctx.lineTo(99, 203);
    ctx.lineTo(88, 194);
    ctx.lineTo(102, 193);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#14379e";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(108, 202, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeRect(74, 195, 68, 14);

    ctx.restore();

    ctx.save();
    ctx.translate(0, -50);
    ctx.rotate(spin || 0);
    if (propMoving) {
      ctx.fillStyle = "rgba(60,60,60,0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 19, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(22, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#999";
    ctx.fill();
    ctx.restore();
  }

  function drawJet(plane, isEnemy) {
    const body = isEnemy ? "#6f5aa2" : "#5b90c8";
    const dark = isEnemy ? "#41345f" : "#3d6f9e";
    const accent = isEnemy ? "#ffcf70" : "#f2c21c";
    const cockpit = "#58aeef";
    const trim = "#000";
    const panel = isEnemy ? "#3d3556" : "#3a628c";

    ctx.save();
    ctx.scale(0.28, 0.28);
    ctx.translate(-256, -255);
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;

    // Fuselage.
    ctx.beginPath();
    ctx.moveTo(244, 52);
    ctx.quadraticCurveTo(256, 30, 268, 52);
    ctx.bezierCurveTo(280, 74, 286, 94, 288, 122);
    ctx.lineTo(291, 235);
    ctx.bezierCurveTo(292, 267, 282, 311, 270, 352);
    ctx.lineTo(264, 372);
    ctx.quadraticCurveTo(256, 390, 248, 372);
    ctx.lineTo(242, 352);
    ctx.bezierCurveTo(230, 311, 220, 267, 221, 235);
    ctx.lineTo(224, 122);
    ctx.bezierCurveTo(226, 94, 232, 74, 244, 52);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(229, 108, 54, 20);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.stroke();

    // Cockpit.
    ctx.beginPath();
    ctx.moveTo(238, 88);
    ctx.quadraticCurveTo(256, 66, 274, 88);
    ctx.lineTo(278, 150);
    ctx.quadraticCurveTo(256, 162, 234, 150);
    ctx.closePath();
    ctx.fillStyle = cockpit;
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#98d8ff";
    ctx.beginPath();
    ctx.moveTo(256, 80);
    ctx.lineTo(256, 154);
    ctx.stroke();
    ctx.strokeStyle = "#2b6fa5";
    ctx.beginPath();
    ctx.moveTo(240, 102);
    ctx.quadraticCurveTo(256, 80, 272, 102);
    ctx.stroke();

    // Main wings.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 230);
    ctx.quadraticCurveTo(48, 205, 74, 196);
    ctx.lineTo(216, 160);
    ctx.quadraticCurveTo(236, 155, 240, 178);
    ctx.lineTo(248, 250);
    ctx.quadraticCurveTo(250, 266, 233, 272);
    ctx.lineTo(95, 311);
    ctx.quadraticCurveTo(61, 321, 48, 293);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(464, 230);
    ctx.quadraticCurveTo(464, 205, 438, 196);
    ctx.lineTo(296, 160);
    ctx.quadraticCurveTo(276, 155, 272, 178);
    ctx.lineTo(264, 250);
    ctx.quadraticCurveTo(262, 266, 279, 272);
    ctx.lineTo(417, 311);
    ctx.quadraticCurveTo(451, 321, 464, 293);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 7;
    [[88, 290, 214, 255], [424, 290, 298, 255]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.lineWidth = 4;
    [[118, 282, 231, 249], [394, 282, 281, 249]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Wingtip pods and panel hints.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(62, 238);
    ctx.quadraticCurveTo(57, 225, 67, 219);
    ctx.lineTo(78, 246);
    ctx.quadraticCurveTo(71, 251, 62, 238);
    ctx.closePath();
    ctx.fillStyle = "#6d9dcd";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(450, 238);
    ctx.quadraticCurveTo(455, 225, 445, 219);
    ctx.lineTo(434, 246);
    ctx.quadraticCurveTo(441, 251, 450, 238);
    ctx.closePath();
    ctx.fillStyle = "#6d9dcd";
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = panel;
    ctx.lineWidth = 2;
    [[92, 232, 86, 308], [146, 218, 136, 296], [204, 188, 192, 277], [308, 188, 320, 277], [366, 218, 376, 296], [420, 232, 426, 308]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Tailplanes and vertical fin.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(130, 346);
    ctx.quadraticCurveTo(130, 322, 154, 322);
    ctx.lineTo(231, 320);
    ctx.quadraticCurveTo(247, 320, 247, 337);
    ctx.lineTo(247, 377);
    ctx.quadraticCurveTo(247, 390, 232, 390);
    ctx.lineTo(154, 391);
    ctx.quadraticCurveTo(130, 391, 130, 368);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(382, 346);
    ctx.quadraticCurveTo(382, 322, 358, 322);
    ctx.lineTo(281, 320);
    ctx.quadraticCurveTo(265, 320, 265, 337);
    ctx.lineTo(265, 377);
    ctx.quadraticCurveTo(265, 390, 280, 390);
    ctx.lineTo(358, 391);
    ctx.quadraticCurveTo(382, 391, 382, 368);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(236, 270);
    ctx.bezierCurveTo(242, 244, 249, 230, 256, 230);
    ctx.bezierCurveTo(263, 230, 270, 244, 276, 270);
    ctx.lineTo(286, 357);
    ctx.quadraticCurveTo(287, 370, 276, 370);
    ctx.lineTo(236, 370);
    ctx.quadraticCurveTo(225, 370, 226, 357);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(266, 282);
    ctx.lineTo(252, 305);
    ctx.lineTo(266, 305);
    ctx.lineTo(248, 338);
    ctx.stroke();

    // Intakes and body accent.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(237, 220);
    ctx.lineTo(256, 238);
    ctx.lineTo(275, 220);
    ctx.lineTo(275, 238);
    ctx.lineTo(256, 255);
    ctx.lineTo(237, 238);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(205, 252);
    ctx.quadraticCurveTo(210, 239, 223, 238);
    ctx.lineTo(227, 275);
    ctx.quadraticCurveTo(212, 275, 205, 252);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(307, 252);
    ctx.quadraticCurveTo(302, 239, 289, 238);
    ctx.lineTo(285, 275);
    ctx.quadraticCurveTo(300, 275, 307, 252);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(212, 249);
    ctx.quadraticCurveTo(216, 244, 223, 244);
    ctx.lineTo(224, 264);
    ctx.quadraticCurveTo(216, 264, 212, 249);
    ctx.closePath();
    ctx.fillStyle = "#1f1f22";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(300, 249);
    ctx.quadraticCurveTo(296, 244, 289, 244);
    ctx.lineTo(288, 264);
    ctx.quadraticCurveTo(296, 264, 300, 249);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Exhaust flame.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(244, 366);
    ctx.quadraticCurveTo(256, 395, 268, 366);
    ctx.lineTo(264, 401);
    ctx.quadraticCurveTo(256, 413, 248, 401);
    ctx.closePath();
    ctx.fillStyle = "#ff7b1a";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(248, 372);
    ctx.quadraticCurveTo(256, 389, 264, 372);
    ctx.lineTo(261, 393);
    ctx.quadraticCurveTo(256, 401, 251, 393);
    ctx.closePath();
    ctx.fillStyle = "#ffd24a";
    ctx.fill();

    // Redraw fuselage outline over overlaps.
    ctx.strokeStyle = trim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(244, 52);
    ctx.quadraticCurveTo(256, 30, 268, 52);
    ctx.bezierCurveTo(280, 74, 286, 94, 288, 122);
    ctx.lineTo(291, 235);
    ctx.bezierCurveTo(292, 267, 282, 311, 270, 352);
    ctx.lineTo(264, 372);
    ctx.quadraticCurveTo(256, 390, 248, 372);
    ctx.lineTo(242, 352);
    ctx.bezierCurveTo(230, 311, 220, 267, 221, 235);
    ctx.lineTo(224, 122);
    ctx.bezierCurveTo(226, 94, 232, 74, 244, 52);
    ctx.stroke();

    drawTinyRoundel(112, 258, 19);
    drawTinyRoundel(400, 258, 19);
    ctx.restore();
  }

  function drawTinyRoundel(x, y, radius) {
    ctx.fillStyle = "#14379e";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - radius * 1.52, y - radius * 0.32, radius * 3.05, radius * 0.63);
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 0.95);
    ctx.lineTo(x + radius * 0.26, y - radius * 0.37);
    ctx.lineTo(x + radius * 0.89, y - radius * 0.32);
    ctx.lineTo(x + radius * 0.42, y + radius * 0.11);
    ctx.lineTo(x + radius * 0.58, y + radius * 0.74);
    ctx.lineTo(x, y + radius * 0.37);
    ctx.lineTo(x - radius * 0.58, y + radius * 0.74);
    ctx.lineTo(x - radius * 0.42, y + radius * 0.11);
    ctx.lineTo(x - radius * 0.89, y - radius * 0.32);
    ctx.lineTo(x - radius * 0.26, y - radius * 0.37);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#14379e";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeRect(x - radius * 1.52, y - radius * 0.32, radius * 3.05, radius * 0.63);
  }

  function drawEnemyFighter(x, y, scale, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.save();
    ctx.scale(0.28, 0.28);
    ctx.translate(-256, -250);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;

    // Spinner and nose band from the supplied enemy fighter art.
    ctx.beginPath();
    ctx.moveTo(237, 98);
    ctx.quadraticCurveTo(256, 64, 275, 98);
    ctx.lineTo(272, 111);
    ctx.quadraticCurveTo(256, 106, 240, 111);
    ctx.closePath();
    ctx.fillStyle = "#2f8a64";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(228, 106, 56, 26);
    ctx.fillStyle = "#d7d1b2";
    ctx.fill();
    ctx.stroke();

    // Main wings.
    ctx.beginPath();
    ctx.moveTo(42, 196);
    ctx.quadraticCurveTo(42, 168, 74, 164);
    ctx.lineTo(212, 154);
    ctx.quadraticCurveTo(231, 152, 231, 175);
    ctx.lineTo(231, 260);
    ctx.quadraticCurveTo(231, 276, 213, 275);
    ctx.lineTo(76, 253);
    ctx.quadraticCurveTo(42, 248, 42, 222);
    ctx.closePath();
    ctx.fillStyle = "#cfc9ae";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(470, 196);
    ctx.quadraticCurveTo(470, 168, 438, 164);
    ctx.lineTo(300, 154);
    ctx.quadraticCurveTo(281, 152, 281, 175);
    ctx.lineTo(281, 260);
    ctx.quadraticCurveTo(281, 276, 299, 275);
    ctx.lineTo(436, 253);
    ctx.quadraticCurveTo(470, 248, 470, 222);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#9e987e";
    ctx.lineWidth = 2;
    [[98, 172, 94, 248], [150, 161, 148, 260], [362, 260, 374, 161], [414, 248, 420, 172], [72, 200, 230, 208], [282, 208, 440, 200]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Fuselage.
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(224, 132);
    ctx.bezierCurveTo(234, 129, 245, 128, 256, 128);
    ctx.bezierCurveTo(267, 128, 278, 129, 288, 132);
    ctx.lineTo(289, 274);
    ctx.bezierCurveTo(289, 313, 278, 354, 266, 394);
    ctx.lineTo(261, 412);
    ctx.quadraticCurveTo(256, 425, 251, 412);
    ctx.lineTo(246, 394);
    ctx.bezierCurveTo(234, 354, 223, 313, 223, 274);
    ctx.closePath();
    ctx.fillStyle = "#cfc9ae";
    ctx.fill();
    ctx.stroke();

    // Canopy and fuselage stripe.
    ctx.beginPath();
    ctx.ellipse(256, 198, 16, 29, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4fa9ee";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(240, 198);
    ctx.quadraticCurveTo(256, 168, 272, 198);
    ctx.stroke();
    ctx.strokeStyle = "#9fdbff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 170);
    ctx.lineTo(256, 227);
    ctx.stroke();

    ctx.fillStyle = "#be2c2c";
    ctx.fillRect(246, 296, 20, 116);

    // Tailplanes.
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(126, 326);
    ctx.quadraticCurveTo(126, 296, 158, 300);
    ctx.lineTo(229, 312);
    ctx.quadraticCurveTo(246, 315, 246, 333);
    ctx.lineTo(246, 364);
    ctx.quadraticCurveTo(246, 377, 230, 378);
    ctx.lineTo(154, 373);
    ctx.quadraticCurveTo(126, 371, 126, 346);
    ctx.closePath();
    ctx.fillStyle = "#cfc9ae";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(386, 326);
    ctx.quadraticCurveTo(386, 296, 354, 300);
    ctx.lineTo(283, 312);
    ctx.quadraticCurveTo(266, 315, 266, 333);
    ctx.lineTo(266, 364);
    ctx.quadraticCurveTo(266, 377, 282, 378);
    ctx.lineTo(358, 373);
    ctx.quadraticCurveTo(386, 371, 386, 346);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#9e987e";
    ctx.lineWidth = 2;
    [[168, 314, 168, 375], [344, 314, 344, 375]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    drawHinomaruRoundel(108, 204, 20);
    drawHinomaruRoundel(404, 204, 20);
    ctx.restore();

    // Animated propeller. The whole enemy plane is rotated, so this appears at the nose facing the player.
    ctx.save();
    ctx.translate(0, -50);
    ctx.rotate(spin || 0);
    ctx.fillStyle = "rgba(43,43,43,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#9a9a9a";
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawHinomaruRoundel(x, y, radius) {
    ctx.fillStyle = "#fff7ef";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c82424";
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawBullets() {
    ctx.fillStyle = "#fff2a8";
    state.bullets.forEach((bullet) => {
      const point = worldToScreen(bullet.x, bullet.depth);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4 * point.scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEnemies() {
    state.enemies
      .slice()
      .sort((a, b) => b.depth - a.depth)
      .forEach((enemy) => {
        const point = worldToScreen(enemy.x, enemy.depth);
        drawEnemyFighter(point.x, point.y, 0.28 * point.scale, state.propSpin);
      });
  }

  function drawBursts() {
    state.bursts.forEach((burst) => {
      const point = worldToScreen(burst.x, burst.depth);
      const radius = (12 + burst.age * 58) * point.scale;
      ctx.fillStyle = `rgba(255, 226, 102, ${Math.max(0, 1 - burst.age * 2.2)})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(222, 70, 44, ${Math.max(0, 0.9 - burst.age * 1.8)})`;
      ctx.beginPath();
      ctx.arc(point.x + radius * 0.28, point.y - radius * 0.16, radius * 0.48, 0, Math.PI * 2);
      ctx.arc(point.x - radius * 0.24, point.y + radius * 0.18, radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(45, 47, 48, ${Math.max(0, 0.55 - burst.age)})`;
      ctx.lineWidth = Math.max(2, 5 * point.scale);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function drawPlayer() {
    const w = canvas.width;
    const h = canvas.height;
    const stallAmount = Math.min(1, state.stallTimer / 3.2);
    const stallWobble = stallAmount > 0 ? Math.sin(state.stallWobble) * stallAmount : 0;
    const x = w * 0.5 + state.playerX * w * 0.28 + stallWobble * 18;
    const y = h * (state.planeY + stallAmount * 0.07);
    const bank = state.bankVelocity + stallWobble * 0.8;
    const moving = state.speed > 0.12 || state.mode !== "takeoff";
    drawPlaneShape(x, y, state.mode === "takeoff" ? 0.9 + state.speed * 0.2 : 1, state.selectedPlane, bank, {
      propMoving: moving,
      spin: state.propSpin
    });
  }

  function drawCrashPlane() {
    const w = canvas.width;
    const h = canvas.height;
    const x = w * 0.5 + state.crashX * w * 0.28;
    const y = h * state.crashY;
    drawPlaneShape(x, y, 1, state.selectedPlane, 0, {
      propMoving: false,
      spin: state.crashSpin,
      crashed: true
    });
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

  function drawLives() {
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBullets();
    drawEnemies();
    drawBursts();
    if (state.mode === "crashing" || state.mode === "crashed") {
      drawCrashPlane();
    } else {
      drawPlayer();
    }
    drawLives();
  }

  function loop(time) {
    if (!canvas.isConnected || ["select", "stageComplete", "crashed", "paused"].includes(state.mode)) return;
    const dt = Math.min(0.04, (time - state.lastTime) / 1000 || 0.016);
    state.lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function holdStart(action) {
    if (action === "left" && state.mode === "flying") input.left = true;
    if (action === "right" && state.mode === "flying") input.right = true;
  }

  function holdEnd(action) {
    if (action === "left") input.left = false;
    if (action === "right") input.right = false;
  }

  let lastPointerCommandAt = 0;

  function runButtonCommand(target) {
    const planeButton = target.closest("[data-plane-choice]");
    const layoutButton = target.closest("[data-layout-choice]");
    if (planeButton) {
      choosePlane(planeButton.dataset.planeChoice);
      return true;
    }
    if (layoutButton) {
      setLayout(layoutButton.dataset.layoutChoice);
      return true;
    }
    if (target.closest("[data-start-flight]")) {
      startGame();
      return true;
    }
    if (target.closest("[data-throttle-up]")) {
      state.throttle = Math.min(4, state.throttle + 1);
      updateHud();
      return true;
    }
    if (target.closest("[data-throttle-down]")) {
      state.throttle = Math.max(0, state.throttle - 1);
      updateHud();
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

  panel.addEventListener("click", (event) => {
    if (Date.now() - lastPointerCommandAt > 450) {
      runButtonCommand(event.target);
    }
  });

  panel.addEventListener("pointerdown", (event) => {
    if (event.target.closest("input, select")) return;

    if (runButtonCommand(event.target)) {
      lastPointerCommandAt = Date.now();
      event.preventDefault();
      return;
    }

    const fireButton = event.target.closest("[data-fire]");
    if (fireButton) {
      event.preventDefault();
      fire();
      return;
    }

    const holdButton = event.target.closest("[data-hold]");
    if (!holdButton) return;
    event.preventDefault();
    holdButton.setPointerCapture(event.pointerId);
    holdStart(holdButton.dataset.hold);
  });

  panel.addEventListener("pointerup", (event) => {
    const holdButton = event.target.closest("[data-hold]");
    if (holdButton) holdEnd(holdButton.dataset.hold);
  });

  panel.addEventListener("pointercancel", (event) => {
    const holdButton = event.target.closest("[data-hold]");
    if (holdButton) holdEnd(holdButton.dataset.hold);
  });

  currentGame = {
    stop() {
      state.mode = "select";
      input.left = false;
      input.right = false;
      state.bankVelocity = 0;
    }
  };

  drawPlanePreviews(root);
  setLayout("portrait");
  draw();
  updateHud();
}

function drawPlanePreviews(root) {
  root.querySelectorAll("[data-plane-preview]").forEach((preview) => {
    const ctx = preview.getContext("2d");
    const planeId = preview.dataset.planePreview;
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.save();
    ctx.translate(preview.width / 2, preview.height / 2 + 8);
    ctx.scale(0.86, 0.86);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1f2d3a";

    if (planeId === "biplane") {
      ctx.save();
      ctx.scale(0.23, 0.23);
      ctx.translate(-256, -245);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000";

      ctx.beginPath();
      ctx.moveTo(56, 130);
      ctx.quadraticCurveTo(56, 112, 77, 112);
      ctx.lineTo(215, 112);
      ctx.quadraticCurveTo(231, 112, 231, 129);
      ctx.lineTo(231, 136);
      ctx.quadraticCurveTo(231, 152, 215, 152);
      ctx.lineTo(77, 152);
      ctx.quadraticCurveTo(56, 152, 56, 134);
      ctx.closePath();
      ctx.fillStyle = "#f6c21a";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(281, 129);
      ctx.quadraticCurveTo(281, 112, 297, 112);
      ctx.lineTo(435, 112);
      ctx.quadraticCurveTo(456, 112, 456, 130);
      ctx.lineTo(456, 134);
      ctx.quadraticCurveTo(456, 152, 435, 152);
      ctx.lineTo(297, 152);
      ctx.quadraticCurveTo(281, 152, 281, 136);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(124, 112, 34, 40);
      ctx.strokeRect(124, 112, 34, 40);
      ctx.fillRect(354, 112, 34, 40);
      ctx.strokeRect(354, 112, 34, 40);

      ctx.beginPath();
      ctx.moveTo(70, 222);
      ctx.quadraticCurveTo(70, 203, 92, 203);
      ctx.lineTo(220, 203);
      ctx.quadraticCurveTo(241, 203, 241, 221);
      ctx.lineTo(241, 229);
      ctx.quadraticCurveTo(241, 247, 220, 247);
      ctx.lineTo(92, 247);
      ctx.quadraticCurveTo(70, 247, 70, 228);
      ctx.closePath();
      ctx.fillStyle = "#f6c21a";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(271, 221);
      ctx.quadraticCurveTo(271, 203, 292, 203);
      ctx.lineTo(420, 203);
      ctx.quadraticCurveTo(442, 203, 442, 222);
      ctx.lineTo(442, 228);
      ctx.quadraticCurveTo(442, 247, 420, 247);
      ctx.lineTo(292, 247);
      ctx.quadraticCurveTo(271, 247, 271, 229);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(126, 203, 36, 44);
      ctx.strokeRect(126, 203, 36, 44);
      ctx.fillRect(350, 203, 36, 44);
      ctx.strokeRect(350, 203, 36, 44);

      ctx.strokeStyle = "#2f2f2f";
      ctx.lineWidth = 7;
      [[104, 152, 122, 203], [134, 152, 122, 203], [408, 152, 390, 203], [378, 152, 390, 203]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(227, 90);
      ctx.bezierCurveTo(237, 86, 247, 84, 256, 84);
      ctx.bezierCurveTo(265, 84, 275, 86, 285, 90);
      ctx.lineTo(285, 261);
      ctx.bezierCurveTo(285, 291, 276, 322, 265, 350);
      ctx.lineTo(259, 367);
      ctx.quadraticCurveTo(256, 377, 253, 367);
      ctx.lineTo(247, 350);
      ctx.bezierCurveTo(236, 322, 227, 291, 227, 261);
      ctx.closePath();
      ctx.fillStyle = "#f2331e";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(256, 166, 22, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#5b95d9";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(138, 287);
      ctx.bezierCurveTo(166, 271, 199, 268, 230, 275);
      ctx.lineTo(238, 322);
      ctx.bezierCurveTo(203, 327, 167, 327, 139, 323);
      ctx.bezierCurveTo(123, 321, 121, 297, 138, 287);
      ctx.closePath();
      ctx.fillStyle = "#f6c21a";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(374, 287);
      ctx.bezierCurveTo(346, 271, 313, 268, 282, 275);
      ctx.lineTo(274, 322);
      ctx.bezierCurveTo(309, 327, 345, 327, 373, 323);
      ctx.bezierCurveTo(389, 321, 391, 297, 374, 287);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (planeId === "mustang") {
      ctx.save();
      ctx.scale(0.23, 0.23);
      ctx.translate(-256, -250);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000";

      ctx.beginPath();
      ctx.moveTo(38, 196);
      ctx.quadraticCurveTo(38, 166, 72, 164);
      ctx.lineTo(210, 154);
      ctx.quadraticCurveTo(231, 152, 231, 176);
      ctx.lineTo(231, 258);
      ctx.quadraticCurveTo(231, 276, 212, 275);
      ctx.lineTo(74, 252);
      ctx.quadraticCurveTo(38, 246, 38, 221);
      ctx.closePath();
      ctx.fillStyle = "#d9d9dc";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(474, 196);
      ctx.quadraticCurveTo(474, 166, 440, 164);
      ctx.lineTo(302, 154);
      ctx.quadraticCurveTo(281, 152, 281, 176);
      ctx.lineTo(281, 258);
      ctx.quadraticCurveTo(281, 276, 300, 275);
      ctx.lineTo(438, 252);
      ctx.quadraticCurveTo(474, 246, 474, 221);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.fillRect(154, 155, 32, 118);
      ctx.fillRect(326, 155, 32, 118);
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(186, 155, 24, 118);
      ctx.fillRect(302, 155, 24, 118);

      ctx.beginPath();
      ctx.moveTo(226, 132);
      ctx.bezierCurveTo(235, 129, 245, 128, 256, 128);
      ctx.bezierCurveTo(267, 128, 277, 129, 286, 132);
      ctx.lineTo(289, 270);
      ctx.bezierCurveTo(289, 311, 278, 355, 266, 395);
      ctx.lineTo(261, 413);
      ctx.quadraticCurveTo(256, 426, 251, 413);
      ctx.lineTo(246, 395);
      ctx.bezierCurveTo(234, 355, 223, 311, 223, 270);
      ctx.closePath();
      ctx.fillStyle = "#d9d9dc";
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#444";
      ctx.fillRect(223, 268, 66, 28);
      ctx.fillStyle = "#f2331e";
      ctx.fillRect(246, 295, 20, 118);

      ctx.beginPath();
      ctx.moveTo(237, 97);
      ctx.quadraticCurveTo(256, 64, 275, 97);
      ctx.lineTo(272, 110);
      ctx.quadraticCurveTo(256, 105, 240, 110);
      ctx.closePath();
      ctx.fillStyle = "#f2331e";
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f1be1a";
      ctx.fillRect(226, 102, 60, 30);
      ctx.strokeRect(226, 102, 60, 30);
      ctx.fillStyle = "#f2331e";
      ctx.fillRect(226, 102, 15, 15);
      ctx.fillRect(256, 102, 15, 15);
      ctx.fillRect(241, 117, 15, 15);
      ctx.fillRect(271, 117, 15, 15);

      ctx.beginPath();
      ctx.ellipse(256, 198, 17, 30, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#4fa9ee";
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(126, 326);
      ctx.quadraticCurveTo(126, 295, 158, 300);
      ctx.lineTo(229, 312);
      ctx.quadraticCurveTo(246, 315, 246, 333);
      ctx.lineTo(246, 364);
      ctx.quadraticCurveTo(246, 377, 230, 378);
      ctx.lineTo(154, 373);
      ctx.quadraticCurveTo(126, 371, 126, 346);
      ctx.closePath();
      ctx.fillStyle = "#d9d9dc";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(386, 326);
      ctx.quadraticCurveTo(386, 295, 354, 300);
      ctx.lineTo(283, 312);
      ctx.quadraticCurveTo(266, 315, 266, 333);
      ctx.lineTo(266, 364);
      ctx.quadraticCurveTo(266, 377, 282, 378);
      ctx.lineTo(358, 373);
      ctx.quadraticCurveTo(386, 371, 386, 346);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#14379e";
      ctx.beginPath();
      ctx.arc(108, 202, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(74, 195, 68, 14);
      ctx.restore();
    }

    if (planeId === "jet") {
      ctx.save();
      ctx.scale(0.23, 0.23);
      ctx.translate(-256, -255);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000";

      ctx.beginPath();
      ctx.moveTo(48, 230);
      ctx.quadraticCurveTo(48, 205, 74, 196);
      ctx.lineTo(216, 160);
      ctx.quadraticCurveTo(236, 155, 240, 178);
      ctx.lineTo(248, 250);
      ctx.quadraticCurveTo(250, 266, 233, 272);
      ctx.lineTo(95, 311);
      ctx.quadraticCurveTo(61, 321, 48, 293);
      ctx.closePath();
      ctx.fillStyle = "#5b90c8";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(464, 230);
      ctx.quadraticCurveTo(464, 205, 438, 196);
      ctx.lineTo(296, 160);
      ctx.quadraticCurveTo(276, 155, 272, 178);
      ctx.lineTo(264, 250);
      ctx.quadraticCurveTo(262, 266, 279, 272);
      ctx.lineTo(417, 311);
      ctx.quadraticCurveTo(451, 321, 464, 293);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#f2c21c";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(88, 290);
      ctx.lineTo(214, 255);
      ctx.moveTo(424, 290);
      ctx.lineTo(298, 255);
      ctx.stroke();

      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(244, 52);
      ctx.quadraticCurveTo(256, 30, 268, 52);
      ctx.bezierCurveTo(280, 74, 286, 94, 288, 122);
      ctx.lineTo(291, 235);
      ctx.bezierCurveTo(292, 267, 282, 311, 270, 352);
      ctx.lineTo(264, 372);
      ctx.quadraticCurveTo(256, 390, 248, 372);
      ctx.lineTo(242, 352);
      ctx.bezierCurveTo(230, 311, 220, 267, 221, 235);
      ctx.lineTo(224, 122);
      ctx.bezierCurveTo(226, 94, 232, 74, 244, 52);
      ctx.closePath();
      ctx.fillStyle = "#5b90c8";
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f2c21c";
      ctx.fillRect(229, 108, 54, 20);
      ctx.strokeRect(229, 108, 54, 20);

      ctx.beginPath();
      ctx.moveTo(238, 88);
      ctx.quadraticCurveTo(256, 66, 274, 88);
      ctx.lineTo(278, 150);
      ctx.quadraticCurveTo(256, 162, 234, 150);
      ctx.closePath();
      ctx.fillStyle = "#58aeef";
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(236, 270);
      ctx.bezierCurveTo(242, 244, 249, 230, 256, 230);
      ctx.bezierCurveTo(263, 230, 270, 244, 276, 270);
      ctx.lineTo(286, 357);
      ctx.quadraticCurveTo(287, 370, 276, 370);
      ctx.lineTo(236, 370);
      ctx.quadraticCurveTo(225, 370, 226, 357);
      ctx.closePath();
      ctx.fillStyle = "#5b90c8";
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#f2c21c";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(266, 282);
      ctx.lineTo(252, 305);
      ctx.lineTo(266, 305);
      ctx.lineTo(248, 338);
      ctx.stroke();

      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(244, 366);
      ctx.quadraticCurveTo(256, 395, 268, 366);
      ctx.lineTo(264, 401);
      ctx.quadraticCurveTo(256, 413, 248, 401);
      ctx.closePath();
      ctx.fillStyle = "#ff7b1a";
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#14379e";
      ctx.beginPath();
      ctx.arc(112, 258, 19, 0, Math.PI * 2);
      ctx.arc(400, 258, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(83, 252, 58, 12);
      ctx.fillRect(371, 252, 58, 12);
      ctx.restore();
    }
    ctx.restore();
  });
}

function previewRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
