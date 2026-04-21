# Mini Games

A tiny offline-capable mini-games web app for iPhone, iPad, and GitHub Pages.

## Starter File Structure

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
|   +-- placeholders.js
+-- assets/
    +-- icons/
        +-- app-icon.svg
```

## What Each File Does

- `index.html` is the page GitHub Pages opens. It loads the app shell, CSS, manifest, icon, and JavaScript.
- `styles.css` contains all layout, colors, spacing, and responsive touch-friendly styling.
- `app.js` controls the main menu, screen switching, service worker registration, and online/offline status.
- `games/mad-libs.js` contains the Mad Libs stories, one-by-one story flow, result screen, history, redo buttons, and local saved settings.
- `games/airplane-shooter.js` contains the runway takeoff arcade game, plane choices, stage settings, scoring, controls, enemies, crash flow, level-complete flow, and distance.
- `games/placeholders.js` contains reusable placeholder screens for games that are not built yet.
- `manifest.json` gives the web app its Home Screen name, icon, colors, and standalone display behavior.
- `service-worker.js` caches every required local file so the app can load offline after one successful online visit.
- `assets/icons/app-icon.svg` is the local app icon used by the manifest and page.

## What To Edit Later

- Add or change menu buttons in `app.js`.
- Add or change Mad Libs stories in `games/mad-libs.js`.
- Clear saved Mad Libs history by clearing site data in the browser.
- Change Airplane Shooter controls, plane stats, stage difficulty, enemy points, enemy behavior, or drawing in `games/airplane-shooter.js`.
- Change colors, spacing, or phone/iPad layout in `styles.css`.
- Add new local images, sounds, or other files inside `assets/`, then add those paths to `service-worker.js`.
- When any cached file list changes, update the `CACHE_NAME` in `service-worker.js`, such as from `mini-games-v2` to `mini-games-v3`.

## Local Testing

Service workers do not work from a plain `file://` URL. Use a tiny local server instead.

### Easiest Windows Option

Double-click `launch-app.bat`.

That starts a local server and opens the app at `http://localhost:8000`.

### Manual Option

1. Open a terminal in this folder.
2. Run:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000`.
4. Try the menu and Mad Libs flow.
5. Open browser developer tools and confirm the service worker is registered.

## GitHub Pages Deployment

1. Create a new GitHub repository.
2. Upload these files to the repository root.
3. In GitHub, open the repository settings.
4. Go to **Pages**.
5. Set the source to deploy from the main branch root.
6. Save and wait for GitHub to publish the site.
7. Open the GitHub Pages URL on iPhone or iPad.

This project uses relative paths like `./app.js`, which keeps it compatible with GitHub Pages project URLs such as `https://your-name.github.io/your-repo/`.

## Home Screen Install On iPhone Or iPad

1. Open the GitHub Pages URL in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Keep the name or rename it.
5. Tap **Add**.
6. Launch it from the Home Screen icon.

## Offline And Airplane Mode Testing

1. Load the GitHub Pages site once while online.
2. Open Mad Libs once so all app files have a chance to cache.
3. Add it to the Home Screen from Safari.
4. Turn on Airplane Mode.
5. Open the app from the Home Screen.
6. Confirm the main menu and Mad Libs still work.

## Offline Things To Watch

- Do not add CDN scripts, web fonts, remote images, remote sounds, or analytics unless you also make an offline plan for them.
- Every local file needed by the app should be listed in `service-worker.js`.
- After changing cached files, bump `CACHE_NAME` in `service-worker.js` so devices pick up the new version.
- iPhone and iPad service worker behavior is best over HTTPS, which GitHub Pages provides.
- iOS may be picky about Home Screen icons. This starter uses a local SVG for simplicity; if the icon does not appear nicely, add PNG icons later and reference them in `index.html` and `manifest.json`.
