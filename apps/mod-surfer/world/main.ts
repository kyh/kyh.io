// The page headless Chrome renders. Opened with `?stream`, each frame's
// pixels go to the streamer, whose answer says how big to draw and whether
// Claude is working; opened plainly (`pnpm world`), it runs full-window.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { newGame, step } from "../hooks/game";
import { createHud } from "./hud";
import { createScene } from "./scene";

interface Control {
  width: number;
  height: number;
  isActive: boolean;
  isCoarse: boolean;
}

const IDLE_FRAME_MS = 250;
const params = new URLSearchParams(location.search);
const isStreamed = params.has("stream");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.append(renderer.domElement);

const world = createScene(renderer);
const hud = createHud();
// Only what glows (lamps, headlights, coins) crosses the threshold.
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.4, 0.9);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(world.scene, world.camera));
composer.addPass(bloom);
composer.addPass(new OutputPass());
const game = newGame(Math.floor(Math.random() * 1e6));
let control: Control = {
  height: innerHeight,
  isActive: true,
  isCoarse: params.has("coarse"),
  width: innerWidth,
};
let pixels = new Uint8Array(0);
let isSending = false;

const resize = (width: number, height: number) => {
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x === width && size.y === height) {
    return;
  }
  renderer.setSize(width, height, !isStreamed);
  composer.setSize(width, height);
  world.resize(width, height);
  pixels = new Uint8Array(width * height * 4);
};

// Hands the frame just drawn to the streamer; its answer is the next control.
const send = async () => {
  const gl = renderer.getContext();
  gl.readPixels(0, 0, control.width, control.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const response = await fetch("/frame", {
    body: pixels,
    headers: {
      "x-coins": String(game.coins),
      "x-crashes": String(game.crashes),
      "x-height": String(control.height),
      "x-jumps": String(game.jumps),
      "x-score": String(Math.floor(game.score)),
      "x-width": String(control.width),
    },
    method: "POST",
  });
  const width = Number(response.headers.get("x-width"));
  const height = Number(response.headers.get("x-height"));
  if (width > 0 && height > 0) {
    control = {
      height,
      isActive: response.headers.get("x-active") === "1",
      isCoarse: response.headers.get("x-mode") === "cells",
      width,
    };
  }
};

// One frame in flight at a time: drawing goes on while the streamer takes
// the last, and a frame drawn meanwhile is simply not sent. The pixels are
// read before the first await, so the buffer is never rewritten mid-send.
const sendOnce = async () => {
  isSending = true;
  try {
    await send();
  } catch {
    // The streamer is going away; the next frame tries again.
  } finally {
    isSending = false;
  }
};

const pause = (ms: number) =>
  // oxlint-disable-next-line promise/avoid-new -- a timer has no promise form
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

let last = performance.now();
const frame = async () => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!isStreamed) {
    control = { ...control, height: innerHeight, isActive: true, width: innerWidth };
  }
  resize(control.width, control.height);
  world.setCoarse(control.isCoarse);
  // Bloom at a blocks render is a smear across half the pane.
  bloom.enabled = !control.isCoarse;
  if (control.isActive) {
    step(game, dt);
  }
  world.update(game, dt, control.isActive);
  composer.render(dt);
  // Blocks can't carry text this small; the pane's status line has the score.
  if (!control.isCoarse) {
    hud.draw(control.width, control.height, Math.floor(game.score), game.coins);
    renderer.autoClear = false;
    renderer.render(hud.scene, hud.camera);
    renderer.autoClear = true;
  }
  if (isStreamed && !isSending) {
    void sendOnce();
  }
  if (isStreamed && !control.isActive) {
    await pause(IDLE_FRAME_MS);
  }
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);
