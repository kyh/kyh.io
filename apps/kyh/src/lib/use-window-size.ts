import { useSyncExternalStore } from "react";

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
};

const unmeasured = { height: 0, width: 0 };
// useSyncExternalStore compares snapshots by identity, so a fresh object per
// read would loop forever. Only allocate when the size actually changed.
let last = unmeasured;
const read = () => {
  if (last.width !== window.innerWidth || last.height !== window.innerHeight) {
    last = { height: window.innerHeight, width: window.innerWidth };
  }
  return last;
};

/** The window's size, 0×0 on the server. */
export const useWindowSize = () => useSyncExternalStore(subscribe, read, () => unmeasured);
