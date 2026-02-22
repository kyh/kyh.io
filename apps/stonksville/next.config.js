/** @type {import("next").NextConfig} */
const config = {
  cacheComponents: true,
  images: {
    localPatterns: [{ pathname: "/assets/**" }],
  },
  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
