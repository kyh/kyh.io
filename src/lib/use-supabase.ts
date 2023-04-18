import { useMemo } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase/browser-client";

export const useSupabase = () => {
  return useMemo(getSupabaseBrowserClient, []);
};

export type RealtimePayload<T> = {
  type: string;
  event: string;
  payload?: T;
};
