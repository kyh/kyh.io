"use client";

import { useEffect, useState } from "react";

import type { SessionPayload } from "@/lib/api-contract";
import { PUBLIC_CHANNEL, requestJson, sessionPayloadSchema } from "@/lib/api-contract";
import { Tv } from "@/components/tv";

/** What there is to watch when the station cannot be reached: the public channel, off air. */
const OFFLINE_SESSION: SessionPayload = {
  channels: [PUBLIC_CHANNEL],
  google: "unconfigured",
  liveReady: false,
  loginReady: false,
  missingKeys: [],
  recordReady: false,
  user: null,
};

/** The ?error= query left behind by a failed OAuth redirect, then cleared. */
const takeUrlError = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error === null) {
    return undefined;
  }
  window.history.replaceState(null, "", window.location.pathname);
  return error;
};

export const AutoplayApp = () => {
  const [session, setSession] = useState<SessionPayload | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const error = takeUrlError();
      if (error !== undefined) {
        setUrlError(error);
      }
      const answer = await requestJson(
        "/api/session",
        sessionPayloadSchema,
        "Couldn't reach the station — reload the page",
      );
      if (cancelled) {
        return;
      }
      if ("error" in answer) {
        setSession(OFFLINE_SESSION);
        setUrlError(answer.error);
      } else {
        setSession(answer.data);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Tv session={session} urlError={urlError} />;
};
