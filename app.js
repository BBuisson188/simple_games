import { renderMadLibs } from "./games/mad-libs.js";
import { mountAirplaneShooter, renderAirplaneShooter } from "./games/airplane-shooter.js";
import { renderStarfighterSinistar } from "./games/starfighter-sinistar.js";
import { renderChompChase } from "./games/chomp_chase_game.js";
import { mountPineRidgeRun, renderPineRidgeRun } from "./games/pine-ridge-run.js";
import { mountStarfighter3D, renderStarfighter3D } from "./games/starfighter-3d-entry.js";
import { askOfflineWorker } from "./offline.js";

const APP_VERSION = "v90";
const ACTIVE_GAME_KEY = "miniGames.activeGame";
const app = document.querySelector("#app");
const offlineStatus = document.querySelector("#offlineStatus");
let disposeScreen;
let savedOffline = false;
let savingOffline = false;
let offlineError = "";

function paintOfflineButton() {
  const button = app.querySelector("[data-prepare-offline]");
  const status = app.querySelector("[data-package-status]");
  if (!button || !status) return;
  const supported = Boolean(navigator.serviceWorker?.controller);
  button.disabled = savingOffline || savedOffline || !navigator.onLine || !supported;
  status.textContent = savingOffline ? "Saving all games…" : savedOffline ? "Ready for offline use"
    : offlineError || (!navigator.onLine ? "Go online to prepare offline use" : "Not ready for offline use");
}

async function checkOfflinePackage() {
  try { savedOffline = await askOfflineWorker("arcade-offline-state"); }
  catch { savedOffline = false; }
  paintOfflineButton();
}

async function prepareOffline() {
  if (savingOffline || savedOffline) return;
  savingOffline = true;
  offlineError = "";
  paintOfflineButton();
  try { savedOffline = await askOfflineWorker("prepare-arcade"); }
  catch (error) { offlineError = error.message; }
  finally { savingOffline = false; paintOfflineButton(); }
}

const games = [
  {
    id: "mad-libs",
    title: "Mad Libs",
    subtitle: "Make a silly story",
    graphic: "./assets/menu/mad-libs.jpg",
    render: renderMadLibs
  },
  {
    id: "airplane-shooter",
    title: "Airplane Shooter",
    subtitle: "Runway takeoff arcade",
    graphic: "./assets/menu/airplane-shooter.jpg",
    render: renderAirplaneShooter,
    mount: mountAirplaneShooter
  },
  {
    id: "starfighter-arena",
    title: "Starfighter Arena",
    subtitle: "Sinistar-style space battle",
    graphic: "./assets/menu/starfighter.jpg",
    render: renderStarfighterSinistar
  },
  {
    id: "starfighter-3d",
    title: "Starfighter 3D",
    subtitle: "Asteroid patrol",
    graphic: "./assets/menu/starfighter-3d.jpg",
    render: renderStarfighter3D,
    mount: mountStarfighter3D
  },
  {
    id: "chomp-chase",
    title: "Chomp Chase",
    subtitle: "Maze chase arcade",
    graphic: "./assets/menu/chomp-chase.jpg",
    render: renderChompChase
  },
  {
    id: "pine-ridge-run",
    title: "Pine Ridge Run",
    subtitle: "Downhill skiing · 3 trails",
    graphic: "./assets/menu/pine-ridge-run.jpg",
    render: renderPineRidgeRun,
    mount: mountPineRidgeRun
  }
];

function setScreen(html) {
  disposeScreen?.();
  disposeScreen = undefined;
  document.body.classList.remove("gameplay-scroll-lock", "cc-chomp-scroll-lock");
  document.body.style.removeProperty("--gameplay-scroll-offset");
  document.body.style.removeProperty("--cc-scroll-offset");
  app.innerHTML = html;
  app.focus();
}

function renderMenu() {
  delete app.dataset.game;
  try {
    sessionStorage.removeItem(ACTIVE_GAME_KEY);
  } catch {
    // Session storage can be unavailable in private browsing.
  }
  const buttons = games.map((game) => `
    <button class="menu-button" type="button" data-game="${game.id}">
      <img class="menu-graphic" src="${game.graphic}" alt="" aria-hidden="true">
      <span>
        <strong>${game.title}</strong>
        <span>${game.subtitle}</span>
      </span>
    </button>
  `).join("");

  setScreen(`
    <section class="panel">
      <h2>Pick a game</h2>
      <p class="intro">Choose a mini-game, or save the whole arcade for offline play. Online leaderboards still need a connection.</p>
      <div class="arcade-offline">
        <button type="button" data-prepare-offline disabled>Prepare offline</button>
        <span role="status" data-package-status>Not ready for offline use</span>
      </div>
      <div class="menu-grid">${buttons}</div>
    </section>
  `);
  paintOfflineButton();
  void checkOfflinePackage();
}

function openGame(gameId) {
  const game = games.find((item) => item.id === gameId);
  if (!game) {
    renderMenu();
    return;
  }

  app.dataset.game = game.id;
  try {
    sessionStorage.setItem(ACTIVE_GAME_KEY, game.id);
  } catch {
    // Session storage can be unavailable in private browsing.
  }
  setScreen(game.render());
  disposeScreen = game.mount?.(app.firstElementChild);
}

function updateOfflineStatus() {
  offlineStatus.textContent = `${navigator.onLine ? "Online" : "Offline"} ${APP_VERSION}`;
}

app.addEventListener("click", (event) => {
  if (event.target.closest("[data-prepare-offline]")) {
    void prepareOffline();
    return;
  }
  const gameButton = event.target.closest(".menu-button[data-game]");
  const menuButton = event.target.closest("[data-menu]");

  if (gameButton) {
    event.preventDefault();
    openGame(gameButton.dataset.game);
    return;
  }

  if (menuButton) {
    if (event.detail !== 0 && menuButton.dataset.menu !== "click") return;
    event.preventDefault();
    renderMenu();
  }
});

app.addEventListener("pointerdown", (event) => {
  const menuButton = event.target.closest("[data-menu]");
  if (!menuButton || menuButton.dataset.menu === "click") return;
  event.preventDefault();
  renderMenu();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => {
        console.warn("Offline support could not be started.", error);
      });
  });
}

window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);
window.addEventListener("online", checkOfflinePackage);
window.addEventListener("offline", checkOfflinePackage);
navigator.serviceWorker?.addEventListener("controllerchange", checkOfflinePackage);

updateOfflineStatus();

let activeGame = null;
try {
  activeGame = sessionStorage.getItem(ACTIVE_GAME_KEY);
} catch {
  activeGame = null;
}

if (activeGame && games.some((game) => game.id === activeGame)) {
  openGame(activeGame);
} else {
  renderMenu();
}
