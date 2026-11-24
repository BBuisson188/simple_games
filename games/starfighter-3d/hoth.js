import * as THREE from "three";
import { armor, glow, loft, makeCraftBatch, plateFinish } from "./craft-geometry.js";

export const HOTH_CENTER_Z = -330;
export const HOTH_REACH = 540;
export const HOTH_TARGETS = [
  { name: "Chin coupling", approach: "head-on", offset: [0, 54, 47], normal: [0, 0, 1] },
  { name: "Left armor vent", approach: "along its left flank", offset: [19, 64, 0], normal: [1, 0, 0] },
  { name: "Rear power cell", approach: "from behind", offset: [0, 66, -28], normal: [0, .12, -1] },
  { name: "Dorsal reactor hatch", approach: "from above", offset: [-1, 82, -5], normal: [0, 1, 0] }
];

const placements = [[-106, -305], [125, -420], [-235, -615], [205, -735]];
const up = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3(0, 0, 1);
const unitBox = [1, 1, 1];

export function hothSnow(x, z) {
  const ripples = 1.9 * Math.sin(x * .025 + z * .017) + 1.7 * Math.cos(z * .021 - x * .013);
  const sides = Math.max(0, Math.abs(x) - 370);
  const far = Math.max(0, -z - 830, z - 280);
  const mountains = Math.min(600, (sides + far * .8) * .61) *
    (.32 + .7 * Math.abs(Math.sin(x * .005 + z * .0037) * Math.cos(z * .007 - x * .0048)));
  return ripples + mountains + Math.min(30, mountains * .17) * Math.sin(x * .052 + z * .038);
}

function snowFinish(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec2 snowField;\n" + shader.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nsnowField = position.xz;");
    shader.fragmentShader = `
      varying vec2 snowField;
      float iceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float iceNoise(vec2 p){
        vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(iceHash(i),iceHash(i+vec2(1.,0.)),f.x),mix(iceHash(i+vec2(0.,1.)),iceHash(i+1.),f.x),f.y);
      }
    ` + shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec2 flow=vec2(snowField.x+snowField.y*.64,snowField.y-snowField.x*.64);
      float drift=iceNoise(flow*vec2(.025,.083));
      float grains=iceNoise(flow*vec2(.28,.63));
      float cut=smoothstep(.46,.68,iceNoise(snowField*.039)) * smoothstep(.43,.80,iceNoise(snowField*.16));
      float ripple=sin(flow.y*.9+drift*7.) * (1.-smoothstep(.4,1.6,fwidth(flow.y)));
      diffuseColor.rgb *= (.79+drift*.24+grains*.12+ripple*.039);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.25,.33,.44),cut*.32);
    `);
  };
  return material;
}

function buildLandscape(scene) {
  const snow = new THREE.PlaneGeometry(4600, 4200, 154, 142);
  snow.rotateX(-Math.PI / 2);
  snow.translate(0, 0, -320);
  const p = snow.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const white = new THREE.Color("#e0edf9"), blue = new THREE.Color("#7893ac"), tint = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = hothSnow(x, z);
    p.setY(i, y);
    const wind = .5 + .5 * Math.sin(x * .064 + z * .018) * Math.cos(z * .058 - x * .021);
    const pitch = Math.abs(hothSnow(x + 6, z) - y) / 6;
    tint.copy(white).lerp(blue, THREE.MathUtils.clamp(.09 * wind + pitch * .62, 0, .76));
    tint.toArray(colors, i * 3);
  }
  snow.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  snow.computeVertexNormals();
  scene.add(new THREE.Mesh(snow, snowFinish(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94 }))));
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3100, 28, 14), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 dir; void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 dir; void main(){
      vec3 d=normalize(dir); float h=max(0.,d.y);
      vec3 sky=mix(vec3(.83,.90,.98),vec3(.23,.43,.67),pow(h,.52));
      float sun=max(0.,dot(d,normalize(vec3(-.65,.28,-.68))));
      sky+=vec3(1.,.63,.33)*(.30*pow(sun,17.)+1.4*smoothstep(.9989,.9994,sun));
      float streak=sin(d.x*13.+sin(d.z*16.)*1.2+h*31.)+sin(d.z*37.+h*62.)*.35;
      sky=mix(sky,vec3(.85,.88,.94),.26*smoothstep(.41,1.10,streak)*smoothstep(.03,.19,h));
      gl_FragColor=vec4(sky,1.);
      #include <colorspace_fragment>
    }`
  }));
  scene.add(sky);
  return sky;
}

function cylinder(batch, material, radius, length, position, rotation, top = radius) {
  batch.put(material, new THREE.CylinderGeometry(top, radius, length, 10), position, rotation);
}

export function createHoth(scene, tuningRate = 1) {
  const sky = buildLandscape(scene);
  const armorSkin = plateFinish(armor("#a5b1bf", .35, .58, .04), 12, .65);
  const steel = armor("#586577", .37, .57, .04);
  const joints = armor("#273646", .48, .57, .03);
  const red = armor("#943b36", .28, .64, .05);
  const bunkerSnow = armor("#c6d9ed", .02, .95, .04);
  const lamps = glow("#ffe3ae"), weakLight = glow("#89ffdb"), amber = glow("#ff8851");
  const battlefield = makeCraftBatch();
  const batteries = [[-210, 70], [125, 55], [-46, -56], [245, -110]].map(([x, z], i) => {
    const y = hothSnow(x, z);
    battlefield.put(bunkerSnow, new THREE.CylinderGeometry(24, 66, 17, 8), [x, y + 1, z]);
    battlefield.put(steel, new THREE.CylinderGeometry(16, 25, 9, 6), [x, y + 8, z]);
    battlefield.box(joints, [23, 12, 5], [x, y + 5, z + 26]);
    battlefield.box(lamps, [14, 1.6, .4], [x, y + 9, z + 28.6]);
    for (const side of [-1, 1]) {
      battlefield.beam(armorSkin, [x + side * 18, y + 5, z + 19], [x + side * 15, y + 14, z + 21], 5);
      cylinder(battlefield, joints, 1.65, 22, [x + side * 3.5, y + 14, z - 9], [Math.PI * .44, 0, 0]);
    }
    if (i % 2 === 0) {
      battlefield.beam(joints, [x + 18, y + 9, z + 2], [x + 18, y + 42, z + 2], 1.0);
      battlefield.box(amber, [1.7, 1.7, 1.7], [x + 18, y + 42, z + 2]);
    }
    return new THREE.Vector3(x, y + 16, z - 20);
  });
  for (let i = 0; i < 25; i++) {
    const x = (i - 12) * 20, z = -63 + 26 * Math.sin(i * .33), y = hothSnow(x, z);
    battlefield.box(steel, [19, 7, 10], [x, y + 1, z]);
    battlefield.box(bunkerSnow, [20, 2.6, 12], [x, y + 4.5, z]);
    if (i % 3 === 0) battlefield.box(lamps, [7, 1, .3], [x, y + 2.3, z - 5.1]);
  }
  const shelterX = -127, shelterZ = -142, shelterY = hothSnow(shelterX, shelterZ);
  battlefield.put(bunkerSnow, new THREE.CylinderGeometry(30, 72, 25, 8, 1), [shelterX, shelterY + 4, shelterZ]);
  battlefield.box(armorSkin, [60, 18, 20], [shelterX, shelterY + 8, shelterZ + 31]);
  battlefield.box(joints, [43, 14, 2], [shelterX, shelterY + 6, shelterZ + 41]);
  battlefield.box(lamps, [20, 1.7, 2.2], [shelterX, shelterY + 13, shelterZ + 41]);
  for (const side of [-1, 1]) {
    battlefield.beam(steel, [shelterX + side * 36, shelterY, shelterZ + 47],
      [shelterX + side * 24, shelterY + 18, shelterZ + 41], 5, 9);
    battlefield.beam(joints, [shelterX + side * 17, shelterY + 15, shelterZ],
      [shelterX + side * 17, shelterY + 53 + side * 8, shelterZ], 1.3);
  }
  for (let i = 0; i < 33; i++) {
    const x = 332 * Math.sin(i * 2.399), z = -74 - i * 21;
    const y = hothSnow(x, z);
    battlefield.put(i % 4 === 0 ? steel : bunkerSnow, new THREE.DodecahedronGeometry(1), [x, y + .95, z], [.18, i, .2]);
    if (i % 4 === 0) battlefield.put(bunkerSnow, new THREE.CylinderGeometry(3.8, 9.5, 2.5, 7), [x + 3, y + .85, z]);
  }
  scene.add(battlefield.compile());
  const hit = new THREE.Vector3(), delta = new THREE.Vector3(), point = new THREE.Vector3();
  const subject = new THREE.Vector3();
  const tracerGeometry = new THREE.BoxGeometry(...unitBox);
  const tracerMaterials = [glow("#8cecff"), glow("#ff9d62")];
  const shadowGeometry = new THREE.PlaneGeometry(54, 86);
  shadowGeometry.rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: "varying vec2 xy; void main(){xy=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "varying vec2 xy; void main(){gl_FragColor=vec4(.18,.27,.38,.46*(1.-smoothstep(.19,1.,length(xy))));}"
  });
  const tracers = Array.from({ length: 12 }, (_, i) => {
    const mesh = new THREE.Mesh(tracerGeometry, tracerMaterials[i % 4 === 3 ? 1 : 0]);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, from: new THREE.Vector3(), to: new THREE.Vector3(), age: 2 };
  });
  let clock, volley, nextVolley, phase, remaining, finale;
  const walkers = placements.map(([x, z], i) => {
    const root = new THREE.Group();
    const chassis = new THREE.Group();
    root.add(chassis);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.position.set(3, .18, 6);
    root.add(shadow);
    scene.add(root);
    const hull = makeCraftBatch();
    hull.put(armorSkin, loft([[-26,0,0,10,9],[-17,0,0,17,14],[18,0,0,17,14],[24,0,0,13,10]], 8, .42), [0, 64, 0]);
    hull.box(joints, [29, 6, 40], [0, 51, -1]);
    hull.box(steel, [22, 4, 35], [0, 76, -2]);
    cylinder(hull, joints, 6.4, 15, [0, 63, 25], [Math.PI / 2, 0, 0]);
    hull.put(armorSkin, loft([[25,0,0,7.5,5],[31,0,0,9,6.8],[44,0,-1,7.5,4.7],[48,0,-2,5.2,3.2]], 8, .5), [0, 62, 0]);
    hull.box(joints, [10, 2.5, .6], [0, 62.8, 47.1]);
    hull.box(lamps, [7, .75, .7], [0, 62.8, 47.5]);
    for (const side of [-1, 1]) {
      hull.box(red, [.8, 8, 2.4], [side * 16.8, 64, 9]);
      for (let k = 0; k < 4; k++) hull.box(steel, [.9, 1.2, 12], [side * 16.4, 58.5 + k * 1.45, -9]);
      for (let k = 0; k < 3; k++) hull.box(lamps, [.7, .85, 2.2], [side * 16.3, 56, 7 + k * 5]);
    }
    chassis.add(hull.compile());
    const legs = [];
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const hip = new THREE.Group(), knee = new THREE.Group(), ankle = new THREE.Group();
      hip.position.set(side * 12.7, 51, end * 15);
      knee.position.y = -24;
      ankle.position.y = -22;
      hip.add(knee); knee.add(ankle); chassis.add(hip);
      for (const [index, part] of [hip, knee, ankle].entries()) {
        const batch = makeCraftBatch();
        if (index < 2) {
          batch.box(armorSkin, [index ? 8.1 : 9.8, index ? 23 : 25, 7.2], [0, -11.2, 0]);
          batch.box(steel, [4.2, 16, 1.5], [0, -11, 3.9]);
          cylinder(batch, steel, index ? 5.1 : 6.4, 10.5, [0, -1.1, 0], [0, 0, Math.PI / 2]);
          cylinder(batch, armorSkin, index ? 3.7 : 4.6, 11.4, [0, -1.1, 0], [0, 0, Math.PI / 2]);
        } else {
          batch.put(steel, new THREE.CylinderGeometry(5, 8, 5, 8), [0, -2, 1.3]);
          batch.box(armorSkin, [12, 2.2, 14], [0, -4, 2.5]);
        }
        part.add(batch.compile());
      }
      legs.push({ hip, knee, ankle, phase: (side === end ? 0 : Math.PI) + end * .27 });
    }
    const guns = [-1, 1].map((side, j) => {
      const model = new THREE.Group();
      model.position.set(side * 9.7, 59, 41);
      chassis.add(model);
      const hardware = makeCraftBatch();
      hardware.box(steel, [4, 5, 5], [0, 0, -1.4]);
      cylinder(hardware, joints, 1.5, 10, [0, 0, 5], [Math.PI / 2, 0, 0]);
      cylinder(hardware, armorSkin, 2, 2.8, [0, 0, 10], [Math.PI / 2, 0, 0]);
      hardware.box(lamps, [2, .5, 1], [0, 1.8, .4]);
      model.add(hardware.compile());
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 5), amber);
      muzzle.position.z = 12;
      model.add(muzzle);
      return { kind: "gun", model, muzzle, position: new THREE.Vector3(), barrel: new THREE.Vector3(), velocity: new THREE.Vector3(),
        radius: 5.8, j, heavy: true };
    });
    const weak = HOTH_TARGETS[i];
    const marker = new THREE.Mesh(new THREE.TorusGeometry(4.1, .64, 6, 16), weakLight);
    marker.position.fromArray(weak.offset);
    const normal = new THREE.Vector3(...weak.normal).normalize();
    marker.quaternion.setFromUnitVectors(forward, normal);
    chassis.add(marker);
    const port = { ...weak, kind: "port", model: marker, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
      normal, radius: 4.9, index: i };
    return { root, chassis, legs, guns, port, x, z, i, fall: -1, nextBurst: 0, hull: new THREE.Box3(), head: new THREE.Box3() };
  });
  const guns = walkers.flatMap((walker) => walker.guns);

  function positionWalker(walker, age) {
    const { root, chassis, port, i, x, z, legs } = walker;
    const walking = walker.fall < 0;
    const advance = Math.min(130, age * (2 + i * .27));
    root.position.set(x, hothSnow(x, z + advance), z + advance);
    const cycle = age * 1.28 + i * 1.5;
    const falling = THREE.MathUtils.smoothstep(walker.fall, .18, 2.7);
    chassis.position.y = Math.cos(cycle * 2) * .56 - 30 * falling;
    chassis.rotation.z = (i % 2 ? -1 : 1) * falling * 1.06;
    chassis.rotation.x = falling * (i % 2 ? -.33 : .43);
    for (const { hip, knee, ankle, phase: step } of legs) {
      const stride = Math.sin(cycle + step);
      hip.rotation.x = walking ? .23 * stride : .21 + falling * (stride > 0 ? 1 : -.65);
      knee.rotation.x = walking ? -.24 * Math.max(0, stride) : -.65 * falling;
      ankle.rotation.x = -(hip.rotation.x + knee.rotation.x) * .76;
    }
    root.updateMatrixWorld(true);
    port.model.getWorldPosition(port.position);
    port.velocity.set(0, 0, walking && advance < 130 ? 2 + i * .27 : 0);
    for (const gun of walker.guns) {
      gun.model.getWorldPosition(gun.position);
      gun.muzzle.getWorldPosition(gun.barrel);
      gun.velocity.copy(port.velocity);
    }
    walker.hull.min.set(x - 16, root.position.y + 50, root.position.z - 25);
    walker.hull.max.set(x + 16, root.position.y + 77, root.position.z + 23);
    walker.head.min.set(x - 8.2, root.position.y + 55.5, root.position.z + 38);
    walker.head.max.set(x + 8.2, root.position.y + 68.5, root.position.z + 48);
  }

  function reset() {
    phase = "active"; remaining = walkers.length; clock = volley = finale = 0; nextVolley = .2;
    for (const walker of walkers) {
      walker.fall = -1;
      walker.port.model.visible = true;
      for (const gun of walker.guns) {
        gun.model.visible = true; gun.hits = gun.charging = 0;
        gun.cooldown = 1.4 + walker.i * .61 + gun.j * .97;
        gun.armor = tuningRate < .9 ? 3 : 2;
      }
      positionWalker(walker, 0);
    }
    for (const tracer of tracers) { tracer.age = 2; tracer.mesh.visible = false; }
  }

  function canApproach(position, port) {
    return Boolean(port?.model.visible && delta.copy(position).sub(port.position).normalize().dot(port.normal) > .28);
  }

  function choosePort(position, aim) {
    let best, priority = -Infinity;
    for (const { port } of walkers) {
      if (!port.model.visible) continue;
      const distance = port.position.distanceTo(position);
      const facing = canApproach(position, port);
      const dot = delta.copy(port.position).sub(position).normalize().dot(aim);
      const quality = dot * 1.7 - distance / 1450 + (facing && dot > .74 ? .50 : 0);
      if (quality > priority) { priority = quality; best = port; }
    }
    return best;
  }

  function hitPort(port, burst) {
    const walker = walkers[port.index];
    if (walker.fall >= 0) return false;
    walker.fall = 0;
    walker.nextBurst = .18;
    walker.port.model.visible = false;
    for (const gun of walker.guns) { gun.model.visible = false; gun.charging = 0; }
    burst(port.position, 74);
    if (--remaining) return false;
    subject.copy(port.position);
    phase = "crashing";
    return true;
  }

  function hitGun(gun) {
    if (!gun.model.visible || ++gun.hits < gun.armor) return false;
    gun.model.visible = false;
    gun.charging = 0;
    return true;
  }

  function update(dt, ship, velocity, fire, burst) {
    if (phase === "defeated") return;
    clock += dt;
    if (phase === "crashing" && (finale += dt) >= 4.8) phase = "defeated";
    // One head cannon telegraphs its shot at a time, independent of the crossfire in the distance.
    let charging = guns.some((gun) => gun.charging > 0);
    for (const walker of walkers) {
      if (walker.fall >= 0) {
        walker.fall += dt;
        if (walker.fall >= walker.nextBurst && walker.fall < 3.7) {
          point.copy(walker.root.position).add(delta.set(Math.sin(walker.fall * 8) * 12, 46 - walker.fall * 6, Math.cos(walker.fall * 6) * 19));
          burst(point, 49);
          walker.nextBurst += .35;
        }
        positionWalker(walker, walker.impactAge ??= clock);
        continue;
      }
      positionWalker(walker, clock);
      for (const gun of walker.guns) {
        if (!gun.model.visible) continue;
        const inRange = gun.position.distanceToSquared(ship.position) < 445 ** 2;
        if (inRange) {
          point.copy(ship.position).addScaledVector(velocity, .17);
          gun.model.lookAt(point);
          gun.muzzle.getWorldPosition(gun.barrel);
        }
        gun.cooldown -= dt;
        if (gun.charging > 0) {
          gun.charging = Math.max(0, gun.charging - dt);
          if (!gun.charging) {
            gun.cooldown = (3.4 + gun.j * .36) * tuningRate;
            if (inRange) fire({ ...gun, position: gun.barrel }, point, 2, 222);
          }
        } else if (inRange && !charging && gun.cooldown <= 0) {
          gun.charging = .62;
          charging = true;
        }
        gun.muzzle.visible = gun.charging > 0;
      }
    }
    const active = walkers.filter((walker) => walker.fall < 0);
    if (active.length && clock >= nextVolley) {
      const index = volley++ % tracers.length, tracer = tracers[index];
      const walker = active[volley % active.length], battery = batteries[volley % batteries.length];
      tracer.from.copy(index % 4 === 3 ? walker.port.position : battery);
      tracer.to.copy(index % 4 === 3 ? battery : walker.port.position);
      tracer.to.x += 13 * Math.sin(volley * 6);
      tracer.to.y = Math.max(11, tracer.to.y + 14 * Math.cos(volley));
      tracer.age = 0; nextVolley = clock + .32;
    }
    for (const tracer of tracers) {
      tracer.age += dt;
      tracer.mesh.visible = tracer.age < 1;
      if (!tracer.mesh.visible) continue;
      tracer.mesh.position.lerpVectors(tracer.from, tracer.to, tracer.age);
      delta.copy(tracer.to).sub(tracer.from).normalize();
      tracer.mesh.quaternion.setFromUnitVectors(up, delta);
      tracer.mesh.scale.set(2.3, 34, 2.3);
    }
  }

  function distanceToHull(ray, limit = HOTH_REACH) {
    let closest = Infinity;
    for (const walker of walkers) {
      if (walker.fall >= 0) continue;
      for (const box of [walker.hull, walker.head]) {
        if (box.containsPoint(ray.origin)) return 0;
        if (ray.intersectBox(box, hit)) closest = Math.min(closest, hit.distanceTo(ray.origin));
      }
    }
    const reach = Math.min(closest, limit);
    const stride = Math.min(14, reach / 4);
    if (stride <= 0) return reach;
    for (let t = Math.min(2, reach); t <= reach; t = Math.min(t + stride, reach)) {
      ray.at(t, point);
      if (point.y < hothSnow(point.x, point.z)) return t;
      if (t === reach) break;
    }
    return closest;
  }

  function separateShip(position) {
    const ground = hothSnow(position.x, position.z) + 4.2;
    if (position.y < ground) { position.y = ground; return true; }
    for (const walker of walkers) {
      if (walker.fall < 0 && (walker.hull.containsPoint(position) || walker.head.containsPoint(position))) {
        position.y = walker.hull.max.y + 5;
        return true;
      }
    }
    return false;
  }

  reset();
  return { name: "Hoth walkers", subject, guns, walkers, reset() { for (const walker of walkers) delete walker.impactAge; reset(); },
    choosePort, canApproach, hitPort, hitGun, update, distanceToHull, separateShip,
    draw(camera) { sky.position.copy(camera.position); },
    get phase() { return phase; }, get remaining() { return remaining; }
  };
}
