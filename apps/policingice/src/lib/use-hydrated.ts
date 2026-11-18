"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

const onClient = () => true;
const onServer = () => false;

export const useIsHydrated = () => useSyncExternalStore(subscribe, onClient, onServer);
