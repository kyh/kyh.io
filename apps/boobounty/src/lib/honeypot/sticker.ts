import { CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from "three";

import { labelRadiusAt } from "./models";

const FONT = "BooMarker";
const FONT_URL = "/fonts/permanent-marker.woff2";
const WIDTH = 512;
const HEIGHT = 256;
const FACING = Math.PI / 2 + 0.2;
const SPAN = 0.95;
const CENTER_Y = 0.86;
const TALL = 0.48;
const LIFT = 0.006;

const paint = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#fbf7ee";
  context.beginPath();
  context.roundRect(6, 6, WIDTH - 12, HEIGHT - 12, 30);
  context.fill();

  for (let fleck = 0; fleck < 900; fleck += 1) {
    context.fillStyle = `rgba(120, 100, 70, ${Math.random() * 0.06})`;
    context.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 2, 2);
  }

  context.save();
  context.translate(WIDTH / 2, HEIGHT / 2 + 8);
  context.rotate(-0.07);
  context.font = `200px "${FONT}", "Marker Felt", cursive`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(20, 20, 22, 0.25)";
  context.fillText("boo", 2, 2);
  context.fillStyle = "#151517";
  context.fillText("boo", 0, 0);
  context.restore();
};

/** A paper label stuck to the jar's belly with "boo" on it in marker. */
export const createSticker = () => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  paint(canvas);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const geometry = new PlaneGeometry(1, 1, 40, 12);
  const position = geometry.getAttribute("position");

  for (let index = 0; index < position.count; index += 1) {
    const angle = FACING - position.getX(index) * SPAN;
    const y = CENTER_Y + position.getY(index) * TALL;
    const radius = labelRadiusAt(y) + LIFT;
    position.setXYZ(index, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }

  geometry.computeVertexNormals();

  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({
      alphaTest: 0.5,
      emissive: "#ffffff",
      emissiveIntensity: 0.22,
      emissiveMap: texture,
      map: texture,
      roughness: 0.75,
      transparent: true,
    }),
  );

  mesh.renderOrder = 2;

  const ready = async () => {
    const face = await new FontFace(FONT, `url(${FONT_URL})`).load().catch(() => null);

    if (face === null) {
      return;
    }

    document.fonts.add(face);
    paint(canvas);
    texture.needsUpdate = true;
  };

  return { mesh, ready };
};
