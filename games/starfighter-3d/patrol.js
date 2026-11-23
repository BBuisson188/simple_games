import * as THREE from "three";

const FORWARD = new THREE.Vector3(0, 0, -1);
const FORMATIONS = [
  [[0, 0, -225], [-52, 20, -260], [59, 14, -280]],
  [[-25, 15, -208], [43, -21, -230], [64, 31, -285]]
];
export const CHARGE_TIME = 0.63;
export const WAVE_COUNT = FORMATIONS.length;

export function createPatrol(models, rocks) {
  const enemies = models.map((model, index) => ({
    model, index, position: model.position, velocity: new THREE.Vector3(), heading: new THREE.Vector3(),
    turn: new THREE.Quaternion(), hits: 0, armor: 0, cooldown: 0, charging: 0
  }));
  const toward = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const lookAhead = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const rotation = new THREE.Quaternion();
  let wave = 0;
  let elapsed = 0;
  let gap = 0;
  let remaining = 0;

  function spawn(origin, orientation) {
    wave++;
    elapsed = gap = 0;
    remaining = enemies.length;
    for (const enemy of enemies) {
      const { model, index, position, heading } = enemy;
      position.set(...FORMATIONS[wave - 1][index]).applyQuaternion(orientation).add(origin);
      for (const rock of rocks) {
        const radius = rock.radius + 10;
        if (position.distanceToSquared(rock.position) < radius ** 2) position.y = rock.position.y + radius;
      }
      heading.copy(origin).sub(position).normalize();
      model.quaternion.setFromUnitVectors(FORWARD, heading);
      enemy.velocity.set(0, 0, 0);
      enemy.armor = wave === 2 && index !== 1 ? 4 : 3;
      enemy.hits = enemy.charging = 0;
      enemy.cooldown = 2.25 + index * 0.8;
      model.visible = true;
    }
  }

  function reset(origin, orientation) {
    wave = 0;
    spawn(origin, orientation);
  }

  function hit(enemy) {
    if (++enemy.hits < enemy.armor) return false;
    enemy.model.visible = false;
    enemy.charging = 0;
    if (--remaining === 0 && wave < WAVE_COUNT) gap = 2.7;
    return true;
  }

  function update(dt, ship, orientation, playerVelocity, fire) {
    if (!remaining) {
      if (wave < WAVE_COUNT && (gap -= dt) <= 0) {
        spawn(ship.position, orientation);
        return true;
      }
      return false;
    }
    elapsed += dt;
    for (const enemy of enemies) {
      const { index, model, position, heading, velocity } = enemy;
      if (!model.visible) continue;
      toward.copy(ship.position).sub(position);
      const distance = toward.length();
      toward.divideScalar(distance || 1);
      const phase = elapsed * (wave === 1 ? 0.94 : 1.18) + index * 2.4;
      const shear = elapsed < 0.8 ? elapsed / 0.8 : 1;
      const evade = distance < 43 ? (43 - distance) / 43 : 0;
      desired.copy(toward).multiplyScalar(1 - evade * 2.6);
      // Wide, readable sweeps first; the interceptors close faster and weave harder.
      if (index !== 0 || wave > 1) {
        const strength = (wave === 1 ? 0.42 : 0.62) * shear;
        desired.add(offset.set(Math.sin(phase), Math.cos(phase * 0.91) * 0.65, Math.sin(phase * 0.64) * 0.4)
          .multiplyScalar(strength + evade));
      } else {
        desired.x += Math.sin(phase) * (0.13 * shear + evade);
        desired.y += 0.08 * Math.sin(phase * 0.82);
      }
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
      const pace = wave === 1 ? 29 + index * 4 : 44 + index * 5;
      velocity.copy(heading).multiplyScalar(pace + Math.max(0, distance - 190) * 0.46);
      position.addScaledVector(velocity, dt);
      enemy.turn.setFromUnitVectors(FORWARD, heading);
      model.quaternion.slerp(enemy.turn, 1 - Math.exp(-dt * 7));

      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      if (enemy.charging > 0) {
        enemy.charging -= dt;
        if (enemy.charging <= 0) {
          enemy.charging = 0;
          enemy.cooldown = (wave === 1 ? 4.35 : 3.0) + index * 0.31;
          if (distance > 27 && distance < 290 && heading.dot(toward) > 0.68) {
            // Partial lead makes straight flight risky while leaving time to bank or boost.
            desired.copy(ship.position).addScaledVector(playerVelocity, Math.min(distance / 220, 1) * 0.46);
            fire(enemy, desired);
          }
        }
      } else if (!enemy.cooldown && distance > 46 && distance < 244 && heading.dot(toward) > 0.8) {
        enemy.charging = CHARGE_TIME;
      }
    }
    return false;
  }

  return {
    enemies, reset, hit, update,
    get wave() { return wave; },
    get remaining() { return remaining; },
    get complete() { return wave === WAVE_COUNT && !remaining; }
  };
}
