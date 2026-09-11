import type { NextConfig } from "next";

type ImageConfig = NonNullable<NextConfig["images"]>;
type LocalPatterns = NonNullable<ImageConfig["localPatterns"]>;
type RemotePatterns = NonNullable<ImageConfig["remotePatterns"]>;

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL;

const getRemotePatterns = (): RemotePatterns => {
  const remotePatterns: RemotePatterns = [];

  if (ASSETS_URL) {
    const { hostname } = new URL(ASSETS_URL);

    remotePatterns.push({
      hostname,
      protocol: "https",
    });
  }

  if (!IS_PRODUCTION) {
    remotePatterns.push(
      {
        hostname: "127.0.0.1",
        protocol: "http",
      },
      {
        hostname: "localhost",
        protocol: "http",
      },
    );
  }

  return remotePatterns;
};

const getLocalPatterns = (): LocalPatterns => {
  const localPatterns: LocalPatterns = [
    {
      pathname: "/assets/**",
    },
  ];

  return localPatterns;
};

const config: NextConfig = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  images: {
    localPatterns: getLocalPatterns(),
    remotePatterns: getRemotePatterns(),
  },
  redirects: () =>
    Promise.resolve([
      {
        destination: "/showcase",
        permanent: true,
        source: "/projects",
      },
      {
        destination: "/",
        permanent: true,
        source: "/about",
      },
    ]),
};

export default config;
