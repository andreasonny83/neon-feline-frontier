import { io, Socket } from "socket.io-client";
import type { Player, ServerToClientEvents, ClientToServerEvents } from "../shared/types";
import { FIRE_COOLDOWN } from "../shared/types";
import { state, localPlayer } from "./state";
import { updatePlayerCount } from "./ui";

export let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function initSocket(): void {
  try {
    socket = io();

    socket.on("connect", () => {
      document.getElementById("conn-status")!.innerText = "CONNECTED";
      document.getElementById("conn-status")!.className = "text-green-400";
      sendUpdate();
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

    socket.on("projectiles-update", (data) => {
      state.projectiles = data;
    });

    socket.on("fish-update", (data) => {
      state.fish = data;
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

export function sendUpdate(): void {
  if (socket && socket.connected) {
    socket.emit("player-update", {
      x: Math.round(localPlayer.x),
      y: Math.round(localPlayer.y),
      color: localPlayer.color,
      direction: localPlayer.direction,
      skinType: localPlayer.skinType,
      name: localPlayer.name,
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
