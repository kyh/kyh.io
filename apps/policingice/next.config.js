/** @type {import('next').NextConfig} */
const config = {
  cacheComponents: true,
  serverExternalPackages: ["@libsql/client"],
};

export default config;
