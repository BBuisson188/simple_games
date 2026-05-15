import { createGlobalLeaderboard } from "./global-leaderboard.js";

/*
  Chomp Chase Arcade - app module.

  Public entry point: renderChompChase()
*/

  const COLS = 21;
  const ROWS = 23;
  const STORAGE_KEY = "chomp-chase-high-score";
  const LEADERBOARD_KEY = "chomp-chase-leaderboard";
  const LAST_PLAYER_NAME_KEY = "chomp-chase-player-name";
  const PENDING_GLOBAL_SCORES_KEY = "chomp-chase-pending-global-scores";
  const GAME_ID = "chomp-chase";
  const globalLeaderboard = createGlobalLeaderboard({ gameId: GAME_ID, pendingKey: PENDING_GLOBAL_SCORES_KEY });

  const MAZE_LAYOUT = [
    "#####################",
    "#o........#........o#",
    "#.###.###.#.###.###.#",
    "#...................#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "#####.#.......#.#####",
    "#####.#.## ##.#.#####",
    ".........   .........",
    "#####.#.## ##.#.#####",
    "#####.#.......#.#####",
    "#####.#.#####.#.#####",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#o..#...........#..o#",
    "###.#.#.#####.#.#.###",
    "#.....#...#...#.....#",
    "#.#######.#.#######.#",
    "#...................#",
    "#.###.###.#.###.###.#",
    "#o..#...........#..o#",
    "#####################"
  ];

  const MAZE = MAZE_LAYOUT.map((row) => row.padEnd(COLS, "#").slice(0, COLS));

  const DIRS = {
    left: { x: -1, y: 0, angle: Math.PI, key: "left" },
    right: { x: 1, y: 0, angle: 0, key: "right" },
    up: { x: 0, y: -1, angle: -Math.PI / 2, key: "up" },
    down: { x: 0, y: 1, angle: Math.PI / 2, key: "down" }
  };
  const DIR_LIST = [DIRS.left, DIRS.right, DIRS.up, DIRS.down];

  const LEVELS = [
    { name: "Level 1", subtitle: "Classic Warm-Up", enemies: 4, playerSpeed: 5.0, enemySpeed: 3.45, powerTime: 7.5, aggression: 0.15 },
    { name: "Level 2", subtitle: "Faster Feet", enemies: 4, playerSpeed: 5.05, enemySpeed: 3.78, powerTime: 7.0, aggression: 0.24 },
    { name: "Level 3", subtitle: "Extra Trouble", enemies: 5, playerSpeed: 5.1, enemySpeed: 4.02, powerTime: 6.35, aggression: 0.34 },
    { name: "Level 4", subtitle: "Tight Turns", enemies: 5, playerSpeed: 5.15, enemySpeed: 4.32, powerTime: 5.85, aggression: 0.45 },
    { name: "Level 5", subtitle: "Arcade Master", enemies: 6, playerSpeed: 5.2, enemySpeed: 4.62, powerTime: 5.25, aggression: 0.58 }
  ];

  const ENEMY_PRESETS = [
    { name: "Blazer", color: "#ff3d5a", accent: "#ff9cac", start: { x: 10, y: 9 }, dir: "left", type: "hunter" },
    { name: "Pinky", color: "#ff8cdf", accent: "#ffd1f3", start: { x: 9, y: 9 }, dir: "right", type: "ambush" },
    { name: "Cyan", color: "#39d7ff", accent: "#c8f5ff", start: { x: 11, y: 9 }, dir: "left", type: "flanker" },
    { name: "Amber", color: "#ffad33", accent: "#ffe1ad", start: { x: 10, y: 8 }, dir: "down", type: "wanderer" },
    { name: "Violet", color: "#9b6cff", accent: "#d8c8ff", start: { x: 8, y: 9 }, dir: "right", type: "shadow" },
    { name: "Lime", color: "#7bf36b", accent: "#c8ffc1", start: { x: 12, y: 9 }, dir: "left", type: "charger" }
  ];

  const PLAYER_START = { x: 10, y: 15 };
  const BONUS_TILE = { x: 10, y: 13 };
  const STARTING_LIVES = 3;

  let styleInjected = false;
  let activeChompChase = null;
  let activeMenuCleanup = null;
  let initTimer = 0;

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement("style");
    style.id = "chomp-chase-styles";
    style.textContent = `
      .cc-game, .cc-game * { box-sizing: border-box; }
      .cc-game {
        --cc-bg: #03040c;
        --cc-panel: rgba(2, 6, 23, 0.86);
        --cc-border: rgba(125, 211, 252, 0.18);
        --cc-text: #ffffff;
        --cc-muted: #94a3b8;
        width: 100%;
        min-height: 100%;
        color: var(--cc-text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% 0%, rgba(8, 145, 178, 0.18), transparent 34%), radial-gradient(circle at 100% 100%, rgba(250, 204, 21, 0.12), transparent 35%), var(--cc-bg);
        padding: 14px;
        overflow: hidden;
      }
      .cc-shell { width: min(1180px, 100%); margin: 0 auto; display: grid; gap: 14px; }
      .cc-top {
        border: 1px solid var(--cc-border);
        background: var(--cc-panel);
        border-radius: 28px;
        padding: 16px;
        box-shadow: 0 24px 80px rgba(8, 47, 73, 0.35);
        backdrop-filter: blur(12px);
      }
      .cc-top-row { display: flex; gap: 16px; justify-content: space-between; align-items: center; flex-wrap: wrap; }
      .cc-eyebrow { color: rgba(165, 243, 252, 0.72); font-size: 11px; font-weight: 900; letter-spacing: .28em; text-transform: uppercase; }
      .cc-title { margin: 2px 0 2px; line-height: 1; font-size: clamp(34px, 6vw, 54px); font-weight: 950; letter-spacing: -0.055em; color: #fde047; text-shadow: 0 0 26px rgba(250, 204, 21, 0.22); }
      .cc-subtitle { margin: 0; max-width: 690px; color: #cbd5e1; font-size: 14px; line-height: 1.45; font-weight: 600; }
      .cc-stats { display: grid; grid-template-columns: repeat(5, minmax(74px, 1fr)); gap: 8px; min-width: min(540px, 100%); }
      .cc-pill { border: 1px solid rgba(125, 211, 252, 0.18); background: rgba(2, 6, 23, .72); border-radius: 18px; padding: 10px 12px; box-shadow: inset 0 1px 14px rgba(8, 145, 178, .12); }
      .cc-pill-label { color: rgba(165, 243, 252, .65); font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
      .cc-pill-value { margin-top: 3px; color: #fff; font-size: 19px; line-height: 1; font-weight: 950; white-space: nowrap; }
      .cc-toolbar { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; border: 1px solid rgba(255,255,255,.1); background: rgba(0,0,0,.28); border-radius: 20px; padding: 12px; }
      .cc-level-title { font-size: 14px; font-weight: 950; }
      .cc-level-detail { margin-top: 3px; color: var(--cc-muted); font-size: 12px; }
      .cc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .cc-button {
        border: 1px solid rgba(125, 211, 252, .25);
        background: rgba(34, 211, 238, .12);
        color: #cffafe;
        border-radius: 16px;
        padding: 10px 14px;
        font: inherit;
        font-size: 13px;
        font-weight: 950;
        cursor: pointer;
        transition: transform .08s ease, background .16s ease;
        touch-action: manipulation;
      }
      .cc-button:hover { background: rgba(34, 211, 238, .22); }
      .cc-button:active { transform: scale(.97); }
      .cc-button-primary { background: #fde047; border-color: #fde047; color: #020617; box-shadow: 0 10px 30px rgba(250, 204, 21, .18); }
      .cc-button-primary:hover { background: #fef08a; }
      .cc-layout { display: grid; grid-template-columns: minmax(0, 1fr) 288px; gap: 14px; align-items: start; }
      .cc-board-wrap { position: relative; border: 1px solid var(--cc-border); border-radius: 28px; background: rgba(0,0,0,.72); padding: 12px; box-shadow: 0 24px 80px rgba(8, 47, 73, .35); }
      .cc-canvas-holder { width: 100%; display: flex; justify-content: center; }
      .cc-canvas { max-width: 100%; border-radius: 22px; border: 1px solid rgba(255,255,255,.1); background: #000; box-shadow: inset 0 0 50px rgba(8, 47, 73, .55); touch-action: none; outline: none; }
      .cc-overlay { position: absolute; inset: 12px; display: none; place-items: center; padding: 16px; border-radius: 22px; background: rgba(2, 6, 23, .74); backdrop-filter: blur(8px); text-align: center; }
      .cc-overlay.cc-show { display: grid; }
      .cc-card { max-width: 440px; border: 1px solid rgba(125, 211, 252, .2); border-radius: 28px; background: rgba(2, 6, 23, .94); padding: 24px; box-shadow: 0 24px 80px rgba(8, 47, 73, .45); }
      .cc-chomp-icon { margin: 0 auto 14px; width: 64px; height: 64px; display: grid; place-items: center; border-radius: 999px; background: #fde047; color: #020617; font-size: 42px; box-shadow: 0 12px 34px rgba(250, 204, 21, .28); }
      .cc-overlay-title { margin: 0; color: #fff; font-size: 32px; font-weight: 950; letter-spacing: -0.04em; }
      .cc-overlay-copy { margin: 10px 0 0; color: #cbd5e1; font-size: 14px; line-height: 1.55; }
      .cc-overlay-actions { margin-top: 18px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
      .cc-help { margin-top: 14px; color: #94a3b8; font-size: 12px; font-weight: 650; }
      .cc-score-form { margin-top: 16px; display: grid; gap: 10px; }
      .cc-score-form label { color: rgba(165, 243, 252, .72); font-size: 11px; font-weight: 950; letter-spacing: .16em; text-transform: uppercase; text-align: left; }
      .cc-score-form input { width: 100%; border: 1px solid rgba(125, 211, 252, .22); border-radius: 16px; background: rgba(15, 23, 42, .92); color: #fff; padding: 11px 12px; font: inherit; font-weight: 800; }
      .cc-leaderboard { width: 100%; margin-top: 14px; border-collapse: collapse; font-size: 13px; text-align: left; }
      .cc-leaderboard th, .cc-leaderboard td { padding: 8px 6px; border-bottom: 1px solid rgba(125, 211, 252, .14); }
      .cc-leaderboard th { color: rgba(165, 243, 252, .72); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
      .cc-leaderboard .cc-highlight td { color: #fde047; font-weight: 950; }
      .cc-side { border: 1px solid var(--cc-border); border-radius: 28px; background: var(--cc-panel); padding: 14px; box-shadow: 0 24px 80px rgba(8, 47, 73, .28); }
      .cc-side-section { border: 1px solid rgba(255,255,255,.1); background: rgba(0,0,0,.28); border-radius: 22px; padding: 14px; }
      .cc-side-section + .cc-side-section { margin-top: 14px; }
      .cc-section-label { color: rgba(165, 243, 252, .72); font-size: 11px; font-weight: 950; letter-spacing: .2em; text-transform: uppercase; }
      .cc-dpad { margin: 14px auto 0; width: 192px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .cc-dpad-spacer { min-height: 54px; }
      .cc-dpad-button {
        border: 1px solid rgba(125, 211, 252, .22);
        background: rgba(15, 23, 42, .92);
        color: #cffafe;
        min-height: 54px;
        border-radius: 18px;
        font: inherit;
        font-size: 21px;
        font-weight: 950;
        cursor: pointer;
        box-shadow: 0 12px 28px rgba(8, 47, 73, .28);
        transition: transform .08s ease, background .16s ease;
        touch-action: manipulation;
        user-select: none;
      }
      .cc-dpad-button:active { transform: scale(.95); background: rgba(34, 211, 238, .22); }
      .cc-side-copy, .cc-rules { color: #cbd5e1; font-size: 13px; line-height: 1.5; }
      .cc-rules { margin: 12px 0 0; padding-left: 0; list-style: none; }
      .cc-rules li + li { margin-top: 7px; }
      .cc-power-bar { margin-top: 12px; height: 12px; overflow: hidden; border-radius: 999px; background: #1e293b; }
      .cc-power-fill { height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, #67e8f9, #2563eb); transition: width .1s linear; }
      @media (max-width: 900px) {
        .cc-layout { grid-template-columns: 1fr; }
        .cc-side { order: 2; }
      }
      @media (max-width: 640px) {
        .cc-game { padding: 10px; }
        .cc-top, .cc-board-wrap, .cc-side { border-radius: 22px; }
        .cc-stats { grid-template-columns: repeat(3, 1fr); }
        .cc-pill { padding: 8px 10px; }
        .cc-pill-value { font-size: 16px; }
        .cc-title { font-size: 36px; }
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function keyFor(x, y) {
    return `${x},${y}`;
  }

  function distSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function opposite(dir) {
    if (!dir) return null;
    if (dir.key === "left") return DIRS.right;
    if (dir.key === "right") return DIRS.left;
    if (dir.key === "up") return DIRS.down;
    return DIRS.up;
  }

  function isWall(x, y) {
    if (y < 0 || y >= ROWS) return true;
    let wrappedX = x;
    if (wrappedX < 0) wrappedX = COLS - 1;
    if (wrappedX >= COLS) wrappedX = 0;
    return MAZE[y][wrappedX] === "#";
  }

  function canMoveFrom(tileX, tileY, dir) {
    if (!dir) return false;
    return !isWall(tileX + dir.x, tileY + dir.y);
  }

  function centered(entity, threshold = 0.035) {
    return Math.abs(entity.x - Math.round(entity.x)) < threshold && Math.abs(entity.y - Math.round(entity.y)) < threshold;
  }

  function snapToTile(entity) {
    entity.x = Math.round(entity.x);
    entity.y = Math.round(entity.y);
  }

  function nextCenterOnAxis(value, directionSign) {
    return directionSign > 0 ? Math.floor(value + 1) : Math.ceil(value - 1);
  }

  function crossedCenter(before, after, directionSign, center) {
    return directionSign > 0 ? before < center && after >= center : before > center && after <= center;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function createAudio() {
    let ctx = null;
    const ensure = () => {
      if (!ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) ctx = new AudioContext();
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    };
    const beep = (freq = 440, duration = 0.035, type = "square", gain = 0.025) => {
      const audio = ensure();
      if (!audio) return;
      const osc = audio.createOscillator();
      const vol = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audio.currentTime);
      vol.gain.setValueAtTime(0.0001, audio.currentTime);
      vol.gain.exponentialRampToValueAtTime(gain, audio.currentTime + 0.008);
      vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
      osc.connect(vol);
      vol.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration + 0.01);
    };
    return {
      prime: ensure,
      dot: () => beep(760 + Math.random() * 80, 0.025, "square", 0.018),
      power: () => {
        beep(220, 0.08, "sawtooth", 0.035);
        window.setTimeout(() => beep(330, 0.08, "sawtooth", 0.028), 70);
        window.setTimeout(() => beep(440, 0.08, "sawtooth", 0.02), 140);
      },
      eatEnemy: () => {
        beep(660, 0.05, "triangle", 0.035);
        window.setTimeout(() => beep(990, 0.07, "triangle", 0.025), 55);
      },
      death: () => {
        beep(420, 0.09, "sawtooth", 0.035);
        window.setTimeout(() => beep(260, 0.11, "sawtooth", 0.03), 110);
        window.setTimeout(() => beep(150, 0.18, "sawtooth", 0.022), 240);
      },
      level: () => {
        beep(520, 0.08, "triangle", 0.03);
        window.setTimeout(() => beep(660, 0.08, "triangle", 0.03), 90);
        window.setTimeout(() => beep(880, 0.12, "triangle", 0.028), 180);
      }
    };
  }

  class ChompChaseInstance {
    constructor(container, options = {}) {
      if (!container) throw new Error("ChompChaseGame.init requires a container element.");
      injectStyles();
      this.container = container;
      this.options = Object.assign({
        showExitButton: false,
        autoFocus: true,
        title: "Chomp Chase",
        onExit: null,
        onScoreChange: null,
        onGameOver: null,
        onVictory: null
      }, options);
      this.audio = createAudio();
      this.game = this.makeFreshGame(this.loadHighScore());
      this.lastTime = 0;
      this.frameId = 0;
      this.lastUiTime = 0;
      this.touchStart = null;
      this.overlayMode = null;
      this.lastScoreOverlayKey = "";
      this.destroyed = false;
      this.resizeObserver = null;
      this.boundKeyDown = this.handleKeyDown.bind(this);
      this.boundResize = this.resize.bind(this);
      this.renderShell();
      this.attachEvents();
      this.resize();
      this.syncUi(true);
      this.frameId = window.requestAnimationFrame(this.loop.bind(this));
    }

    renderShell() {
      this.container.innerHTML = `
        <div class="cc-game" data-chomp-chase>
          <div class="cc-shell">
            <section class="cc-top">
              <div class="cc-top-row">
                <div>
                  <div class="cc-eyebrow">Arcade Game</div>
                  <h1 class="cc-title"></h1>
                  <p class="cc-subtitle">Clear the maze, grab power pellets, dodge the ghost crew, and survive five increasingly difficult levels.</p>
                </div>
                <div class="cc-stats" aria-live="polite">
                  <div class="cc-pill"><div class="cc-pill-label">Score</div><div class="cc-pill-value" data-cc-score>0</div></div>
                  <div class="cc-pill"><div class="cc-pill-label">High</div><div class="cc-pill-value" data-cc-high>0</div></div>
                  <div class="cc-pill"><div class="cc-pill-label">Level</div><div class="cc-pill-value" data-cc-level>1/5</div></div>
                  <div class="cc-pill"><div class="cc-pill-label">Lives</div><div class="cc-pill-value" data-cc-lives>OOO</div></div>
                  <div class="cc-pill"><div class="cc-pill-label">Dots</div><div class="cc-pill-value" data-cc-dots>0</div></div>
                </div>
              </div>
              <div class="cc-toolbar">
                <div>
                  <div class="cc-level-title" data-cc-level-title></div>
                  <div class="cc-level-detail" data-cc-level-detail></div>
                </div>
                <div class="cc-actions">
                  <button type="button" class="cc-button cc-button-primary" data-cc-start>New Game</button>
                  <button type="button" class="cc-button" data-cc-pause>Pause</button>
                  <button type="button" class="cc-button" data-cc-leaderboard>Leaderboard</button>
                  <button type="button" class="cc-button" data-cc-exit style="display:none">Back to Games</button>
                </div>
              </div>
            </section>

            <section class="cc-layout">
              <div class="cc-board-wrap">
                <div class="cc-canvas-holder">
                  <canvas class="cc-canvas" tabindex="0" data-cc-canvas></canvas>
                </div>
                <div class="cc-overlay" data-cc-overlay>
                  <div class="cc-card">
                    <div class="cc-chomp-icon">C</div>
                    <h2 class="cc-overlay-title" data-cc-overlay-title>Chomp Chase</h2>
                    <div class="cc-overlay-copy" data-cc-overlay-copy></div>
                    <div class="cc-overlay-actions" data-cc-overlay-actions>
                      <button type="button" class="cc-button cc-button-primary" data-cc-overlay-start>Start Game</button>
                      <button type="button" class="cc-button" data-cc-overlay-resume style="display:none">Resume</button>
                    </div>
                    <div class="cc-help">Keyboard: Arrow keys or WASD - Space pauses - iPad: swipe or D-pad</div>
                  </div>
                </div>
              </div>

              <aside class="cc-side">
                <div class="cc-side-section">
                  <div class="cc-section-label">Touch Controls</div>
                  <div class="cc-dpad">
                    <div class="cc-dpad-spacer"></div>
                    <button type="button" class="cc-dpad-button" aria-label="Move up" data-cc-dir="up">Up</button>
                    <div class="cc-dpad-spacer"></div>
                    <button type="button" class="cc-dpad-button" aria-label="Move left" data-cc-dir="left">Left</button>
                    <button type="button" class="cc-dpad-button" aria-label="Pause" data-cc-dpad-pause>Pause</button>
                    <button type="button" class="cc-dpad-button" aria-label="Move right" data-cc-dir="right">Right</button>
                    <div class="cc-dpad-spacer"></div>
                    <button type="button" class="cc-dpad-button" aria-label="Move down" data-cc-dir="down">Down</button>
                    <div class="cc-dpad-spacer"></div>
                  </div>
                  <p class="cc-side-copy">The full canvas also supports swipe gestures, so this plays cleanly on iPad without a keyboard.</p>
                </div>
                <div class="cc-side-section">
                  <div class="cc-section-label">Rules</div>
                  <ul class="cc-rules">
                    <li>- Dots are worth 10 points.</li>
                    <li>- Large power pellets turn enemies vulnerable.</li>
                    <li>- Bonus fruit appears once per level.</li>
                    <li>- Each level adds speed, pressure, or another enemy.</li>
                  </ul>
                </div>
                <div class="cc-side-section">
                  <div class="cc-section-label">Power Mode</div>
                  <div class="cc-power-bar"><div class="cc-power-fill" data-cc-power-fill></div></div>
                  <p class="cc-side-copy">Chain enemy captures during power mode for bigger points.</p>
                </div>
              </aside>
            </section>
          </div>
        </div>
      `;

      this.root = this.container.querySelector("[data-chomp-chase]");
      this.canvas = this.container.querySelector("[data-cc-canvas]");
      this.ctx = this.canvas.getContext("2d");
      this.titleEl = this.container.querySelector(".cc-title");
      this.scoreEl = this.container.querySelector("[data-cc-score]");
      this.highEl = this.container.querySelector("[data-cc-high]");
      this.levelEl = this.container.querySelector("[data-cc-level]");
      this.livesEl = this.container.querySelector("[data-cc-lives]");
      this.dotsEl = this.container.querySelector("[data-cc-dots]");
      this.levelTitleEl = this.container.querySelector("[data-cc-level-title]");
      this.levelDetailEl = this.container.querySelector("[data-cc-level-detail]");
      this.overlayEl = this.container.querySelector("[data-cc-overlay]");
      this.overlayTitleEl = this.container.querySelector("[data-cc-overlay-title]");
      this.overlayCopyEl = this.container.querySelector("[data-cc-overlay-copy]");
      this.overlayActionsEl = this.container.querySelector("[data-cc-overlay-actions]");
      this.overlayResumeBtn = this.container.querySelector("[data-cc-overlay-resume]");
      this.powerFillEl = this.container.querySelector("[data-cc-power-fill]");
      this.exitBtn = this.container.querySelector("[data-cc-exit]");
      this.titleEl.textContent = this.options.title;
      if (this.options.showExitButton) this.exitBtn.style.display = "inline-block";
    }

    attachEvents() {
      this.startBtn = this.container.querySelector("[data-cc-start]");
      this.pauseBtn = this.container.querySelector("[data-cc-pause]");
      this.leaderboardBtn = this.container.querySelector("[data-cc-leaderboard]");
      this.overlayStartBtn = this.container.querySelector("[data-cc-overlay-start]");
      this.dpadPauseBtn = this.container.querySelector("[data-cc-dpad-pause]");

      this.startBtn.addEventListener("click", () => this.start());
      this.pauseBtn.addEventListener("click", () => this.togglePause());
      this.leaderboardBtn.addEventListener("click", () => this.showLeaderboard());
      this.overlayEl.addEventListener("click", (event) => {
        const target = event.target;
        if (target.closest("[data-cc-overlay-start]")) this.start();
        if (target.closest("[data-cc-overlay-resume]")) this.resume();
        if (target.closest("[data-cc-save-score]")) this.saveScoreFromOverlay();
        if (target.closest("[data-cc-show-leaderboard]")) this.showLeaderboard("Leaderboard", { recentScore: this.game.score });
      });
      this.overlayEl.addEventListener("submit", (event) => {
        if (!event.target.closest("[data-cc-score-form]")) return;
        event.preventDefault();
        this.saveScoreFromOverlay();
      });
      this.dpadPauseBtn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.togglePause();
      });
      this.exitBtn.addEventListener("click", () => {
        if (typeof this.options.onExit === "function") this.options.onExit(this);
      });

      this.container.querySelectorAll("[data-cc-dir]").forEach((button) => {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.setDirection(button.getAttribute("data-cc-dir"));
        });
      });

      this.canvas.addEventListener("pointerdown", (event) => {
        const rect = this.canvas.getBoundingClientRect();
        this.touchStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        this.canvas.setPointerCapture?.(event.pointerId);
      });
      this.canvas.addEventListener("pointerup", (event) => {
        if (!this.touchStart) return;
        const rect = this.canvas.getBoundingClientRect();
        const end = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const dx = end.x - this.touchStart.x;
        const dy = end.y - this.touchStart.y;
        this.touchStart = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
        this.setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      });

      window.addEventListener("keydown", this.boundKeyDown, { passive: false });
      window.addEventListener("resize", this.boundResize);
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
      }
    }

    handleKeyDown(event) {
      if (this.destroyed) return;
      if (event.target.closest?.("input, textarea, select")) return;
      const key = event.key.toLowerCase();
      const map = {
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down"
      };
      if (map[key]) {
        event.preventDefault();
        this.setDirection(map[key]);
        return;
      }
      if (key === " " || key === "enter") {
        event.preventDefault();
        if (["title", "gameOver", "victory"].includes(this.game.status)) this.start();
        else this.togglePause();
      }
      if (key === "p") {
        event.preventDefault();
        this.togglePause();
      }
    }

    loadHighScore() {
      return Number(window.localStorage.getItem(STORAGE_KEY) || 0);
    }

    saveHighScore() {
      window.localStorage.setItem(STORAGE_KEY, String(this.game.highScore));
    }

    loadLeaderboard() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) || "[]");
        return Array.isArray(saved)
          ? saved
            .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
            .sort((a, b) => b.score - a.score || String(a.savedAt || "").localeCompare(String(b.savedAt || "")))
            .slice(0, 10)
          : [];
      } catch {
        return [];
      }
    }

    saveLeaderboard(entries) {
      window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 10)));
    }

    getSavedName() {
      try {
        return window.localStorage.getItem(LAST_PLAYER_NAME_KEY) || "";
      } catch {
        return "";
      }
    }

    savePlayerName(name) {
      try {
        window.localStorage.setItem(LAST_PLAYER_NAME_KEY, name);
      } catch {
        // Local storage can be unavailable in private browsing.
      }
    }

    scoreQualifies(score) {
      return score > 0;
    }

    rankScore(score) {
      return this.loadLeaderboard().filter((entry) => entry.score > score).length + 1;
    }

    renderScoreForm(score) {
      const savedName = escapeHtml(this.getSavedName());
      return `
        <form class="cc-score-form" data-cc-score-form>
          <label for="cc-player-name">Top 10 score</label>
          <input id="cc-player-name" data-cc-player-name maxlength="16" autocomplete="off" placeholder="Ace" value="${savedName}">
          <button type="submit" class="cc-button cc-button-primary" data-cc-save-score>Save ${score.toLocaleString()}</button>
        </form>
      `;
    }

    renderLeaderboardRows(entries, options = {}) {
      const rows = entries.slice(0, 10).map((entry, index) => {
        const highlight = entry.id && entry.id === options.highlightId ? ' class="cc-highlight"' : "";
        const finalColumn = entry.pending ? "Pending" : escapeHtml(this.formatGlobalDate(entry.date || entry.savedAt));
        return `<tr${highlight}><td>${index + 1}</td><td>${escapeHtml(entry.name)}</td><td>${entry.score.toLocaleString()}</td><td>${finalColumn}</td></tr>`;
      }).join("");
      const emptyRow = `<tr><td colspan="4">No saved scores yet.</td></tr>`;
      const recentRow = options.recentScore && !options.recentQualifies
        ? `<tr class="cc-highlight"><td>-</td><td>Your score</td><td>${options.recentScore.toLocaleString()}</td><td>${this.game.levelIndex + 1}</td></tr>`
        : "";
      return rows || recentRow ? `${rows}${recentRow}` : emptyRow;
    }

    formatGlobalDate(date) {
      if (!date) return "";
      try {
        return new Date(date).toLocaleDateString();
      } catch {
        return "";
      }
    }

    saveScoreFromOverlay() {
      const score = this.game.score;
      if (!this.scoreQualifies(score)) {
        this.showLeaderboard("Leaderboard", { recentScore: score });
        return;
      }

      const nameInput = this.overlayEl.querySelector("[data-cc-player-name]");
      const name = (nameInput?.value || "Ace").trim().slice(0, 16) || "Ace";
      this.savePlayerName(name);
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        score,
        level: this.game.levelIndex + 1,
        savedAt: new Date().toISOString()
      };
      const entries = [...this.loadLeaderboard(), entry]
        .sort((a, b) => b.score - a.score || a.savedAt.localeCompare(b.savedAt))
        .slice(0, 10);
      this.saveLeaderboard(entries);
      globalLeaderboard.queueScore(entry.name, entry.score);
      globalLeaderboard.syncPendingScores().catch((error) => {
        console.warn("Chomp Chase global score sync failed; local score remains saved.", error);
      });
      this.showLeaderboard("Score Saved", { highlightId: entry.id });
    }

    showLeaderboard(title = "Leaderboard", options = {}) {
      if (this.game.status === "playing") this.game.status = "paused";
      this.overlayMode = "leaderboard";
      const entries = globalLeaderboard.getDisplayScores(this.loadLeaderboard());
      const recentQualifies = options.recentScore ? this.scoreQualifies(options.recentScore) : false;
      this.overlayEl.classList.add("cc-show");
      this.overlayTitleEl.textContent = title;
      const renderTable = (scores, renderOptions = {}) => {
        const note = renderOptions.error ? `<p>Global sync pending: ${escapeHtml(renderOptions.error)}</p>` : "";
        return `
          ${note}
          <table class="cc-leaderboard">
            <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Date</th></tr></thead>
            <tbody>${this.renderLeaderboardRows(scores, { ...renderOptions, recentQualifies })}</tbody>
          </table>
        `;
      };
      this.overlayCopyEl.innerHTML = `
        ${renderTable(entries, options)}
      `;
      const resumeButton = this.game.status === "paused"
        ? `<button type="button" class="cc-button" data-cc-overlay-resume>Resume</button>`
        : "";
      this.overlayActionsEl.innerHTML = `
        <button type="button" class="cc-button cc-button-primary" data-cc-overlay-start>New Game</button>
        ${resumeButton}
      `;
      globalLeaderboard.getBestScores(this.loadLeaderboard()).then((result) => {
        if (this.destroyed || this.overlayMode !== "leaderboard") return;
        this.overlayTitleEl.textContent = title;
        this.overlayCopyEl.innerHTML = renderTable(result.scores, { ...options, error: result.error });
      }).catch((error) => {
        console.warn("Chomp Chase global leaderboard refresh failed.", error);
      });
    }

    makePellets() {
      const pellets = new Map();
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          const ch = MAZE[y][x];
          if (ch === "." || ch === "o") pellets.set(keyFor(x, y), ch === "o" ? "power" : "dot");
        }
      }
      return pellets;
    }

    makePlayer() {
      return { x: PLAYER_START.x, y: PLAYER_START.y, dir: DIRS.left, nextDir: DIRS.left, mouth: 0, invincibleTimer: 1.1 };
    }

    makeEnemies(levelIndex) {
      return ENEMY_PRESETS.slice(0, LEVELS[levelIndex].enemies).map((preset, index) => ({
        ...preset,
        id: `${preset.name}-${index}`,
        x: preset.start.x,
        y: preset.start.y,
        dir: DIRS[preset.dir],
        eatenTimer: 0,
        releaseTimer: 0.35 + index * 0.55,
        wobble: Math.random() * Math.PI * 2
      }));
    }

    makeFreshGame(highScore = 0) {
      const pellets = this.makePellets();
      return {
        status: "title",
        score: 0,
        highScore,
        lives: STARTING_LIVES,
        levelIndex: 0,
        pellets,
        totalPellets: pellets.size,
        player: this.makePlayer(),
        enemies: this.makeEnemies(0),
        powerTimer: 0,
        powerCombo: 0,
        levelTimer: 0,
        levelClearTimer: 0,
        deathTimer: 0,
        bannerTimer: 0,
        bonus: { ...BONUS_TILE, active: false, eaten: false, timer: 0 },
        shake: 0,
        message: "Ready?"
      };
    }

    resetForLevel(levelIndex) {
      const pellets = this.makePellets();
      this.game.levelIndex = levelIndex;
      this.game.pellets = pellets;
      this.game.totalPellets = pellets.size;
      this.game.player = this.makePlayer();
      this.game.enemies = this.makeEnemies(levelIndex);
      this.game.powerTimer = 0;
      this.game.powerCombo = 0;
      this.game.levelTimer = 0;
      this.game.levelClearTimer = 0;
      this.game.deathTimer = 0;
      this.game.bannerTimer = 2.0;
      this.game.bonus = { ...BONUS_TILE, active: false, eaten: false, timer: 0 };
      this.game.shake = 0;
      this.game.status = "playing";
      this.game.message = `${LEVELS[levelIndex].name}: ${LEVELS[levelIndex].subtitle}`;
    }

    resetActors() {
      this.game.player = this.makePlayer();
      this.game.enemies = this.makeEnemies(this.game.levelIndex);
      this.game.powerTimer = 0;
      this.game.powerCombo = 0;
      this.game.bannerTimer = 1.25;
      this.game.message = "Ready?";
    }

    start() {
      this.overlayMode = null;
      this.lastScoreOverlayKey = "";
      this.audio.prime();
      const highScore = this.game.highScore || this.loadHighScore();
      this.game = this.makeFreshGame(highScore);
      this.resetForLevel(0);
      this.audio.level();
      this.canvas.focus({ preventScroll: true });
      this.syncUi(true);
    }

    pause() {
      if (this.game.status === "playing") {
        this.game.status = "paused";
        this.game.message = "Paused";
        this.syncUi(true);
      }
    }

    resume() {
      if (this.game.status === "paused") {
        this.overlayMode = null;
        this.game.status = "playing";
        this.game.message = `${LEVELS[this.game.levelIndex].name}: ${LEVELS[this.game.levelIndex].subtitle}`;
        this.canvas.focus({ preventScroll: true });
        this.syncUi(true);
      }
    }

    togglePause() {
      if (this.game.status === "playing") this.pause();
      else if (this.game.status === "paused") this.resume();
    }

    setDirection(dirKey) {
      if (!DIRS[dirKey]) return;
      if (["title", "gameOver", "victory"].includes(this.game.status)) {
        this.start();
        return;
      }
      this.game.player.nextDir = DIRS[dirKey];
    }

    addScore(amount) {
      this.game.score += amount;
      if (this.game.score > this.game.highScore) {
        this.game.highScore = this.game.score;
        this.saveHighScore();
      }
      if (typeof this.options.onScoreChange === "function") this.options.onScoreChange(this.getState());
    }

    getAvailableDirections(entity) {
      const tx = Math.round(entity.x);
      const ty = Math.round(entity.y);
      return DIR_LIST.filter((dir) => canMoveFrom(tx, ty, dir));
    }

    chooseEnemyDirection(enemy) {
      const options = this.getAvailableDirections(enemy);
      if (!options.length) return enemy.dir;
      const reverse = opposite(enemy.dir);
      const nonReverse = options.filter((dir) => !reverse || dir.key !== reverse.key);
      const choices = nonReverse.length ? nonReverse : options;
      const level = LEVELS[this.game.levelIndex];
      const player = this.game.player;
      const tx = Math.round(enemy.x);
      const ty = Math.round(enemy.y);

      if (this.game.powerTimer > 0 && enemy.eatenTimer <= 0) {
        if (Math.random() < 0.28) return choices[Math.floor(Math.random() * choices.length)];
        return choices
          .map((dir) => ({ dir, d: distSq({ x: tx + dir.x, y: ty + dir.y }, player) }))
          .sort((a, b) => b.d - a.d)[0].dir;
      }

      if (enemy.eatenTimer > 0) {
        return choices
          .map((dir) => ({ dir, d: distSq({ x: tx + dir.x, y: ty + dir.y }, enemy.start) }))
          .sort((a, b) => a.d - b.d)[0].dir;
      }

      let target = { x: player.x, y: player.y };
      const playerDir = player.dir || DIRS.left;
      if (enemy.type === "ambush") target = { x: player.x + playerDir.x * 4, y: player.y + playerDir.y * 4 };
      if (enemy.type === "flanker") target = { x: player.x + playerDir.x * 2 + (player.x - 10) * 0.65, y: player.y + playerDir.y * 2 + (player.y - 9) * 0.35 };
      if (enemy.type === "wanderer") target = distSq(enemy, player) < 28 ? { x: 1, y: 21 } : { x: player.x, y: player.y };
      if (enemy.type === "shadow") target = { x: COLS - 1 - player.x, y: player.y };
      if (enemy.type === "charger") target = distSq(enemy, player) > 36 ? { x: player.x, y: player.y } : { x: 19, y: 1 };
      if (Math.random() > level.aggression) {
        target = { x: target.x + (Math.random() - 0.5) * 5, y: target.y + (Math.random() - 0.5) * 5 };
      }

      return choices
        .map((dir) => ({ dir, d: distSq({ x: tx + dir.x, y: ty + dir.y }, target) + Math.random() * 0.42 }))
        .sort((a, b) => a.d - b.d)[0].dir;
    }

    moveEntity(entity, speed, dt, desiredDir = null) {
      const amount = speed * dt;
      if (centered(entity)) {
        snapToTile(entity);
        const tx = Math.round(entity.x);
        const ty = Math.round(entity.y);
        if (desiredDir && canMoveFrom(tx, ty, desiredDir)) entity.dir = desiredDir;
        if (!entity.dir || !canMoveFrom(tx, ty, entity.dir)) return;
      }
      if (!entity.dir) return;

      const beforeX = entity.x;
      const beforeY = entity.y;
      if (entity.dir.x !== 0) {
        entity.y = Math.round(entity.y);
        const targetCenter = nextCenterOnAxis(beforeX, entity.dir.x);
        entity.x += entity.dir.x * amount;
        if (crossedCenter(beforeX, entity.x, entity.dir.x, targetCenter)) entity.x = targetCenter;
      } else if (entity.dir.y !== 0) {
        entity.x = Math.round(entity.x);
        const targetCenter = nextCenterOnAxis(beforeY, entity.dir.y);
        entity.y += entity.dir.y * amount;
        if (crossedCenter(beforeY, entity.y, entity.dir.y, targetCenter)) entity.y = targetCenter;
      }
      if (entity.x < -0.55) entity.x = COLS - 0.45;
      if (entity.x > COLS - 0.45) entity.x = -0.55;
    }

    update(dt) {
      const game = this.game;
      const level = LEVELS[game.levelIndex];
      game.shake = Math.max(0, game.shake - dt * 8);

      if (game.status === "levelClear") {
        game.levelClearTimer -= dt;
        if (game.levelClearTimer <= 0) {
          if (game.levelIndex >= LEVELS.length - 1) {
            game.status = "victory";
            game.message = "All 5 levels cleared";
            if (typeof this.options.onVictory === "function") this.options.onVictory(this.getState());
          } else {
            this.resetForLevel(game.levelIndex + 1);
            this.audio.level();
          }
        }
        return;
      }

      if (game.status === "dying") {
        game.deathTimer -= dt;
        if (game.deathTimer <= 0) {
          if (game.lives <= 0) {
            game.status = "gameOver";
            game.message = "Game Over";
            if (typeof this.options.onGameOver === "function") this.options.onGameOver(this.getState());
          } else {
            this.resetActors();
            game.status = "playing";
          }
        }
        return;
      }

      if (game.status !== "playing") return;

      game.levelTimer += dt;
      game.bannerTimer = Math.max(0, game.bannerTimer - dt);
      game.player.invincibleTimer = Math.max(0, game.player.invincibleTimer - dt);
      if (game.powerTimer > 0) {
        game.powerTimer = Math.max(0, game.powerTimer - dt);
        if (game.powerTimer === 0) game.powerCombo = 0;
      }

      this.moveEntity(game.player, level.playerSpeed, dt, game.player.nextDir);
      game.player.mouth += dt * 11;

      const playerTileX = Math.round(game.player.x);
      const playerTileY = Math.round(game.player.y);
      const pelletKey = keyFor((playerTileX + COLS) % COLS, playerTileY);
      if (centered(game.player, 0.22) && game.pellets.has(pelletKey)) {
        const pelletType = game.pellets.get(pelletKey);
        game.pellets.delete(pelletKey);
        if (pelletType === "power") {
          this.addScore(50);
          game.powerTimer = level.powerTime;
          game.powerCombo = 0;
          game.shake = 0.45;
          this.audio.power();
        } else {
          this.addScore(10);
          this.audio.dot();
        }
        const pelletsEaten = game.totalPellets - game.pellets.size;
        if (!game.bonus.eaten && !game.bonus.active && pelletsEaten > game.totalPellets * 0.58) {
          game.bonus.active = true;
          game.bonus.timer = 10;
        }
      }

      if (game.bonus.active) {
        game.bonus.timer -= dt;
        if (Math.abs(game.player.x - game.bonus.x) < 0.55 && Math.abs(game.player.y - game.bonus.y) < 0.55) {
          this.addScore(500 + game.levelIndex * 150);
          game.bonus.active = false;
          game.bonus.eaten = true;
          game.shake = 0.35;
          this.audio.eatEnemy();
        }
        if (game.bonus.timer <= 0) game.bonus.active = false;
      }

      for (const enemy of game.enemies) {
        enemy.wobble += dt * 8;
        if (enemy.releaseTimer > 0) {
          enemy.releaseTimer -= dt;
          continue;
        }
        if (enemy.eatenTimer > 0) {
          enemy.eatenTimer -= dt;
          if (enemy.eatenTimer <= 0) {
            enemy.x = enemy.start.x;
            enemy.y = enemy.start.y;
            enemy.dir = DIRS[enemy.dir?.key] || DIRS.left;
            enemy.releaseTimer = 0.6;
          }
        }
        if (centered(enemy)) {
          snapToTile(enemy);
          enemy.dir = this.chooseEnemyDirection(enemy);
        }
        const speedMultiplier = enemy.eatenTimer > 0 ? 1.45 : game.powerTimer > 0 ? 0.78 : 1;
        this.moveEntity(enemy, level.enemySpeed * speedMultiplier, dt);
      }

      for (const enemy of game.enemies) {
        if (enemy.eatenTimer > 0 || game.player.invincibleTimer > 0) continue;
        if (distSq(game.player, enemy) >= 0.48) continue;
        if (game.powerTimer > 0) {
          game.powerCombo += 1;
          this.addScore(200 * game.powerCombo);
          enemy.eatenTimer = 1.85;
          enemy.x = Math.round(enemy.x);
          enemy.y = Math.round(enemy.y);
          game.shake = 0.55;
          this.audio.eatEnemy();
        } else {
          game.lives -= 1;
          game.status = "dying";
          game.deathTimer = 1.45;
          game.shake = 1;
          game.message = game.lives > 0 ? "Try again" : "Game Over";
          this.audio.death();
          return;
        }
      }

      if (game.pellets.size === 0) {
        game.status = "levelClear";
        game.levelClearTimer = 1.8;
        game.message = game.levelIndex >= LEVELS.length - 1 ? "Perfect Run" : "Level Cleared";
        this.addScore(1000 + game.levelIndex * 500);
        this.audio.level();
      }
    }

    loop(time) {
      if (this.destroyed) return;
      if (!this.lastTime) this.lastTime = time;
      const dt = Math.min(0.033, (time - this.lastTime) / 1000);
      this.lastTime = time;
      this.update(dt);
      this.draw();
      if (time - this.lastUiTime > 120) {
        this.lastUiTime = time;
        this.syncUi(false);
      }
      this.frameId = window.requestAnimationFrame(this.loop.bind(this));
    }

    resize() {
      if (!this.canvas || !this.canvas.parentElement) return;
      const dpr = window.devicePixelRatio || 1;
      const holder = this.canvas.parentElement;
      const availableW = Math.max(300, holder.clientWidth || this.container.clientWidth || 700);
      const maxByHeight = Math.max(330, window.innerHeight * 0.68) * (COLS / ROWS);
      const cssW = Math.max(300, Math.min(availableW, maxByHeight));
      const cssH = cssW * (ROWS / COLS);
      this.canvas.style.width = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }

    syncUi(forceOverlay = false) {
      const game = this.game;
      const level = LEVELS[game.levelIndex];
      this.scoreEl.textContent = game.score.toLocaleString();
      this.highEl.textContent = game.highScore.toLocaleString();
      this.levelEl.textContent = `${game.levelIndex + 1}/5`;
      this.livesEl.textContent = "O".repeat(Math.max(0, game.lives)) || "0";
      this.dotsEl.textContent = String(game.pellets.size);
      this.levelTitleEl.textContent = `${level.name}: ${level.subtitle}`;
      this.levelDetailEl.textContent = `Enemies: ${level.enemies} - Enemy speed: ${level.enemySpeed.toFixed(2)} - Power time: ${level.powerTime.toFixed(1)}s`;
      this.powerFillEl.style.width = `${clamp((game.powerTimer / level.powerTime) * 100, 0, 100)}%`;

      const showOverlay = ["title", "paused", "gameOver", "victory"].includes(game.status);
      if (forceOverlay || showOverlay !== this.overlayEl.classList.contains("cc-show")) {
        this.overlayEl.classList.toggle("cc-show", showOverlay);
      }
      if (this.overlayMode === "leaderboard") return;
      if (showOverlay) {
        const title = game.status === "title" ? this.options.title : game.status === "gameOver" ? "Game Over" : game.status === "victory" ? "Perfect Clear" : "Paused";
        let copy = "Clear all dots, grab power pellets, dodge the ghost crew, and survive five increasingly difficult levels.";
        if (game.status === "paused") copy = "Take a breath. Press Pause, Space, or Enter to jump back in.";
        if (game.status === "gameOver") copy = `Final score: ${game.score.toLocaleString()}. Start a new run and chase the high score.`;
        if (game.status === "victory") copy = `You cleared all five levels with ${game.score.toLocaleString()} points. That is a clean run.`;
        this.overlayTitleEl.textContent = title;
        if (["gameOver", "victory"].includes(game.status)) {
          const scoreOverlayKey = `${game.status}:${game.score}:${game.levelIndex}`;
          if (this.overlayMode === "score" && this.lastScoreOverlayKey === scoreOverlayKey) return;
          this.overlayMode = "score";
          this.lastScoreOverlayKey = scoreOverlayKey;
          const qualifies = this.scoreQualifies(game.score);
          this.overlayCopyEl.innerHTML = `${escapeHtml(copy)}${qualifies ? this.renderScoreForm(game.score) : ""}`;
          this.overlayActionsEl.innerHTML = qualifies
            ? `<button type="button" class="cc-button" data-cc-show-leaderboard>Leaderboard</button><button type="button" class="cc-button" data-cc-overlay-start>New Game</button>`
            : `<button type="button" class="cc-button cc-button-primary" data-cc-show-leaderboard>Leaderboard</button><button type="button" class="cc-button" data-cc-overlay-start>New Game</button>`;
        } else {
          this.overlayCopyEl.textContent = copy;
          this.overlayActionsEl.innerHTML = `
            <button type="button" class="cc-button cc-button-primary" data-cc-overlay-start>${game.status === "title" ? "Start Game" : "New Game"}</button>
            <button type="button" class="cc-button" data-cc-overlay-resume style="${game.status === "paused" ? "" : "display:none"}">Resume</button>
          `;
        }
      }
    }

    drawPlayer(ctx, x, y, r, dir, mouthPhase, dying = false) {
      const angle = dir?.angle ?? 0;
      const pulse = Math.abs(Math.sin(mouthPhase));
      const mouth = dying ? 0.72 : 0.16 + pulse * 0.34;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.shadowColor = "rgba(255, 230, 64, 0.85)";
      ctx.shadowBlur = r * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth, false);
      ctx.closePath();
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
      grad.addColorStop(0, "#fff7a4");
      grad.addColorStop(0.4, "#ffe042");
      grad.addColorStop(1, "#f5b800");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.stroke();
      ctx.restore();
    }

    drawEyes(ctx, offsetX, offsetY, eyeSize, dir) {
      const lookX = (dir?.x || 0) * eyeSize * 0.22;
      const lookY = (dir?.y || 0) * eyeSize * 0.22;
      const spacing = eyeSize * 0.95;
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(offsetX + side * spacing * 0.48, offsetY, eyeSize * 0.45, eyeSize * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1632a5";
        ctx.beginPath();
        ctx.arc(offsetX + side * spacing * 0.48 + lookX, offsetY + lookY, eyeSize * 0.19, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawGhost(ctx, enemy, x, y, size, frightened, blinking) {
      const r = size * 0.48;
      if (enemy.eatenTimer > 0) {
        ctx.save();
        ctx.translate(x, y);
        this.drawEyes(ctx, size * 0.2, size * -0.04, size * 0.18, enemy.dir);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(x, y + Math.sin(enemy.wobble) * size * 0.03);
      ctx.shadowColor = frightened ? "rgba(75, 161, 255, 0.9)" : enemy.color;
      ctx.shadowBlur = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.8);
      ctx.lineTo(-r, -r * 0.1);
      ctx.quadraticCurveTo(-r, -r, 0, -r);
      ctx.quadraticCurveTo(r, -r, r, -r * 0.1);
      ctx.lineTo(r, r * 0.8);
      for (let i = 4; i >= 0; i -= 1) {
        const px = -r + (i * 2 * r) / 4;
        const py = i % 2 === 0 ? r * 0.8 : r * 0.46;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -r, 0, r);
      if (frightened) {
        grad.addColorStop(0, blinking ? "#f3f8ff" : "#2474ff");
        grad.addColorStop(1, blinking ? "#7aaaff" : "#1238b8");
      } else {
        grad.addColorStop(0, enemy.accent);
        grad.addColorStop(0.35, enemy.color);
        grad.addColorStop(1, "rgba(0,0,0,0.34)");
      }
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.2, size * 0.035);
      ctx.strokeStyle = frightened ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)";
      ctx.stroke();
      if (frightened) {
        ctx.fillStyle = blinking ? "#1140d1" : "#ffffff";
        ctx.beginPath();
        ctx.arc(-size * 0.18, -size * 0.08, size * 0.045, 0, Math.PI * 2);
        ctx.arc(size * 0.18, -size * 0.08, size * 0.045, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = blinking ? "#1140d1" : "#ffffff";
        ctx.lineWidth = size * 0.035;
        ctx.beginPath();
        ctx.moveTo(-size * 0.28, size * 0.18);
        ctx.lineTo(-size * 0.18, size * 0.11);
        ctx.lineTo(-size * 0.08, size * 0.18);
        ctx.lineTo(size * 0.02, size * 0.11);
        ctx.lineTo(size * 0.12, size * 0.18);
        ctx.lineTo(size * 0.22, size * 0.11);
        ctx.stroke();
      } else {
        this.drawEyes(ctx, 0, -size * 0.08, size * 0.18, enemy.dir);
      }
      ctx.restore();
    }

    drawBonus(ctx, x, y, size, t) {
      ctx.save();
      ctx.translate(x, y + Math.sin(t * 7) * size * 0.05);
      ctx.shadowColor = "rgba(255, 77, 114, 0.9)";
      ctx.shadowBlur = size * 0.45;
      ctx.fillStyle = "#ff3864";
      ctx.beginPath();
      ctx.arc(-size * 0.15, size * 0.08, size * 0.19, 0, Math.PI * 2);
      ctx.arc(size * 0.16, size * 0.08, size * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#a8ff8f";
      ctx.lineWidth = Math.max(1, size * 0.045);
      ctx.beginPath();
      ctx.moveTo(-size * 0.08, -size * 0.08);
      ctx.quadraticCurveTo(size * 0.02, -size * 0.34, size * 0.22, -size * 0.38);
      ctx.stroke();
      ctx.restore();
    }

    draw() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const width = Number.parseFloat(this.canvas.style.width) || 700;
      const height = Number.parseFloat(this.canvas.style.height) || 760;
      const game = this.game;
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#030612");
      bg.addColorStop(0.55, "#070b22");
      bg.addColorStop(1, "#02030b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const cell = Math.min(width / COLS, height / ROWS);
      const boardW = cell * COLS;
      const boardH = cell * ROWS;
      let ox = (width - boardW) / 2;
      let oy = (height - boardH) / 2;
      if (game.shake > 0) {
        const amount = game.shake * cell * 0.12;
        ox += (Math.random() - 0.5) * amount;
        oy += (Math.random() - 0.5) * amount;
      }
      const t = performance.now() / 1000;

      ctx.save();
      roundedRect(ctx, ox - cell * 0.3, oy - cell * 0.3, boardW + cell * 0.6, boardH + cell * 0.6, cell * 0.42);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fill();
      ctx.strokeStyle = "rgba(92, 174, 255, 0.35)";
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.stroke();
      ctx.restore();

      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if (MAZE[y][x] !== "#") continue;
          const px = ox + x * cell;
          const py = oy + y * cell;
          const inset = cell * 0.075;
          roundedRect(ctx, px + inset, py + inset, cell - inset * 2, cell - inset * 2, cell * 0.18);
          const wallGrad = ctx.createLinearGradient(px, py, px + cell, py + cell);
          wallGrad.addColorStop(0, "#11256f");
          wallGrad.addColorStop(0.55, "#07144a");
          wallGrad.addColorStop(1, "#173995");
          ctx.fillStyle = wallGrad;
          ctx.fill();
          ctx.strokeStyle = "rgba(85, 176, 255, 0.9)";
          ctx.lineWidth = Math.max(1, cell * 0.035);
          ctx.stroke();
        }
      }

      for (const [key, type] of game.pellets.entries()) {
        const [xRaw, yRaw] = key.split(",");
        const x = Number(xRaw);
        const y = Number(yRaw);
        const cx = ox + (x + 0.5) * cell;
        const cy = oy + (y + 0.5) * cell;
        if (type === "power") {
          const pulse = 0.78 + Math.sin(t * 6) * 0.22;
          ctx.shadowColor = "rgba(255, 245, 180, 0.85)";
          ctx.shadowBlur = cell * 0.35;
          ctx.fillStyle = "#fff2a8";
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.18 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "#ffefc8";
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(2, cell * 0.065), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (game.bonus.active) this.drawBonus(ctx, ox + (game.bonus.x + 0.5) * cell, oy + (game.bonus.y + 0.5) * cell, cell, t);

      const frightened = game.powerTimer > 0;
      const blinking = frightened && game.powerTimer < 2.25 && Math.floor(t * 8) % 2 === 0;
      for (const enemy of game.enemies) {
        this.drawGhost(ctx, enemy, ox + (enemy.x + 0.5) * cell, oy + (enemy.y + 0.5) * cell, cell * 0.9, frightened, blinking);
      }

      this.drawPlayer(ctx, ox + (game.player.x + 0.5) * cell, oy + (game.player.y + 0.5) * cell, cell * 0.39, game.player.dir, game.status === "dying" ? t * 4 : game.player.mouth, game.status === "dying");

      if (game.bannerTimer > 0 || game.status === "levelClear" || game.status === "dying") {
        const alpha = clamp(game.bannerTimer || game.levelClearTimer || game.deathTimer, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.92 * alpha;
        ctx.font = `800 ${Math.max(18, cell * 0.78)}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(3, cell * 0.1);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillStyle = game.status === "dying" ? "#ff6b7c" : "#fff4a8";
        ctx.strokeText(game.message, width / 2, oy + boardH * 0.49);
        ctx.fillText(game.message, width / 2, oy + boardH * 0.49);
        ctx.restore();
      }
    }

    getState() {
      return {
        status: this.game.status,
        score: this.game.score,
        highScore: this.game.highScore,
        lives: this.game.lives,
        level: this.game.levelIndex + 1,
        pelletsLeft: this.game.pellets.size
      };
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      if (this.frameId) window.cancelAnimationFrame(this.frameId);
      window.removeEventListener("keydown", this.boundKeyDown);
      window.removeEventListener("resize", this.boundResize);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.container.innerHTML = "";
    }
  }

function destroyActiveChompChase() {
  if (initTimer) {
    window.clearTimeout(initTimer);
    initTimer = 0;
  }
  if (activeMenuCleanup) {
    activeMenuCleanup();
    activeMenuCleanup = null;
  }
  if (activeChompChase) {
    activeChompChase.destroy();
    activeChompChase = null;
  }
}

function initChompChase() {
  destroyActiveChompChase();
  const screen = document.querySelector("[data-chomp-chase-screen]");
  const container = document.querySelector("[data-chomp-chase-container]");
  if (!screen || !container) return;

  const cleanupOnMenu = (event) => {
    if (!event.target.closest("[data-menu]")) return;
    destroyActiveChompChase();
  };

  screen.addEventListener("click", cleanupOnMenu, true);
  screen.addEventListener("pointerdown", cleanupOnMenu, true);
  activeMenuCleanup = () => {
    screen.removeEventListener("click", cleanupOnMenu, true);
    screen.removeEventListener("pointerdown", cleanupOnMenu, true);
  };

  activeChompChase = new ChompChaseInstance(container, {
    showExitButton: false,
    title: "Chomp Chase"
  });
}

export function renderChompChase() {
  if (typeof window !== "undefined") {
    destroyActiveChompChase();
    initTimer = window.setTimeout(initChompChase, 0);
  }

  return `
    <section class="panel game-panel" data-chomp-chase-screen>
      <div class="toolbar">
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
      </div>
      <div data-chomp-chase-container></div>
    </section>
  `;
}
