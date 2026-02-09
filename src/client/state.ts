import type { Player, RemotePlayer, Projectile, Fish, StunState } from '../shared/types';
import { WORLD_SIZE, PLAYER_SPEED, PROJECTILE_COOLDOWN } from '../shared/types';

export { WORLD_SIZE, PLAYER_SPEED, PROJECTILE_COOLDOWN };

export const CAT_NAMES = [
  'Meow-tron',
  'Cyber-Whiskers',
  'Pixel-Paw',
  'Bit-Kitten',
  'Neon-Tabby',
  'Glitch-Cat',
  'Data-Pounce',
  'Synth-Claw',
  'Logic-Tail',
  'Laser-Mew',
  'Matrix-Mog',
  'Aero-Fluff',
];

// Game state
export const state = {
  players: {} as Record<string, RemotePlayer>,
  keys: {} as Record<string, boolean>,
  camera: { x: 0, y: 0 },
  projectiles: [] as Projectile[],
  fish: [] as Fish[],
  stunned: {} as Record<string, StunState>,
  scores: {} as Record<string, number>,
  lastFireTime: 0,
  lastMovementDirection: { x: 1, y: 0 },
  joystickActive: false,
  joystickData: { x: 0, y: 0 },
  worldSize: WORLD_SIZE,
};

export const localPlayer: Player = {
  id: '',
  x: 0,
  y: 0,
  color: '#ffffff',
  direction: 1,
  skinType: 0,
  name: '',
  speed: PLAYER_SPEED,
};

// Canvas references
export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
export let minimapCanvas: HTMLCanvasElement;
export let mctx: CanvasRenderingContext2D;

export function initCanvas(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement;
  mctx = minimapCanvas.getContext('2d')!;
}

export function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  minimapCanvas.width = 300;
  minimapCanvas.height = 300;
}
