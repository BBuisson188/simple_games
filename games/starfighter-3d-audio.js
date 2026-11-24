const PREF = "miniGames.starfighter3D.sound";
const SILENT = .0001;
const tone = (shape, from, to, seconds, level, delay = 0) => ({ shape, from, to, seconds, level, delay });
const hiss = (shape, from, to, seconds, level, delay = 0) => ({ ...tone(shape, from, to, seconds, level, delay), noise: true });
const thud = (from, to, seconds, level, delay = 0) => tone("sine", from, to, seconds, level, delay);

// Small synthesized voices inspired by Arena; no remote or recorded audio assets.
const CUES = {
  laser: [tone("square", 910, 265, .078, .105), hiss("bandpass", 3200, 1000, .07, .038)],
  hostile: [tone("sawtooth", 455, 165, .115, .105)],
  allied: [tone("triangle", 810, 330, .105, .095)],
  armor: [tone("triangle", 730, 265, .077, .13), hiss("highpass", 2920, 1910, .085, .20)],
  turret: [thud(132, 50, .32, .24), hiss("bandpass", 2250, 470, .30, .23)],
  fighterDown: [thud(135, 42, .35, .29), hiss("lowpass", 2600, 290, .43, .29)],
  shield: [tone("triangle", 235, 80, .19, .27), hiss("bandpass", 2730, 530, .18, .28)],
  shieldDown: [tone("triangle", 390, 288, .15, .19), tone("triangle", 280, 165, .28, .20, .15), hiss("lowpass", 2130, 170, .26, .28)],
  scrape: [thud(119, 43, .25, .22), hiss("bandpass", 935, 500, .32, .25)],
  lock: [tone("sine", 620, 620, .09, .14), tone("triangle", 930, 930, .19, .17, .075)],
  torpedo: [thud(127, 44, .33, .25), hiss("bandpass", 250, 1640, .43, .31, .045), tone("triangle", 365, 630, .25, .11, .12)],
  torpedoImpact: [thud(106, 29, .70, .32), hiss("lowpass", 3600, 220, .68, .32), hiss("bandpass", 1760, 800, .13, .16)],
  missileMiss: [thud(145, 73, .18, .14), hiss("lowpass", 1400, 450, .18, .17)],
  warp: [hiss("bandpass", 870, 2460, .22, .23), thud(122, 49, .26, .19, .10)],
  bossWarp: [hiss("bandpass", 160, 1850, .60, .29), thud(120, 36, .73, .34, .18), hiss("lowpass", 3900, 480, .22, .22, .24)],
  hyper: [hiss("bandpass", 260, 3150, 1.82, .25), tone("triangle", 63, 165, 1.79, .17)],
  hyperExit: [thud(172, 48, .34, .31), hiss("lowpass", 3900, 320, .32, .32)],
  charge: [tone("triangle", 126, 412, .54, .14), hiss("bandpass", 420, 1100, .50, .10)],
  cannon: [thud(97, 34, .50, .32), hiss("lowpass", 2830, 210, .49, .32)],
  artillery: [thud(78, 32, .51, .19), hiss("lowpass", 900, 140, .42, .23)],
  artilleryImpact: [thud(80, 27, .41, .18), hiss("lowpass", 720, 180, .43, .23)],
  servo: [tone("sawtooth", 76, 127, .28, .08), hiss("bandpass", 540, 1140, .28, .15)],
  step: [thud(115, 42, .39, .26), hiss("bandpass", 2100, 305, .28, .21), tone("triangle", 430, 158, .12, .12)],
  snap: [thud(169, 73, .24, .18), hiss("bandpass", 570, 2100, .35, .23)],
  halfLoop: [hiss("bandpass", 460, 1730, .62, .19), tone("triangle", 100, 230, .58, .12),
    hiss("bandpass", 1680, 640, .37, .20, .57)],
  breakup: [thud(132, 38, .38, .23), hiss("lowpass", 2700, 305, .46, .28)],
  wreck: [thud(134, 34, .65, .34), hiss("lowpass", 3500, 330, .64, .32), hiss("bandpass", 1640, 770, .44, .14, .26)],
  clear: [tone("triangle", 494, 494, .23, .135), tone("triangle", 659, 659, .29, .14, .13), tone("triangle", 880, 880, .52, .12, .28)]
};
const SPACING = { hostile: .095, allied: .14, armor: .05, breakup: .115, artillery: .20, artilleryImpact: .22,
  servo: .16, step: .10, charge: .32, warp: .19, cannon: .15 };
const RANGE = { warp: [220, 1100], bossWarp: [320, 1500], step: [100, 440], servo: [70, 330],
  artillery: [180, 880], artilleryImpact: [165, 800], breakup: [230, 1100], torpedoImpact: [250, 1050] };

export function createFlightAudio(host = globalThis) {
  let enabled = true, active = false, disposed = false;
  try { enabled = host.localStorage?.getItem(PREF) !== "off"; } catch { /* Browser storage is optional. */ }
  let context, master, noise, engine, wind, position, right;
  const voices = new Set(), recent = new Map();

  function loopBus(source, filter) {
    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    return { source, filter, gain, level: 0, pitch: source.frequency?.value };
  }

  function unlock() {
    if (!enabled || disposed) return;
    const Audio = host.AudioContext || host.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = .57;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -15;
        limiter.ratio.value = 5;
        master.connect(limiter);
        limiter.connect(context.destination);
        noise = context.createBuffer(1, Math.floor(context.sampleRate * 2), context.sampleRate);
        const data = noise.getChannelData(0);
        let seed = 48271;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 16807) % 2147483647;
          data[i] = seed / 1073741824 - 1;
        }
        const hum = context.createOscillator(), engineFilter = context.createBiquadFilter();
        hum.type = "sawtooth";
        hum.frequency.value = 46;
        engineFilter.type = "lowpass";
        engineFilter.frequency.value = 245;
        engine = loopBus(hum, engineFilter);
        const air = context.createBufferSource(), airFilter = context.createBiquadFilter();
        air.buffer = noise;
        air.loop = true;
        airFilter.type = "bandpass";
        airFilter.frequency.value = 520;
        wind = loopBus(air, airFilter);
      }
      if (context.state !== "running") void context.resume().catch(() => {});
    } catch {
      // Audio must never prevent the flight from launching.
    }
  }

  function setLoop(bus, level, pitch) {
    if (!bus) return;
    const now = context.currentTime;
    if (level !== bus.level) {
      bus.level = level;
      bus.gain.gain.setTargetAtTime(level, now, level === 0 ? .035 : .09);
    }
    if (pitch !== undefined && pitch !== bus.pitch) {
      bus.pitch = pitch;
      bus.source.frequency.setTargetAtTime(pitch, now, .08);
      bus.filter.frequency.setTargetAtTime(pitch * 4, now, .10);
    }
  }

  function stop() {
    active = false;
    setLoop(engine, 0);
    setLoop(wind, 0);
    for (const voice of voices) voice.end();
    recent.clear();
  }

  function play(name, from, intensity = 1) {
    const parts = CUES[name];
    if (!active || !enabled || context?.state !== "running" || !parts) return false;
    if (voices.size >= (from ? 14 : 20)) return; // Reserve room for player feedback.
    let pan = 0, level = intensity;
    if (from && position) {
      const dx = from.x - position[0], dy = from.y - position[1], dz = from.z - position[2];
      const distance = Math.hypot(dx, dy, dz);
      const [near, far] = RANGE[name] || [140, 720];
      if (distance >= far) return;
      level *= .73 * (1 - (Math.max(0, distance - near) / (far - near))) ** 2;
      pan = Math.max(-.82, Math.min(.82, (dx * right[0] + dy * right[1] + dz * right[2]) / Math.max(1, distance)));
    }
    if (level < .015) return;
    const now = context.currentTime;
    if (now - (recent.get(name) ?? -Infinity) < (SPACING[name] || 0)) return;
    recent.set(name, now);
    const mix = context.createGain();
    mix.gain.value = level;
    const panner = from && context.createStereoPanner?.();
    if (panner) {
      panner.pan.value = pan;
      mix.connect(panner);
      panner.connect(master);
    } else mix.connect(master);
    const sources = [], nodes = [mix, ...(panner ? [panner] : [])];
    let done = 0;
    const voice = { end() {
      if (!voices.delete(voice)) return;
      for (const source of sources) { try { source.stop(); } catch { /* Already ended. */ } }
      for (const node of nodes) node.disconnect();
    } };
    voices.add(voice);
    for (const part of parts) {
      const start = now + part.delay, end = start + part.seconds;
      const source = part.noise ? context.createBufferSource() : context.createOscillator();
      const gain = context.createGain();
      gain.gain.setValueAtTime(SILENT, start);
      gain.gain.exponentialRampToValueAtTime(part.level, start + (name === "hyper" ? part.seconds * .84 : Math.min(.014, part.seconds * .16)));
      gain.gain.exponentialRampToValueAtTime(SILENT, end);
      if (part.noise) {
        source.buffer = noise;
        const filter = context.createBiquadFilter();
        filter.type = part.shape;
        filter.frequency.setValueAtTime(part.from, start);
        filter.frequency.exponentialRampToValueAtTime(part.to, end);
        source.connect(filter);
        filter.connect(gain);
        nodes.push(filter);
      } else {
        source.type = part.shape;
        source.frequency.setValueAtTime(part.from, start);
        source.frequency.exponentialRampToValueAtTime(part.to, end);
        source.connect(gain);
      }
      gain.connect(mix);
      nodes.push(source, gain);
      sources.push(source);
      source.onended = () => { if (++done === parts.length) voice.end(); };
      if (part.noise) source.start(start, (now * .83 + parts.indexOf(part) * .13) % .14);
      else source.start(start);
      source.stop(end + .015);
    }
    return true;
  }

  return {
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { host.localStorage?.setItem(PREF, enabled ? "on" : "off"); } catch { /* Keep the choice for this visit. */ }
      if (enabled) unlock();
      else {
        const wasActive = active;
        stop();
        active = wasActive;
      }
    },
    unlock,
    start() { active = true; unlock(); },
    stop,
    play,
    listen(camera) {
      position ??= [0, 0, 0];
      right ??= [1, 0, 0];
      position[0] = camera.position.x; position[1] = camera.position.y; position[2] = camera.position.z;
      const basis = camera.matrixWorld.elements;
      right[0] = basis[0]; right[1] = basis[1]; right[2] = basis[2];
    },
    flight({ boosting = false, speed = 0, snowy = false, flying = true } = {}) {
      const live = enabled && active && flying;
      setLoop(engine, live && boosting ? .18 : 0, boosting ? Math.round((45 + speed * .55) / 3) * 3 : 46);
      setLoop(wind, live && snowy ? (boosting ? .16 : .081) : 0);
    },
    dispose() {
      stop();
      disposed = true;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    }
  };
}
