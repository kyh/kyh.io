const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const getRemotePatterns = () => {
  const remotePatterns = [];

  if (SUPABASE_URL) {
    const { hostname } = new URL(SUPABASE_URL);

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
    localPatterns: getLocalPatterns(),
    remotePatterns: getRemotePatterns(),
  },
  redirects() {
    return [
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
    ];
  },
  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
