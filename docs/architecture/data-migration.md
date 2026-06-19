# Zorron Engine 数据迁移方案

## 1. 目标

1. 将现有 MongoDB 中的 `User`、`Project`、`File` 集合迁移到 PostgreSQL。
2. 将本地 `project.json` 文件中的旧格式数据转换为新版 `FlowData` 结构。
3. 统一 ID 体系：从 MongoDB ObjectId 迁移到 UUID v7。
4. 保证迁移过程可回滚、可校验、可审计。

---

## 2. PostgreSQL Schema（Drizzle ORM）

### 2.1 用户表

```ts
import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 64 }),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 2.2 项目表

```ts
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('projects_owner_id_idx').on(table.ownerId),
    updatedAtIdx: index('projects_updated_at_idx').on(table.updatedAt),
  })
);
```

说明：

- `data` 字段为 JSONB，存储 `FlowData`（nodes/edges/variables/settings）。
- 节点 `data` 保持 schema-less，通过应用层 Zod 校验。
- 高频查询字段（ownerId、updatedAt）建立索引。

### 2.3 资源表

```ts
import { pgTable, uuid, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users, projects } from './users';

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // image | audio | video | font | other
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    size: integer('size').notNull(),
    storageKey: text('storage_key').notNull(),        // 存储 Provider 中的 key
    storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'),
    url: text('url').notNull(),                       // 可访问 URL
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index('assets_owner_id_idx').on(table.ownerId),
    projectIdIdx: index('assets_project_id_idx').on(table.projectId),
  })
);
```

### 2.4 会话与限流（Redis 备用，PostgreSQL 兜底）

```ts
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

说明：

- 主要会话存储在 Redis，支持 TTL。
- `refresh_tokens` 表作为长期刷新令牌的持久化兜底。
- 限流完全依赖 Redis（`ioredis` + sliding window）。

### 2.5 关系定义

```ts
import { relations } from 'drizzle-orm';
import { users, projects, assets } from './schema';

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  assets: many(assets),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  owner: one(users, { fields: [assets.ownerId], references: [users.id] }),
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
}));
```

---

## 3. 旧数据结构映射

### 3.1 MongoDB → PostgreSQL 映射

| 旧集合 | 旧字段 | 新表 | 新字段 | 说明 |
|---|---|---|---|---|
| `users` | `_id` | `users` | `id` | ObjectId → UUID v7 |
| `users` | `email` | `users` | `email` | 保留 |
| `users` | `password` | `users` | `passwordHash` | 保留 bcrypt 哈希，无需重算 |
| `users` | `nickname` | `users` | `nickname` | 保留 |
| `users` | `createdAt` | `users` | `createdAt` | 保留 |
| `projects` | `_id` | `projects` | `id` | ObjectId → UUID v7 |
| `projects` | `userId` | `projects` | `ownerId` | 引用 users.id |
| `projects` | `title` | `projects` | `title` | 保留 |
| `projects` | `description` | `projects` | `description` | 保留 |
| `projects` | `data` | `projects` | `data` | JSONB |
| `projects` | `isPublic` | `projects` | `isPublished` | 重命名 |
| `files` | `_id` | `assets` | `id` | ObjectId → UUID v7 |
| `files` | `userId` | `assets` | `ownerId` | 引用 users.id |
| `files` | `projectId` | `assets` | `projectId` | 引用 projects.id |
| `files` | `filename` | `assets` | `name` | 保留 |
| `files` | `mimetype` | `assets` | `mimeType` | 保留 |
| `files` | `size` | `assets` | `size` | 保留 |
| `files` | `path` | `assets` | `storageKey` | 本地路径或对象存储 key |
| `files` | `url` | `assets` | `url` | 保留，必要时重写为 CDN URL |

### 3.2 project.json 结构映射

旧版 `project.json` 主要字段：

```json
{
  "id": "...",
  "title": "...",
  "settings": { ... },
  "variables": { ... },
  "nodes": [ ... ],
  "edges": [ ... ],
  "assets": [ ... ]
}
```

新版结构：

```json
{
  "id": "uuid",
  "title": "...",
  "data": {
    "version": "1.0.0",
    "nodes": [ ... ],
    "edges": [ ... ],
    "variables": { ... },
    "settings": { ... }
  }
}
```

迁移规则：

1. `project.json` 顶层 `nodes` / `edges` / `variables` / `settings` 整体迁移到 `data` 字段。
2. 新增 `data.version = "1.0.0"`。
3. 节点 `id` 保持字符串；如果旧节点 id 为 MongoDB ObjectId，则转换为 UUID v7 并记录映射表。
4. `assets` 数组从 `project.json` 中剥离，独立迁移到 `assets` 表，并通过 `projectId` 关联。
5. 旧 `cdn-mapping.json` 中的 URL 映射转为 `assets.url` 字段。

---

## 4. 迁移脚本设计

### 4.1 迁移流程

```text
1. 备份
   ├── 导出 MongoDB 全库 dump
   ├── 备份本地 project.json 目录
   └── 记录旧文件 MD5

2. 环境准备
   ├── 初始化 PostgreSQL 与 Drizzle 表
   ├── 初始化 Redis
   └── 配置存储 Provider

3. 用户迁移
   ├── 读取 MongoDB users
   ├── ObjectId → UUID v7
   ├── 写入 users 表
   └── 保存 idMapping.json

4. 项目迁移
   ├── 读取 MongoDB projects / 本地 project.json
   ├── 转换 ownerId（通过 idMapping）
   ├── 转换节点/边 ID
   ├── 封装为 FlowData
   ├── Zod 校验
   ├── 写入 projects 表
   └── 保存 projectIdMapping.json

5. 资源迁移
   ├── 读取 MongoDB files / 本地 assets
   ├── 复制文件内容到存储 Provider（本地/S3）
   ├── 生成 storageKey 与 url
   ├── 关联 ownerId / projectId
   ├── 写入 assets 表
   └── 更新 projects.data 中的资源引用 URL

6. 校验
   ├── 统计 users/projects/assets 数量
   ├── 抽样校验 project.data Zod
   ├── 校验资源 URL 可访问
   └── 生成迁移报告
```

### 4.2 核心迁移脚本伪代码

```ts
// 概念示例，非实现代码
async function migrateProjects(oldProjects: OldProject[], idMapping: Map<string, string>) {
  for (const old of oldProjects) {
    const newId = generateUuid7();
    const flowData: FlowData = {
      version: '1.0.0',
      nodes: old.nodes.map(transformNode),
      edges: old.edges.map(transformEdge),
      variables: old.variables ?? {},
      settings: transformSettings(old.settings),
    };

    const validated = FlowDataSchema.parse(flowData);

    await db.insert(projects).values({
      id: newId,
      ownerId: idMapping.get(old.userId.toString()),
      title: old.title,
      description: old.description,
      isPublished: old.isPublic ?? false,
      data: validated,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
    });

    projectIdMapping.set(old._id.toString(), newId);
  }
}
```

### 4.3 ID 映射持久化

迁移过程中生成并保存 `id-mapping.json`：

```json
{
  "users": {
    "507f1f77bcf86cd799439011": "01905a1b-2c3d-7e4f-8a9b-0c1d2e3f4a5b"
  },
  "projects": {
    "507f1f77bcf86cd799439012": "01905a1b-2c3d-7e4f-8a9b-0c1d2e3f4a5c"
  },
  "assets": {
    "507f1f77bcf86cd799439013": "01905a1b-2c3d-7e4f-8a9b-0c1d2e3f4a5d"
  }
}
```

该映射表用于：

1. 回滚时定位旧数据。
2. 后续增量迁移。
3. 前端本地项目文件与云端项目关联。

---

## 5. 数据校验策略

### 5.1 校验层次

1. **Schema 级校验**：Drizzle 表约束 + Zod 校验 `FlowData`。
2. **业务级校验**：
   - 每个项目至少包含一个 `start` 节点。
   - 所有 `edges` 的 `source` / `target` 必须指向存在的节点。
   - `assets.url` 必须可访问。
3. **数量级校验**：
   - 迁移前后统计 users、projects、assets 数量，差异为 0 视为通过。
4. **抽样校验**：
   - 随机抽取 5% 项目，使用 `FlowDataSchema` 反序列化并执行 `GameEngine.start()` 验证无异常。

### 5.2 校验脚本输出示例

```json
{
  "summary": {
    "users": { "source": 120, "target": 120 },
    "projects": { "source": 450, "target": 450 },
    "assets": { "source": 2300, "target": 2300 },
    "failedProjects": [],
    "failedAssets": []
  },
  "sampleChecks": {
    "total": 23,
    "passed": 23,
    "failed": 0
  }
}
```

---

## 6. 回滚方案

### 6.1 完全回滚

1. 停止新后端服务。
2. 清空 PostgreSQL 中 `users`、`projects`、`assets`、`refresh_tokens` 表。
3. 重新启动旧 Koa + MongoDB 服务。
4. 恢复旧版前端部署。

### 6.2 增量回滚

若仅部分项目迁移失败：

1. 从 `id-mapping.json` 定位失败的新 UUID。
2. 删除 PostgreSQL 中对应记录。
3. 修复旧数据后重新运行迁移脚本（支持幂等）。

### 6.3 幂等性保证

迁移脚本必须幂等：

1. 根据 email 判断用户是否已存在。
2. 根据旧 `_id` 查询 `id-mapping.json` 判断项目/资源是否已迁移。
3. 已迁移记录跳过或更新（`ON CONFLICT` / `upsert`）。

---

## 7. 迁移后数据治理

### 7.1 节点 data 规范化路线

阶段 1（迁移时）：`nodes.data` 整体存入 JSONB，应用层 Zod 校验。

阶段 2（稳定后）：将高频查询字段（如 `sceneNode.choices`、`calculatorNode.vector`）抽取到独立表或 JSONB 索引：

```sql
CREATE INDEX idx_project_data_nodes ON projects USING GIN ((data -> 'nodes'));
```

阶段 3（可选）：若需复杂查询（如「查找所有包含某选项的节点」），将节点拆分为独立表 `project_nodes`。

### 7.2 资源引用治理

1. 迁移后在 `projects.data` 中统一使用 `asset.url`（绝对 URL 或 `zorron://asset/<uuid>` 协议）。
2. 编写清理脚本，移除指向已删除资源的引用。
3. 退役旧 `assets/cdn-mapping.json`。

### 7.3 旧数据归档

1. MongoDB dump 保留 90 天。
2. 本地旧 project.json 目录保留 90 天。
3. 迁移报告与 `id-mapping.json` 永久保存。

---

## 8. 迁移执行清单

| 步骤 | 负责人 | 验收标准 |
|---|---|---|
| 1. MongoDB 与 project.json 全量备份 | DevOps | dump 文件存在且可恢复 |
| 2. PostgreSQL 与 Drizzle 表初始化 | Backend Dev | `drizzle-kit migrate` 成功 |
| 3. 用户迁移脚本 | Backend Dev | users 数量一致，email 唯一 |
| 4. 项目迁移脚本 | Backend Dev | projects 数量一致，Zod 校验通过 |
| 5. 资源迁移脚本 | Backend Dev | assets 数量一致，URL 可访问 |
| 6. 校验脚本 | QA | 抽样 100% 通过 |
| 7. 切换 DNS / 部署新后端 | DevOps | `/health` 与 `/ready` 返回正常 |
| 8. 灰度验证 | QA | 核心编辑器与 Player Happy Path 通过 |
| 9. 旧数据归档 | DevOps | 备份保留 90 天 |
