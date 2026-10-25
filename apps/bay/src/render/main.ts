// The render page: Google's photorealistic 3D tiles seen through the map's camera, one frame at a
// time. pipeline/render.ts opens it in headless Chromium and calls window.bay.render for each
// tile; nothing here is part of the site.

import { TilesRenderer } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  GoogleCloudAuthPlugin,
  TileCompressionPlugin,
} from "3d-tiles-renderer/plugins";
import { Color, OrthographicCamera, Scene, Vector3, WebGLRenderer } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { cameraFor } from "../lib/grid";
import type { Projection } from "../lib/grid";

declare global {
  interface Window {
    bay: {
      setup: (key: string, size: number) => void;
      render: (
        projection: Projection,
        rect: { x: number; y: number; w: number; h: number },
      ) => Promise<string>;
    };
  }
}

// loaded and settled for this many frames in a row, the picture is done
const SETTLED = 20;
const TIMEOUT = 120_000;

let tiles: TilesRenderer | null = null;
let renderer: WebGLRenderer | null = null;
// what went wrong loading, if anything: a frame with a failed tile is a hole the painter would fill
let failure: string | null = null;
const scene = new Scene();
scene.background = new Color("#ffffff");
const camera = new OrthographicCamera();

const setup = (key: string, size: number) => {
  renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  document.body.append(renderer.domElement);

  const draco = new DRACOLoader().setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  );
  tiles = new TilesRenderer();
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: key, autoRefreshToken: true }));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
  // the auth plugin's recommended 20 is for a moving camera; a still picture wants every detail
  tiles.errorTarget = 2;
  tiles.addEventListener("load-error", (e) => {
    failure = `${String(e.url)}: ${e.error.message}`;
  });
  scene.add(tiles.group);
};

const frame = () =>
  // oxlint-disable-next-line promise/avoid-new -- requestAnimationFrame has no promise form
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const render = async (
  projection: Projection,
  rect: { x: number; y: number; w: number; h: number },
) => {
  if (!(tiles && renderer)) {
    throw new Error("call setup first");
  }
  const cam = cameraFor(projection, rect);
  camera.left = -cam.halfWidth;
  camera.right = cam.halfWidth;
  camera.top = cam.halfHeight;
  camera.bottom = -cam.halfHeight;
  camera.near = cam.near;
  camera.far = cam.far;
  camera.position.set(...cam.position);
  camera.up.set(...cam.up);
  camera.lookAt(new Vector3(...cam.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  failure = null;
  const start = performance.now();
  let settled = 0;
  while (settled < SETTLED) {
    if (performance.now() - start > TIMEOUT) {
      throw new Error(
        `tiles still loading after ${TIMEOUT / 1000}s (${Math.round(tiles.loadProgress * 100)}%)`,
      );
    }
    tiles.update();
    renderer.render(scene, camera);
    if (failure) {
      throw new Error(`a tile failed to load: ${failure}`);
    }
    settled = tiles.loadProgress === 1 ? settled + 1 : 0;
    await frame();
  }
  if (renderer.info.render.triangles === 0) {
    throw new Error("nothing in view to render");
  }
  return renderer.domElement.toDataURL("image/png");
};

window.bay = { render, setup };
