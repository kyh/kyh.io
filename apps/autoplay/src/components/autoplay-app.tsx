"use client";

import { useEffect, useState } from "react";

import type { SessionPayload } from "@/lib/api-contract";
import { PUBLIC_CHANNEL, sessionPayloadSchema } from "@/lib/api-contract";
import { Tv } from "@/components/tv";
import type { TvProps } from "@/components/tv";

/** The ?error= query left behind by a failed OAuth redirect, then cleared. */
const takeUrlError = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error === null) return undefined;
  window.history.replaceState(null, "", window.location.pathname);
  return error;
};

export const AutoplayApp = () => {
  const [session, setSession] = useState<SessionPayload | undefined>(undefined);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const error = takeUrlError();
      if (error !== undefined) setUrlError(error);
      try {
        const response = await fetch("/api/session");
        const payload = sessionPayloadSchema.parse(await response.json());
        if (!cancelled) setSession(payload);
      } catch {
        if (!cancelled) {
          setSession({
            missingKeys: [],
            user: null,
            channels: [PUBLIC_CHANNEL],
            googleReady: false,
            liveReady: false,
          });
          setUrlError("Couldn't reach the station — reload the page");
        }
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const props: TvProps = {};
  if (session !== undefined) props.session = session;
  if (urlError !== undefined) props.urlError = urlError;
  return <Tv {...props} />;
};
