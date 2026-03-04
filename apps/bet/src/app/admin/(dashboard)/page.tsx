import { getAllPredictions, getUsers } from "@/lib/prediction-query";

import { PredictionsAdmin } from "./predictions-admin";

export const dynamic = "force-dynamic";

const AdminPage = async () => {
  const [predictions, users] = await Promise.all([
    getAllPredictions(),
    getUsers(),
  ]);

  return <PredictionsAdmin predictions={predictions} users={users} />;
};

export default AdminPage;
