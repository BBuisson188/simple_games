import * as THREE from "three";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
import { mergeVertices } from "./vendor/utils/BufferGeometryUtils.js";
import { CHARGE_TIME } from "./patrol.js";

const MODEL = new URL("../../assets/starfighter-3d/kestrel.glb", import.meta.url).href;

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createSky(scene) {
  const group = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2900, 28, 18), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 direction;
      void main() {
        vec3 ray = normalize(direction);
        float ribbon = abs(dot(ray, normalize(vec3(-.24, .87, .43))));
        float width = exp(-13.0 * ribbon * ribbon);
        float filaments = .56 + .16 * sin(19.0 * ray.x + 11.0 * ray.y)
          + .13 * sin(33.0 * ray.z - 13.0 * ray.x + 3.0 * sin(8.0 * ray.y));
        float glow = pow(max(0.0, dot(ray, normalize(vec3(-.49, .38, -.76)))), 9.0);
        vec3 night = vec3(.003, .006, .016);
        vec3 blue = vec3(.012, .047, .078);
        vec3 violet = vec3(.038, .019, .067);
        vec3 cloud = mix(blue, violet, smoothstep(-.8, .55, ray.x));
        gl_FragColor = vec4(night + cloud * width * filaments + vec3(.004, .018, .023) * glow, 1.0);
        #include <colorspace_fragment>
      }
    `
  }));
  sky.renderOrder = -10;
  group.add(sky);
  const random = seededRandom(713);
  for (const [count, size, opacity] of [[1150, 1.20, 0.73], [220, 1.89, 0.93], [60, 2.8, 1.0]]) {
    const points = [];
    const colors = [];
    for (let i = 0; i < count; i++) {
      const height = random() * 2 - 1;
      const turn = random() * Math.PI * 2;
      const r = Math.sqrt(1 - height * height) * 2650;
      points.push(r * Math.cos(turn), height * 2650, r * Math.sin(turn));
      const blue = random();
      colors.push(0.69 + 0.29 * blue, 0.76 + 0.2 * blue, 1 - 0.18 * (1 - blue));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    group.add(new THREE.Points(geometry, new THREE.PointsMaterial({
      size, sizeAttenuation: false, transparent: true, opacity, vertexColors: true, depthWrite: false, toneMapped: false, fog: false
    })));
  }
  scene.add(group);
  return group;
}

function createRocks(scene) {
  const random = seededRandom(93087);
  const rocks = [];
  const clusters = [];
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.91, metalness: 0.12 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 rockPosition;\n" + shader.vertexShader
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nrockPosition = position;");
    shader.fragmentShader = `
      varying vec3 rockPosition;
      float sfRockHash(vec3 p) {
        p = fract(p * vec3(.1031, .11369, .13787));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float sfRockNoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(sfRockHash(i), sfRockHash(i + vec3(1,0,0)), f.x),
              mix(sfRockHash(i + vec3(0,1,0)), sfRockHash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(sfRockHash(i + vec3(0,0,1)), sfRockHash(i + vec3(1,0,1)), f.x),
              mix(sfRockHash(i + vec3(0,1,1)), sfRockHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
    ` + shader.fragmentShader.replace(
      "#include <color_fragment>", `#include <color_fragment>
        float mottling = 2.0 * sfRockNoise(rockPosition * 17.0) - 1.0;
        float mineral = 2.0 * sfRockNoise(rockPosition * 68.0) - 1.0;
        float roughGrain = (1.0 - smoothstep(.035, .19, length(fwidth(rockPosition)))) * mineral;
        diffuseColor.rgb *= 1.0 + .23 * mottling + .19 * roughGrain;`
    );
  };
  for (let type = 0; type < 4; type++) {
    const base = new THREE.IcosahedronGeometry(1, type < 2 ? 6 : 4);
    base.deleteAttribute("normal");
    base.deleteAttribute("uv");
    const geometry = mergeVertices(base);
    base.dispose();
    const p = geometry.getAttribute("position");
    const colors = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const crest = Math.sin(x * 8 + y * 12 + type) * Math.cos(z * 9 + type * 2);
      const broken = Math.cos((x + z) * 19 - y * 7 + type) * 0.045;
      const dent = Math.sin(x * 5 - z * 6 + type * 2) * 0.17 + crest * 0.11 + broken;
      p.setXYZ(i, x * (1 + dent), y * (0.83 + dent), z * (0.95 + dent * 1.4));
      const tint = 0.129 + 0.045 * crest + 0.020 * Math.sin(x * 25 + y * 17 - z * 20);
      colors.push(tint * (1.01 + type * 0.028), tint * 0.96, tint * (1.08 - type * 0.035));
    }
    geometry.computeVertexNormals();
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const instances = new THREE.InstancedMesh(geometry, material, 27);
    instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    clusters.push(instances);
    scene.add(instances);
  }
  const hero = [
    [-78, -37, 91, 37], [68, -52, 58, 26], [123, -37, -169, 52], [-132, -50, -209, 54],
    [20, -82, -156, 40], [-88, -120, -399, 61], [93, -103, -472, 58]
  ];
  for (let i = 0; i < 108; i++) {
    const special = hero[i];
    const x = special?.[0] ?? (random() - 0.5) * 1380;
    const y = special?.[1] ?? -52 - random() * 184;
    const z = special?.[2] ?? 355 - random() * 1550;
    const radius = special?.[3] ?? 5 + 39 * random() ** 2.15;
    const rotation = new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rocks.push({ position: new THREE.Vector3(x, y, z), radius, rotation, turn: (random() - 0.5) * 0.24 });
  }
  const dummy = new THREE.Object3D();
  function draw(time) {
    for (const [i, rock] of rocks.entries()) {
      dummy.position.copy(rock.position);
      dummy.rotation.set(rock.rotation.x, rock.rotation.y + rock.turn * time, rock.rotation.z);
      dummy.scale.setScalar(rock.radius);
      dummy.updateMatrix();
      clusters[i % 4].setMatrixAt(Math.floor(i / 4), dummy.matrix);
    }
    for (const cluster of clusters) cluster.instanceMatrix.needsUpdate = true;
  }
  draw(0);
  return { rocks, draw };
}

function createDrone(scene, index, texture) {
  const drone = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: "#374555", roughness: 0.41, metalness: 0.28 });
  const amber = new THREE.MeshStandardMaterial({ color: index === 1 ? "#cb5348" : "#d99542", roughness: 0.42, metalness: 0.24 });
  const signal = new THREE.MeshBasicMaterial({ color: "#ffab63", toneMapped: false });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.6, 4.4, 6), dark);
  core.rotation.x = -Math.PI / 2;
  drone.add(core);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.02, 12, 6), signal);
  canopy.scale.set(0.84, 0.34, 0.56);
  canopy.position.set(0, 0.2, -2.24);
  drone.add(canopy);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.58, 1.75), amber);
    wing.rotation.y = side * 0.63;
    wing.rotation.z = side * (index === 1 ? 0.42 : 0.18);
    wing.position.set(side * 2.15, 0, 0.66);
    drone.add(wing);
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.65, 2.0, 9), dark);
    engine.position.set(side * 2.67, 0.02, 1.28);
    engine.rotation.x = Math.PI / 2;
    const lights = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 7), signal);
    lights.position.set(side * 2.67, 0, 2.33);
    drone.add(engine, lights);
  }
  const charge = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  }));
  charge.position.z = -2.65;
  charge.visible = false;
  drone.add(charge);
  drone.userData.charge = charge;
  scene.add(drone);
  return drone;
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const center = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  center.addColorStop(0, "#fff1d8");
  center.addColorStop(0.19, "#fb563bd7");
  center.addColorStop(0.47, "#f8384338");
  center.addColorStop(1, "#f8384300");
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function disposeFlightMaterials(scene) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of [object.material].flat()) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    texture.dispose();
    texture.source?.data?.close?.();
  }
}

export async function loadKestrel() {
  return (await new GLTFLoader().loadAsync(MODEL)).scene;
}

export function createFlightScene(canvas, kestrel) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#02050e");
  scene.fog = new THREE.FogExp2("#0a1122", 0.00065);
  const camera = new THREE.PerspectiveCamera(61, 1, 0.2, 3600);
  const sky = createSky(scene);
  const belt = createRocks(scene);
  const ship = new THREE.Group();
  ship.add(kestrel);
  scene.add(ship);
  const ambient = new THREE.HemisphereLight("#aed2ff", "#51445e", 1.55);
  const key = new THREE.DirectionalLight("#ffe5c2", 2.8);
  key.position.set(-100, 145, 75);
  const rim = new THREE.DirectionalLight("#80b5fc", 1.9);
  rim.position.set(65, 25, -110);
  scene.add(ambient, key, rim);

  const texture = glowTexture();
  const drones = Array.from({ length: 3 }, (_, index) => createDrone(scene, index, texture));
  const rings = [];
  for (const name of ["Thruster_L", "Thruster_R"]) {
    const socket = kestrel.getObjectByName(name);
    if (!socket) continue;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.82, fog: false
    }));
    halo.position.z = 0.27;
    halo.scale.setScalar(2.1);
    socket.add(halo);
    rings.push(halo);
  }
  const fireGeometry = new THREE.CylinderGeometry(0.12, 0.23, 7.2, 6);
  const fireMaterial = new THREE.MeshBasicMaterial({ color: "#8bfbff", toneMapped: false });
  function makeBoltPool(count, geometry, material) {
    return Array.from({ length: count }, () => {
      const bolt = new THREE.Mesh(geometry, material);
      bolt.visible = false;
      scene.add(bolt);
      return bolt;
    });
  }
  const boltMeshes = makeBoltPool(34, fireGeometry, fireMaterial);
  const hostileMeshes = makeBoltPool(12,
    new THREE.CylinderGeometry(0.26, 0.48, 9.1, 6),
    new THREE.MeshBasicMaterial({ color: "#ff654a", toneMapped: false, fog: false }));
  function drawBolts(meshes, states) {
    for (const [i, mesh] of meshes.entries()) {
      const state = states[i];
      mesh.visible = Boolean(state);
      if (state) {
        mesh.position.copy(state.position);
        mesh.quaternion.copy(state.orientation);
      }
    }
  }
  const sparkData = new Float32Array(24 * 3);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkData, 3).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({
    color: "#ffc56e", size: 1.7, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  sparks.frustumCulled = false;
  sparks.visible = false;
  scene.add(sparks);

  function resize(scale = 1) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35, Math.sqrt(1340000 / (width * height))) * scale);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function paint(time, boosting, bolts, hostileBolts, enemies, burst) {
    sky.position.copy(camera.position);
    belt.draw(time);
    for (const ring of rings) {
      ring.scale.setScalar(boosting ? 3.04 + Math.sin(time * 35) * 0.24 : 2.06);
      ring.material.opacity = boosting ? 1 : 0.74;
    }
    drawBolts(boltMeshes, bolts);
    drawBolts(hostileMeshes, hostileBolts);
    for (const enemy of enemies) {
      const charge = enemy.model.userData.charge;
      charge.visible = enemy.charging > 0;
      if (charge.visible) charge.scale.setScalar(4 + 15 * (1 - enemy.charging / CHARGE_TIME));
    }
    sparks.visible = Boolean(burst);
    if (burst) {
      sparks.material.opacity = 1 - burst.age / 0.75;
      sparks.material.size = 1.12 + burst.age * 2.3;
      burst.velocity.forEach((velocity, i) => {
        sparkData[i * 3] = burst.origin.x + velocity.x * burst.age;
        sparkData[i * 3 + 1] = burst.origin.y + velocity.y * burst.age;
        sparkData[i * 3 + 2] = burst.origin.z + velocity.z * burst.age;
      });
      sparkGeometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function dispose() {
    disposeFlightMaterials(scene);
    renderer.dispose();
  }

  return { camera, drones, ship, rocks: belt.rocks, paint, resize, dispose };
}
