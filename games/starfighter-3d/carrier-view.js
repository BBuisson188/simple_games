import * as THREE from "three";
import { armor, glow, loft, makeCraftBatch, plate, plateFinish } from "./craft-geometry.js";

const TAU = 2 * Math.PI;
const SWATH = 0.53;
const IRONWAKE = "Control Ship";
const LONGBOW = "Destroyer";

function ring(parent, material, position, radius, thickness) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 7, 32), material);
  mesh.position.copy(position);
  parent.add(mesh);
  return mesh;
}

function deck(batch, material, outline, y, depth) {
  batch.put(material, plate(outline.map(([x, z]) => [x, -z]), depth), [0, y, 0], [-Math.PI / 2, 0, 0]);
}

function arc(batch, material, from, to, inner, outer, y, depth) {
  const contour = [];
  const segments = Math.ceil((to - from) * 12);
  for (let i = 0; i <= segments; i++) {
    const t = THREE.MathUtils.lerp(from, to, i / segments);
    contour.push([Math.sin(t) * outer, -Math.cos(t) * outer]);
  }
  for (let i = segments; i >= 0; i--) {
    const t = THREE.MathUtils.lerp(from, to, i / segments);
    contour.push([Math.sin(t) * inner, -Math.cos(t) * inner]);
  }
  deck(batch, material, contour, y, depth);
}

function polar(radius, angle, y) {
  return [radius * Math.sin(angle), y, -radius * Math.cos(angle)];
}

function ironwake(b, m) {
  const end = TAU - SWATH;
  const count = 14;
  const section = (end - SWATH) / count;
  const hullPieces = [];
  arc(b, m.black, SWATH, end, 42, 65.4, -2.1, 9.5);
  arc(b, m.slate, SWATH, end, 42.2, 65.1, 2.6, 9.5);
  arc(b, m.edge, SWATH, end, 62.2, 66.3, 0.0, 2.7);
  arc(b, m.dark, SWATH, end, 43.5, 49.4, 7.19, 1.15);
  arc(b, m.blue, SWATH, end, 60.1, 63.7, 7.32, 0.86);
  for (let i = 0; i < count; i++) {
    const from = SWATH + i * section;
    const to = from + section;
    const mid = (from + to) / 2;
    arc(b, i % 3 === 1 ? m.slate : m.light, from + 0.017, to - 0.017, 49.4, 60.2, 7.9, 1.7);
    if (i % 4 !== 2) arc(b, m.blue, from + 0.027, to - section * 0.42, 54.0, 59.5, 8.85, 0.29);
    for (let j = 0; j < 4; j++) {
      const angle = from + section * (0.16 + j * 0.21);
      b.box(m.window, [1.4, 0.48, 0.68], polar(66.1, angle, -1.55), [0, -angle, 0]);
      b.box(m.edge, [1.24, 0.36, 2.7], polar(47.1, angle, 7.95), [0, -angle, 0]);
    }
    b.box(m.dark, [1.7, 1.6, 3.6], polar(64.9, mid, 6.1), [0, -mid, 0]);
    hullPieces.push([polar(54, mid, 0.5), [54.5 * section, 15, 22.7], -mid]);
  }
  for (const side of [-1, 1]) {
    const angle = side * SWATH;
    const [x, , z] = polar(54.0, angle, 7);
    b.box(m.light, [6.2, 4.4, 21], [x + side * 2.5, -1, z - 1], [0, -angle, 0]);
    for (let i = 0; i < 3; i++) b.box(m.accent, [1.28, 0.54, 0.31], [x + side * (3.7 + i * 3.0), 3.47, z - 4.1 + i * 1.67]);
  }
  const neck = [[-13, 53], [13, 53], [11, 25], [17, 12], [14, -4], [-14, -4], [-17, 12], [-11, 25]];
  deck(b, m.dark, neck, 0.2, 11.2);
  deck(b, m.light, neck, 6.45, 2.5);
  b.put(m.slate, loft([[-28.5, 0, 0.3, 8.1, 7.1], [-23, 0, 0.48, 13.2, 10.7],
    [-9.5, 0, 0.1, 16.3, 13.1], [5, 0, 0.6, 16.6, 12.5], [17, 0, 1.45, 11.7, 8.8]], 20, 0.91));
  b.put(m.blue, loft([[-18, 0, 0.9, 15.1, 9.95], [-15.4, 0, 0.9, 15.82, 10.8]], 20, 0.91));
  b.box(m.dark, [14.3, 8.7, 16], [0, 12, 10]);
  b.box(m.window, [10.9, 0.55, 0.4], [0, 13.7, 1.93]);
  b.box(m.light, [13.5, 2.7, 12.2], [0, 17.1, 11.2]);
  b.beam(m.edge, [-4.5, 17.1, 13], [-6.4, 26.2, 14], 0.68);
  b.beam(m.edge, [3.1, 17.3, 11], [4.1, 23.4, 12], 0.77);
  b.put(m.window, new THREE.SphereGeometry(0.71, 7, 5), [-6.4, 26.2, 14]);
  for (const x of [-9, 0, 9]) {
    b.box(m.dark, [6.3, 5.4, 5.35], [x, -0.2, 59.5]);
    b.box(m.window, [4.4, 2.65, 0.39], [x, -0.2, 62.25]);
  }
  hullPieces.push([[0, 0.8, 29], [23, 13.2, 50], 0], [[0, 0.3, -6.8], [29.2, 20.6, 42], 0],
    [[0, 1, -26], [18, 12.8, 5.4], 0], [[0, 13.9, 10], [13.9, 10.4, 15.5], 0]);
  return { name: IRONWAKE, port: [0, 0, -31.2], mounts: [polar(52, -1.03, 13.1), polar(52, 1.03, 13.1)], hullPieces,
    tilt: [-0.34, 0.11, 0.075] };
}

function longbow(b, m) {
  const contour = [[0, -73], [11, -69], [27, -44], [68, 26], [66, 42], [38, 51], [0, 48],
    [-38, 51], [-66, 42], [-68, 26], [-27, -44], [-11, -69]];
  const table = [[0, -66], [22, -38], [59, 28], [57, 40], [27, 46], [-27, 46], [-57, 40], [-59, 28], [-22, -38]];
  deck(b, m.dark, contour, -0.7, 12.7);
  deck(b, m.slate, table.map(([x, z]) => [x * .91, z * .94]), -7.2, 2.8);
  deck(b, m.edge, [[0, -56], [12, -35], [22, 4], [24, 39], [-24, 39], [-22, 4], [-12, -35]], -9.06, 2.7);
  b.box(m.black, [22, 1.6, 31], [0, -10.5, 19]);
  b.box(m.window, [11.5, .28, 21], [0, -11.45, 19]);
  deck(b, m.slate, contour.map(([x, z]) => [x * 0.97, z * 0.981]), 5.0, 4.8);
  deck(b, m.light, table, 7.88, 2.2);
  deck(b, m.edge, [[0, -57], [14, -24], [28, 19], [24, 37], [-24, 37], [-28, 19], [-14, -24]], 9.38, 2.5);
  const citadel = [[0, -9], [17, 8], [22, 25], [17, 37], [-17, 37], [-22, 25], [-17, 8]];
  deck(b, m.slate, citadel, 12.8, 5.1);
  deck(b, m.light, citadel.map(([x, z]) => [x * 0.80, z * 0.81 + 5]), 16.3, 3.0);
  b.box(m.dark, [22, 5.5, 16], [0, 19.1, 22]);
  b.box(m.window, [16, 0.7, 0.35], [0, 19.9, 13.8]);
  b.box(m.light, [22.5, 1.9, 10.5], [0, 22.1, 24]);
  b.box(m.dark, [13.2, 12.3, 7.8], [0, 0, -69.6]);
  for (const side of [-1, 1]) {
    const x = (width) => side * width;
    deck(b, m.rust, [[x(8), -46], [x(16), -36], [x(56), 27], [x(51), 32], [x(36), 10]], 9.2, 0.46);
    b.beam(m.edge, [x(35), 9.35, 33], [x(19), 9.34, 7], 1.25, 0.66);
    b.beam(m.edge, [x(44), 9.25, 31], [x(21), 9.36, -7], 0.55, 0.42);
    for (let i = 0; i < 14; i++) {
      const z = -39 + i * 5.63;
      const width = 27 + (z + 44) * 0.577;
      b.box(i % 4 === 0 ? m.accent : m.window, [1.7, 0.50, 0.61], [x(width - 1.06), -0.8, z], [0, side * 0.52, 0]);
    }
    for (let i = 0; i < 5; i++) {
      b.box(m.dark, [0.72, 0.86, 5.8], [x(24 + i * 3.8), 9.58, 35.8]);
      b.box(m.slate, [1.15, 0.72, 4.1], [x(24 + i * 3.8), 9.38, 26.1]);
    }
    for (let i = 0; i < 7; i++) {
      const z = -22 + i * 8.5;
      b.box(m.dark, [8.5 + i * 3.1, 1.05, 4.1], [x(18 + i * 3), -8.15, z], [0, .07 * side, 0]);
      b.box(i % 3 ? m.window : m.accent, [1.6, .23, 2.6], [x(16.4 + i * 3.7), -8.78, z]);
    }
    b.beam(m.edge, [x(16), -8.8, -19], [x(42), -8.1, 36], 1.6, .88);
    b.beam(m.edge, [x(7), 21.8, 23], [x(10), 28.3, 25], 0.61);
    b.beam(m.dark, [x(43), 3.5, 36], [x(43), 3.5, 51.2], 8.5, 9.1);
    b.box(m.window, [6.3, 4.1, 0.6], [x(43), 3.5, 51.42]);
  }
  b.box(m.dark, [12, 8.0, 8.7], [0, -1.2, 45]);
  b.box(m.window, [9.2, 4.9, 0.35], [0, -1.2, 49.49]);
  const hullPieces = [
    [[0, 0.25, -62], [16, 13, 21], 0], [[0, 1, -44], [38, 15, 21], 0],
    [[0, 0.5, -23], [63, 16.5, 24], 0], [[0, 0.5, 3], [91, 16.5, 30], 0],
    [[0, 0, 31], [123, 17.0, 29], 0], [[0, 14, 22], [28, 12.3, 28], 0]
  ];
  return { name: LONGBOW, port: [0, 0, -74.4], mounts: [[-25, 13.8, -16], [25, 13.8, -16], [-46, 13.8, 24], [46, 13.8, 24]], hullPieces,
    tilt: [-0.28, -0.19, 0.05] };
}

export function createCarrierView(scene, flashTexture, variant = "ironwake") {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const hull = new THREE.Group();
  root.add(hull);
  const isLongbow = variant === "longbow";
  const hullScale = isLongbow ? 1.64 : 1;
  hull.scale.setScalar(hullScale);
  const materials = {
    slate: armor(isLongbow ? "#414855" : "#7f8c9f"), light: armor(isLongbow ? "#626a73" : "#aab7ba", 0.34),
    edge: armor(isLongbow ? "#3d4453" : "#535863", 0.56), dark: armor("#303847"), black: armor("#1b2130"), blue: armor("#405e95", 0.26),
    rust: armor(isLongbow ? "#80382c" : "#a15942", 0.31), window: glow(isLongbow ? "#db9c72" : "#8bd1f2"), accent: glow("#ffbf70")
  };
  for (const key of ["slate", "light", "edge", "dark", "blue", "rust"]) plateFinish(materials[key], 6.85, 0.88);
  const batch = makeCraftBatch();
  const shape = isLongbow ? longbow(batch, materials) : ironwake(batch, materials);
  const port = new THREE.Vector3(...shape.port);
  const guns = shape.mounts.map((xyz) => {
    const mount = new THREE.Vector3(...xyz);
    batch.box(materials.edge, [13, 3.45, 13], [mount.x, mount.y - 3.83, mount.z]);
    const body = new THREE.Group();
    body.position.copy(mount);
    hull.add(body);
    const turret = makeCraftBatch();
    turret.put(materials.dark, loft([[-5.3, 0, 0, 3.9, 2.2], [-1.1, 0, 0, 5.35, 3.5],
      [4.52, 0, -0.02, 4.1, 2.55]], 8, 0.66));
    turret.box(materials.light, [7.5, 1.55, 5.0], [0, 2.31, -0.76]);
    for (const x of [-1.94, 1.94]) turret.box(materials.edge, [1.67, 2.1, 9.8], [x, 0.26, -4.4]);
    body.add(turret.compile());
    const muzzle = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flashTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    muzzle.position.z = -8.8;
    muzzle.visible = false;
    body.add(muzzle);
    return { mount: mount.clone().multiplyScalar(hullScale), body, muzzle };
  });
  const armorShell = batch.compile();
  hull.add(armorShell);
  const portDark = glow("#101624");
  ring(hull, materials.edge, port, 7.05, 1.21);
  const aperture = new THREE.Mesh(new THREE.CircleGeometry(6.28, 30), portDark);
  aperture.rotation.y = Math.PI;
  aperture.position.copy(port);
  hull.add(aperture);
  const portLight = ring(hull, glow("#8affdc"), port.clone().setZ(port.z - 0.52), 5.22, 0.53);
  ring(hull, materials.accent, port.clone().setZ(port.z - 0.58), 2.86, 0.38);

  const warp = new THREE.Group();
  root.add(warp);
  warp.visible = false;
  const warpLight = new THREE.MeshBasicMaterial({
    color: "#88dcff", transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false
  });
  const rim = ring(warp, warpLight, new THREE.Vector3(), 38, 1.2);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3, 186, 8, 1, true), warpLight);
  beam.rotation.x = Math.PI / 2;
  beam.position.z = 80;
  warp.add(beam);
  const hullPieces = shape.hullPieces.map(([center, size, angle]) => [center.map((n) => n * hullScale), size.map((n) => n * hullScale), angle]);
  return { ...shape, hullPieces, hullScale, root, hull, armorShell, port: port.clone().multiplyScalar(hullScale), portLight, guns, warp, warpLight, rim };
}
