/**
 * Project images, videos and favicons live in the public `kyh-assets` R2 bucket,
 * keyed `projects/<file>` and `favicons/<file>`.
 *
 * `NEXT_PUBLIC_ASSETS_URL` is optional on purpose — `pnpm install && pnpm dev:kyh`
 * has to work on a fresh clone with no `.env` (see AGENTS.md). When it is unset we
 * default explicitly to a local placeholder instead of interpolating `undefined`
 * into the URL: `next/image` rejects `"undefined/projects/..."` with a src parse
 * error, which 500s every page that renders one.
 */
const assetsUrl = process.env.NEXT_PUBLIC_ASSETS_URL;

/** Allowed by `next.config.ts`'s `images.localPatterns` (`/assets/**`). */
const PLACEHOLDER_URL = "/assets/placeholder.png";

const publicUrl = (key: string) => (assetsUrl ? `${assetsUrl}/${key}` : PLACEHOLDER_URL);

export const getPublicAssetUrl = (path: string) => publicUrl(`projects/${path}`);

export const getPublicFaviconUrl = (path: string) => publicUrl(`favicons/${path}`);
