import { createImmersiveGameplay } from "./immersive-gameplay.js";
import { COURSES, clamp, courseFeatures, mix } from "./pine-ridge-course.js";
import { createSlopeView } from "./pine-ridge-view.js";

const RECORDS_KEY = "miniGames.pineRidge.courseRecords";
const STEER_KEYS = ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"];
const BRAKE_KEYS = ["ArrowDown", "KeyS"];
const HOP_AIR = 0.90;
const RAMP_AIR = 1.62;
const CRASH_TIME = 1.12;
const TRICKS = {
  spread: { name: "Spread Eagle", key: "Z", time: 0.40, points: 125 },
  grab: { name: "Tail Grab", key: "X", time: 0.65, points: 250 },
  flip: { name: "Backflip", key: "C", time: 1.10, points: 500 }
};

function readRecords() {
  try {
    const scores = JSON.parse(localStorage.getItem(RECORDS_KEY)) || {};
    return Object.fromEntries(Object.keys(COURSES).map((id) => [
      id, Number.isSafeInteger(scores[id]) && scores[id] > 0 ? scores[id] : 0
    ]));
  } catch {
    return {};
  }
}

export function renderPineRidgeRun() {
  const courses = Object.entries(COURSES).map(([id, course]) => `
    <button class="pine-course" type="button" data-pine-course="${id}" aria-pressed="${id === "summit"}">
      <strong>${course.name}</strong>
      <span>${course.grade} <span aria-hidden="true">·</span> ${course.length.toLocaleString()} m</span>
    </button>`).join("");
  const tricks = Object.entries(TRICKS).map(([id, trick]) => `
    <button type="button" data-pine-trick="${id}">
      <strong>${trick.name}</strong><small>${trick.key} · +${trick.points}</small>
    </button>`).join("");
  return `<section class="panel game-panel pine-panel">
    <div class="pine-setup">
      <div class="pine-cover">
        <button class="pine-back" type="button" data-menu>← All games</button>
        <div class="pine-title"><h2>Pine Ridge<br>Run</h2></div>
      </div>
      <div class="pine-brief">
        <fieldset>
          <legend>Choose your trail</legend>
          <div class="pine-courses">${courses}</div>
        </fieldset>
        <p data-pine-tip></p>
        <div class="pine-launch">
          <button class="pine-primary" type="button" data-pine-start>Start Run</button>
          <span>Trail best <strong data-pine-best>0</strong></span>
        </div>
        <p class="pine-help">Drag or use ← → to steer. Space jumps, ↓ brakes, and Z X C perform tricks in the air.</p>
      </div>
    </div>
    <div class="pine-play" data-pine-play hidden>
      <canvas class="pine-slope" tabindex="-1" aria-label="Downhill ski trail"></canvas>
      <div class="pine-hud">
        <div class="pine-stats">
          <span><small>Score</small><strong data-pine-score>0</strong></span>
          <span><small>Speed</small><strong data-pine-speed>0 km/h</strong></span>
          <span><small>Lives</small><strong data-pine-lives>3 / 3</strong></span>
        </div>
        <div class="pine-actions">
          <button type="button" data-pine-pause aria-label="Pause">Ⅱ</button>
          <button type="button" data-pine-exit>Exit Run</button>
        </div>
        <div class="pine-progress">
          <span data-pine-trail></span>
          <progress data-pine-progress aria-label="Course progress" value="0"></progress>
          <span><strong data-pine-distance>0</strong> m</span>
        </div>
      </div>
      <div class="pine-callout" data-pine-callout hidden></div>
      <div class="pine-air" data-pine-air hidden>
        <div class="pine-air-status">
          <span data-pine-air-label></span>
          <progress data-pine-air-time max="1" value="0" aria-label="Airborne time remaining"></progress>
        </div>
        <div class="pine-tricks" aria-label="Air tricks">${tricks}</div>
      </div>
      <div class="pine-drive">
        <button class="pine-brake" type="button" data-pine-brake>Brake</button>
        <button class="pine-jump" type="button" data-pine-jump>Jump</button>
      </div>
      <div class="pine-overlay" data-pine-overlay hidden>
        <div class="pine-dialog" role="group" aria-labelledby="pine-result-title">
          <h3 id="pine-result-title" data-pine-heading></h3>
          <p data-pine-detail></p>
          <div class="pine-result-actions">
            <button class="pine-primary" type="button" data-pine-resume>Resume Run</button>
            <button class="pine-primary" type="button" data-pine-retry>Race Again</button>
            <button class="pine-secondary" type="button" data-pine-select>Choose Trail</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

export function mountPineRidgeRun(root) {
  const find = (name) => root.querySelector(`[data-pine-${name}]`);
  const setup = root.querySelector(".pine-setup");
  const canvas = root.querySelector("canvas");
  const play = find("play");
  const view = createSlopeView(canvas);
  const immersive = createImmersiveGameplay(play);
  const controller = new AbortController();
  const keys = new Set();
  const records = readRecords();
  const courseButtons = [...root.querySelectorAll("[data-pine-course]")];
  const trickButtons = [...root.querySelectorAll("[data-pine-trick]")];
  const airPanel = find("air");
  const airLabel = find("air-label");
  const airTime = find("air-time");
  const hud = Object.fromEntries(["best", "distance", "speed", "score", "lives", "progress", "trail", "callout"].map((name) => [name, find(name)]));
  const controls = ["pause", "jump", "brake"].map(find);
  const startButton = find("start");
  const overlay = find("overlay");
  const resumeButton = find("resume");
  const retryButton = find("retry");
  let courseId = "summit";
  let mode = "ready";
  let run;
  let frame;
  let lastTime;
  let drag = null;
  let target = null;
  let braking = false;
  let brakePointer = null;
  let disposed = false;
  let countdown;
  let message = { text: "", seconds: 0 };

  function listen(element, type, handler) {
    element.addEventListener(type, handler, { signal: controller.signal });
  }

  function text(element, value) {
    const next = String(value);
    if (element.textContent !== next) element.textContent = next;
  }

  function chooseCourse(id) {
    courseId = id;
    text(hud.best, (records[id] || 0).toLocaleString());
    text(find("tip"), id === "summit"
      ? "Thread the gates for a streak and land tricks for bonus points. Use a blue ramp for backflips."
      : "Brake before tight gates so you have room to change direction. Use a blue ramp for backflips.");
    for (const button of courseButtons) button.setAttribute("aria-pressed", button.dataset.pineCourse === id);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    frame = undefined;
    lastTime = undefined;
    keys.clear();
    if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
    const brake = find("brake");
    if (brakePointer !== null && brake.hasPointerCapture(brakePointer)) brake.releasePointerCapture(brakePointer);
    drag = null;
    target = null;
    brakePointer = null;
    braking = false;
    brake.classList.remove("is-held");
  }

  function enterFullscreen() {
    void immersive.enter().then(() => {
      if (disposed || mode === "ready") void immersive.exit();
    });
  }

  function start() {
    stopLoop();
    const course = COURSES[courseId];
    const features = courseFeatures(course);
    run = {
      course, features, gatesTotal: features.filter((feature) => feature.kind === "gate").length,
      x: 0, lateralSpeed: 0, turn: 0, distance: 0, speed: 0, brake: false,
      lives: 3, gates: 0, streak: 0, longest: 0, points: 0,
      air: 0, airDuration: 0, trick: null, tricksLanded: 0, crash: null,
      recovery: 0, nextFeature: 0
    };
    view.reset();
    message = { text: "", seconds: 0 };
    hud.progress.max = course.length;
    text(hud.trail, course.name);
    begin(2.3);
  }

  function begin(seconds) {
    mode = "playing";
    countdown = seconds;
    setup.hidden = true;
    play.hidden = false;
    overlay.hidden = true;
    controls.forEach((button) => { button.disabled = false; });
    enterFullscreen();
    canvas.focus({ preventScroll: true });
    refresh();
    view.draw(run);
    frame = requestAnimationFrame(tick);
  }

  function showOverlay(title, detail, paused) {
    text(find("heading"), title);
    text(find("detail"), detail);
    resumeButton.hidden = !paused;
    retryButton.hidden = paused;
    overlay.hidden = false;
    hud.callout.hidden = true;
    airPanel.hidden = true;
    controls.forEach((button) => { button.disabled = true; });
    (paused ? resumeButton : retryButton).focus({ preventScroll: true });
  }

  function pause() {
    if (mode !== "playing") return;
    mode = "paused";
    stopLoop();
    showOverlay("Paused", `${run.course.name} · ${Math.floor(run.distance)} m downhill`, true);
  }

  function exit() {
    mode = "ready";
    stopLoop();
    void immersive.exit();
    play.hidden = true;
    setup.hidden = false;
    startButton.focus({ preventScroll: true });
  }

  function score() {
    return Math.floor(run.distance / 4) + run.points;
  }

  function finish() {
    mode = "finished";
    stopLoop();
    const completed = run.distance >= run.course.length && run.lives > 0;
    if (completed) run.points += 250 + run.lives * 100;
    const finalScore = score();
    const newBest = finalScore > (records[courseId] || 0);
    if (newBest) {
      records[courseId] = finalScore;
      chooseCourse(courseId);
      try {
        localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      } catch {
        // Keep the record for this visit when local storage is unavailable.
      }
    }
    refresh();
    const gates = `${run.gates}/${run.gatesTotal} gates (best streak ${run.longest})`;
    const tricks = `${run.tricksLanded} landed ${run.tricksLanded === 1 ? "trick" : "tricks"}`;
    showOverlay(completed ? "You reached the lodge" : "Run over",
      `${finalScore.toLocaleString()} points · ${gates} · ${tricks}${newBest ? " · New trail best" : ""}`, false);
  }

  function flash(label, seconds = 1.1) {
    message = { text: label, seconds };
  }

  function jump() {
    if (mode !== "playing" || countdown > 0 || run.air > 0 || run.crash) return;
    run.airDuration = run.air = HOP_AIR;
    refresh();
  }

  function tryTrick(id) {
    if (mode !== "playing" || countdown > 0 || run.air <= 0 || run.trick) return;
    run.trick = { id, elapsed: 0, duration: TRICKS[id].time };
    refresh();
  }

  function wipeout(reason) {
    if (run.crash) return;
    const penalty = Math.min(150, score());
    run.points -= penalty;
    run.lives--;
    run.streak = 0;
    run.air = 0;
    run.trick = null;
    run.crash = { progress: 0, direction: Math.sign(run.turn || run.x || 1) };
    run.speed = 0;
    run.lateralSpeed = 0;
    run.turn = 0;
    run.brake = false;
    target = null;
    flash(penalty ? `${reason} −${penalty}` : reason, CRASH_TIME + 0.15);
  }

  function updateAir(dt) {
    if (run.air <= 0) return;
    const airborneStep = Math.min(dt, run.air);
    run.air -= airborneStep;
    if (!run.trick) return;
    run.trick.elapsed += airborneStep;
    if (run.air > 0) return;
    const trick = TRICKS[run.trick.id];
    if (run.trick.elapsed + 0.0001 < trick.time) {
      wipeout("Short on air!");
      return;
    }
    run.points += trick.points;
    run.tricksLanded++;
    run.trick = null;
    flash(`${trick.name} landed +${trick.points}`);
  }

  function passFeature(feature, x) {
    const distance = Math.abs(feature.x - x);
    if (feature.kind === "gate") {
      if (distance < run.course.gateWidth / 2) {
        run.gates++;
        run.streak++;
        run.longest = Math.max(run.streak, run.longest);
        const points = 100 + Math.min(5, run.streak - 1) * 40;
        run.points += points;
        flash(run.streak === 1 ? `Clean gate +${points}` : `${run.streak} in a row +${points}`);
      } else {
        run.streak = 0;
        flash("Gate missed", 0.7);
      }
    } else if (feature.kind === "ramp" && distance < 0.16 && run.air === 0) {
      run.airDuration = run.air = RAMP_AIR;
      run.points += 75;
      flash("Ramp jump +75");
    } else if ((feature.kind === "pine" || feature.kind === "rock") && distance < 0.115 && run.recovery <= 0) {
      if (feature.kind === "rock" && run.air > 0.08) {
        run.points += 100;
        flash("Rock cleared +100");
      } else {
        wipeout("Wipeout!");
      }
    }
  }

  function update(dt) {
    if (countdown > 0) {
      countdown = Math.max(0, countdown - dt);
      if (countdown === 0 && run.distance === 0) flash("Go!", 0.7);
      return;
    }
    message.seconds = Math.max(0, message.seconds - dt);
    if (run.crash) {
      run.crash.progress += dt / CRASH_TIME;
      if (run.crash.progress >= 1) {
        if (run.lives === 0) finish();
        else {
          run.crash = null;
          run.recovery = 0.85;
          flash("Back on your skis", 0.65);
        }
      }
      return;
    }
    updateAir(dt);
    if (run.crash) return;
    const keyDirection = Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    let desired = keyDirection * 1.72;
    if (target !== null && !keyDirection) {
      const delta = target - run.x;
      desired = Math.abs(delta) < 0.008 ? 0 : clamp(delta * 10, -2.15, 2.15);
    }
    run.lateralSpeed = mix(run.lateralSpeed, desired, 1 - Math.exp(-dt * 16));
    const oldX = run.x;
    run.x = clamp(run.x + run.lateralSpeed * dt, -0.94, 0.94);
    if ((run.x === -0.94 && desired < 0) || (run.x === 0.94 && desired > 0)) run.lateralSpeed = 0;
    run.turn = mix(run.turn, run.lateralSpeed / 1.8, 1 - Math.exp(-dt * 12));
    run.brake = braking || BRAKE_KEYS.some((key) => keys.has(key));
    const baseSpeed = mix(run.course.pace[0], run.course.pace[1], run.distance / run.course.length);
    const speed = baseSpeed * (run.brake ? 0.53 : 1 - Math.min(0.12, Math.abs(run.turn) * 0.09));
    run.speed = mix(run.speed, speed, 1 - Math.exp(-dt * (run.brake ? 5 : 2.5)));
    run.recovery = Math.max(0, run.recovery - dt);
    const oldDistance = run.distance;
    run.distance = Math.min(run.course.length, oldDistance + run.speed * dt);
    while (run.nextFeature < run.features.length && run.features[run.nextFeature].meters <= run.distance) {
      const feature = run.features[run.nextFeature++];
      const sweptX = mix(oldX, run.x, (feature.meters - oldDistance) / (run.distance - oldDistance));
      passFeature(feature, sweptX);
      if (run.crash) return;
    }
    if (run.distance >= run.course.length && run.air === 0) finish();
  }

  function refresh() {
    text(hud.distance, Math.floor(run.distance).toLocaleString());
    text(hud.score, score().toLocaleString());
    text(hud.speed, `${Math.round(run.speed * 3.6)} km/h`);
    text(hud.lives, `${run.lives} / 3`);
    hud.progress.value = run.distance;
    const callout = countdown > 0 ? Math.ceil(countdown) : message.seconds > 0 ? message.text : "";
    hud.callout.hidden = !callout || mode !== "playing";
    text(hud.callout, callout);
    hud.callout.classList.toggle("is-countdown", countdown > 0);
    airPanel.hidden = mode !== "playing" || countdown > 0 || run.air <= 0;
    if (!airPanel.hidden) {
      const trick = run.trick && TRICKS[run.trick.id];
      text(airLabel, trick ? trick.name : run.airDuration === RAMP_AIR ? "Big air" : "Pick a trick");
      airTime.value = run.air / run.airDuration;
      for (const button of trickButtons) {
        button.disabled = Boolean(trick);
        const id = button.dataset.pineTrick;
        const option = TRICKS[id];
        const risky = !trick && run.air < option.time;
        button.classList.toggle("is-selected", run.trick?.id === id);
        button.classList.toggle("is-risky", risky);
        text(button.querySelector("small"), risky ? `${option.key} · Short air` : `${option.key} · +${option.points}`);
      }
    }
  }

  function tick(time) {
    if (mode !== "playing") return;
    const dt = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, 0.045);
    lastTime = time;
    update(dt);
    refresh();
    view.draw(run, dt);
    if (mode === "playing") frame = requestAnimationFrame(tick);
  }

  for (const button of courseButtons) listen(button, "click", () => chooseCourse(button.dataset.pineCourse));
  chooseCourse(courseId);
  listen(startButton, "click", start);
  listen(retryButton, "click", start);
  listen(resumeButton, "click", () => begin(0.85));
  listen(find("pause"), "click", pause);
  listen(find("exit"), "click", exit);
  listen(find("select"), "click", exit);
  listen(window, "blur", pause);
  listen(document, "visibilitychange", () => { if (document.hidden) pause(); });
  const observer = new ResizeObserver(() => { if (run && !play.hidden) view.draw(run); });
  observer.observe(canvas);
  for (const name of ["fullscreenchange", "webkitfullscreenchange"]) {
    listen(document, name, () => { if (!immersive.isActive()) pause(); });
  }

  listen(window, "keydown", (event) => {
    if (mode !== "playing" || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === "Escape" || event.code === "KeyP") {
      if (!event.repeat) pause();
    } else if (["KeyZ", "KeyX", "KeyC"].includes(event.code)) {
      if (!event.repeat) {
        const id = Object.keys(TRICKS).find((name) => `Key${TRICKS[name].key}` === event.code);
        tryTrick(id);
      }
    } else if (event.code === "Space") {
      if (event.target === find("exit") || event.target === find("brake") || event.target === find("pause")) return;
      event.preventDefault();
      if (!event.repeat) jump();
    } else if (STEER_KEYS.includes(event.code) || BRAKE_KEYS.includes(event.code)) {
      event.preventDefault();
      if (STEER_KEYS.includes(event.code)) target = null;
      keys.add(event.code);
    }
  });
  listen(window, "keyup", (event) => keys.delete(event.code));
  listen(canvas, "pointerdown", (event) => {
    if (mode !== "playing" || drag || event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, start: event.clientX, lane: run.x };
    target = run.x;
  });
  listen(canvas, "pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    target = clamp(drag.lane + (event.clientX - drag.start) / view.getHalfWidth() * 1.16, -0.94, 0.94);
  });
  const brakeButton = find("brake");
  function setBrake(on) {
    braking = on;
    brakeButton.classList.toggle("is-held", on);
  }
  listen(brakeButton, "pointerdown", (event) => {
    if (mode !== "playing" || event.button !== 0 || brakePointer !== null) return;
    brakePointer = event.pointerId;
    brakeButton.setPointerCapture(event.pointerId);
    setBrake(true);
  });
  listen(brakeButton, "keydown", (event) => { if (event.code === "Space" || event.code === "Enter") setBrake(true); });
  listen(brakeButton, "keyup", (event) => { if (event.code === "Space" || event.code === "Enter") setBrake(false); });
  listen(brakeButton, "blur", () => { if (brakePointer === null) setBrake(false); });
  listen(find("jump"), "pointerdown", (event) => { if (event.button === 0) jump(); });
  listen(find("jump"), "click", (event) => { if (event.detail === 0) jump(); });
  for (const button of trickButtons) {
    listen(button, "pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      tryTrick(button.dataset.pineTrick);
    });
    listen(button, "click", (event) => {
      if (event.detail === 0) tryTrick(button.dataset.pineTrick);
    });
  }
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    listen(canvas, name, (event) => {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      if (event.type === "pointercancel") target = null;
    });
    listen(brakeButton, name, (event) => {
      if (event.pointerId !== brakePointer) return;
      brakePointer = null;
      setBrake(false);
    });
  }

  return () => {
    disposed = true;
    stopLoop();
    observer.disconnect();
    controller.abort();
    immersive.destroy();
  };
}
