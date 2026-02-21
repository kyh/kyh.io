/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["@libsql/client"],
  async redirects() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/api/sitemap",
        permanent: true,
      },
    ];
  },
  typescript: { ignoreBuildErrors: true },
};

export default config;
