import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  Player,
  Projectile,
  Fish,
  StunState,
  PlayerUpdateData,
  ChatMessageData,
  FireYarnData,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
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
  PLAYER_SPEED,
} from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  server
);

const PORT = process.env.PORT || 3000;

// Serve static files - in production, serve built client
const clientPath = path.join(__dirname, '../../dist/client');
app.use(express.static(clientPath));

// Fallback to public folder for development
app.use(express.static(path.join(__dirname, '../../public')));

// In-memory state
const players: Record<string, Player> = {};
const projectiles: Record<string, Projectile> = {};
const fish: Record<string, Fish> = {};
const stunned: Record<string, StunState> = {};
const playerCooldowns: Record<string, number> = {};
const scores: Record<string, number> = {};

// Helper to create a new player
function createPlayer(id: string): Player {
  const newPlayer: Player = {
    id,
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE,
    direction: 1,
    skinType: 'default',
    name: `Cat-${Math.floor(Math.random() * 1000)}`,
    color: '#ffffff',
    speed: PLAYER_SPEED,
  };
  players[id] = newPlayer;
  scores[id] = 0;
  console.log('New player created:', newPlayer);

  return newPlayer;
}

// Socket.io connection handler
io.on(
  'connection',
  (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    console.log(`User connected: ${socket.id}`);

    // Send current state to newly connected player
    socket.emit('players-list', players);

    // Handle Player Join/Update
    socket.on('player-update', (data: PlayerUpdateData) => {
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
        players[socket.id] = { ...data, id: socket.id, speed: PLAYER_SPEED };
      }
      // Use io.emit so EVERYONE (including the sender) gets the updated list
      io.emit('players-list', players);
    });

    // Handle incoming chat messages
    socket.on('chat-message', (msg: ChatMessageData) => {
      console.log(`Message from ${msg.name}: ${msg.text}`);

      // Broadcast to everyone except the sender
      socket.broadcast.emit('chat-message', {
        senderId: msg.senderId,
        name: msg.name,
        text: msg.text,
        color: msg.color,
        timestamp: Date.now(),
      });
    });

    // Fallback for the secondary event name
    socket.on('send-chat', (msg: ChatMessageData) => {
      socket.broadcast.emit('chat-message', {
        senderId: msg.senderId,
        name: msg.name,
        text: msg.text,
        color: msg.color,
        timestamp: Date.now(),
      });
    });

    // Handle yarn firing
    socket.on('fire-yarn', (data: FireYarnData) => {
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
      io.emit('projectiles-update', Object.values(projectiles));
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      delete players[socket.id];
      delete stunned[socket.id];
      delete playerCooldowns[socket.id];
      delete scores[socket.id];
      io.emit('player-removed', socket.id);
    });

    const player = createPlayer(socket.id);
    socket.emit('new-player', { player, settings: { worldSize: WORLD_SIZE } });
  }
);

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
        io.emit('player-stunned', {
          playerId,
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        });
        delete projectiles[id];
        break;
      }
    }
  }

  let shouldUpdateFish = false;
  let shouldUpdateScores = false;

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
        shouldUpdateFish = true;
        shouldUpdateScores = true;
        io.emit('fish-collected', {
          fishId,
          playerId,
          newScore: scores[playerId],
        });
        delete fish[fishId];
        break;
      }
    }
  }

  // Broadcast state
  if (Object.keys(projectiles).length > 0) {
    io.emit('projectiles-update', Object.values(projectiles));
  }
  if (shouldUpdateFish) {
    io.emit('fish-update', Object.values(fish));
  }
  if (shouldUpdateScores) {
    io.emit('scores-update', scores);
  }
}, 25); // 40 ticks per second

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
    io.emit('fish-update', Object.values(fish));
  }
}, FISH_SPAWN_INTERVAL);

server.listen(PORT, () => {
  console.log(`Neon Feline Server running on http://localhost:${PORT}`);
});
