import { getGroups } from "@/lib/prediction-query";

import { GroupsAdmin } from "./groups-admin";

export const dynamic = "force-dynamic";

const GroupsPage = async () => {
  const groups = await getGroups();
  return <GroupsAdmin groups={groups} />;
};

export default GroupsPage;
