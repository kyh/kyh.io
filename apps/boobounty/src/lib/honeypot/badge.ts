import { CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from "three";

const WIDTH = 640;
const HEIGHT = 480;
const SIZE = { depth: 1.2, width: 1.6 };
const SANS = '"Helvetica Neue", Arial, sans-serif';
// Left of the jar and toward the viewer: in frame, and off the demo's drizzle.
export const BADGE = { radius: 0.45, x: -1.4, z: 1.15 };

const paint = (context: CanvasRenderingContext2D) => {
  context.clearRect(0, 0, WIDTH, HEIGHT);

  // The lanyard, running off the top edge.
  context.strokeStyle = "#b3241f";
  context.lineWidth = 30;
  context.beginPath();
  context.moveTo(280, 70);
  context.bezierCurveTo(230, 30, 160, 10, 120, 0);
  context.moveTo(360, 70);
  context.bezierCurveTo(410, 30, 500, 10, 540, 0);
  context.stroke();
  context.fillStyle = "#9aa0a6";
  context.fillRect(300, 52, 40, 40);

  context.fillStyle = "#fbfbf8";
  context.beginPath();
  context.roundRect(40, 80, 560, 390, 22);
  context.fill();

  context.fillStyle = "#1d1d1f";
  context.beginPath();
  context.roundRect(40, 80, 560, 92, [22, 22, 0, 0]);
  context.fill();
  context.fillStyle = "#fbfbf8";
  context.font = `bold 50px ${SANS}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("FRONTIER LAB", 320, 128);

  context.fillStyle = "#c9c4b8";
  context.fillRect(70, 196, 150, 180);
  context.fillStyle = "#8f897c";
  context.beginPath();
  context.arc(145, 256, 38, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(145, 372, 64, 62, 0, Math.PI, 0);
  context.fill();

  context.textAlign = "left";
  context.fillStyle = "#1d1d1f";
  context.font = `bold 104px ${SANS}`;
  context.fillText("KEVIN", 244, 248);
  context.font = `36px ${SANS}`;
  context.fillText("Staff Engineer", 248, 318);
  context.fillStyle = "#c41e1a";
  context.font = `bold 32px ${SANS}`;
  context.fillText("ALL ACCESS", 248, 364);

  context.fillStyle = "#1d1d1f";
  for (let bar = 0; bar < 64; bar += 1) {
    context.fillRect(70 + bar * 7.9, 400, bar % 3 === 0 ? 5 : 2.5, 46);
  }
};

/** Kevin's conference badge, dropped on the floor beside the jar, waiting for honey. */
export const createBadge = () => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (context) {
    paint(context);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  const mesh = new Mesh(
    new PlaneGeometry(SIZE.width, SIZE.depth),
    // Lit a little from within, like the label: the studio is dim and the card should read white.
    new MeshStandardMaterial({
      alphaTest: 0.5,
      emissive: "#ffffff",
      emissiveIntensity: 0.4,
      emissiveMap: texture,
      map: texture,
      // Under the puddles, which start a millimeter up.
      polygonOffset: true,
      polygonOffsetFactor: -1,
      roughness: 0.6,
    }),
  );
  mesh.rotation.set(-Math.PI / 2, 0, 0.25);
  mesh.position.set(BADGE.x, 0.0006, BADGE.z);
  mesh.receiveShadow = true;
  return mesh;
};

/** Whether honey falling at (x, z), in the jar's frame, lands on the badge. */
export const onBadge = (x: number, z: number) =>
  Math.hypot(x - BADGE.x, z - BADGE.z) < BADGE.radius;
