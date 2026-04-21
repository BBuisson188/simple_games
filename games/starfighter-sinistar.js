const ships = {
  falcon: { name: "Millennium Falcon", note: "Heavy freighter, double lasers, tougher handling.", radius: 18, acceleration: 410, drag: 0.985, maxSpeed: 245, laserCount: 2, laserSpread: 9 },
  xwing: { name: "X-wing Fighter", note: "Quick starfighter, narrow profile, sharp control.", radius: 14, acceleration: 500, drag: 0.982, maxSpeed: 290, laserCount: 1, laserSpread: 0 }
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
const MAX_ALLOWED_HITS = 3;
const STARTING_ENEMY_LIMIT = 3;
const NO_KILL_REINFORCEMENT_TIME = 3;
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
      <div class="toolbar"><button class="secondary-button" type="button" data-menu>Back to Menu</button></div>
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
              <span>Hits <strong data-star-hits>0/3</strong></span>
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
  const input = { x: 0, y: -1, active: false, fire: false, keys: new Set() };
  const state = {
    running: false, mode: "select", selectedShip: "xwing", level: 0, score: 0, hits: 0, kills: 0,
    player: null, enemies: [], asteroids: [], playerLasers: [], enemyLasers: [], torpedo: null,
    bursts: [], stars: [], boss: null, torpedoAvailable: false, torpedoFired: false,
    spawnTimer: 0, enemyLimit: STARTING_ENEMY_LIMIT, noKillTimer: 0, laserCooldown: 0,
    bossLaserTimer: 0, lastTime: 0, messageTimer: 0, deathCharge: 0
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
    state.mode = "battle";
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
    input.x = 0;
    input.y = -1;
    knob.style.transform = "translate(-50%, -86%)";
    for (let i = 0; i < stage().asteroidCount; i += 1) spawnAsteroid(true);
    setMessage(`Level ${state.level + 1}: ${stage().name}`, `${ship().name} ready. Destroy ${stage().killsNeeded} TIE fighters to draw out the boss.`, 3);
    updateHud();
  }

  function startGame() {
    state.running = true;
    state.level = 0;
    state.score = 0;
    selectScreen.hidden = true;
    deck.hidden = false;
    hideOverlay();
    makeStars();
    resetLevel();
    requestAnimationFrame(loop);
  }

  function nextLevel() {
    state.level += 1;
    hideOverlay();
    resetLevel();
    requestAnimationFrame(loop);
  }

  function restartToSelect() {
    state.mode = "select";
    state.running = false;
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
    addBurst(state.boss.x, state.boss.y, "#ffef8a", 44);
    state.boss = null;
    state.torpedo = null;
    state.mode = "levelComplete";
    updateHud();
    if (state.level >= stages.length - 1) {
      setOverlay("Death Star Destroyed", `<p>Final score: <strong>${state.score}</strong></p><p>The galaxy gets another sunrise.</p>`, `<button class="primary-button" type="button" data-star-restart>Play Again</button>`);
    } else {
      setOverlay("Level Complete", `<p>${stage().bossName} destroyed.</p><p>Score: <strong>${state.score}</strong></p>`, `<button class="primary-button" type="button" data-star-next>Next Level</button>`);
    }
  }

  function gameOver(title = "Ship Destroyed", detail = "Your fighter was lost.") {
    state.mode = "gameOver";
    state.running = false;
    updateHud();
    setOverlay(title, `<p>${detail}</p><p>Final score: <strong>${state.score}</strong></p>`, `<button class="primary-button" type="button" data-star-restart>Play Again</button><button class="secondary-button" type="button" data-star-select-again>Choose Ship</button>`);
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
    if (!["battle", "boss", "bossCharge"].includes(state.mode)) return;
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) messageEl.classList.remove("is-visible");
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
    state.player.vx *= ship().drag;
    state.player.vy *= ship().drag;
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
          state.spawnTimer = 0;
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

  function addBurst(x, y, color, count) {
    state.bursts.push({
      color,
      life: 0.55,
      parts: Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = rand(40, 190);
        return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
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
    if (state.player) drawPlayerShip();
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
    ctx.fillStyle = "#b8a47d";
    ctx.strokeStyle = "#4f493d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0.18 * Math.PI, 1.82 * Math.PI);
    ctx.lineTo(24, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#233542";
    ctx.beginPath();
    ctx.arc(-10, 0, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8ee7ff";
    ctx.fillRect(26, -5, 28, 10);
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
    ctx.globalAlpha = Math.max(0, burst.life / 0.55);
    ctx.fillStyle = burst.color;
    burst.parts.forEach((part) => {
      ctx.beginPath();
      ctx.arc(part.x, part.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
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
    if (["battle", "boss", "bossCharge"].includes(state.mode)) requestAnimationFrame(loop);
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
    if (target.closest("[data-star-next]")) {
      nextLevel();
      return true;
    }
    if (target.closest("[data-star-restart]")) {
      startGame();
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
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
    }
  });
  panel.addEventListener("pointermove", (event) => {
    if (input.active) updateJoystick(event);
  });
  panel.addEventListener("pointerup", (event) => {
    if (event.target.closest("[data-star-fire]")) input.fire = false;
    if (input.active) resetJoystick();
  });
  panel.addEventListener("pointercancel", () => {
    input.fire = false;
    resetJoystick();
  });

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
    const max = rect.width * 0.34;
    const stickDistance = Math.min(max, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * stickDistance;
    const y = Math.sin(angle) * stickDistance;
    input.x = x / max;
    input.y = y / max;
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function resetJoystick() {
    input.active = false;
    input.x = 0;
    input.y = 0;
    knob.style.transform = "translate(-50%, -50%)";
  }

  currentStarfighterGame = {
    stop() {
      state.running = false;
      input.fire = false;
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
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
  context.scale(scale, scale);
  if (shipId === "falcon") {
    context.fillStyle = "#d8d2bd";
    context.strokeStyle = "#6d7069";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, 21, 16, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#b8b39f";
    context.fillRect(1, -5, 25, 10);
    context.fillStyle = "#8fb9c9";
    context.beginPath();
    context.arc(7, 0, 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#343a3d";
    context.beginPath();
    ctxMove(context, [[16, -8], [31, -17], [34, -10], [23, -4]]);
    ctxMove(context, [[16, 8], [31, 17], [34, 10], [23, 4]]);
    context.stroke();
    context.fillStyle = "#f05d44";
    context.fillRect(-22, -8, 5, 16);
    return;
  }
  context.fillStyle = "#eceff1";
  context.strokeStyle = "#56616b";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(28, 0);
  context.lineTo(-16, -7);
  context.lineTo(-21, 0);
  context.lineTo(-16, 7);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = "#d04735";
  context.lineWidth = 4;
  context.beginPath();
  ctxMove(context, [[-2, -8], [-25, -24]]);
  ctxMove(context, [[-2, 8], [-25, 24]]);
  ctxMove(context, [[5, -7], [25, -17]]);
  ctxMove(context, [[5, 7], [25, 17]]);
  context.stroke();
  context.fillStyle = "#8bd9ff";
  context.beginPath();
  context.ellipse(6, 0, 8, 4, 0, 0, Math.PI * 2);
  context.fill();
}

function ctxMove(context, points) {
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
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
