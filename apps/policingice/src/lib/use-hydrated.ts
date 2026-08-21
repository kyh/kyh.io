"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

// False through the server render and the hydration render, true after. Lets a
// component defer client-only values (theme, randomness) without a hydration
// mismatch and without the extra render an effect-set flag costs.
export const useIsHydrated = () => useSyncExternalStore(subscribe, onClient, onServer);
