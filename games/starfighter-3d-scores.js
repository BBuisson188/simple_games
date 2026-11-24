import { createGlobalLeaderboard } from "./global-leaderboard.js";

const PREFIX = "miniGames.starfighter3D";
const NAME_KEY = `${PREFIX}.callsign`;
export const DIFFICULTIES = ["rookie", "standard", "ace"];

const boards = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, createGlobalLeaderboard({
  gameId: `starfighter-3d-${difficulty}`,
  pendingKey: `${PREFIX}.${difficulty}.pending`
})]));
const refreshes = new Map();

const localKey = (difficulty) => `${PREFIX}.${difficulty}.local`;

function localScores(difficulty) {
  try {
    const saved = JSON.parse(localStorage.getItem(localKey(difficulty)) || "[]");
    return Array.isArray(saved) ? saved.filter((entry) => Number.isInteger(entry?.score) && entry.score >= 0) : [];
  } catch {
    return [];
  }
}

export function savedCallsign() {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
}

export function saveRunScore(run, callsign) {
  const name = callsign.trim().slice(0, 16);
  if (!name || !run.ranked || !run.hasResult || run.saved) return null;
  const { difficulty, score } = run;
  const date = new Date().toISOString();
  const scores = [...localScores(difficulty), { name, score, date }]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 10);
  localStorage.setItem(localKey(difficulty), JSON.stringify(scores));
  localStorage.setItem(NAME_KEY, name);
  const entry = score > 0 ? boards[difficulty].queueScore(name, score) : { name, score, date };
  run.saved = true;
  return entry;
}

export function scoreSnapshot(difficulty) {
  return {
    scores: boards[difficulty].getDisplayScores(),
    pending: boards[difficulty].getPendingScores(),
    best: localScores(difficulty)[0]?.score ?? 0,
    source: "cache"
  };
}

export function refreshScores(difficulty) {
  const previous = refreshes.get(difficulty) ?? Promise.resolve();
  const request = previous.then(async () => {
    if (!navigator.onLine) return scoreSnapshot(difficulty);
    const result = await boards[difficulty].getBestScores();
    return { ...scoreSnapshot(difficulty), ...result };
  });
  refreshes.set(difficulty, request);
  return request;
}

export function createRun(difficulty, ranked) {
  return { difficulty, ranked, score: 0, stages: [], finished: false, hasResult: false, saved: false };
}

export function createStageScore(run, stage, fighterQuota, finalStage = stage === 4) {
  const startingScore = run.score;
  run.hasResult = false;
  let seconds = 0, fighters = 0, turrets = 0, objectives = 0, volleys = 0, hits = 0;
  let result;
  const combatScore = () => Math.min(fighters, fighterQuota) * 100 + turrets * 75 + objectives * 250 - hits * 150 - Math.min(100, volleys);
  function breakdown(cleared = false) {
    const elapsed = Math.floor(seconds);
    const clearPoints = cleared ? 1500 : 0;
    const speedPoints = cleared ? Math.max(0, 1200 - 5 * elapsed) : 0;
    const fighterPoints = Math.min(fighters, fighterQuota) * 100;
    const turretPoints = turrets * 75;
    const objectivePoints = objectives * 250;
    const hitPenalty = hits * 150;
    const volleyPenalty = Math.min(100, volleys);
    const subtotal = Math.max(0, clearPoints + speedPoints + combatScore());
    return { elapsed, cleared, fighters, turrets, objectives, hits, volleys, clearPoints, speedPoints, fighterPoints, turretPoints, objectivePoints, hitPenalty, volleyPenalty, subtotal };
  }

  return {
    tick(dt) { if (!result) seconds += dt; },
    kill(kind) { if (!result) { if (kind === "gun") turrets++; else if (kind === "walker") objectives++; else fighters++; } },
    hit() { if (!result) hits++; },
    fire() { if (!result) volleys++; },
    get liveTotal() { return startingScore + (result?.subtotal ?? Math.max(0, combatScore())); },
    finish(cleared) {
      if (result) return result;
      result = breakdown(cleared);
      run.stages[stage - 1] = result.subtotal;
      run.score = startingScore + result.subtotal;
      run.finished = !cleared || finalStage;
      run.hasResult = true;
      return result;
    },
    restart() {
      if (run.saved) return false;
      run.score = startingScore;
      run.stages.length = stage - 1;
      run.finished = run.hasResult = false;
      result = undefined;
      seconds = fighters = turrets = objectives = volleys = hits = 0;
      return true;
    }
  };
}
