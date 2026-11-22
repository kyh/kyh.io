import type { Momentum, DegenOptions } from "../types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0-1, starts at 1 */
  life: number;
  size: number;
  color: string;
}

export interface ParticleState {
  particles: Particle[];
  /** ms remaining before next burst */
  cooldown: number;
  /** consecutive fires — resets when magnitude drops below threshold */
  burstCount: number;
}

export const createParticleState = () =>
  ({
    burstCount: 0,
    cooldown: 0,
    particles: [],
  }) satisfies ParticleState;

const MAX_PARTICLES = 80;
const PARTICLE_LIFETIME = 1;
const COOLDOWN_MS = 400;
const MAGNITUDE_THRESHOLD = 0.08;
const MAX_BURSTS = 3;

/**
 * Spawn particles on large upward swings. Returns the burst intensity
 * (0 = didn't fire, 0-1 = falloff) so the caller can scale shake.
 *
 * Small, fast-moving dots that disperse widely from the live dot position.
 * Accent-colored with alpha fade.
 */
export const spawnOnSwing = (
  state: ParticleState,
  momentum: Momentum,
  dotX: number,
  dotY: number,
  swingMagnitude: number,
  accentColor: string,
  dt: number,
  options?: DegenOptions,
) => {
  state.cooldown = Math.max(0, state.cooldown - dt);

  if (momentum === "flat") {
    return 0;
  }

  if (state.cooldown > 0) {
    return 0;
  }

  if (swingMagnitude < MAGNITUDE_THRESHOLD) {
    state.burstCount = 0;

    return 0;
  }

  if (momentum === "down" && options?.downMomentum !== true) {
    return 0;
  }

  if (state.burstCount >= MAX_BURSTS) {
    return 0;
  }

  state.cooldown = COOLDOWN_MS;

  const scale = options?.scale ?? 1;
  const isUp = momentum === "up";

  const mag = Math.min(swingMagnitude * 5, 1);
  const burstFalloff = mag > 0.6 ? 1 : ([1, 0.6, 0.35][state.burstCount] ?? 0.35);
  state.burstCount += 1;

  const count = Math.round((12 + mag * 20) * scale * burstFalloff);
  const speedMultiplier = 1 + mag * 0.8;

  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i += 1) {
    const baseAngle = isUp ? -Math.PI / 2 : Math.PI / 2;
    const spread = Math.PI * 1.2;
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    const speed = (60 + Math.random() * 100) * speedMultiplier;

    state.particles.push({
      color: accentColor,
      life: 1,
      size: (1 + Math.random() * 1.2) * scale * burstFalloff,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      x: dotX + (Math.random() - 0.5) * 24,
      y: dotY + (Math.random() - 0.5) * 8,
    });
  }

  return burstFalloff;
};

/**
 * Update and draw particles.
 */
export const drawParticles = (ctx: CanvasRenderingContext2D, state: ParticleState, dt: number) => {
  if (state.particles.length === 0) {
    return;
  }

  const dtSec = dt / 1000;

  ctx.save();

  let writeIdx = 0;

  for (const p of state.particles) {
    p.life -= dtSec / PARTICLE_LIFETIME;

    if (p.life <= 0) {
      continue;
    }

    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.95;
    p.vy *= 0.95;

    ctx.globalAlpha = p.life * 0.55;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2);
    ctx.fill();

    state.particles[writeIdx] = p;
    writeIdx += 1;
  }

  state.particles.length = writeIdx;

  ctx.restore();
};
