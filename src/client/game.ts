import { WORLD_SIZE, PLAYER_SPEED, FISH_COLLECTION_RADIUS, PROJECTILE_LIFETIME } from "../shared/types";
import { state, canvas } from "./state";
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
      state.localPlayer.x = Math.max(0, Math.min(WORLD_SIZE, state.localPlayer.x + dx * PLAYER_SPEED));
      state.localPlayer.y = Math.max(0, Math.min(WORLD_SIZE, state.localPlayer.y + dy * PLAYER_SPEED));
      if (dx > 0) state.localPlayer.direction = 1;
      if (dx < 0) state.localPlayer.direction = -1;
    }
  }

  state.camera.x = state.localPlayer.x - canvas.width / 2;
  state.camera.y = state.localPlayer.y - canvas.height / 2;

  // Interpolate remote players
  for (const id in state.players) {
    const p = state.players[id];
    if (p.targetX !== undefined) {
      p.x += (p.targetX - p.x) * 0.15;
      p.y += (p.targetY - p.y) * 0.15;
    }
  }

  // Simulate projectiles locally
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.x += proj.vx;
    proj.y += proj.vy;

    // Remove if out of bounds or expired
    if (
      proj.x < 0 ||
      proj.x > WORLD_SIZE ||
      proj.y < 0 ||
      proj.y > WORLD_SIZE ||
      now - proj.createdAt > PROJECTILE_LIFETIME
    ) {
      state.projectiles.splice(i, 1);
    }
  }

  // Check fish collection for local player only
  if (socket && socket.connected) {
    for (let i = state.fish.length - 1; i >= 0; i--) {
      const f = state.fish[i];
      const fdx = f.x - state.localPlayer.x;
      const fdy = f.y - state.localPlayer.y;
      const distance = Math.sqrt(fdx * fdx + fdy * fdy);
      if (distance < FISH_COLLECTION_RADIUS) {
        socket.emit("collect-fish", { fishId: f.id, playerX: state.localPlayer.x, playerY: state.localPlayer.y });
        state.fish.splice(i, 1); // Optimistic removal -- fish disappears instantly
      }
    }
  }
}
