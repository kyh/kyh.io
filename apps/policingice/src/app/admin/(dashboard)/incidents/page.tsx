import {
  getAllIncidents,
} from "@/actions/admin";

import { AdminIncidentsClient } from "./incidents-client";

export default async function AdminIncidentsPage() {
  const allIncidents = await getAllIncidents();
  return <AdminIncidentsClient initialIncidents={allIncidents} />;
}
