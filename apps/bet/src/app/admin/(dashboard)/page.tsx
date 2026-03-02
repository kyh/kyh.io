import { getAllPredictions, getGroups } from "@/lib/prediction-query";

import { PredictionsAdmin } from "./predictions-admin";

export const dynamic = "force-dynamic";

const AdminPage = async () => {
  const [predictions, groups] = await Promise.all([
    getAllPredictions(),
    getGroups(),
  ]);

  const membersMap = groups.flatMap((g) =>
    g.members.map((m) => ({ ...m, groupName: g.name })),
  );

  return (
    <PredictionsAdmin
      predictions={predictions}
      groups={groups}
      members={membersMap}
    />
  );
};

export default AdminPage;
