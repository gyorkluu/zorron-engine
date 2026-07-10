import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users table.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 64 }),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  /** SCALE-001: Tenant this user belongs to (null for platform admins). */
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tenants table (SCALE-001).
 *
 * Each tenant represents an接入方 (e.g. 情缘杯, 招聘系统, 社区运营) with
 * isolated projects and test sessions. Users belong to a tenant; their
 * projects and results are scoped to that tenant.
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  /** URL-safe slug used in API paths. */
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Projects table storing narrative flow data as JSONB.
 *
 * ECO-004: `forkedFromId` tracks the source project when a scenario is forked
 * in the marketplace. A null value means the project is an original creation.
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    coverUrl: text('cover_url'),
    isPublished: boolean('is_published').notNull().default(false),
    data: jsonb('data').notNull().default({}),
    /** ECO-004: The source project this was forked from (null for originals). */
    forkedFromId: uuid('forked_from_id'),
    /** ECO-004: When the fork was created (null for originals). */
    forkedAt: timestamp('forked_at', { withTimezone: true }),
    /** SCALE-001: Tenant this project belongs to (null for platform-level). */
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('projects_owner_id_idx').on(table.ownerId),
    updatedAtIdx: index('projects_updated_at_idx').on(table.updatedAt),
    forkedFromIdIdx: index('projects_forked_from_id_idx').on(table.forkedFromId),
    tenantIdIdx: index('projects_tenant_id_idx').on(table.tenantId),
  }),
);

/**
 * Assets table storing media and resource metadata.
 */
export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    size: integer('size').notNull(),
    storageKey: text('storage_key').notNull(),
    storageProvider: varchar('storage_provider', { length: 20 })
      .notNull()
      .default('local'),
    url: text('url').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('assets_owner_id_idx').on(table.ownerId),
    projectIdIdx: index('assets_project_id_idx').on(table.projectId),
  }),
);

/**
 * Refresh tokens table for long-lived session persistence.
 */
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Test sessions table - persists player test results for external consumption.
 *
 * Each record represents one completed test session. External systems
 * (matching, recommendation, CRM) can query by userIdentifier or projectId.
 */
export const testSessions = pgTable(
  'test_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userIdentifier: varchar('user_identifier', { length: 200 }).notNull(),
    settlementResult: jsonb('settlement_result').notNull(),
    metadata: jsonb('metadata'),
    /** SCALE-001: Tenant this session belongs to (denormalized for fast filtering). */
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('test_sessions_project_id_idx').on(table.projectId),
    userIdentifierIdx: index('test_sessions_user_identifier_idx').on(table.userIdentifier),
    tenantIdIdx: index('test_sessions_tenant_id_idx').on(table.tenantId),
  }),
);

/**
 * Drizzle ORM relations.
 */
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  projects: many(projects),
  assets: many(assets),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tenant: one(tenants, { fields: [projects.tenantId], references: [tenants.id] }),
  assets: many(assets),
  testSessions: many(testSessions),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  owner: one(users, { fields: [assets.ownerId], references: [users.id] }),
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
}));

export const testSessionsRelations = relations(testSessions, ({ one }) => ({
  project: one(projects, { fields: [testSessions.projectId], references: [projects.id] }),
  tenant: one(tenants, { fields: [testSessions.tenantId], references: [tenants.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type TestSession = typeof testSessions.$inferSelect;
export type NewTestSession = typeof testSessions.$inferInsert;
