import { createServerComponentSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { headers, cookies } from "next/headers";
import invariant from "tiny-invariant";
import type { Database } from "~/database.types";

export const getSupabaseServerClient = (
  params = {
    admin: false,
  }
) => {
  const env = process.env;

  invariant(env.NEXT_PUBLIC_SUPABASE_URL, `Supabase URL not provided`);

  invariant(
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    `Supabase Anon Key not provided`
  );

  if (params.admin) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    invariant(serviceRoleKey, `Supabase Service Role Key not provided`);

    return createServerComponentSupabaseClient<Database>({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: serviceRoleKey,
      headers,
      cookies,
    });
  }

  return createServerComponentSupabaseClient<Database>({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    headers,
    cookies,
  });
};
