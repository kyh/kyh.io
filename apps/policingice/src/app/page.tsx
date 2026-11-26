import { Suspense } from "react";

import { DatabaseNotConfigured } from "@/components/database-not-configured";
import { databaseConfigured } from "@/lib/env";

import { IncidentFeed } from "./incident-feed";

const loadFeed = async () => {
  const [{ getSession }, { getUserVotes }, { getIncidents }] = await Promise.all([
    import("@/lib/auth"),
    import("@/lib/incident-action"),
    import("@/lib/incident-query"),
  ]);

  const { incidents, nextOffset } = await getIncidents({});

  const [session, userVotes] = await Promise.all([
    getSession(),
    getUserVotes({ incidentIds: incidents.map((i) => i.id) }),
  ]);

  return {
    incidents,
    isAdmin: !!session?.user && !session.user.isAnonymous,
    nextOffset,
    userVotes,
  };
};

const IncidentFeedLoader = async () => {
  if (!databaseConfigured) {
    return <DatabaseNotConfigured />;
  }

  const { incidents, isAdmin, nextOffset, userVotes } = await loadFeed();

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
  <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
    <div className="max-w-xl">
      <header className="mb-12">
        <h1 className="text-base font-normal">Policing ICE</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documenting incidents of ICE overreach.
        </p>
      </header>
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="py-6">
            <div className="h-[300px] animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  </main>
);

const HomePage = () => (
  <Suspense fallback={<FeedSkeleton />}>
    <IncidentFeedLoader />
  </Suspense>
);

export default HomePage;
