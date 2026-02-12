import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import type {
  Player,
  Projectile,
  Fish,
  StunState,
  PlayerUpdateData,
  FireYarnData,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  CollectFishData,
} from "../shared/types.js";

import {
  WORLD_SIZE,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_COOLDOWN,
  STUN_DURATION,
  STUN_IMMUNITY,
  HIT_RADIUS,
  FISH_SPAWN_INTERVAL,
  FISH_MAX_COUNT,
  FISH_COLLECTION_RADIUS,
} from "../shared/types.js";
import { createPlayer } from "./player.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server);

const PORT = process.env.PORT || 3000;

// Serve static files - built client in production
app.use(express.static(path.join(__dirname, "../client")));

// In-memory player storage
const players: Record<string, Player> = {};

// Game state
const projectiles: Record<string, Projectile> = {};
const fish: Record<string, Fish> = {};
const stunned: Record<string, StunState> = {};
const playerCooldowns: Record<string, number> = {};
const scores: Record<string, number> = {};

let doesPennyExist = false;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send current state to newly connected player
  socket.emit("players-list", players);

  socket.on("player-connect", () => {
    if (players[socket.id]) {
      socket.emit("connected", players[socket.id]);
      return; // Player already exists, ignore
    }
    // Create new player
    const localPlayer = createPlayer(socket.id, !doesPennyExist);
    players[socket.id] = localPlayer;
    if (players[socket.id].name.startsWith("Penny")) {
      doesPennyExist = true;
    }
    socket.emit("connected", players[socket.id]);
  });

  // Handle Player Join/Update
  socket.on("player-update", (data: PlayerUpdateData) => {
    // Check if player is stunned
    const now = Date.now();
    if (stunned[socket.id] && stunned[socket.id].until > now) {
      // Reject position update, keep other properties
      players[socket.id] = {
        ...players[socket.id],
        id: socket.id,
        direction: data.direction,
      };
    } else {
      // Normal update
      players[socket.id] = { ...players[socket.id], ...data, id: socket.id };
    }
    // Use io.emit so EVERYONE (including the sender) gets the updated list
    io.emit("players-list", players);
  });

  // Handle fish collection (client-detected, server-validated)
  socket.on("collect-fish", (data: CollectFishData) => {
    const player = players[socket.id];
    const f = fish[data.fishId];
    if (!player || !f) return;

    const dx = f.x - data.playerX;
    const dy = f.y - data.playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < FISH_COLLECTION_RADIUS) {
      scores[socket.id] = (scores[socket.id] || 0) + 1;
      io.emit("fish-collected", { fishId: data.fishId, playerId: socket.id, newScore: scores[socket.id] });
      delete fish[data.fishId];
    }
  });

  // Handle yarn firing
  socket.on("fire-yarn", (data: FireYarnData) => {
    const player = players[socket.id];
    if (!player) return;

    // Check if stunned
    const now = Date.now();
    if (stunned[socket.id] && stunned[socket.id].until > now) {
      return;
    }

    // Check cooldown
    const lastShot = playerCooldowns[socket.id] || 0;
    if (now - lastShot < PROJECTILE_COOLDOWN) {
      return;
    }

    // Create projectile
    const projectileId = `proj-${socket.id}-${now}`;
    const { directionX, directionY } = data;

    // Normalize direction
    const mag = Math.sqrt(directionX * directionX + directionY * directionY);
    if (mag === 0) return;

    projectiles[projectileId] = {
      id: projectileId,
      x: player.x,
      y: player.y,
      vx: (directionX / mag) * PROJECTILE_SPEED,
      vy: (directionY / mag) * PROJECTILE_SPEED,
      ownerId: socket.id,
      createdAt: now,
    };

    playerCooldowns[socket.id] = now;
    io.emit("projectile-created", projectiles[projectileId]);
  });

  // Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    if (players[socket.id] && players[socket.id].name.startsWith("Penny")) {
      doesPennyExist = false;
    }
    delete players[socket.id];
    delete stunned[socket.id];
    delete playerCooldowns[socket.id];
    delete scores[socket.id];
    io.emit("player-removed", socket.id);
  });
});

// Server game loop - physics and collision detection
setInterval(() => {
  const now = Date.now();

  // Update projectiles
  for (const id in projectiles) {
    const proj = projectiles[id];

    // Move projectile
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
      delete projectiles[id];
      io.emit("projectile-removed", id);
      continue;
    }

    // Check collision with players
    for (const playerId in players) {
      if (playerId === proj.ownerId) continue;

      // Check immunity
      if (stunned[playerId] && stunned[playerId].immuneUntil > now) {
        continue;
      }

      const player = players[playerId];
      const dx = proj.x - player.x;
      const dy = proj.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < HIT_RADIUS) {
        // HIT!
        stunned[playerId] = {
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        };
        scores[playerId] = (scores[playerId] || 0) > 0 ? (scores[playerId] || 0) - 1 : 0; // Deduct score on hit

        io.emit("player-stunned", {
          playerId,
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        });
        io.emit("projectile-removed", id);
        delete projectiles[id];
        break;
      }
    }
  }

  // Broadcast state
  io.emit("scores-update", scores);
}, 30); // 10 ticks per second

// Fish spawning
setInterval(() => {
  const currentFishCount = Object.keys(fish).length;

  if (currentFishCount < FISH_MAX_COUNT) {
    const fishId = `fish-${Date.now()}-${Math.random()}`;
    fish[fishId] = {
      id: fishId,
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      spawned: Date.now(),
    };
    io.emit("fish-update", Object.values(fish));
  }
}, FISH_SPAWN_INTERVAL);

server.listen(PORT, () => {
  console.log(`Neon Feline Server running on http://localhost:${PORT}`);
});
