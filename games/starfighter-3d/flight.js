import * as THREE from "three";
import { createStageScore } from "../starfighter-3d-scores.js";
import { createFlightControls } from "./controls.js";
import { createPatrol, FIGHTER_RADIUS, getDifficulty } from "./patrol.js";
import { createCarrier, LOCK_RANGE } from "./carrier.js";
import { FIGHTER_NAMES } from "./fighter-view.js";
import { createFlightScene, disposeFlightMaterials, loadPlayerFighter } from "./scene.js";
import { createFlyaway } from "./aftermath.js";
import { EXHAUST_OPEN_DISTANCE, EXHAUST_RANGE, EXHAUST_Z, TRENCH_AXIAL_RADIUS, TRENCH_CENTER_Z, TRENCH_START_Z, exhaustLockAngle } from "./trench.js";

const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const CENTER = new THREE.Vector3(0, 0, -145);
const BOLT_SPEED = 344;
const HOSTILE_SPEED = 220;
const TORPEDO_SPEED = 287;
const damp = THREE.MathUtils.damp;

export async function startFlightTest(surface, isCurrent, immersive, difficulty, carrierVariant, fighterVariant, run) {
  const canvas = surface.querySelector("canvas");
  const tuning = getDifficulty(difficulty);
  const playerFighter = await loadPlayerFighter(fighterVariant);
  if (!isCurrent()) {
    disposeFlightMaterials(playerFighter);
    return;
  }
  let graphics;
  try {
    graphics = createFlightScene(canvas, playerFighter, carrierVariant, tuning.rate);
  } catch (error) {
    disposeFlightMaterials(playerFighter);
    throw error;
  }

  const { ship, drones, carrierView, battle, trench, wreck, camera, rocks } = graphics;
  const patrol = createPatrol(drones, rocks, tuning, battle || trench ? 0 : 1, Boolean(battle), Boolean(trench));
  const level = trench ? 3 : battle ? 2 : 1;
  const stageScore = createStageScore(run, level, patrol.scoringQuota);
  const carrier = trench ?? createCarrier(carrierView, tuning, CENTER);
  const flyaway = createFlyaway(ship, camera);
  const aimCone = Math.cos(THREE.MathUtils.degToRad(tuning.aim));
  const lockCone = Math.cos(THREE.MathUtils.degToRad(tuning.lockAngle));
  const gunCone = Math.cos(THREE.MathUtils.degToRad(7));
  const sockets = ["Pulse_L", "Pulse_R"].map((name) => playerFighter.getObjectByName(name));
  const find = (name) => surface.querySelector(`[data-sf3-${name}]`);
  const hud = Object.fromEntries(["shield", "stage", "kills", "contacts", "allies", "wingmen", "wing-skill", "range", "speed", "callout", "reticle", "target", "edge", "heading",
    "detail", "overlay", "resume", "reset", "next", "pause", "lock", "lock-status", "lock-meter", "torpedo",
    "score", "result-score", "score-breakdown", "score-form", "save-status"].map((name) => [name, find(name)]));
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
  let torpedo;
  let lockProgress;
  let lockHint;
  let missed;
  let target;
  let aligned = false;
  let bursts;
  let time;
  let introAge;
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
  let aboveDeck;
  let frame;
  let mode = "loading";
  let pausedFrom = "flying";
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
    hud.next.hidden = true;
    hud["result-score"].hidden = hud["score-breakdown"].hidden = hud["score-form"].hidden = hud["save-status"].hidden = true;
    hud.pause.disabled = true;
    if (canResume) hud.resume.focus({ preventScroll: true });
    else if (canReset) hud.reset.focus({ preventScroll: true });
  }

  function showResult(result) {
    const signed = (points) => points > 0 ? `+${points.toLocaleString()}` : points < 0 ? `−${(-points).toLocaleString()}` : "0";
    const elapsed = `${Math.floor(result.elapsed / 60)}:${String(result.elapsed % 60).padStart(2, "0")}`;
    const rows = run.stages.slice(0, level - 1).map((score, i) => [`Stage ${i + 1} total`, score.toLocaleString()]);
    rows.push(
      [result.cleared ? "Objective cleared" : "Objective not cleared", signed(result.clearPoints)],
      [`Speed bonus · ${elapsed}`, signed(result.speedPoints)],
      [`Fighters shot down · ${result.fighters}${result.fighters > patrol.scoringQuota ? ` (${patrol.scoringQuota} scored)` : ""}`, signed(result.fighterPoints)],
      [`Turrets disabled · ${result.turrets}`, signed(result.turretPoints)],
      [`Hits taken · ${result.hits}`, signed(-result.hitPenalty)],
      [`Laser volleys · ${result.volleys}`, signed(-result.volleyPenalty)],
      [`Stage ${level} subtotal`, result.subtotal.toLocaleString()]
    );
    const breakdown = hud["score-breakdown"];
    breakdown.replaceChildren(...rows.flatMap(([label, points]) => {
      const term = document.createElement("dt");
      const value = document.createElement("dd");
      term.textContent = label;
      value.textContent = points;
      return [term, value];
    }));
    breakdown.hidden = false;
    hud["result-score"].textContent = `${run.finished ? "Final score" : "Run score"}: ${run.score.toLocaleString()}${run.ranked ? "" : " · Practice"}`;
    hud["result-score"].hidden = false;
    hud["score-form"].hidden = !run.finished || !run.ranked || run.saved || !run.score;
  }

  function pause() {
    if (mode !== "flying") return;
    pausedFrom = "flying";
    mode = "paused";
    stopLoop();
    describe("Flight paused", "Resume at the same spot, or restart the patrol.", !lost, !lost);
  }

  function resume() {
    if (mode !== "paused" || lost) return;
    if (!immersive.isActive()) void immersive.enter();
    mode = pausedFrom;
    hud.overlay.hidden = true;
    hud.pause.disabled = mode === "cinematic" || mode === "wreck";
    canvas.focus({ preventScroll: true });
    startLoop();
  }

  function togglePause() {
    if (mode === "paused") resume();
    else pause();
  }

  function reset() {
    hud["result-score"].hidden = hud["score-breakdown"].hidden = hud["score-form"].hidden = hud["save-status"].hidden = true;
    time = age = cooldown = safeTime = yaw = pitch = roll = autoBank = 0;
    introAge = battle ? 0 : 2;
    shields = tuning.shields;
    repairedShield = false;
    lastDamage = "";
    speed = 51;
    boosting = escapeWarning = aboveDeck = false;
    bolts = [];
    hostileBolts = [];
    torpedo = undefined;
    lockProgress = missed = 0;
    lockHint = "";
    target = undefined;
    bursts = [];
    canonical.identity();
    ship.position.set(0, trench ? 24 : 33, trench ? TRENCH_START_Z : 168);
    ship.quaternion.identity();
    ship.visible = true;
    wreck.reset();
    carrier.reset();
    battle?.reset();
    patrol.reset();
    if (battle) patrol.joinBattle(ship, canonical);
    else patrol.update(0, ship, canonical, playerVelocity, fireHostile);
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
    if (carrier.phase === "active" && !trench) {
      target = carrier.port;
      aligned = false;
      const portFacing = aimRelative.copy(carrier.port.position).sub(ship.position).normalize().dot(aim);
      let closestGun = Math.max(gunCone, portFacing + 0.0004);
      for (const gun of carrier.guns) {
        if (!gun.model.visible) continue;
        aimRelative.copy(gun.position).sub(ship.position);
        const distance = aimRelative.length();
        const facing = aimRelative.dot(aim) / (distance || 1);
        if (distance < 18 || distance > 420 || facing < closestGun) continue;
        closestGun = facing;
        target = gun;
        aligned = true;
      }
      return;
    }
    let best = -Infinity;
    let next;
    const candidates = trench ? [...patrol.enemies, ...carrier.guns] : patrol.enemies;
    for (const enemy of candidates) {
      if (!enemy.model.visible) continue;
      aimRelative.copy(enemy.position).sub(ship.position);
      const distance = aimRelative.length();
      const facing = aimRelative.dot(aim) / (distance || 1);
      const inCone = distance > 12 && distance < 420 && facing > (enemy.kind === "gun" ? Math.max(gunCone, aimCone) : aimCone);
      const score = Number(inCone) * 3 + facing - distance / 660 + (enemy === target ? 0.045 : 0) - (enemy.kind === "gun" ? .28 : 0);
      if (score > best) {
        next = enemy;
        aligned = inCone;
        best = score;
      }
    }
    if (trench && carrier.phase === "active") {
      aimRelative.copy(carrier.port.position).sub(ship.position);
      const range = aimRelative.length();
      const portAligned = trench.frontFacing(ship.position) && range <= EXHAUST_RANGE
        && aimRelative.dot(aim) / (range || 1) >= Math.cos(THREE.MathUtils.degToRad(exhaustLockAngle(range, tuning.lockAngle)));
      if (!aligned || portAligned) next = !portAligned && trench.needsApproach(ship.position) ? trench.guide : carrier.port;
    }
    target = next;
    if (target?.kind === "port" || target?.kind === "guide") aligned = false;
    if (!target) aligned = false;
  }

  function fire() {
    if (cooldown > 0 || bolts.length > 30) return;
    cooldown = 0.17;
    stageScore.fire();
    ship.updateMatrixWorld(true);
    for (const [index, socket] of sockets.entries()) {
      if (socket) socket.getWorldPosition(shotFrom);
      else shotFrom.set(index ? 0.48 : -0.48, 0, -3.5).applyQuaternion(ship.quaternion).add(ship.position);
      const heading = FORWARD.clone().applyQuaternion(canonical);
      if (aligned) {
        let leadTime = target.position.distanceTo(shotFrom) / BOLT_SPEED;
        for (let pass = 0; pass < 2; pass++) {
          heading.copy(target.position).addScaledVector(target.velocity, leadTime).sub(shotFrom);
          leadTime = heading.length() / BOLT_SPEED;
        }
        heading.normalize();
      } else if (fighterVariant === "rebel") {
        // Meet at the chase reticle instead of firing parallel from widely spaced wings.
        heading.multiplyScalar(210).add(ship.position).sub(shotFrom).normalize();
      }
      bolts.push({
        position: shotFrom.clone(), velocity: heading.clone().multiplyScalar(BOLT_SPEED),
        orientation: new THREE.Quaternion().setFromUnitVectors(UP, heading), life: 1.45
      });
    }
  }

  function fireHostile(enemy, destination, offset = 3, pace = HOSTILE_SPEED) {
    if (hostileBolts.length >= 12) return;
    const heading = destination.clone().sub(enemy.position).normalize();
    const origin = enemy.position.clone().addScaledVector(heading, offset);
    hostileBolts.push({
      position: origin.clone(), enemy, origin,
      velocity: heading.clone().multiplyScalar(pace),
      orientation: new THREE.Quaternion().setFromUnitVectors(UP, heading), life: enemy.kind === "gun" ? 2.0 : 1.65
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
    if (bursts.length === 5) bursts.shift();
    bursts.push({ age: 0, origin: position.clone(), velocity });
  }

  function distanceToHit(center, radius) {
    sphere.set(center, radius);
    if (sphere.containsPoint(ray.origin)) return 0;
    return ray.intersectSphere(sphere, hitPoint) ? hitPoint.distanceTo(ray.origin) : Infinity;
  }

  function nearestRock(maximum) {
    let closest = Infinity;
    for (const rock of rocks) {
      const hit = distanceToHit(rock.position, rock.radius * 0.78);
      if (hit <= maximum && hit < closest) closest = hit;
    }
    return closest;
  }

  function updateBolts(dt, shots, hostile) {
    for (const bolt of shots) {
      const travel = bolt.velocity.length() * dt;
      ray.origin.copy(bolt.position);
      ray.direction.copy(bolt.velocity).normalize();
      bolt.position.addScaledVector(bolt.velocity, dt);
      bolt.life -= dt;
      const obstacle = Math.min(nearestRock(travel), hostile && !trench ? Infinity : carrier.distanceToHull(ray));
      let closest = Math.min(obstacle, travel);
      let blocked = obstacle <= travel;
      if (hostile) {
        if (distanceToHit(ship.position, 3.8) <= closest) {
          damage("Enemy hit", false, bolt);
          blocked = true;
        }
      } else {
        let victim;
        for (const enemy of trench ? [...patrol.enemies, ...carrier.guns] : carrier.phase === "active" ? carrier.guns : patrol.enemies) {
          if (!enemy.model.visible) continue;
          const hit = distanceToHit(enemy.position, enemy.radius ?? FIGHTER_RADIUS);
          if (hit > closest) continue;
          victim = enemy;
          closest = hit;
        }
        if (victim) {
          const destroyed = victim.kind === "gun" ? carrier.hitGun(victim) : patrol.hit(victim);
          if (destroyed) stageScore.kill(victim.kind);
          showBurst(victim.position, destroyed ? 46 : 12);
          blocked = true;
        }
      }
      if (blocked) bolt.life = 0;
    }
    return mode === "wreck" ? [] : shots.filter((bolt) => bolt.life > 0);
  }

  function updateLock(dt, launch) {
    if (carrier.phase !== "active") return;
    if (battle?.allies) {
      lockProgress = 0;
      lockHint = "Wingmen on an attack run";
      return;
    }
    if (torpedo) {
      lockHint = "Torpedo away";
      return;
    }
    if (trench && !trench.open) {
      lockProgress = 0;
      lockHint = "Exhaust hatch opening…";
      return;
    }
    aimRelative.copy(carrier.port.position).sub(ship.position);
    const range = aimRelative.length();
    const reach = trench ? EXHAUST_RANGE : LOCK_RANGE;
    const cone = trench ? Math.cos(THREE.MathUtils.degToRad(exhaustLockAngle(range, tuning.lockAngle))) : lockCone;
    const direction = aimRelative.divideScalar(range || 1);
    aim.copy(FORWARD).applyQuaternion(canonical);
    let eligible = false;
    if (missed > 0) {
      missed -= dt;
      lockHint = "Torpedo missed · Reacquire the port";
    } else if (!carrier.frontFacing(ship.position)) lockHint = trench ? "Follow the approach beacon, then turn down the trench" : "Circle to the carrier’s glowing nose";
    else if (range > reach) lockHint = `Close within ${reach} m to lock`;
    else if (range < (trench ? 18 : 40)) lockHint = "Too close · Bank around for another pass";
    else if (direction.dot(aim) < cone || (!trench && target?.kind === "gun")) lockHint = trench ? "Line up your nose with the exhaust port" : "Center the glowing nose port";
    else {
      ray.origin.copy(ship.position);
      ray.direction.copy(direction);
      const portHit = distanceToHit(carrier.port.position, carrier.port.radius);
      eligible = portHit < Math.min(nearestRock(range), carrier.distanceToHull(ray));
      lockHint = eligible ? "Holding torpedo lock…" : trench ? "Shot blocked · Get inside the approach lights" : "Port blocked · Change your angle";
    }
    lockProgress = eligible ? Math.min(1, lockProgress + dt / tuning.lock) : 0;
    if (lockProgress < 1) return;
    lockHint = "Lock confirmed · Fire torpedo";
    if (!launch) return;
    torpedo = {
      position: new THREE.Vector3(0, -0.55, -4.9).applyQuaternion(canonical).add(ship.position),
      direction: aim.clone(), orientation: new THREE.Quaternion().setFromUnitVectors(UP, aim), life: trench ? 3.2 : 2.5
    };
    lockProgress = 0;
    lockHint = "Torpedo away";
  }

  function updateTorpedo(dt) {
    if (!torpedo) return;
    aimRelative.copy(carrier.port.position).addScaledVector(carrier.port.velocity, 0.1).sub(torpedo.position).normalize();
    torpedo.direction.lerp(aimRelative, 1 - Math.exp(-dt * 8)).normalize();
    torpedo.orientation.setFromUnitVectors(UP, torpedo.direction);
    const travel = TORPEDO_SPEED * dt;
    ray.origin.copy(torpedo.position);
    ray.direction.copy(torpedo.direction);
    const obstacle = Math.min(nearestRock(travel), carrier.distanceToHull(ray));
    const contact = distanceToHit(carrier.port.position, carrier.port.radius);
    if (contact <= travel && contact < obstacle && carrier.frontFacing(ray.origin)) {
      stageScore.finish(true);
      showBurst(carrier.port.position, 90);
      carrier.defeat();
      hostileBolts = []; bolts = [];
      torpedo = undefined;
      boosting = false;
      mode = "cinematic";
      hud.pause.disabled = true;
      controls.clear();
      flyaway.start(carrier.subject, trench ? 7.1 : 5.55, Boolean(trench));
    } else if (obstacle <= travel || (torpedo.life -= dt) <= 0) {
      ray.at(Math.min(obstacle, travel), scratch);
      showBurst(scratch, 21);
      torpedo = undefined;
      missed = 0.72;
    } else torpedo.position.addScaledVector(torpedo.direction, travel);
  }

  function damage(label, impact, attacker) {
    if (safeTime > 0 || mode !== "flying") return;
    stageScore.hit();
    if (!shields) {
      stageScore.finish(false);
      mode = "wreck";
      boosting = false;
      bolts = []; hostileBolts = []; torpedo = undefined;
      lockProgress = 0;
      hud.pause.disabled = true;
      controls.clear();
      wreck.begin(attacker, Boolean(trench));
      return;
    }
    shields--;
    lastDamage = shields ? label : "Shields down · Hull exposed";
    if (impact) speed *= 0.55;
    safeTime = 1.25;
    showBurst(ship.position, 19);
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
    if (mode === "wreck") {
      time += dt;
      const finished = wreck.update(dt, showBurst);
      for (const burst of bursts) burst.age += dt;
      bursts = bursts.filter(({ age: t }) => t < .75);
      if (finished) {
        mode = "failed";
        stopLoop();
        describe(`${playerFighter.name} destroyed`, level > 1 ? "Retrying this stage is practice." : "Retry to start a fresh ranked run.", false, true);
        showResult(stageScore.finish(false));
      }
      return;
    }
    if (mode === "cinematic") {
      time += dt;
      flyaway.update(dt);
      if (carrier.phase !== "defeated") carrier.update(dt, ship, playerVelocity, fireHostile, showBurst);
      for (const burst of bursts) burst.age += dt;
      bursts = bursts.filter(({ age: t }) => t < .75);
      if (carrier.phase === "defeated" && flyaway.age >= (trench ? 7 : 5.55)) {
        mode = "complete";
        const result = stageScore.finish(true);
        stopLoop();
        describe(trench ? "Mission complete" : `Stage ${level} complete`,
          trench ? "The Death Star is destroyed. Your fighter cleared the blast."
            : battle ? "Next objective: Destroy the exhaust port on the Death Star." : `${carrier.name} destroyed. Ready for the next jump?`, false, Boolean(trench));
        hud.next.textContent = trench ? "Return to briefing" : `Jump to Stage ${level + 1}`;
        hud.next.dataset.level = trench ? "brief" : battle ? "trench" : "longbow";
        hud.next.hidden = Boolean(trench && run.ranked && run.score);
        if (!hud.next.hidden) hud.next.focus({ preventScroll: true });
        showResult(result);
      }
      return;
    }
    if (introAge < 2) {
      introAge = Math.min(2, introAge + dt);
      const shock = THREE.MathUtils.smoothstep(introAge, 1.82, 1.86) * (1 - THREE.MathUtils.smoothstep(introAge, 1.86, 2));
      camera.fov = 61 + 12 * shock;
      camera.updateProjectionMatrix();
      if (introAge >= 1.86) battle?.update(dt, patrol, carrier, ship.position, showBurst);
      return;
    }
    time += dt;
    age += dt;
    cooldown = Math.max(0, cooldown - dt);
    safeTime = Math.max(0, safeTime - dt);
    const { yaw: x, pitch: y, roll: spin, boost, fire: shooting, torpedo: launch } = controls.read(cooldown <= 0 && bolts.length <= 30);
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

    if (trench) {
      // Stretch the patrol perimeter along the trench, independent of the climb ceiling.
      scratch.set(ship.position.x, 0, (ship.position.z - TRENCH_CENTER_Z) * 1350 / TRENCH_AXIAL_RADIUS);
    } else scratch.copy(ship.position).sub(CENTER);
    const fromCenter = scratch.length();
    escapeWarning = fromCenter > 1080;
    aboveDeck = trench?.keepOverDeck(ship.position, canonical, dt) ?? false;
    if (fromCenter > 1350) {
      // Nudge the heading back into the practice area only when crossing its outer edge.
      const ahead = aim.copy(FORWARD).applyQuaternion(canonical);
      if (trench) scratch.set(-ship.position.x, 0, TRENCH_CENTER_Z - ship.position.z).normalize();
      else scratch.normalize().negate();
      if (ahead.dot(scratch) < 0.38) {
        pitchAxis.setFromUnitVectors(ahead, scratch);
        const towardCenter = canonical.clone().premultiply(pitchAxis);
        canonical.slerp(towardCenter, 1 - Math.exp(-dt * 1.25));
      }
    }
    boosting = boost && !escapeWarning && !aboveDeck;
    speed = damp(speed, boosting ? 123 : 55, boosting ? 2.7 : 3.2, dt);
    playerVelocity.copy(FORWARD).applyQuaternion(canonical).multiplyScalar(speed);
    ship.position.addScaledVector(playerVelocity, dt);
    bankAxis.setFromAxisAngle(FORWARD, autoBank);
    ship.quaternion.copy(canonical).multiply(bankAxis);

    if (patrol.update(dt, ship, canonical, playerVelocity, fireHostile, boosting)) {
      repairedShield = shields < tuning.shields;
      shields = Math.min(tuning.shields, shields + 1);
      age = 0;
    }
    carrier.update(dt, ship, playerVelocity, fireHostile, showBurst);
    selectTarget();
    if (shooting) fire();
    bolts = updateBolts(dt, bolts, false);
    if (carrier.phase === "idle" && (trench
      ? ship.position.z - EXHAUST_Z <= EXHAUST_OPEN_DISTANCE && ship.position.z >= EXHAUST_Z
      : patrol.complete)) {
      carrier.start(ship.position, canonical);
      if (!trench) shields = Math.min(tuning.shields, shields + 1);
    }
    battle?.update(dt, patrol, carrier, ship.position, showBurst);
    updateLock(dt, launch);
    updateTorpedo(dt);
    if (mode === "cinematic") return;
    hostileBolts = patrol.remaining || carrier.phase === "active" ? updateBolts(dt, hostileBolts, true) : [];
    if (mode === "wreck") return;
    if (carrier.separateShip(ship.position)) damage(trench ? "Deck impact" : "Carrier impact", true);
    if (mode === "flying") hitRock();
    if (mode === "wreck") return;
    for (const burst of bursts) burst.age += dt;
    bursts = bursts.filter(({ age }) => age < .75);
    placeCamera(dt);
  }

  function positionMarker(element, x, y) {
    element.style.left = `${50 + x * 50}%`;
    element.style.top = `${50 - y * 50}%`;
  }

  function updateHud() {
    const jumping = introAge < 2;
    surface.classList.toggle("is-hyperspace", jumping);
    const ending = mode === "cinematic" || mode === "complete" || mode === "wreck" || mode === "failed";
    surface.classList.toggle("is-cinematic", ending);
    surface.classList.toggle("is-exposed", !shields && !ending);
    const bossActive = carrier.phase === "active";
    const bossArriving = carrier.phase === "arriving";
    const bossCrashing = carrier.phase === "crashing";
    const cleared = carrier.phase === "defeated";
    setText(hud.shield, `${shields} / ${tuning.shields}`);
    setText(hud.stage, cleared ? "Clear" : bossActive || bossArriving || bossCrashing ? (trench ? "Trench run" : "Carrier") : "Fighters");
    setText(hud.kills, trench ? String(patrol.defeated) : `${Math.min(patrol.defeated, patrol.total)} / ${patrol.total}`);
    setText(hud.contacts, String(bossActive && !trench ? 1 + carrier.guns.filter((gun) => gun.model.visible).length : patrol.remaining));
    hud.wingmen.hidden = !battle || jumping;
    if (battle) {
      setText(hud.allies, String(battle.allies));
      setText(hud["wing-skill"], battle.allies && !bossActive ? battle.skill : "");
    }
    setText(hud.range, target?.model.visible ? `${Math.round(ship.position.distanceTo(target.position))} m` : "—");
    setText(hud.speed, `${Math.round(speed)} m/s`);
    setText(hud.score, String(stageScore.liveTotal));
    const incoming = patrol.enemies.some((enemy) => enemy.charging > 0)
      || carrier.guns.some((gun) => gun.charging > 0) || hostileBolts.length > 0;
    const status = ending ? (mode === "cinematic" ? "Autopilot · Breaking away" : "")
      : jumping ? "Dropping out of hyperspace…"
      : bossCrashing ? `${carrier.name} breaking apart`
      : escapeWarning ? "Leaving the patrol area · turn back"
      : aboveDeck ? "Return toward the station surface"
      : safeTime > 0.52 ? lastDamage
      : cleared ? `${carrier.name} down · Level clear · Free flight`
      : bossArriving ? `Incoming warp signature · ${carrier.name}`
      : bossActive && battle?.allies ? "Destroyer engaging your wingmen"
      : bossActive ? (trench ? (trench.open ? "Exhaust port open · Follow the trench lights" : "Exhaust hatch opening") : incoming ? "Carrier fire · Bank or boost" : `${carrier.name} · Turrets optional`)
      : !trench && patrol.complete ? "All TIEs down · Stand by"
      : patrol.inbound ? (patrol.batch === 0 ? `${FIGHTER_NAMES[patrol.enemies[0].silhouette]} jump signatures` : "Reinforcements dropping out of hyperspace")
      : incoming ? "Incoming fire · Bank or boost"
      : repairedShield && age < 4 ? "Shield restored · Track the marked hostile"
      : trench ? "Follow the trench toward the exhaust port" : "";
    hud.callout.classList.toggle("is-threat", incoming || safeTime > 0.52);
    surface.classList.toggle("is-hit", safeTime > 0.95);
    if (lastHudText !== status) {
      setText(hud.callout, status);
      hud.callout.hidden = !status;
      lastHudText = status;
    }
    hud.lock.hidden = hud.torpedo.hidden = !bossActive || ending;
    hud.torpedo.disabled = !bossActive || lockProgress < 1 || mode !== "flying";
    hud.lock.classList.toggle("is-locked", lockProgress === 1);
    if (bossActive) {
      setText(hud["lock-status"], lockHint);
      hud["lock-meter"].value = lockProgress;
    }
    const reticle = scratch.copy(FORWARD).applyQuaternion(canonical).multiplyScalar(210).add(ship.position).project(camera);
    positionMarker(hud.reticle, THREE.MathUtils.clamp(reticle.x, -0.88, 0.88), THREE.MathUtils.clamp(reticle.y, -0.8, 0.8));
    hud.reticle.classList.toggle("is-aligned", lockProgress === 1 || (aligned && Boolean(target?.model.visible)));
    hud.target.classList.toggle("is-port", target?.kind === "port" || target?.kind === "guide");
    hud.edge.classList.toggle("is-port", target?.kind === "port" || target?.kind === "guide");
    if (ending || jumping || !target?.model.visible) {
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
      hud.target.dataset.hits = target.kind === "guide" ? "Trench approach" : target.kind === "port" ? (trench ? "Exhaust port" : "Nose port")
        : `${target.kind === "gun" ? "Turret" : FIGHTER_NAMES[target.silhouette]} · ${target.hits} / ${target.armor}`;
    } else {
      const screenX = local.x / camera.aspect;
      const screenY = local.z > 0 && Math.abs(screenX) + Math.abs(local.y) < 0.1 ? -1 : local.y;
      const ratio = 1 / (Math.max(Math.abs(screenX) / 0.85, Math.abs(screenY) / 0.67) || 1);
      positionMarker(hud.edge, screenX * ratio, screenY * ratio);
      hud.edge.style.setProperty("--sf3-bearing", `${Math.atan2(screenX, screenY || (screenX ? 0 : -1))}rad`);
    }
  }

  function paint() {
    graphics.paint(time, boosting, bolts, hostileBolts, torpedo, patrol.enemies, bursts, introAge);
  }

  function loop(stamp) {
    frame = undefined;
    if ((mode !== "flying" && mode !== "cinematic" && mode !== "wreck") || stopped || lost) return;
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
    if (mode === "flying" && introAge >= 2) stageScore.tick(elapsed);
    update(Math.min(0.05, elapsed));
    updateHud();
    paint();
    if (mode === "flying" || mode === "cinematic" || mode === "wreck") frame = window.requestAnimationFrame(loop);
  }

  hud.pause.addEventListener("click", pause, options);
  hud.resume.addEventListener("click", resume, options);
  hud.reset.addEventListener("click", () => {
    if (lost) return;
    stageScore.restart();
    reset();
  }, options);
  window.addEventListener("blur", pause, options);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, options);
  for (const name of ["fullscreenchange", "webkitfullscreenchange"]) {
    document.addEventListener(name, () => { if (!immersive.isActive()) pause(); }, options);
  }
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    if (mode === "complete" || mode === "failed") return;
    lost = true;
    pausedFrom = mode === "cinematic" || mode === "wreck" ? mode : "flying";
    mode = "paused";
    stopLoop();
    describe("Graphics paused", "Waiting for the browser to restore the 3D view.", false, false);
  }, options);
  canvas.addEventListener("webglcontextrestored", () => {
    if (mode === "complete" || mode === "failed") return;
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
