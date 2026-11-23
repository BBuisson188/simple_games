import { clamp, courseOffset, mix } from "./pine-ridge-course.js";

const VIEW = 176;
const FOCAL = 47;
const FAR = FOCAL / (FOCAL + VIEW);
const noise = (n) => {
  const value = Math.sin(n * 13.997 + 8.41) * 43758.5453;
  return value - Math.floor(value);
};

function polygon(ctx, color, ...points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function ellipse(ctx, color, x, y, rx, ry) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function stroke(ctx, color, width, ...points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.stroke();
}

function gradient(ctx, x1, y1, x2, y2, colors) {
  const fill = ctx.createLinearGradient(x1, y1, x2, y2);
  colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color));
  return fill;
}

function makePine(variant) {
  const sprite = document.createElement("canvas");
  sprite.width = 124;
  sprite.height = 190;
  const ctx = sprite.getContext("2d");
  ctx.translate(61, 182);
  polygon(ctx, "#352f39", -7, 1, 7, 1, 3, -48, -3, -48);
  for (let layer = 4; layer >= 0; layer--) {
    const y = -178 + layer * 30;
    const left = 19 + layer * 7 + noise(variant + layer) * 7;
    const right = left * (0.82 + noise(layer * 3 + variant) * 0.23);
    const tip = (layer % 2 ? -1 : 1) * (3 + variant * 1.5);
    polygon(ctx, "#183d43", tip, y, right, y + 50, right - 8, y + 57, 4, y + 51,
      -left + 9, y + 58, -left, y + 49);
    polygon(ctx, layer % 2 ? "#316060" : "#42716e", tip, y, 4, y + 49, -left + 5, y + 54, -left, y + 49);
    polygon(ctx, layer % 2 ? "#edf1e9" : "#d9e9e6", tip, y + 2, 3, y + 22, -left * 0.66, y + 38,
      -left + 2, y + 47, -left + 5, y + 35);
    polygon(ctx, "#779a9a", tip, y + 3, right * 0.68, y + 39, right * 0.46, y + 43, 5, y + 28);
  }
  return sprite;
}

function paintMountains(ctx, width, h, course, shift) {
  ctx.fillStyle = gradient(ctx, 0, 0, 0, h * 0.48, course.sky);
  ctx.fillRect(0, 0, width, h);
  const sunX = width * 0.72 - shift * 0.32;
  const sunY = h * 0.16;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.25);
  glow.addColorStop(0, "rgba(255,244,203,.78)");
  glow.addColorStop(1, "rgba(255,232,189,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, h * 0.46);
  ellipse(ctx, "#fff2cf", sunX, sunY, h * 0.026, h * 0.026);
  for (const [x, y, length] of [[0.12, 0.12, 0.12], [0.49, 0.08, 0.065], [0.91, 0.106, 0.095]]) {
    ellipse(ctx, "rgba(255,241,220,.17)", x * width - shift * 0.2, y * h, length * width, 0.008 * h);
    ellipse(ctx, "rgba(255,244,230,.10)", (x + 0.03) * width - shift * 0.2, (y + 0.013) * h, length * width * 0.69, 0.006 * h);
  }

  ctx.save();
  ctx.translate(-shift, 0);
  ctx.scale(width, h);
  polygon(ctx, "#8da8b5", -0.15, 0.34, -0.04, 0.22, 0.1, 0.13, 0.22, 0.21,
    0.34, 0.08, 0.45, 0.17, 0.53, 0.12, 0.67, 0.27, 0.82, 0.19, 0.9, 0.24, 1.15, 0.14, 1.15, 0.43, -0.15, 0.43);
  polygon(ctx, "#dce8e7", 0.17, 0.25, 0.34, 0.08, 0.45, 0.17, 0.53, 0.12, 0.61, 0.21,
    0.54, 0.18, 0.49, 0.23, 0.40, 0.2, 0.36, 0.25, 0.34, 0.14, 0.28, 0.23);
  polygon(ctx, "#a7bdc5", 0.34, 0.08, 0.39, 0.175, 0.42, 0.19, 0.452, 0.266, 0.36, 0.235);
  polygon(ctx, "#6d929f", 0.53, 0.12, 0.585, 0.196, 0.603, 0.208, 0.65, 0.28, 0.57, 0.244);
  polygon(ctx, "#bcced0", 0.79, 0.23, 0.82, 0.19, 0.9, 0.24, 0.942, 0.205, 0.90, 0.272, 0.85, 0.231);
  polygon(ctx, "#c6d7da", -0.04, 0.28, 0.1, 0.13, 0.22, 0.21, 0.19, 0.25, 0.12, 0.21, 0.07, 0.23);
  polygon(ctx, "#668995", -0.2, 0.36, -0.03, 0.25, 0.1, 0.29, 0.26, 0.22, 0.48, 0.39,
    0.68, 0.32, 0.79, 0.26, 0.94, 0.3, 1.15, 0.22, 1.15, 0.5, -0.2, 0.5);
  polygon(ctx, "#486b75", -0.2, 0.33, 0.09, 0.35, 0.21, 0.32, 0.42, 0.40, 0.57, 0.43,
    0.73, 0.36, 0.99, 0.34, 1.15, 0.38, 1.15, 0.55, -0.2, 0.55);
  ctx.restore();
  ctx.fillStyle = gradient(ctx, 0, h * 0.248, 0, h * 0.346, ["rgba(207,224,226,0)", "rgba(207,224,226,.45)"]);
  ctx.fillRect(0, h * 0.248, width, h * 0.098);
}

function drawRock(ctx) {
  polygon(ctx, "#455368", -24, -2, -19, -15, -5, -24, 11, -22, 25, -10, 23, 2, -8, 6);
  polygon(ctx, "#6c8395", -24, -2, -19, -15, -5, -24, 11, -22, 2, -9, -8, 6);
  polygon(ctx, "#f6fbf6", -21, -14, -6, -26, 11, -24, 20, -16, 7, -13, 1, -15, -12, -11);
}

function drawRamp(ctx) {
  polygon(ctx, "#274a65", -34, 6, 32, 6, 29, -11, -26, -11);
  polygon(ctx, "#63b5d2", -34, 6, 32, 6, 20, -27, -20, -27);
  polygon(ctx, "#def4ff", -21, -5, 0, -19, 21, -5, 20, -1, 0, -11, -20, -1);
}

function drawSki(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  polygon(ctx, "#273f55", -3, 23, -4, 16, -3, -21, -1, -27, 3, -26, 5, -17, 4, 21, 2, 24);
  polygon(ctx, "#f3944b", -2, 22, -2, -17, 2, -24, 3, 21);
  stroke(ctx, "#ffe3a5", 1.2, -2, -16, -2, 17);
  stroke(ctx, "#8c4d40", 1.7, 1, 11, 1, 20);
  ctx.restore();
}

function drawRider(ctx, { turn = 0, spread = 0, grab = 0, tuck = 0, gear = true } = {}) {
  const lean = turn * 8 + grab * 7;
  const hips = -23 + tuck * 9 + grab * 8;
  const shoulder = hips - 24 + grab * 6;
  const helmet = shoulder - 11;
  const feet = [-10 - spread * 21, 10 + spread * 21 + grab * 7];
  const footY = [-spread * 6 - tuck * 10, -spread * 6 - tuck * 13 - grab * 21];
  const skiAngles = [turn * 0.16 - 0.075 - spread * 0.58, turn * 0.16 + 0.075 + spread * 0.58 - grab * 1.02];
  for (const side of [-1, 1]) {
    const i = side === -1 ? 0 : 1;
    const bootX = feet[i];
    const bootY = footY[i];
    const kneeX = mix(lean + side * 7, bootX, 0.66) + turn * 4;
    const kneeY = mix(hips, bootY, 0.48) - tuck * 5;
    if (gear) drawSki(ctx, bootX, bootY + 1, skiAngles[i]);
    stroke(ctx, "#20374d", 12, lean + side * 7, hips, kneeX, kneeY, bootX, bootY - 2);
    stroke(ctx, side === 1 ? "#557686" : "#405d70", 5, lean + side * 7 - 1, hips, kneeX - 1, kneeY, bootX - 1, bootY - 5);
    polygon(ctx, "#172838", bootX - 5, bootY - 6, bootX + 4, bootY - 7, bootX + 6, bootY + 3, bootX - 5, bootY + 4);
    stroke(ctx, "#bdd7d4", 1.5, bootX - 3, bootY - 2, bootX + 3, bootY - 3);
  }

  for (const side of [-1, 1]) {
    const reach = side === 1 ? grab : 0;
    const handX = mix(lean + side * (19 + spread * 19), feet[1] - Math.sin(skiAngles[1]) * 20, reach);
    const handY = mix(shoulder + 18 - 23 * spread - grab * 5, footY[1] + 1 + Math.cos(skiAngles[1]) * 20, reach);
    const elbowX = lean + side * (17 + spread * 10);
    const elbowY = shoulder + 11 - spread * 10;
    if (gear && !(side === 1 && grab > 0.62)) {
      stroke(ctx, "#3a5868", 2.2, handX, handY - 1, handX + side * (10 + spread * 5), handY + 25 - spread * 8);
      stroke(ctx, "#b4cbd0", 1.1, handX, handY, handX + side * 8, handY + 21 - spread * 8);
    }
    stroke(ctx, "#863c32", 11, lean + side * 10, shoulder + 3, elbowX, elbowY, handX, handY);
    stroke(ctx, side === 1 ? "#fa9c52" : "#e2723d", 6, lean + side * 10, shoulder + 2, elbowX, elbowY - 1, handX, handY);
    ellipse(ctx, "#243b4d", handX, handY, 4.8, 5);
  }

  const jacket = gradient(ctx, lean - 15, shoulder, lean + 12, hips + 5, ["#fff0b1", "#ef8c4b", "#9d4331"]);
  polygon(ctx, jacket, lean - 10, shoulder - 2, lean + 11, shoulder - 3,
    lean + 16, shoulder + 7, lean + 12, hips + 4, lean - 12, hips + 5, lean - 16, shoulder + 8);
  polygon(ctx, "#bc5536", lean - 16, shoulder + 8, lean - 11, shoulder + 9,
    lean - 7, hips + 3, lean - 12, hips + 5);
  polygon(ctx, "#b9583c", lean + 8, shoulder + 11, lean + 13, shoulder + 10, lean + 12, hips + 4, lean + 6, hips + 4);
  stroke(ctx, "#875144", 2, lean - 9, hips + 3, lean + 9, hips + 2);
  ellipse(ctx, "#9c4c37", lean + 1, shoulder + 3, 10, 7);
  ellipse(ctx, "#e79855", lean + 1, shoulder + 2, 7.6, 5.6);
  stroke(ctx, "#fdd78e", 1.5, lean - 5, shoulder + 10, lean - 4, hips - 4);
  stroke(ctx, "#a04a38", 1.3, lean + 3, shoulder + 12, lean + 2, hips - 2);
  ellipse(ctx, "#253e4f", lean, helmet + 2, 12, 11);
  const shell = gradient(ctx, lean - 8, helmet - 10, lean + 8, helmet + 8, ["#fff6df", "#e3e1cd", "#73919a"]);
  ellipse(ctx, shell, lean, helmet, 11.6, 10.6);
  stroke(ctx, "#354c5b", 2.7, lean - 11, helmet + 3, lean - 4, helmet + 5, lean + 8, helmet + 2);
  stroke(ctx, "#fcf8df", 1.4, lean - 6, helmet - 6, lean - 1, helmet - 8, lean + 5, helmet - 7);
  stroke(ctx, "#7a9091", 1.5, lean - 1, helmet - 4, lean + 4, helmet - 4);
}

function drawCrash(ctx, crash) {
  const { direction } = crash;
  const p = clamp(crash.progress, 0, 1);
  const slide = 42 * (1 - (1 - p) ** 3) * direction;
  for (const side of [-1, 1]) {
    const flight = Math.sin(Math.PI * Math.min(1, p / 0.64));
    const x = side * (11 + 47 * Math.min(1, p / 0.7)) + slide * 0.5;
    const y = -flight * (35 + side * 9) + 9 + side * 6;
    const spin = side * (0.35 + Math.min(1, p / 0.67) * (3.4 + side * 1.1));
    drawSki(ctx, x, y, spin);
  }
  ellipse(ctx, "rgba(157,195,210,.56)", slide, 10, 24, 5);
  ctx.save();
  const tumble = Math.min(1, p * 4);
  ctx.translate(slide, -Math.sin(Math.PI * tumble) * 14 - 8);
  ctx.rotate(direction * mix(0.14, Math.PI * 0.53, 1 - (1 - tumble) ** 2));
  ctx.translate(0, 23);
  drawRider(ctx, { turn: direction * 0.7, spread: 0.68, tuck: 0.85, gear: false });
  ctx.restore();
  for (let i = 0; i < 24; i++) {
    const live = clamp(p * 3.6 - noise(i * 3) * 0.24, 0, 1);
    const scatter = (noise(i * 7 + 8) - 0.5) * live * 138;
    const hop = Math.sin(live * Math.PI) * (10 + noise(i + 5) * 30);
    const alpha = (1 - p) ** 1.4;
    ellipse(ctx, `rgba(244,251,255,${alpha * 0.86})`, slide * 0.58 + scatter, 6 + noise(i) * 18 - hop,
      2 + noise(i + 1) * (5 + p * 2), 1.8 + noise(i + 4) * 3.5);
  }
}

function drawSkier(ctx, player, run, size) {
  const lift = run.air > 0 ? Math.sin(Math.PI * run.air / run.airDuration) * (run.airDuration > 1 ? 77 : 38) : 0;
  const { x, y } = player;
  ellipse(ctx, "rgba(39,72,96,.23)", x + lift * size * 0.35, y + 7 * size, (23 + lift * 0.1) * size, 7 * size);
  ctx.save();
  ctx.translate(x, y - lift * size);
  ctx.scale(size, size);
  if (run.crash) {
    drawCrash(ctx, run.crash);
  } else {
    const trick = run.trick;
    const phase = trick ? clamp(trick.elapsed / trick.duration, 0, 1) : 0;
    const flourish = Math.sin(phase * Math.PI) ** 0.7;
    ctx.rotate(clamp(run.turn * 0.21, -0.24, 0.24));
    if (trick?.id === "flip") {
      const rotation = 2 * Math.PI * phase * phase * (3 - 2 * phase);
      ctx.translate(0, -25);
      const pitch = Math.cos(rotation);
      const roll = Math.sin(rotation);
      ctx.rotate(roll * 0.36);
      ctx.transform(1 + 0.15 * roll, 0, roll * 0.28, Math.sign(pitch || 1) * Math.max(0.17, Math.abs(pitch)), 0, 0);
      ctx.translate(0, 25);
    }
    drawRider(ctx, {
      turn: run.turn,
      spread: trick?.id === "spread" ? flourish : 0,
      grab: trick?.id === "grab" ? flourish : 0,
      tuck: (trick?.id === "flip" ? flourish : 0) + (run.brake && !run.air ? 0.28 : 0)
    });
  }
  ctx.restore();
}

export function createSlopeView(canvas) {
  const ctx = canvas.getContext("2d");
  const pines = [0, 1, 2].map(makePine);
  let halfWidth = 260;
  let spray = [];
  let trails = [];
  let lastMeter = 0;

  function reset() {
    spray = [];
    trails = [];
    lastMeter = 0;
  }

  function draw(run, dt = 0) {
    const { course, distance } = run;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    const pixels = [Math.round(width * pixelRatio), Math.round(height * pixelRatio)];
    if (canvas.width !== pixels[0] || canvas.height !== pixels[1]) {
      canvas.width = pixels[0];
      canvas.height = pixels[1];
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    halfWidth = Math.min(width * 0.45, height * 0.66);
    const horizon = height * 0.34;
    const skierY = height * 0.78;
    const here = courseOffset(course, distance);
    const camera = run.x * 0.14;
    const visualScale = clamp(height / 660, 0.64, 1.58);

    function project(meters, lane = 0) {
      const p = FOCAL / (FOCAL + meters - distance);
      const depth = (p - FAR) / (1 - FAR);
      return {
        x: width / 2 + (lane + courseOffset(course, meters) - here - camera) * halfWidth * p,
        y: mix(horizon, skierY, depth),
        size: p * visualScale
      };
    }

    paintMountains(ctx, width, height, course, camera * halfWidth * 0.4);
    ctx.fillStyle = gradient(ctx, 0, horizon - 10, 0, height, [course.sky[1], course.snow[0], "#b9d4e0"]);
    ctx.fillRect(0, horizon, width, height - horizon);
    const steps = [distance - 17];
    for (let z = Math.ceil((distance - 16) / 5) * 5; z < distance + VIEW; z += 5) steps.push(z);
    steps.push(distance + VIEW);
    const snow = gradient(ctx, 0, horizon, 0, height, [course.snow[0], course.snow[1]]);
    const drawStrip = (left, right, color) => {
      const points = steps.map((z) => project(z, left));
      for (let i = steps.length - 1; i >= 0; i--) points.push(project(steps[i], right));
      polygon(ctx, color, ...points.flatMap(({ x, y }) => [x, y]));
    };
    drawStrip(-1.14, 1.14, "#d9e6eb");
    drawStrip(-1, 1, snow);
    drawStrip(-0.66, -0.63, "rgba(130,164,184,.09)");
    drawStrip(0.55, 0.58, "rgba(130,164,184,.09)");

    const objects = [];
    for (let row = Math.ceil((distance - 16) / 8); row < (distance + VIEW) / 8; row++) {
      const meters = row * 8;
      for (const side of [-1, 1]) {
        const pattern = row * 7 + side;
        objects.push({ kind: "pine", meters: meters + side * 1.5, x: side * (1.18 + noise(pattern) * 0.53),
          tall: 0.56 + noise(pattern * 2) * 0.81, sprite: Math.floor(noise(pattern + 3) * 3) });
        if (row % 2 === 0) objects.push({ kind: "pine", meters: meters + 3, x: side * (1.8 + noise(pattern + 8) * 1.1),
          tall: 0.85 + noise(pattern) * 0.62, sprite: Math.floor(noise(pattern + 4) * 3) });
      }
      const mark = project(meters, noise(row * 9) * 1.8 - 0.9);
      const s = mark.size;
      ellipse(ctx, "rgba(122,155,179,.14)", mark.x, mark.y, 8 * s, 1.45 * s);
      ellipse(ctx, "rgba(255,255,255,.68)", mark.x - 10 * s, mark.y + 4 * s, 4 * s, 1.3 * s);
      if (row % 3 === 0) {
        const drift = project(meters, row % 2 ? 1.08 : -1.1);
        ellipse(ctx, "rgba(109,152,181,.14)", drift.x, drift.y, 47 * s, 7 * s);
        ellipse(ctx, "rgba(244,251,248,.5)", drift.x - 3 * s, drift.y - 4 * s, 41 * s, 6 * s);
      }
    }
    for (const feature of run.features) {
      const z = feature.meters - distance;
      if (z >= -16 && z <= VIEW) objects.push(feature);
    }
    objects.sort((a, b) => b.meters - a.meters);

    function paintObject(obj) {
      const p = project(obj.meters, obj.x);
      if (obj.kind === "gate" || obj.kind === "finish") {
        const finish = obj.kind === "finish";
        const gap = finish ? 0.91 : course.gateWidth / 2;
        const left = project(obj.meters, obj.x - gap).x;
        const right = project(obj.meters, obj.x + gap).x;
        ctx.fillStyle = finish ? "#326b86" : "rgba(45,164,180,.37)";
        ctx.fillRect(left, p.y - 2 * p.size, right - left, 5 * p.size);
        for (const [x, direction] of [[left, -1], [right, 1]]) {
          const top = p.y - (finish ? 68 : 42) * p.size;
          stroke(ctx, finish ? "#2b526b" : "#d2733e", 3 * p.size, x, p.y, x, top);
          if (finish) continue;
          polygon(ctx, "#ef9250", x, top, x + direction * 21 * p.size, top + 7 * p.size, x, top + 16 * p.size);
        }
        if (finish) {
          ctx.fillStyle = "#1f4b62";
          ctx.fillRect(left, p.y - 68 * p.size, right - left, 24 * p.size);
          ctx.font = `800 ${14 * p.size}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#fff2d9";
          ctx.fillText("LODGE  /  FINISH", p.x, p.y - 51 * p.size);
        }
        return;
      }
      const s = p.size;
      if (p.x < -140 || p.x > width + 140) return;
      if (obj.kind === "pine") {
        const tall = s * (obj.tall || 0.77);
        const spread = 116 * tall;
        const treeHeight = 177 * tall;
        ellipse(ctx, "rgba(49,90,113,.17)", p.x + 15 * tall, p.y + 1, spread * 0.46, 8 * tall);
        ctx.drawImage(pines[obj.sprite || 0], p.x - spread / 2, p.y - treeHeight * 0.958, spread, treeHeight);
      } else {
        ellipse(ctx, "rgba(42,77,100,.22)", p.x + 5 * s, p.y + 3 * s, 25 * s, 6 * s);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(s, s);
        if (obj.kind === "rock") drawRock(ctx);
        else drawRamp(ctx);
        ctx.restore();
      }
    }

    objects.filter((obj) => obj.meters >= distance).forEach(paintObject);
    const player = project(distance, run.x);
    if (distance - lastMeter > 1.15 && run.air <= 0 && run.speed > 1 && !run.crash) {
      lastMeter = distance;
      trails.push({ meters: distance, x: run.x, turn: run.turn });
      const side = run.turn < 0 ? 1 : -1;
      const strength = Math.abs(run.turn) + (run.brake ? 0.63 : 0);
      if (strength > 0.15) {
        for (let i = 0; i < 4; i++) spray.push({
          x: player.x, y: player.y + 8, life: 0.28 + Math.random() * 0.25,
          vx: side * (10 + Math.random() * 83) * strength,
          vy: 37 + Math.random() * 55, size: 1.5 + Math.random() * 3
        });
      }
    }
    trails = trails.filter(({ meters }) => distance - meters < 16);
    for (let i = 1; i < trails.length; i++) {
      const a = trails[i - 1];
      const b = trails[i];
      if (b.meters - a.meters > 4) continue;
      for (const offset of [-0.028, 0.028]) {
        const from = project(a.meters, a.x + offset);
        const to = project(b.meters, b.x + offset);
        stroke(ctx, "rgba(112,160,183,.27)", 1.6 * from.size, from.x, from.y, to.x, to.y);
      }
    }
    for (const flake of spray) {
      flake.x += flake.vx * dt;
      flake.y += flake.vy * dt;
      flake.life -= dt;
      if (flake.life > 0) ellipse(ctx, `rgba(255,255,255,${flake.life * 1.7})`, flake.x, flake.y, flake.size, flake.size);
    }
    spray = spray.filter(({ life }) => life > 0);
    ctx.globalAlpha = run.recovery > 0 && Math.floor(run.recovery * 12) % 2 === 0 ? 0.63 : 1;
    drawSkier(ctx, player, run, visualScale * 1.06);
    ctx.globalAlpha = 1;
    objects.filter((obj) => obj.meters < distance).forEach(paintObject);
  }

  return { draw, reset, getHalfWidth: () => halfWidth };
}
