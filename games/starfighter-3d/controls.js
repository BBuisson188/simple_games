const FLIGHT_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
  "KeyA", "KeyD", "KeyW", "KeyS", "KeyQ", "KeyE", "KeyT", "Space", "ShiftLeft", "ShiftRight"]);

export function createFlightControls(surface, signal, onPause) {
  const keys = new Set();
  const heldButtons = new Map();
  const pad = surface.querySelector("[data-sf3-stick]");
  const knob = pad.firstElementChild;
  const stick = { id: null, x: 0, y: 0 };
  let pulseQueued = false;
  let torpedoQueued = false;
  const listen = (target, name, handler) => target.addEventListener(name, handler, { signal });
  const clamp = (value) => Math.max(-1, Math.min(1, value));

  function centerStick() {
    stick.id = null;
    stick.x = stick.y = 0;
    knob.style.left = knob.style.top = "50%";
  }

  function clear() {
    keys.clear();
    heldButtons.clear();
    pulseQueued = false;
    torpedoQueued = false;
    centerStick();
  }

  listen(surface.querySelector("[data-sf3-torpedo]"), "click", () => { torpedoQueued = true; });

  function moveStick(event) {
    if (stick.id !== event.pointerId) return;
    const box = pad.getBoundingClientRect();
    const x = (event.clientX - box.left - box.width / 2) / (box.width * 0.36);
    const y = (event.clientY - box.top - box.height / 2) / (box.height * 0.36);
    const length = Math.max(1, Math.hypot(x, y));
    stick.x = x / length;
    stick.y = y / length;
    knob.style.left = `${50 + stick.x * 30}%`;
    knob.style.top = `${50 + stick.y * 30}%`;
  }

  listen(pad, "pointerdown", (event) => {
    if (stick.id !== null || event.button !== 0) return;
    event.preventDefault();
    stick.id = event.pointerId;
    pad.setPointerCapture(event.pointerId);
    moveStick(event);
  });
  listen(pad, "pointermove", moveStick);
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    listen(pad, name, (event) => { if (stick.id === event.pointerId) centerStick(); });
    listen(surface, name, (event) => heldButtons.delete(event.pointerId));
  }

  for (const action of ["boost", "fire"]) {
    const button = surface.querySelector(`[data-sf3-${action}]`);
    listen(button, "pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      heldButtons.set(event.pointerId, action);
      if (action === "fire") pulseQueued = true;
    });
  }

  listen(window, "keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || surface.hidden) return;
    if ((event.code === "Escape" || event.code === "KeyP") && !event.repeat) {
      onPause();
    } else if (FLIGHT_KEYS.has(event.code) && !(event.code === "Space" && event.target.closest?.("button"))) {
      event.preventDefault();
      keys.add(event.code);
      if (event.code === "Space" && !event.repeat) pulseQueued = true;
      if (event.code === "KeyT" && !event.repeat) torpedoQueued = true;
    }
  });
  listen(window, "keyup", (event) => keys.delete(event.code));

  function read() {
    const has = (...codes) => codes.some((code) => keys.has(code));
    const presses = [...heldButtons.values()];
    const fire = pulseQueued || has("Space") || presses.includes("fire");
    const torpedo = torpedoQueued;
    pulseQueued = false;
    torpedoQueued = false;
    return {
      yaw: clamp(stick.x + Number(has("ArrowRight", "KeyD")) - Number(has("ArrowLeft", "KeyA"))),
      pitch: clamp(-stick.y + Number(has("ArrowUp", "KeyW")) - Number(has("ArrowDown", "KeyS"))),
      roll: Number(has("KeyQ")) - Number(has("KeyE")),
      fire,
      torpedo,
      boost: has("ShiftLeft", "ShiftRight") || presses.includes("boost")
    };
  }

  return { read, clear };
}
