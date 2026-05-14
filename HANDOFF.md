# Project Handoff

Read this file before making major project changes.

## Current Implementation Status

- App and service worker cache version are currently `v59`.
- Mad Libs has custom game-specific styling, saved local history, and redo flow.
- Starfighter Arena uses Vulture Droid enemies in the Trade Federation level and TIE fighters in later levels.
- Starfighter final score and leaderboard entries use `totalKills` across the full run.
- Airplane Shooter, Starfighter Arena, and Chomp Chase show one leaderboard backed by Firestore, with localStorage only used as cache/pending fallback.
- The future game menu slot is still a placeholder.

## Current Architecture

- Static, offline-capable web app served from the repository root and designed for GitHub Pages.
- `app.js` owns the menu, screen replacement, active game dataset, online/offline status, and service worker registration.
- Each game exports a render function from `games/`; game modules bind their own events after render and keep local state inside the module.
- `games/global-leaderboard.js` owns the shared Firebase Web SDK integration for global score reads and pending-score sync.
- `styles.css` contains shared app styling plus game-specific sections for Airplane Shooter, Mad Libs, and Starfighter Arena.
- `service-worker.js` precaches all local app files and menu images, then refreshes the cache when `CACHE_NAME` changes.

## Important Development Decisions

- Keep runtime assets local so the app works offline after caching.
- Firebase is loaded with browser import-map entries in `index.html`; serve the app over HTTP rather than opening `index.html` as `file://`.
- Browser Firestore access is limited to `getDocs` reads and `addDoc` creates. Do not add client-side update/delete behavior or Firebase Authentication.
- Mad Libs styling relies on `#app` receiving `data-game="mad-libs"` from `app.js`.
- Starfighter HUD still shows current-level kills needed to spawn the boss, while saved scores use total run kills.
- There is no build step or package manager setup; the app is plain HTML, CSS, and JavaScript.

## Leaderboard Notes

- Firestore paths: `leaderboards/airplane-shooter/scores`, `leaderboards/starfighter-arena/scores`, and `leaderboards/chomp-chase/scores`.
- Firestore document shape is exactly `playerName: string`, `score: integer`, `gameId: string`, and `createdAt: server timestamp`.
- Local fallback keys: `miniGames.airplaneShooterLeaderboard`; `miniGames.starfighterArenaLeaderboard`, `miniGames.starfighterArenaLeaderboard.difficulty2`, `miniGames.starfighterArenaLeaderboard.difficulty3`; and `chomp-chase-leaderboard`.
- Pending global sync keys: `miniGames.airplaneShooterPendingGlobalScores`, `miniGames.starfighterArenaPendingGlobalScores`, and `chomp-chase-pending-global-scores`.
- Cached global leaderboard keys are the pending sync keys with `.globalCache` appended.
- Chomp Chase also stores `chomp-chase-high-score` and `chomp-chase-player-name`; Starfighter stores `miniGames.starfighterArenaLastName`.
- Named positive scores save locally first, then queue for Firestore. Pending scores only upload if they still qualify for the global top 10 at sync time; non-qualifying pending scores are removed only from localStorage.

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
- `README.md` is public/project documentation.
- `HANDOFF.md` is workflow history, troubleshooting, and Codex context.
- Prefer small, scoped changes that follow existing plain JavaScript patterns.
- Too many active Codex chats/projects appear to slow the app significantly; close/archive old work when the app starts dragging.

## Git / Publishing Setup

- GitHub publishing should use normal local Git operations: branch, add, commit, pull/rebase, push, then PR.
- Do not use GitHub API patch publishing as a workaround unless the user explicitly asks for it.
- SSH Git is fully working using Windows OpenSSH.
- Windows OpenSSH is forced globally with:

  ```bash
  git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"
  ```

- GitHub remotes should use SSH format:

  ```bash
  git@github.com:BBuisson188/REPO_NAME.git
  ```

- Example for this repo: `git@github.com:BBuisson188/simple_games.git`.

## Windows Git ACL Recovery

Codex on Windows can hit a local ACL issue where `.git\refs\heads` contains DENY entries. That blocks local Git writes such as branch creation and can make Codex incorrectly fall back to GitHub API publishing. Recover normal Git first.

1. Check ACLs:

   ```powershell
   icacls .git\refs\heads
   ```

2. Reset broken ACLs:

   ```powershell
   icacls .git\refs\heads /reset
   ```

3. Verify Git works again:

   ```powershell
   git status
   ```

4. If inheritance problems persist:

   ```powershell
   icacls .git /inheritance:d /T
   ```

## Deployment Workflow

Preferred publish workflow:

```bash
git add .
git commit -m "message"
git pull --rebase
git push
```

GitHub Pages deploys from the main branch root.
