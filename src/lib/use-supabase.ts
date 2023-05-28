import { useMemo } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import invariant from "tiny-invariant";

let client: SupabaseClient;

export const getSupabaseClient = () => {
  if (client) return client;

  const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  invariant(NEXT_PUBLIC_SUPABASE_URL, `Supabase URL was not provided`);
  invariant(
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    `Supabase Anon key was not provided`
  );

  client = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

  return client;
};

export const useSupabase = () => {
  return useMemo(getSupabaseClient, []);
};

export type RealtimePayload<T> = {
  type: string;
  event: string;
  payload?: T;
};
