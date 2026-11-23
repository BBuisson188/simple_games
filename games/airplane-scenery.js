const PALETTES = {
  field: { sky: ["#4584b3", "#b1d8e2", "#f5deb2"], ground: ["#a2b681", "#4b7859"],
    hills: ["#88a6a4", "#6e8f8a", "#50776f"], patches: ["#779c73", "#90ac70", "#678763", "#a5b484"], sun: "#fff3c2" },
  water: { sky: ["#1d658e", "#66b5c5", "#ffe7ba"], ground: ["#68b3b8", "#164d70"],
    hills: ["#8cb4b5", "#719da4", "#4c8289"], patches: ["#71bebe", "#337b98", "#358aa1", "#a1cbbf"], sun: "#ffedaf" },
  farm: { sky: ["#625f97", "#e7a397", "#ffe4a4"], ground: ["#c6b574", "#7f7743"],
    hills: ["#c59d91", "#aa9180", "#8a7e62"], patches: ["#a4a769", "#d5b66b", "#bf915e", "#878b62"], sun: "#fff0b7" },
  mountain: { sky: ["#3e507d", "#93a8c2", "#f4d1be"], ground: ["#a8b5a6", "#526b70"],
    hills: ["#98a9bd", "#72869c", "#5b747e"], patches: ["#738e8b", "#839c96", "#5c797f", "#b0bdad"], sun: "#fff0db" }
};

const noise = (seed) => {
  const value = Math.sin(seed * 72.314 + 15.11) * 31739.714;
  return value - Math.floor(value);
};

function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function gradient(ctx, top, bottom, colors) {
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  colors.forEach((color, index) => fill.addColorStop(index / (colors.length - 1), color));
  return fill;
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function makeCloud(index) {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const mist = gradient(ctx, 8, 90, ["#fff8e9", "#edf3ec", "#9dbcc95b"]);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const x = 35 + i * 30;
    const y = 66 - Math.sin(i / 7 * Math.PI) * (13 + noise(i + index) * 19);
    ctx.moveTo(x + 33, y);
    ctx.ellipse(x, y, 33, 12 + noise(i + 8 + index) * 15, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = mist;
  ctx.fill();
  ellipse(ctx, 140, 69, 124, 8, "#e3e8e661");
  return canvas;
}

export function createAirplaneScenery() {
  const clouds = [0, 1, 2].map(makeCloud);

  function drawSky(ctx, w, h, horizon, terrain, palette, travel, offset) {
    ctx.fillStyle = gradient(ctx, 0, horizon + 25, palette.sky);
    ctx.fillRect(0, 0, w, horizon + 1);
    const sunX = w * (terrain === "farm" ? 0.23 : 0.73) - offset * 0.23;
    const sunY = h * (terrain === "farm" ? 0.215 : 0.14);
    const glow = ctx.createRadialGradient(sunX, sunY, h * 0.018, sunX, sunY, h * 0.37);
    glow.addColorStop(0, "#fff0bdbb");
    glow.addColorStop(1, "#fff0bd00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, horizon);
    ellipse(ctx, sunX, sunY, h * 0.029, h * 0.029, palette.sun);
    ctx.save();
    for (let i = 0; i < 10; i++) {
      const width = h * (0.18 + noise(i * 8) * 0.47);
      const x = ((i * w * 0.16 - travel * (0.36 + noise(i) * 0.27) - offset * 0.37 + w + width) % (w + width)) - width;
      const y = horizon * (0.07 + noise(i * 3) * 0.72);
      ctx.globalAlpha = 0.25 + noise(i * 11) * 0.45;
      ctx.drawImage(clouds[i % clouds.length], x, y, width, width * 0.342);
    }
    ctx.restore();
  }

  function drawRidges(ctx, w, h, horizon, terrain, palette, offset) {
    for (let ridge = 0; ridge < 3; ridge++) {
      const count = 20;
      const amplitude = terrain === "mountain" ? 0.19 : terrain === "water" ? 0.044 : 0.075;
      const base = horizon + ridge * h * 0.018;
      const points = Array.from({ length: count }, (_, k) => {
        const x = (k - 2) * w / (count - 5) - offset * (ridge + 1) * 0.26;
        const height = (0.25 + noise(k * 7 + ridge * 3) * 0.75) * amplitude * (ridge + 1) / 3 * h;
        return [x, base - height];
      });
      polygon(ctx, palette.hills[ridge], [...points, [w * 1.2, base], [-w * 0.2, base]]);
      if (terrain === "mountain" && ridge > 0) {
        for (let i = 2; i < points.length - 1; i++) {
          const [x, top] = points[i];
          if (top > base - h * 0.075 || points[i - 1][1] < top || points[i + 1][1] < top) continue;
          const shoulder = points[i + 1];
          polygon(ctx, "#d8e1e0", [[x, top], [shoulder[0], shoulder[1]],
            [x + w * 0.035, top + h * 0.021], [x + w * 0.024, top + h * 0.031], [x - w * 0.022, top + h * 0.022]]);
        }
      }
    }
  }

  function drawFields(ctx, w, h, horizon, terrain, palette, travel, offset) {
    const farm = terrain === "farm";
    const columns = farm ? 6 : 5;
    const rowDepth = farm ? 26 : 44;
    const firstRow = Math.floor(travel / rowDepth);
    const rows = (farm ? 18 : 12) * rowDepth;
    const project = (x, z) => {
      const perspective = 1 / (1 + z / 85);
      return [w * 0.5 + x * w * perspective - offset * perspective,
        horizon + (h - horizon) * perspective ** 1.37];
    };
    for (let i = rows / rowDepth; i >= 0; i--) {
      const row = firstRow + i;
      const z = row * rowDepth - travel;
      for (let col = -columns; col < columns; col++) {
        const x = col * 0.28;
        const bend = (noise(row * 17 + col) - 0.5) * 0.1;
        const fill = palette.patches[Math.floor(noise(row * 21 + col + 8) * 4)];
        const farEdge = z + rowDepth - 1;
        const corner = farm ? 0 : (noise(row + col * 11) - 0.5) * 0.1;
        polygon(ctx, farm ? fill : fill + "ac", [project(x + bend, z + 1), project(x + 0.275 + bend, z + 1),
          project(x + 0.275 + corner, farEdge - (farm ? 0 : rowDepth * 0.17)),
          project(x + 0.06, farEdge), project(x, farEdge - (farm ? 0 : rowDepth * 0.22))]);
        if (farm && i < 12) {
          for (let stripe = 0; stripe < 4; stripe++) {
            const line = x + 0.043 + stripe * 0.065;
            polygon(ctx, "#4f664424", [project(line + bend, z + 2), project(line + bend + 0.012, z + 2),
              project(line + 0.012, z + rowDepth - 2), project(line, z + rowDepth - 2)]);
          }
        }
      }
    }
    if (!farm) {
      const river = [];
      for (let z = 0; z <= rows; z += 12) {
        const bend = Math.sin((travel + z) / 117) * 0.15 + Math.cos((travel + z) / 64) * 0.08;
        river.push([project(-0.74 + bend, z), project(-0.70 + bend, z)]);
      }
      polygon(ctx, terrain === "mountain" ? "#96b7bf" : "#8eafa4",
        [...river.map(([left]) => left), ...river.reverse().map(([, right]) => right)]);
    }
    for (let i = 0; i < 22; i++) {
      const mark = Math.floor(travel / 19) + i;
      const z = mark * 19 - travel;
      if (z < 0) continue;
      const x = (noise(mark * 2) - 0.5) * 2.4;
      const [left, y] = project(x, z);
      const size = (0.22 + noise(mark) * 0.78) * h * 0.028 * (y - horizon) / (h - horizon);
      if (farm && mark % 5 === 0) {
        polygon(ctx, "#f0cf9e", [[left, y], [left + 1.4 * size, y], [left + 1.4 * size, y - size], [left, y - size]]);
        polygon(ctx, "#874d43", [[left - 0.2 * size, y - size], [left + 0.7 * size, y - size * 1.55],
          [left + 1.62 * size, y - size], [left, y - size * 0.85]]);
      } else {
        ellipse(ctx, left, y, 1.25 * size, size * 0.38, "#314f4c36");
        ellipse(ctx, left - size * 0.3, y - size * 0.24, 0.85 * size, 0.69 * size, "#365e52");
        ellipse(ctx, left + size * 0.51, y - size * 0.22, 0.62 * size, 0.45 * size, "#527d65");
      }
    }
  }

  function drawSea(ctx, w, h, horizon, palette, travel, offset) {
    for (let i = 43; i >= 0; i--) {
      const row = Math.floor(travel / 9) + i;
      const p = 1 / (1 + (row * 9 - travel) / 74);
      const y = horizon + (h - horizon) * p ** 1.32;
      const ext = (0.11 + noise(row * 2) * 0.44) * w * p;
      const x = noise(row * 3) * (w + ext) - ext - offset * p * 0.34;
      ellipse(ctx, x, y, ext * 0.37, 0.5 + h * 0.0035 * p, palette.patches[i % 4]);
      const sunLeft = w * 0.73 - offset * 0.28;
      ellipse(ctx, sunLeft + (noise(row + 21) - 0.5) * w * p * 0.3, y, w * p * (0.008 + noise(row + 9) * 0.033), 1.5 * p, "#ffe6a866");
    }
  }

  return function drawScenery(ctx, w, h, terrain, { distance, runway, playerX }) {
    const horizon = h * 0.34;
    const travel = distance * 13 + runway * 1.3;
    const offset = playerX * w * 0.15;
    const palette = PALETTES[terrain];
    drawSky(ctx, w, h, horizon, terrain, palette, travel, offset);
    ctx.fillStyle = gradient(ctx, horizon, h, palette.ground);
    ctx.fillRect(0, horizon, w, h - horizon);
    if (terrain === "water") drawSea(ctx, w, h, horizon, palette, travel, offset);
    else drawFields(ctx, w, h, horizon, terrain, palette, travel, offset);
    drawRidges(ctx, w, h, horizon, terrain, palette, offset);
    ctx.fillStyle = gradient(ctx, horizon - h * 0.065, horizon + h * 0.15, ["#f7eacd00", "#f7eacd55", "#f7eacd00"]);
    ctx.fillRect(0, horizon - h * 0.065, w, h * 0.215);
  };
}
