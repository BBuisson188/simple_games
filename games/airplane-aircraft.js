function material(ctx, x, y, endX, endY, colors) {
  const gradient = ctx.createLinearGradient(x, y, endX, endY);
  colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
  return gradient;
}

function paint(ctx, shape, fill, edge = "#192d3e", weight = 1.7) {
  const path = new Path2D(shape);
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = weight;
    ctx.stroke(path);
  }
}

function line(ctx, shape, color, weight = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.stroke(new Path2D(shape));
}

function oval(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function canopy(ctx, top, length, width) {
  paint(ctx, `M 0 ${top - 2} C ${-width - 3} ${top + 1}, ${-width - 4} ${top + length}, 0 ${top + length + 2}
    C ${width + 4} ${top + length}, ${width + 3} ${top + 1}, 0 ${top - 2} Z`, "#a6b9b6", "#233845", 1.5);
  oval(ctx, 0, top + length * 0.51, width, length * 0.49,
    material(ctx, -width, top, width, top + length, ["#d3faf2", "#4c9bad", "#15304d"]));
  line(ctx, `M -3 ${top + 3} Q -6 ${top + length * 0.4} -5 ${top + length * 0.75}`, "#effce9ba", 1.4);
  line(ctx, `M ${-width} ${top + length * 0.61} L ${width} ${top + length * 0.61}`, "#193e51", 1.5);
}

function drawMustang(ctx) {
  const wing = "M-12 -17 Q-38 -18 -65 -11 Q-77 -9 -73 2 L-68 14 Q-38 14 -10 17 L10 17 Q38 14 68 14 L73 2 Q77 -9 65 -11 Q38 -18 12 -17Z";
  const steel = material(ctx, 0, -19, 0, 17, ["#e3ece8", "#aaadb4", "#5f7382"]);
  const body = material(ctx, -16, -10, 17, 3, ["#467384", "#edf1df", "#b9c8ca", "#5b6d81"]);
  paint(ctx, "M-5 28 L-28 33 Q-33 40 -27 43 L-7 40 L7 40 L27 43 Q33 40 28 33 L5 28Z", steel);
  paint(ctx, wing, steel);
  const mask = new Path2D(wing);
  ctx.save();
  ctx.clip(mask);
  for (const x of [-58, 45]) {
    ctx.fillStyle = "#1b4f73";
    ctx.fillRect(x, -18, 13, 36);
    ctx.fillStyle = "#f6e8c5";
    ctx.fillRect(x + 13, -18, 3.5, 36);
  }
  line(ctx, "M-68 7 Q-35 5 -14 5 M14 5 Q35 5 68 7", "#415f70", 1.2);
  line(ctx, "M-65 -10 Q-38 -17 -14 -15 M14 -15 Q38 -17 65 -10", "#f3f7e5", 1.8);
  ctx.restore();
  paint(ctx, "M0 -52 C-10 -52 -14 -36 -13 -13 L-7 33 Q-5 47 0 52 Q5 47 7 33 L13 -13 C14 -36 10 -52 0 -52Z", body);
  paint(ctx, "M0 -52 Q-8 -51 -10 -40 Q0 -35 10 -40 Q8 -51 0 -52Z", "#ae4634");
  paint(ctx, "M-4 26 Q0 23 4 26 L3 48 L0 52 L-3 48Z", "#863e36", null);
  canopy(ctx, -22, 25, 7.2);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) line(ctx, `M${side * 9} ${-31 + i * 3.3} l${side * 2} 1.5`, "#5a514b", 1.15);
    oval(ctx, side * 70, -3, 2.5, 1.5, side === -1 ? "#f2906d" : "#c6ecb4");
  }
}

function drawBiplane(ctx) {
  const gold = material(ctx, 0, -24, 0, 20, ["#fff2ad", "#e4ad51", "#ad672f"]);
  const vermilion = material(ctx, -14, 0, 13, 4, ["#682f38", "#ed8b52", "#c7523b", "#7a3a3d"]);
  paint(ctx, "M-6 24 L-27 31 Q-30 38 -22 40 L-3 40 L22 40 Q30 38 27 31 L6 24Z", gold);
  paint(ctx, "M-65 5 Q-70 7 -67 20 Q-65 25 -56 25 L56 25 Q67 25 67 19 L65 5Z", "#9c5d33");
  paint(ctx, "M-64 5 Q-65 13 -60 16 L60 16 Q66 14 64 5Z", gold);
  paint(ctx, "M0 -48 C-13 -48 -15 -35 -12 -8 Q-9 17 -5 42 L0 47 L5 42 Q9 17 12 -8 C15 -35 13 -48 0 -48Z", vermilion);
  for (const side of [-1, 1]) {
    line(ctx, `M${side * 46} -16 L${side * 39} 20 M${side * 61} -13 L${side * 45} 19`, "#463e40", 2);
    line(ctx, `M${side * 51} 20 L${side * 32} -15`, "#ded3ac", 0.7);
  }
  const wing = "M-75 -19 Q-80 -18 -77 -6 Q-76 -2 -69 -1 L69 -1 Q76 -2 77 -6 Q80 -18 75 -19 Q0 -27 -75 -19Z";
  paint(ctx, wing, gold);
  line(ctx, "M-69 -16 Q0 -23 69 -16", "#fff1bb", 2);
  line(ctx, "M-63 -7 Q0 -12 63 -7", "#88603b", 1);
  for (const side of [-1, 1]) {
    line(ctx, `M${side * 69} -18 l${side * -9} 14 M${side * 61} -19 l${side * -9} 14`, "#ac4837", 3.4);
  }
  canopy(ctx, 1, 14, 5.8);
  oval(ctx, 0, -43, 8, 4.5, "#d9bc87");
}

function drawJet(ctx, enemy) {
  const wing = material(ctx, -65, -6, 64, 30, enemy
    ? ["#693e54", "#b95d63", "#d78069", "#563e59"] : ["#415b74", "#839dab", "#657988", "#34465c"]);
  const fuselage = material(ctx, -19, -8, 19, 10, enemy
    ? ["#754859", "#efae91", "#bf6c66", "#673849"] : ["#365c72", "#cfd9d8", "#8ca5b4", "#475c78"]);
  paint(ctx, "M-10 -25 L-75 18 L-70 28 L-17 17 L-28 43 L-12 39 L0 30 L12 39 L28 43 L17 17 L70 28 L75 18 L10 -25Z", wing);
  line(ctx, "M-69 22 L-15 8 M69 22 L15 8 M-65 24 L-22 18 M65 24 L22 18", enemy ? "#fec3a5" : "#d3eee9", 1.4);
  paint(ctx, "M0 -59 Q-9 -56 -13 -24 L-16 8 L-13 41 L-4 46 L4 46 L13 41 L16 8 L13 -24 Q9 -56 0 -59Z", fuselage);
  paint(ctx, "M-13 3 L-23 20 L-22 27 L-13 26Z M13 3 L23 20 L22 27 L13 26Z", "#2d485c");
  paint(ctx, "M-12 22 L-23 46 L-17 49 L-8 36 L-6 20Z M12 22 L23 46 L17 49 L8 36 L6 20Z", fuselage);
  line(ctx, "M-12 35 L-16 46 M12 35 L16 46", enemy ? "#f2ad97" : "#f7b077", 3);
  for (const x of [-6, 6]) {
    oval(ctx, x, 42, 4.4, 4, "#243b4a");
    oval(ctx, x, 42.6, 2.4, 2.4, enemy ? "#f28d97" : "#fcb268");
  }
  canopy(ctx, -40, 29, 6.8);
}

function makeSprite(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 390;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(3, 0, 0, 3, 270, 195);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "biplane") drawBiplane(ctx);
  else if (type === "mustang") drawMustang(ctx);
  else drawJet(ctx, type === "interceptor");
  return canvas;
}

export function createAircraftPainter() {
  const models = Object.fromEntries(["biplane", "mustang", "jet", "interceptor"].map((type) => [type, makeSprite(type)]));
  return function paintAircraft(ctx, type, x, y, size, { bank = 0, prop = 0, moving = false, spin = 0 } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bank * 0.32 + spin + (type === "interceptor" ? Math.PI : 0));
    ctx.scale(size * (1 - Math.min(0.18, Math.abs(bank) * 0.14)), size);
    if (type === "jet" && moving) {
      ctx.fillStyle = material(ctx, 0, 39, 0, 66, ["#fff3bb", "#ec873ab8", "#ff9d4700"]);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 6 - 3, 40);
        ctx.lineTo(side * 6, 57 + Math.sin(prop) * 4);
        ctx.lineTo(side * 6 + 3, 40);
        ctx.fill();
      }
    }
    ctx.drawImage(models[type], -90, -65, 180, 130);
    if (type === "biplane" || type === "mustang") {
      const yProp = type === "biplane" ? -47 : -52;
      if (moving) oval(ctx, 0, yProp, 18, 4.5, "#eafaed77");
      const angle = moving ? prop : -0.16;
      line(ctx, `M${-17 * Math.cos(angle)} ${yProp - 4 * Math.sin(angle)} L${17 * Math.cos(angle)} ${yProp + 4 * Math.sin(angle)}`, moving ? "#fff7d2b8" : "#395365", moving ? 1.7 : 2.9);
      oval(ctx, 0, yProp, 3.2, 2.9, "#f2b868");
    }
    ctx.restore();
  };
}
