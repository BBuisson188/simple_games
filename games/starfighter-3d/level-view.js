import * as THREE from "three";
import { createCarrierView } from "./carrier-view.js";
import { createBlastPool, splitArmor } from "./aftermath.js";

const SCREEN = `varying vec2 pixel; void main(){pixel=position.xy;gl_Position=vec4(position.xy,0.0,1.0);}`;

function bakePlanet(renderer) {
  // Bake once. In flight the planet only needs a few filtered texture samples per pixel.
  const width = 2048, height = 1024;
  const map = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    wrapS: THREE.RepeatWrapping, minFilter: THREE.LinearFilter
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({ toneMapped: false, depthTest: false, depthWrite: false, vertexShader: SCREEN,
    fragmentShader: `
      varying vec2 pixel;
      float hash(vec3 p) {
        p = fract(p * .3183099 + vec3(.147,.295,.183));
        p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p) {
        float result=0.0, amp=.51;
        for(int i=0;i<6;i++) { result += amp*noise(p); p=p*2.07+vec3(2.7,4.2,1.8); amp*=.49; }
        return result;
      }
      void main() {
        float lon=(pixel.x*.5+.5)*6.2831853, lat=pixel.y*1.5707963;
        vec3 n=vec3(cos(lon)*cos(lat),sin(lat),sin(lon)*cos(lat));
        vec3 p=n*3.6+vec3(8.4,2.15,-3.5);
        vec3 bend=vec3(fbm(p*1.18+7.9),fbm(p*1.12-4.7),fbm(p*1.23+vec3(0,5,2)))-.5;
        float terrain=fbm(p+bend*1.5), shore=.505;
        float coast=clamp(fwidth(terrain)*.72,.001,.017);
        float land=smoothstep(shore-coast,shore+coast,terrain);
        float shelf=smoothstep(shore-.11,shore,terrain);
        vec3 water=mix(vec3(.012,.047,.124),vec3(.019,.123,.204),shelf*.64);
        water=mix(water,vec3(.045,.255,.267),pow(shelf,10.0)*.68);
        float soil=fbm(n*25.0+vec3(8,3,10));
        float hills=smoothstep(.53,.71,terrain+(.5-abs(noise(p*16.0)-.5))*soil*.15);
        vec3 forest=mix(vec3(.023,.112,.041),vec3(.111,.235,.060),smoothstep(.26,.69,soil));
        forest=mix(forest,vec3(.297,.288,.167),hills*.61);
        float snow=smoothstep(.79,.96,abs(n.y)+soil*.13)*smoothstep(.46,.58,terrain);
        forest=mix(forest,vec3(.58,.67,.65),snow*.75);
        vec3 atmosphere=n*vec3(5.2,9.7,5.2)+vec3(.8,-1.0,9.1);
        vec3 wisps=vec3(noise(atmosphere*.8),noise(atmosphere*.84+4.2),noise(atmosphere*.72-6.1));
        float cloud=fbm(atmosphere+wisps*2.5);
        float vapor=smoothstep(.52,.76,cloud)*.86+smoothstep(.46,.64,cloud)*.10;
        gl_FragColor=vec4(mix(water,forest,land),vapor);
      }
    `
  });
  const bake = new THREE.Scene();
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  bake.add(quad);
  const previous = renderer.getRenderTarget();
  let pixels = new Uint8Array(width * height * 4);
  let valid = false;
  try {
    for (let attempt = 0; attempt < 2 && !valid; attempt++) {
      if (attempt) renderer.resetState();
      renderer.setRenderTarget(map);
      renderer.render(bake, new THREE.Camera());
      renderer.readRenderTargetPixels(map, 0, 0, width, height, pixels);
      const samples = [[.17, .31], [.34, .72], [.51, .48], [.76, .27], [.88, .62]];
      valid = samples.some(([u, v]) => {
        const offset = (Math.floor(v * height) * width + Math.floor(u * width)) * 4;
        const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
        return r + g + b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 9 && pixels[offset + 3] < 250;
      });
    }
  } finally {
    renderer.setRenderTarget(previous);
    map.dispose();
    geometry.dispose();
    material.dispose();
  }
  let w = width, h = height;
  if (!valid) {
    // Never substitute an empty target (opaque alpha is interpreted as solid cloud).
    w = 512; h = 256; pixels = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const v = y / (h - 1) * Math.PI - Math.PI / 2;
      for (let x = 0; x < w; x++) {
        const u = x / w * Math.PI * 2;
        const terrain = Math.cos(u * 3 + 2 * Math.sin(v * 4)) + .52 * Math.sin(v * 8 + u * 4) + .29 * Math.cos(u * 11 - v * 9);
        const land = THREE.MathUtils.smoothstep(terrain, -.09, .13);
        const haze = Math.sin(u * 9 + v * 18 + 2.3 * Math.sin(v * 7)) * .65 + Math.sin(u * 17 - v * 32) * .35;
        const p = (y * w + x) * 4;
        pixels.set([9 + land * 18, 26 + land * 36, 52 - land * 32, Math.max(0, haze - .18) * 156], p);
      }
    }
  }
  // A normal texture can be uploaded again after WebGL restoration. Render-target contents cannot.
  const texture = new THREE.DataTexture(pixels, w, h, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createVerdantPlanet(scene, renderer) {
  const map = bakePlanet(renderer);
  const position = new THREE.Vector3(-255, -1350, -2160);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1460, 96, 64), new THREE.ShaderMaterial({
    uniforms: { atlas: { value: map }, drift: { value: 0 } }, toneMapped: false,
    vertexShader: `
      varying vec2 geography;
      varying vec3 surfacePoint;
      varying vec3 eye;
      void main() {
        geography=uv;
        surfacePoint=normal;
        eye=(modelMatrix*vec4(position,1.0)).xyz-cameraPosition;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        vec4 depthPlane=projectionMatrix*vec4(0.0,0.0,-2480.0,1.0);
        gl_Position.z=depthPlane.z/depthPlane.w*gl_Position.w;
      }
    `,
    fragmentShader: `
      varying vec2 geography;
      varying vec3 surfacePoint;
      varying vec3 eye;
      uniform sampler2D atlas;
      uniform float drift;
      void main() {
        vec3 n=normalize(surfacePoint), view=-normalize(eye), light=normalize(vec3(-.42,.54,.68));
        vec3 surface=texture2D(atlas,geography).rgb;
        vec2 cloudUV=geography+vec2(drift,0.0);
        float clouds=texture2D(atlas,cloudUV).a;
        float shadow=texture2D(atlas,cloudUV+vec2(-.003,.003)).a;
        float sun=max(0.0,dot(n,light));
        float ocean=smoothstep(.016,.074,surface.b-surface.g);
        float glint=pow(max(0.0,dot(n,normalize(light+view))),48.0)*ocean*(1.0-clouds);
        vec3 base=surface*(1.0-shadow*.37)+vec3(.33,.42,.49)*glint;
        base=mix(base,vec3(.66,.76,.80),clouds*.9);
        float limb=1.0-clamp(dot(n,view),0.0,1.0);
        vec3 scatter=(pow(limb,3.5)*vec3(.035,.15,.33)+pow(limb,13.0)*vec3(.09,.32,.50))*(.27+.73*sun);
        gl_FragColor=vec4(base*(.08+.88*pow(sun,.76))+scatter,1.0);
        #include <colorspace_fragment>
      }
    `
  }));
  planet.renderOrder = -9;
  planet.frustumCulled = false;
  scene.add(planet);
  return {
    draw(time, camera) {
      planet.position.copy(camera.position).add(position);
      planet.material.uniforms.drift.value = time * .00012;
    },
    dispose() { map.dispose(); }
  };
}

function createHyperspace(scene) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { time: { value: 0 }, aspect: { value: 1 } },
    vertexShader: SCREEN,
    fragmentShader: `
      varying vec2 pixel; uniform float time; uniform float aspect;
      float hash(float n){return fract(sin(n*17.731)*19452.17);}
      void main(){
        vec2 p=pixel*vec2(aspect,1.0); float r=length(p);
        float bearing=(atan(p.y,p.x)+3.141593)*21.0;
        float lane=floor(bearing); float seed=hash(lane+3.0);
        float speed=1.0+seed*1.5; float drop=smoothstep(1.72,1.91,time);
        float streak=fract(r*(.68+drop*1.15)-time*speed+seed);
        float line=1.0-smoothstep(.016,.10,abs(fract(bearing)-(.24+seed*.52)));
        float spark=line*smoothstep(.02,.12,streak)*(1.0-smoothstep(.18,.60,streak))*smoothstep(.07,.56,r);
        float flash=exp(-pow((time-1.86)*29.0,2.0))*exp(-r*1.7);
        if(time<1.86){
          vec3 tunnel=vec3(.017,.035,.095)+vec3(.13,.36,.68)*exp(-r*2.3);
          gl_FragColor=vec4(tunnel+vec3(.55,.84,1.0)*spark+vec3(.13,.30,.55)*flash,1.0);
        }else{
          // Hard reveal, with a few short-lived star trails over the live scene.
          float trail=(1.0-smoothstep(1.86,2.0,time))*spark;
          gl_FragColor=vec4(vec3(.52,.83,1.0),clamp(trail*.72+flash*.14,0.0,1.0));
        }
      }
    `
  }));
  mesh.renderOrder = 100;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return (time, camera) => {
    mesh.visible = time < 2;
    mesh.material.uniforms.time.value = time;
    mesh.material.uniforms.aspect.value = camera.aspect;
  };
}

// Each wreck has its own pose, fire locations, drift and breakup timing.
export function createShipBreakup(view, texture, pattern = 0, duration = 5) {
  const { root, hull } = view;
  const finale = pattern >= 2;
  const fireworks = finale ? createBlastPool(root.parent, texture) : null;
  const sections = finale ? splitArmor(view.armorShell) : [];
  for (const { group } of sections) hull.add(group);
  const sites = pattern === 1 ? [[-55, 21, -25], [60, -23, 65], [5, 54, 37], [-76, -19, 52]]
    : pattern === 3 ? [[46, 10, -28], [-56, 8, -14], [0, 13, -20], [30, -9, 46]]
      : [[78, 24, 28], [-63, 27, 62], [12, -27, -53], [49, -22, 41]];
  const fires = sites.map((site, i) => {
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: i === 1 ? "#ffa96a" : "#ffda9c", transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    fire.position.set(...site).multiplyScalar(1 / (view.hullScale ?? 1));
    fire.visible = false;
    hull.add(fire);
    return fire;
  });
  const origin = new THREE.Vector3();
  const facing = new THREE.Quaternion();
  const twist = new THREE.Quaternion();
  const worldFire = new THREE.Vector3();
  const angles = new THREE.Euler();
  const fragmentGeometry = new THREE.IcosahedronGeometry(1, 0);
  const fragmentMaterial = new THREE.MeshStandardMaterial({ color: "#363741", emissive: "#78321c", emissiveIntensity: .4, roughness: .87 });
  const fragments = Array.from({ length: 13 }, (_, i) => {
    const mesh = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
    const angle = i * 2.399 + pattern * 1.7;
    const site = sites[i % sites.length];
    const size = 1.8 + (i * 13 % 17) * .43;
    mesh.scale.set(size * 1.45, size * .45, size);
    root.add(mesh);
    return { mesh, origin: new THREE.Vector3(...site), velocity: new THREE.Vector3(Math.cos(angle) * (13 + i * 2),
      -3 + Math.sin(angle) * (9 + i * .8), -18 + i * 3.3), delay: .22 + (i % 6) * .46 };
  });
  let nextBurst = 0;
  function reset() {
    view.armorShell.visible = true;
    fireworks?.reset();
    for (const { group, anchor } of sections) {
      group.visible = false;
      group.position.copy(anchor);
      group.quaternion.identity();
    }
    fires.forEach((fire) => { fire.visible = false; });
    fragments.forEach(({ mesh }) => { mesh.visible = false; });
    nextBurst = 0;
  }
  function start() {
    reset();
    origin.copy(root.position);
    facing.copy(root.quaternion);
    root.visible = hull.visible = true;
    view.warp.visible = false;
    view.portLight.visible = false;
    for (const gun of view.guns) gun.muzzle.visible = false;
  }
  function draw(age, burst) {
    fireworks?.draw(age);
    if (age >= duration) {
      if (root.visible) { burst(root.position, 114); fireworks?.pop(root.position, 130, age); }
      root.visible = false;
      return true;
    }
    const t = age / duration;
    const fall = t * (.4 + .6*t);
    const d = pattern === 1 ? -1 : 1;
    root.position.copy(origin).add(worldFire.set(d * fall * (pattern === 2 ? 49 : 110), -fall * (pattern === 2 ? 69 : 134), -(t * 30 + fall * 28)));
    twist.setFromEuler(angles.set(-t * (pattern === 1 ? .75 : .27), d * t * .41, d * t * .79));
    root.quaternion.copy(facing).multiply(twist);
    if (finale && t >= .33) {
      if (view.armorShell.visible) {
        fireworks.pop(root.position, 113, age);
        view.armorShell.visible = false;
      }
      for (const [i, { group, anchor }] of sections.entries()) {
        const peel = Math.max(0, t - .33 - i * .035);
        group.visible = true;
        group.position.copy(anchor).add(worldFire.set((i - 2) * peel * 41, (i % 2 ? 1 : -1) * peel * 24, (i < 3 ? -1 : 1) * peel * (49 + i * 6)));
        group.rotation.set(peel * (.8 + i * .25), peel * (i - 2) * .51, peel * (i % 2 ? .8 : -.7));
      }
    }
    fires.forEach((fire, i) => {
      fire.visible = true;
      const pulse = .64 + .19 * Math.sin(age * (13.8 + i) + i * 4) + .14 * Math.sin(age * 29 + i * 5);
      fire.material.opacity = Math.min(1, .43 + pulse * .54 + t * .13);
      fire.scale.set((29 + i * 3 + t * 18) * pulse, (38 + i * 4 + t * 21) * pulse, 1);
      fire.material.rotation = (pattern === 1 ? -.44 : .53) + i * .19;
    });
    for (const [i, part] of fragments.entries()) {
      const elapsed = age - part.delay;
      part.mesh.visible = elapsed >= 0 && elapsed < (pattern === 2 ? 4 : 7) + (i % 3);
      if (!part.mesh.visible) continue;
      part.mesh.position.copy(part.origin).addScaledVector(part.velocity, elapsed);
      part.mesh.rotation.set(elapsed * (.7 + i * .13), elapsed * .8, elapsed * 1.1);
    }
    if (age >= nextBurst) {
      const i = Math.floor(nextBurst * 4.7 + pattern) % fires.length;
      fires[i].getWorldPosition(worldFire);
      burst(worldFire, t > .84 ? 105 : 55);
      fireworks?.pop(worldFire, 48 + t * 57, age);
      nextBurst = age + (.43 + i * .17) * (1.1 - t * .5);
    }
    return false;
  }
  return { start, draw, reset };
}

export const WINGMEN = 7;
const WINGMEN_TUNING = {
  Rookie: { cooldown: 2.65, accuracy: .22, pursuit: 1.25 },
  Standard: { cooldown: 2.02, accuracy: .39, pursuit: 1.5 },
  Ace: { cooldown: 1.52, accuracy: .54, pursuit: 1.8 }
};

export function wingmanSkill(friendly, hostile) {
  return friendly > hostile ? "Rookie" : friendly === hostile ? "Standard" : "Ace";
}

export function createFleetBattle(scene, texture, playerFighter) {
  const hyperspace = createHyperspace(scene);
  const wrecks = [0, 1].map((i) => {
    const view = createCarrierView(scene, texture, "longbow");
    return { view, breakup: createShipBreakup(view, texture, i, 15) };
  });
  const colors = ["#69d7ff", "#fa6653"];
  const rays = colors.map((color) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.15, .48, 13, 5), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });
  const capacity = 48;
  const shotMeshes = Array.from({ length: capacity }, (_, i) => {
    const mesh = rays[i % 2].clone();
    scene.add(mesh);
    return mesh;
  });
  const mates = Array.from({ length: WINGMEN }, (_, i) => {
    const ship = playerFighter.clone();
    scene.add(ship);
    return { ship, i, timer: 0, down: -1, warn: -1 };
  });
  const shots = [];
  const end = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const nose = new THREE.Vector3(0, 0, -1);
  const face = new THREE.Quaternion();
  let clock = 0;
  let nextCasualty = 0;
  let bossAge = 0;
  let bossSequence = false;
  let skill = "Ace";
  let seed = 14;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const alive = (mate) => mate.ship.visible && mate.down < 0;
  function reset() {
    clock = nextCasualty = bossAge = 0;
    bossSequence = false;
    skill = "Ace";
    seed = 14;
    shots.length = 0;
    shotMeshes.forEach((mesh) => { mesh.visible = false; });
    wrecks.forEach(({ view, breakup }, i) => {
      view.root.position.set(i ? 381 : -395, i ? 16 : 170, i ? -696 : -594);
      view.root.rotation.set(i ? .17 : -.24, i ? -.83 : .68, i ? -.16 : .32);
      breakup.start();
      breakup.draw(0, () => {});
    });
    for (const { ship, i } of mates) {
      const openings = [[-214, 39, -123], [197, 71, -201], [-116, 113, -261], [22, 9, -101],
        [98, -38, -273], [-257, -36, -302], [231, 138, -371]];
      ship.position.set(...openings[i]);
      ship.quaternion.identity();
      ship.visible = true;
    }
    mates.forEach((mate, i) => { mate.timer = .22 + i * .29; mate.down = mate.warn = -1; });
  }
  let battleCue;
  function shoot(from, to, hostile, hit, target) {
    if (shots.length >= capacity / 2) {
      if (!hit) return;
      shots.shift();
    }
    const start = from.clone();
    battleCue?.(hostile ? "hostile" : "allied", start, .45);
    const velocity = to.clone().sub(from).normalize();
    shots.push({ start, velocity, hostile, age: 0, length: from.distanceTo(to), hit, target,
      batch: target?.batch, member: target?.member });
  }
  function update(dt, patrol, carrier, playerPosition, burst, cue) {
    battleCue = cue;
    clock += dt;
    wrecks.forEach(({ breakup }) => breakup.draw(clock, burst));
    const live = patrol.enemies.filter((enemy) => enemy.model.visible);
    const standing = mates.filter(alive);
    const bossActive = carrier.phase === "active";
    const bossRush = bossActive || carrier.phase === "arriving";
    if (bossRush && !bossSequence) {
      bossSequence = true;
      for (const mate of standing) mate.warn = -1;
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].hit) shots.splice(i, 1);
    }
    if (bossActive) bossAge += dt;
    skill = wingmanSkill(standing.length + 1, live.length);
    const tuning = WINGMEN_TUNING[skill];
    if (!bossRush && live.length && standing.length + 1 - live.length > 2 && clock >= nextCasualty) {
      const mate = standing.find(({ warn }) => warn < 0);
      if (mate) {
        mate.warn = clock;
        nextCasualty = clock + 1.38;
        // Pick a survivor close enough that its cannon bolt reads as the cause of the loss.
        const attacker = live.reduce((best, foe) => foe.position.distanceToSquared(mate.ship.position)
          < best.position.distanceToSquared(mate.ship.position) ? foe : best);
        shoot(attacker.position, mate.ship.position, true, mate);
      }
    }
    for (const mate of mates) {
      const { ship, i } = mate;
      if (!ship.visible) continue;
      if (mate.down >= 0) {
        const tumble = clock - mate.down;
        ship.rotation.z += dt * 4;
        ship.position.y -= dt * (31 + tumble * 40);
        ship.position.z -= dt * 32;
        if (tumble > .77) { ship.visible = false; burst(ship.position, 42); }
        continue;
      }
      const foe = live[i % live.length];
      const phase = clock * (.65 + i * .045) + i * 1.5;
      if (bossRush) {
        end.copy(carrier.port.position).add(delta.set((i - 3) * 12, 11 + i % 3 * 17, 0));
        // The port does not resolve until the warp ends; keep the squad together during arrival.
        if (!bossActive) end.copy(playerPosition).add(delta.set((i - 3) * 27, 26, -124));
      } else {
        const side = i % 2 ? 1 : -1;
        end.copy(playerPosition).add(delta.set(side * (92 + i * 16) + Math.cos(phase) * 43,
          -23 + (i % 4) * 32 + Math.sin(phase * 1.55) * 34, -162 - i * 17 + Math.sin(phase) * 61));
        if (foe) end.lerp(foe.position, .28);
      }
      delta.copy(end).sub(ship.position);
      if (delta.lengthSq() > 2) ship.quaternion.slerp(face.setFromUnitVectors(nose, delta.normalize()), 1 - Math.exp(-dt * 6));
      if (!bossRush) {
        for (const other of standing) {
          if (other === mate) continue;
          delta.copy(ship.position).sub(other.ship.position);
          const gap = delta.length();
          if (gap > 0 && gap < 75) end.addScaledVector(delta, (75 - gap) * 1.15 / gap);
        }
      }
      ship.position.lerp(end, 1 - Math.exp(-dt * (bossRush ? 1.42 : tuning.pursuit)));
      mate.timer -= dt;
      if (mate.timer <= 0) {
        mate.timer = (bossRush ? .43 : tuning.cooldown) + random() * .26;
        if (bossActive) shoot(ship.position, carrier.port.position, false);
        else if (foe) {
          const accurate = random() < tuning.accuracy;
          end.copy(foe.position).addScaledVector(foe.velocity, .24);
          if (!accurate) end.add(delta.set((i % 2 ? 1 : -1) * 9, 5, -7));
          shoot(ship.position, end, false, null, accurate ? foe : null);
          if (random() < .67) shoot(foe.position, ship.position, true);
        }
      }
      if (bossActive && bossAge >= .12 + standing.indexOf(mate) * .13 && mate.warn < 0) {
        const gun = carrier.guns[i % carrier.guns.length];
        mate.warn = clock;
        gun.barrage = .135;
        shoot(gun.position, ship.position, true, mate);
      }
      if (mate.warn >= 0 && clock - mate.warn > 1.25) {
        mate.down = clock;
        burst(ship.position, 28);
      }
    }
    shotMeshes.forEach((mesh) => { mesh.visible = false; });
    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      shot.age += dt;
      const travel = shot.age * 440;
      if (shot.hit) {
        shot.velocity.copy(shot.hit.ship.position).sub(shot.start);
        shot.length = shot.velocity.length();
        shot.velocity.normalize();
        if (travel >= shot.length && shot.hit.down < 0) {
          shot.hit.down = clock;
          burst(shot.hit.ship.position, 33);
        }
      }
      const foe = shot.target;
      if (foe?.model.visible && foe.batch === shot.batch && foe.member === shot.member && !bossRush) {
        shot.velocity.copy(foe.position).sub(shot.start);
        shot.length = shot.velocity.length();
        shot.velocity.normalize();
        if (travel >= shot.length) {
          const destroyed = patrol.hit(foe);
          burst(foe.position, destroyed ? 42 : 12);
        }
      }
      if (travel >= shot.length || shot.age > 1.25) { shots.splice(i, 1); continue; }
      const mesh = shotMeshes[i * 2 + Number(shot.hostile)];
      mesh.position.copy(shot.start).addScaledVector(shot.velocity, travel);
      mesh.quaternion.setFromUnitVectors(up, shot.velocity);
      mesh.visible = true;
    }
  }
  return { reset, update, hyperspace, get skill() { return skill; }, get allies() { return mates.filter(alive).length; } };
}
