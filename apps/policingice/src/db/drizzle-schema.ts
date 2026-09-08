import { relations, sql } from "drizzle-orm";
import { blob, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Embedding dimensions for text-embedding-3-small
export const EMBEDDING_DIMENSIONS = 1536;

export type VideoPlatform =
  | "twitter"
  | "youtube"
  | "tiktok"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "pinterest"
  | "reddit";
export type IncidentStatus = "approved" | "hidden";
export type VoteType = "unjustified" | "justified";

// better-auth tables
export const user = sqliteTable("user", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  email: text().notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  id: text().primaryKey(),
  image: text(),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }),
  name: text().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  id: text().primaryKey(),
  ipAddress: text("ip_address"),
  token: text().notNull().unique(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    accountId: text("account_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    id: text().primaryKey(),
    idToken: text("id_token"),
    issuer: text().notNull(),
    password: text(),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("account_issuer_accountId_uidx").on(t.issuer, t.accountId)],
);

export const verification = sqliteTable("verification", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  id: text().primaryKey(),
  identifier: text().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  value: text().notNull(),
});

export const incidents = sqliteTable("incidents", {
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  description: text(),
  // F32_BLOB for vector search
  embedding: blob({ mode: "buffer" }),
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  incidentDate: integer("incident_date", { mode: "timestamp" }),
  justifiedCount: integer("justified_count").default(0).notNull(),
  location: text(),
  pinned: integer({ mode: "boolean" })
    .default(sql`0`)
    .notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  status: text().$type<IncidentStatus>().default("approved").notNull(),
  unjustifiedCount: integer("unjustified_count").default(0).notNull(),
});

export const videos = sqliteTable("videos", {
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  incidentId: integer("incident_id")
    .references(() => incidents.id, { onDelete: "cascade" })
    .notNull(),
  platform: text().$type<VideoPlatform>().notNull(),
  url: text().notNull(),
});

export const votes = sqliteTable("votes", {
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  incidentId: integer("incident_id")
    .references(() => incidents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: text("session_id").notNull(),
  type: text().$type<VoteType>().notNull(),
});

// Relations
export const incidentsRelations = relations(incidents, ({ many }) => ({
  videos: many(videos),
  votes: many(votes),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  incident: one(incidents, {
    fields: [videos.incidentId],
    references: [incidents.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  incident: one(incidents, {
    fields: [votes.incidentId],
    references: [incidents.id],
  }),
}));
