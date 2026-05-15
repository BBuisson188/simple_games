const LEADERBOARD_LIMIT = 10;
const FIREBASE_APP_URL = "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASExWcY08MBQApypJPwPLsmHQtlyAwb5Q",
  authDomain: "beau-games.firebaseapp.com",
  projectId: "beau-games",
  storageBucket: "beau-games.firebasestorage.app",
  messagingSenderId: "683259848665",
  appId: "1:683259848665:web:33ab5572b30af9634d5bc8"
};

const firebaseState = {
  initialized: false,
  db: null,
  error: "",
  sdk: null,
  initPromise: null
};

async function loadFirebaseSdk() {
  if (firebaseState.sdk) return firebaseState.sdk;
  const [{ initializeApp }, firestore] = await Promise.all([
    import(FIREBASE_APP_URL),
    import(FIREBASE_FIRESTORE_URL)
  ]);
  firebaseState.sdk = { initializeApp, ...firestore };
  return firebaseState.sdk;
}

async function ensureFirestore() {
  if (firebaseState.initialized) return firebaseState.db;
  if (!firebaseState.initPromise) {
    firebaseState.initPromise = (async () => {
      try {
        const { initializeApp, getFirestore } = await loadFirebaseSdk();
        const app = initializeApp(firebaseConfig);
        firebaseState.db = getFirestore(app);
        firebaseState.initialized = true;
      } catch (error) {
        firebaseState.error = error?.message || String(error);
        console.warn("Firebase unavailable; local leaderboard fallback remains active.", error);
      } finally {
        firebaseState.initPromise = null;
      }
      return firebaseState.db;
    })();
  }
  return firebaseState.initPromise;
}

function sanitizeScore(score) {
  return Math.max(0, Math.round(Number(score) || 0));
}

function normalizeName(name) {
  return String(name || "Ace").trim().slice(0, 16) || "Ace";
}

function normalizeDate(value) {
  if (value?.toDate) return value.toDate().toISOString();
  return String(value || "");
}

function compareScores(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return String(a.date || "").localeCompare(String(b.date || ""));
}

function scoreQualifiesForList(score, scores) {
  const cleanScore = sanitizeScore(score);
  return cleanScore > 0 && (scores.length < LEADERBOARD_LIMIT || cleanScore > scores[scores.length - 1].score);
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Unable to save pending global leaderboard scores.", error);
  }
}

export function createGlobalLeaderboard({ gameId, pendingKey }) {
  const firestorePath = ["leaderboards", gameId, "scores"];
  const cacheKey = `${pendingKey}.globalCache`;
  let syncing = false;

  async function scoresCollection() {
    const db = await ensureFirestore();
    const { collection } = await loadFirebaseSdk();
    return db ? collection(db, ...firestorePath) : null;
  }

  function getPendingScores() {
    return readJson(pendingKey)
      .filter((entry) => entry && typeof entry.score === "number")
      .map((entry) => ({
        id: String(entry.id || `${entry.date || Date.now()}-${entry.score}`),
        name: normalizeName(entry.name),
        score: sanitizeScore(entry.score),
        date: String(entry.date || new Date().toISOString())
      }))
      .sort(compareScores)
      .slice(0, LEADERBOARD_LIMIT);
  }

  function getCachedScores(fallbackScores = []) {
    const cached = readJson(cacheKey)
      .filter((entry) => entry && typeof entry.score === "number")
      .map((entry) => ({
        id: String(entry.id || `${entry.date || Date.now()}-${entry.score}`),
        name: normalizeName(entry.name),
        score: sanitizeScore(entry.score),
        date: String(entry.date || "")
      }))
      .filter((entry) => entry.score > 0);
    const fallback = fallbackScores
      .filter((entry) => entry && typeof entry.score === "number")
      .map((entry) => ({
        id: String(entry.id || `${entry.createdAt || entry.savedAt || Date.now()}-${entry.score}`),
        name: normalizeName(entry.name),
        score: sanitizeScore(entry.score),
        date: String(entry.date || entry.createdAt || entry.savedAt || "")
      }))
      .filter((entry) => entry.score > 0);
    return (cached.length ? cached : fallback).sort(compareScores).slice(0, LEADERBOARD_LIMIT);
  }

  function saveCachedScores(scores) {
    writeJson(cacheKey, scores.sort(compareScores).slice(0, LEADERBOARD_LIMIT));
  }

  function mergeScores(...scoreLists) {
    const seen = new Set();
    return scoreLists
      .flat()
      .filter((entry) => entry && typeof entry.score === "number")
      .map((entry) => ({
        ...entry,
        id: String(entry.id || `${entry.date || entry.createdAt || entry.savedAt || Date.now()}-${entry.score}`),
        name: normalizeName(entry.name),
        score: sanitizeScore(entry.score),
        date: String(entry.date || entry.createdAt || entry.savedAt || "")
      }))
      .filter((entry) => entry.score > 0)
      .sort(compareScores)
      .filter((entry) => {
        const key = `${entry.id}-${entry.name}-${entry.score}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, LEADERBOARD_LIMIT);
  }

  function savePendingScores(scores) {
    writeJson(pendingKey, scores.sort(compareScores).slice(0, LEADERBOARD_LIMIT));
  }

  function queueScore(name, score) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: normalizeName(name),
      score: sanitizeScore(score),
      date: new Date().toISOString()
    };
    savePendingScores([...getPendingScores(), entry]);
    return entry;
  }

  function getDisplayScores(fallbackScores = []) {
    const pending = getPendingScores().map((entry) => ({ ...entry, pending: true }));
    return mergeScores(getCachedScores(fallbackScores), pending);
  }

  async function getGlobalScores() {
    const scoresRef = await scoresCollection();
    if (!scoresRef) throw new Error(firebaseState.error || "Firebase is not configured.");
    const { getDocs, limit, orderBy, query } = await loadFirebaseSdk();

    const readSnapshot = async (withTieBreaker) => {
      const q = withTieBreaker
        ? query(scoresRef, orderBy("score", "desc"), orderBy("createdAt", "asc"), limit(LEADERBOARD_LIMIT))
        : query(scoresRef, orderBy("score", "desc"), limit(LEADERBOARD_LIMIT));
      return getDocs(q);
    };

    let snapshot;
    try {
      snapshot = await readSnapshot(true);
    } catch (error) {
      console.warn("Global leaderboard tie-break query failed; retrying score-only query.", error);
      snapshot = await readSnapshot(false);
    }

    const scores = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: normalizeName(data.playerName),
          score: sanitizeScore(data.score),
          date: normalizeDate(data.createdAt)
        };
      })
      .filter((entry) => entry.score > 0)
      .sort(compareScores)
      .slice(0, LEADERBOARD_LIMIT);
    if (scores.length || !getDisplayScores().length) saveCachedScores(scores);
    return scores;
  }

  async function syncPendingScores() {
    const pending = getPendingScores();
    if (!pending.length || syncing) return { synced: 0, skipped: 0 };
    const scoresRef = await scoresCollection();
    if (!scoresRef) throw new Error(firebaseState.error || "Firebase is not configured.");
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("Offline; pending scores will sync later.");
    }
    const { addDoc, serverTimestamp } = await loadFirebaseSdk();

    syncing = true;
    try {
      let globalScores = await getGlobalScores();
      const remaining = [];
      let synced = 0;
      let skipped = 0;

      for (const entry of pending.sort(compareScores)) {
        if (!scoreQualifiesForList(entry.score, globalScores)) {
          skipped += 1;
          continue;
        }

        try {
          await addDoc(scoresRef, {
            playerName: entry.name,
            score: entry.score,
            gameId,
            createdAt: serverTimestamp()
          });
          synced += 1;
          globalScores = [...globalScores, entry].sort(compareScores).slice(0, LEADERBOARD_LIMIT);
          saveCachedScores(globalScores);
        } catch (error) {
          remaining.push(entry);
          console.warn("Pending global score sync failed; keeping it queued.", error);
        }
      }

      savePendingScores(remaining);
      return { synced, skipped };
    } finally {
      syncing = false;
    }
  }

  async function getBestScores(localScores = []) {
    try {
      await syncPendingScores();
      const globalScores = await getGlobalScores();
      const displayScores = getDisplayScores(localScores);
      if (!globalScores.length && displayScores.length) {
        return { source: "cache", scores: displayScores, error: "Global leaderboard returned no scores yet." };
      }
      return { source: "global", scores: mergeScores(globalScores, getPendingScores().map((entry) => ({ ...entry, pending: true }))), error: "" };
    } catch (error) {
      console.warn("Global leaderboard unavailable; using cached leaderboard.", error);
      return { source: "cache", scores: getDisplayScores(localScores), error: error?.message || String(error) };
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      syncPendingScores().catch((error) => {
        console.warn(`${gameId} pending global leaderboard sync failed.`, error);
      });
    });
  }

  return {
    gameId,
    pendingKey,
    cacheKey,
    queueScore,
    getGlobalScores,
    getBestScores,
    getDisplayScores,
    getPendingScores,
    syncPendingScores,
    scoreQualifiesForList
  };
}
