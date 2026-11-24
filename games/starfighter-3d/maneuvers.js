import * as THREE from "three";

const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const COOLDOWN = 6;
const ease = (t) => t * t * (3 - 2 * t);

export function levelAttitude(heading, attitude) {
  // Project the heading into the plane of the station deck (world up in open space).
  return attitude.setFromAxisAngle(UP, Math.atan2(-heading.x, -heading.z));
}

export function createManeuver(fighter) {
  const loop = fighter === "rebel";
  const duration = loop ? 1.12 : 0.58;
  const startRotation = new THREE.Quaternion();
  const level = new THREE.Quaternion();
  const axis = new THREE.Quaternion();
  const camera = new THREE.Quaternion();
  const heading = new THREE.Vector3();
  let elapsed = duration;
  let cooldown = 0;
  let side = 1;
  let bank = 0;

  return {
    name: loop ? "Half-loop" : "Snap Turn",
    loop,
    camera,
    speed: loop ? 54 : 29,
    get active() { return elapsed < duration; },
    get cooldown() { return cooldown; },
    get bank() { return bank; },
    start(rotation, direction) {
      if (elapsed < duration || cooldown > 0) return false;
      side = direction < 0 ? -1 : 1;
      startRotation.copy(rotation);
      camera.copy(rotation);
      heading.copy(FORWARD).applyQuaternion(rotation);
      heading.y = 0;
      if (heading.lengthSq() < 0.0001) heading.copy(FORWARD);
      levelAttitude(heading, level);
      elapsed = 0;
      return true;
    },
    step(dt, rotation) {
      if (elapsed >= duration) {
        cooldown = Math.max(0, cooldown - dt);
        return false;
      }
      elapsed = Math.min(duration, elapsed + dt);
      const t = elapsed / duration;
      const swing = ease(t);
      if (loop) {
        const pitch = Math.PI * swing;
        const roll = side * Math.PI * ease(THREE.MathUtils.clamp((t - .58) / .42, 0, 1));
        rotation.copy(startRotation).slerp(level, ease(Math.min(1, t / .24)));
        rotation.multiply(axis.setFromAxisAngle(RIGHT, pitch));
        rotation.multiply(axis.setFromAxisAngle(FORWARD, roll));
        // Follow the turn without making the horizon do the ship's loop and roll.
        camera.copy(startRotation).slerp(level, ease(Math.min(1, t / .24)));
        camera.premultiply(axis.setFromAxisAngle(UP, -side * Math.PI * swing));
        camera.multiply(axis.setFromAxisAngle(RIGHT, .23 * Math.sin(Math.PI * t)));
        bank = 0;
      } else {
        rotation.copy(startRotation).slerp(level, swing)
          .premultiply(axis.setFromAxisAngle(UP, -side * THREE.MathUtils.degToRad(110) * swing));
        camera.copy(rotation);
        bank = side * 1.15 * Math.sin(Math.PI * t);
      }
      if (elapsed === duration) {
        cooldown = COOLDOWN;
        bank = 0;
      }
      return true;
    },
    reset() {
      elapsed = duration;
      cooldown = bank = 0;
    }
  };
}
