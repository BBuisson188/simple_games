import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url));
const worker = read("service-worker.js").toString();
const version = /const VERSION = "(v\d+)"/.exec(worker)?.[1];
const appVersion = /const APP_VERSION = "(v\d+)"/.exec(read("app.js").toString())?.[1];
if (!version || version !== appVersion) throw new Error("App and service worker versions must match.");
const paths = runInNewContext(/const APP_ASSETS = (\[[\s\S]*?\n\]);/.exec(worker)?.[1] ?? "null");
if (!Array.isArray(paths) || new Set(paths).size !== paths.length) throw new Error("Invalid offline asset list.");
const files = {};
for (const path of paths) {
  const body = read(path === "./" ? "index.html" : path);
  const data = path === "./" || /\.(?:html|js|css|json|svg)$/.test(path)
    ? body.toString().replaceAll("\r\n", "\n") : body;
  files[path] = createHash("sha256").update(data).digest("hex");
}
const manifest = JSON.stringify({ version, files }, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (read("offline-manifest.json").toString().replaceAll("\r\n", "\n") !== manifest) {
    throw new Error("Offline inventory is out of date. Regenerate offline-manifest.json.");
  }
} else process.stdout.write(manifest);
