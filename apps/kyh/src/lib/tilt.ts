// Tilt gravity: the share of the downward pull figures always keep, so they
// never float off the top
const MIN_DOWNWARD_GRAVITY = 0.3;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Gravity in screen coordinates (x right, y down) from the device's
// orientation. Projecting the world's down vector into the device frame stays
// continuous where raw gamma flips (held upright), and rotating by the screen
// angle keeps "down" down in landscape
export const tiltGravity = (beta: number, gamma: number, screenAngle: number) => {
  const b = toRadians(beta);
  const g = toRadians(gamma);
  const deviceX = Math.sin(g) * Math.cos(b);
  const deviceY = Math.sin(b);
  const a = toRadians(screenAngle);
  return {
    x: deviceX * Math.cos(a) - deviceY * Math.sin(a),
    y: Math.max(MIN_DOWNWARD_GRAVITY, deviceX * Math.sin(a) + deviceY * Math.cos(a)),
  };
};
