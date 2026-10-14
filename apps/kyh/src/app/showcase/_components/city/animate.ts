// What the buildings do while you watch: the invader marches, letters drift
// off and vanish, the dish scans, Clawd runs laps, a rocket goes up now and
// then, the TV flips channels and the ticker only ever goes up.
import type { Group } from "three";

import type { Built, LiveScreen } from "./render";
import { greyOf } from "./palette";
import { TRACK } from "./landmarks-outskirts";

const LAUNCH_PERIOD = 46;
const IGNITION = 30;
const LIFTOFF = 33;
const GONE = 43;

/** The moving parts and screens of every built sketch, by name. */
export type Rig = Pick<Built, "parts" | "screens">;

/** Screens are grey too, until their building is lit. */
const tone = (hex: string, colorful: boolean) => (colorful ? hex : greyOf(hex));

const family = (built: Rig, prefix: string) =>
  [...built.parts.entries()]
    .filter(([name]) => name.startsWith(prefix))
    .toSorted(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, group]) => group);

/** A point and heading at distance `s` around the stadium track. */
const aroundTrack = (s: number, radius: number) => {
  const { straight } = TRACK;
  const bend = Math.PI * radius;
  const total = straight * 2 + bend * 2;
  const d = ((s % total) + total) % total;
  if (d < straight) {
    return { heading: 0, x: -straight / 2 + d, z: radius };
  }
  if (d < straight + bend) {
    const angle = Math.PI / 2 - (d - straight) / radius;
    return {
      heading: angle - Math.PI / 2,
      x: straight / 2 + Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
  }
  if (d < straight * 2 + bend) {
    return { heading: Math.PI, x: straight / 2 - (d - straight - bend), z: -radius };
  }
  const angle = -Math.PI / 2 - (d - straight * 2 - bend) / radius;
  return {
    heading: angle - Math.PI / 2,
    x: -straight / 2 + Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
};

const TICKER =
  "KYH ▲ 13.37%   STONKS ▲ 420.69   VIBE ▲ 9.99%   INIT ▲ 1.00   LOREM ▲ 4.04%   YOLO ▲ 88.8%   ";

const drawTicker = (screen: LiveScreen, time: number, colorful: boolean) => {
  const { canvas, context } = screen;
  context.fillStyle = tone("#13201a", colorful);
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = `700 ${canvas.height * 0.62}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.textBaseline = "middle";
  context.fillStyle = tone("#6fe39a", colorful);
  const { width } = context.measureText(TICKER);
  const offset = (time * 46) % width;
  for (let x = -offset; x < canvas.width; x += width) {
    context.fillText(TICKER, x, canvas.height * 0.55);
  }
  screen.texture.needsUpdate = true;
};

const BARS = ["#e9e9e2", "#e9d64a", "#4fc6c4", "#5fc461", "#c75fc4", "#d9534f", "#4f62d9"];

const drawTelevision = (screen: LiveScreen, time: number, colorful: boolean) => {
  const { canvas, context } = screen;
  const { width, height } = canvas;
  const channel = Math.floor(time / 3) % 3;
  if (channel === 0) {
    // Static between channels.
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const shade = Math.floor(Math.random() * 200 + 40);
        context.fillStyle = `rgb(${shade},${shade},${shade})`;
        context.fillRect(x, y, 4, 4);
      }
    }
  } else if (channel === 1) {
    for (const [index, color] of BARS.entries()) {
      context.fillStyle = tone(color, colorful);
      context.fillRect((index * width) / BARS.length, 0, width / BARS.length + 1, height);
    }
    context.fillStyle = "#111";
    context.fillRect(0, height * 0.7, width, height * 0.3);
    context.fillStyle = "#f4f4ef";
    context.font = `700 ${height * 0.22}px ui-monospace, monospace`;
    context.textAlign = "center";
    context.fillText("CH 01", width / 2, height * 0.9);
    context.textAlign = "start";
  } else {
    // Whatever the feed is dreaming up: a sun over rolling hills.
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, tone("#ffb27a", colorful));
    sky.addColorStop(1, tone("#ffe7a8", colorful));
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    context.fillStyle = tone("#fff6d8", colorful);
    context.beginPath();
    context.arc(
      width * 0.5,
      height * (0.75 - ((time % 3) / 3) * 0.3),
      height * 0.18,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.fillStyle = tone("#4f8f6a", colorful);
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      context.lineTo(x, height * 0.72 + Math.sin(x / 9 + time) * height * 0.06);
    }
    context.lineTo(width, height);
    context.fill();
  }
  screen.texture.needsUpdate = true;
};

export interface Animations {
  /** `lit` says whether a project's building is showing its colors. */
  update: (time: number, lit: (slug: string) => boolean) => void;
}

const base = (groups: readonly Group[]) => groups.map((group) => group.position.clone());

export const createAnimations = (built: Rig, { launches }: { launches: boolean }): Animations => {
  const frames = family(built, "vibedgames:frame:");
  const letters = family(built, "yourssincerely:letter:");
  const letterBase = base(letters);
  const capsule = built.parts.get("uicapsule:capsule");
  const capsuleY = capsule?.position.y ?? 0;
  const dish = built.parts.get("inteligir:dish");
  const runners = family(built, "clawders:runner:");
  const runnerBase = base(runners);
  const rocket = built.parts.get("init:rocket");
  const rocketBase = rocket?.position.clone();
  const flame = built.parts.get("init:flame");
  const beacons = [...family(built, "founding:beacon"), ...family(built, "autoplay:beacon")];
  const blades = [...family(built, "turbine:"), ...family(built, "windmill:")];
  const dots = family(built, "loremllm:dot:");
  const dotBase = base(dots);
  const camera = built.parts.get("policing-ice:camera");
  const tv = built.screens.get("autoplay:screen");
  const ticker = built.screens.get("stonksville:ticker");
  let lastTv = -1;

  const flyLetters = (time: number) => {
    for (const [index, letter] of letters.entries()) {
      const origin = letterBase[index];
      if (origin) {
        const t = (((time / 7 + index / letters.length) % 1) + 1) % 1;
        letter.position.set(
          origin.x + Math.sin(t * 6 + index) * 0.25 + t * 0.5,
          origin.y + t * 1.9,
          origin.z - t * 0.3,
        );
        // Written in disappearing ink: each letter shrinks to nothing.
        const size = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85) ** 0.6;
        letter.scale.setScalar(Math.max(0.001, size));
      }
    }
  };

  const runLaps = (time: number) => {
    for (const [index, runner] of runners.entries()) {
      const origin = runnerBase[index];
      if (origin) {
        const lane = TRACK.radius + 0.25 - index * 0.2;
        const pose = aroundTrack(time * (1.15 + index * 0.12) + index * 2.2, lane);
        runner.position.set(
          origin.x + pose.x,
          origin.y + Math.abs(Math.sin(time * 14 + index)) * 0.03,
          origin.z + pose.z,
        );
        runner.rotation.y = -pose.heading;
      }
    }
  };

  const launch = (time: number) => {
    if (!rocket || !rocketBase) {
      return;
    }
    const phase = launches ? time % LAUNCH_PERIOD : 0;
    const burning = phase >= IGNITION && phase < GONE;
    rocket.visible = phase < GONE;
    if (flame) {
      flame.visible = burning;
      flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
    }
    const climb = phase >= LIFTOFF ? 0.55 * (phase - LIFTOFF) ** 2 : 0;
    const shake = burning && phase < LIFTOFF + 1 ? (Math.random() - 0.5) * 0.03 : 0;
    rocket.position.set(rocketBase.x + shake, rocketBase.y + climb, rocketBase.z);
  };

  return {
    update: (time, lit) => {
      const frame = Math.floor(time / 0.6) % 2;
      for (const [index, group] of frames.entries()) {
        group.visible = index === frame;
      }
      flyLetters(time);
      if (capsule) {
        capsule.position.y = capsuleY + Math.sin(time * 1.3) * 0.1;
      }
      if (dish) {
        dish.rotation.y = time * 0.7;
      }
      runLaps(time);
      launch(time);
      for (const beacon of beacons) {
        beacon.visible = time % 1.6 < 0.8;
      }
      for (const [index, blade] of blades.entries()) {
        blade.rotation.z = -time * (index % 2 === 0 ? 0.9 : 0.6);
      }
      for (const [index, dot] of dots.entries()) {
        const origin = dotBase[index];
        if (origin) {
          dot.position.y = origin.y + Math.max(0, Math.sin(time * 5 - index * 0.7)) * 0.09;
        }
      }
      if (camera) {
        camera.rotation.y = Math.sin(time * 0.45) * 1.1 + 2;
      }
      if (ticker) {
        drawTicker(ticker, time, lit("stonksville"));
      }
      // The TV refreshes at broadcast-ish rates, not every frame.
      const tvFrame = Math.floor(time * 12);
      if (tv && tvFrame !== lastTv) {
        lastTv = tvFrame;
        drawTelevision(tv, time, lit("autoplay"));
      }
    },
  };
};
