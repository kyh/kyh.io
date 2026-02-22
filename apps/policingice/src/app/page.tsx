import { Suspense } from "react";

import { getAdminUser } from "@/lib/admin-auth";
import { getUserVotes } from "@/actions/incidents";
import { getIncidents } from "@/queries/incidents";

import { IncidentFeed } from "./incident-feed";

const IncidentFeedLoader = async () => {
  const { incidents, nextOffset } = await getIncidents({});
  const [admin, userVotes] = await Promise.all([
    getAdminUser(),
    getUserVotes({ incidentIds: incidents.map((i) => i.id) }),
  ]);
  return (
    <IncidentFeed
      initialIncidents={incidents}
      initialNextOffset={nextOffset}
      initialUserVotes={userVotes}
      isAdmin={!!admin}
    />
  );
};

const FeedSkeleton = () => (
  <main className="min-h-screen bg-white px-4 py-8 sm:px-6">
    <div className="max-w-xl">
      <header className="mb-12">
        <h1 className="text-base font-normal">Policing ICE</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Documenting incidents of ICE overreach.
        </p>
      </header>
      <div className="divide-y divide-neutral-200">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="py-6">
            <div className="h-[300px] animate-pulse bg-neutral-50" />
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
