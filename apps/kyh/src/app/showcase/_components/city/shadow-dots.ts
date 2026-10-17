// Shade set as a halftone: faces in shadow carry a fine checker of ink dots
// over their wash, in screen space like an ordered dither, so the shaded side
// of every building reads as printed while lit faces stay flat.
import type { WebGLProgramParametersWithUniforms } from "three";

/** Dot size in CSS pixels. */
const DOT = 2;

/** How a dot changes the wash under it: darker by day, paler by night, as ink would. */
const DAY_INK = 0.8;
const NIGHT_INK = 1.3;

/** The ink at `light` (night 0 … day 1), between the two. */
const inkAt = (light: number) => NIGHT_INK + (DAY_INK - NIGHT_INK) * light;

export const createShadowDots = (light: number) => {
  const uniforms = {
    dotCell: { value: DOT },
    dotInk: { value: inkAt(light) },
  };
  return {
    patch: (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `attribute float shadow;\nvarying float vShadow;\n${shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvShadow = shadow;",
      )}`;
      shader.fragmentShader = `uniform float dotCell;\nuniform float dotInk;\nvarying float vShadow;\n${shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 grid = mod(floor(gl_FragCoord.xy / dotCell), 2.0);
        if (vShadow > 0.5 && grid.x == grid.y) {
          diffuseColor.rgb *= dotInk;
        }`,
      )}`;
    },
    setLight: (next: number) => {
      uniforms.dotInk.value = inkAt(next);
    },
    setPixelRatio: (ratio: number) => {
      uniforms.dotCell.value = Math.max(1, Math.round(DOT * ratio));
    },
  };
};
