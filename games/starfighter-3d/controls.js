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
  const listen = (target, name, handler, options) => target.addEventListener(name, handler, { ...options, signal });
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  const fireButton = surface.querySelector("[data-sf3-fire]");
  const boostButton = surface.querySelector("[data-sf3-boost]");
  const nativeTouch = typeof window.TouchEvent === "function";
  const suppress = (event) => { if (event.cancelable) event.preventDefault(); };

  // Only the flight surface captures these browser gestures. Briefing and arcade menus stay native.
  for (const name of ["contextmenu", "selectstart", "dragstart", "dblclick"]) {
    listen(surface, name, (event) => {
      if (!event.target.closest?.("[data-sf3-score-form] input")) suppress(event);
    }, { capture: true });
  }

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
  listen(fireButton, "click", (event) => { if (event.detail === 0) pulseQueued = true; });

  function moveStick(id, clientX, clientY) {
    if (stick.id !== id) return;
    const box = pad.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (clientX - box.left - box.width / 2) / (box.width * 0.36);
    const y = (clientY - box.top - box.height / 2) / (box.height * 0.36);
    const length = Math.max(1, Math.hypot(x, y));
    stick.x = x / length;
    stick.y = y / length;
    knob.style.left = `${50 + stick.x * 30}%`;
    knob.style.top = `${50 + stick.y * 30}%`;
  }

  listen(pad, "pointerdown", (event) => {
    if (stick.id !== null || event.button !== 0 || (nativeTouch && event.pointerType === "touch")) return;
    event.preventDefault();
    stick.id = event.pointerId;
    pad.setPointerCapture(event.pointerId);
    moveStick(event.pointerId, event.clientX, event.clientY);
  });
  listen(pad, "pointermove", (event) => moveStick(event.pointerId, event.clientX, event.clientY));
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    listen(pad, name, (event) => { if (stick.id === event.pointerId) centerStick(); });
    listen(surface, name, (event) => heldButtons.delete(event.pointerId));
  }

  function hold(id, action) {
    heldButtons.set(id, action);
    if (action === "fire") pulseQueued = true;
  }

  for (const [action, button] of [["boost", boostButton], ["fire", fireButton]]) {
    listen(button, "pointerdown", (event) => {
      if (event.button !== 0 || (nativeTouch && event.pointerType === "touch")) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      hold(event.pointerId, action);
    });
  }

  if (nativeTouch) {
    // Cancel the native gesture at touchstart on the three sustained controls. In WebKit,
    // canceling pointerdown alone can still leave press-and-hold selection/zoom eligible.
    listen(surface, "touchstart", (event) => {
      for (const touch of Array.from(event.changedTouches)) {
        const control = touch.target.closest?.("[data-sf3-stick], [data-sf3-fire], [data-sf3-boost]");
        if (!control) continue;
        suppress(event);
        const id = `touch:${touch.identifier}`;
        if (control === pad) {
          if (stick.id !== null) continue;
          stick.id = id;
          moveStick(id, touch.clientX, touch.clientY);
        } else hold(id, control === fireButton ? "fire" : "boost");
      }
    }, { passive: false });
    listen(surface, "touchmove", (event) => {
      for (const touch of Array.from(event.changedTouches)) moveStick(`touch:${touch.identifier}`, touch.clientX, touch.clientY);
    }, { passive: true });
    for (const name of ["touchend", "touchcancel"]) {
      listen(surface, name, (event) => {
        for (const touch of Array.from(event.changedTouches)) {
          const id = `touch:${touch.identifier}`;
          if (stick.id === id) centerStick();
          heldButtons.delete(id);
        }
      });
    }
  }

  listen(window, "keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || surface.hidden) return;
    if (event.target.closest?.("[data-sf3-score-form] input")) return;
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

  function read(canFire = true) {
    const has = (...codes) => codes.some((code) => keys.has(code));
    const presses = [...heldButtons.values()];
    const fire = pulseQueued || has("Space") || presses.includes("fire");
    const torpedo = torpedoQueued;
    // Retain one quick tap through the weapon cooldown, without stacking up a burst.
    if (canFire) pulseQueued = false;
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
