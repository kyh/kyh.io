// Work done a step at a time: a generator yields between steps, so drawing a
// view can be spread over frames instead of stalling one. Pure.

/** Work that yields between its steps and returns what it made. */
export type Steps<T> = Generator<void, T, void>;

/** Runs the work to its end at once. */
export const finish = <T>(steps: Steps<T>): T => {
  let step = steps.next();
  while (!step.done) {
    step = steps.next();
  }
  return step.value;
};

/**
 * Runs steps until `budget` ms have gone (always at least one); the result
 * once it's done, else undefined.
 */
export const runFor = <T>(steps: Steps<T>, budget: number, now = () => performance.now()) => {
  const start = now();
  let step = steps.next();
  while (!step.done && now() - start < budget) {
    step = steps.next();
  }
  return step.done ? { value: step.value } : undefined;
};
