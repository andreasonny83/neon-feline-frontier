// ---- Game Constants (must match original server.js exactly) ----
export const WORLD_SIZE = 50000;
export const PROJECTILE_SPEED = 25;
export const PROJECTILE_LIFETIME = 2000;
export const PROJECTILE_COOLDOWN = 500;
export const STUN_DURATION = 3000;
export const STUN_IMMUNITY = 5000;
export const HIT_RADIUS = 30;
export const FISH_SPAWN_INTERVAL = 1000;
export const FISH_MAX_COUNT = 250;
export const FISH_COLLECTION_RADIUS = 50;
export const PLAYER_SPEED = 15;
export const FIRE_COOLDOWN = 500;

// ---- Data Structures ----

export interface Player {
  id: string;
  x: number;
  y: number;
  direction: number;
  skinType: number;
  name: string;
  color: string;
}

export interface RemotePlayer extends Player {
  targetX: number;
  targetY: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  createdAt: number;
}

export interface Fish {
  id: string;
  x: number;
  y: number;
  spawned: number;
}

export interface StunState {
  until: number;
  immuneUntil: number;
}

// ---- Socket Event Payloads ----

export interface PlayerUpdateData {
  x: number;
  y: number;
  color: string;
  direction: number;
  skinType: number;
  name: string;
}

export interface FireYarnData {
  directionX: number;
  directionY: number;
}

export interface PlayerStunnedData {
  playerId: string;
  until: number;
  immuneUntil: number;
}

export interface FishCollectedData {
  fishId: string;
  playerId: string;
  newScore: number;
}

// ---- Typed Socket.io Event Maps ----

export interface ServerToClientEvents {
  "players-list": (players: Record<string, Player>) => void;
  "player-removed": (id: string) => void;
  "projectiles-update": (projectiles: Projectile[]) => void;
  "fish-update": (fish: Fish[]) => void;
  "scores-update": (scores: Record<string, number>) => void;
  "player-stunned": (data: PlayerStunnedData) => void;
  "fish-collected": (data: FishCollectedData) => void;
}

export interface ClientToServerEvents {
  "player-update": (data: PlayerUpdateData) => void;
  "fire-yarn": (data: FireYarnData) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
}
