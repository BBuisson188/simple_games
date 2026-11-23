import * as THREE from "three";
import { createFlightControls } from "./controls.js";
import { createPatrol, WAVE_COUNT } from "./patrol.js";
import { createFlightScene, disposeFlightMaterials, loadKestrel } from "./scene.js";

const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const CENTER = new THREE.Vector3(0, 0, -145);
const BOLT_SPEED = 344;
const HOSTILE_SPEED = 220;
const TARGET_RADIUS = 4.1;
const AIM_CONE = Math.cos(THREE.MathUtils.degToRad(9));
const damp = THREE.MathUtils.damp;

export async function startFlightTest(surface, isCurrent, immersive) {
  const canvas = surface.querySelector("canvas");
  const kestrel = await loadKestrel();
  if (!isCurrent()) {
    disposeFlightMaterials(kestrel);
    return;
  }
  let graphics;
  try {
    graphics = createFlightScene(canvas, kestrel);
  } catch (error) {
    disposeFlightMaterials(kestrel);
    throw error;
  }

  const { ship, drones, camera, rocks } = graphics;
  const patrol = createPatrol(drones, rocks);
  const sockets = ["Pulse_L", "Pulse_R"].map((name) => kestrel.getObjectByName(name));
  const find = (name) => surface.querySelector(`[data-sf3-${name}]`);
  const hud = Object.fromEntries(["shield", "wave", "contacts", "range", "speed", "callout", "reticle", "target", "edge", "heading",
    "detail", "overlay", "resume", "reset", "pause"].map((name) => [name, find(name)]));
  const events = new AbortController();
  const options = { signal: events.signal };
  const controls = createFlightControls(surface, events.signal, togglePause);
  const scratch = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const aimRelative = new THREE.Vector3();
  const playerVelocity = new THREE.Vector3();
  const cameraAnchor = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const canonical = new THREE.Quaternion();
  const pitchAxis = new THREE.Quaternion();
  const bankAxis = new THREE.Quaternion();
  const ray = new THREE.Ray();
  const shotFrom = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const sphere = new THREE.Sphere();
  let bolts = [];
  let hostileBolts = [];
  let target;
  let aligned = false;
  let burst;
  let time;
  let age;
  let lastTime;
  let cooldown;
  let safeTime;
  let speed;
  let shields;
  let repairedShield;
  let lastDamage;
  let yaw;
  let pitch;
  let roll;
  let autoBank;
  let boosting;
  let escapeWarning;
  let frame;
  let mode = "loading";
  let stopped = false;
  let lost = false;
  let resolution = 1;
  let slowFrames = 0;
  let frameAverage = 1 / 60;
  let lastHudText;

  function setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  function startLoop() {
    if (frame !== undefined || stopped || lost) return;
    lastTime = undefined;
    frame = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    window.cancelAnimationFrame(frame);
    frame = undefined;
    controls.clear();
  }

  function describe(title, detail, canResume, canReset) {
    setText(hud.heading, title);
    setText(hud.detail, detail);
    hud.overlay.hidden = false;
    hud.resume.hidden = !canResume;
    hud.reset.hidden = !canReset;
    hud.pause.disabled = true;
    if (canResume) hud.resume.focus({ preventScroll: true });
    else if (canReset) hud.reset.focus({ preventScroll: true });
  }

  function pause() {
    if (mode !== "flying") return;
    mode = "paused";
    stopLoop();
    describe("Flight paused", "Resume at the same spot, or restart the patrol.", !lost, !lost);
  }

  function resume() {
    if (mode !== "paused" || lost) return;
    if (!immersive.isActive()) void immersive.enter();
    mode = "flying";
    hud.overlay.hidden = true;
    hud.pause.disabled = false;
    canvas.focus({ preventScroll: true });
    startLoop();
  }

  function togglePause() {
    if (mode === "paused") resume();
    else pause();
  }

  function reset() {
    time = age = cooldown = safeTime = yaw = pitch = roll = autoBank = 0;
    shields = 3;
    repairedShield = false;
    lastDamage = "";
    speed = 51;
    boosting = escapeWarning = false;
    bolts = [];
    hostileBolts = [];
    target = undefined;
    burst = undefined;
    canonical.identity();
    ship.position.set(0, 33, 168);
    ship.quaternion.identity();
    ship.visible = true;
    patrol.reset(ship.position, canonical);
    selectTarget();
    controls.clear();
    mode = "flying";
    if (!immersive.isActive()) void immersive.enter();
    hud.overlay.hidden = true;
    hud.pause.disabled = false;
    camera.fov = 61;
    camera.updateProjectionMatrix();
    placeCamera(0, true);
    graphics.resize(resolution);
    paint();
    updateHud();
    canvas.focus({ preventScroll: true });
    startLoop();
  }

  function placeCamera(dt, snap = false) {
    cameraAnchor.set(0, 4.25, 19.5).applyQuaternion(canonical).add(ship.position);
    if (snap) camera.position.copy(cameraAnchor);
    else camera.position.lerp(cameraAnchor, 1 - Math.exp(-dt * 8.7));
    bankAxis.setFromAxisAngle(FORWARD, autoBank * 0.34);
    cameraUp.copy(UP).applyQuaternion(bankAxis).applyQuaternion(canonical);
    camera.up.copy(cameraUp);
    lookAt.set(0, 1.8, -42).applyQuaternion(canonical).add(ship.position);
    camera.lookAt(lookAt);
    camera.fov = damp(camera.fov, boosting ? 69 : 61, 4.7, dt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function selectTarget() {
    aim.copy(FORWARD).applyQuaternion(canonical);
    let best = -Infinity;
    let next;
    for (const enemy of patrol.enemies) {
      if (!enemy.model.visible) continue;
      aimRelative.copy(enemy.position).sub(ship.position);
      const distance = aimRelative.length();
      const facing = aimRelative.dot(aim) / (distance || 1);
      const inCone = distance > 12 && distance < 420 && facing > AIM_CONE;
      const score = Number(inCone) * 3 + facing - distance / 660 + (enemy === target ? 0.045 : 0);
      if (score > best) {
        next = enemy;
        aligned = inCone;
        best = score;
      }
    }
    target = next;
    if (!target) aligned = false;
  }

  function fire() {
    if (cooldown > 0 || bolts.length > 30) return;
    cooldown = 0.17;
    const leadTime = aligned ? target.position.distanceTo(ship.position) / BOLT_SPEED : 0;
    ship.updateMatrixWorld(true);
    for (const [index, socket] of sockets.entries()) {
      if (socket) socket.getWorldPosition(shotFrom);
      else shotFrom.set(index ? 0.48 : -0.48, 0, -3.5).applyQuaternion(ship.quaternion).add(ship.position);
      const heading = FORWARD.clone().applyQuaternion(canonical);
      if (aligned) heading.copy(target.position).addScaledVector(target.velocity, leadTime * 0.92).sub(shotFrom).normalize();
      bolts.push({
        position: shotFrom.clone(), velocity: heading.clone().multiplyScalar(BOLT_SPEED),
        orientation: new THREE.Quaternion().setFromUnitVectors(UP, heading), life: 1.45
      });
    }
  }

  function fireHostile(enemy, destination) {
    if (hostileBolts.length >= 12) return;
    const heading = destination.clone().sub(enemy.position).normalize();
    hostileBolts.push({
      position: enemy.position.clone().addScaledVector(heading, 3),
      velocity: heading.clone().multiplyScalar(HOSTILE_SPEED),
      orientation: new THREE.Quaternion().setFromUnitVectors(UP, heading), life: 1.65
    });
  }

  function showBurst(position, speedLimit) {
    const velocity = Array.from({ length: 24 }, (_, index) => {
      const angle = index * 2.399963;
      const y = 1 - 2 * (index + 0.5) / 24;
      const radius = Math.sqrt(1 - y * y);
      return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle))
        .multiplyScalar(speedLimit * (0.45 + (index % 7) * 0.083));
    });
    burst = { age: 0, origin: position.clone(), velocity };
  }

  function distanceToHit(center, radius) {
    sphere.set(center, radius);
    if (sphere.containsPoint(ray.origin)) return 0;
    return ray.intersectSphere(sphere, hitPoint) ? hitPoint.distanceTo(ray.origin) : Infinity;
  }

  function updateBolts(dt, shots, hostile) {
    for (const bolt of shots) {
      const travel = bolt.velocity.length() * dt;
      ray.origin.copy(bolt.position);
      ray.direction.copy(bolt.velocity).normalize();
      bolt.position.addScaledVector(bolt.velocity, dt);
      bolt.life -= dt;
      let closest = travel;
      let blocked = false;
      for (const rock of rocks) {
        const hit = distanceToHit(rock.position, rock.radius * 0.78);
        if (hit > closest) continue;
        closest = hit;
        blocked = true;
      }
      if (hostile) {
        if (distanceToHit(ship.position, 3.8) <= closest) {
          damage("Enemy hit", false);
          blocked = true;
        }
      } else {
        let victim;
        for (const enemy of patrol.enemies) {
          if (!enemy.model.visible) continue;
          const hit = distanceToHit(enemy.position, TARGET_RADIUS);
          if (hit > closest) continue;
          victim = enemy;
          closest = hit;
        }
        if (victim) {
          showBurst(victim.position, patrol.hit(victim) ? 46 : 12);
          blocked = true;
        }
      }
      if (blocked) bolt.life = 0;
    }
    return shots.filter((bolt) => bolt.life > 0);
  }

  function damage(label, impact) {
    if (safeTime > 0 || mode !== "flying") return;
    shields--;
    lastDamage = label;
    if (impact) speed *= 0.55;
    safeTime = 1.25;
    showBurst(ship.position, 19);
    if (!shields) {
      mode = "failed";
      stopLoop();
      describe("Kestrel disabled", "Your shields are down. Restart the patrol to try again.", false, true);
    }
  }

  function hitRock() {
    for (const rock of rocks) {
      scratch.copy(ship.position).sub(rock.position);
      const distance = scratch.length();
      const contact = rock.radius * 0.86 + 2.35;
      if (distance >= contact) continue;
      if (distance < 0.001) scratch.copy(UP);
      else scratch.multiplyScalar(1 / distance);
      ship.position.addScaledVector(scratch, contact - distance + 0.35);
      damage("Asteroid impact", true);
      if (mode !== "flying") return;
    }
  }

  function update(dt) {
    time += dt;
    age += dt;
    cooldown = Math.max(0, cooldown - dt);
    safeTime = Math.max(0, safeTime - dt);
    const { yaw: x, pitch: y, roll: spin, boost, fire: shooting } = controls.read();
    yaw = damp(yaw, -x, 9, dt);
    pitch = damp(pitch, y, 9, dt);
    roll = damp(roll, spin, 8, dt);
    autoBank = damp(autoBank, x * 0.54, 5.2, dt);
    pitchAxis.setFromAxisAngle(UP, yaw * 1.35 * dt);
    canonical.multiply(pitchAxis);
    pitchAxis.setFromAxisAngle(RIGHT, pitch * 1.24 * dt);
    canonical.multiply(pitchAxis);
    pitchAxis.setFromAxisAngle(FORWARD, roll * 1.64 * dt);
    canonical.multiply(pitchAxis).normalize();

    scratch.copy(ship.position).sub(CENTER);
    const fromCenter = scratch.length();
    escapeWarning = fromCenter > 1080;
    if (fromCenter > 1350) {
      // Nudge the heading back into the practice area only when crossing its outer edge.
      const ahead = aim.copy(FORWARD).applyQuaternion(canonical);
      scratch.normalize().negate();
      if (ahead.dot(scratch) < 0.38) {
        pitchAxis.setFromUnitVectors(ahead, scratch);
        const towardCenter = canonical.clone().premultiply(pitchAxis);
        canonical.slerp(towardCenter, 1 - Math.exp(-dt * 1.25));
      }
    }
    boosting = boost && !escapeWarning;
    speed = damp(speed, boosting ? 123 : 55, boosting ? 2.7 : 3.2, dt);
    playerVelocity.copy(FORWARD).applyQuaternion(canonical).multiplyScalar(speed);
    ship.position.addScaledVector(playerVelocity, dt);
    bankAxis.setFromAxisAngle(FORWARD, autoBank);
    ship.quaternion.copy(canonical).multiply(bankAxis);

    if (patrol.update(dt, ship, canonical, playerVelocity, fireHostile)) {
      repairedShield = shields < 3;
      shields = Math.min(3, shields + 1);
      age = 0;
    }
    selectTarget();
    if (shooting) fire();
    bolts = updateBolts(dt, bolts, false);
    // Let players regroup without stray projectiles landing after the wave ends.
    hostileBolts = patrol.remaining ? updateBolts(dt, hostileBolts, true) : [];
    if (mode === "flying") hitRock();
    if (burst) {
      burst.age += dt;
      if (burst.age >= 0.75) burst = undefined;
    }
    placeCamera(dt);
  }

  function positionMarker(element, x, y) {
    element.style.left = `${50 + x * 50}%`;
    element.style.top = `${50 - y * 50}%`;
  }

  function updateHud() {
    setText(hud.shield, `${shields} / 3`);
    setText(hud.wave, `${patrol.wave} / ${WAVE_COUNT}`);
    setText(hud.contacts, String(patrol.remaining));
    setText(hud.range, target?.model.visible ? `${Math.round(ship.position.distanceTo(target.position))} m` : "—");
    setText(hud.speed, `${Math.round(speed)} m/s`);
    const incoming = patrol.enemies.some((enemy) => enemy.charging > 0) || hostileBolts.length > 0;
    const status = escapeWarning ? "Leaving the patrol area · turn back"
      : safeTime > 0.52 ? lastDamage
      : patrol.complete ? "Patrol clear · Free flight"
      : !patrol.remaining ? "Wave 1 clear · Reinforcements inbound"
      : incoming ? "Incoming fire · Bank or boost"
      : age < 5 ? (patrol.wave === 1 ? "Track the marked hostile"
        : repairedShield ? "Interceptors incoming · +1 shield restored" : "Interceptors incoming") : "";
    hud.callout.classList.toggle("is-threat", incoming || safeTime > 0.52);
    surface.classList.toggle("is-hit", safeTime > 0.95);
    if (lastHudText !== status) {
      setText(hud.callout, status);
      hud.callout.hidden = !status;
      lastHudText = status;
    }
    const reticle = scratch.copy(FORWARD).applyQuaternion(canonical).multiplyScalar(210).add(ship.position).project(camera);
    positionMarker(hud.reticle, THREE.MathUtils.clamp(reticle.x, -0.88, 0.88), THREE.MathUtils.clamp(reticle.y, -0.8, 0.8));
    hud.reticle.classList.toggle("is-aligned", aligned && Boolean(target?.model.visible));
    if (!target?.model.visible) {
      hud.target.hidden = hud.edge.hidden = true;
      return;
    }
    const projected = scratch.copy(target.position).project(camera);
    const local = aimRelative.copy(target.position).applyMatrix4(camera.matrixWorldInverse);
    const inside = local.z < 0 && Math.abs(projected.x) < 0.91 && Math.abs(projected.y) < 0.79;
    hud.target.hidden = !inside;
    hud.edge.hidden = inside;
    if (inside) {
      positionMarker(hud.target, projected.x, projected.y);
      hud.target.dataset.hits = `${target.hits} / ${target.armor}`;
    } else {
      const screenX = local.x / camera.aspect;
      const screenY = local.z > 0 && Math.abs(screenX) + Math.abs(local.y) < 0.1 ? -1 : local.y;
      const ratio = 1 / (Math.max(Math.abs(screenX) / 0.85, Math.abs(screenY) / 0.67) || 1);
      positionMarker(hud.edge, screenX * ratio, screenY * ratio);
      hud.edge.style.setProperty("--sf3-bearing", `${Math.atan2(screenX, screenY || (screenX ? 0 : -1))}rad`);
    }
  }

  function paint() {
    graphics.paint(time, boosting, bolts, hostileBolts, patrol.enemies, burst);
  }

  function loop(stamp) {
    frame = undefined;
    if (mode !== "flying" || stopped || lost) return;
    const elapsed = lastTime === undefined ? 0 : (stamp - lastTime) / 1000;
    lastTime = stamp;
    if (elapsed > 0 && elapsed < 0.2) {
      frameAverage += (elapsed - frameAverage) * 0.07;
      slowFrames = frameAverage > 0.037 ? slowFrames + 1 : 0;
      if (slowFrames > 50 && resolution > 0.68) {
        resolution = Math.max(0.68, resolution - 0.16);
        slowFrames = 0;
        graphics.resize(resolution);
      }
    }
    update(Math.min(0.05, elapsed));
    updateHud();
    paint();
    if (mode === "flying") frame = window.requestAnimationFrame(loop);
  }

  hud.pause.addEventListener("click", pause, options);
  hud.resume.addEventListener("click", resume, options);
  hud.reset.addEventListener("click", () => { if (!lost) reset(); }, options);
  window.addEventListener("blur", pause, options);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, options);
  for (const name of ["fullscreenchange", "webkitfullscreenchange"]) {
    document.addEventListener(name, () => { if (!immersive.isActive()) pause(); }, options);
  }
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    mode = "paused";
    stopLoop();
    describe("Graphics paused", "Waiting for the browser to restore the 3D view.", false, false);
  }, options);
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    describe("Graphics restored", "Resume your flight when you’re ready.", true, true);
  }, options);
  const observer = new ResizeObserver(() => {
    if (stopped || lost || time === undefined) return;
    graphics.resize(resolution);
    paint();
    updateHud();
  });
  observer.observe(canvas);
  reset();

  return () => {
    stopped = true;
    stopLoop();
    events.abort();
    observer.disconnect();
    graphics.dispose();
  };
}
