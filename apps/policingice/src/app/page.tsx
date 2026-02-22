import { getAdminUser } from "@/lib/admin-auth";
import { getIncidents, getUserVotes } from "@/actions/incidents";

import { IncidentFeed } from "./incident-feed";

const HomePage = async () => {
  const [{ incidents, nextOffset }, admin] = await Promise.all([
    getIncidents({}),
    getAdminUser(),
  ]);
  const userVotes = await getUserVotes({
    incidentIds: incidents.map((i) => i.id),
  });

  return (
    <IncidentFeed
      initialIncidents={incidents}
      initialNextOffset={nextOffset}
      initialUserVotes={userVotes}
      isAdmin={!!admin}
    />
  );
};

export default HomePage;
