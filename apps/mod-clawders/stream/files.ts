// The built world (`vite build` into dist/world), served to Chrome as files.

import path from "node:path";

const TYPES = new Map(
  Object.entries({
    ".css": "text/css",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
  }),
);

export const contentType = (file: string) =>
  TYPES.get(path.extname(file)) ?? "application/octet-stream";

// The file a request names inside `root` (the page for `/`); null for one
// that would climb out of it.
export const assetPath = (root: string, url: string) => {
  const { pathname } = new URL(url, "http://world");
  const file = path.join(root, decodeURIComponent(pathname === "/" ? "/index.html" : pathname));
  return file.startsWith(`${root}${path.sep}`) ? file : null;
};
