import { defineConfig } from "@tanstack/react-start/config";

export default defineConfig({
  server: {
    routeRules: {
      "/sitemap.xml": {
        redirect: "/api/sitemap",
      },
    },
  },
});
