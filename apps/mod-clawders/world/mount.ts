// The world inside another page (the leaderboard site's demo): it fills
// `host`, and the page says whether the run goes on and its tokens.
import { createView } from "./view";

export interface Run {
  isActive: boolean;
  tokens: number;
}

export const mountWorld = (host: HTMLElement) => {
  const view = createView({ pixelRatio: Math.min(devicePixelRatio, 2), sizesCanvas: true });
  host.append(view.canvas);
  let run: Run = { isActive: false, tokens: 0 };
  let size = { height: host.clientHeight, width: host.clientWidth };
  const observer = new ResizeObserver(() => {
    size = { height: host.clientHeight, width: host.clientWidth };
  });
  observer.observe(host);

  let frameId = 0;
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (size.width > 0 && size.height > 0) {
      view.draw({ ...size, ...run, isCoarse: false, score: run.tokens }, dt);
    }
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);

  return {
    coins: () => view.counts().coins,
    dispose: () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      view.dispose();
      view.canvas.remove();
    },
    setRun: (next: Run) => {
      run = next;
    },
  };
};
