/** @type {import('next').NextConfig} */
const config = {
  cacheComponents: true,
  serverExternalPackages: ["@libsql/client"],
  typescript: { ignoreBuildErrors: true },
};

export default config;
