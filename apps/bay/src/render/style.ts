// The look of the procedural map, after tinygyn's: clear midday colours, pale ground, cool grey
// streets with white lines, fresh parks, clear water, buildings in tidy pastels, brick and glass,
// trees as round bright canopies. Every colour the render uses is here.

export const GROUND = {
  asphalt: "#a3a8ae",
  land: "#dcd6ca",
  lane: "#f8f8f6",
  path: "#eadfc6",
  rail: "#8f887d",
  sidewalk: "#ebe7df",
};

export const AREAS = {
  grass: "#9fd06a",
  park: "#93c95f",
  pier: "#d9d2c5",
  pitch: "#7fbf55",
  sand: "#efdca6",
  water: "#6cb6df",
  wood: "#7ab650",
} as const;

// painted bottom to top
export const AREA_ORDER = ["water", "sand", "grass", "park", "pitch", "wood", "pier"] as const;

// six wall and roof pairs for each look, picked by a building's tone
export const BUILDINGS = {
  block: {
    roofs: ["#f2f1ee", "#e9e6e0", "#e4e0d9", "#dfe2e5", "#d3cec6", "#eeebe6"],
    walls: ["#f2efe9", "#ebe1cf", "#e2d1b7", "#d6d9dd", "#c98d6e", "#e7e2d9"],
  },
  house: {
    roofs: ["#cbc7c1", "#bfbab2", "#cf7454", "#c9c5bf", "#b6b0a8", "#d07a58"],
    walls: ["#f4f0e9", "#f0e4cd", "#d9e5eb", "#dfe9d9", "#f1dcd6", "#f2e7c2"],
  },
  tower: {
    roofs: ["#d0d3d6", "#c8ccd0", "#d4d6d8", "#cbcfd3", "#d8d4cd", "#cfd2d5"],
    walls: ["#a2bacd", "#acbfcd", "#b8c5ce", "#96b1c6", "#ddd7ce", "#a6b7c4"],
  },
} as const;

// the glass, frames and sills drawn over a wall
export const WINDOW = { glass: "#7d95a9", glassTower: "#8aa7be", trim: "#ffffff" };

export const TREES = ["#5fae3f", "#53a137", "#6dbb48", "#4d9634"];

export const ROOF_KIT = "#c2c5c8";
export const EDGE = "#353a40";
export const SUN = "#fff7ea";
