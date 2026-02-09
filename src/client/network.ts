import { io, Socket } from "socket.io-client";
import type { Player, ServerToClientEvents, ClientToServerEvents } from "../shared/types";
import { FIRE_COOLDOWN } from "../shared/types";
import { state } from "./state";
import { updatePlayerCount } from "./ui";
import { updateStatsUI, updateScoreboard } from "./ui";
import { update } from "./game";
import { draw } from "./renderer";

export let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function loop(): void {
  update();
  draw();
  updateStatsUI();
  updateScoreboard();
  requestAnimationFrame(loop);
}

function startGame(): void {
  requestAnimationFrame(loop);

  // Regular state sync
  setInterval(sendUpdate, 250);
}

export function initSocket(): void {
  try {
    socket = io();

    socket.on("connect", () => {
      document.getElementById("conn-status")!.innerText = "CONNECTED";
      document.getElementById("conn-status")!.className = "text-green-400";
      sendConnect();
    });

    socket.on("connected", (data: Player) => {
      const loadingElement = document.getElementById("loading");
      if (data) {
        state.localPlayer = data;
        if (loadingElement) {
          loadingElement.remove();
        }
        startGame();
      } else {
        if (loadingElement) {
          loadingElement.innerHTML = `
            <h3 class="text-red-500 text-sm mb-2 font-bold tracking-widest">Connection Failed</h3>
            <p class="text-gray-300 text-xs">Please try refreshing the page.</p>
          `;
        }
        console.error("Failed to receive player data on connect");
      }
    });

    socket.on("disconnect", () => {
      document.getElementById("conn-status")!.innerText = "DISCONNECTED";
      document.getElementById("conn-status")!.className = "text-red-500";
    });

    socket.on("players-list", (data: Record<string, Player>) => {
      for (const id in state.players) {
        if (!data[id]) delete state.players[id];
      }

      for (const id in data) {
        if (id === socket?.id) continue;

        if (!state.players[id]) {
          state.players[id] = {
            ...data[id],
            targetX: data[id].x,
            targetY: data[id].y,
          };
        } else {
          state.players[id].targetX = data[id].x;
          state.players[id].targetY = data[id].y;
          state.players[id].name = data[id].name;
          state.players[id].color = data[id].color;
          state.players[id].direction = data[id].direction;
          state.players[id].skinType = data[id].skinType;
        }
      }
      updatePlayerCount();
    });

    socket.on("player-removed", (id) => {
      delete state.players[id];
      updatePlayerCount();
    });

    socket.on("projectile-created", (proj) => {
      state.projectiles.push(proj);
    });

    socket.on("projectile-removed", (id) => {
      state.projectiles = state.projectiles.filter((p) => p.id !== id);
    });

    socket.on("fish-update", (data) => {
      state.fish = data;
    });

    socket.on("fish-collected", (data) => {
      state.fish = state.fish.filter((f) => f.id !== data.fishId);
    });

    socket.on("scores-update", (data) => {
      state.scores = data;
    });

    socket.on("player-stunned", (data) => {
      state.stunned[data.playerId] = {
        until: data.until,
        immuneUntil: data.immuneUntil,
      };
    });
  } catch (e) {
    console.error("Socket error:", e);
  }
}

export function sendConnect(): void {
  if (socket && socket.connected) {
    socket.emit("player-connect");
  }
}

export function sendUpdate(): void {
  if (socket && socket.connected) {
    socket.emit("player-update", {
      x: state.localPlayer.x,
      y: state.localPlayer.y,
      direction: state.localPlayer.direction,
    });
  }
}

export function fireYarn(): void {
  const now = Date.now();

  if (now - state.lastFireTime < FIRE_COOLDOWN) {
    return;
  }

  if (state.stunned[socket?.id ?? ""] && state.stunned[socket?.id ?? ""].until > now) {
    return;
  }

  state.lastFireTime = now;

  if (socket && socket.connected) {
    socket.emit("fire-yarn", {
      directionX: state.lastMovementDirection.x,
      directionY: 0,
    });
  }
}
