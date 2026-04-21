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
    const body = isEnemy ? "#b94a48" : "#e44d3a";
    const wing = isEnemy ? "#d7b66a" : "#f2c14e";
    const stripe = isEnemy ? "#f8e7a3" : "#fff4b0";
    const cockpit = "#87c6eb";
    const trim = "#233142";
    const tire = "#222";

    roundRect(-46, 6, 92, 12, 6);
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    roundRect(-42, -16, 84, 12, 6);
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = stripe;
    ctx.fillRect(-8, -16, 16, 12);
    ctx.fillRect(-8, 6, 16, 12);

    ctx.strokeStyle = trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(-12, 6);
    ctx.moveTo(18, -4);
    ctx.lineTo(12, 6);
    ctx.moveTo(-8, -4);
    ctx.lineTo(-4, 6);
    ctx.moveTo(8, -4);
    ctx.lineTo(4, 6);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -45);
    ctx.bezierCurveTo(12, -40, 16, -24, 14, 12);
    ctx.bezierCurveTo(12, 26, 10, 36, 6, 42);
    ctx.lineTo(0, 46);
    ctx.lineTo(-6, 42);
    ctx.bezierCurveTo(-10, 36, -12, 26, -14, 12);
    ctx.bezierCurveTo(-16, -24, -12, -40, 0, -45);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(5, -8);
    ctx.lineTo(4, 28);
    ctx.lineTo(-4, 28);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -6, 8, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = cockpit;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    roundRect(-18, 28, 36, 8, 4);
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(0, 42);
    ctx.lineTo(10, 34);
    ctx.quadraticCurveTo(6, 26, 0, 24);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, 18);
    ctx.lineTo(-16, 28);
    ctx.moveTo(10, 18);
    ctx.lineTo(16, 28);
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-18, 31, 4, 0, Math.PI * 2);
    ctx.arc(18, 31, 4, 0, Math.PI * 2);
    ctx.fillStyle = tire;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -45, 8, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f7f7f7";
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -49);
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
    const body = isEnemy ? "#7d8c99" : "#aab7c4";
    const nose = isEnemy ? "#c74b46" : "#d94e41";
    const accent = isEnemy ? "#f5d77d" : "#ffe08a";
    const cockpit = "#79bde8";
    const trim = "#1f2d3a";

    ctx.beginPath();
    ctx.moveTo(-52, 4);
    ctx.lineTo(-18, -2);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-34, 18);
    ctx.quadraticCurveTo(-44, 20, -52, 4);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(52, 4);
    ctx.lineTo(18, -2);
    ctx.lineTo(8, 10);
    ctx.lineTo(34, 18);
    ctx.quadraticCurveTo(44, 20, 52, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -47);
    ctx.bezierCurveTo(10, -44, 14, -26, 12, 14);
    ctx.bezierCurveTo(10, 28, 9, 38, 4, 46);
    ctx.lineTo(0, 48);
    ctx.lineTo(-4, 46);
    ctx.bezierCurveTo(-9, 38, -10, 28, -12, 14);
    ctx.bezierCurveTo(-14, -26, -10, -44, 0, -47);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-8, -44);
    ctx.quadraticCurveTo(0, -49, 8, -44);
    ctx.lineTo(7, -30);
    ctx.quadraticCurveTo(0, -33, -7, -30);
    ctx.closePath();
    ctx.fillStyle = nose;
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(5, -6);
    ctx.lineTo(3, 26);
    ctx.lineTo(-3, 26);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.quadraticCurveTo(-9, -2, -4, 5);
    ctx.lineTo(4, 5);
    ctx.quadraticCurveTo(9, -2, 8, -12);
    ctx.quadraticCurveTo(0, -18, -8, -12);
    ctx.closePath();
    ctx.fillStyle = cockpit;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, 31);
    ctx.lineTo(-5, 28);
    ctx.lineTo(-3, 34);
    ctx.lineTo(-16, 38);
    ctx.quadraticCurveTo(-22, 38, -20, 31);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(20, 31);
    ctx.lineTo(5, 28);
    ctx.lineTo(3, 34);
    ctx.lineTo(16, 38);
    ctx.quadraticCurveTo(22, 38, 20, 31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, 44);
    ctx.lineTo(11, 35);
    ctx.quadraticCurveTo(8, 23, 0, 20);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#666";
    ctx.beginPath();
    [-22, -17, -12].forEach((y) => {
      ctx.moveTo(-5.3, y);
      ctx.arc(-7, y, 1.7, 0, Math.PI * 2);
      ctx.moveTo(8.7, y);
      ctx.arc(7, y, 1.7, 0, Math.PI * 2);
    });
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -47, 6, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ddd";
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

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
    const body = isEnemy ? "#7b5ea7" : "#5b8def";
    const wing = isEnemy ? "#5a4a76" : "#3b6fd8";
    const accent = isEnemy ? "#ffcf70" : "#ffd166";
    const cockpit = "#92d4ff";
    const trim = "#1f2940";

    ctx.beginPath();
    ctx.moveTo(-55, 12);
    ctx.lineTo(-12, -2);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-34, 30);
    ctx.quadraticCurveTo(-48, 28, -55, 12);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(55, 12);
    ctx.lineTo(12, -2);
    ctx.lineTo(6, 11);
    ctx.lineTo(34, 30);
    ctx.quadraticCurveTo(48, 28, 55, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.bezierCurveTo(9, -44, 12, -24, 11, 18);
    ctx.bezierCurveTo(10, 28, 7, 38, 3, 46);
    ctx.lineTo(0, 48);
    ctx.lineTo(-3, 46);
    ctx.bezierCurveTo(-7, 38, -10, 28, -11, 18);
    ctx.bezierCurveTo(-12, -24, -9, -44, 0, -48);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-6, -42);
    ctx.quadraticCurveTo(0, -46, 6, -42);
    ctx.lineTo(5, -26);
    ctx.quadraticCurveTo(0, -29, -5, -26);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-7, -20);
    ctx.quadraticCurveTo(-9, -8, -3, 2);
    ctx.lineTo(3, 2);
    ctx.quadraticCurveTo(9, -8, 7, -20);
    ctx.quadraticCurveTo(0, -26, -7, -20);
    ctx.closePath();
    ctx.fillStyle = cockpit;
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.lineTo(2, 30);
    ctx.lineTo(-2, 30);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-22, 30);
    ctx.lineTo(-4, 27);
    ctx.lineTo(-2, 34);
    ctx.lineTo(-16, 39);
    ctx.quadraticCurveTo(-24, 38, -22, 30);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(22, 30);
    ctx.lineTo(4, 27);
    ctx.lineTo(2, 34);
    ctx.lineTo(16, 39);
    ctx.quadraticCurveTo(24, 38, 22, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 44);
    ctx.lineTo(12, 35);
    ctx.quadraticCurveTo(9, 18, 0, 14);
    ctx.closePath();
    ctx.fillStyle = wing;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 46, 8, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3d4654";
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, 49);
    ctx.quadraticCurveTo(0, 57, 4, 49);
    ctx.quadraticCurveTo(0, 53, -4, 49);
    ctx.closePath();
    ctx.fillStyle = "#ff8a3d";
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
      previewRoundRect(ctx, -46, 6, 92, 12, 6);
      ctx.fillStyle = "#f2c14e";
      ctx.fill();
      ctx.stroke();
      previewRoundRect(ctx, -42, -16, 84, 12, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff4b0";
      ctx.fillRect(-8, -16, 16, 12);
      ctx.fillRect(-8, 6, 16, 12);
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.bezierCurveTo(12, -40, 16, -24, 14, 12);
      ctx.bezierCurveTo(12, 28, 8, 40, 0, 46);
      ctx.bezierCurveTo(-8, 40, -12, 28, -14, 12);
      ctx.bezierCurveTo(-16, -24, -12, -40, 0, -45);
      ctx.closePath();
      ctx.fillStyle = "#e44d3a";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#87c6eb";
      ctx.beginPath();
      ctx.ellipse(0, -6, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      previewRoundRect(ctx, -18, 28, 36, 8, 4);
      ctx.fillStyle = "#f2c14e";
      ctx.fill();
      ctx.stroke();
    }

    if (planeId === "mustang") {
      ctx.beginPath();
      ctx.moveTo(-52, 4);
      ctx.lineTo(-18, -2);
      ctx.lineTo(-8, 10);
      ctx.lineTo(-34, 18);
      ctx.quadraticCurveTo(-44, 20, -52, 4);
      ctx.closePath();
      ctx.fillStyle = "#aab7c4";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(52, 4);
      ctx.lineTo(18, -2);
      ctx.lineTo(8, 10);
      ctx.lineTo(34, 18);
      ctx.quadraticCurveTo(44, 20, 52, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -47);
      ctx.bezierCurveTo(10, -44, 14, -26, 12, 14);
      ctx.bezierCurveTo(10, 30, 6, 42, 0, 48);
      ctx.bezierCurveTo(-6, 42, -10, 30, -12, 14);
      ctx.bezierCurveTo(-14, -26, -10, -44, 0, -47);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d94e41";
      ctx.beginPath();
      ctx.moveTo(-8, -44);
      ctx.quadraticCurveTo(0, -49, 8, -44);
      ctx.lineTo(7, -30);
      ctx.quadraticCurveTo(0, -33, -7, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#79bde8";
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(-9, -2, -4, 5);
      ctx.lineTo(4, 5);
      ctx.quadraticCurveTo(9, -2, 8, -12);
      ctx.quadraticCurveTo(0, -18, -8, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (planeId === "jet") {
      ctx.beginPath();
      ctx.moveTo(-55, 12);
      ctx.lineTo(-12, -2);
      ctx.lineTo(-6, 11);
      ctx.lineTo(-34, 30);
      ctx.quadraticCurveTo(-48, 28, -55, 12);
      ctx.closePath();
      ctx.fillStyle = "#3b6fd8";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(55, 12);
      ctx.lineTo(12, -2);
      ctx.lineTo(6, 11);
      ctx.lineTo(34, 30);
      ctx.quadraticCurveTo(48, 28, 55, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.bezierCurveTo(9, -44, 12, -24, 11, 18);
      ctx.bezierCurveTo(10, 30, 6, 42, 0, 48);
      ctx.bezierCurveTo(-6, 42, -10, 30, -11, 18);
      ctx.bezierCurveTo(-12, -24, -9, -44, 0, -48);
      ctx.closePath();
      ctx.fillStyle = "#5b8def";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(-6, -42);
      ctx.quadraticCurveTo(0, -46, 6, -42);
      ctx.lineTo(5, -26);
      ctx.quadraticCurveTo(0, -29, -5, -26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#92d4ff";
      ctx.beginPath();
      ctx.moveTo(-7, -20);
      ctx.quadraticCurveTo(-9, -8, -3, 2);
      ctx.lineTo(3, 2);
      ctx.quadraticCurveTo(9, -8, 7, -20);
      ctx.quadraticCurveTo(0, -26, -7, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
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
