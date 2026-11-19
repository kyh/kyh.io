const MIN_DOWNWARD_GRAVITY = 0.3;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

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
