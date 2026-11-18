import { defineRelations } from "drizzle-orm";

import * as schema from "./drizzle-schema";

export const relations = defineRelations(schema);
