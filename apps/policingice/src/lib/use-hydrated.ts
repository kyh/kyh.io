"use client";

import { useSyncExternalStore } from "react";

// oxlint-disable-next-line no-empty-function -- there is nothing to unsubscribe
const subscribe = () => () => {};

const onClient = () => true;
const onServer = () => false;

export const useIsHydrated = () => useSyncExternalStore(subscribe, onClient, onServer);
