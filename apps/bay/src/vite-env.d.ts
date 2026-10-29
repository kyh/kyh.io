/// <reference types="vite/client" />

interface ImportMetaEnv {
  // where the tile pyramid is served from (manifest.json and the level folders): /data locally,
  // Vercel Blob or a CDN in production
  readonly VITE_TILES_URL?: string;
}
