import type { WebGLProgramParametersWithUniforms } from "three";

import type { Time } from "./palette";

const DOT = 2;

const INK: Record<Time, number> = { day: 0.8, night: 1.3 };

export const createShadowDots = (time: Time) => {
  const uniforms = {
    dotCell: { value: DOT },
    dotInk: { value: INK[time] },
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
    setTime: (next: Time) => {
      uniforms.dotInk.value = INK[next];
    },
  };
};
