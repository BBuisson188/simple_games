# Mini Games

A tiny offline-capable mini-games web app for iPhone, iPad, and GitHub Pages.

## Features

- Touch-friendly main menu with local menu artwork.
- Mad Libs with multiple stories, saved local history, redo flow, and playful custom styling.
- Airplane Shooter with plane choices, arcade controls, scoring, stages, and crash/level-complete flows.
- Starfighter Arena with ship choices, difficulty modes, enemy waves, bosses, scoring, leaderboard, and canvas-drawn ships.
- Chomp Chase with local high score, local leaderboard, and global leaderboard sync.
- Installable web app support through `manifest.json`.
- Offline support through a service worker after one successful online load.

## File Structure

```text
.
+-- index.html
+-- styles.css
+-- app.js
+-- manifest.json
+-- service-worker.js
+-- games/
|   +-- mad-libs.js
|   +-- airplane-shooter.js
|   +-- starfighter-sinistar.js
|   +-- chomp_chase_game.js
|   +-- global-leaderboard.js
+-- assets/
    +-- icons/
        +-- app-icon.svg
    +-- menu/
        +-- airplane-shooter.jpg
        +-- mad-libs.jpg
        +-- starfighter.jpg
```

## Setup

Service workers and Firebase ES module imports do not work reliably from a plain `file://` URL. Use a local or static web server for testing.

### Windows Launcher

Double-click `launch-app.bat`.

That starts a local server and opens the app at `http://localhost:8000`.

### Manual Server

1. Open a terminal in this folder.
2. Run:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000`.

## App Usage

- Pick a game from the main menu.
- Use each game's on-screen controls on touch devices.
- Mad Libs history and game leaderboard data are saved locally in the browser.
- To test offline mode, load the app once online, then use the browser or Home Screen app while offline.

## Leaderboards

Airplane Shooter, Starfighter Arena, and Chomp Chase keep their local top 10 leaderboards as the fallback source. When Firebase is reachable, each game reads a global Firestore top 10 ordered by score descending with `createdAt` as the tie-breaker where Firestore indexing allows it. Named scores are saved locally first, queued in localStorage, then uploaded with `addDoc` only if they still qualify for that game's global top 10 at sync time.

Browser Firestore access is intentionally limited to reading global scores and creating new score documents. The client does not use Firebase Authentication and never updates or deletes Firestore documents.

Each Firestore score document contains exactly `playerName`, `score`, `gameId`, and `createdAt`.

| Game | gameId | Firestore path | Local leaderboard key | Pending sync key |
| --- | --- | --- | --- | --- |
| Airplane Shooter | `airplane-shooter` | `leaderboards/airplane-shooter/scores` | `miniGames.airplaneShooterLeaderboard` | `miniGames.airplaneShooterPendingGlobalScores` |
| Starfighter Arena | `starfighter-arena` | `leaderboards/starfighter-arena/scores` | `miniGames.starfighterArenaLeaderboard`, `.difficulty2`, `.difficulty3` | `miniGames.starfighterArenaPendingGlobalScores` |
| Chomp Chase | `chomp-chase` | `leaderboards/chomp-chase/scores` | `chomp-chase-leaderboard` | `chomp-chase-pending-global-scores` |

Additional local keys: Starfighter saves the last player name at `miniGames.starfighterArenaLastName`; Chomp Chase saves its high score and last player name at `chomp-chase-high-score` and `chomp-chase-player-name`.

## GitHub Pages Deployment

1. In GitHub, open the repository settings.
2. Go to **Pages**.
3. Set the source to deploy from the main branch root.
4. Save and wait for GitHub to publish the site.

This project uses relative paths like `./app.js`, which keeps it compatible with GitHub Pages project URLs.

## Home Screen Install On iPhone Or iPad

1. Open the GitHub Pages URL in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Keep the name or rename it.
5. Tap **Add**.
6. Launch it from the Home Screen icon.

## Development Notes

- Add or change menu buttons in `app.js`.
- Add or change Mad Libs stories in `games/mad-libs.js`.
- Change Airplane Shooter behavior in `games/airplane-shooter.js`.
- Change Starfighter Arena behavior in `games/starfighter-sinistar.js`.
- Change Chomp Chase behavior in `games/chomp_chase_game.js`.
- Change shared Firestore leaderboard behavior in `games/global-leaderboard.js`.
- Change layout, colors, and responsive styling in `styles.css`.
- Add new local images, sounds, or other files inside `assets/`, then add those paths to `service-worker.js`.
- When cached files change, update both the app version in `app.js` and the cache name in `service-worker.js`.
- Firebase SDK imports are mapped in `index.html` with an import map. Avoid adding other CDN scripts, web fonts, remote images, remote sounds, or analytics unless an offline plan is added.
