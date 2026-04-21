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
    enemyCount: 8,
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
    enemyCount: 10,
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
    enemyCount: 12,
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
    enemyCount: 14,
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
    entries.push({
      name: name.slice(0, 16),
      score: state.score,
      stage: state.selectedStage + 1,
      enemiesShot: state.enemiesShot,
      createdAt: new Date().toISOString()
    });
    entries.sort((a, b) => b.score - a.score);
    saveLeaderboard(entries);
    showLeaderboard("Score Saved");
  }

  function showLeaderboard(title = "Leaderboard") {
    if (["takeoff", "flying", "finishing", "crashing"].includes(state.mode)) {
      state.pausedMode = state.mode;
      state.mode = "paused";
      input.left = false;
      input.right = false;
      state.bankVelocity = 0;
    }

    const entries = getLeaderboard();
    const rows = entries.length
      ? entries.map((entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.name)}</td>
          <td>${entry.score}</td>
          <td>${entry.stage}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No scores yet.</td></tr>`;

    setOverlay(
      title,
      `
        <table class="leaderboard-table">
          <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Stage</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
      `<button class="primary-button" type="button" data-close-overlay>Close</button>`
    );
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
    if (state.runway > RUNWAY_LIMIT && state.takeoffBlend < 0.18) {
      beginCrash("Runway overrun");
      return;
    }
    if (state.speed > 0.45 && state.runway > 12) {
      state.takeoffBlend = Math.min(1, state.takeoffBlend + dt * 0.42);
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
    sky.addColorStop(0, "#73bdf7");
    sky.addColorStop(1, "#d8f2ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);

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

  function drawField(horizon, top, bottom) {
    const h = canvas.height;
    const ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, top);
    ground.addColorStop(1, bottom);
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, canvas.width, h - horizon);
  }

  function drawWater(horizon) {
    const h = canvas.height;
    const water = ctx.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, "#4ca9d7");
    water.addColorStop(1, "#1f6792");
    ctx.fillStyle = water;
    ctx.fillRect(0, horizon, canvas.width, h - horizon);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    for (let i = 0; i < 10; i += 1) {
      const y = horizon + ((i * 56 + state.distance * 10) % (h - horizon));
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.quadraticCurveTo(canvas.width * 0.5, y + 14, canvas.width - 30, y);
      ctx.stroke();
    }
  }

  function drawMountains(horizon) {
    ctx.fillStyle = "#65716a";
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
    ctx.fillStyle = planeColor(plane, isEnemy);
    roundRect(-40, -10, 80, 10, 4);
    ctx.fill();
    ctx.stroke();
    roundRect(-36, 7, 72, 10, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isEnemy ? "#f2b84b" : plane.accent;
    ctx.fillRect(-28, -12, 56, 3);
    ctx.fillRect(-24, 16, 48, 3);
    ctx.fillStyle = planeColor(plane, isEnemy);
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(11, 22);
    ctx.lineTo(0, 17);
    ctx.lineTo(-11, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#203040";
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-30, -1);
    ctx.lineTo(30, -1);
    ctx.moveTo(-28, 12);
    ctx.lineTo(28, 12);
    ctx.stroke();
    drawPropeller(-29, propMoving, spin);
  }

  function drawMustang(plane, isEnemy, propMoving, spin) {
    ctx.fillStyle = planeColor(plane, isEnemy);
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(12, 18);
    ctx.lineTo(0, 27);
    ctx.lineTo(-12, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isEnemy ? "#f2b84b" : plane.accent;
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.lineTo(-9, -8);
    ctx.lineTo(9, -8);
    ctx.lineTo(52, 0);
    ctx.lineTo(8, 10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isEnemy ? "#d84a3d" : plane.color;
    ctx.beginPath();
    ctx.moveTo(-45, -1);
    ctx.lineTo(-22, -5);
    ctx.lineTo(-20, 4);
    ctx.lineTo(-45, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(45, -1);
    ctx.lineTo(22, -5);
    ctx.lineTo(20, 4);
    ctx.lineTo(45, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#202c36";
    roundRect(-5, -18, 10, 16, 5);
    ctx.fill();
    ctx.fillStyle = isEnemy ? "#8f3030" : plane.color;
    roundRect(-22, 20, 44, 9, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(20,30,38,0.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, 24);
    ctx.moveTo(-34, 4);
    ctx.lineTo(34, 4);
    ctx.stroke();
    drawPropeller(-37, propMoving, spin);
  }

  function drawJet(plane, isEnemy) {
    ctx.fillStyle = planeColor(plane, isEnemy);
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(14, 15);
    ctx.lineTo(7, 34);
    ctx.lineTo(0, 26);
    ctx.lineTo(-7, 34);
    ctx.lineTo(-14, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isEnemy ? "#f2b84b" : plane.accent;
    ctx.beginPath();
    ctx.moveTo(-48, 10);
    ctx.lineTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(48, 10);
    ctx.lineTo(10, 18);
    ctx.lineTo(-10, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1f2d38";
    roundRect(-6, -24, 12, 22, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,30,38,0.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(0, 28);
    ctx.moveTo(-30, 9);
    ctx.lineTo(30, 9);
    ctx.stroke();
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.moveTo(-7, 34);
    ctx.lineTo(0, 48);
    ctx.lineTo(7, 34);
    ctx.closePath();
    ctx.fill();
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
        drawPlaneShape(point.x, point.y, 0.28 * point.scale, "mustang", 0, {
          enemy: true,
          propMoving: true,
          spin: state.propSpin
        });
      });
  }

  function drawBursts() {
    state.bursts.forEach((burst) => {
      const point = worldToScreen(burst.x, burst.depth);
      const radius = (12 + burst.age * 58) * point.scale;
      ctx.fillStyle = `rgba(255, 190, 71, ${Math.max(0, 1 - burst.age * 2)})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 20);
    ctx.quadraticCurveTo(x - 50, y - 55, x - 80, y - 70);
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

  panel.addEventListener("click", (event) => {
    const planeButton = event.target.closest("[data-plane-choice]");
    const layoutButton = event.target.closest("[data-layout-choice]");
    if (planeButton) choosePlane(planeButton.dataset.planeChoice);
    if (layoutButton) setLayout(layoutButton.dataset.layoutChoice);
    if (event.target.closest("[data-start-flight]")) startGame();
    if (event.target.closest("[data-throttle-up]")) {
      state.throttle = Math.min(4, state.throttle + 1);
      updateHud();
    }
    if (event.target.closest("[data-throttle-down]")) {
      state.throttle = Math.max(0, state.throttle - 1);
      updateHud();
    }
    if (event.target.closest("[data-continue-flight]")) continueAfterCrash();
    if (event.target.closest("[data-next-level]")) startNextStage();
    if (event.target.closest("[data-restart-game]")) restartFromSelect();
    if (event.target.closest("[data-show-leaderboard]")) showLeaderboard();
    if (event.target.closest("[data-save-score]")) saveScoreFromOverlay();
    if (event.target.closest("[data-close-overlay]")) hideOverlay();
  });

  panel.addEventListener("pointerdown", (event) => {
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
    ctx.scale(1.05, 1.05);
    ctx.strokeStyle = "#162426";
    ctx.lineWidth = 2;

    const plane = planes[planeId];
    if (planeId === "biplane") {
      ctx.fillStyle = plane.color;
      ctx.fillRect(-38, -9, 76, 9);
      ctx.fillRect(-34, 7, 68, 9);
      ctx.fillStyle = plane.accent;
      ctx.fillRect(-28, -12, 56, 3);
      ctx.fillRect(-24, 16, 48, 3);
      ctx.fillStyle = plane.color;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(11, 22);
      ctx.lineTo(0, 17);
      ctx.lineTo(-11, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, -29);
      ctx.lineTo(14, -29);
      ctx.moveTo(0, -37);
      ctx.lineTo(0, -21);
      ctx.stroke();
    }

    if (planeId === "mustang") {
      ctx.fillStyle = plane.color;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(12, 18);
      ctx.lineTo(0, 27);
      ctx.lineTo(-12, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = plane.accent;
      ctx.beginPath();
      ctx.moveTo(-52, 0);
      ctx.lineTo(-9, -8);
      ctx.lineTo(9, -8);
      ctx.lineTo(52, 0);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, -37);
      ctx.lineTo(14, -37);
      ctx.moveTo(0, -45);
      ctx.lineTo(0, -29);
      ctx.stroke();
    }

    if (planeId === "jet") {
      ctx.fillStyle = plane.color;
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(14, 15);
      ctx.lineTo(7, 34);
      ctx.lineTo(0, 26);
      ctx.lineTo(-7, 34);
      ctx.lineTo(-14, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = plane.accent;
      ctx.beginPath();
      ctx.moveTo(-48, 10);
      ctx.lineTo(-8, -6);
      ctx.lineTo(8, -6);
      ctx.lineTo(48, 10);
      ctx.lineTo(10, 18);
      ctx.lineTo(-10, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  });
}
