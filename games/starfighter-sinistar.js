const ships = {
  falcon: { name: "Millennium Falcon", note: "Heavy freighter, double lasers, tougher handling.", radius: 18, acceleration: 520, drag: 0.978, maxSpeed: 255, laserCount: 2, laserSpread: 9 },
  xwing: { name: "X-wing Fighter", note: "Quick starfighter, narrow profile, sharp control.", radius: 14, acceleration: 640, drag: 0.976, maxSpeed: 305, laserCount: 1, laserSpread: 0 }
};

const stages = [
  { name: "Trade Federation Ambush", bossName: "Droid Control Ship", bossType: "droid", killsNeeded: 9, enemyRate: 1.25, enemySpeed: 72, asteroidCount: 12, lockOn: true },
  { name: "Imperial Blockade", bossName: "Imperial Star Destroyer", bossType: "destroyer", killsNeeded: 13, enemyRate: 1, enemySpeed: 84, asteroidCount: 15, lockOn: true },
  { name: "Death Star Run", bossName: "Death Star", bossType: "deathstar", killsNeeded: 16, enemyRate: 0.82, enemySpeed: 96, asteroidCount: 18, lockOn: false }
];

const WORLD = { width: 900, height: 560 };
const PLAYER_LASER_SPEED = 520;
const ENEMY_LASER_SPEED = 260;
const TORPEDO_SPEED = 520;
const MAX_ALLOWED_HITS = 6;
const STARTING_ENEMY_LIMIT = 3;
const RESPAWN_AFTER_KILL_TIME = 2;
const NO_KILL_REINFORCEMENT_TIME = 5;
const LEADERBOARD_KEY = "miniGames.starfighterArenaLeaderboard";
const COUNTDOWN_TIME = 3.8;
const EXPLOSION_SEQUENCE_TIME = 3.6;
let currentStarfighterGame = null;

function renderShipButtons() {
  return Object.entries(ships).map(([id, ship]) => `
    <button class="starship-choice ${id === "xwing" ? "is-selected" : ""}" type="button" data-starship-choice="${id}">
      <canvas class="starship-preview" width="130" height="82" data-starship-preview="${id}" aria-hidden="true"></canvas>
      <strong>${ship.name}</strong>
      <span>${ship.note}</span>
    </button>
  `).join("");
}

export function renderStarfighterSinistar() {
  if (typeof document !== "undefined") setTimeout(() => initStarfighterSinistar(), 0);
  return `
    <section class="panel game-panel star-panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
        <button class="secondary-button" type="button" data-star-show-leaderboard>Leaderboard</button>
      </div>
      <div class="star-game" data-selected-ship="xwing">
        <div class="game-overlay" hidden data-star-overlay></div>
        <div class="game-header"><div><h2>Starfighter Arena</h2><p class="intro">Choose a ship, blast TIE fighters and asteroids, then land one Proton Torpedo on the boss.</p></div></div>
        <div class="star-select" data-star-select>
          <h3>Choose your ship</h3>
          <div class="starship-choice-grid">${renderShipButtons()}</div>
          <button class="primary-button" type="button" data-start-stars>Launch</button>
        </div>
        <div class="star-deck" hidden data-star-deck>
          <div class="star-canvas-wrap">
            <canvas class="star-canvas" width="${WORLD.width}" height="${WORLD.height}" aria-label="Starfighter Arena game area"></canvas>
            <div class="game-stats surface-stats star-stats" aria-live="polite">
              <span>Level <strong data-star-level>1</strong></span>
              <span>Score <strong data-star-score>0</strong></span>
              <span>Hits <strong data-star-hits>0/6</strong></span>
              <span>Kills <strong data-star-kills>0/9</strong></span>
            </div>
            <div class="star-controls" aria-label="Starfighter controls">
              <div class="star-joystick" data-star-joystick aria-label="Move and aim"><span data-star-knob></span></div>
              <div class="star-action-pad">
                <button class="star-fire-button" type="button" data-star-fire>Laser</button>
                <button class="star-torpedo-button" type="button" data-star-torpedo disabled>Proton Torpedo</button>
              </div>
            </div>
            <div class="game-message star-message" data-star-message><strong>Ready</strong><span>Use the pad to move and aim. Fire red lasers at fighters and rocks.</span></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function initStarfighterSinistar() {
  const root = document.querySelector(".star-game");
  if (!root) return;
  if (currentStarfighterGame) currentStarfighterGame.stop();

  const panel = root.closest(".star-panel");
  const selectScreen = root.querySelector("[data-star-select]");
  const deck = root.querySelector("[data-star-deck]");
  const canvas = root.querySelector(".star-canvas");
  const ctx = canvas.getContext("2d");
  const overlayEl = root.querySelector("[data-star-overlay]");
  const messageEl = root.querySelector("[data-star-message]");
  const levelEl = root.querySelector("[data-star-level]");
  const scoreEl = root.querySelector("[data-star-score]");
  const hitsEl = root.querySelector("[data-star-hits]");
  const killsEl = root.querySelector("[data-star-kills]");
  const torpedoButton = root.querySelector("[data-star-torpedo]");
  const joystick = root.querySelector("[data-star-joystick]");
  const knob = root.querySelector("[data-star-knob]");
  const shipButtons = [...root.querySelectorAll("[data-starship-choice]")];
  const input = { x: 0, y: 0, active: false, pointerId: null, fire: false, firePointerId: null, keys: new Set() };
  const state = {
    running: false, mode: "select", selectedShip: "xwing", level: 0, score: 0, hits: 0, kills: 0,
    player: null, enemies: [], asteroids: [], playerLasers: [], enemyLasers: [], torpedo: null,
    bursts: [], stars: [], boss: null, torpedoAvailable: false, torpedoFired: false,
    spawnTimer: 0, enemyLimit: STARTING_ENEMY_LIMIT, noKillTimer: 0, laserCooldown: 0,
    bossLaserTimer: 0, lastTime: 0, messageTimer: 0, deathCharge: 0, pausedMode: null,
    countdownTimer: 0, explosionTimer: 0, explosionTarget: null, pendingGameOver: null
  };
  const stage = () => stages[state.level];
  const ship = () => ships[state.selectedShip];

  function chooseShip(shipId) {
    state.selectedShip = shipId;
    root.dataset.selectedShip = shipId;
    shipButtons.forEach((button) => button.classList.toggle("is-selected", button.dataset.starshipChoice === shipId));
  }

  function setMessage(title, detail, hold = 2.2) {
    messageEl.classList.add("is-visible");
    messageEl.querySelector("strong").textContent = title;
    messageEl.querySelector("span").textContent = detail;
    state.messageTimer = hold;
  }

  function setOverlay(title, detail, buttons) {
    overlayEl.hidden = false;
    overlayEl.innerHTML = `<div class="overlay-card"><h3>${title}</h3><div class="overlay-detail">${detail}</div><div class="overlay-actions">${buttons}</div></div>`;
  }

  function hideOverlay() {
    overlayEl.hidden = true;
    overlayEl.innerHTML = "";
    if (state.pausedMode) {
      state.mode = state.pausedMode;
      state.pausedMode = null;
      state.running = true;
      state.lastTime = 0;
      requestAnimationFrame(loop);
    }
  }

  function updateHud() {
    levelEl.textContent = String(state.level + 1);
    scoreEl.textContent = String(state.score);
    hitsEl.textContent = `${Math.min(MAX_ALLOWED_HITS, state.hits)}/${MAX_ALLOWED_HITS}`;
    killsEl.textContent = state.boss ? "Boss" : `${state.kills}/${stage().killsNeeded}`;
    torpedoButton.disabled = !state.torpedoAvailable || state.torpedoFired || state.mode !== "boss";
  }

  function makeStars() {
    state.stars = Array.from({ length: 120 }, () => ({ x: Math.random() * WORLD.width, y: Math.random() * WORLD.height, r: Math.random() * 1.6 + 0.4, alpha: Math.random() * 0.55 + 0.35 }));
  }

  function resetLevel() {
    state.mode = "countdown";
    state.hits = 0;
    state.kills = 0;
    state.player = { x: WORLD.width / 2, y: WORLD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invulnerable: 1.3 };
    state.enemies = [];
    state.asteroids = [];
    state.playerLasers = [];
    state.enemyLasers = [];
    state.torpedo = null;
    state.bursts = [];
    state.boss = null;
    state.torpedoAvailable = false;
    state.torpedoFired = false;
    state.spawnTimer = 0;
    state.enemyLimit = STARTING_ENEMY_LIMIT;
    state.noKillTimer = 0;
    state.laserCooldown = 0;
    state.bossLaserTimer = 1.2;
    state.lastTime = 0;
    state.deathCharge = 0;
    state.countdownTimer = COUNTDOWN_TIME;
    state.explosionTimer = 0;
    state.explosionTarget = null;
    state.pendingGameOver = null;
    input.x = 0;
    input.y = 0;
    input.pointerId = null;
    input.firePointerId = null;
    knob.style.transform = "translate(-50%, -50%)";
    for (let i = 0; i < stage().asteroidCount; i += 1) spawnAsteroid(true);
    setMessage(`Level ${state.level + 1}: ${stage().name}`, "Get ready.", 3);
    updateHud();
  }

  function startGame() {
    state.running = true;
    state.level = 0;
    state.score = 0;
    state.pausedMode = null;
    selectScreen.hidden = true;
    deck.hidden = false;
    hideOverlay();
    makeStars();
    resetLevel();
    requestAnimationFrame(loop);
  }

  function nextLevel() {
    state.level += 1;
    state.running = true;
    hideOverlay();
    resetLevel();
    requestAnimationFrame(loop);
  }

  function restartToSelect() {
    state.mode = "select";
    state.running = false;
    state.pausedMode = null;
    hideOverlay();
    selectScreen.hidden = false;
    deck.hidden = true;
    updateHud();
  }

  function spawnAsteroid(initial = false) {
    const large = Math.random() > 0.58;
    const radius = large ? rand(27, 40) : rand(15, 23);
    const point = initial ? { x: Math.random() * WORLD.width, y: Math.random() * WORLD.height } : randomEdgePoint();
    const asteroid = {
      x: point.x, y: point.y, vx: rand(-42, 42), vy: rand(-34, 34), radius,
      hits: large ? 2 : 1, spin: rand(-1.8, 1.8), angle: Math.random() * Math.PI * 2,
      chunks: Array.from({ length: 9 }, (_, index) => ({ a: (index / 9) * Math.PI * 2, r: radius * rand(0.72, 1.08) }))
    };
    if (distance(asteroid, state.player || { x: WORLD.width / 2, y: WORLD.height / 2 }) < 130) {
      asteroid.x = Math.random() < 0.5 ? 40 : WORLD.width - 40;
      asteroid.y = Math.random() * WORLD.height;
    }
    state.asteroids.push(asteroid);
  }

  function spawnEnemy() {
    const edge = randomEdgePoint();
    const angle = Math.atan2(state.player.y - edge.y, state.player.x - edge.x);
    state.enemies.push({ x: edge.x, y: edge.y, vx: 0, vy: 0, angle, radius: 16, fireTimer: rand(1.1, 2.25), wobble: Math.random() * Math.PI * 2 });
  }

  function spawnBoss() {
    state.mode = "boss";
    state.enemies = [];
    state.enemyLasers = [];
    state.torpedoAvailable = true;
    state.bossLaserTimer = 1.1;
    state.boss = { x: WORLD.width + 120, y: WORLD.height * 0.34, vx: -78, radius: stage().bossType === "deathstar" ? 68 : 58, angle: Math.PI, type: stage().bossType, name: stage().bossName };
    setMessage(`${stage().bossName} inbound`, stage().lockOn ? "Proton Torpedo armed. Aim close and fire." : "Proton Torpedo armed. No lock-on for the Death Star.", 3);
    updateHud();
  }

  function fireLaser() {
    if (!["battle", "boss"].includes(state.mode) || state.laserCooldown > 0) return;
    state.laserCooldown = 0.18;
    for (let i = 0; i < ship().laserCount; i += 1) {
      const offset = ship().laserCount === 1 ? 0 : (i === 0 ? -ship().laserSpread : ship().laserSpread);
      const side = perpendicular(state.player.angle);
      state.playerLasers.push({
        x: state.player.x + Math.cos(state.player.angle) * ship().radius + side.x * offset,
        y: state.player.y + Math.sin(state.player.angle) * ship().radius + side.y * offset,
        vx: Math.cos(state.player.angle) * PLAYER_LASER_SPEED,
        vy: Math.sin(state.player.angle) * PLAYER_LASER_SPEED,
        life: 1.05,
        radius: 4
      });
    }
  }

  function fireTorpedo() {
    if (state.mode !== "boss" || !state.torpedoAvailable || state.torpedoFired || !state.boss) return;
    state.torpedoFired = true;
    state.torpedoAvailable = false;
    let angle = state.player.angle;
    if (stage().lockOn) {
      const bossAngle = Math.atan2(state.boss.y - state.player.y, state.boss.x - state.player.x);
      if (Math.abs(shortAngle(angle, bossAngle)) < 0.38) angle = bossAngle;
    }
    state.torpedo = {
      x: state.player.x + Math.cos(angle) * (ship().radius + 8),
      y: state.player.y + Math.sin(angle) * (ship().radius + 8),
      vx: Math.cos(angle) * TORPEDO_SPEED,
      vy: Math.sin(angle) * TORPEDO_SPEED,
      angle,
      radius: 7,
      life: 1.85
    };
    setMessage("Proton Torpedo away", "Make it count.", 1.2);
    updateHud();
  }

  function bossMissed() {
    if (state.mode !== "boss") return;
    state.mode = "bossCharge";
    state.deathCharge = 1;
    state.enemyLasers = [];
    state.playerLasers = [];
    setMessage("Boss weapon charging", "The shot missed.", 1);
    updateHud();
  }

  function winLevel() {
    state.score += 2500 + state.level * 1000 + Math.max(0, MAX_ALLOWED_HITS - state.hits) * 350;
    state.mode = "bossExploding";
    state.running = true;
    state.explosionTimer = EXPLOSION_SEQUENCE_TIME;
    state.explosionTarget = { x: state.boss.x, y: state.boss.y, radius: state.boss.radius, type: state.boss.type };
    state.enemies = [];
    state.enemyLasers = [];
    state.playerLasers = [];
    state.torpedo = null;
    addBurst(state.explosionTarget.x, state.explosionTarget.y, "#ffef8a", 60, 1.2);
    updateHud();
  }

  function showLevelComplete() {
    state.mode = "levelComplete";
    state.running = false;
    state.boss = null;
    state.explosionTarget = null;
    if (state.level >= stages.length - 1) {
      setOverlay("Death Star Destroyed", renderFinalScoreForm("Final score", state.score), `<button class="primary-button" type="button" data-star-save-score>Save Score</button><button class="secondary-button" type="button" data-star-restart>Play Again</button>`);
    } else {
      setOverlay("Level Complete", `<p>${stage().bossName} destroyed.</p><p>Score: <strong>${state.score}</strong></p>`, `<button class="primary-button" type="button" data-star-next>Next Level</button>`);
    }
  }

  function gameOver(title = "Ship Destroyed", detail = "Your fighter was lost.") {
    if (state.mode !== "playerExploding") {
      state.mode = "playerExploding";
      state.running = true;
      state.explosionTimer = EXPLOSION_SEQUENCE_TIME;
      state.explosionTarget = { x: state.player.x, y: state.player.y, radius: ship().radius, type: "player" };
      state.pendingGameOver = { title, detail };
      state.enemies = [];
      state.enemyLasers = [];
      state.playerLasers = [];
      input.fire = false;
      resetJoystick();
      addBurst(state.player.x, state.player.y, "#ffb45c", 54, 1.1);
      updateHud();
      return;
    }
    state.mode = "gameOver";
    state.running = false;
    updateHud();
    setOverlay(title, `<p>${detail}</p><p>TIE kills: <strong>${state.kills}</strong></p>${renderFinalScoreForm("Final score", state.score)}`, `<button class="primary-button" type="button" data-star-save-score>Save Score</button><button class="secondary-button" type="button" data-star-restart>Play Again</button><button class="secondary-button" type="button" data-star-select-again>Choose Ship</button>`);
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
      level: state.level + 1,
      kills: state.kills,
      ship: ship().name,
      createdAt: new Date().toISOString()
    });
    entries.sort((a, b) => b.score - a.score);
    saveLeaderboard(entries);
    showLeaderboard("Score Saved");
  }

  function showLeaderboard(title = "Leaderboard") {
    if (["battle", "boss", "bossCharge"].includes(state.mode)) {
      state.pausedMode = state.mode;
      state.mode = "paused";
      state.running = false;
      input.fire = false;
      resetJoystick();
    }
    const entries = getLeaderboard();
    const rows = entries.length
      ? entries.map((entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.name)}</td>
          <td>${entry.score}</td>
          <td>${entry.kills}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No scores yet.</td></tr>`;
    setOverlay(
      title,
      `<table class="leaderboard-table"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Kills</th></tr></thead><tbody>${rows}</tbody></table>`,
      `<button class="primary-button" type="button" data-star-select-again>Play Again</button><button class="secondary-button" type="button" data-star-close-overlay>Close</button>`
    );
  }

  function hitPlayer(reason) {
    if (!["battle", "boss"].includes(state.mode) || state.player.invulnerable > 0) return;
    state.hits += 1;
    state.player.invulnerable = 1.1;
    addBurst(state.player.x, state.player.y, "#8ee7ff", 18);
    if (state.hits > MAX_ALLOWED_HITS) {
      gameOver("Ship Destroyed", reason);
    } else {
      const remaining = MAX_ALLOWED_HITS - state.hits + 1;
      setMessage("Shields hit", `${remaining} hit${remaining === 1 ? "" : "s"} until destruction.`, 1.4);
    }
    updateHud();
  }

  function update(dt) {
    if (!["countdown", "battle", "boss", "bossCharge", "bossExploding", "playerExploding"].includes(state.mode)) return;
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) messageEl.classList.remove("is-visible");
    if (state.mode === "countdown") {
      updateCountdown(dt);
      updateStars();
      updateAsteroids(dt);
      updateBursts(dt);
      return;
    }
    if (state.mode === "bossExploding" || state.mode === "playerExploding") {
      updateExplosionSequence(dt);
      updateStars();
      updateAsteroids(dt);
      updateBursts(dt);
      return;
    }
    state.laserCooldown = Math.max(0, state.laserCooldown - dt);
    if (input.fire) fireLaser();
    updateStars();
    updatePlayer(dt);
    updateAsteroids(dt);
    updateLasers(dt);
    updateBursts(dt);
    if (state.mode === "battle") {
      updateEnemyReinforcements(dt);
      if (state.asteroids.length < stage().asteroidCount) spawnAsteroid();
      if (state.kills >= stage().killsNeeded) spawnBoss();
    }
    updateEnemies(dt);
    updateBoss(dt);
    checkCollisions();
    if (state.mode === "bossCharge") {
      state.deathCharge -= dt;
      if (state.deathCharge <= 0) gameOver("Superlaser Strike", `${stage().bossName} returned fire after the missed torpedo.`);
    }
  }

  function updateCountdown(dt) {
    state.countdownTimer -= dt;
    if (state.countdownTimer <= 0) {
      state.mode = "battle";
      state.lastTime = 0;
      setMessage("Go", "Blast TIE fighters and watch the asteroids.", 1);
    }
  }

  function updateExplosionSequence(dt) {
    state.explosionTimer -= dt;
    const target = state.explosionTarget;
    if (target && Math.random() < 0.38) {
      const angle = Math.random() * Math.PI * 2;
      const spread = rand(4, target.radius * 1.2 + 18);
      addBurst(target.x + Math.cos(angle) * spread, target.y + Math.sin(angle) * spread, Math.random() > 0.45 ? "#ffef8a" : "#ff7a3d", 12, rand(0.7, 1.3));
    }
    if (state.explosionTimer <= 0) {
      if (state.mode === "bossExploding") {
        showLevelComplete();
      } else {
        const pending = state.pendingGameOver || { title: "Ship Destroyed", detail: "Your fighter was lost." };
        state.mode = "playerExploding";
        gameOver(pending.title, pending.detail);
      }
    }
  }

  function updateEnemyReinforcements(dt) {
    state.noKillTimer += dt;
    if (state.noKillTimer >= NO_KILL_REINFORCEMENT_TIME) {
      state.enemyLimit += 1;
      state.noKillTimer = 0;
      state.spawnTimer = 0;
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) return;

    while (state.enemies.length < state.enemyLimit && state.kills < stage().killsNeeded) {
      spawnEnemy();
    }
    state.spawnTimer = stage().enemyRate;
  }

  function updateStars() {
    state.stars.forEach((star) => {
      star.x = wrap(star.x - state.player.vx * 0.018, 0, WORLD.width);
      star.y = wrap(star.y - state.player.vy * 0.018, 0, WORLD.height);
    });
  }

  function updatePlayer(dt) {
    if (state.mode === "bossCharge") return;
    const keys = keyDirection();
    if (keys) {
      input.x = keys.x;
      input.y = keys.y;
    }
    const magnitude = Math.hypot(input.x, input.y);
    if (magnitude > 0.08) {
      const nx = input.x / magnitude;
      const ny = input.y / magnitude;
      state.player.angle = Math.atan2(ny, nx);
      state.player.vx += nx * ship().acceleration * dt;
      state.player.vy += ny * ship().acceleration * dt;
    }
    const drag = Math.pow(ship().drag, dt * 60);
    state.player.vx *= drag;
    state.player.vy *= drag;
    const speed = Math.hypot(state.player.vx, state.player.vy);
    if (speed > ship().maxSpeed) {
      state.player.vx = (state.player.vx / speed) * ship().maxSpeed;
      state.player.vy = (state.player.vy / speed) * ship().maxSpeed;
    }
    state.player.x = clamp(state.player.x + state.player.vx * dt, ship().radius, WORLD.width - ship().radius);
    state.player.y = clamp(state.player.y + state.player.vy * dt, ship().radius, WORLD.height - ship().radius);
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
  }

  function updateEnemies(dt) {
    state.enemies.forEach((enemy) => {
      const targetAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      enemy.wobble += dt * 3.2;
      enemy.angle += shortAngle(enemy.angle, targetAngle + Math.sin(enemy.wobble) * 0.35) * dt * 1.8;
      enemy.vx = Math.cos(enemy.angle) * stage().enemySpeed;
      enemy.vy = Math.sin(enemy.angle) * stage().enemySpeed;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && distance(enemy, state.player) < 430) {
        fireEnemyLaser(enemy, 0.22);
        enemy.fireTimer = rand(1.4, 2.6);
      }
    });
    state.enemies = state.enemies.filter((enemy) => !enemy.dead && inBounds(enemy, 80));
  }

  function updateBoss(dt) {
    if (!state.boss) return;
    if (state.boss.x > WORLD.width - 130) state.boss.x += state.boss.vx * dt;
    else state.boss.y += Math.sin(performance.now() / 760) * 16 * dt;
    state.boss.angle = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x);
    if (state.mode === "boss") {
      state.bossLaserTimer -= dt;
      if (state.bossLaserTimer <= 0) {
        for (let i = 0; i < 3; i += 1) fireBossLaser(i - 1);
        state.bossLaserTimer = rand(1, 1.7);
      }
    }
  }

  function updateAsteroids(dt) {
    state.asteroids.forEach((asteroid) => {
      asteroid.x = wrap(asteroid.x + asteroid.vx * dt, -50, WORLD.width + 50);
      asteroid.y = wrap(asteroid.y + asteroid.vy * dt, -50, WORLD.height + 50);
      asteroid.angle += asteroid.spin * dt;
    });
  }

  function updateLasers(dt) {
    const move = (item) => {
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.life -= dt;
    };
    state.playerLasers.forEach(move);
    state.enemyLasers.forEach(move);
    if (state.torpedo) {
      move(state.torpedo);
      state.torpedo.angle = Math.atan2(state.torpedo.vy, state.torpedo.vx);
      if (state.torpedo.life <= 0 || !inBounds(state.torpedo, 80)) {
        state.torpedo = null;
        bossMissed();
      }
    }
    state.playerLasers = state.playerLasers.filter((laser) => laser.life > 0 && inBounds(laser, 40));
    state.enemyLasers = state.enemyLasers.filter((laser) => laser.life > 0 && inBounds(laser, 40));
  }

  function updateBursts(dt) {
    state.bursts.forEach((burst) => {
      burst.life -= dt;
      burst.parts.forEach((part) => {
        part.x += part.vx * dt;
        part.y += part.vy * dt;
      });
    });
    state.bursts = state.bursts.filter((burst) => burst.life > 0);
  }

  function checkCollisions() {
    state.playerLasers.forEach((laser) => {
      state.enemies.forEach((enemy) => {
        if (!enemy.dead && distance(laser, enemy) < enemy.radius + laser.radius) {
          enemy.dead = true;
          laser.life = 0;
          state.kills += 1;
          state.noKillTimer = 0;
          state.spawnTimer = RESPAWN_AFTER_KILL_TIME;
          state.score += 150;
          addBurst(enemy.x, enemy.y, "#9be7ff", 16);
          updateHud();
        }
      });
      state.asteroids.forEach((asteroid) => {
        if (!asteroid.dead && distance(laser, asteroid) < asteroid.radius + laser.radius) {
          laser.life = 0;
          asteroid.hits -= 1;
          addBurst(laser.x, laser.y, "#ffaa5c", 8);
          if (asteroid.hits <= 0) {
            asteroid.dead = true;
            state.score += asteroid.radius > 24 ? 90 : 50;
            addBurst(asteroid.x, asteroid.y, "#d0c0a3", 20);
            updateHud();
          }
        }
      });
    });
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    state.asteroids = state.asteroids.filter((asteroid) => !asteroid.dead);
    state.enemyLasers.forEach((laser) => {
      if (distance(laser, state.player) < ship().radius + laser.radius) {
        laser.life = 0;
        hitPlayer("Enemy lasers broke through your shields.");
      }
    });
    state.enemies.forEach((enemy) => {
      if (distance(enemy, state.player) < enemy.radius + ship().radius) {
        enemy.dead = true;
        addBurst(enemy.x, enemy.y, "#9be7ff", 12);
        hitPlayer("A TIE fighter clipped your ship.");
      }
    });
    state.asteroids.forEach((asteroid) => {
      if (distance(asteroid, state.player) < asteroid.radius + ship().radius - 3) {
        asteroid.dead = true;
        addBurst(asteroid.x, asteroid.y, "#d0c0a3", 18);
        hitPlayer("An asteroid smashed into your hull.");
      }
    });
    if (state.torpedo && state.boss && distance(state.torpedo, state.boss) < state.boss.radius + state.torpedo.radius) winLevel();
  }

  function fireEnemyLaser(enemy, inaccuracy) {
    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x) + rand(-inaccuracy, inaccuracy);
    state.enemyLasers.push({ x: enemy.x + Math.cos(angle) * 18, y: enemy.y + Math.sin(angle) * 18, vx: Math.cos(angle) * ENEMY_LASER_SPEED, vy: Math.sin(angle) * ENEMY_LASER_SPEED, radius: 4, life: 1.7 });
  }

  function fireBossLaser(offset) {
    const angle = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x) + rand(-0.72, 0.72) + offset * 0.12;
    state.enemyLasers.push({ x: state.boss.x + Math.cos(angle) * state.boss.radius * 0.7, y: state.boss.y + Math.sin(angle) * state.boss.radius * 0.7, vx: Math.cos(angle) * ENEMY_LASER_SPEED * 0.9, vy: Math.sin(angle) * ENEMY_LASER_SPEED * 0.9, radius: 5, life: 2.1 });
  }

  function addBurst(x, y, color, count, life = 0.55) {
    state.bursts.push({
      color,
      life,
      maxLife: life,
      parts: Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = rand(40, 230);
        return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: rand(1.6, 3.6) };
      })
    });
  }

  function draw() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    drawSpace();
    state.asteroids.forEach(drawAsteroid);
    state.playerLasers.forEach((laser) => drawLaser(laser, "#ff3d36", "#ffd1ca"));
    state.enemyLasers.forEach((laser) => drawLaser(laser, "#57ff70", "#d7ffdf"));
    state.enemies.forEach(drawTieFighter);
    if (state.boss) drawBoss(state.boss);
    if (state.torpedo) drawTorpedo(state.torpedo);
    state.bursts.forEach(drawBurst);
    if (state.player && state.mode !== "playerExploding") drawPlayerShip();
    if (state.mode === "countdown") drawCountdown();
    if (state.mode === "bossExploding" || state.mode === "playerExploding") drawExplosionOverlay();
    if (state.mode === "bossCharge" && state.boss) drawSuperlaserCharge();
  }

  function drawSpace() {
    const gradient = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
    gradient.addColorStop(0, "#040712");
    gradient.addColorStop(0.52, "#11162e");
    gradient.addColorStop(1, "#050810");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    state.stars.forEach((star) => {
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawPlayerShip() {
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    ctx.rotate(state.player.angle);
    if (state.player.invulnerable > 0 && Math.floor(state.player.invulnerable * 12) % 2 === 0) ctx.globalAlpha = 0.48;
    drawShipShape(ctx, state.selectedShip, 1);
    ctx.restore();
  }

  function drawTieFighter(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    ctx.strokeStyle = "#b6c4ce";
    ctx.fillStyle = "#1f2935";
    ctx.lineWidth = 2;
    ctx.fillRect(-6, -18, 7, 36);
    ctx.fillRect(9, -18, 7, 36);
    ctx.beginPath();
    ctx.arc(5, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeRect(-9, -20, 6, 40);
    ctx.strokeRect(12, -20, 6, 40);
    ctx.restore();
  }

  function drawBoss(boss) {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(boss.angle);
    if (boss.type === "droid") drawDroidBoss();
    if (boss.type === "destroyer") drawDestroyerBoss();
    if (boss.type === "deathstar") drawDeathStarBoss();
    ctx.restore();
  }

  function drawDroidBoss() {
    ctx.save();
    ctx.scale(1.08, 1.08);
    ctx.translate(-64, -64);
    drawDroidBossSprite(ctx);
    ctx.restore();
  }

  function drawDestroyerBoss() {
    ctx.fillStyle = "#aeb7bc";
    ctx.strokeStyle = "#4a555d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(72, 0);
    ctx.lineTo(-62, -45);
    ctx.lineTo(-35, 0);
    ctx.lineTo(-62, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#78858d";
    ctx.fillRect(-15, -13, 32, 26);
    ctx.fillRect(-28, -26, 20, 14);
    ctx.fillRect(-28, 12, 20, 14);
  }

  function drawDeathStarBoss() {
    const gradient = ctx.createRadialGradient(-14, -16, 10, 0, 0, 68);
    gradient.addColorStop(0, "#d9dee2");
    gradient.addColorStop(1, "#6f7a82");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#3e484f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#4b555d";
    ctx.beginPath();
    ctx.moveTo(-64, 3);
    ctx.lineTo(64, 3);
    ctx.stroke();
    ctx.fillStyle = "#44515a";
    ctx.beginPath();
    ctx.arc(21, -18, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.fillStyle = asteroid.hits > 1 ? "#8b7b68" : "#a7947c";
    ctx.strokeStyle = "#453b32";
    ctx.lineWidth = 2;
    ctx.beginPath();
    asteroid.chunks.forEach((chunk, index) => {
      const x = Math.cos(chunk.a) * chunk.r;
      const y = Math.sin(chunk.a) * chunk.r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawLaser(laser, color, core) {
    const angle = Math.atan2(laser.vy, laser.vx);
    ctx.save();
    ctx.translate(laser.x, laser.y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
    ctx.strokeStyle = core;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawTorpedo(torpedo) {
    ctx.save();
    ctx.translate(torpedo.x, torpedo.y);
    ctx.rotate(torpedo.angle);
    ctx.fillStyle = "#f7f1cf";
    ctx.strokeStyle = "#ffbe45";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#ff7d2e";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-27, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawBurst(burst) {
    ctx.globalAlpha = Math.max(0, burst.life / burst.maxLife);
    ctx.fillStyle = burst.color;
    burst.parts.forEach((part) => {
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawCountdown() {
    const remaining = Math.max(0, state.countdownTimer);
    const label = remaining > 0.8 ? String(Math.ceil(remaining - 0.8)) : "GO";
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 16, 0.38)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 96px system-ui, sans-serif";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillStyle = label === "GO" ? "#8effa8" : "#ffffff";
    ctx.strokeText(label, WORLD.width / 2, WORLD.height / 2);
    ctx.fillText(label, WORLD.width / 2, WORLD.height / 2);
    ctx.restore();
  }

  function drawExplosionOverlay() {
    if (!state.explosionTarget) return;
    const elapsed = EXPLOSION_SEQUENCE_TIME - state.explosionTimer;
    const progress = clamp(elapsed / EXPLOSION_SEQUENCE_TIME, 0, 1);
    const pulse = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.25;
    ctx.strokeStyle = progress > 0.75 ? "#ffffff" : "#ffcf62";
    ctx.lineWidth = 4 + progress * 12;
    ctx.beginPath();
    ctx.arc(state.explosionTarget.x, state.explosionTarget.y, 28 + progress * 130, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, 0.7 - progress * 0.55);
    ctx.fillStyle = "#fff3ba";
    ctx.beginPath();
    ctx.arc(state.explosionTarget.x, state.explosionTarget.y, 18 + progress * 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSuperlaserCharge() {
    const progress = 1 - state.deathCharge;
    ctx.save();
    ctx.globalAlpha = 0.35 + progress * 0.55;
    ctx.strokeStyle = "#58ff73";
    ctx.lineWidth = 12 + progress * 22;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(state.boss.x, state.boss.y);
    ctx.lineTo(state.player.x, state.player.y);
    ctx.stroke();
    ctx.restore();
  }

  function loop(timestamp) {
    if (!canvas.isConnected || !state.running) return;
    const dt = Math.min(0.033, (timestamp - (state.lastTime || timestamp)) / 1000);
    state.lastTime = timestamp;
    update(dt);
    draw();
    if (["countdown", "battle", "boss", "bossCharge", "bossExploding", "playerExploding"].includes(state.mode)) requestAnimationFrame(loop);
  }

  function runButtonCommand(target) {
    const shipButton = target.closest("[data-starship-choice]");
    if (shipButton) {
      chooseShip(shipButton.dataset.starshipChoice);
      return true;
    }
    if (target.closest("[data-start-stars]")) {
      startGame();
      return true;
    }
    if (target.closest("[data-star-show-leaderboard]")) {
      showLeaderboard();
      return true;
    }
    if (target.closest("[data-star-save-score]")) {
      saveScoreFromOverlay();
      return true;
    }
    if (target.closest("[data-star-close-overlay]")) {
      hideOverlay();
      return true;
    }
    if (target.closest("[data-star-next]")) {
      nextLevel();
      return true;
    }
    if (target.closest("[data-star-restart]")) {
      restartToSelect();
      return true;
    }
    if (target.closest("[data-star-select-again]")) {
      restartToSelect();
      return true;
    }
    return false;
  }

  let lastPointerCommandAt = 0;

  panel.addEventListener("click", (event) => {
    if (Date.now() - lastPointerCommandAt > 450) runButtonCommand(event.target);
  });
  panel.addEventListener("pointerdown", (event) => {
    if (runButtonCommand(event.target)) {
      lastPointerCommandAt = Date.now();
      event.preventDefault();
      return;
    }
    if (event.target.closest("[data-star-fire]")) {
      event.preventDefault();
      input.fire = true;
      input.firePointerId = event.pointerId;
      fireLaser();
      event.target.setPointerCapture(event.pointerId);
      return;
    }
    if (event.target.closest("[data-star-torpedo]")) {
      event.preventDefault();
      fireTorpedo();
      return;
    }
    if (event.target.closest("[data-star-joystick]")) {
      event.preventDefault();
      input.active = true;
      input.pointerId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
    }
  });
  panel.addEventListener("pointermove", (event) => {
    if (input.active && event.pointerId === input.pointerId) updateJoystick(event);
  });
  panel.addEventListener("pointerup", (event) => {
    if (event.pointerId === input.firePointerId) {
      input.fire = false;
      input.firePointerId = null;
    }
    if (input.active && event.pointerId === input.pointerId) resetJoystick();
  });
  panel.addEventListener("pointercancel", (event) => {
    if (event.pointerId === input.firePointerId) {
      input.fire = false;
      input.firePointerId = null;
    }
    if (event.pointerId === input.pointerId) resetJoystick();
  });

  function preventGameplayGesture(event) {
    if (event.target.closest(".star-canvas-wrap")) event.preventDefault();
  }

  function preventMultiTouchMove(event) {
    if (event.touches.length > 1 || event.target.closest(".star-canvas-wrap")) {
      event.preventDefault();
    }
  }

  panel.addEventListener("touchmove", preventMultiTouchMove, { passive: false });
  panel.addEventListener("gesturestart", preventGameplayGesture);
  panel.addEventListener("gesturechange", preventGameplayGesture);
  panel.addEventListener("gestureend", preventGameplayGesture);

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  function keyDown(event) {
    if (!canvas.isConnected) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      input.keys.add(event.code);
      event.preventDefault();
    }
    if (event.code === "Space") {
      input.fire = true;
      fireLaser();
      event.preventDefault();
    }
    if (event.code === "KeyM") {
      fireTorpedo();
      event.preventDefault();
    }
  }

  function keyUp(event) {
    input.keys.delete(event.code);
    if (event.code === "Space") input.fire = false;
  }

  function keyDirection() {
    let x = 0;
    let y = 0;
    if (input.keys.has("ArrowLeft") || input.keys.has("KeyA")) x -= 1;
    if (input.keys.has("ArrowRight") || input.keys.has("KeyD")) x += 1;
    if (input.keys.has("ArrowUp") || input.keys.has("KeyW")) y -= 1;
    if (input.keys.has("ArrowDown") || input.keys.has("KeyS")) y += 1;
    if (!x && !y) return null;
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  function updateJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const max = rect.width * 0.38;
    const deadzone = rect.width * 0.045;
    const stickDistance = Math.min(max, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * stickDistance;
    const y = Math.sin(angle) * stickDistance;
    const normalized = stickDistance <= deadzone ? 0 : (stickDistance - deadzone) / (max - deadzone);
    const curved = Math.min(1, Math.pow(normalized, 0.72));
    input.x = Math.cos(angle) * curved;
    input.y = Math.sin(angle) * curved;
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function resetJoystick() {
    input.active = false;
    input.pointerId = null;
    input.x = 0;
    input.y = 0;
    knob.style.transform = "translate(-50%, -50%)";
  }

  currentStarfighterGame = {
    stop() {
      state.running = false;
      input.fire = false;
      input.firePointerId = null;
      input.pointerId = null;
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      panel.removeEventListener("touchmove", preventMultiTouchMove);
      panel.removeEventListener("gesturestart", preventGameplayGesture);
      panel.removeEventListener("gesturechange", preventGameplayGesture);
      panel.removeEventListener("gestureend", preventGameplayGesture);
    }
  };

  drawShipPreviews(root);
  makeStars();
  resetLevel();
  state.running = false;
  state.mode = "select";
  deck.hidden = true;
  draw();
}

function drawShipShape(context, shipId, scale) {
  context.scale(scale * 0.52, scale * 0.52);
  if (shipId === "falcon") {
    context.translate(-64, -64);
    drawFalconSprite(context);
    return;
  }
  context.rotate(Math.PI / 2);
  context.translate(-64, -64);
  drawXwingSprite(context);
}

function ctxMove(context, points) {
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
}

function drawFalconSprite(context) {
  svgEllipse(context, 52, 64, 35, 33, "#c9c9c9", "#565656", 2.4);
  svgEllipse(context, 53, 64, 23, 22, "#d7d7d7", "#777777", 1.4);
  svgPath(context, "M22 51 Q33 30 55 30 Q76 31 86 51 L78 58 Q67 47 53 47 Q38 47 30 58 Z", "#d6d6d6", "#565656", 1.8);
  svgPath(context, "M22 77 Q33 98 55 98 Q76 97 86 77 L78 70 Q67 81 53 81 Q38 81 30 70 Z", "#bdbdbd", "#565656", 1.8);
  svgPath(context, "M64 54 L92 54 L110 46 L116 52 L116 60 L104 63 L92 63 L64 62 Z", "#d1d1d1", "#565656", 2.2);
  svgPath(context, "M64 66 L92 66 L104 65 L116 68 L116 76 L110 82 L92 74 L64 74 Z", "#d1d1d1", "#565656", 2.2);
  svgRect(context, 68, 56.5, 18, 4.5, "#a8a8a8");
  svgRect(context, 68, 67, 18, 4.5, "#a8a8a8");
  svgRect(context, 86, 61.5, 8, 5, "#8e8e8e");
  svgPath(context, "M84 74 L102 83 L104 92 L98 98 L87 95 L80 82 Z", "#bfbfbf", "#565656", 2);
  svgEllipse(context, 103.5, 91, 8.5, 11, "#cfcfcf", "#565656", 2);
  svgPath(context, "M97 91 Q103.5 81 110 91 Q103.5 101 97 91 Z", "#4a5563", "#303947", 1.5);
  svgLine(context, 103.5, 80, 103.5, 102, "#d9ecff", 1);
  svgLine(context, 96, 91, 111, 91, "#d9ecff", 1);
  svgLine(context, 98, 85, 109, 97, "#d9ecff", 0.8);
  svgLine(context, 109, 85, 98, 97, "#d9ecff", 0.8);
  svgRect(context, 62, 34, 14, 10, "#c7c7c7", "#565656", 1.8);
  svgRect(context, 66, 37, 6, 4, "#9a9a9a");
  svgRect(context, 67, 81, 12, 7, "#c2c2c2", "#565656", 1.8);
  svgRect(context, 20, 58.5, 11, 11, "#909090", "#565656", 1.6);
  svgRect(context, 15, 59.5, 5, 9, "#79d7ff");
  [21, 24.5, 28].forEach((x) => svgRect(context, x, 60.5, 2, 7, "#d8f3ff"));
  svgPath(context, "M24 49 A33 33 0 0 0 24 79", null, "#565656", 2);
  svgPath(context, "M82 49 A33 33 0 0 1 82 79", null, "#565656", 2);
  [
    "M53 31 L53 52", "M53 76 L53 97", "M31 64 L49 64", "M57 64 L73 64",
    "M35 45 L46 54", "M35 83 L46 74", "M61 42 L57 52", "M62 86 L58 76",
    "M74 49 L63 58", "M74 79 L63 70"
  ].forEach((d) => svgPath(context, d, null, "#6f6f6f", 1.1));
  [
    "M25 53 A30 30 0 0 1 34 39", "M25 75 A30 30 0 0 0 34 89",
    "M37 35 A30 30 0 0 1 51 31", "M37 93 A30 30 0 0 0 51 97",
    "M57 31 A30 30 0 0 1 72 38", "M57 97 A30 30 0 0 0 72 90",
    "M53 52 A12 12 0 0 1 64 64", "M53 76 A12 12 0 0 0 64 64",
    "M41 64 A12 12 0 0 1 53 52", "M41 64 A12 12 0 0 0 53 76"
  ].forEach((d) => svgPath(context, d, null, "#7d7d7d", 1.1));
  svgRect(context, 26, 56, 8, 4, "#bdbdbd");
  svgCircle(context, 39, 52, 2.4, "#b0b0b0");
  svgCircle(context, 39, 76, 2.4, "#b0b0b0");
  svgRect(context, 31, 71, 9, 4, "#bdbdbd");
  svgRect(context, 45, 22, 8, 16, "#bdbdbd", "#565656", 1.4);
  [47, 50].forEach((x) => svgLine(context, x, 24, x, 36, "#6f6f6f", 0.8));
  [[43, 91, 50, 98], [47, 89, 55, 97], [51, 87, 59, 95], [56, 85, 63, 92], [46, 100, 59, 100]].forEach((line) => svgLine(context, ...line, "#6f6f6f", 1));
  svgRect(context, 76, 45, 5, 3, "#9e9e9e");
  svgRect(context, 76, 79, 5, 3, "#9e9e9e");
  svgRect(context, 64, 59, 3, 10, "#a4a4a4");
}

function drawXwingSprite(context) {
  svgRect(context, 18, 42, 2, 38, "#d7dbde");
  svgRect(context, 17, 50, 4, 2, "#748595", "#31465a", 0.8);
  svgRect(context, 17, 60, 4, 7, "#f1c40f");
  svgRect(context, 16, 80, 6, 20, "#d7dbde", "#31465a", 1);
  svgRect(context, 15, 99, 8, 3, "#7d8f9b", "#31465a", 0.8);
  svgLine(context, 16, 83, 22, 83, "#31465a", 0.7);
  svgRect(context, 108, 42, 2, 38, "#d7dbde");
  svgRect(context, 107, 50, 4, 2, "#748595", "#31465a", 0.8);
  svgRect(context, 107, 60, 4, 7, "#f1c40f");
  svgRect(context, 106, 80, 6, 20, "#d7dbde", "#31465a", 1);
  svgRect(context, 105, 99, 8, 3, "#7d8f9b", "#31465a", 0.8);
  svgLine(context, 106, 83, 112, 83, "#31465a", 0.7);
  svgPath(context, "M22 85 L53 85 L53 106 Q37 104 22 98 Z", "#d7dbde", "#31465a", 1.2);
  svgPath(context, "M106 85 L75 85 L75 106 Q91 104 106 98 Z", "#d7dbde", "#31465a", 1.2);
  svgPath(context, "M22 85 L31 85 L31 99 L22 95 Z", "#ef4b3c");
  svgPath(context, "M106 85 L97 85 L97 99 L106 95 Z", "#ef4b3c");
  svgRect(context, 27.5, 85, 1.8, 12, "#f1c40f");
  svgRect(context, 98.7, 85, 1.8, 12, "#f1c40f");
  [[36, 85, 36, 102], [40, 85, 40, 104], [88, 85, 88, 102], [84, 85, 84, 104]].forEach((line) => svgLine(context, ...line, "#31465a", 0.7));
  svgPath(context, "M33 92 L36 90 L36 98 L33 96 Z", null, "#31465a", 0.7);
  svgPath(context, "M95 92 L92 90 L92 98 L95 96 Z", null, "#31465a", 0.7);
  svgRect(context, 39, 78, 10, 18, "#cfd3d6", "#31465a", 1);
  svgRect(context, 79, 78, 10, 18, "#cfd3d6", "#31465a", 1);
  svgRect(context, 39, 78, 10, 3, "#9aa8ac");
  svgRect(context, 79, 78, 10, 3, "#9aa8ac");
  svgRect(context, 39, 79, 10, 1.5, "#ef4b3c");
  svgRect(context, 79, 79, 10, 1.5, "#ef4b3c");
  svgRect(context, 41.2, 96, 6, 18, "#d7dbde", "#31465a", 1);
  svgRect(context, 80.8, 96, 6, 18, "#d7dbde", "#31465a", 1);
  svgRect(context, 40.4, 114, 7.6, 3.5, "#7d8f9b", "#31465a", 0.8);
  svgRect(context, 80, 114, 7.6, 3.5, "#7d8f9b", "#31465a", 0.8);
  svgPath(context, "M58 10 Q59 8 64 8 Q69 8 70 10 L74 70 L74 101 Q74 111 64 111 Q54 111 54 101 L54 70 Z", "#d1d5d8", "#31465a", 1.4);
  svgPath(context, "M58 10 Q59 8 64 8 Q69 8 70 10 L69 23 L59 23 Z", "#97a6aa", "#31465a", 1.2);
  svgPath(context, "M59 23 L61 23 L57 67 L54.5 68.5 Z", "#ef4b3c");
  svgPath(context, "M69 23 L67 23 L71 67 L73.5 68.5 Z", "#ef4b3c");
  svgPath(context, "M61 41 Q61 37 64 37 Q67 37 67 41 L69 60 L66.5 64 L61.5 64 L59 60 Z", "#3f566f", "#31465a", 1);
  svgRect(context, 61, 33, 6, 2.2, "#f1c40f");
  svgRect(context, 59.5, 76, 9, 28, "#93a2a3");
  svgCircle(context, 64, 82, 4.3, "#d7dbde", "#31465a", 1);
  svgCircle(context, 64, 82, 1.8, "#ef4b3c");
  svgCircle(context, 64, 90.5, 2.4, "#d7dbde", "#31465a", 0.8);
  svgCircle(context, 64, 96, 2.4, "#d7dbde", "#31465a", 0.8);
  svgRect(context, 61.8, 100, 4.4, 4.2, "#d7dbde", "#31465a", 0.8);
  svgLine(context, 54, 85, 22, 85, "#31465a", 0.7);
  svgLine(context, 74, 85, 106, 85, "#31465a", 0.7);
  svgRect(context, 27.5, 89, 3.5, 6, null, "#31465a", 0.7);
  svgRect(context, 97, 89, 3.5, 6, null, "#31465a", 0.7);
}

function drawDroidBossSprite(context) {
  svgPolygon(context, [[61, 38], [82, 38], [98, 31], [105, 36], [100, 43], [85, 45], [73, 45], [63, 41]], "#8a9096", "#39424a", 1.3);
  svgPolygon(context, [[61, 90], [82, 90], [98, 97], [105, 92], [100, 85], [85, 83], [73, 83], [63, 87]], "#8a9096", "#39424a", 1.3);
  svgPath(context, "M23 54 L76 54 L87 46 L98 46 L110 58 L110 70 L98 82 L87 82 L76 74 L23 74 L17 68 L17 60 Z", "#70767d", "#39424a", 2.2);
  svgPath(context, "M28 58 L74 58 L84 52 L95 52 L103 59 L103 69 L95 76 L84 76 L74 70 L28 70 L24 66 L24 62 Z", "#8a9096", "#39424a", 1.5);
  svgPolygon(context, [[45, 46], [58, 46], [67, 54], [67, 61], [56, 64], [45, 60]], "#6a7077", "#39424a", 1.6);
  svgPolygon(context, [[45, 82], [58, 82], [67, 74], [67, 67], [56, 64], [45, 68]], "#6a7077", "#39424a", 1.6);
  svgPolygon(context, [[34, 44], [45, 44], [49, 52], [49, 60], [39, 62], [34, 57]], "#6f757c", "#39424a", 1.6);
  svgPolygon(context, [[34, 84], [45, 84], [49, 76], [49, 68], [39, 66], [34, 71]], "#6f757c", "#39424a", 1.6);
  svgPath(context, "M14 52 L28 48 L39 48 L44 56 L44 72 L39 80 L28 80 L14 76 Z", "#666c73", "#39424a", 2);
  [[14, 64, 5.8, 1.8], [18, 56, 3.8, 1.5], [18, 72, 3.8, 1.5], [25, 59, 3.4, 1.4], [25, 69, 3.4, 1.4]].forEach(([x, y, r, stroke]) => svgCircle(context, x, y, r, "#55b9ff", "#39424a", stroke));
  svgPolygon(context, [[90, 50], [101, 50], [111, 59], [115, 64], [111, 69], [101, 78], [90, 78], [84, 64]], "#5f656c", "#39424a", 2);
  svgPolygon(context, [[96, 46], [102, 46], [106, 56], [106, 72], [102, 82], [96, 82], [99, 64]], "#4f555c", "#39424a", 1.6);
  svgLine(context, 108, 58, 117, 56, "#39424a", 2);
  svgLine(context, 108, 70, 117, 72, "#39424a", 2);
  svgCircle(context, 100, 58, 3.2, "#f04e4e", "#39424a", 1.2);
  svgCircle(context, 100, 70, 3.2, "#f04e4e", "#39424a", 1.2);
  svgPolygon(context, [[88, 46], [96, 36], [100, 36], [98, 46]], "#626870", "#39424a", 1.4);
  svgPolygon(context, [[88, 82], [96, 92], [100, 92], [98, 82]], "#626870", "#39424a", 1.4);
  [[30, 64, 94, 64, 1.1], [40, 54, 40, 74, 1], [53, 54, 53, 74, 1], [66, 54, 66, 74, 1], [79, 53, 79, 75, 1], [68, 38, 92, 31, 1], [68, 90, 92, 97, 1], [76, 47, 76, 34, 1], [76, 81, 76, 94, 1]].forEach(([x1, y1, x2, y2, width]) => svgLine(context, x1, y1, x2, y2, "#596169", width));
  svgRect(context, 58, 59, 2, 6, "#55b9ff");
  svgRect(context, 58, 63, 2, 6, "#55b9ff");
  svgRect(context, 71, 44, 2, 5, "#55b9ff");
  svgRect(context, 71, 79, 2, 5, "#55b9ff");
  svgRect(context, 105, 36, 2, 4, "#55b9ff");
  svgRect(context, 105, 88, 2, 4, "#55b9ff");
  svgLine(context, 29, 59, 73, 59, "#a6adb2", 0.9);
  svgLine(context, 29, 69, 73, 69, "#5b6168", 0.9);
  svgLine(context, 64, 40, 97, 31, "#a6adb2", 0.9);
  svgLine(context, 64, 88, 97, 97, "#a6adb2", 0.9);
}

function svgPath(context, d, fill, stroke, strokeWidth = 1) {
  const path = new Path2D(d);
  if (fill) {
    context.fillStyle = fill;
    context.fill(path);
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.stroke(path);
  }
}

function svgPolygon(context, points, fill, stroke, strokeWidth = 1) {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}

function svgRect(context, x, y, width, height, fill, stroke, strokeWidth = 1) {
  if (fill) {
    context.fillStyle = fill;
    context.fillRect(x, y, width, height);
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.strokeRect(x, y, width, height);
  }
}

function svgLine(context, x1, y1, x2, y2, stroke, strokeWidth = 1) {
  context.strokeStyle = stroke;
  context.lineWidth = strokeWidth;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function svgCircle(context, x, y, radius, fill, stroke, strokeWidth = 1) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}

function svgEllipse(context, x, y, rx, ry, fill, stroke, strokeWidth = 1) {
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}

function drawShipPreviews(root) {
  root.querySelectorAll("[data-starship-preview]").forEach((preview) => {
    const context = preview.getContext("2d");
    context.clearRect(0, 0, preview.width, preview.height);
    context.fillStyle = "#08101e";
    context.fillRect(0, 0, preview.width, preview.height);
    context.save();
    context.translate(preview.width / 2, preview.height / 2);
    context.rotate(-Math.PI / 9);
    drawShipShape(context, preview.dataset.starshipPreview, 1.35);
    context.restore();
  });
}

function randomEdgePoint() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: rand(-40, WORLD.width + 40), y: -35 };
  if (side === 1) return { x: WORLD.width + 35, y: rand(-40, WORLD.height + 40) };
  if (side === 2) return { x: rand(-40, WORLD.width + 40), y: WORLD.height + 35 };
  return { x: -35, y: rand(-40, WORLD.height + 40) };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrap(value, min, max) {
  const range = max - min;
  while (value < min) value += range;
  while (value > max) value -= range;
  return value;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function perpendicular(angle) {
  return { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };
}

function shortAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function inBounds(item, margin) {
  return item.x > -margin && item.x < WORLD.width + margin && item.y > -margin && item.y < WORLD.height + margin;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
