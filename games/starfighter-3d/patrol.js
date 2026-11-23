import * as THREE from "three";

const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const FORMATIONS = [
  [[0, 6, -480], [-72, 28, -495], [78, 15, -510]],
  [[-67, 23, -492], [62, -24, -504]],
  [[16, 37, -483], [-94, -11, -507], [92, 9, -515]]
];
const FLEET_FORMATIONS = [
  [[-177, 70, -319], [161, 45, -364], [-23, 108, -337], [295, -58, -466], [-286, -42, -441],
    [127, 151, -472], [-108, -93, -394], [215, 139, -550], [-218, 159, -520], [25, -120, -493]],
  FORMATIONS[1], FORMATIONS[2]
];
// Flank stations are relative to the pilot: right, up, and ahead (in meters).
const ATTACK_LANES = [
  [-182, 33, 115], [177, 43, 117], [-66, 119, 139], [74, -84, 136], [-218, -43, 21],
  [216, 94, 24], [-115, 110, 229], [122, 13, 223], [-193, 94, -35], [192, -36, -39]
];
const SPAWN_ALTERNATES = [[0, 0], [0, 54], [0, -54], [71, 0], [-71, 0], [83, 57], [-83, 57], [0, 108]];
const STAGGER = 0.5;
export const JUMP_SECONDS = 0.94;
export const JUMP_AFTERGLOW = 0.29;
export const FIGHTER_TOTAL = FORMATIONS.reduce((sum, formation) => sum + formation.length, 0);
export const FIGHTER_POOL = 1 + Math.max(...FORMATIONS.map((formation) => formation.length));
export const FLEET_FIGHTER_POOL = FLEET_FORMATIONS[0].length;
export const CHARGE_TIME = 0.63;
export const FIGHTER_RADIUS = 6.15;

const DIFFICULTIES = {
  rookie: { pace: [17, 25], limit: [40, 46], weave: 0.53, rate: 1.3, lead: 0.31, aim: 14, armor: 0, lock: 0.70, lockAngle: 17, shields: 3 },
  standard: { pace: [24, 34], limit: [47, 56], weave: 0.75, rate: 1, lead: 0.45, aim: 11, armor: 1, lock: 0.91, lockAngle: 14, shields: 3 },
  ace: { pace: [35, 46], limit: [53, 67], weave: 1.08, rate: 0.76, lead: 0.62, aim: 8, armor: 1, lock: 1.10, lockAngle: 11, shields: 3 }
};

export function getDifficulty(name) {
  return Object.hasOwn(DIFFICULTIES, name) ? DIFFICULTIES[name] : DIFFICULTIES.rookie;
}

export function createPatrol(models, rocks, tuning, silhouette = 1, fleet = false, trench = false) {
  const formations = fleet ? FLEET_FORMATIONS : FORMATIONS;
  const total = formations.reduce((count, formation) => count + formation.length, 0);
  const enemies = models.map((model, slot) => ({
    model, slot, silhouette, position: model.position, velocity: new THREE.Vector3(), heading: new THREE.Vector3(),
    turn: new THREE.Quaternion(), hits: 0, armor: 0, cooldown: 0, charging: 0, age: 0, batch: 0, member: 0,
    flight: "flank", flightAge: 0, aimPoint: new THREE.Vector3(), framePosition: new THREE.Vector3(), tailing: false,
    jump: { active: false, age: 0, origin: new THREE.Vector3(), tail: new THREE.Vector3() }
  }));
  const toward = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const lookAhead = new THREE.Vector3();
  const pilotForward = new THREE.Vector3();
  const pilotRight = new THREE.Vector3();
  const station = new THREE.Vector3();
  const relative = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const rotation = new THREE.Quaternion();
  let batch;
  let ordered;
  let nextJump;
  let elapsed;
  let remaining;
  let defeated;
  let pursuer;

  function sendBatch() {
    batch++;
    ordered = 0;
    nextJump = elapsed;
  }

  function reset() {
    batch = -1;
    elapsed = remaining = defeated = 0;
    pursuer = undefined;
    for (const enemy of enemies) {
      enemy.model.visible = enemy.jump.active = false;
      enemy.charging = 0;
      enemy.tailing = false;
    }
    sendBatch();
  }

  function pickDestination(enemy, origin, orientation, lane) {
    const [x, y, z] = lane;
    for (const [dx, dy] of SPAWN_ALTERNATES) {
      enemy.position.set(x + dx, y + dy, z).applyQuaternion(orientation).add(origin);
      if (trench) enemy.position.y = Math.max(18, Math.min(160, enemy.position.y));
      const blocked = rocks.some((rock) => enemy.position.distanceToSquared(rock.position) < (rock.radius + 22) ** 2);
      const crowded = enemies.some((other) => other !== enemy && (other.model.visible || other.jump.active)
        && enemy.position.distanceToSquared(other.position) < 45 ** 2);
      if (!blocked && !crowded) return;
    }
    // In a crowded asteroid dive, move the approach above the local debris.
    for (const rock of rocks) {
      const clearance = rock.radius + 24;
      if (enemy.position.distanceToSquared(rock.position) < clearance ** 2) enemy.position.y = rock.position.y + clearance;
    }
  }

  function beginJump(enemy, origin, orientation, member) {
    const { model, jump, heading } = enemy;
    const lane = formations[batch][member];
    pickDestination(enemy, origin, orientation, lane);
    jump.origin.copy(enemy.position);
    const sweep = Math.sign(lane[0]) || (batch % 2 ? -1 : 1);
    jump.tail.set(sweep * 262, 108 + 20 * member, -360).applyQuaternion(orientation).add(jump.origin);
    jump.age = 0;
    jump.active = true;
    heading.copy(origin).sub(enemy.position).normalize();
    // Face along the exit trail at reveal; the normal flight update banks toward the player.
    desired.copy(jump.origin).sub(jump.tail).normalize();
    model.quaternion.setFromUnitVectors(FORWARD, desired);
    enemy.velocity.set(0, 0, 0);
    enemy.batch = batch;
    enemy.member = member;
    enemy.age = enemy.hits = enemy.charging = 0;
    enemy.flight = "flank";
    enemy.flightAge = 0;
    enemy.tailing = false;
    enemy.armor = 2 + tuning.armor + Number(batch > 0 && member !== 1);
    enemy.cooldown = (2.25 + member * 0.76) * tuning.rate;
  }

  function joinBattle(ship, orientation) {
    for (let i = 0; i < formations[0].length; i++) {
      const enemy = enemies[i];
      beginJump(enemy, ship.position, orientation, ordered++);
      enemy.heading.copy(ship.position).sub(enemy.position).normalize();
      enemy.model.quaternion.setFromUnitVectors(FORWARD, enemy.heading);
      enemy.jump.active = false;
      enemy.model.visible = true;
      remaining++;
    }
    nextJump = elapsed + .5;
  }

  function hit(enemy) {
    if (!enemy.model.visible) return false;
    if (++enemy.hits < enemy.armor) return false;
    enemy.model.visible = false;
    enemy.charging = 0;
    remaining--;
    defeated++;
    return true;
  }

  function update(dt, ship, orientation, playerVelocity, fire) {
    elapsed += dt;
    for (const enemy of enemies) {
      const { jump } = enemy;
      if (!jump.active) continue;
      const before = jump.age;
      jump.age += dt;
      if (before < JUMP_SECONDS && jump.age >= JUMP_SECONDS) {
        enemy.model.visible = true;
        remaining++;
      }
      if (jump.age >= JUMP_SECONDS + JUMP_AFTERGLOW) jump.active = false;
    }
    let regroup = false;
    // Only count enemies that have arrived. A gap during an incoming group cannot trigger the next group.
    const landing = enemies.some(({ jump }) => jump.active && jump.age < JUMP_SECONDS);
    const nextGroupReady = fleet ? (batch === 0 ? defeated >= 4 : remaining <= 2) : remaining <= 1;
    if (!trench && batch < formations.length - 1 && ordered === formations[batch].length && !landing && nextGroupReady) {
      sendBatch();
      regroup = batch === 1;
    }
    if (ordered < formations[batch].length && elapsed + 1e-8 >= nextJump) {
      const slot = enemies.find(({ model, jump }) => !model.visible && !jump.active);
      if (slot) {
        beginJump(slot, ship.position, orientation, ordered++);
        nextJump = elapsed + STAGGER;
      }
    }
    // Continuous interceptors, with fewer replacements once the trench run starts.
    if (trench && ordered === formations[batch].length && !landing && defeated > 0 && remaining < (defeated < 8 ? 4 : 2) && elapsed >= nextJump + .9) {
      const slot = enemies.find(({ model, jump }) => !model.visible && !jump.active);
      if (slot) {
        beginJump(slot, ship.position, orientation, defeated % formations[0].length);
        nextJump = elapsed + .65;
      }
    }
    const active = enemies.filter(({ model }) => model.visible);
    pilotForward.copy(FORWARD).applyQuaternion(orientation);
    pilotForward.y = 0;
    if (pilotForward.lengthSq() < .027) pilotForward.set(0, 0, -1);
    pilotForward.normalize();
    pilotRight.crossVectors(pilotForward, UP).normalize();
    // Keep the assignment stable until that opponent is knocked out.
    if (!pursuer?.model.visible) pursuer = active.reduce((best, candidate) => {
      if (!best) return candidate;
      const behind = relative.copy(candidate.position).sub(ship.position).dot(pilotForward);
      return behind < relative.copy(best.position).sub(ship.position).dot(pilotForward) ? candidate : best;
    }, undefined);
    for (const enemy of active) enemy.framePosition.copy(enemy.position);
    for (const enemy of active) {
      const { member, batch: rank, model, position, heading, velocity } = enemy;
      enemy.age += dt;
      enemy.flightAge += dt;
      toward.copy(ship.position).sub(position);
      const distance = toward.length();
      toward.divideScalar(distance || 1);
      const difficultyRamp = trench ? Math.min(1, .35 + defeated * .075) : rank / (formations.length - 1);
      const phase = enemy.age * .79 + enemy.slot * 2.4;
      const [lateral, height, fore] = ATTACK_LANES[enemy.slot % ATTACK_LANES.length];
      const side = Math.sign(lateral);
      const axis = relative.copy(position).sub(ship.position).dot(pilotForward);
      const cross = relative.dot(pilotRight);
      const isTail = enemy === pursuer;
      if (enemy.tailing !== isTail) {
        enemy.tailing = isTail;
        enemy.flight = "flank";
        enemy.flightAge = 0;
      }
      if (isTail) {
        station.copy(ship.position).addScaledVector(pilotForward, -126).addScaledVector(pilotRight, Math.sin(phase) * 24);
        station.y += 14 + Math.cos(phase) * 11;
        if (axis > -50 && distance < 170) station.addScaledVector(pilotRight, 58 * side);
        desired.copy(station).sub(position).normalize();
      } else {
        if (enemy.flight === "flank") {
          station.copy(ship.position).addScaledVector(pilotRight, lateral + side * (Math.sin(phase) * 22))
            .addScaledVector(pilotForward, fore).addScaledVector(UP, height + Math.cos(phase * .77) * 24);
          if (trench) station.y = Math.max(23, Math.min(156, station.y));
          desired.copy(station).sub(position).normalize();
          const setUp = Math.abs(cross) > 60 || axis > 105 || Math.abs(relative.y) > 80;
          if (setUp && enemy.flightAge > 1.25 + (enemy.slot % 4) * .46 && distance < 360
            && (station.distanceToSquared(position) < 127 ** 2 || enemy.flightAge > 4.2 + (enemy.slot % 3) * .38)) {
            enemy.flight = "pass";
            enemy.flightAge = 0;
            // A fixed intercept point makes a real crossing pass instead of steering every fighter at the hull.
            enemy.aimPoint.copy(ship.position).addScaledVector(playerVelocity, .76)
              .addScaledVector(pilotRight, -(Math.abs(cross) > 45 ? Math.sign(cross) : side) * 47)
              .addScaledVector(UP, height > 80 ? -9 : 17);
            if (trench) enemy.aimPoint.y = Math.max(18, enemy.aimPoint.y);
          }
        }
        if (enemy.flight === "pass") {
          desired.copy(enemy.aimPoint).sub(position).normalize();
          if (distance < 58 || enemy.flightAge > 2.5 || desired.dot(heading) < -.41) {
            enemy.flight = "break";
            enemy.flightAge = 0;
          }
        }
        if (enemy.flight === "break") {
          desired.copy(relative).normalize().multiplyScalar(.55).addScaledVector(pilotRight, (Math.abs(cross) > 30 ? Math.sign(cross) : side) * .9)
            .addScaledVector(pilotForward, .21).addScaledVector(UP, height >= 0 ? .23 : -.16);
          if (enemy.flightAge > 1.25 + (enemy.slot % 3) * .28) { enemy.flight = "flank"; enemy.flightAge = 0; }
        }
        // A flanker who gets left behind banks out of the chase corridor before closing again.
        if (axis < -42 && Math.abs(cross) < 87) desired.addScaledVector(pilotRight, side * (1.05 + (87 - Math.abs(cross)) / 100));
      }
      for (const other of active) {
        if (other === enemy) continue;
        offset.copy(enemy.framePosition).sub(other.framePosition);
        const gap = offset.length();
        if (gap < 88 && gap > .001) desired.addScaledVector(offset, 2.45 * (1 - gap / 88) / gap);
      }
      if (trench && position.y < 25) desired.y += .94;
      lookAhead.copy(position).addScaledVector(heading, 31);
      for (const rock of rocks) {
        const radius = rock.radius + 10;
        if (lookAhead.distanceToSquared(rock.position) < radius ** 2) {
          desired.add(offset.copy(lookAhead).sub(rock.position).normalize().multiplyScalar(2.1));
        }
      }
      if (desired.lengthSq() > 0.0001) {
        turn.setFromUnitVectors(heading, desired.normalize());
        rotation.identity().slerp(turn, 1 - Math.exp(-dt * 2.5));
        heading.applyQuaternion(rotation).normalize();
      }
      const pace = THREE.MathUtils.lerp(...tuning.pace, difficultyRamp) + (member % 4) * 2.6;
      const cap = THREE.MathUtils.lerp(...tuning.limit, difficultyRamp);
      // Extra cruise keeps a moving pilot in reach without matching boost speed.
      const catchup = Math.max(0, distance - (isTail ? 117 : 190)) * .16;
      const cruise = cap + (trench ? 8 : 7) + (distance > 200 ? 12 : 0);
      const driftCompensation = playerVelocity.length() * (isTail ? .64 : enemy.flight === "flank" ? .53 : 0);
      const runSpeed = pace + (enemy.flight === "pass" && !isTail ? 9 : 0) + Math.min(36, driftCompensation);
      velocity.copy(heading).multiplyScalar(Math.min(cruise, runSpeed + catchup));
      position.addScaledVector(velocity, dt);
      if (trench) position.y = Math.max(10, position.y);
      enemy.turn.setFromUnitVectors(FORWARD, heading);
      model.quaternion.slerp(enemy.turn, 1 - Math.exp(-dt * 7));

      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      if (enemy.charging > 0) {
        enemy.charging -= dt;
        if (enemy.charging <= 0) {
          enemy.charging = 0;
          enemy.cooldown = (4.35 - difficultyRamp * 1.35 + member * 0.31) * tuning.rate;
          if (distance > 27 && distance < 290 && heading.dot(toward) > 0.68) {
            // Partial lead makes straight flight risky while leaving time to bank or boost.
            desired.copy(ship.position).addScaledVector(playerVelocity, Math.min(distance / 220, 1) * tuning.lead);
            fire(enemy, desired);
          }
        }
      } else if (!enemy.cooldown && (isTail || enemy.flight !== "break") && distance > 52 && distance < 258 && heading.dot(toward) > 0.76) {
        enemy.charging = CHARGE_TIME;
      }
    }
    return regroup;
  }

  return {
    enemies, reset, joinBattle, hit, update,
    get batch() { return batch; },
    get remaining() { return remaining; },
    get defeated() { return defeated; },
    total: trench ? 8 : total,
    get inbound() { return ordered < formations[batch].length || enemies.some(({ jump }) => jump.active && jump.age < JUMP_SECONDS); },
    get complete() { return trench ? defeated >= 8 : defeated === total; }
  };
}
