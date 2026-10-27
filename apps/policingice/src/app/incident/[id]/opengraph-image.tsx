import { ImageResponse } from "next/og";

import { INCIDENT_CARD_SIZE, IncidentCard } from "@/lib/incident-card";

import { getIncident, parseId } from "./get-incident";

export { INCIDENT_CARD_ALT as alt, INCIDENT_CARD_SIZE as size } from "@/lib/incident-card";
export const contentType = "image/png";

// Reads only the incident's text (the same cached read as the page); its videos
// never reach the card.
const IncidentOpenGraphImage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const incidentId = parseId(id);
  const incident = incidentId === null ? null : await getIncident(incidentId);
  if (!incident) {
    return new Response("Not found", { status: 404 });
  }
  return new ImageResponse(<IncidentCard incident={incident} />, INCIDENT_CARD_SIZE);
};

export default IncidentOpenGraphImage;
