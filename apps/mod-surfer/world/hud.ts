// The score over the picture, as Subway Surfers lays it out: the run's
// score in a pill at the top, the coins top right. Painted on a canvas and
// drawn last, over the bloom, so it stays crisp.
import * as THREE from "three";

const pill = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
};

const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, ctx.measureText("0").width * 0.22);
  ctx.strokeStyle = "#1a1f3a";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
};

const coin = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  ctx.fillStyle = "#c98a00";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffc61f";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe36a";
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r * 0.55 : r * 0.24;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.fill();
};

export const createHud = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        depthTest: false,
        map: texture,
        toneMapped: false,
        transparent: true,
      }),
    ),
  );
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let shown = "";

  const draw = (width: number, height: number, score: number, coins: number) => {
    const key = `${width}x${height}:${score}:${coins}`;
    if (!ctx || key === shown) {
      return;
    }
    shown = key;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    const size = Math.round(Math.min(height * 0.065, width * 0.07));
    const top = size * 0.5;
    ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    ctx.textBaseline = "middle";

    const text = score.toLocaleString("en-US");
    const scoreWidth = ctx.measureText(text).width + size * 1.4;
    ctx.fillStyle = "rgba(24, 34, 74, 0.55)";
    pill(ctx, (width - scoreWidth) / 2, top, scoreWidth, size * 1.4);
    ctx.textAlign = "center";
    label(ctx, text, width / 2, top + size * 0.72);

    const count = String(coins);
    const countWidth = ctx.measureText(count).width;
    const boxWidth = countWidth + size * 2.2;
    ctx.fillStyle = "rgba(24, 34, 74, 0.55)";
    pill(ctx, width - boxWidth - size * 0.5, top, boxWidth, size * 1.4);
    coin(ctx, width - boxWidth - size * 0.5 + size * 0.75, top + size * 0.7, size * 0.55);
    ctx.textAlign = "right";
    label(ctx, count, width - size * 0.95, top + size * 0.72);
    texture.needsUpdate = true;
  };

  return { camera, draw, scene };
};
