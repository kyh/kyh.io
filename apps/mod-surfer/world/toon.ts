// Subway Surfers' painted look: flat bands of light instead of smooth
// shading. Every painted surface shares one three-step ramp.
import * as THREE from "three";

const ramp = (() => {
  const steps = new Uint8Array([110, 190, 255]);
  const texture = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
})();

export const toon = (
  color: THREE.ColorRepresentation,
  options: Omit<THREE.MeshToonMaterialParameters, "color" | "gradientMap"> = {},
) => new THREE.MeshToonMaterial({ ...options, color, gradientMap: ramp });
