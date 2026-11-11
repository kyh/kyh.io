import type { Camera, Scene, WebGLRenderer } from "three";
import {
  Color,
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene as PostScene,
  ShaderMaterial,
  WebGLRenderTarget,
} from "three";

// The dot pitch in CSS pixels: coarse enough to read as print, fine enough to keep the jar.
const PITCH = 4.5;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Four screens at the classic angles (cyan 15°, magenta 75°, yellow 0°, black 45°),
// with the paper as white: where the picture is paper, no ink is laid down at all.
// The picture's paper went through tone mapping, so it is compared after the same.
// Magenta is held back a little: full strength over yellow turns honey red.
const fragmentShader = `
uniform sampler2D picture;
uniform vec3 paperLinear;
uniform float pitch;
varying vec2 vUv;

float screen(float ink, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  vec2 at = mat2(c, -s, s, c) * gl_FragCoord.xy / pitch;
  float distance = length(fract(at) - 0.5) * pitch;
  float radius = sqrt(ink) * pitch * 0.7071;
  // Dots thinner than the antialiasing fade out rather than leave a half-dot on blank paper.
  return (1.0 - smoothstep(radius - 0.75, radius + 0.75, distance)) * min(radius / 0.75, 1.0);
}

void main() {
  gl_FragColor = texture2D(picture, vUv);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec3 blank = linearToOutputTexel(vec4(toneMapping(paperLinear), 1.0)).rgb;
  vec3 tone = clamp(gl_FragColor.rgb / blank, 0.0, 1.0);
  float k = 1.0 - max(tone.r, max(tone.g, tone.b));
  vec3 cmy = (1.0 - tone - k) / max(1.0 - k, 1e-4);
  cmy *= vec3(1.0, 0.82, 1.0);
  float cyan = screen(cmy.r, 0.2618);
  float magenta = screen(cmy.g, 1.309);
  float yellow = screen(cmy.b, 0.0);
  float black = screen(k, 0.7854);
  vec3 ink = vec3(1.0 - cyan, 1.0 - magenta, 1.0 - yellow) * (1.0 - 0.92 * black);
  gl_FragColor = vec4(ink, 1.0);
}
`;

/**
 * Prints a scene as a newspaper would: rendered off screen, then laid down
 * as dots of four inks. It draws only the ink, white where there is none, for
 * the canvas to multiply onto the page, so the dots land on its creases and stains.
 */
export const createHalftone = (renderer: WebGLRenderer, paperColor: string) => {
  const target = new WebGLRenderTarget(1, 1, { samples: 4, type: HalfFloatType });
  const pitch = { value: PITCH };
  const material = new ShaderMaterial({
    fragmentShader,
    uniforms: {
      paperLinear: { value: new Color(paperColor) },
      picture: { value: target.texture },
      pitch,
    },
    vertexShader,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const post = new PostScene();
  post.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    /** Compiles both passes; the scene's shaders differ off screen, so compile them there. */
    compile: async (scene: Scene, view: Camera) => {
      renderer.setRenderTarget(target);
      const offscreen = renderer.compileAsync(scene, view);
      renderer.setRenderTarget(null);
      await Promise.all([offscreen, renderer.compileAsync(post, camera)]);
    },
    dispose: () => {
      target.dispose();
      quad.geometry.dispose();
      material.dispose();
    },
    render: (scene: Scene, view: Camera) => {
      renderer.setRenderTarget(target);
      renderer.render(scene, view);
      renderer.setRenderTarget(null);
      renderer.render(post, camera);
    },
    /** Matches the drawing buffer, in device pixels. */
    setSize: (width: number, height: number, pixelRatio: number) => {
      target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
      pitch.value = PITCH * pixelRatio;
    },
  };
};
