import type { NextConfig } from "next";

type ImageConfig = NonNullable<NextConfig["images"]>;

type LocalPatterns = NonNullable<ImageConfig["localPatterns"]>;

type RemotePatterns = NonNullable<ImageConfig["remotePatterns"]>;

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL;

const getRemotePatterns = () => {
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

const getLocalPatterns = () => {
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
  cacheComponents: true,
  headers: () =>
    Promise.resolve([
      {
        headers: [
          {
            key: "Vary",
            value:
              "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding, Accept",
          },
        ],
        source: "/",
      },
    ]),
  images: {
    localPatterns: getLocalPatterns(),
    remotePatterns: getRemotePatterns(),
  },
  partialPrefetching: true,
  redirects: () =>
    Promise.resolve([
      {
        destination: "/showcase",
        permanent: true,
        source: "/projects",
      },
    ]),
};

export default config;
