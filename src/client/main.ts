import { initCanvas, resize, localPlayer } from "./state";
import { initSocket, sendUpdate } from "./network";
import { setupKeyboard, setupTouch } from "./input";
import { updateStatsUI, updateScoreboard } from "./ui";
import { update } from "./game";
import { draw, drawMinimap } from "./renderer";

function loop(): void {
  update();
  draw();
  drawMinimap();
  updateStatsUI();
  updateScoreboard();
  requestAnimationFrame(loop);
}

function init(): void {
  initCanvas();
  resize();
  window.addEventListener("resize", resize);
  initSocket();
  setupKeyboard();
  setupTouch();
  requestAnimationFrame(loop);

  // Regular state sync
  setInterval(sendUpdate, 250);
}

window.onload = init;
