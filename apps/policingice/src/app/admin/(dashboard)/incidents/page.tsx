import {
  getAllIncidents,
} from "@/actions/admin";

import { AdminIncidentsClient } from "./incidents-client";

const AdminIncidentsPage = async () => {
  const allIncidents = await getAllIncidents();
  return <AdminIncidentsClient initialIncidents={allIncidents} />;
};

export default AdminIncidentsPage;
