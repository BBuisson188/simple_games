import * as THREE from "three";
import { armor, glow, loft, makeCraftBatch, plate, plateFinish } from "./craft-geometry.js";

export function createRebelFighter() {
  const b = makeCraftBatch();
  const ceramic = plateFinish(armor("#c7c5bb", 0.28, 0.51), 1.5, 0.48);
  const alloy = armor("#828996", 0.52, 0.4);
  const dark = armor("#323a4b", 0.43);
  const red = plateFinish(armor("#b84d44", 0.24), 1.32, 0.43);
  const glass = armor("#20344a", 0.58, 0.19, 0.22);
  const hot = glow("#ff694f");
  const core = glow("#ffe7cb");
  const nav = glow("#8addff");
  const mounts = [];

  b.put(ceramic, loft([[-5.48, 0, 0, 0.37, 0.32], [-4.86, 0, 0.02, 0.57, 0.41], [-2.7, 0, 0, 0.87, 0.56],
    [-0.26, 0, -0.04, 1.24, 0.79], [1.6, 0, -0.12, 1.27, 0.86], [3.64, 0, -0.2, 0.84, 0.79]], 8, 0.65));
  b.put(alloy, loft([[-5.56, 0, 0, 0.32, 0.28], [-4.91, 0, 0.025, 0.56, 0.40]], 8));
  b.put(dark, loft([[-2.96, 0, 0.42, 0.45, 0.15], [-2.13, 0, 0.69, 0.69, 0.49],
    [-0.84, 0, 0.69, 0.81, 0.59], [-0.35, 0, 0.59, 0.65, 0.33]], 8, 0.67));
  b.put(glass, loft([[-2.82, 0, 0.49, 0.37, 0.11], [-2.10, 0, 0.78, 0.59, 0.43],
    [-0.93, 0, 0.78, 0.69, 0.49], [-0.51, 0, 0.72, 0.54, 0.23]], 8, 0.72));
  b.box(dark, [0.62, 0.85, 0.13], [0, -0.27, 3.67]);
  for (let i = -1; i <= 1; i++) {
    b.box(core, [0.072, 0.53, 0.06], [i * 0.17, -0.26, 3.77]);
    b.box(alloy, [0.64, 0.17, 0.15], [0, 0.76 - i * 0.015, 0.94 + i * 0.28]);
  }

  function engine(x, y, radius, z, name) {
    b.put(alloy, loft([[z - radius * 2.2, x, y, radius * 0.82, radius * 0.82], [z - radius, x, y, radius, radius],
      [z - radius * 0.24, x, y, radius * 0.94, radius * 0.94]], 14));
    b.put(dark, new THREE.TorusGeometry(radius * 0.83, radius * 0.15, 7, 20), [x, y, z - 0.04]);
    b.put(hot, new THREE.CircleGeometry(radius * 0.77, 24), [x, y, z - 0.035]);
    b.put(core, new THREE.CircleGeometry(radius * 0.49, 24), [x, y, z - 0.027]);
    mounts.push([name, x, y, z + 0.08, radius * 1.6]);
  }

  for (const side of [-1, 1]) {
    const lr = side === -1 ? "L" : "R";
    const out = (x) => x * side;
    b.beam(red, [out(0.43), 0.22, -4.75], [out(0.97), 0.23, -1.36], 0.14, 0.12);
    b.put(ceramic, loft([[-0.94, out(1.39), -0.22, 0.49, 0.39], [0.23, out(1.49), -0.15, 0.72, 0.78],
      [2.40, out(1.50), -0.15, 0.83, 0.94], [3.23, out(1.49), -0.15, 0.70, 0.77]], 8));
    engine(out(1.49), -0.11, 0.77, 4.05, `Thruster_${lr}`);
    engine(out(1.51), -1.03, 0.36, 4.18, `Thruster_Trim_${lr}`);
    b.box(core, [0.18, 0.15, 0.085], [out(0.47), 0.51, 3.69]);
    for (const tier of [-1, 1]) {
      const bank = side * tier * 0.255;
      const deckY = tier * 0.49 - 0.34;
      const wing = (shape, depth) => plate(shape.map(([x, z]) => [out(x), z]), depth).rotateX(Math.PI / 2);
      b.put(ceramic, wing([[1.24, 0.13], [3.68, 0.18], [5.34, -0.45], [5.47, 0.77], [4.04, 1.74], [1.22, 2.68]], 0.24), [0, deckY, 0], [0, 0, bank]);
      b.put(red, wing([[2.77, 0.52], [4.38, 0.46], [4.76, 0.91], [3.55, 1.58], [2.86, 1.54]], 0.035), [0, deckY + 0.14, 0], [0, 0, bank]);
      const x = out(5.25) * Math.cos(bank);
      const y = deckY + out(5.25) * Math.sin(bank);
      b.put(dark, loft([[-2.09, x, y + 0.02, 0.095, 0.11], [-1.24, x, y, 0.21, 0.21],
        [-0.53, x, y, 0.28, 0.24], [0.76, x, y, 0.25, 0.27]], 6));
      b.beam(alloy, [x, y, -1.72], [x, y, -2.69], 0.11);
      b.box(core, [0.102, 0.26, 0.065], [x, y, 0.804]);
      b.box(nav, [0.16, 0.047, 0.27], [x, y + 0.234, -0.94]);
      if (tier === 1) mounts.push([`Pulse_${lr}`, x, y, -2.74, 1]);
    }
  }

  const model = b.compile();
  model.name = "Rebel Fighter";
  for (const [name, x, y, z, scale] of mounts) {
    const socket = new THREE.Object3D();
    socket.name = name;
    socket.position.set(x, y, z);
    socket.userData.glowScale = scale;
    model.add(socket);
  }
  return model;
}
