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
    if (frame.isActive && !wasActive) {
      game = freshGame();
    }

    wasActive = frame.isActive;
    resize(frame.width, frame.height);
    world.setCoarse(frame.isCoarse);
    bloom.enabled = !frame.isCoarse;

    if (frame.isActive) {
      step(game, dt);
    }

    world.update(game, dt, frame.isActive);
    composer.render(dt);

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
    coins: () => game.coins,
    dispose: () => renderer.dispose(),
    draw,
    gl: renderer.getContext(),
  };
};
