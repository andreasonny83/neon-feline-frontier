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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server);

const PORT = process.env.PORT || 3000;

// Serve static files - built client in production, public/ as fallback
app.use(express.static(path.join(__dirname, "../../dist/client")));
app.use(express.static(path.join(__dirname, "../../public")));

// In-memory player storage
const players: Record<string, Player> = {};

// Game state
const projectiles: Record<string, Projectile> = {};
const fish: Record<string, Fish> = {};
const stunned: Record<string, StunState> = {};
const playerCooldowns: Record<string, number> = {};
const scores: Record<string, number> = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send current state to newly connected player
  socket.emit("players-list", players);

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
        skinType: data.skinType,
        name: data.name,
        color: data.color,
      };
    } else {
      // Normal update
      players[socket.id] = { ...data, id: socket.id };
    }
    // Use io.emit so EVERYONE (including the sender) gets the updated list
    io.emit("players-list", players);
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
    io.emit("projectiles-update", Object.values(projectiles));
  });

  // Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
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
        io.emit("player-stunned", {
          playerId,
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        });
        delete projectiles[id];
        break;
      }
    }
  }

  // Check fish collection
  for (const fishId in fish) {
    const f = fish[fishId];
    for (const playerId in players) {
      const player = players[playerId];
      const dx = f.x - player.x;
      const dy = f.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < FISH_COLLECTION_RADIUS) {
        // Collect fish
        scores[playerId] = (scores[playerId] || 0) + 1;
        io.emit("fish-collected", { fishId, playerId, newScore: scores[playerId] });
        delete fish[fishId];
        break;
      }
    }
  }

  // Broadcast state
  io.emit("projectiles-update", Object.values(projectiles));
  // io.emit('fish-update', Object.values(fish));
  io.emit("scores-update", scores);
}, 20); // 40 ticks per second

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
