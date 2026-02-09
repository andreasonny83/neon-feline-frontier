import type { RemotePlayer, Projectile, Fish, StunState } from '../shared/types';
import { WORLD_SIZE } from '../shared/types';

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

function getRandomNeonColor(): string {
  return ['#ff0055', '#00ff99', '#00ccff', '#cc00ff', '#ffcc00'][Math.floor(Math.random() * 5)];
}

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
};

export const localPlayer = {
  x: Math.random() * WORLD_SIZE,
  y: Math.random() * WORLD_SIZE,
  color: getRandomNeonColor(),
  direction: 1,
  skinType: Math.floor(Math.random() * 3),
  name: CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)] + '-' + Math.floor(Math.random() * 99),
};

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
