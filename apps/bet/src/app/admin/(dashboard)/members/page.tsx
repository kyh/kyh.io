import { getGroups } from "@/lib/prediction-query";

import { MembersAdmin } from "./members-admin";

export const dynamic = "force-dynamic";

const MembersPage = async () => {
  const groups = await getGroups();
  return <MembersAdmin groups={groups} />;
};

export default MembersPage;
