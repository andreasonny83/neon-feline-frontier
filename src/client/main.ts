import { initCanvas, resize } from "./state";
import { initSocket } from "./network";
import { setupKeyboard, setupTouch } from "./input";

function init(): void {
  initCanvas();
  resize();
  window.addEventListener("resize", resize);
  initSocket();
  setupKeyboard();
  setupTouch();
}

window.onload = init;
