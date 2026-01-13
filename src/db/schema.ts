import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'

export type VideoPlatform =
  | 'twitter'
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'reddit'
export type IncidentStatus = 'approved' | 'hidden'
export type VoteType = 'unjustified' | 'justified'

// better-auth tables
export const user = sqliteTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }),
})

export const session = sqliteTable('session', {
  id: text().primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text().notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text().primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp',
  }),
  scope: text(),
  password: text(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

export const incidents = sqliteTable('incidents', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  location: text(),
  incidentDate: integer('incident_date', { mode: 'timestamp' }),
  status: text().$type<IncidentStatus>().default('approved').notNull(),
  unjustifiedCount: integer('unjustified_count').default(0).notNull(),
  justifiedCount: integer('justified_count').default(0).notNull(),
  reportCount: integer('report_count').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const videos = sqliteTable('videos', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  incidentId: integer('incident_id')
    .references(() => incidents.id, { onDelete: 'cascade' })
    .notNull(),
  url: text().notNull(),
  platform: text().$type<VideoPlatform>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

export const votes = sqliteTable('votes', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  incidentId: integer('incident_id')
    .references(() => incidents.id, { onDelete: 'cascade' })
    .notNull(),
  sessionId: text('session_id').notNull(),
  type: text().$type<VoteType>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// Relations
export const incidentsRelations = relations(incidents, ({ many }) => ({
  videos: many(videos),
  votes: many(votes),
}))

export const videosRelations = relations(videos, ({ one }) => ({
  incident: one(incidents, {
    fields: [videos.incidentId],
    references: [incidents.id],
  }),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  incident: one(incidents, {
    fields: [votes.incidentId],
    references: [incidents.id],
  }),
}))
