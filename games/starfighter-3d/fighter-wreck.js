import * as THREE from "three";
import { createBlastPool } from "./aftermath.js";

export const WRECK_DURATION = 3.85;
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, -1);

// Preserve the real fighter's painted surfaces and cockpit when its airframe comes apart.
function cutFighter(ship, fighter) {
  ship.updateMatrixWorld(true);
  const toShip = ship.matrixWorld.clone().invert();
  const groups = Array.from({ length: 7 }, () => new THREE.Group());
  const centers = groups.map(() => new THREE.Vector3());
  const totals = groups.map(() => 0);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), sum = new THREE.Vector3();
  fighter.traverse((mesh) => {
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const { geometry } = mesh;
    const matrix = new THREE.Matrix4().multiplyMatrices(toShip, mesh.matrixWorld);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const buckets = groups.map(() => ({ points: [], normals: [], uv: [] }));
    const corners = Array.from({ length: 3 }, () => new THREE.Vector3());
    const indices = [0, 0, 0];
    for (let i = 0, count = geometry.index?.count ?? positions.count; i < count; i += 3) {
      sum.set(0, 0, 0);
      for (let j = 0; j < 3; j++) {
        const index = geometry.index?.getX(i + j) ?? i + j;
        indices[j] = index;
        corners[j].set(positions.getX(index), positions.getY(index), positions.getZ(index)).applyMatrix4(matrix);
        sum.add(corners[j]);
      }
      sum.multiplyScalar(1 / 3);
      const part = Math.abs(sum.x) > 2.0 ? (sum.x < 0 ? 0 : 2) + Number(sum.y < -.42) : sum.z < -1.55 ? 4 : sum.z > 1.72 ? 5 : 6;
      centers[part].add(sum);
      totals[part]++;
      const bucket = buckets[part];
      corners.forEach((corner, j) => {
        const index = indices[j];
        bucket.points.push(corner.x, corner.y, corner.z);
        if (normals) {
          n.set(normals.getX(index), normals.getY(index), normals.getZ(index)).applyNormalMatrix(normalMatrix);
          bucket.normals.push(n.x, n.y, n.z);
        }
        if (uv) bucket.uv.push(uv.getX(index), uv.getY(index));
      });
    }
    for (const [i, bucket] of buckets.entries()) {
      if (!bucket.points.length) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(bucket.points, 3));
      if (bucket.normals.length) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(bucket.normals, 3));
      else geometry.computeVertexNormals();
      if (bucket.uv.length) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(bucket.uv, 2));
      groups[i].add(new THREE.Mesh(geometry, mesh.material));
    }
  });
  return groups.flatMap((group, i) => {
    if (!totals[i]) return [];
    const center = centers[i].divideScalar(totals[i]);
    for (const child of group.children) child.position.copy(center).negate();
    const side = Math.sign(center.x) || (i % 2 ? -1 : 1);
    return [{ group, center, delay: [.79, 1.08, .93, 1.25, 1.48, 1.68, 1.66][i],
      velocity: p.set(side * (i < 4 ? 8 + i * 2 : 3), (i % 2 ? -1 : 1) * (2 + i * .7), i === 4 ? -12 : 5 + i * 1.27).clone() }];
  });
}

export function createFighterWreck(scene, ship, fighter, camera, texture) {
  const root = new THREE.Group();
  const parts = cutFighter(ship, fighter);
  root.add(...parts.map(({ group }) => group));
  scene.add(root);
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#ff9a50", depthWrite: false,
    transparent: true, toneMapped: false, blending: THREE.AdditiveBlending }));
  scene.add(fire);
  const blasts = createBlastPool(scene, texture);
  const boltGeometry = new THREE.CylinderGeometry(.12, .24, 6.7, 6);
  const boltMaterial = new THREE.MeshBasicMaterial({ color: "#ff6654", toneMapped: false, fog: false });
  const volleys = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(boltGeometry, boltMaterial);
    scene.add(mesh);
    return { mesh, launch: -9, origin: new THREE.Vector3() };
  });
  const start = new THREE.Vector3(), drift = new THREE.Vector3(), toward = new THREE.Vector3(), side = new THREE.Vector3();
  const up = new THREE.Vector3(), victimUp = new THREE.Vector3(), firstCamera = new THREE.Vector3(), firstLook = new THREE.Vector3();
  const eye = new THREE.Vector3(), focus = new THREE.Vector3(), direction = new THREE.Vector3(), origin = new THREE.Vector3();
  const initialRotation = new THREE.Quaternion(), tumble = new THREE.Quaternion(), angles = new THREE.Euler();
  let age = 0, beat = 0, attacker = null, replacedModel = null, staticGun = null, staticOrigin = null, deck = false;
  const followUps = [.58, 1.18, 1.84];

  function reset() {
    root.visible = fire.visible = false;
    blasts.reset();
    for (const { mesh } of volleys) mesh.visible = false;
    if (attacker) scene.remove(attacker);
    if (replacedModel) replacedModel.visible = true;
    attacker = replacedModel = staticGun = staticOrigin = null;
  }

  function begin(hit, nearDeck) {
    reset();
    age = beat = 0;
    deck = nearDeck;
    start.copy(ship.position);
    initialRotation.copy(ship.quaternion);
    firstCamera.copy(camera.position);
    firstLook.copy(FORWARD).applyQuaternion(camera.quaternion).multiplyScalar(15).add(firstCamera);
    drift.copy(FORWARD).applyQuaternion(initialRotation).multiplyScalar(16);
    if (deck) drift.y = Math.max(0, drift.y * .4);
    const enemy = hit?.enemy;
    const hull = enemy?.model?.userData.silhouettes?.[enemy.silhouette];
    if (hull) {
      attacker = hull.clone();
      attacker.visible = true;
      if (enemy.model.visible) { replacedModel = enemy.model; replacedModel.visible = false; }
      const separation = enemy.position.distanceTo(start);
      toward.copy(separation > 9 && separation < 240 ? enemy.position : hit.origin).sub(start).normalize();
      scene.add(attacker);
    } else if (enemy?.kind === "gun") {
      staticGun = enemy.model?.visible ? enemy : null;
      staticOrigin = hit.origin.clone();
      toward.copy(staticOrigin).sub(start).normalize();
    } else {
      toward.copy(FORWARD).applyQuaternion(initialRotation).negate();
    }
    if (toward.lengthSq() < .1) toward.set(0, .1, 1).normalize();
    side.crossVectors(toward, UP);
    if (side.lengthSq() < .04) side.set(1, 0, 0);
    side.normalize();
    victimUp.crossVectors(side, toward).normalize();
    up.copy(deck ? UP : victimUp);
    fire.visible = true;
    blasts.pop(start, 12.4, 0);
  }

  function update(dt, burst) {
    const previous = age;
    age = Math.min(WRECK_DURATION, age + dt);
    const fall = age * age * (deck ? .69 : 1.05);
    ship.position.copy(start).addScaledVector(drift, Math.min(2.3, age) - .09 * age * age).addScaledVector(UP, -fall);
    if (deck) ship.position.y = Math.max(Math.abs(ship.position.x) > 42 ? 2.9 : -43.2, ship.position.y);
    ship.quaternion.copy(initialRotation).multiply(tumble.setFromEuler(angles.set(-age * .20, age * .39, age * 1.38)));
    root.position.copy(ship.position);
    root.quaternion.copy(ship.quaternion);
    root.visible = age >= .72;
    ship.visible = !root.visible;
    for (const { group, center, delay, velocity } of parts) {
      const loose = Math.max(0, age - delay);
      group.position.copy(center).addScaledVector(velocity, loose);
      group.rotation.set(loose * velocity.y * .23, loose * velocity.x * .095, loose * .83);
    }
    fire.position.copy(ship.position).addScaledVector(drift, -.13);
    fire.scale.setScalar(11 + age * 3 + Math.sin(age * 26) * 2.2);
    fire.material.opacity = Math.min(.9, .43 + .20 * Math.sin(age * 17) + .38 * (1 - age / WRECK_DURATION));

    if (attacker) {
      const pass = Math.min(age, 2.3);
      attacker.position.copy(ship.position).addScaledVector(toward, 83 - pass * 18 - Math.max(0, age - 2.3) * 29)
        .addScaledVector(side, -15 + pass * 12 + Math.max(0, age - 2.3) * 36).addScaledVector(victimUp, 9 + age * 3.1);
      if (deck) attacker.position.y = Math.max(attacker.position.y, 11);
      attacker.lookAt(focus.copy(attacker.position).multiplyScalar(2).sub(ship.position).addScaledVector(side, -Math.max(0, age - 1.9) * 45));
    }
    followUps.forEach((moment, i) => {
      if (previous >= moment || age < moment || !(attacker || staticOrigin)) return;
      for (let wing = 0; wing < 2; wing++) {
        const shot = volleys[i * 2 + wing];
        shot.launch = age;
        shot.origin.copy(attacker?.position ?? staticOrigin).addScaledVector(side, wing === 0 ? -1.7 : 1.7);
        shot.mesh.visible = true;
      }
      if (staticGun?.muzzle) staticGun.muzzle.visible = true;
    });
    if (staticGun?.muzzle && !followUps.some((moment) => age >= moment && age < moment + .125)) staticGun.muzzle.visible = false;
    for (const shot of volleys) {
      if (!shot.mesh.visible) continue;
      const distance = direction.copy(ship.position).sub(shot.origin).length();
      direction.normalize();
      const travel = (age - shot.launch) * 485;
      if (travel >= distance) {
        shot.mesh.visible = false;
        blasts.pop(ship.position, 13 + age * 5, age);
        burst(ship.position, 24 + age * 9);
      } else {
        shot.mesh.position.copy(shot.origin).addScaledVector(direction, travel);
        shot.mesh.quaternion.setFromUnitVectors(UP, direction);
      }
    }
    const ruptures = [.22, .79, 1.34, 1.99, 2.39, 2.95];
    if (beat < ruptures.length && age >= ruptures[beat]) {
      origin.set((beat % 2 ? -1 : 1) * (1 + beat * .33), Math.sin(beat * 4) * 1.35, 1.5 - beat * .41)
        .applyQuaternion(ship.quaternion).add(ship.position);
      blasts.pop(origin, beat === 4 ? 37 : 14 + beat * 2.7, age);
      burst(origin, 30 + beat * 4);
      beat++;
    }
    blasts.draw(age);
    const blend = THREE.MathUtils.smoothstep(age, 0, .93);
    eye.copy(ship.position).addScaledVector(side, 25 + age * 2.5).addScaledVector(toward, -23 - age * 2.1)
      .addScaledVector(up, 9 + age * 1.5);
    if (deck) eye.y = Math.max(13, eye.y);
    focus.copy(ship.position);
    if (attacker) focus.lerp(attacker.position, .29 * (1 - THREE.MathUtils.smoothstep(age, 2.45, 3.58)));
    else if (staticOrigin) focus.addScaledVector(toward, 5);
    camera.position.copy(firstCamera).lerp(eye, blend);
    camera.up.copy(up);
    camera.lookAt(origin.copy(firstLook).lerp(focus, blend));
    camera.fov = 61 + 10 * blend;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return age >= WRECK_DURATION;
  }

  reset();
  return { begin, update, reset };
}
