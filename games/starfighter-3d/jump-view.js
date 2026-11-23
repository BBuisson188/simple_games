import * as THREE from "three";
import { JUMP_AFTERGLOW, JUMP_SECONDS } from "./patrol.js";

const VERTEX = `
  varying vec2 uvJump;
  void main() {
    uvJump = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STREAK = `
  uniform float progress;
  uniform float opacity;
  uniform float seed;
  varying vec2 uvJump;
  float hash(float x) { return fract(sin(x * 17.83 + seed * 41.8) * 18405.19); }
  void main() {
    float t = uvJump.y;
    float x = uvJump.x * 2.0 - 1.0;
    float reach = 0.84 * (1.0 - progress) * (1.0 - progress) - 0.045;
    float reveal = smoothstep(reach - 0.04, reach + 0.035, t);
    float taper = 1.0 - smoothstep(0.47, 1.0, t);
    float width = mix(0.032, 0.009, t);
    float core = (1.0 - smoothstep(width * 0.28, width, abs(x))) * taper * reveal;
    float halo = exp(-abs(x) * mix(12.0, 51.0, t)) * taper * reveal;

    // Linear taper keeps each lane straight while bringing them together at the ship.
    float fieldWidth = mix(0.24, 1.0, t);
    float fieldX = x / fieldWidth;
    float laneCoord = (fieldX + 1.0) * 9.0;
    float lane = floor(laneCoord);
    float across = fract(laneCoord);
    float offset = hash(lane + 2.0);
    float head = 0.12 + hash(lane + 34.0) * 0.86 - progress * (0.12 + offset * 0.31);
    float length = (0.10 + offset * 0.38) * smoothstep(0.02, 0.77, progress);
    float dash = smoothstep(head - 0.02, head + 0.016, t) * (1.0 - smoothstep(head + length * 0.28, head + length, t));
    float star = (1.0 - smoothstep(0.014, 0.15, abs(across - (0.18 + offset * 0.64)))) * dash;
    float closest = mix(0.075, 0.59, hash(lane + 53.0));
    float thinning = smoothstep(closest, closest + 0.13, t);
    star *= thinning * smoothstep(0.035, 0.073, abs(x)) * (1.0 - smoothstep(0.55, 0.99, abs(fieldX)));
    star *= smoothstep(0.04, 0.33, progress) * (0.19 + offset * 0.36);
    vec3 light = vec3(0.84, 0.96, 1.0) * core + vec3(0.10, 0.40, 0.99) * (halo * 0.52)
      + vec3(0.35, 0.69, 1.0) * star;
    gl_FragColor = vec4(light * opacity, 1.0);
  }
`;

const FLARE = `
  uniform float opacity;
  varying vec2 uvJump;
  void main() {
    vec2 p = uvJump * 2.0 - 1.0;
    float r = length(p);
    float haze = exp(-r * 5.2) * 0.87;
    float hot = 1.0 - smoothstep(0.0, 0.25, r);
    gl_FragColor = vec4(mix(vec3(0.21, 0.48, 1.0), vec3(0.91, 0.98, 1.0), hot),
      opacity * (haze + hot * 0.46) * (1.0 - smoothstep(0.60, 1.0, r)));
  }
`;

export function createFighterJumps(scene, count) {
  const trailPlane = new THREE.PlaneGeometry(2, 1).translate(0, 0.5, 0);
  const flarePlane = new THREE.PlaneGeometry(2, 2);
  const makeMaterial = (fragmentShader, uniforms) => new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader, uniforms, transparent: true, depthWrite: false,
    toneMapped: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true
  });
  const effects = Array.from({ length: count }, (_, i) => {
    const trail = new THREE.Mesh(trailPlane, makeMaterial(STREAK, {
      opacity: { value: 0 }, progress: { value: 0 }, seed: { value: i + 0.4 }
    }));
    const flare = new THREE.Mesh(flarePlane, makeMaterial(FLARE, { opacity: { value: 0 } }));
    trail.visible = flare.visible = false;
    scene.add(trail, flare);
    return { trail, flare };
  });
  const x = new THREE.Vector3();
  const y = new THREE.Vector3();
  const z = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  return function draw(camera, enemies) {
    effects.forEach(({ trail, flare }, i) => {
      const { model, jump, member, batch } = enemies[i];
      trail.visible = jump.active;
      flare.visible = jump.active && jump.age > JUMP_SECONDS * 0.63;
      if (!jump.active) return;
      const arrival = Math.min(1, jump.age / JUMP_SECONDS);
      const after = Math.max(0, jump.age - JUMP_SECONDS) / JUMP_AFTERGLOW;
      const energy = (1 - after) ** 1.4 * Math.min(1, arrival * 4);
      y.copy(jump.tail).sub(jump.origin);
      const length = y.length();
      y.multiplyScalar(1 / length);
      if (model.visible) anchor.set(0, 0, 4.7).applyQuaternion(model.quaternion).add(model.position);
      else anchor.copy(jump.origin).addScaledVector(y, 4.7);
      z.copy(camera.position).sub(anchor);
      x.crossVectors(y, z).normalize();
      if (x.lengthSq() < 1e-6) x.set(1, 0, 0).applyQuaternion(camera.quaternion);
      z.crossVectors(x, y).normalize();
      trail.position.copy(anchor);
      trail.quaternion.setFromRotationMatrix(basis.makeBasis(x, y, z));
      trail.scale.set(60, length, 1);
      trail.material.uniforms.opacity.value = energy;
      trail.material.uniforms.progress.value = arrival;
      trail.material.uniforms.seed.value = 1 + batch * 3 + member;
      if (!flare.visible) return;
      const bloom = Math.min(1, Math.max(0, (arrival - 0.63) / 0.37)) * (1 - after);
      flare.position.copy(anchor).addScaledVector(y, 1.4);
      flare.quaternion.copy(camera.quaternion);
      flare.scale.setScalar(8 + 9 * bloom + 4 * after);
      flare.material.uniforms.opacity.value = bloom;
    });
  };
}
