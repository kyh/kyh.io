// The confetti, drawn on one canvas over the page while any is in the air:
// each find throws a fountain (`throwConfetti`) that `stepConfetto` moves on,
// frame by frame. The canvas comes and goes with the confetti, so a page with
// none has nothing over it.
import type { Confetto } from "./burst";
import { stepConfetto, throwConfetti } from "./burst";

/** How long a fountain lasts, and the fade at its end, in ms. */
const LIFE = 2800;
const FADE = 700;

interface Fountain {
  from: { x: number; y: number };
  born: number;
  bits: Confetto[];
}

let fountains: Fountain[] = [];
let canvas: HTMLCanvasElement | null = null;
let frame = 0;
let last = 0;

const fit = (target: HTMLCanvasElement) => {
  const ratio = window.devicePixelRatio || 1;
  target.width = Math.round(window.innerWidth * ratio);
  target.height = Math.round(window.innerHeight * ratio);
};

const draw = (
  context: CanvasRenderingContext2D,
  fountain: Fountain,
  frames: number,
  alpha: number,
) => {
  for (const bit of fountain.bits) {
    const flip = stepConfetto(bit, frames);
    context.save();
    context.globalAlpha = alpha;
    context.translate(fountain.from.x + bit.x, fountain.from.y + bit.y);
    context.fillStyle = flip > 0 ? bit.front : bit.back;
    if (bit.kind === "sequin") {
      context.beginPath();
      context.arc(0, 0, bit.width, 0, Math.PI * 2);
      context.fill();
    } else {
      context.rotate(bit.rotation);
      context.scale(1, flip);
      context.fillRect(-bit.width / 2, -bit.height / 2, bit.width, bit.height);
    }
    context.restore();
  }
};

const tick = (now: number) => {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    return;
  }
  // Frames at 60fps since the last draw, capped so a stalled tab doesn't jump.
  const frames = Math.min(3, (now - last) / (1000 / 60));
  last = now;
  fountains = fountains.filter((fountain) => now - fountain.born < LIFE);
  const ratio = window.devicePixelRatio || 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const fountain of fountains) {
    const left = LIFE - (now - fountain.born);
    draw(context, fountain, frames, Math.min(1, left / FADE));
  }
  if (fountains.length > 0) {
    frame = requestAnimationFrame(tick);
    return;
  }
  canvas.remove();
  canvas = null;
};

/** Throw a fountain of confetti out of a point on the screen. */
export const throwConfettiAt = (from: { x: number; y: number }) => {
  const now = performance.now();
  fountains.push({ bits: throwConfetti(), born: now, from });
  if (canvas) {
    return;
  }
  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:61";
  fit(canvas);
  document.body.append(canvas);
  last = now;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(tick);
};
