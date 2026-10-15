// How the town goes up on arrival, as the GPU draws it. Each building rises
// from a slab on its lot a storey at a time: the storey being built rises
// into place, and everything above waits, pressed flat on top of it. When
// each thing starts rides on its geometry (`buildAt`), stamped once a build is
// made, so one merged mesh still goes up building by building; every material
// the town draws with reads it against one clock.
import type { Material, WebGLProgramParametersWithUniforms } from "three";
import { Float32BufferAttribute, InstancedBufferAttribute, Mesh, Vector3 } from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";

import type { Built } from "./render";
import { CURB_TOP } from "./draw-blocks";
import { FLOOR } from "./draw-kit";
import { RISE } from "./schedule";

/** When the thing at a place in town starts going up (s, on the build clock). */
export type StartAt = (x: number, z: number) => number;

/** For what's built from the start (the sky, the machines, a town that's already up). */
export const BUILT: StartAt = () => -1e4;

/** The build clock once everything's up, however late it started. */
export const ALL_BUILT = 1e6;

/** The slab a building stands on before it goes up, just over the curb. */
const FOOT = (CURB_TOP + 0.01).toFixed(2);
/**
 * What's not built yet is pressed down onto what is, not flattened onto it:
 * kept in order, a sliver deep, so the roof stays on top and no two faces
 * share a plane and flicker.
 */
const SQUASH = "0.004";

const BUILD_GLSL = `
uniform float growTime;
vec4 built(vec4 world, float at) {
  if (world.y <= ${FOOT}) {
    return world;
  }
  float floors = max(0.0, (growTime - at) * ${RISE.toFixed(1)}) / ${FLOOR};
  float level = (floor(floors) + smoothstep(0.45, 1.0, fract(floors))) * ${FLOOR};
  float done = max(level, ${FOOT});
  world.y = world.y <= done ? world.y : done + (world.y - done) * ${SQUASH};
  return world;
}
`;

const MESH_PROJECTION = "#include <project_vertex>";

/** Rewrite a vertex shader so its points go up with `growTime`, each from its own start. */
const patch = (shader: WebGLProgramParametersWithUniforms, growTime: { value: number }) => {
  shader.uniforms.growTime = growTime;
  let body = shader.vertexShader;
  if (body.includes(MESH_PROJECTION)) {
    body = `attribute float buildAt;\n${body.replace(
      MESH_PROJECTION,
      `vec4 mvPosition = viewMatrix * built(modelMatrix * vec4(transformed, 1.0), buildAt);
      gl_Position = projectionMatrix * mvPosition;`,
    )}`;
  } else {
    // Fat lines: both ends of each segment.
    for (const end of ["instanceStart", "instanceEnd"]) {
      body = body.replace(
        `modelViewMatrix * vec4( ${end}, 1.0 )`,
        `viewMatrix * built( modelMatrix * vec4( ${end}, 1.0 ), instanceBuildAt )`,
      );
    }
    body = `attribute float instanceBuildAt;\n${body}`;
  }
  shader.vertexShader = BUILD_GLSL + body;
};

/** The build clock every material reads: `adapt` each one the town draws with, `set` it each frame. */
export const createGrowth = () => {
  const growTime = { value: 0 };
  return {
    adapt: (material: Material) => {
      material.onBeforeCompile = (shader) => patch(shader, growTime);
    },
    set: (seconds: number) => {
      growTime.value = seconds;
    },
  };
};

const point = new Vector3();

/**
 * Stamps when each part of a build starts going up, from where it stands in
 * town: each triangle and each ink segment by its middle, a sign or screen
 * (an indexed quad) as a whole. Every build the town draws gets one: what's
 * never built gets BUILT.
 */
export const raise = (built: Built, startAt: StartAt) => {
  built.group.updateMatrixWorld(true);
  built.group.traverse((object) => {
    if (object instanceof LineSegments2) {
      const { geometry } = object;
      const starts = geometry.getAttribute("instanceStart");
      const ends = geometry.getAttribute("instanceEnd");
      const at = new Float32Array(starts.count);
      for (let index = 0; index < starts.count; index += 1) {
        point
          .set(
            (starts.getX(index) + ends.getX(index)) / 2,
            0,
            (starts.getZ(index) + ends.getZ(index)) / 2,
          )
          .applyMatrix4(object.matrixWorld);
        at[index] = startAt(point.x, point.z);
      }
      geometry.setAttribute("instanceBuildAt", new InstancedBufferAttribute(at, 1));
    } else if (object instanceof Mesh) {
      const { geometry } = object;
      const positions = geometry.getAttribute("position");
      const at = new Float32Array(positions.count);
      if (geometry.index) {
        geometry.computeBoundingBox();
        geometry.boundingBox?.getCenter(point).applyMatrix4(object.matrixWorld);
        at.fill(startAt(point.x, point.z));
      } else {
        for (let vertex = 0; vertex + 2 < positions.count; vertex += 3) {
          point
            .set(
              (positions.getX(vertex) + positions.getX(vertex + 1) + positions.getX(vertex + 2)) /
                3,
              0,
              (positions.getZ(vertex) + positions.getZ(vertex + 1) + positions.getZ(vertex + 2)) /
                3,
            )
            .applyMatrix4(object.matrixWorld);
          at.fill(startAt(point.x, point.z), vertex, vertex + 3);
        }
      }
      geometry.setAttribute("buildAt", new Float32BufferAttribute(at, 1));
    }
  });
  return built;
};
