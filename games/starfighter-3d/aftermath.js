import * as THREE from "three";

export function createBlastPool(scene, texture) {
  const slots = Array.from({ length: 13 }, () => {
    const bloom = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#ffbf79", blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, toneMapped: false }));
    const core = bloom.clone();
    core.material = bloom.material.clone();
    core.material.color.set("#fff2c5");
    scene.add(bloom, core);
    bloom.visible = core.visible = false;
    return { bloom, core, born: -10, size: 0 };
  });
  let cursor = 0;
  return {
    reset() { cursor = 0; slots.forEach(({ bloom, core }) => { bloom.visible = core.visible = false; }); },
    pop(point, size, time) {
      const slot = slots[cursor++ % slots.length];
      slot.born = time;
      slot.size = size;
      slot.bloom.position.copy(point);
      slot.core.position.copy(point);
      slot.bloom.visible = slot.core.visible = true;
    },
    draw(time) {
      for (const slot of slots) {
        if (!slot.bloom.visible) continue;
        const t = (time - slot.born) / 1.45;
        if (t >= 1) { slot.bloom.visible = slot.core.visible = false; continue; }
        slot.bloom.scale.setScalar(slot.size * (.32 + t * 1.36));
        slot.bloom.material.opacity = Math.max(0, (1 - t) ** 1.65) * .92;
        slot.core.scale.setScalar(slot.size * (.28 + t * .27));
        slot.core.material.opacity = Math.max(0, 1 - t * 5.7);
      }
    }
  };
}

export function splitArmor(armor) {
  const groups = Array.from({ length: 5 }, () => new THREE.Group());
  const anchors = groups.map(() => new THREE.Vector3());
  const weights = groups.map(() => 0);
  for (const source of armor.children) {
    const pos = source.geometry.attributes.position;
    const normals = source.geometry.attributes.normal;
    const points = groups.map(() => []);
    const axes = groups.map(() => []);
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const k = z > 27 ? 4 : x < -17 ? 1 : x > 17 ? 2 : z < -18 ? 0 : 3;
      for (let j = i; j < i + 3; j++) {
        points[k].push(pos.getX(j), pos.getY(j), pos.getZ(j));
        axes[k].push(normals.getX(j), normals.getY(j), normals.getZ(j));
      }
      anchors[k].x += x; anchors[k].z += z; weights[k]++;
    }
    for (let i = 0; i < groups.length; i++) {
      if (!points[i].length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(points[i], 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(axes[i], 3));
      groups[i].add(new THREE.Mesh(geo, source.material));
    }
  }
  return groups.map((group, i) => {
    const anchor = anchors[i].divideScalar(weights[i] || 1);
    for (const part of group.children) part.position.copy(anchor).negate();
    group.visible = false;
    group.position.copy(anchor);
    return { group, anchor };
  });
}

export function createFlyaway(ship, camera) {
  const destination = new THREE.Vector3();
  const starting = new THREE.Vector3();
  const point = new THREE.Vector3();
  const fromCamera = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const side = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const shot = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const nose = new THREE.Vector3(0, 0, -1);
  const startingAim = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const fromRotation = new THREE.Quaternion();
  let duration, age, surfaceRun;
  function start(subject, seconds, trench) {
    point.copy(subject);
    surfaceRun = trench;
    age = 0; duration = seconds;
    starting.copy(ship.position);
    fromCamera.copy(camera.position);
    startingAim.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(80).add(fromCamera);
    fromRotation.copy(ship.quaternion);
    forward.subVectors(subject, starting);
    forward.y = 0;
    if (forward.lengthSq() < 1) forward.set(0, 0, -1);
    forward.normalize();
    side.crossVectors(forward, up).normalize();
    destination.copy(starting).addScaledVector(forward, trench ? 330 : 125).addScaledVector(side, trench ? 139 : 178);
    destination.y += trench ? 112 : 67;
  }
  function update(dt) {
    age = Math.min(duration, age + dt);
    const t = age / duration;
    const bank = Math.min(1, t * 3.2);
    ship.position.copy(starting).lerp(destination, t * .77 + t * t * .23);
    ship.position.addScaledVector(side, -16 * Math.sin(t * Math.PI));
    tangent.subVectors(destination, starting).addScaledVector(side, -50 * Math.cos(t * Math.PI)).normalize();
    ship.quaternion.copy(fromRotation).slerp(turn.setFromUnitVectors(nose, tangent), bank);
    ship.quaternion.multiply(turn.setFromAxisAngle(nose, -.34 * Math.sin(bank * Math.PI * .8)));
    const blend = THREE.MathUtils.smoothstep(age, 0, 1.05);
    if (surfaceRun && age >= 4.35) {
      // Reverse to the escape angle at the orbital cut; keep the fighter in the wide shot.
      shot.copy(ship.position).addScaledVector(tangent, -64).addScaledVector(side, -28);
      shot.y += 14;
      mid.copy(ship.position).addScaledVector(tangent, 84).addScaledVector(side, 31);
    } else if (surfaceRun) {
      shot.copy(ship.position).addScaledVector(side, -45 - t * 30).addScaledVector(forward, -86 - t * 25);
      shot.y = Math.max(27, shot.y + 35 + t * 18);
      mid.copy(point).lerp(ship.position, .60);
    } else {
      // Track the fighter in the foreground, with the burning capital ship behind its breakaway.
      shot.copy(ship.position).addScaledVector(forward, -112 - t * 37).addScaledVector(side, -72 - t * 31);
      shot.y += 25 + t * 41;
      mid.copy(point).sub(shot).normalize();
      focus.copy(ship.position).sub(shot).normalize();
      mid.lerp(focus, .51).normalize().multiplyScalar(160).add(shot);
    }
    camera.position.copy(fromCamera).lerp(shot, blend);
    camera.up.copy(up);
    camera.lookAt(focus.copy(startingAim).lerp(mid, blend));
    camera.fov = THREE.MathUtils.lerp(61, 72, blend);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return t;
  }
  return { start, update, get age() { return age; } };
}
