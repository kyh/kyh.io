import { Suspense } from "react";

import { getSession } from "@/lib/auth";
import { getUserVotes } from "@/lib/incident-action";
import { getIncidents } from "@/lib/incident-query";

import { IncidentFeed } from "./incident-feed";

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

const HomePage = async () => {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <IncidentFeedLoader />
    </Suspense>
  );
};

export default HomePage;
