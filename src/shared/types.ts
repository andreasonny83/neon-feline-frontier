// Game Constants
export const WORLD_SIZE = 5000;
export const PROJECTILE_SPEED = 25;
export const PROJECTILE_LIFETIME = 2000;
export const PROJECTILE_COOLDOWN = 500;
export const STUN_DURATION = 3000;
export const STUN_IMMUNITY = 5000;
export const HIT_RADIUS = 30;
export const FISH_SPAWN_INTERVAL = 2000;
export const FISH_MAX_COUNT = 500;
export const FISH_COLLECTION_RADIUS = 50;
export const PLAYER_SPEED = 6;

// Player Types
export interface Player {
  id: string;
  x: number;
  y: number;
  direction: number;
  skinType: number | string;
  name: string;
  color: string;
  speed: number;
}

export interface RemotePlayer extends Player {
  targetX: number;
  targetY: number;
}

// Game Objects
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

// Socket Event Payloads - Client to Server
export interface PlayerUpdateData {
  x: number;
  y: number;
  color: string;
  direction: number;
  skinType: number | string;
  name: string;
}

export interface FireYarnData {
  directionX: number;
  directionY: number;
}

export interface ChatMessageData {
  senderId?: string;
  name: string;
  text: string;
  color: string;
  timestamp?: number;
}

// Socket Event Payloads - Server to Client
export interface NewPlayerData {
  player: Player;
  settings: {
    worldSize: number;
  };
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

// Socket Event Maps for type-safe socket.io
export interface ServerToClientEvents {
  'players-list': (players: Record<string, Player>) => void;
  'player-removed': (id: string) => void;
  'new-player': (data: NewPlayerData) => void;
  'chat-message': (msg: ChatMessageData) => void;
  'projectiles-update': (projectiles: Projectile[]) => void;
  'fish-update': (fish: Fish[]) => void;
  'scores-update': (scores: Record<string, number>) => void;
  'player-stunned': (data: PlayerStunnedData) => void;
  'fish-collected': (data: FishCollectedData) => void;
}

export interface ClientToServerEvents {
  'player-update': (data: PlayerUpdateData) => void;
  'chat-message': (msg: ChatMessageData) => void;
  'send-chat': (msg: ChatMessageData) => void;
  'fire-yarn': (data: FireYarnData) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
}
