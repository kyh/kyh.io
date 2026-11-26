const assetsUrl = process.env.NEXT_PUBLIC_ASSETS_URL;

const PLACEHOLDER_URL = "/assets/placeholder.png";

const publicUrl = (key: string) =>
  assetsUrl !== undefined && assetsUrl !== "" ? `${assetsUrl}/${key}` : PLACEHOLDER_URL;

export const getPublicAssetUrl = (path: string) => publicUrl(`projects/${path}`);

export const getPublicFaviconUrl = (path: string) => publicUrl(`favicons/${path}`);
