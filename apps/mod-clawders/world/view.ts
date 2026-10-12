// One drawing of the world: the renderer, the scene, the run it shows and
// the HUD over it. The streamed page (main.ts) and an embedding page
// (mount.ts) each drive one, a frame at a time.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { newGame, step } from "../hooks/game";
import { createHud } from "./hud";
import { createScene } from "./scene";

export interface Frame {
  width: number;
  height: number;
  isActive: boolean;
  isCoarse: boolean;
  // What the HUD pill shows: the run's tokens, or for the world on its own
  // the distance run.
  score: number | "distance";
}

const freshGame = () => newGame(Math.floor(Math.random() * 1e6));

export const createView = ({ pixelRatio = 1, sizesCanvas = false } = {}) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.1;

  const world = createScene(renderer);
  const hud = createHud();
  // Only what glows (lamps, headlights, coins) crosses the threshold.
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.4, 0.9);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(world.scene, world.camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let game = freshGame();
  let wasActive = false;

  const resize = (width: number, height: number) => {
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x === width && size.y === height) {
      return;
    }
    renderer.setSize(width, height, sizesCanvas);
    composer.setSize(width, height);
    world.resize(width, height);
  };

  const draw = (frame: Frame, dt: number) => {
    // A run that stopped is over: the next one starts a fresh game.
    if (frame.isActive && !wasActive) {
      game = freshGame();
    }
    wasActive = frame.isActive;
    resize(frame.width, frame.height);
    world.setCoarse(frame.isCoarse);
    // Bloom at a blocks render is a smear across half the pane.
    bloom.enabled = !frame.isCoarse;
    if (frame.isActive) {
      step(game, dt);
    }
    world.update(game, dt, frame.isActive);
    composer.render(dt);
    // Blocks can't carry text this small; the pane's status line has the score.
    if (!frame.isCoarse) {
      const score = frame.score === "distance" ? Math.floor(game.score) : frame.score;
      hud.draw(frame.width, frame.height, score, game.coins);
      renderer.autoClear = false;
      renderer.render(hud.scene, hud.camera);
      renderer.autoClear = true;
    }
  };

  return {
    canvas: renderer.domElement,
    // The run's counts so far, for whoever sounds or reports it.
    counts: () => ({ coins: game.coins, crashes: game.crashes, jumps: game.jumps }),
    dispose: () => renderer.dispose(),
    draw,
    gl: renderer.getContext(),
  };
};
