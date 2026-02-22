import { headers } from "next/headers";

import { getIncidents, getUserVotes } from "@/actions/incidents";
import { auth } from "@/lib/auth";

import { IncidentFeed } from "./incident-feed";

const HomePage = async () => {
  const headersList = await headers();
  const [{ incidents, nextOffset }, session] = await Promise.all([
    getIncidents({}),
    auth.api.getSession({ headers: headersList }),
  ]);
  const isAdmin = !!session?.user && !session.user.isAnonymous;
  const userVotes = session?.user.id
    ? await getUserVotes({
        incidentIds: incidents.map((i) => i.id),
        userId: session.user.id,
      })
    : {};

  return (
    <IncidentFeed
      initialIncidents={incidents}
      initialNextOffset={nextOffset}
      initialUserVotes={userVotes}
      isAdmin={isAdmin}
    />
  );
};

export default HomePage;
