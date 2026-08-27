import { theme } from "./styles/tokens.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import {
  animations,
  containers,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";

import { getSession } from "@/lib/auth";
import { getUserVotes } from "@/lib/incident-action";
import { getIncidents } from "@/lib/incident-query";

import { IncidentFeed } from "./incident-feed";

const styles = stylex.create({
  page: {
    minHeight: "100vh",
    backgroundColor: theme.background,
    paddingInline: { default: spacing[4], [mediaUp.sm]: spacing[6] },
    paddingBlock: spacing[8],
  },
  wrap: { maxWidth: containers.xl },
  header: { marginBottom: spacing[12] },
  title: {
    fontSize: fontSizes.base,
    lineHeight: fontSizeLineHeights.base,
    fontWeight: fontWeights.normal,
  },
  subtitle: {
    marginTop: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  /** was `divide-y divide-border`, a child combinator StyleX cannot express */
  divider: { borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: theme.border },
  skeletonRow: { paddingBlock: spacing[6] },
  skeleton: { height: "300px", animation: animations.pulse, backgroundColor: theme.muted },
});

const IncidentFeedLoader = async () => {
  const { incidents, nextOffset } = await getIncidents({});
  const [session, userVotes] = await Promise.all([
    getSession(),
    getUserVotes({ incidentIds: incidents.map((i) => i.id) }),
  ]);
  const isAdmin = !!session?.user && !session.user.isAnonymous;
  return (
    <IncidentFeed
      initialIncidents={incidents}
      initialNextOffset={nextOffset}
      initialUserVotes={userVotes}
      isAdmin={isAdmin}
    />
  );
};

const FeedSkeleton = () => (
  <main {...stylex.props(styles.page)}>
    <div {...stylex.props(styles.wrap)}>
      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>Policing ICE</h1>
        <p {...stylex.props(styles.subtitle)}>Documenting incidents of ICE overreach.</p>
      </header>
      <div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} {...stylex.props(styles.skeletonRow, i < 2 && styles.divider)}>
            <div {...stylex.props(styles.skeleton)} />
          </div>
        ))}
      </div>
    </div>
  </main>
);

const HomePage = async () => {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <IncidentFeedLoader />
    </Suspense>
  );
};

export default HomePage;
