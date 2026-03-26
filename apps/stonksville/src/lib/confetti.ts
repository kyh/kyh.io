import { animate } from "motion";

const COLORS = [
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#fbbf24",
  "#fcd34d",
  "#ffffff",
];

const SHAPES = ["circle", "rect", "rect", "strip", "strip"] as const;
type Shape = (typeof SHAPES)[number];

const KEYFRAME_STEPS = 40;
const SCALE_DURATION_FRACTION = 0.08;

function computeKeyframes(params: {
  angle: number;
  startVelocity: number;
  decay: number;
  gravity: number;
  drift: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  size: number;
  ticks: number;
  tiltRotations: number;
  rotation: number;
}) {
  const {
    angle,
    startVelocity,
    decay,
    gravity,
    drift,
    wobbleSpeed,
    wobbleOffset,
    size,
    ticks,
    tiltRotations,
    rotation,
  } = params;

  const transform: string[] = [];
  const opacity: number[] = [];

  let velocity = startVelocity;
  let x = 0;
  let y = 0;
  let wobble = wobbleOffset;
  let tick = 0;

  for (let step = 0; step <= KEYFRAME_STEPS; step++) {
    const t = step / KEYFRAME_STEPS;

    if (step > 0) {
      const targetTick = Math.round((step * ticks) / KEYFRAME_STEPS);
      while (tick < targetTick) {
        x += Math.cos(angle) * velocity + drift;
        y += Math.sin(angle) * velocity + gravity * 3;
        velocity *= decay;
        wobble += wobbleSpeed;
        tick++;
      }
    }

    const wx = step === 0 ? 0 : x + Math.cos(wobble) * 15 * size;
    const wy = y;

    let scale: number;
    if (t < SCALE_DURATION_FRACTION * 0.6) {
      scale = (t / (SCALE_DURATION_FRACTION * 0.6)) * 1.15;
    } else if (t < SCALE_DURATION_FRACTION) {
      const st =
        (t - SCALE_DURATION_FRACTION * 0.6) /
        (SCALE_DURATION_FRACTION * 0.4);
      scale = 1.15 - st * 0.15;
    } else {
      scale = 1;
    }

    const rotateY = tiltRotations * 360 * t;

    let opacityKeyframe: number;
    if (t <= 0.5) {
      opacityKeyframe = 1;
    } else if (t <= 0.8) {
      opacityKeyframe = 1 - ((t - 0.5) / 0.3) * 0.5;
    } else {
      opacityKeyframe = 0.5 - ((t - 0.8) / 0.2) * 0.5;
    }

    transform.push(
      `translate(${wx}px, ${wy}px) scale(${scale}) rotateY(${rotateY}deg) rotate(${rotation}deg)`,
    );
    opacity.push(opacityKeyframe);
  }

  return { transform, opacity };
}

/**
 * Fire confetti from a specific position.
 * When `parent` is provided, confetti renders inside that element using
 * position:absolute (coordinates are parent-local). Otherwise falls back
 * to a viewport-fixed overlay on document.body.
 */
export function fireConfetti(
  originX: number,
  originY: number,
  opts: {
    particleCount?: number;
    startVelocity?: number;
    spread?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    duration?: number;
    size?: number;
    colors?: string[];
    emojis?: string[];
    parent?: HTMLElement;
  } = {},
) {
  const {
    particleCount = 30,
    startVelocity = 20,
    spread = 120,
    decay = 0.91,
    gravity = 0.8,
    drift = 0,
    duration = 2,
    size = 1,
    colors = COLORS,
    emojis,
    parent,
  } = opts;

  const container = document.createElement("div");
  if (parent) {
    container.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:99999;overflow:hidden";
    parent.appendChild(container);
  } else {
    container.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;overflow:hidden";
    document.body.appendChild(container);
  }

  const ticks = Math.round(duration * 60);

  for (let i = 0; i < particleCount; i++) {
    const radSpread = spread * (Math.PI / 180);
    const angle =
      -Math.PI / 2 + (0.5 * radSpread - Math.random() * radSpread);
    const velocity = startVelocity * 0.5 + Math.random() * startVelocity;
    const wobbleSpeed = Math.min(0.11, Math.random() * 0.1 + 0.05);
    const wobbleOffset = Math.random() * 10;
    const pieceSize = 6 * size + Math.random() * 6 * size;
    const tiltRotations = 2 + Math.random() * 4;
    const rotation = Math.random() * 360;

    const keyframes = computeKeyframes({
      angle,
      startVelocity: velocity,
      decay,
      gravity,
      drift,
      wobbleSpeed,
      wobbleOffset,
      size,
      ticks,
      tiltRotations,
      rotation,
    });

    const el = document.createElement("div");

    if (emojis) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)]!;
      el.style.cssText = `position:absolute;left:${originX}px;top:${originY}px;font-size:${pieceSize * 2}px;line-height:1;pointer-events:none;will-change:transform,opacity`;
      el.textContent = emoji;
    } else {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;
      const color = colors[Math.floor(Math.random() * colors.length)]!;
      const w =
        shape === "strip"
          ? pieceSize * 0.3
          : shape === "rect"
            ? pieceSize * 0.7
            : pieceSize;
      const h = shape === "strip" ? pieceSize * 2 : pieceSize;
      const br =
        shape === "circle" ? "50%" : shape === "strip" ? `${pieceSize * 0.12}px` : "2px";
      el.style.cssText = `position:absolute;left:${originX}px;top:${originY}px;width:${w}px;height:${h}px;border-radius:${br};background:${color};pointer-events:none;will-change:transform,opacity`;
    }

    container.appendChild(el);

    animate(el, keyframes, { duration, ease: "linear" });
  }

  setTimeout(() => container.remove(), (duration + 0.5) * 1000);
}
