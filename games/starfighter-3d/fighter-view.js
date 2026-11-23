import * as THREE from "three";
import { armor, glow, loft, makeCraftBatch, plate, plateFinish } from "./craft-geometry.js";

export const FIGHTER_NAMES = ["TIE", "Vulture"];

function palisade() {
  const b = makeCraftBatch();
  const slate = armor("#697789");
  const graphite = armor("#273141");
  const silver = armor("#9dacad", 0.54);
  const ceramic = armor("#b97a49", 0.26);
  const glass = armor("#283e54", 0.56, 0.21, 0.21);
  const amber = glow("#ff9565");
  for (const material of [slate, graphite, silver, ceramic]) plateFinish(material, 1.17, 0.79);
  b.put(slate, loft([[-4.65, 0, 0, 1.3, 0.85], [-3.4, 0, 0, 1.99, 1.34], [-0.4, 0, 0.05, 2.29, 1.74],
    [1.85, 0, 0.13, 1.94, 1.83], [4.48, 0, -0.06, 1.38, 1.2]]));
  b.put(glass, loft([[-4.81, 0, 0.22, 1.01, 0.49], [-4.2, 0, 0.47, 1.34, 0.76], [-2.73, 0, 0.72, 1.48, 0.92],
    [-0.7, 0, 0.83, 1.07, 0.62]], 10));
  b.beam(silver, [-0.99, 0.18, -4.76], [0.99, 0.18, -4.76], 0.105);
  b.beam(amber, [-0.75, -0.31, -4.7], [0.75, -0.31, -4.7], 0.12);
  b.box(ceramic, [1.35, 0.36, 2.1], [0, 1.71, 0.61]);
  const mainFin = [[-3.75, -2.6], [-3.12, 2.9], [-1.04, 5.88], [3.45, 5.34], [5.15, 1.45], [5.13, -2.56],
    [3.1, -5.56], [-1.7, -5.07]];
  const insetFin = [[-2.86, -2.4], [-2.48, 2.52], [-0.61, 4.91], [2.95, 4.53], [4.28, 1.02], [4.21, -2.09],
    [2.62, -4.6], [-1.45, -4.17]];
  const noseCut = [[-3.75, -2.6], [-3.12, 2.9], [-1.04, 5.88], [-0.62, 4.91], [-2.47, 2.52], [-2.87, -2.4], [-1.46, -4.17], [-1.7, -5.07]];
  for (const side of [-1, 1]) {
    const fin = side * 5.02;
    const mount = side * 2.7;
    b.beam(graphite, [side * 1.55, -0.19, 0.44], [fin, -0.18, 0.44], 1.16, 2.45);
    b.beam(silver, [side * 1.66, 0.43, -0.18], [fin, 0.94, 0.11], 0.46, 0.92);
    b.put(slate, plate(mainFin, 0.64), [fin, 0, 0], [0, -Math.PI / 2, 0]);
    for (const face of [-1, 1]) {
      const skin = fin + face * 0.352;
      b.put(graphite, plate(insetFin, 0.14), [skin, 0, 0], [0, -Math.PI / 2, 0]);
      b.put(ceramic, plate(noseCut, 0.12), [skin, 0, 0], [0, -Math.PI / 2, 0]);
      for (let i = 0; i < 4; i++) {
        b.beam(slate, [skin + face * 0.11, -2.38 + i * 1.64, -2.25], [skin + face * 0.11, -0.8 + i * 1.64, 3.92 - i * 0.28], 0.11, 0.11);
      }
    }
    b.beam(amber, [fin, -1.36, -3.66], [fin, 1.79, -3.27], 0.23);
    b.beam(silver, [fin, 2.17, -3.29], [fin, 4.59, -1.92], 0.24);
    b.box(graphite, [1.36, 0.82, 1.55], [mount, -0.53, 3.79]);
    b.box(amber, [0.93, 0.44, 0.21], [mount, -0.48, 4.64]);
    b.box(amber, [0.40, 0.32, 0.15], [fin, 2.0, 4.97]);
  }
  return b.compile();
}

function mako() {
  const b = makeCraftBatch();
  const metal = armor("#4e698e", 0.48);
  const steel = armor("#96a9c0", 0.46, 0.42);
  const dark = armor("#242a43", 0.3);
  const enamel = armor("#c2c7b7", 0.25, 0.51);
  const glass = armor("#343556", 0.51, 0.18, 0.21);
  const pink = glow("#ff8fbd");
  for (const material of [metal, steel, dark, enamel]) plateFinish(material, 1.25, 0.76);
  b.put(dark, loft([[-4.1, 0, 0, 0.46, 0.26], [-2.9, 0, 0.06, 1.87, 0.74], [-0.4, 0, 0.06, 2.36, 1.05],
    [2.8, 0, 0, 2.29, 0.82], [4.55, 0, -0.03, 1.21, 0.65]]));
  b.put(glass, loft([[-3.57, 0, 0.42, 0.51, 0.26], [-2.19, 0, 0.87, 1.01, 0.65], [0.1, 0, 1.16, 1.26, 0.92],
    [2.42, 0, 0.68, 0.89, 0.56]], 12));
  b.beam(pink, [-0.39, 0.42, -3.72], [0.39, 0.42, -3.72], 0.108);
  for (const side of [-1, 1]) {
    const mirror = (x) => x * side;
    const pods = [
      [-6.7, mirror(4.66), 0.06, 0.07, 0.10], [-4.52, mirror(4.2), 0.03, 0.68, 0.43],
      [-1.56, mirror(3.73), 0.18, 1.42, 0.92], [1.5, mirror(3.65), 0.19, 1.41, 1.06],
      [4.67, mirror(3.71), 0.35, 0.94, 0.8], [5.64, mirror(3.77), 0.49, 0.38, 0.46]
    ];
    b.put(metal, loft(pods, 12, 0.65));
    b.put(dark, loft([[-6.15, mirror(4.63), -1.04, 0.07, 0.075], [-4.1, mirror(4.45), -1.01, 0.48, 0.30],
      [-0.64, mirror(4.06), -0.91, 0.62, 0.41], [1.14, mirror(3.92), -0.56, 0.79, 0.48]], 10, 0.75));
    b.put(steel, plate([[mirror(1.44), 2.13], [mirror(3.49), -0.79], [mirror(5.1), 0.72], [mirror(3.72), 3.68],
      [mirror(1.46), 3.29]], 0.49), [0, -0.06, 0], [Math.PI / 2, 0, 0]);
    b.beam(steel, [mirror(5.24), 0.21, 0.02], [mirror(4.76), 0.18, -4.29], 0.18);
    b.beam(pink, [mirror(4.68), 0.14, -4.46], [mirror(4.71), 0.10, -5.73], 0.12);
    b.beam(pink, [mirror(4.63), -0.95, -4.42], [mirror(4.66), -1.02, -5.5], 0.10);
    b.beam(dark, [mirror(3.79), 0.48, -3.18], [mirror(2.92), 0.93, -0.36], 0.23, 0.29);
    b.beam(steel, [mirror(4.62), 0.42, -4.28], [mirror(4.27), 1.06, -1.87], 0.14);
    for (let i = 0; i < 3; i++) {
      b.beam(enamel, [mirror(3.05), 1.09 + i * 0.040, -0.75 + i * 0.95],
        [mirror(4.57), 1.11 + i * 0.033, -0.29 + i * 0.95], 0.15, 0.21);
    }
    b.put(dark, loft([[3.9, mirror(2.28), 0.03, 0.72, 0.58], [4.79, mirror(2.35), 0.04, 0.83, 0.59]], 10));
    b.put(pink, new THREE.CircleGeometry(0.44, 12), [mirror(2.35), 0.04, 4.81]);
  }
  return b.compile();
}

export function createFighterFleet(scene, texture, count) {
  const fleet = Array.from({ length: count }, () => {
    const model = new THREE.Group();
    const charge = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    charge.position.z = -5.3;
    charge.visible = false;
    model.add(charge);
    model.userData.charge = charge;
    scene.add(model);
    return model;
  });
  const templates = [palisade(), mako()];
  for (const model of fleet) {
    const silhouettes = templates.map((shape) => shape.clone());
    model.add(...silhouettes);
    model.userData.silhouettes = silhouettes;
  }
  return fleet;
}
