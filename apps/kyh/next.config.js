const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const getRemotePatterns = () => {
  const remotePatterns = [];

  if (SUPABASE_URL) {
    const hostname = new URL(SUPABASE_URL).hostname;

    remotePatterns.push({
      protocol: "https",
      hostname,
    });
  }

  if (!IS_PRODUCTION) {
    remotePatterns.push({
      protocol: "http",
      hostname: "127.0.0.1",
    });

    remotePatterns.push({
      protocol: "http",
      hostname: "localhost",
    });
  }

  return remotePatterns;
};

const getLocalPatterns = () => {
  const localPatterns = [
    {
      pathname: "/assets/**",
    },
  ];

  return localPatterns;
};

/** @type {import('next').NextConfig} */
const config = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  images: {
    remotePatterns: getRemotePatterns(),
    localPatterns: getLocalPatterns(),
  },
  async headers() {
    return [
      {
        /**
         * `/` serves HTML or markdown depending on `Accept` (see `middleware.ts`),
         * so shared caches have to key on it or an agent gets the cached HTML.
         *
         * Middleware can't add this on the HTML branch: Next writes its own
         * `Vary` onto the prerendered response after middleware runs, replacing
         * whatever was there. So the value below repeats Next's router keys and
         * appends `Accept` — whichever layer wins, nothing is lost.
         */
        source: "/",
        headers: [
          {
            key: "Vary",
            value:
              "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding, Accept",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/projects",
        destination: "/showcase",
        permanent: true,
      },
    ];
  },
  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
