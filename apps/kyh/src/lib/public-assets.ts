/**
 * Project images, videos and favicons live in a public Supabase storage bucket.
 *
 * `NEXT_PUBLIC_SUPABASE_URL` is optional on purpose — `pnpm install && pnpm dev:kyh`
 * has to work on a fresh clone with no `.env` (see AGENTS.md). When it is unset we
 * default explicitly to a local placeholder instead of interpolating `undefined`
 * into the URL: `next/image` rejects `"undefined/storage/..."` with a src parse
 * error, which 500s every page that renders one.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Allowed by `next.config.js`'s `images.localPatterns` (`/assets/**`). */
const PLACEHOLDER_URL = "/assets/placeholder.png";

export const getPublicAssetUrl = (path: string) => {
  if (!supabaseUrl) return PLACEHOLDER_URL;
  return `${supabaseUrl}/storage/v1/object/public/projects/${path}`;
};

export const getPublicFaviconUrl = (path: string) => {
  if (!supabaseUrl) return PLACEHOLDER_URL;
  return `${supabaseUrl}/storage/v1/object/public/favicons/${path}`;
};
