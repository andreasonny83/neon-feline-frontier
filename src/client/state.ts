import type { Player, RemotePlayer, Projectile, Fish, StunState } from "../shared/types";

export const state = {
  localPlayer: {} as Player,
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

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
export let minimapCanvas: HTMLCanvasElement;
export let mctx: CanvasRenderingContext2D;

export function initCanvas(): void {
  canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
  ctx = canvas.getContext("2d")!;
  minimapCanvas = document.getElementById("minimapCanvas") as HTMLCanvasElement;
  mctx = minimapCanvas.getContext("2d")!;
}

export function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  minimapCanvas.width = 200;
  minimapCanvas.height = 200;
}
