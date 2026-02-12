import { state } from "./state";
import { fireYarn } from "./network";

export function setupKeyboard(): void {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    state.keys[e.code] = true;
    // Fire yarn with Space
    if (e.code === "Space") {
      fireYarn();
    }
  });

  const fireBtn = document.getElementById("mobile-fire-btn")!;
  fireBtn.addEventListener("click", () => {
    fireYarn();
  });
  fireBtn.addEventListener("touchstart", (e: TouchEvent) => {
    e.preventDefault();
    fireBtn.classList.add("active");
    fireYarn();
  }, { passive: false });
  fireBtn.addEventListener("touchend", () => {
    fireBtn.classList.remove("active");
  });
  fireBtn.addEventListener("touchcancel", () => {
    fireBtn.classList.remove("active");
  });

  window.addEventListener("keyup", (e: KeyboardEvent) => {
    state.keys[e.code] = false;
  });
}

export function setupTouch(): void {
  const stick = document.getElementById("mobile-controls")!;
  const handle = document.getElementById("joystick") as HTMLElement;
  let joystickTouchId: number | null = null;

  stick.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joystickTouchId = t.identifier;
      state.joystickActive = true;
      handleTouch(t);
    },
    { passive: false },
  );

  stick.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      e.preventDefault();
      const t = findTouch(e.touches, joystickTouchId);
      if (t) handleTouch(t);
    },
    { passive: false },
  );

  stick.addEventListener("touchend", (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        joystickTouchId = null;
        state.joystickActive = false;
        handle.style.transform = "translate(-50%, -50%)";
        state.joystickData = { x: 0, y: 0 };
        break;
      }
    }
  });

  function findTouch(touches: TouchList, id: number | null): Touch | null {
    if (id === null) return null;
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === id) return touches[i];
    }
    return null;
  }

  function handleTouch(t: Touch): void {
    const r = stick.getBoundingClientRect();
    const dx = t.clientX - (r.left + 75);
    const dy = t.clientY - (r.top + 75);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limited = Math.min(dist, 50);
    const angle = Math.atan2(dy, dx);
    handle.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * limited}px, ${Math.sin(angle) * limited}px)`;
    state.joystickData = { x: (Math.cos(angle) * limited) / 50, y: (Math.sin(angle) * limited) / 50 };
  }
}
