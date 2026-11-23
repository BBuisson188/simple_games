import * as THREE from "three";
import { mergeGeometries } from "./vendor/utils/BufferGeometryUtils.js";

const UP = new THREE.Vector3(0, 1, 0);

export function plate(points, depth) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

// Cross sections run nose-to-tail. Offset the center at each section for swept pieces.
export function loft(sections, sides = 12, corners = 0.85) {
  const vertices = [];
  const indices = [];
  for (const [z, x, y, width, height] of sections) {
    for (let i = 0; i < sides; i++) {
      const turn = i * 2 * Math.PI / sides;
      const curve = (n) => Math.sign(n) * Math.pow(Math.abs(n), corners);
      vertices.push(x + width * curve(Math.cos(turn)), y + height * curve(Math.sin(turn)), z);
    }
  }
  const end = (sections.length - 1) * sides;
  for (let row = 0; row < end; row += sides) {
    for (let i = 0; i < sides; i++) {
      const a = row + i;
      const b = row + (i + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  for (let i = 1; i < sides - 1; i++) indices.push(0, i + 1, i, end, end + i, end + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Merge the armor details by material instead of turning every seam into a draw call.
export function makeCraftBatch() {
  const parts = new Map();
  function put(material, source, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute("uv");
    geometry.clearGroups();
    const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    geometry.applyQuaternion(orientation);
    geometry.translate(...position);
    if (!parts.has(material)) parts.set(material, []);
    parts.get(material).push(geometry);
  }
  function box(material, size, position, rotation) {
    put(material, new THREE.BoxGeometry(...size), position, rotation);
  }
  function beam(material, from, to, width, depth = width) {
    const direction = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize()));
    const middle = direction.clone().multiplyScalar(0.5).add(new THREE.Vector3(...from));
    box(material, [width, direction.length(), depth], middle.toArray(), [rotation.x, rotation.y, rotation.z]);
  }
  function compile() {
    const group = new THREE.Group();
    for (const [material, geometries] of parts) {
      const merged = mergeGeometries(geometries);
      for (const geometry of geometries) geometry.dispose();
      group.add(new THREE.Mesh(merged, material));
    }
    parts.clear();
    return group;
  }
  return { put, box, beam, compile };
}

export function armor(color, metalness = 0.4, roughness = 0.5, emissiveIntensity = 0.1) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity });
}

export function plateFinish(material, size, wear = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.craftPanelSize = { value: size };
    shader.uniforms.craftWear = { value: wear };
    shader.vertexShader = "varying vec3 craftLocal; varying vec3 craftNormal;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\ncraftLocal = position; craftNormal = normal;"
    );
    shader.fragmentShader = `
      varying vec3 craftLocal;
      varying vec3 craftNormal;
      uniform float craftPanelSize;
      uniform float craftWear;
      float craftHash(vec2 key) {
        return fract(sin(dot(key, vec2(97.27, 41.13))) * 13891.7);
      }
      float craftFinish(vec2 uv) {
        vec2 p = uv / craftPanelSize;
        p.x += mod(floor(p.y), 2.0) * 0.43;
        vec2 q = p - floor(p);
        float line = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
        float pixel = max(fwidth(p.x), fwidth(p.y));
        float detail = 1.0 - smoothstep(0.15, 0.55, pixel);
        float seam = (1.0 - smoothstep(0.008, 0.039 + pixel * 0.38, line)) * detail;
        float rim = (1.0 - smoothstep(0.025, 0.073 + pixel * 0.32, line)) * detail;
        float patina = craftHash(floor(p)) - 0.5;
        float scrape = craftHash(floor(p * vec2(12.0, 42.0)));
        float scratch = smoothstep(0.962, 0.994, scrape) * (1.0 - smoothstep(0.008, 0.036, pixel));
        return 1.0 + patina * 0.14 - seam * 0.32 + rim * 0.12 + scratch * 0.14;
      }
    ` + shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 craftAxis = pow(abs(normalize(craftNormal)), vec3(6.0));
      craftAxis /= max(0.001, dot(craftAxis, vec3(1.0)));
      float craftFinishValue = dot(craftAxis, vec3(craftFinish(craftLocal.zy), craftFinish(craftLocal.xz), craftFinish(craftLocal.xy)));
      diffuseColor.rgb *= mix(1.0, craftFinishValue, craftWear);
    `);
  };
  return material;
}

export function glow(color) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false });
}
