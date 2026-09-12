import { defineRelations } from "drizzle-orm";

import * as schema from "./drizzle-schema";

// `incident_id` is NOT NULL on both child tables, so their `incident` side is
// declared non-optional and reads as a row, never null.
export const relations = defineRelations(schema, (r) => ({
  incidents: {
    videos: r.many.videos({ from: r.incidents.id, to: r.videos.incidentId }),
    votes: r.many.votes({ from: r.incidents.id, to: r.votes.incidentId }),
  },
  videos: {
    incident: r.one.incidents({
      from: r.videos.incidentId,
      optional: false,
      to: r.incidents.id,
    }),
  },
  votes: {
    incident: r.one.incidents({
      from: r.votes.incidentId,
      optional: false,
      to: r.incidents.id,
    }),
  },
}));
