import { WORLD_SIZE } from '../shared/types';
import type { Projectile, Fish, StunState } from '../shared/types';
import { state, localPlayer, canvas, ctx, minimapCanvas, mctx } from './state';
import { socket } from './network';

export function draw(): void {
  ctx.fillStyle = '#0f0a1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);

  // Grid background
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 0, 222, 0.1)';
  for (let x = 0; x <= WORLD_SIZE; x += 100) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_SIZE);
  }
  for (let y = 0; y <= WORLD_SIZE; y += 100) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_SIZE, y);
  }
  ctx.stroke();

  // Draw fish
  for (const f of state.fish) {
    drawFish(f);
  }

  // Draw remote players
  for (const id in state.players) {
    if (state.players[id].x !== undefined) {
      drawCat(state.players[id], state.stunned[id]);
    }
  }

  // Draw local player
  drawCat(localPlayer, state.stunned[socket?.id ?? '']);

  // Draw projectiles
  for (const proj of state.projectiles) {
    drawProjectile(proj);
  }

  ctx.restore();
}

function drawProjectile(proj: Projectile): void {
  console.log(proj);

  ctx.save();
  ctx.translate(proj.x, proj.y);

  // Calculate rotation based on projectile movement
  const rotation = Date.now() * 0.01;
  ctx.rotate(rotation);

  // Outer glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ff00de';

  // Main yarn ball
  ctx.fillStyle = '#ff00de';
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Yarn strands pattern (rotating)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6, angle, angle + Math.PI * 0.6);
    ctx.stroke();
  }

  // Inner highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(-2, -2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFish(f: Fish): void {
  ctx.save();
  ctx.translate(f.x, f.y);

  ctx.fillStyle = '#ffcc00';
  ctx.strokeStyle = '#ff9900';
  ctx.lineWidth = 2;

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-18, -6);
  ctx.lineTo(-18, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(6, -2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawMinimap(): void {
  mctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  const scale = minimapCanvas.width / WORLD_SIZE;
  mctx.strokeStyle = 'rgba(255, 0, 222, 0.2)';
  mctx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  for (const id in state.players) {
    const p = state.players[id];
    mctx.fillStyle = p.color;
    mctx.beginPath();
    mctx.arc(p.x * scale, p.y * scale, 2, 0, Math.PI * 2);
    mctx.fill();
  }

  mctx.fillStyle = '#ffffff';
  mctx.beginPath();
  mctx.arc(localPlayer.x * scale, localPlayer.y * scale, 3, 0, Math.PI * 2);
  mctx.fill();
}

interface DrawableCat {
  x: number;
  y: number;
  direction: number;
  skinType: number;
  name: string;
  color: string;
}

function drawCat(p: DrawableCat, stunnedState: StunState | undefined): void {
  ctx.save();
  ctx.translate(p.x, p.y);

  const now = Date.now();
  const isStunned = stunnedState && stunnedState.until > now;
  const isImmune = stunnedState && stunnedState.immuneUntil > now && !isStunned;

  // Apply blinking transparency for immune cats
  if (isImmune) {
    const blinkSpeed = 0.009;
    const opacity = 0.1 + Math.abs(Math.sin(now * blinkSpeed)) * 0.5;
    ctx.globalAlpha = opacity;
  }

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillText(p.name || '...', 0, -35);

  // Stun indicator
  if (isStunned) {
    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('STUNNED', 0, -50);

    const alpha = 0.3 + Math.sin(now / 100) * 0.2;
    ctx.strokeStyle = `rgba(255, 0, 85, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.scale(p.direction || 1, 1);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 2;

  // Ears
  ctx.beginPath();
  ctx.moveTo(-12, -12);
  ctx.lineTo(-12, -22);
  ctx.lineTo(-4, -12);
  ctx.moveTo(12, -12);
  ctx.lineTo(12, -22);
  ctx.lineTo(4, -12);
  ctx.fill();

  // Body
  if (p.skinType === 1) {
    ctx.fillRect(-12, -12, 24, 24);
  } else if (p.skinType === 2) {
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(15, 10);
    ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.quadraticCurveTo(-25, -20, -15, -30);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6, -4, 2, 0, Math.PI * 2);
  ctx.arc(-2, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
