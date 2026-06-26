// Inlined GLSL for the vortex gallery. Ported from the standalone
// vite-plugin-glsl sources so it works under Next's bundler without a loader.

export const vertexShader = /* glsl */ `
#define PI 3.14159265359

attribute float aAngle;
attribute float aHeight;
attribute float aRadius;
attribute float aAspectRatio;
attribute float aSpeed;
attribute vec4 aTextureCoords;
attribute vec2 aImageRes;

varying vec4 vTextureCoords;
varying vec2 vUv;
varying float vAspectRatio;

uniform float uMaxZ;
uniform float uZrange;
uniform float uTime;
uniform float uScrollY;
uniform float uSpeedY;
uniform float uDirection;

vec4 getQuaternionFromAxisAngle(vec3 axis, float angle) {
  float halfAngle = angle * 0.5;
  return vec4(axis.xyz * sin(halfAngle), cos(halfAngle));
}

void main() {
  vec3 scaledPosition = position;
  scaledPosition.y /= aAspectRatio;

  float zPos = aHeight + uScrollY;
  float zRange = uZrange;
  float minZ = (uMaxZ - uZrange);
  // Wrap the z position so the cylinder is seamless.
  zPos = mod(zPos - minZ, zRange) + minZ;

  float theta = aAngle + uSpeedY * 0.4 * aSpeed;

  vec3 instancePosition = vec3(cos(theta) * aRadius, zPos, sin(theta) * aRadius);

  // Face each tile outward from the cylinder axis.
  float angle = atan(instancePosition.x, instancePosition.z);
  vec4 rotation = getQuaternionFromAxisAngle(vec3(0.0, 1.0, 0.0), angle);

  vec3 finalPosition = scaledPosition +
    2.0 * cross(rotation.xyz, cross(rotation.xyz, scaledPosition) + rotation.w * scaledPosition);

  vec4 modelPosition = modelMatrix * vec4(instancePosition + finalPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  vUv = uv;
  vTextureCoords = aTextureCoords;
  vAspectRatio = aAspectRatio;
}
`;

export const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uAtlas;
varying vec4 vTextureCoords;

void main() {
  float xStart = vTextureCoords.x;
  float xEnd = vTextureCoords.y;
  float yStart = vTextureCoords.z;
  float yEnd = vTextureCoords.w;

  vec2 atlasUV = vec2(
    mix(xStart, xEnd, vUv.x),
    mix(yStart, yEnd, 1.0 - vUv.y)
  );

  gl_FragColor = texture2D(uAtlas, atlasUV);
}
`;
