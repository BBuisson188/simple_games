import * as THREE from "three";

const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const WARP_TIME = 1.38;
const GUN_CHARGE = 0.94;

export const LOCK_RANGE = 345;

export function createCarrier(view, tuning, center) {
  const { root, hull, portLight, warp, warpLight, rim } = view;
  const arrivalBank = new THREE.Quaternion().setFromEuler(new THREE.Euler(...view.tilt));
  const hullPieces = view.hullPieces.map(([center, dimensions, angle]) => {
    const half = new THREE.Vector3(...dimensions).multiplyScalar(0.5);
    const rotation = new THREE.Quaternion().setFromAxisAngle(UP, angle);
    return { center: new THREE.Vector3(...center), bounds: new THREE.Box3(half.clone().negate(), half),
      rotation, inverse: rotation.clone().invert() };
  });
  const anchor = new THREE.Vector3();
  const side = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const inverse = new THREE.Quaternion();
  const between = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const displaced = new THREE.Vector3();
  const impact = new THREE.Vector3();
  const orientation = new THREE.Matrix4();
  const ray = new THREE.Ray();
  const localRay = new THREE.Ray();
  const localPoint = new THREE.Vector3();
  const box = new THREE.Box3();
  const velocity = new THREE.Vector3();
  const port = { kind: "port", model: root, position: new THREE.Vector3(), velocity, radius: 6.8 * (view.hullScale ?? 1) };
  const guns = view.guns.map((gun) => ({
    ...gun, kind: "gun", model: gun.body, position: new THREE.Vector3(), velocity,
    hits: 0, armor: 3 + tuning.armor, radius: 6.6 * (view.hullScale ?? 1), timer: 0, charging: 0
  }));
  let phase = "idle";
  let age = 0;
  let tremor = 0;

  function reset() {
    phase = "idle";
    root.visible = warp.visible = false;
    hull.visible = true;
    hull.position.set(0, 0, 0);
    hull.quaternion.identity();
    view.breakup?.reset();
    portLight.visible = true;
    portLight.scale.setScalar(1);
    velocity.set(0, 0, 0);
    guns.forEach((gun, index) => {
      gun.timer = 1.75 + index * (guns.length === 4 ? .19 : 1.75);
      gun.hits = gun.charging = 0;
      gun.barrage = 0;
      gun.body.visible = true;
      gun.muzzle.visible = false;
      gun.body.quaternion.identity();
    });
  }

  function start(shipPosition, facing) {
    reset();
    phase = "arriving";
    age = 0;
    anchor.copy(FORWARD).applyQuaternion(facing).multiplyScalar(455).add(shipPosition);
    between.copy(anchor).sub(center);
    if (between.length() > 910) anchor.copy(between.setLength(910)).add(center);
    anchor.y = Math.max(anchor.y, 63);
    if (anchor.distanceTo(shipPosition) < 265) {
      anchor.copy(shipPosition).lerp(center, 0.48);
      anchor.y = Math.max(anchor.y, 63);
    }
    root.position.copy(anchor);
    orientation.lookAt(anchor, shipPosition, UP);
    root.quaternion.setFromRotationMatrix(orientation).multiply(arrivalBank);
    inverse.copy(root.quaternion).invert();
    side.set(1, 0, 0).applyQuaternion(root.quaternion);
    normal.copy(FORWARD).applyQuaternion(root.quaternion);
    root.visible = warp.visible = true;
    hull.visible = false;
  }

  function frontFacing(point) {
    return between.copy(point).sub(port.position).normalize().dot(normal) > 0.31;
  }

  function update(dt, ship, playerVelocity, fire, burst) {
    age += dt;
    if (phase === "arriving") {
      const t = Math.min(1, age / WARP_TIME);
      warpLight.opacity = Math.sin(t * Math.PI) * 0.88;
      rim.scale.setScalar(0.26 + t * 1.12);
      hull.visible = t >= 0.33;
      hull.position.z = 670 * Math.pow(1 - t, 4);
      if (t === 1) {
        warp.visible = false;
        phase = "active";
        age = 0;
      }
    } else if (phase === "crashing") {
      if (view.breakup ? view.breakup.draw(age, burst) : age > 2.9) {
        root.visible = false;
        phase = "defeated";
      }
      if (view.breakup) return;
      if (!root.visible) return;
      hull.rotation.y += dt * 0.16;
      hull.position.y -= dt * 5;
      if (age >= tremor) {
        tremor += 0.36;
        displaced.set(Math.sin(tremor * 11) * 35, 7, Math.cos(tremor * 5) * 35)
          .applyQuaternion(root.quaternion).add(root.position);
        burst(displaced, 72);
      }
    }
    if (phase !== "active") return;
    const frequency = 0.28 / Math.sqrt(tuning.rate);
    root.position.copy(anchor).addScaledVector(side, Math.sin(age * frequency) * 28);
    velocity.copy(side).multiplyScalar(Math.cos(age * frequency) * frequency * 28);
    port.position.copy(view.port).applyQuaternion(root.quaternion).add(root.position);
    portLight.scale.setScalar(0.94 + 0.09 * Math.sin(age * 5.2));
    for (const gun of guns) {
      if (!gun.body.visible) continue;
      gun.position.copy(gun.mount).applyQuaternion(root.quaternion).add(root.position);
      between.copy(ship.position).sub(gun.position);
      const distance = between.length();
      desired.copy(between).normalize().applyQuaternion(inverse);
      gun.body.quaternion.setFromUnitVectors(FORWARD, desired);
      if (gun.charging > 0) {
        gun.charging = Math.max(0, gun.charging - dt);
        if (!gun.charging) {
          gun.timer = 4.1 * tuning.rate;
          if (distance > 32 && distance < 367) {
            desired.copy(ship.position).addScaledVector(playerVelocity, Math.min(distance / 207, 1.25) * tuning.lead);
            fire(gun, desired, 8, 200);
          }
        }
      } else {
        gun.timer = Math.max(0, gun.timer - dt);
        if (!gun.timer && distance > 55 && distance < 355 && between.normalize().dot(normal) > -0.21) gun.charging = GUN_CHARGE;
      }
      gun.barrage = Math.max(0, gun.barrage - dt);
      gun.muzzle.visible = gun.charging > 0 || gun.barrage > 0;
      if (gun.muzzle.visible) gun.muzzle.scale.setScalar(6 + 27 * (1 - gun.charging / GUN_CHARGE));
    }
  }

  function hitGun(gun) {
    if (!gun.body.visible || ++gun.hits < gun.armor) return false;
    gun.body.visible = false;
    gun.charging = 0;
    return true;
  }

  function defeat() {
    if (phase !== "active") return;
    phase = "crashing";
    age = 0;
    tremor = 0.2;
    for (const gun of guns) {
      gun.charging = 0;
      gun.muzzle.visible = false;
    }
    portLight.scale.setScalar(0);
    view.breakup?.start();
  }

  function distanceToHull(source) {
    if (phase !== "active") return Infinity;
    ray.origin.copy(source.origin).sub(root.position).applyQuaternion(inverse);
    ray.direction.copy(source.direction).applyQuaternion(inverse);
    let closest = Infinity;
    for (const piece of hullPieces) {
      localRay.origin.copy(ray.origin).sub(piece.center).applyQuaternion(piece.inverse);
      localRay.direction.copy(ray.direction).applyQuaternion(piece.inverse);
      if (piece.bounds.containsPoint(localRay.origin)) return 0;
      if (localRay.intersectBox(piece.bounds, impact)) closest = Math.min(closest, impact.distanceTo(localRay.origin));
    }
    return closest;
  }

  function separateShip(position) {
    if (phase !== "active") return false;
    displaced.copy(position).sub(root.position).applyQuaternion(inverse);
    for (const piece of hullPieces) {
      box.copy(piece.bounds).expandByScalar(2.8);
      localPoint.copy(displaced).sub(piece.center).applyQuaternion(piece.inverse);
      if (!box.containsPoint(localPoint)) continue;
      let closest = Infinity;
      let axis;
      let edge;
      for (const key of ["x", "y", "z"]) {
        for (const bound of ["min", "max"]) {
          const d = Math.abs(localPoint[key] - box[bound][key]);
          if (d >= closest) continue;
          closest = d;
          axis = key;
          edge = box[bound][key] + (bound === "min" ? -0.4 : 0.4);
        }
      }
      localPoint[axis] = edge;
      position.copy(localPoint).applyQuaternion(piece.rotation).add(piece.center).applyQuaternion(root.quaternion).add(root.position);
      return true;
    }
    return false;
  }

  return { name: view.name, subject: root.position, guns, port, reset, start, update, hitGun, defeat, frontFacing, distanceToHull, separateShip,
    get phase() { return phase; }
  };
}
