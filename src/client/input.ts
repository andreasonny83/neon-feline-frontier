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

  window.addEventListener("keyup", (e: KeyboardEvent) => {
    state.keys[e.code] = false;
  });
}

export function setupTouch(): void {
  const stick = document.getElementById("mobile-controls")!;
  const handle = document.getElementById("joystick") as HTMLElement;

  stick.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      state.joystickActive = true;
      handleTouch(e);
    },
    { passive: false },
  );

  stick.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      handleTouch(e);
    },
    { passive: false },
  );

  stick.addEventListener("touchend", () => {
    state.joystickActive = false;
    handle.style.transform = "translate(-50%, -50%)";
    state.joystickData = { x: 0, y: 0 };
  });

  function handleTouch(e: TouchEvent): void {
    e.preventDefault();
    const t = e.targetTouches[0];
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
