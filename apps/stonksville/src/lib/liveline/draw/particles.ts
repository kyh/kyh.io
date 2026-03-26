import type { Momentum, DegenOptions } from '../types'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number    // 0-1, starts at 1
  size: number
  color: string
}

export interface ParticleState {
  particles: Particle[]
  cooldown: number  // ms remaining before next burst
  burstCount: number // consecutive fires — resets when magnitude drops below threshold
}

export function createParticleState(): ParticleState {
  return { particles: [], cooldown: 0, burstCount: 0 }
}

const MAX_PARTICLES = 80
const PARTICLE_LIFETIME = 1.0 // seconds
const COOLDOWN_MS = 400
const MAGNITUDE_THRESHOLD = 0.08 // fire when swing > 8% of visible range
const MAX_BURSTS = 3 // max consecutive fires before requiring a calm period

/**
 * Spawn particles on large upward swings. Returns the burst intensity
 * (0 = didn't fire, 0-1 = falloff) so the caller can scale shake.
 *
 * Small, fast-moving dots that disperse widely from the live dot position.
 * Accent-colored with alpha fade.
 */
export function spawnOnSwing(
  state: ParticleState,
  momentum: Momentum,
  dotX: number,
  dotY: number,
  swingMagnitude: number,
  accentColor: string,
  dt: number,
  options?: DegenOptions,
): number {
  state.cooldown = Math.max(0, state.cooldown - dt)

  if (momentum === 'flat') return 0
  if (state.cooldown > 0) return 0

  // Below threshold — reset burst counter (calm period)
  if (swingMagnitude < MAGNITUDE_THRESHOLD) {
    state.burstCount = 0
    return 0
  }

  // Down-momentum disabled by default
  if (momentum === 'down' && options?.downMomentum !== true) return 0

  // Burst limiter — max consecutive fires, resets on calm
  if (state.burstCount >= MAX_BURSTS) return 0

  state.cooldown = COOLDOWN_MS

  const scale = options?.scale ?? 1
  const isUp = momentum === 'up'

  // Burst falloff — first burst is biggest, subsequent taper off.
  // Big swings (mag > 0.6) override the falloff so they always feel impactful.
  const mag = Math.min(swingMagnitude * 5, 1)
  const burstFalloff = mag > 0.6 ? 1 : [1, 0.6, 0.35][state.burstCount] ?? 0.35
  state.burstCount++

  const count = Math.round((12 + mag * 20) * scale * burstFalloff)
  const speedMultiplier = 1.0 + mag * 0.8

  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i++) {
    // Wide burst — almost a full semicircle for maximum dispersal
    const baseAngle = isUp ? -Math.PI / 2 : Math.PI / 2
    const spread = Math.PI * 1.2
    const angle = baseAngle + (Math.random() - 0.5) * spread
    const speed = (60 + Math.random() * 100) * speedMultiplier

    state.particles.push({
      x: dotX + (Math.random() - 0.5) * 24,
      y: dotY + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      size: (1 + Math.random() * 1.2) * scale * burstFalloff,
      color: accentColor,
    })
  }

  return burstFalloff
}

/**
 * Update and draw particles.
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: ParticleState,
  dt: number,
): void {
  if (state.particles.length === 0) return

  const dtSec = dt / 1000

  ctx.save()

  let writeIdx = 0
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i]
    p.life -= dtSec / PARTICLE_LIFETIME
    if (p.life <= 0) continue

    p.x += p.vx * dtSec
    p.y += p.vy * dtSec
    p.vx *= 0.95  // less drag — particles travel further
    p.vy *= 0.95

    ctx.globalAlpha = p.life * 0.55
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2)
    ctx.fill()

    state.particles[writeIdx++] = p
  }
  state.particles.length = writeIdx

  ctx.restore()
}
