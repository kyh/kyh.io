// Procedural canvas textures, so the world ships no image files.
import * as THREE from "three";

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    draw(ctx);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
};

// Seeded so every run paints the same town.
const seeded = (seed: number) => {
  let s = Math.abs(seed) + 1;
  return () => {
    s = (s * 16_807) % 2_147_483_647;
    return s / 2_147_483_647;
  };
};

// Soft pebbles, not noise: the game's ballast reads as one warm tone.
export const ballast = () =>
  paint(256, 256, (ctx) => {
    const rand = seeded(11);
    ctx.fillStyle = "#6a5550";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i += 1) {
      const shade = rand() < 0.5 ? "#5c4945" : "#7a645c";
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(
        rand() * 256,
        rand() * 256,
        3 + rand() * 5,
        2 + rand() * 4,
        rand() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  });

const GRAFFITI = ["#ff3d7f", "#22d3ee", "#ffd23d", "#7ee24a", "#a855f7", "#ff8a3d"];
const TAGS = ["CLAUDE", "OPUS", "CLAWD", "SONNET", "HAIKU", "SHIP IT"];

// A low wall's run: warm plaster, a darker cap line, and one bold tag.
export const wall = (seed: number) =>
  paint(512, 128, (ctx) => {
    const rand = seeded(seed);
    ctx.fillStyle = "#e8c9a0";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#c9a57a";
    ctx.fillRect(0, 0, 512, 12);
    ctx.fillStyle = "rgba(120,80,50,0.18)";
    ctx.fillRect(0, 112, 512, 16);
    if (rand() < 0.7) {
      const color = GRAFFITI[Math.floor(rand() * GRAFFITI.length)] ?? "#fff";
      const tag = TAGS[Math.floor(rand() * TAGS.length)] ?? "CLAUDE";
      ctx.save();
      ctx.translate(40 + rand() * 120, 92);
      ctx.rotate((rand() - 0.5) * 0.15);
      ctx.font = '900 64px "Arial Black", Impact, sans-serif';
      ctx.lineJoin = "round";
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#1f1630";
      ctx.strokeText(tag, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(tag, 0, 0);
      ctx.restore();
    }
  });

// A house front: pastel wall, white-framed windows, some lit warm.
export const facade = (seed: number, color: string) =>
  paint(256, 256, (ctx) => {
    const rand = seeded(seed);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 24; y < 256; y += 64) {
      for (let x = 20; x < 256; x += 60) {
        ctx.fillStyle = "#fbf6ee";
        ctx.fillRect(x - 5, y - 5, 38, 46);
        ctx.fillStyle = rand() < 0.3 ? "#ffd98a" : "#3f6f9f";
        ctx.fillRect(x, y, 28, 36);
        ctx.fillStyle = "#fbf6ee";
        ctx.fillRect(x + 12, y, 4, 36);
      }
    }
  });

// Red and white chevrons: barriers and the trains' bumpers.
export const chevrons = () =>
  paint(256, 64, (ctx) => {
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#e3342f";
    for (let x = -64; x < 320; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 28, 0);
      ctx.lineTo(x + 60, 32);
      ctx.lineTo(x + 28, 64);
      ctx.lineTo(x, 64);
      ctx.lineTo(x + 32, 32);
      ctx.fill();
    }
  });
