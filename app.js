import { renderMadLibs } from "./games/mad-libs.js";
import { renderAirplaneShooter } from "./games/airplane-shooter.js";
import { renderPlaceholder } from "./games/placeholders.js";

const APP_VERSION = "v17";
const app = document.querySelector("#app");
const offlineStatus = document.querySelector("#offlineStatus");

const games = [
  {
    id: "mad-libs",
    title: "Mad Libs",
    subtitle: "Make a silly story",
    render: renderMadLibs
  },
  {
    id: "airplane-shooter",
    title: "Airplane Shooter",
    subtitle: "Runway takeoff arcade",
    render: renderAirplaneShooter
  },
  {
    id: "future-game-1",
    title: "Future Game",
    subtitle: "Placeholder",
    render: () => renderPlaceholder("Future Game", "Add your next mini-game here.")
  },
  {
    id: "future-game-2",
    title: "Future Game",
    subtitle: "Placeholder",
    render: () => renderPlaceholder("Future Game", "This button is saved for another idea.")
  }
];

function setScreen(html) {
  app.innerHTML = html;
  app.focus();
}

function renderMenu() {
  const buttons = games.map((game) => `
    <button class="menu-button" type="button" data-game="${game.id}">
      <span>
        <strong>${game.title}</strong>
        <span>${game.subtitle}</span>
      </span>
    </button>
  `).join("");

  setScreen(`
    <section class="panel">
      <h2>Pick a game</h2>
      <p class="intro">Choose a mini-game. Once this page has loaded online, it can keep working offline from your Home Screen.</p>
      <div class="menu-grid">${buttons}</div>
    </section>
  `);
}

function openGame(gameId) {
  const game = games.find((item) => item.id === gameId);
  if (!game) {
    renderMenu();
    return;
  }

  setScreen(game.render());
}

function updateOfflineStatus() {
  offlineStatus.textContent = `${navigator.onLine ? "Online" : "Offline"} ${APP_VERSION}`;
}

let refreshingForNewServiceWorker = false;

app.addEventListener("click", (event) => {
  const gameButton = event.target.closest("[data-game]");
  const menuButton = event.target.closest("[data-menu]");

  if (gameButton) {
    openGame(gameButton.dataset.game);
  }

  if (menuButton) {
    renderMenu();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then((registration) => registration.update());
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingForNewServiceWorker) return;
    refreshingForNewServiceWorker = true;
    window.location.reload();
  });
}

window.addEventListener("online", updateOfflineStatus);
window.addEventListener("offline", updateOfflineStatus);

updateOfflineStatus();
renderMenu();
