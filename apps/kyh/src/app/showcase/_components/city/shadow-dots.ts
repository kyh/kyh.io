// Shade set as a halftone: faces in shadow carry a fine checker of ink dots
// over their wash, in screen space like an ordered dither, so the shaded side
// of every building reads as printed while lit faces stay flat.
import type { WebGLProgramParametersWithUniforms } from "three";

import type { Theme } from "./palette";

/** Dot size in CSS pixels. */
const DOT = 2;

/** How a dot changes the wash under it: darker by day, paler by night, as ink would. */
const INK: Record<Theme, number> = { day: 0.8, night: 1.3 };

export const createShadowDots = (theme: Theme) => {
  const uniforms = {
    dotCell: { value: DOT },
    dotInk: { value: INK[theme] },
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
    setPixelRatio: (ratio: number) => {
      uniforms.dotCell.value = Math.max(1, Math.round(DOT * ratio));
    },
    setTheme: (next: Theme) => {
      uniforms.dotInk.value = INK[next];
    },
  };
};
