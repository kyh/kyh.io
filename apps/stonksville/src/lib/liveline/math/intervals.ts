const WEEK = 604_800;

/** [max window secs, tick interval secs], ascending. */
const TICK_STEPS: [number, number][] = [
  [15, 2],
  [30, 5],
  [60, 10],
  [120, 15],
  [300, 30],
  [600, 60],
  [1800, 300],
  [3600, 600],
  [14_400, 1800],
  [43_200, 3600],
  [86_400, 7200],
  [WEEK, 86_400],
];

/** Pick a nice time interval in seconds for time axis labels. */
export const niceTimeInterval = (windowSecs: number): number => {
  for (const [maxWindow, tick] of TICK_STEPS) {
    if (windowSecs <= maxWindow) {
      return tick;
    }
  }
  return WEEK;
};
