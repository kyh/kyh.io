import {
  getAllIncidents,
} from "@/lib/admin-action";

import { AdminIncidentsClient } from "./incidents-client";

const AdminIncidentsPage = async () => {
  const allIncidents = await getAllIncidents();
  return <AdminIncidentsClient initialIncidents={allIncidents} />;
};

export default AdminIncidentsPage;
