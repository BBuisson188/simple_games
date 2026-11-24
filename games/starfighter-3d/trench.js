import * as THREE from "three";
import { armor, glow, makeCraftBatch, plateFinish } from "./craft-geometry.js";
import { createBlastPool } from "./aftermath.js";

export const TRENCH_HALF = 43;
export const TRENCH_FLOOR = -47;
export const TRENCH_QUOTA = 8;
export const EXHAUST_RANGE = 750;
export const EXHAUST_OPEN_DISTANCE = 850;
export const TRENCH_START_Z = 168;
// The original run from the spawn point to the port was 693 m.
export const EXHAUST_Z = TRENCH_START_Z - 693 * 3;
export const TRENCH_HEIGHT = 302;
const OVERFLIGHT_Z = EXHAUST_Z - 680;
const ENTRY_LIMIT_Z = 1350;
export const TRENCH_CENTER_Z = (OVERFLIGHT_Z + ENTRY_LIMIT_Z) / 2;
export const TRENCH_AXIAL_RADIUS = (ENTRY_LIMIT_Z - OVERFLIGHT_Z) / 2;
const BULKHEAD_FACE = EXHAUST_Z - 8;
const HOOD_FRONT = EXHAUST_Z + 20;
const DECK = 0;
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, -1);

export function exhaustLockAngle(range, nearAngle) {
  const longShot = THREE.MathUtils.smoothstep(range, 145, EXHAUST_RANGE);
  return THREE.MathUtils.lerp(nearAngle + 1.5, nearAngle * .34, longShot);
}

function boxMesh(parent, material, size, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function stationDeck(scene) {
  const deck = new THREE.Group();
  scene.add(deck);
  const armorPlate = plateFinish(armor("#586777", .38, .67), 60, .8);
  const shadow = armor("#272e3b");
  const panels = armor("#5f6b77");
  const steel = armor("#40505f");
  const vents = armor("#242b36");
  const stripe = armor("#9e453d", .22);
  const lamps = glow("#ffd495");
  const beacons = glow("#8ee7ff");
  for (const side of [-1, 1]) {
    boxMesh(deck, armorPlate, [4500, 48, 8700], [side * (2250 + TRENCH_HALF), -24, -700]);
  }
  // Continue the deck over the sealed section, leaving only the approach cut open.
  boxMesh(deck, armorPlate, [TRENCH_HALF * 2 + .06, 48, BULKHEAD_FACE + 5050],
    [0, -24, (BULKHEAD_FACE - 5050) / 2]);
  boxMesh(deck, steel, [TRENCH_HALF * 2 + .25, 47, 2.6], [0, -23.5, BULKHEAD_FACE + 1.22]);
  boxMesh(deck, steel, [32, 13, HOOD_FRONT - BULKHEAD_FACE], [0, -6.5, (HOOD_FRONT + BULKHEAD_FACE) / 2]);
  for (const side of [-1, 1]) {
    boxMesh(deck, panels, [4, 28, 22], [side * 16.8, -13.8, EXHAUST_Z + 2]);
    boxMesh(deck, stripe, [9, .20, 8], [side * 34, .13, BULKHEAD_FACE - 9]);
  }
  boxMesh(deck, shadow, [TRENCH_HALF * 2, 8, 8700], [0, TRENCH_FLOOR - 4, -700]);
  const build = makeCraftBatch();
  for (let z = BULKHEAD_FACE + 40; z < 1660; z += 75) {
    for (const s of [-1, 1]) {
      build.box(steel, [3.3, 4.2, 72], [s * 44, 1.7, z]);
      build.box(panels, [3, 24, 9], [s * 41.5, -19, z - 18]);
      build.box(shadow, [2.7, 22, 43], [s * 42.3, -22, z + 13]);
      for (let i = 0; i < 4; i++) {
        build.box(steel, [2.5, 1.28, 45], [s * 40.6, -34 + i * 2.8, z + 9]);
        build.box(lamps, [.25, 5, 1.75], [s * 39.8, -15.5, z + i * 4.5]);
      }
      build.box(beacons, [1.8, .46, 7], [s * 49.5, .42, z - 32]);
      build.box(panels, [30, 4, 27], [s * 65, 1, z + 1]);
      for (let i = 0; i < 5; i++) build.box(vents, [22, .31, 1.2], [s * 65, 3.14, z - 7 + i * 3.5]);
      if (Math.floor(z / 75) % 3 === 0) build.box(stripe, [24, .26, 5.5], [s * 61, .25, z - 25]);
    }
    build.box(steel, [80, 3, 6], [0, -43, z + 13]);
    build.box(shadow, [19, 2, 50], [0, -46, z - 4]);
  }
  deck.add(build.compile());
  const features = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), panels, 640);
  const color = new THREE.Color();
  const marker = new THREE.Object3D();
  for (let i = 0; i < features.count; i++) {
    const lane = i % 16;
    const z = -3450 + Math.floor(i / 16) * 127 + (Math.sin(i * 1.92) * 38);
    const x = (lane < 8 ? 1 : -1) * (129 + (lane % 8) * 101 + Math.sin(i * .71) * 29);
    const height = i % 21 === 0 ? 29 + i % 30 : 1.5 + i % 7;
    marker.position.set(x, height * .5 - .15, z);
    marker.scale.set(24 + i % 47, height, 31 + (i * 11) % 52);
    marker.updateMatrix();
    features.setMatrixAt(i, marker.matrix);
    features.setColorAt(i, color.setRGB(.65 + (i % 7) * .056, .70 + (i % 5) * .05, .73 + (i % 3) * .075));
  }
  deck.add(features);
  return { deck, panels, shadow, lamps };
}

function wideStation(scene, texture) {
  const root = new THREE.Group();
  scene.add(root);
  const skin = plateFinish(armor("#526170", .43, .53), 49, .9);
  const parts = [];
  // Stagger the seams between bands so the shell ruptures into plates rather than petals.
  const bandEdges = [0, .78, 1.60, 2.34, Math.PI];
  for (let i = 0; i < 28; i++) {
    const band = Math.floor(i / 7);
    const a = ((i % 7) + (band % 2) * .49) * Math.PI * 2 / 7;
    const polar = bandEdges[band];
    const polarSpan = bandEdges[band + 1] - polar;
    const group = new THREE.Group();
    const section = new THREE.Mesh(new THREE.SphereGeometry(300, 11, 10, a, Math.PI * 2 / 7 - .012, polar, polarSpan - .009), skin);
    group.add(section);
    root.add(group);
    const latitude = polar + polarSpan * .5;
    parts.push({ group, direction: new THREE.Vector3(-Math.cos(a + .41) * Math.sin(latitude), Math.cos(latitude), Math.sin(a + .41) * Math.sin(latitude)) });
  }
  const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 29, 22), new THREE.ShaderMaterial({
    toneMapped: false, uniforms: { energy: { value: 0 }, beat: { value: 0 } },
    vertexShader: `varying vec3 v; void main(){v=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 v; uniform float energy; uniform float beat;
      void main(){vec3 p=normalize(v); float f=.51+.22*sin(p.x*33.+sin(p.z*19.+beat*4.)*3.1)+.17*sin(p.y*41.+p.z*27.+beat*7.);
      vec3 hot=mix(vec3(.72,.09,.014),vec3(1.,.87,.44),smoothstep(.18,.85,f));gl_FragColor=vec4(hot*energy,1.);}`
  }));
  root.add(fireball);
  const embers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), glow("#ff9853"), 68);
  const emberShape = new THREE.Object3D();
  const emberColor = new THREE.Color();
  embers.frustumCulled = false;
  root.add(embers);
  const shock = new THREE.Mesh(new THREE.TorusGeometry(1, .019, 8, 80), new THREE.MeshBasicMaterial({
    color: "#ffc684", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  }));
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#ffc37f", transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  root.add(shock, flash);
  root.visible = false;
  const ahead = new THREE.Vector3();
  const right = new THREE.Vector3();
  return {
    reset() { root.visible = false; },
    draw(camera, age) {
      root.visible = true;
      ahead.copy(FORWARD).applyQuaternion(camera.quaternion);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      root.position.copy(camera.position).addScaledVector(ahead, 1070).addScaledVector(right, 150);
      const breakTime = Math.max(0, age - .21);
      parts.forEach(({ group, direction }, i) => {
        group.position.copy(direction).multiplyScalar(breakTime * (29 + (i % 4) * 14));
        group.rotation.set(breakTime * .14 * Math.sin(i), breakTime * (i % 7 - 3) * .072, breakTime * .2 * Math.cos(i));
      });
      fireball.scale.setScalar(112 + breakTime * 83);
      fireball.material.uniforms.energy.value = Math.max(.16, 1.18 - breakTime * .34);
      fireball.material.uniforms.beat.value = age;
      for (let i = 0; i < embers.count; i++) {
        const belt = i * 2.39996;
        const y = (i % 17) / 8 - 1;
        const spread = 125 + breakTime * (91 + (i * 19) % 216);
        const radius = Math.sqrt(1 - y*y);
        emberShape.position.set(Math.cos(belt) * radius * spread, y * spread, Math.sin(belt) * radius * spread);
        emberShape.scale.setScalar((2.5 + i % 7) * Math.max(.2, 1 - breakTime * .28));
        emberShape.updateMatrix();
        embers.setMatrixAt(i, emberShape.matrix);
        embers.setColorAt(i, emberColor.setRGB(1, .74 + i % 3 * .09, .63));
      }
      embers.instanceMatrix.needsUpdate = true;
      embers.instanceColor.needsUpdate = true;
      flash.scale.setScalar(160 + breakTime * 155);
      flash.material.opacity = .85 * Math.exp(-breakTime * .86);
      shock.quaternion.copy(camera.quaternion);
      shock.scale.setScalar(108 + breakTime * 290);
      shock.material.opacity = Math.max(0, .84 - breakTime * .3);
    }
  };
}

export function createTrench(scene, texture, tuningRate = 1) {
  const { deck, panels, shadow, lamps } = stationDeck(scene);
  const fireworks = createBlastPool(scene, texture);
  const wide = wideStation(scene, texture);
  const velocity = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const subject = new THREE.Vector3();
  const bank = new THREE.Quaternion();
  const shield = new THREE.Group();
  deck.add(shield);
  const port = { kind: "port", position: shield.position, velocity, radius: 7.4, model: shield };
  const approach = new THREE.Group();
  approach.position.set(0, 13, EXHAUST_Z + 490);
  deck.add(approach);
  const guide = { kind: "guide", position: approach.position, model: approach };
  const aperture = new THREE.Mesh(new THREE.TorusGeometry(7.45, 1.22, 9, 32), glow("#7fffe2"));
  const trap = new THREE.Group();
  shield.add(trap, aperture);
  boxMesh(trap, shadow, [22, 6.7, 7], [0, -10.5, -4]);
  boxMesh(trap, panels, [16, 4.2, 6], [0, 10.3, -4]);
  boxMesh(trap, glow("#141e2b"), [12.8, 12.8, .2], [0, 0, -.8]);
  boxMesh(trap, lamps, [12, .44, .3], [0, 9.6, .04]);
  const guidance = glow("#5ee4df");
  const runway = new THREE.Group();
  deck.add(runway);
  const hatch = boxMesh(shield, panels, [18, 19, 2.2], [0, 0, 1.2]);
  boxMesh(hatch, lamps, [12, .9, .31], [0, 1.4, 1.24]);
  for (const side of [-1, 1]) {
    for (const z of [25, 46, 68, 93, 128, 171, 228, 295, 355, 444, 520, 625, 745, 875, 1015, 1165, 1325, 1505, 1705, 1915, 2070]) {
      boxMesh(runway, z < 355 ? guidance : lamps, [2.3, .16, 12], [side * 19, TRENCH_FLOOR + .14, EXHAUST_Z + z]);
    }
    for (const z of [305, 490, 875, 1325, 1705, 2070]) {
      boxMesh(deck, panels, [5, 9, 7.7], [side * 48, 4.1, EXHAUST_Z + z]);
      boxMesh(deck, lamps, [2.9, .36, 1.83], [side * 47.2, 8.65, EXHAUST_Z + z]);
      boxMesh(runway, guidance, [2.65, .85, 1.6], [side * 47.2, 9, EXHAUST_Z + z]);
    }
  }
  const guns = [[-61, 7, 65], [61, 7, -350], [-61, 7, -779]].map((position, i) => {
    const mount = new THREE.Vector3(...position);
    const body = new THREE.Group();
    body.position.copy(mount);
    deck.add(body);
    boxMesh(deck, shadow, [12, 6, 14], [mount.x, 2.5, mount.z]);
    boxMesh(body, panels, [9.7, 5.7, 8.3], [0, -.8, 1]);
    boxMesh(body, shadow, [2.7, 2.8, 9.7], [0, .9, -4]);
    const muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: "#ffd290", blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, toneMapped: false }));
    muzzle.position.set(0, .9, -8.6);
    muzzle.scale.setScalar(8);
    body.add(muzzle);
    return { position: mount, model: body, kind: "gun", hits: 0, armor: 4, radius: 5.7, charging: 0, cooldown: 1.5 + i * 2, muzzle };
  });
  const walls = [new THREE.Box3(new THREE.Vector3(-4600, -49, -5050), new THREE.Vector3(-TRENCH_HALF, 0, 3650)),
    new THREE.Box3(new THREE.Vector3(TRENCH_HALF, -49, -5050), new THREE.Vector3(4600, 0, 3650)),
    new THREE.Box3(new THREE.Vector3(-TRENCH_HALF, -52, -5050), new THREE.Vector3(TRENCH_HALF, TRENCH_FLOOR, 3650)),
    new THREE.Box3(new THREE.Vector3(-TRENCH_HALF, -49, -5050), new THREE.Vector3(TRENCH_HALF, 0, BULKHEAD_FACE + 2.52)),
    new THREE.Box3(new THREE.Vector3(-16, -13, BULKHEAD_FACE), new THREE.Vector3(16, 0, HOOD_FRONT))];
  const hit = new THREE.Vector3();
  const flarePoint = new THREE.Vector3();
  let phase, clock, openAge, nextGunner, crashAge, nextBoom, blastIndex;
  function reset() {
    phase = "idle";
    clock = openAge = nextGunner = crashAge = nextBoom = blastIndex = 0;
    deck.visible = true;
    shield.position.set(0, -28, EXHAUST_Z);
    subject.copy(shield.position);
    shield.visible = hatch.visible = true;
    hatch.position.y = 0;
    aperture.visible = runway.visible = approach.visible = false;
    wide.reset(); fireworks.reset();
    for (const [i, gun] of guns.entries()) {
      gun.model.visible = true; gun.hits = gun.charging = 0; gun.cooldown = 1.5 + i * 2; gun.muzzle.visible = false;
    }
  }
  function start() {
    openAge = 0;
    aperture.visible = runway.visible = approach.visible = true;
    phase = "active";
  }
  function frontFacing(point) {
    return point.z > EXHAUST_Z;
  }
  function needsApproach(point) {
    return point.z - EXHAUST_Z < 30 || (point.z - EXHAUST_Z < 315 && Math.abs(point.x) > 103);
  }
  function distanceToHull(ray) {
    let distance = Infinity;
    for (const wall of walls) {
      if (wall.containsPoint(ray.origin)) return 0;
      if (ray.intersectBox(wall, hit)) distance = Math.min(distance, ray.origin.distanceTo(hit));
    }
    return distance;
  }
  function separateShip(position) {
    if (position.y < 2.7 && Math.abs(position.x) < TRENCH_HALF && position.z < BULKHEAD_FACE + 5.9) {
      if (position.y < -5 && position.z > BULKHEAD_FACE - 7) position.z = BULKHEAD_FACE + 6;
      else position.y = 2.8;
      return true;
    }
    if (Math.abs(position.x) < 18.8 && position.z < HOOD_FRONT + 1.8 && position.z > BULKHEAD_FACE && position.y > -15.6 && position.y < 2.6) {
      if (position.y < -6) position.y = -15.7;
      else position.y = 2.75;
      return true;
    }
    if (position.y < TRENCH_FLOOR + 3.2) { position.y = TRENCH_FLOOR + 3.35; return true; }
    if (position.y > 2.6 || Math.abs(position.x) < TRENCH_HALF - 3) return false;
    if (Math.abs(position.x) < TRENCH_HALF + 4 && position.y < -2.5) position.x = Math.sign(position.x) * (TRENCH_HALF - 3.15);
    else position.y = 2.75;
    return true;
  }
  function keepOverDeck(position, quaternion, dt) {
    if (position.y <= TRENCH_HEIGHT) return false;
    aim.copy(FORWARD).applyQuaternion(quaternion);
    if (aim.y > -.1) {
      flarePoint.set(aim.x, -.40, aim.z);
      if (flarePoint.lengthSq() <= .18) flarePoint.z = -1;
      bank.setFromUnitVectors(aim, flarePoint.normalize());
      quaternion.slerp(bank.multiply(quaternion), 1 - Math.exp(-dt * 2.3));
    }
    return true;
  }
  function update(dt, ship, playerVelocity, fire, burst) {
    if (phase === "crashing") {
      crashAge += dt;
      fireworks.draw(crashAge);
      if (crashAge >= nextBoom && crashAge < 4.1) {
        const step = blastIndex++;
        flarePoint.copy(subject).add(hit.set(Math.sin(step * 2.4) * (step * 5 + 6), step < 2 ? 0 : 1.8, (step % 2 ? 1 : -1) * (step * 21 + 5)));
        fireworks.pop(flarePoint, 64 + step * 7, crashAge);
        burst(flarePoint, 106 + step * 2);
        nextBoom = crashAge + Math.max(.16, .46 - step * .033);
      }
      if (crashAge >= 7) phase = "defeated";
      return;
    }
    if (phase === "defeated") return;
    clock += dt;
    if (phase === "active" && hatch.visible) {
      openAge += dt;
      hatch.position.y = -18 * THREE.MathUtils.smoothstep(openAge, 0, .8);
      if (openAge >= .8) hatch.visible = false;
    }
    for (const gun of guns) {
      if (!gun.model.visible) continue;
      aim.copy(ship.position).sub(gun.position);
      const distance = aim.length();
      gun.model.quaternion.setFromUnitVectors(FORWARD, aim.normalize());
      if (gun.charging > 0) {
        gun.charging = Math.max(0, gun.charging - dt);
        if (!gun.charging) {
          fire(gun, flarePoint.copy(ship.position).addScaledVector(playerVelocity, .15), 7, 128);
          gun.cooldown = 6.4 / Math.min(1.22, 1 / tuningRate);
        }
      } else {
        gun.cooldown -= dt;
        if (clock >= nextGunner && gun.cooldown <= 0 && distance > 65 && distance < 268 && ship.position.y > -7) {
          gun.charging = .84;
          nextGunner = clock + 2.2;
        }
      }
      gun.muzzle.visible = gun.charging > 0;
    }
  }
  function hitGun(gun) {
    if (!gun.model.visible || ++gun.hits < gun.armor) return false;
    gun.model.visible = false;
    gun.charging = 0;
    return true;
  }
  function defeat() {
    phase = "crashing";
    nextBoom = crashAge = blastIndex = 0;
    shield.visible = approach.visible = false;
    for (const gun of guns) { gun.charging = 0; gun.muzzle.visible = false; }
  }
  function draw(camera) {
    if ((phase === "crashing" && crashAge >= 4.35) || phase === "defeated") {
      deck.visible = false;
      wide.draw(camera, crashAge - 4.35);
    }
  }
  reset();
  return { name: "Death Star", subject, guns, port, guide, reset, start, update, draw, hitGun, defeat, frontFacing, needsApproach,
    distanceToHull, separateShip, keepOverDeck, get open() { return openAge >= .8; }, get phase() { return phase; } };
}
