const BODY_LOCK_CLASS = "gameplay-scroll-lock";
const ROOT_CLASS = "is-gameplay-immersive";

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function exitNativeFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  return exit ? exit.call(document) : Promise.resolve();
}

export function createImmersiveGameplay(root, { orientation } = {}) {
  let active = false;
  let scrollY = 0;

  function setActive(nextActive) {
    if (active === nextActive) return;
    active = nextActive;
    root.classList.toggle(ROOT_CLASS, active);
    document.body.classList.toggle(BODY_LOCK_CLASS, active);
    if (active) {
      scrollY = window.scrollY || 0;
      document.body.style.setProperty("--gameplay-scroll-offset", `${-scrollY}px`);
    } else {
      document.body.style.removeProperty("--gameplay-scroll-offset");
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    }
  }

  async function enter() {
    if (active) return;
    setActive(true);
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (request && fullscreenElement() !== root) {
      try {
        await request.call(root);
      } catch (error) {
        console.info("Native fullscreen unavailable; using locked gameplay mode.", error);
      }
    }
    if (orientation && screen.orientation?.lock) {
      try {
        await screen.orientation.lock(orientation);
      } catch {
        // iPad Safari commonly relies on the player rotating the device.
      }
    }
  }

  async function exit() {
    if (!active && fullscreenElement() !== root) return;
    setActive(false);
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Orientation unlock is optional and unsupported in some browsers.
    }
    if (fullscreenElement() === root) {
      try {
        await exitNativeFullscreen();
      } catch (error) {
        console.info("Unable to exit native fullscreen cleanly.", error);
      }
    }
  }

  function handleFullscreenChange() {
    if (active && fullscreenElement() !== root) setActive(false);
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  return {
    enter,
    exit,
    isActive: () => active,
    destroy() {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      if (active) setActive(false);
      if (fullscreenElement() === root) exitNativeFullscreen().catch(() => {});
    }
  };
}