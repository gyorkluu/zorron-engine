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
  uniqueIndex,
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
    /**
     * The working copy. Every autosave lands here and it is what the editor
     * loads — including changes the author has not decided to ship yet.
     */
    data: jsonb('data').notNull().default({}),
    /**
     * Snapshot taken at publish time. This — not `data` — is what players
     * load, so editing a live project never changes the running experience.
     * Null until the first publish.
     */
    publishedData: jsonb('published_data'),
    /** When `publishedData` was last written. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
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
    /** Free-form tags used for filtering the library. */
    tags: jsonb('tags').$type<string[]>().default([]),
    /** Folder path, e.g. 'chapter-2/backgrounds'. */
    folder: varchar('folder', { length: 255 }),
    /**
     * 'project' assets belong to one project; 'global' assets are shared
     * across everything the owner makes.
     */
    scope: varchar('scope', { length: 10 }).notNull().default('project'),
    /** How many nodes reference this asset, for safe deletion warnings. */
    usageCount: integer('usage_count').notNull().default(0),
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
    /** Settlement result (nullable for scenarios without settlement). */
    settlementResult: jsonb('settlement_result'),
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
 * Scenario variants table (SCALE-002).
 *
 * Each variant represents an A/B test arm for a project. Variants share the
 * same projectId but may differ in flow data (stored on the variant). Traffic
 * is split by `weight` (relative, not percentage). The `isControl` flag marks
 * the baseline variant for comparison.
 */
export const scenarioVariants = pgTable(
  'scenario_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Short key like 'A', 'B', 'control', 'treatment'. Unique per project. */
    variantKey: varchar('variant_key', { length: 20 }).notNull(),
    label: varchar('label', { length: 100 }),
    description: text('description'),
    /** Relative weight for traffic allocation (default 1 = equal split). */
    weight: integer('weight').notNull().default(1),
    isControl: boolean('is_control').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    /** SCALE-001: Tenant scope (null for platform-level). */
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdVariantKeyUnique: uniqueIndex('scenario_variants_project_variant_unique')
      .on(table.projectId, table.variantKey),
    projectIdIdx: index('scenario_variants_project_id_idx').on(table.projectId),
    tenantIdIdx: index('scenario_variants_tenant_id_idx').on(table.tenantId),
  }),
);

/**
 * Session events table (SCALE-002).
 *
 * Captures granular player behavior for completion-rate analytics. Each row
 * is one event: entering the scenario, reaching a node, completing, or
 * abandoning. The `sessionId` is null until the final settlement is saved.
 */
export const sessionEvents = pgTable(
  'session_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => scenarioVariants.id, {
      onDelete: 'set null',
    }),
    /** Links to test_sessions once the session is finalized; null before. */
    sessionId: uuid('session_id').references(() => testSessions.id, {
      onDelete: 'set null',
    }),
    userIdentifier: varchar('user_identifier', { length: 200 }).notNull(),
    /** enter | step | complete | abandon */
    eventType: varchar('event_type', { length: 20 }).notNull(),
    /** Node id where the event occurred (null for enter/complete). */
    nodeId: varchar('node_id', { length: 100 }),
    eventData: jsonb('event_data').default({}),
    /** SCALE-001: Tenant scope (denormalized for fast filtering). */
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('session_events_project_id_idx').on(table.projectId),
    variantIdIdx: index('session_events_variant_id_idx').on(table.variantId),
    userIdentifierIdx: index('session_events_user_identifier_idx').on(table.userIdentifier),
    tenantIdIdx: index('session_events_tenant_id_idx').on(table.tenantId),
  }),
);

/**
 * Webhook subscriptions table (SCALE-003).
 *
 * External systems register a callback URL to receive events when players
 * complete tests. Subscriptions can be scoped to a specific project or
 * receive events for all projects owned by the subscriber's tenant.
 */
export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The user who owns this subscription. */
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Target URL to POST events to. */
    callbackUrl: text('callback_url').notNull(),
    /** HMAC-SHA256 signing secret for payload verification. */
    secret: varchar('secret', { length: 128 }).notNull(),
    /** JSON array of event types to subscribe to (e.g. ["session.completed"]). */
    eventTypes: jsonb('event_types').notNull().default([]),
    /** Scope to a specific project (null = all projects the owner can access). */
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    isActive: boolean('is_active').notNull().default(true),
    /** SCALE-001: Tenant scope. */
    tenantId: uuid('tenant_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('webhook_subscriptions_owner_id_idx').on(table.ownerId),
    projectIdIdx: index('webhook_subscriptions_project_id_idx').on(table.projectId),
    tenantIdIdx: index('webhook_subscriptions_tenant_id_idx').on(table.tenantId),
  }),
);

/**
 * Webhook delivery log table (SCALE-003).
 *
 * Records each delivery attempt for observability and retry. A delivery is
 * created when an event fires and updated with the HTTP response status.
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: 'cascade' }),
    /** The test session that triggered this delivery. */
    sessionId: uuid('session_id').references(() => testSessions.id, {
      onDelete: 'cascade',
    }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    /** The JSON payload sent to the webhook. */
    payload: jsonb('payload').notNull(),
    /** pending | success | failed | retry */
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    /** Number of delivery attempts. */
    attempts: integer('attempts').notNull().default(0),
    /** HTTP status code from the last attempt (null if not yet sent). */
    responseStatus: integer('response_status'),
    /** Error message from the last attempt (null on success). */
    lastError: text('last_error'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    /** When to retry next (null if no retry pending). */
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subscriptionIdIdx: index('webhook_deliveries_subscription_id_idx').on(table.subscriptionId),
    statusIdx: index('webhook_deliveries_status_idx').on(table.status),
    sessionIdIdx: index('webhook_deliveries_session_id_idx').on(table.sessionId),
  }),
);

/**
 * JX3 submissions table.
 *
 * Stores completed JX3 social-card test sessions keyed by 推栏号.
 * Used for duplicate detection: when a user enters a 推栏号 that already
 * has a submission, the frontend offers "修改信息" (re-take) or "申诉"
 * (appeal with screenshot) actions.
 */
export const jx3Submissions = pgTable(
  'jx3_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 推栏号 — unique per submission. */
    tuilanId: varchar('tuilan_id', { length: 64 }).notNull().unique(),
    /** Xoyo personId (internal). */
    personId: varchar('person_id', { length: 128 }),
    /** Aggregated profile from Xoyo API (JSONB). */
    profile: jsonb('profile'),
    /** Final engine variables at settlement time (JSONB). */
    variables: jsonb('variables'),
    /** Settlement result (JSONB). */
    settlementResult: jsonb('settlement_result'),
    /** Card-preset image local path (decrypted + downloaded). */
    cardImagePath: text('card_image_path'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tuilanIdIdx: uniqueIndex('jx3_submissions_tuilan_id_idx').on(table.tuilanId),
  }),
);

/**
 * JX3 appeals table.
 *
 * Stores appeals submitted when a 推栏号 already has a submission and the
 * user claims the data is incorrect or the account belongs to them.
 * Each appeal includes a screenshot upload path and a free-text reason.
 */
export const jx3Appeals = pgTable(
  'jx3_appeals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tuilanId: varchar('tuilan_id', { length: 64 }).notNull(),
    /** Local path of the uploaded screenshot. */
    screenshotPath: text('screenshot_path').notNull(),
    /** User-provided appeal reason. */
    reason: text('reason'),
    /** pending | approved | rejected */
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tuilanIdIdx: index('jx3_appeals_tuilan_id_idx').on(table.tuilanId),
    statusIdx: index('jx3_appeals_status_idx').on(table.status),
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

/**
 * Reusable node templates — the "node as an asset" marketplace.
 *
 * An author packages a configured node (a well-tuned QTE stage, a reusable
 * rating prompt) and others instantiate it into their own projects. Copies are
 * always by value, so editing an instance never changes the template.
 */
export const nodeAssets = pgTable(
  'node_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SCALE-001: tenant scope for workspace isolation. */
    tenantId: uuid('tenant_id'),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    /** Node type this template instantiates (e.g. 'stage', 'rating'). */
    nodeType: varchar('node_type', { length: 40 }).notNull(),
    /** The node's data payload exactly as authored. */
    data: jsonb('data').notNull().default({}),
    /** Presentation category used to group the catalogue. */
    category: varchar('category', { length: 40 }),
    tags: jsonb('tags').$type<string[]>().default([]),
    /** Times instantiated, for ranking. */
    usageCount: integer('usage_count').notNull().default(0),
    /** Public assets appear in everyone's catalogue. */
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('node_assets_owner_id_idx').on(table.ownerId),
    nodeTypeIdx: index('node_assets_node_type_idx').on(table.nodeType),
    publicIdx: index('node_assets_public_idx').on(table.isPublic),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tenant: one(tenants, { fields: [projects.tenantId], references: [tenants.id] }),
  assets: many(assets),
  testSessions: many(testSessions),
  variants: many(scenarioVariants),
  events: many(sessionEvents),
  webhookSubscriptions: many(webhookSubscriptions),
}));

export const nodeAssetsRelations = relations(nodeAssets, ({ one }) => ({
  owner: one(users, { fields: [nodeAssets.ownerId], references: [users.id] }),
  tenant: one(tenants, { fields: [nodeAssets.tenantId], references: [tenants.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  owner: one(users, { fields: [assets.ownerId], references: [users.id] }),
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
}));

export const testSessionsRelations = relations(testSessions, ({ one, many }) => ({
  project: one(projects, { fields: [testSessions.projectId], references: [projects.id] }),
  tenant: one(tenants, { fields: [testSessions.tenantId], references: [tenants.id] }),
  events: many(sessionEvents),
  deliveries: many(webhookDeliveries),
}));

export const scenarioVariantsRelations = relations(scenarioVariants, ({ one, many }) => ({
  project: one(projects, { fields: [scenarioVariants.projectId], references: [projects.id] }),
  tenant: one(tenants, { fields: [scenarioVariants.tenantId], references: [tenants.id] }),
  events: many(sessionEvents),
}));

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one, many }) => ({
  owner: one(users, { fields: [webhookSubscriptions.ownerId], references: [users.id] }),
  project: one(projects, { fields: [webhookSubscriptions.projectId], references: [projects.id] }),
  tenant: one(tenants, { fields: [webhookSubscriptions.tenantId], references: [tenants.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  subscription: one(webhookSubscriptions, { fields: [webhookDeliveries.subscriptionId], references: [webhookSubscriptions.id] }),
  session: one(testSessions, { fields: [webhookDeliveries.sessionId], references: [testSessions.id] }),
}));

export const sessionEventsRelations = relations(sessionEvents, ({ one }) => ({
  project: one(projects, { fields: [sessionEvents.projectId], references: [projects.id] }),
  variant: one(scenarioVariants, { fields: [sessionEvents.variantId], references: [scenarioVariants.id] }),
  session: one(testSessions, { fields: [sessionEvents.sessionId], references: [testSessions.id] }),
  tenant: one(tenants, { fields: [sessionEvents.tenantId], references: [tenants.id] }),
}));

export const saveSlots = pgTable(
  'save_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    slotIndex: integer('slot_index').notNull(),
    snapshotData: jsonb('snapshot_data').notNull(),
    chapterTitle: varchar('chapter_title', { length: 200 }),
    previewImageUrl: text('preview_image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProjectSlotIdx: uniqueIndex('save_slots_user_project_slot_idx').on(
      table.userId,
      table.projectId,
      table.slotIndex,
    ),
    projectIdx: index('save_slots_project_idx').on(table.projectId),
  }),
);

export const saveSlotsRelations = relations(saveSlots, ({ one }) => ({
  user: one(users, { fields: [saveSlots.userId], references: [users.id] }),
  project: one(projects, { fields: [saveSlots.projectId], references: [projects.id] }),
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
export type ScenarioVariant = typeof scenarioVariants.$inferSelect;
export type NewScenarioVariant = typeof scenarioVariants.$inferInsert;
export type SessionEvent = typeof sessionEvents.$inferSelect;
export type NewSessionEvent = typeof sessionEvents.$inferInsert;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscription = typeof webhookSubscriptions.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
export type Jx3Submission = typeof jx3Submissions.$inferSelect;
export type NewJx3Submission = typeof jx3Submissions.$inferInsert;
export type Jx3Appeal = typeof jx3Appeals.$inferSelect;
export type NewJx3Appeal = typeof jx3Appeals.$inferInsert;
export type SaveSlot = typeof saveSlots.$inferSelect;
export type NewSaveSlot = typeof saveSlots.$inferInsert;

