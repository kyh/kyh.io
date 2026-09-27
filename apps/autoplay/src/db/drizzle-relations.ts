import { defineRelations } from "drizzle-orm";

import * as schema from "./drizzle-schema";

// No table relates to another yet, but the graph still has to carry every
// table: `drizzle()` reads it to build `db.query` and better-auth's adapter
// resolves each model through it.
export const relations = defineRelations(schema);
