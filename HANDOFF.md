# Project Handoff

Read this file before making major project changes.

## Current Implementation Status

- App and service worker cache version are currently `v47`.
- Mad Libs has custom game-specific styling, saved local history, and redo flow.
- Starfighter Arena uses Vulture Droid enemies in the Trade Federation level and TIE fighters in later levels.
- Starfighter final score and leaderboard entries use `totalKills` across the full run.
- The future game menu slot is still a placeholder.

## Current Architecture

- Static, offline-capable web app served from the repository root and designed for GitHub Pages.
- `app.js` owns the menu, screen replacement, active game dataset, online/offline status, and service worker registration.
- Each game exports a render function from `games/`; game modules bind their own events after render and keep local state inside the module.
- `styles.css` contains shared app styling plus game-specific sections for Airplane Shooter, Mad Libs, and Starfighter Arena.
- `service-worker.js` precaches all local app files and menu images, then refreshes the cache when `CACHE_NAME` changes.

## Important Development Decisions

- Keep runtime assets local so the app works offline after caching.
- Mad Libs styling relies on `#app` receiving `data-game="mad-libs"` from `app.js`.
- Starfighter HUD still shows current-level kills needed to spawn the boss, while saved scores use total run kills.
- There is no build step or package manager setup; the app is plain HTML, CSS, and JavaScript.

## Unresolved Issues

- No automated test suite exists; validation is manual in a local browser.
- The future game menu slot needs a real game or should be removed.
- Offline updates require manually keeping `APP_VERSION` and `CACHE_NAME` in sync.

## Next Recommended Steps

- Run through the menu, Mad Libs form/history/redo flow, and Starfighter level one on desktop and phone-sized viewports.
- Confirm GitHub Pages serves `v47` after deployment and that the service worker refreshes cached assets.
- Decide what should replace the remaining future game placeholder.

## Codex Workflow Notes

- Read this file and `README.md` before major edits.
- Keep public-facing docs in `README.md`; keep internal workflow and handoff notes here.
- Prefer small, scoped changes that follow existing plain JavaScript patterns.
- Avoid GitHub API publishing workarounds unless normal `git push` fails.

## Git / Publishing Setup

- This project now uses GitHub SSH publishing instead of HTTPS.
- Keep the remote in this format: `git@github.com:BBuisson188/simple_games.git`.
- Windows OpenSSH is forced globally with:

  ```bash
  git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"
  ```

- Reason: Codex and Windows had authentication and `ssh.exe` issues using HTTPS and Git-for-Windows bundled SSH.
- GitHub SSH authentication has been successfully configured.

## Deployment Workflow

Preferred publish workflow:

```bash
git add .
git commit -m "message"
git pull --rebase
git push
```

GitHub Pages deploys from the main branch root.
