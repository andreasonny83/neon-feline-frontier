import { WORLD_SIZE, PLAYER_SPEED } from "../shared/types";
import { state, localPlayer, canvas } from "./state";
import { socket } from "./network";

export function update(): void {
  let dx = 0;
  let dy = 0;

  const now = Date.now();
  const isStunned = state.stunned[socket?.id ?? ""] && state.stunned[socket?.id ?? ""].until > now;

  if (!isStunned) {
    if (state.keys["ArrowUp"] || state.keys["KeyW"]) dy -= 1;
    if (state.keys["ArrowDown"] || state.keys["KeyS"]) dy += 1;
    if (state.keys["ArrowLeft"] || state.keys["KeyA"]) dx -= 1;
    if (state.keys["ArrowRight"] || state.keys["KeyD"]) dx += 1;
    if (state.joystickActive) {
      dx = state.joystickData.x;
      dy = state.joystickData.y;
    }

    if (dx !== 0 || dy !== 0) {
      if (dx !== 0) {
        // Track last movement direction for yarn aiming
        state.lastMovementDirection = { x: dx, y: dy };
      }
      if (!state.joystickActive) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        dx /= mag;
        dy /= mag;
      }
      localPlayer.x = Math.max(0, Math.min(WORLD_SIZE, localPlayer.x + dx * PLAYER_SPEED));
      localPlayer.y = Math.max(0, Math.min(WORLD_SIZE, localPlayer.y + dy * PLAYER_SPEED));
      if (dx > 0) localPlayer.direction = 1;
      if (dx < 0) localPlayer.direction = -1;
    }
  }

  state.camera.x = localPlayer.x - canvas.width / 2;
  state.camera.y = localPlayer.y - canvas.height / 2;

  // Interpolate remote players
  for (const id in state.players) {
    const p = state.players[id];
    if (p.targetX !== undefined) {
      p.x += (p.targetX - p.x) * 0.15;
      p.y += (p.targetY - p.y) * 0.15;
    }
  }
}
