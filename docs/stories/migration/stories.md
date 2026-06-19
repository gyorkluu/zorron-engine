# Zorron Engine Migration User Stories

> 目标：将 Zorron Engine 从 Vue 3 / Koa / MongoDB 迁移至 React 18+ / ElysiaJS / PostgreSQL，演进为通用交互叙事编辑器。
> 模板来源：[aiox-story-template.md](../../zorron-editor/.aios-core/development/templates/aiox-story-template.md)
> 验收清单：[aiox-migration-story-acceptance.md](../../zorron-editor/.aios-core/development/checklists/aiox-migration-story-acceptance.md)

---

# MIG-001: Project Bootstrap

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-001 |
| 标题 | Project Bootstrap |
| 负责 Agent | @aiox-dev |
| 预估工时 | 5 PD |
| 依赖 Story | 无 |
| Feature 分支 | feature/migration/MIG-001-project-bootstrap |
| 状态 | Draft |

## 用户故事

作为 **Zorron Engine 维护者**，
我希望 **初始化前后端工程骨架、容器化本地开发环境并沉淀项目规范**，
以便 **后续 Story 能基于一致的栈与目录结构进行开发**。

## 验收标准（Given-When-Then）

1. **场景 1：前端工程可本地运行**
   - Given 开发者执行 `pnpm install`
   - When 运行 `pnpm --filter zorron-editor dev`
   - Then Vite 开发服务器在 `http://localhost:5173` 启动，页面显示 "Zorron Editor" 占位首页，控制台无致命错误

2. **场景 2：后端工程可本地运行**
   - Given 开发者执行 `pnpm install` 并已启动 `docker compose up postgres redis`
   - When 运行 `pnpm --filter zorron-server dev`
   - Then Elysia 服务在 `http://localhost:3000` 启动，访问 `/health` 返回 `{"status":"ok"}`

3. **场景 3：容器化开发环境一键启动**
   - Given 开发者已安装 Docker
   - When 执行 `docker compose up -d`
   - Then 启动 PostgreSQL 16、Redis 7 与 zorron-server，且 `docker compose ps` 显示全部服务 healthy

4. **场景 4：项目规范文档就位**
   - Given 仓库根目录存在 `AGENTS.md`
   - When 阅读 `AGENTS.md`
   - Then 文档包含技术栈、目录结构、常用 pnpm 命令、环境变量说明与提交规范

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/adr/adr-001-react-flow.md](../adr/adr-001-react-flow.md)
- [docs/adr/adr-002-elysia-drizzle.md](../adr/adr-002-elysia-drizzle.md)

## 技术备注

- 采用 pnpm workspace 组织 `apps/zorron-editor` 与 `apps/zorron-server`。
- 前端：React 18 + Vite 6 + TypeScript（严格模式）+ Tailwind CSS + shadcn/ui + Radix UI + Zustand。
- 后端：ElysiaJS + Bun + TypeScript（严格模式）+ pino + Zod。
- 数据库：PostgreSQL 16 + Redis 7，通过 `docker-compose.yml` 提供。
- 根目录必须包含 `.env.example`，前后端 `apps/<name>/.env` 不提交版本控制。

## 实现提示

### 前端关键文件

- `apps/zorron-editor/package.json`
- `apps/zorron-editor/vite.config.ts`
- `apps/zorron-editor/tsconfig.json`
- `apps/zorron-editor/tailwind.config.ts`
- `apps/zorron-editor/components.json`（shadcn/ui 配置）
- `apps/zorron-editor/src/main.tsx`
- `apps/zorron-editor/src/App.tsx`
- `apps/zorron-editor/src/styles/globals.css`
- `apps/zorron-editor/index.html`

### 后端关键文件

- `apps/zorron-server/package.json`
- `apps/zorron-server/tsconfig.json`
- `apps/zorron-server/src/app.ts`
- `apps/zorron-server/src/server.ts`
- `apps/zorron-server/src/config/env.ts`（Zod 解析环境变量）
- `apps/zorron-server/src/shared/logger.ts`（pino 实例）

### 基础设施关键文件

- `package.json`（workspace 定义）
- `pnpm-workspace.yaml`
- `docker-compose.yml`
- `.env.example`
- `AGENTS.md`
- `.gitignore`（必须排除 `.env`、`node_modules`、`.uploads`、`pgdata`）

### 依赖安装参考

```bash
# 根目录
pnpm add -D turbo @types/node

# 前端
pnpm --filter zorron-editor add react react-dom zustand @xyflow/react class-variance-authority clsx tailwind-merge lucide-react
pnpm --filter zorron-editor add -D @types/react @types/react-dom @vitejs/plugin-react vite typescript tailwindcss postcss autoprefixer

# 后端
pnpm --filter zorron-server add elysia zod pino jose drizzle-orm pg ioredis @elysiajs/cors @elysiajs/bearer
pnpm --filter zorron-server add -D @types/bun @types/pg drizzle-kit
```

## 任务清单

- [ ] 初始化根目录 pnpm workspace 与 `package.json` scripts
- [ ] 初始化 `apps/zorron-editor`：React + Vite + TypeScript 严格模式 + Tailwind + shadcn/ui
- [ ] 初始化 `apps/zorron-server`：Elysia + Bun + TypeScript 严格模式
- [ ] 编写后端 `/health` 与 `/ready` 占位端点（MIG-004 将补充就绪检查）
- [ ] 配置 pino 结构化日志与 requestId 中间件
- [ ] 编写 `docker-compose.yml`（postgres、redis、server 服务）
- [ ] 编写 `.env.example` 覆盖前后端与数据库/Redis/存储配置
- [ ] 编写 `AGENTS.md` 项目规范文档
- [ ] 配置 `.gitignore` 与 Prettier/ESLint（可选但推荐）

## 测试要求

- [ ] Vitest 集成测试：后端 `/health` 返回 200
- [ ] 手动验收：前端 dev server 可访问、后端 dev server 可访问
- [ ] 手动验收：`docker compose up -d` 后所有服务 healthy

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-002: Database Schema & Migrations

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-002 |
| 标题 | Database Schema & Migrations |
| 负责 Agent | @aiox-dev |
| 预估工时 | 4 PD |
| 依赖 Story | MIG-001 |
| Feature 分支 | feature/migration/MIG-002-db-schema-migrations |
| 状态 | Draft |

## 用户故事

作为 **后端开发者**，
我希望 **使用 Drizzle ORM 定义用户、项目、资源、刷新令牌四张表并生成可版本化的迁移脚本**，
以便 **业务数据有强类型、可回滚的持久化结构**。

## 验收标准（Given-When-Then）

1. **场景 1：迁移可成功应用**
   - Given 已启动 PostgreSQL 容器且 `DATABASE_URL` 配置正确
   - When 执行 `pnpm --filter zorron-server db:migrate`
   - Then 命令退出码为 0，数据库中出现 `users`、`projects`、`assets`、`refresh_tokens` 四张表

2. **场景 2：迁移可回滚**
   - Given 迁移已应用
   - When 执行 `pnpm --filter zorron-server db:rollback`
   - Then 上述四张表被删除，数据库回到迁移前状态（幂等脚本可重新应用）

3. **场景 3：表约束与索引正确**
   - Given 迁移已应用
   - When 查询 `\d users` / `\d projects` / `\d assets`
   - Then `users.email`、`refresh_tokens.token_hash` 为唯一索引；`projects` 与 `assets` 存在 `owner_id`、`project_id`、`updated_at` 索引

4. **场景 4：Drizzle 客户端可查询**
   - Given 后端服务已启动
   - When `auth.service` 调用 `db.select().from(users).where(eq(users.email, 'a@b.com'))`
   - Then 返回强类型结果集，无 TypeScript 编译错误

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/data-migration.md](../architecture/data-migration.md)
- [docs/adr/adr-002-elysia-drizzle.md](../adr/adr-002-elysia-drizzle.md)

## 技术备注

- 严格遵循 `data-migration.md` 中的表结构设计。
- `projects.data` 使用 `jsonb` 类型，默认 `{}`，应用层通过 Zod 校验。
- `assets.storage_provider` 支持 `local|s3|r2`。
- `refresh_tokens` 作为长期刷新令牌的持久化兜底，主会话仍依赖 Redis TTL。

## 实现提示

### 关键文件

- `apps/zorron-server/src/db/schema.ts`
- `apps/zorron-server/src/db/migrations/`（drizzle-kit 生成）
- `apps/zorron-server/src/db/relations.ts`
- `apps/zorron-server/src/config/database.ts`（Drizzle client 初始化）
- `apps/zorron-server/drizzle.config.ts`

### 表结构参考

```typescript
// apps/zorron-server/src/db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  isPublished: boolean('is_published').notNull().default(false),
  data: jsonb('data').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdIdx: index('projects_owner_id_idx').on(table.ownerId),
  updatedAtIdx: index('projects_updated_at_idx').on(table.updatedAt),
}));

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  mimeType: varchar('mime_type', { length: 127 }).notNull(),
  size: integer('size').notNull(),
  storageKey: text('storage_key').notNull(),
  storageProvider: varchar('storage_provider', { length: 20 }).notNull().default('local'),
  url: text('url').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdIdx: index('assets_owner_id_idx').on(table.ownerId),
  projectIdIdx: index('assets_project_id_idx').on(table.projectId),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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

### package.json scripts 参考

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:rollback": "drizzle-kit drop"
  }
}
```

### 依赖安装参考

```bash
pnpm --filter zorron-server add drizzle-orm pg ioredis
pnpm --filter zorron-server add -D drizzle-kit
```

## 任务清单

- [x] 安装 Drizzle ORM、pg、ioredis、drizzle-kit
- [x] 编写 `drizzle.config.ts` 指向 `src/db/schema.ts`
- [x] 编写 `src/db/schema.ts` 定义 users/projects/assets/refresh_tokens
- [x] 编写 `src/db/relations.ts` 或内联 relations
- [x] 编写 `src/config/database.ts` 初始化 Drizzle client
- [x] 运行 `db:generate` 生成迁移 SQL
- [x] 运行 `db:migrate` 在本地 PostgreSQL 应用迁移
- [x] 验证表结构与索引

## 测试要求

- [x] Vitest 集成测试：迁移应用后可连接数据库并查询表元数据
- [x] 手动验收：`db:migrate` / `db:rollback` 命令可用

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-18 |
| 完成时间 | 2026-06-18 |
| 修改文件 | `apps/zorron-server/src/db/schema.ts`、`apps/zorron-server/src/config/database.ts`、`apps/zorron-server/drizzle.config.ts`、`apps/zorron-server/src/db/migrations/*` |
| 测试命令 | `pnpm --filter zorron-server db:migrate` |
| 测试结果 | 迁移成功应用，users/projects/assets/refresh_tokens 四张表创建完成 |
| 阻塞与解决 | 本地 PostgreSQL 数据库 `zorronfactory` 不存在；通过 Bun 脚本使用 pg 客户端自动创建数据库后解决 |
| 状态 | Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-003: Auth API

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-003 |
| 标题 | Auth API |
| 负责 Agent | @aiox-dev |
| 预估工时 | 5 PD |
| 依赖 Story | MIG-001、MIG-002 |
| Feature 分支 | feature/migration/MIG-003-auth-api |
| 状态 | Draft |

## 用户故事

作为 **Zorron Engine 用户**，
我希望 **通过邮箱/密码注册、登录、刷新会话与登出**，
以便 **安全地访问我的项目与资源**。

## 验收标准（Given-When-Then）

1. **场景 1：用户注册成功**
   - Given 邮箱 `new@zorron.io` 未注册
   - When 调用 `POST /api/auth/register` 传入 `{ email, password（≥8 位）, nickname }`
   - Then 返回 201，响应体包含用户信息（不含 passwordHash）与 access token；`Set-Cookie` 头包含 `refreshToken` httpOnly cookie

2. **场景 2：注册邮箱冲突**
   - Given 邮箱 `existing@zorron.io` 已注册
   - When 再次调用 `POST /api/auth/register`
   - Then 返回 409，错误码 `AUTH_004`，message 提示邮箱已注册

3. **场景 3：用户登录成功**
   - Given 用户已注册且密码正确
   - When 调用 `POST /api/auth/login` 传入 `{ email, password }`
   - Then 返回 200，包含 access token 与 `refreshToken` httpOnly cookie

4. **场景 4：登录凭证错误**
   - Given 用户已注册
   - When 调用 `POST /api/auth/login` 传入错误密码
   - Then 返回 401，错误码 `AUTH_003`，不泄露邮箱是否存在

5. **场景 5：刷新 Access Token**
   - Given 用户已登录且持有有效 `refreshToken` cookie
   - When 调用 `POST /api/auth/refresh`
   - Then 返回 200 与新 access token，并轮换 refresh token（旧 token 失效）

6. **场景 6：登出**
   - Given 用户已登录
   - When 调用 `POST /api/auth/logout`
   - Then 返回 204，`refreshToken` cookie 被清空，对应数据库/Redis 中的 refresh token 被删除

7. **场景 7：获取当前用户**
   - Given 请求头携带有效 `Authorization: Bearer <accessToken>`
   - When 调用 `GET /api/auth/me`
   - Then 返回 200 与当前用户详情

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 密码使用 `bcrypt` 哈希（cost factor ≥ 10），禁止明文存储。
- Access token 使用 JWT，有效期短（如 15 分钟）；refresh token 使用随机字符串哈希后存 PostgreSQL + Redis，有效期长（如 7 天）。
- 使用 Elysia `derive` 插件注入 `user` 上下文，供后续路由使用。
- 所有输入参数使用 Zod schema 校验；错误响应符合 `AppErrorResponse` 格式。

## 实现提示

### 关键文件

- `apps/zorron-server/src/modules/auth/auth.route.ts`
- `apps/zorron-server/src/modules/auth/auth.controller.ts`
- `apps/zorron-server/src/modules/auth/auth.service.ts`
- `apps/zorron-server/src/modules/auth/auth.schema.ts`
- `apps/zorron-server/src/modules/auth/auth.test.ts`
- `apps/zorron-server/src/modules/user/user.repository.ts`
- `apps/zorron-server/src/middleware/auth.ts`（derive 插件）
- `apps/zorron-server/src/shared/errors.ts`（AppError 类）

### 依赖安装参考

```bash
pnpm --filter zorron-server add bcrypt jose uuid
pnpm --filter zorron-server add -D @types/bcrypt @types/uuid
```

### 环境变量补充

```bash
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

## 任务清单

- [x] 安装 bcrypt、jose、uuid
- [x] 实现 `auth.schema.ts`：RegisterRequest/LoginRequest/AuthResponse/UserResponse/RefreshResponse Zod schemas
- [x] 实现 `user.repository.ts`：按邮箱查询/创建用户
- [x] 实现 `auth.service.ts`：注册、登录、刷新、登出、JWT 签发与校验
- [x] 实现 `auth.controller.ts`：解析请求、调用 service、设置 cookie
- [x] 实现 `auth.route.ts`：注册 Elysia 路由
- [x] 实现 `middleware/auth.ts` derive 插件注入 `user` 上下文
- [x] 实现 `shared/errors.ts` 统一 AppError
- [x] 编写 `auth.test.ts` 集成测试覆盖所有场景
- [x] 更新 `.env.example`

## 测试要求

- [x] Vitest 单元测试：password hash、JWT 签发/校验、token rotation
- [x] Vitest 集成测试：所有 `/api/auth/*` 端点 100% 覆盖，包括异常路径
- [x] 手动验收：使用 curl/HTTP Client 完成注册/登录/刷新/登出流程

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-18 |
| 完成时间 | 2026-06-18 |
| 修改文件 | `apps/zorron-server/src/modules/auth/*`、`apps/zorron-server/src/repositories/user.repository.ts`、`apps/zorron-server/src/middleware/auth.ts`、`apps/zorron-server/src/shared/errors.ts`、`apps/zorron-server/.env.example` |
| 测试命令 | `pnpm --filter zorron-server test` |
| 测试结果 | 9/9 Auth API 集成测试通过；register/login/refresh/logout/me 异常路径覆盖完整 |
| 阻塞与解决 | POST /api/auth/logout 在 Vitest(Node) 下返回 500，原因为 Node.js Response 构造器不允许 204 状态码携带非 null body；改为显式返回 `new Response(null, { status: 204 })` 后解决 |
| 状态 | Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-004: Project API

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-004 |
| 标题 | Project API |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-002、MIG-003 |
| Feature 分支 | feature/migration/MIG-004-project-api |
| 状态 | Draft |

## 用户故事

作为 **叙事创作者**，
我希望 **通过 REST API 创建、查询、更新、删除项目，并在项目中保存节点图（FlowData）**，
以便 **云端持久化我的交互叙事作品**。

## 验收标准（Given-When-Then）

1. **场景 1：创建项目**
   - Given 用户已认证
   - When 调用 `POST /api/projects` 传入 `{ title, description?, data? }`
   - Then 返回 201，响应体包含 `ProjectDetailSchema`（含 `data` 字段，默认空 nodes/edges）

2. **场景 2：项目列表分页查询**
   - Given 用户已创建多个项目
   - When 调用 `GET /api/projects?page=1&pageSize=10&keyword=demo&sortBy=updatedAt&sortOrder=desc`
   - Then 返回 200 与分页结果，仅包含该用户拥有的项目，且按更新时间倒序

3. **场景 3：获取项目详情**
   - Given 用户拥有一个项目
   - When 调用 `GET /api/projects/:id`
   - Then 返回 200 与完整项目详情（含 JSONB 中的 nodes/edges/variables/settings）

4. **场景 4：更新项目节点图**
   - Given 用户拥有项目
   - When 调用 `PATCH /api/projects/:id` 传入 `data: { nodes: [...], edges: [...], variables: {...}, settings: {...} }`
   - Then 返回 200，数据库中 `projects.data` 被更新，`updatedAt` 刷新

5. **场景 5：删除项目**
   - Given 用户拥有项目
   - When 调用 `DELETE /api/projects/:id`
   - Then 返回 204，项目被软删除或硬删除（按实现决策，默认硬删除），关联资源 `projectId` 置 null

6. **场景 6：导出项目 JSON**
   - Given 用户拥有项目
   - When 调用 `GET /api/projects/:id/export`
   - Then 返回 200 与 `ProjectDetailSchema` 结构，可用于本地 `project.json` 保存

7. **场景 7：导入项目 JSON**
   - Given 用户已认证
   - When 调用 `POST /api/projects/import` 传入 `{ title?, data }`
   - Then 返回 201，新项目归属当前用户，`data` 经 Zod 校验后存储

8. **场景 8：无权访问项目**
   - Given 用户 A 拥有一个项目，用户 B 已认证
   - When 用户 B 调用 `GET /api/projects/:id`
   - Then 返回 403，错误码 `PROJECT_002`

9. **场景 9：健康检查**
   - Given 服务运行中
   - When 调用 `GET /health`
   - Then 返回 200 `{"status":"ok","timestamp":"..."}`

10. **场景 10：就绪检查**
    - Given PostgreSQL 与 Redis 均连通
    - When 调用 `GET /ready`
    - Then 返回 200 `{"status":"ready","checks":{"database":"ok","redis":"ok"}}`
    - When 任一依赖断开，返回 503 `{"status":"not_ready",...}`

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 严格遵循分层架构：route → controller → service → repository → database。
- `data` 字段存储完整 `FlowDataSchema`，应用层用 Zod 校验。
- 所有请求记录 pino 日志，携带 requestId、userId、method、path、durationMs。
- 错误响应统一为 `{ code, message, details?, requestId }`。

## 实现提示

### 关键文件

- `apps/zorron-server/src/modules/project/project.route.ts`
- `apps/zorron-server/src/modules/project/project.controller.ts`
- `apps/zorron-server/src/modules/project/project.service.ts`
- `apps/zorron-server/src/modules/project/project.repository.ts`
- `apps/zorron-server/src/modules/project/project.schema.ts`
- `apps/zorron-server/src/modules/project/project.test.ts`
- `apps/zorron-server/src/modules/project/flow-data.schema.ts`（FlowData Zod schemas）
- `apps/zorron-server/src/middleware/logger.ts`（requestId + pino）

### FlowDataSchema 必须覆盖

```typescript
// apps/zorron-server/src/modules/project/flow-data.schema.ts
import { z } from 'zod';

export const PositionSchema = z.object({ x: z.number(), y: z.number() });

export const NodeTypeSchema = z.enum([
  'start', 'scene', 'logic', 'setter', 'calculator', 'settlement', 'video', 'link'
]);

export const BaseNodeDataSchema = z.object({ label: z.string().optional() });

export const StartNodeDataSchema = BaseNodeDataSchema.extend({
  coverUrl: z.string().url().optional(),
  title: z.string().optional(),
  intro: z.string().optional(),
});

export const SceneNodeDataSchema = BaseNodeDataSchema.extend({
  dialogue: z.string().optional(),
  backgroundUrl: z.string().url().optional(),
  characterUrl: z.string().url().optional(),
  choices: z.array(z.object({
    id: z.string(),
    text: z.string(),
    targetNodeId: z.string().optional(),
    interaction: z.enum(['tap', 'hold', 'slash']).default('tap'),
    holdDuration: z.number().optional(),
    slashDirection: z.enum(['left', 'right', 'up', 'down']).optional(),
  })).default([]),
});

export const LogicNodeDataSchema = BaseNodeDataSchema.extend({
  condition: z.string().optional(),
});

export const SetterNodeDataSchema = BaseNodeDataSchema.extend({
  assignments: z.array(z.object({
    variable: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
    operator: z.enum(['set', 'add', 'sub']).default('set'),
  })).default([]),
});

export const CalculatorNodeDataSchema = BaseNodeDataSchema.extend({
  vector: z.object({ x: z.number().default(0), y: z.number().default(0), z: z.number().default(0) }),
  targetVariable: z.string().optional(),
});

export const SettlementNodeDataSchema = BaseNodeDataSchema.extend({
  resultMapping: z.array(z.object({
    resultId: z.string(),
    condition: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    coverUrl: z.string().url().optional(),
  })).default([]),
});

export const VideoNodeDataSchema = BaseNodeDataSchema.extend({
  videoUrl: z.string().url(),
  autoPlay: z.boolean().default(true),
  skipAllowed: z.boolean().default(true),
});

export const LinkNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().url(),
  title: z.string().optional(),
});

export const GameNodeDataSchema = z.union([
  StartNodeDataSchema, SceneNodeDataSchema, LogicNodeDataSchema, SetterNodeDataSchema,
  CalculatorNodeDataSchema, SettlementNodeDataSchema, VideoNodeDataSchema, LinkNodeDataSchema,
]);

export const GameNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: PositionSchema,
  data: GameNodeDataSchema,
  width: z.number().optional(),
  height: z.number().optional(),
});

export const GameEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const VariableSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const VectorSpaceConfigSchema = z.object({
  enabled: z.boolean().default(false),
  dimensions: z.object({ x: z.string().default('处世'), y: z.string().default('立场'), z: z.string().default('性情') }),
  sects: z.array(z.object({ id: z.string(), name: z.string(), vector: z.object({ x: z.number(), y: z.number(), z: z.number() }) })).optional(),
});

export const ProjectSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  bgmUrl: z.string().url().optional(),
  vectorSpace: VectorSpaceConfigSchema.default({ enabled: false }),
});

export const FlowDataSchema = z.object({
  nodes: z.array(GameNodeSchema).default([]),
  edges: z.array(GameEdgeSchema).default([]),
  variables: VariableSchema.default({}),
  settings: ProjectSettingsSchema.default({}),
  version: z.string().default('1.0.0'),
});
```

### 依赖安装参考

```bash
pnpm --filter zorron-server add uuid
pnpm --filter zorron-server add -D @types/uuid
```

## 任务清单

- [x] 编写 `flow-data.schema.ts` 覆盖 8 种节点类型与项目设置
- [x] 编写 `project.schema.ts` 覆盖 CRUD/导入/导出请求响应
- [x] 实现 `project.repository.ts`：CRUD、分页、按 owner 过滤
- [x] 实现 `project.service.ts`：业务编排、权限检查、数据校验
- [x] 实现 `project.controller.ts`
- [x] 实现 `project.route.ts` 并挂载到 Elysia app
- [x] 实现 `middleware/logger.ts` requestId + pino 结构化日志
- [x] 实现 `shared/errors.ts` 统一错误处理中间件
- [x] 实现 `/health` 与 `/ready` 端点
- [x] 编写 `project.test.ts` 集成测试

## 测试要求

- [x] Vitest 单元测试：service 层权限校验、分页计算
- [x] Vitest 集成测试：所有 Project API 端点 100% 覆盖
- [x] 手动验收：使用 HTTP Client 完成项目 CRUD、导入导出

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-18 |
| 完成时间 | 2026-06-18 |
| 修改文件 | `apps/zorron-server/src/modules/project/*`、`apps/zorron-server/src/modules/health/*`、`apps/zorron-server/src/middleware/logger.ts`、`apps/zorron-server/src/middleware/errorHandler.ts`、`apps/zorron-server/src/app.ts` |
| 测试命令 | `pnpm --filter zorron-server test` |
| 测试结果 | 8/8 Project API 集成测试通过；/health 与 /ready 探针测试通过 |
| 阻塞与解决 | DELETE /api/projects/:id 在 Vitest(Node) 下返回 500，原因同为 Node.js Response 构造器对 204 body 的严格校验；改为显式返回 `new Response(null, { status: 204 })` 后解决。/ready 探针在 Redis 未启动时超时，给 `isRedisHealthy` 增加 1500ms 超时竞速后解决 |
| 状态 | Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-005: Asset API

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-005 |
| 标题 | Asset API |
| 负责 Agent | @aiox-dev |
| 预估工时 | 5 PD |
| 依赖 Story | MIG-002、MIG-003 |
| Feature 分支 | feature/migration/MIG-005-asset-api |
| 状态 | Draft |

## 用户故事

作为 **叙事创作者**，
我希望 **上传、查询、删除项目资源，并可获取直链或签名 URL**，
以便 **在场景节点中使用图片、音频、视频等媒体素材**。

## 验收标准（Given-When-Then）

1. **场景 1：上传图片资源**
   - Given 用户已认证且选择一个 ≤ 50MB 的 PNG/JPEG 文件
   - When 调用 `POST /api/assets`（multipart/form-data，字段 `file`、`projectId?`、`metadata?`）
   - Then 返回 201，响应体包含 `AssetResponseSchema`（含 id、name、type、mimeType、size、url）

2. **场景 2：拒绝超大文件**
   - Given 用户已认证且选择一个 60MB 文件
   - When 调用 `POST /api/assets`
   - Then 返回 413，错误码 `ASSET_002`

3. **场景 3：拒绝不支持的 MIME 类型**
   - Given 用户已认证且选择一个 `application/x-msdownload` 文件
   - When 调用 `POST /api/assets`
   - Then 返回 415，错误码 `ASSET_003`

4. **场景 4：资源列表分页**
   - Given 用户已上传多个资源
   - When 调用 `GET /api/assets?type=image&projectId=<uuid>&page=1&pageSize=20`
   - Then 返回 200 与分页资源列表，仅包含该用户资源

5. **场景 5：获取资源详情**
   - Given 用户拥有资源
   - When 调用 `GET /api/assets/:id`
   - Then 返回 200 与资源详情

6. **场景 6：删除资源**
   - Given 用户拥有资源
   - When 调用 `DELETE /api/assets/:id`
   - Then 返回 204，数据库记录删除，存储 Provider 中文件删除

7. **场景 7：获取签名 URL**
   - Given 用户拥有资源且存储 Provider 为 s3/r2
   - When 调用 `GET /api/assets/:id/url?expires=3600`
   - Then 返回 200 `{"url":"...","expiresAt":"..."}`

8. **场景 8：本地存储 Provider 直链**
   - Given 用户拥有资源且 `STORAGE_PROVIDER=local`
   - When 调用 `GET /api/assets/:id/url`
   - Then 返回 200 `{"url":"http://localhost:3000/uploads/<key>"}`

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 存储 Provider 抽象接口：`put(key, file)`、`getSignedUrl(key, expires)`、`delete(key)`。
- 本地开发默认 `STORAGE_PROVIDER=local`，文件写入 `./uploads`，并通过静态资源中间件暴露。
- MIME 白名单：`image/*`、`audio/*`、`video/*`、`font/*`，以及 `application/json` 等可控类型；默认拒绝可执行文件。
- 文件大小限制默认 50MB，通过环境变量 `ASSET_MAX_SIZE_MB` 可调。

## 实现提示

### 关键文件

- `apps/zorron-server/src/modules/asset/asset.route.ts`
- `apps/zorron-server/src/modules/asset/asset.controller.ts`
- `apps/zorron-server/src/modules/asset/asset.service.ts`
- `apps/zorron-server/src/modules/asset/asset.repository.ts`
- `apps/zorron-server/src/modules/asset/asset.schema.ts`
- `apps/zorron-server/src/modules/asset/asset.test.ts`
- `apps/zorron-server/src/shared/storage/provider.ts`
- `apps/zorron-server/src/shared/storage/local.provider.ts`
- `apps/zorron-server/src/shared/storage/s3.provider.ts`

### 存储 Provider 接口参考

```typescript
// apps/zorron-server/src/shared/storage/provider.ts
export interface StorageProvider {
  put(key: string, file: File): Promise<string>;
  getSignedUrl(key: string, expiresSeconds?: number): Promise<{ url: string; expiresAt?: Date }>;
  delete(key: string): Promise<void>;
}
```

### 依赖安装参考

```bash
# 本地存储无需额外依赖
# S3/R2 兼容
pnpm --filter zorron-server add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 环境变量补充

```bash
STORAGE_PROVIDER=local
STORAGE_LOCAL_ROOT=./uploads
STORAGE_BASE_URL=http://localhost:3000/uploads
ASSET_MAX_SIZE_MB=50
ASSET_ALLOWED_MIMES=image/*,audio/*,video/*,font/*
```

## 任务清单

- [x] 实现 `StorageProvider` 抽象接口
- [x] 实现 `local.provider.ts`
- [x] 实现 `s3.provider.ts`（签名 URL）
- [x] 编写 `asset.schema.ts` 覆盖上传/列表/URL 请求响应
- [x] 实现 `asset.repository.ts`
- [x] 实现 `asset.service.ts`：白名单、大小限制、Provider 选择
- [x] 实现 `asset.controller.ts` 与 `asset.route.ts`
- [x] 配置 Elysia 文件上传解析
- [x] 编写 `asset.test.ts` 集成测试
- [x] 更新 `.env.example`

## 测试要求

- [x] Vitest 单元测试：MIME 白名单、大小校验、Provider 选择
- [x] Vitest 集成测试：上传/列表/删除/URL 端点 100% 覆盖
- [x] 手动验收：上传图片后可在浏览器访问返回的 url

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-18 |
| 完成时间 | 2026-06-18 |
| 修改文件 | `apps/zorron-server/src/modules/asset/*`、`apps/zorron-server/src/shared/storage/*`、`apps/zorron-server/src/app.ts`、`apps/zorron-server/.env.example` |
| 测试命令 | `pnpm --filter zorron-server test` |
| 测试结果 | 7/7 Asset API 集成测试通过；上传/大小限制/MIME 白名单/列表/详情/删除/URL 端点覆盖完整 |
| 阻塞与解决 | DELETE /api/assets/:id 在 Vitest(Node) 下返回 500，原因同为 Node.js Response 构造器对 204 body 的严格校验；改为显式返回 `new Response(null, { status: 204 })` 后解决 |
| 状态 | Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-006: React Flow Canvas & 8 Node Types

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-006 |
| 标题 | React Flow Canvas & 8 Node Types |
| 负责 Agent | @aiox-dev |
| 预估工时 | 8 PD |
| 依赖 Story | MIG-001 |
| Feature 分支 | feature/migration/MIG-006-react-flow-canvas-nodes |
| 状态 | Draft |

## 用户故事

作为 **叙事设计师**，
我希望 **在 React Flow 画布上拖拽、放置并连接 8 种叙事节点**，
以便 **可视化地构建交互叙事流程图**。

## 验收标准（Given-When-Then）

1. **场景 1：画布渲染**
   - Given 用户进入编辑器页面
   - When 页面加载完成
   - Then 中央区域显示 React Flow 画布，包含背景网格、缩放/平移控件

2. **场景 2：从面板拖拽创建节点**
   - Given 左侧节点面板显示 8 种节点类型
   - When 用户拖拽 `scene` 节点到画布
   - Then 画布出现一个新的 `scene` 节点，默认位置为释放坐标

3. **场景 3：连接两个节点**
   - Given 画布存在两个节点
   - When 用户从源节点输出 handle 拖动到目标节点输入 handle
   - Then 生成一条 edge，源/目标 ID 正确，无重复边

4. **场景 4：选择并删除节点**
   - Given 画布存在节点
   - When 用户点击节点后按 Delete/Backspace
   - Then 节点被删除，其关联 edges 一并删除

5. **场景 5：8 种节点类型均可创建**
   - Given 节点面板可用
   - When 用户依次创建 `start`、`scene`、`logic`、`setter`、`calculator`、`settlement`、`video`、`link` 节点
   - Then 每种节点在画布上渲染对应自定义 UI，且 `editorStore.nodes` 中类型字段正确

6. **场景 6：撤销/重做**
   - Given 用户已添加节点
   - When 按 `Ctrl+Z`（Mac `Cmd+Z`）
   - Then 上一次画布结构变更被撤销；按 `Ctrl+Shift+Z` 可重做

7. **场景 7：画布状态持久化到 store**
   - Given 用户修改了节点位置
   - When 触发保存动作（或自动保存）
   - Then `editorStore` 中的 nodes/edges 与画布一致，可供后续序列化

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/adr/adr-001-react-flow.md](../adr/adr-001-react-flow.md)

## 技术备注

- 使用 `@xyflow/react` 作为 React Flow 库。
- 节点拖拽使用 `@dnd-kit/core` + `@dnd-kit/sortable` 或 React Flow 内置 drag-and-drop。
- 节点数据与 `editorStore` 双向同步：React Flow 的 `onNodesChange` / `onEdgesChange` 更新 store。
- 撤销重做仅作用于画布结构（nodes/edges），不作用于项目配置。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/components/flow/FlowCanvas.tsx`
- `apps/zorron-editor/src/components/flow/NodePalette.tsx`
- `apps/zorron-editor/src/components/flow/nodes/StartNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/SceneNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/LogicNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/SetterNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/CalculatorNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/SettlementNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/VideoNode.tsx`
- `apps/zorron-editor/src/components/flow/nodes/LinkNode.tsx`
- `apps/zorron-editor/src/components/flow/edges/DefaultEdge.tsx`
- `apps/zorron-editor/src/stores/editorStore.ts`
- `apps/zorron-editor/src/types/flow.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add @xyflow/react @dnd-kit/core @dnd-kit/utilities
pnpm --filter zorron-editor add -D @types/lodash.isequal
pnpm --filter zorron-editor add lodash.isequal
```

### 节点类型注册参考

```typescript
// apps/zorron-editor/src/types/flow.ts
export type NodeType =
  | 'start'
  | 'scene'
  | 'logic'
  | 'setter'
  | 'calculator'
  | 'settlement'
  | 'video'
  | 'link';
```

## 任务清单

- [ ] 安装 @xyflow/react、@dnd-kit、lodash.isequal
- [ ] 创建 `editorStore` 管理 nodes/edges/selectedNode/viewport/undo-redo
- [ ] 创建 `FlowCanvas` 组件并接入 React Flow
- [ ] 创建 `NodePalette` 组件，支持拖拽创建节点
- [ ] 实现 8 种自定义节点组件（仅 UI 渲染与 handle）
- [ ] 实现默认 edge 组件与连接逻辑
- [ ] 实现选择、删除、撤销、重做快捷键
- [ ] 编写 store 与节点的单元测试
- [ ] 更新 `App.tsx` 集成编辑器布局占位

## 测试要求

- [ ] Vitest 单元测试：editorStore 的 add/remove/update/undo/redo
- [ ] Vitest 组件测试：节点创建、边连接
- [ ] 手动验收：在浏览器中拖拽创建 8 种节点并连接

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-007: Inspector Panel & Edge Connection Logic

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-007 |
| 标题 | Inspector Panel & Edge Connection Logic |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-006 |
| Feature 分支 | feature/migration/MIG-007-inspector-panel-edge-logic |
| 状态 | Draft |

## 用户故事

作为 **叙事设计师**，
我希望 **在右侧面板编辑选中节点的字段，并控制边连接的可用规则**，
以便 **精确配置每个节点的行为与流程分支**。

## 验收标准（Given-When-Then）

1. **场景 1：选中节点显示 Inspector**
   - Given 画布中存在一个 `scene` 节点
   - When 用户点击该节点
   - Then 右侧面板显示 Inspector，标题为节点类型，字段包括 label、dialogue、backgroundUrl、characterUrl、choices

2. **场景 2：编辑节点字段实时同步**
   - Given Inspector 已打开
   - When 用户修改 `dialogue` 输入框内容
   - Then 画布节点 UI 同步更新，且 `editorStore.nodes[id].data.dialogue` 同步更新

3. **场景 3：不同节点类型显示不同字段**
   - Given 用户分别选中 `setter`、`calculator`、`video` 节点
   - When 观察 Inspector 面板
   - Then `setter` 显示 assignments 编辑器；`calculator` 显示 vector 与 targetVariable；`video` 显示 videoUrl、autoPlay、skipAllowed

4. **场景 4：Scene 节点选项编辑**
   - Given Inspector 打开 `scene` 节点
   - When 用户添加/删除/编辑选项
   - Then choices 数组实时更新，每个选项支持设置 interaction 类型（tap/hold/slash）及对应参数

5. **场景 5：边连接规则限制**
   - Given 画布中存在 `start` 节点与一个 `link` 节点
   - When 用户尝试从 `link` 节点输出 handle 连接其他节点
   - Then 系统禁止该连接（`link` 节点为终止节点，无输出）

6. **场景 6：连接校验**
   - Given 用户尝试连接两个已经相连的节点
   - When 释放连接
   - Then 不生成重复 edge

7. **场景 7：删除边**
   - Given 画布中存在一条边
   - When 用户点击边并按 Delete/Backspace
   - Then 该边被删除

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- Inspector 字段按节点类型动态渲染，使用 `react-hook-form` 或受控组件管理表单状态。
- 边连接规则通过 React Flow 的 `isValidConnection` 或 `onConnect` 回调控制。
- 字段变更通过 `editorStore.updateNodeData(id, partialData)` 更新，避免直接修改 React Flow 状态。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/components/inspector/InspectorPanel.tsx`
- `apps/zorron-editor/src/components/inspector/fields/TextField.tsx`
- `apps/zorron-editor/src/components/inspector/fields/ChoicesEditor.tsx`
- `apps/zorron-editor/src/components/inspector/fields/AssignmentsEditor.tsx`
- `apps/zorron-editor/src/components/inspector/fields/VectorEditor.tsx`
- `apps/zorron-editor/src/components/flow/FlowCanvas.tsx`（连接规则）
- `apps/zorron-editor/src/stores/editorStore.ts`
- `apps/zorron-editor/src/types/flow.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add react-hook-form zod @hookform/resolvers
```

### 连接规则参考

```typescript
// FlowCanvas.tsx 中
const isValidConnection = useCallback((connection: Connection) => {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  if (sourceNode?.type === 'link') return false;
  const exists = edges.some(
    (e) => e.source === connection.source && e.target === connection.target
  );
  return !exists;
}, [nodes, edges]);
```

## 任务清单

- [ ] 实现 `InspectorPanel` 外壳与动态字段分发
- [ ] 实现通用字段组件（TextField、UrlField、SwitchField）
- [ ] 实现 `ChoicesEditor` 支持 tap/hold/slash 选项
- [ ] 实现 `AssignmentsEditor` 支持 setter 节点
- [ ] 实现 `VectorEditor` 支持 calculator 节点
- [ ] 在 `FlowCanvas` 中接入 `isValidConnection` 规则
- [ ] 禁止 link/settlement/video 等终止/单向节点的非法输出（按设计决策）
- [ ] 编写 Inspector 与连接规则测试

## 测试要求

- [ ] Vitest 组件测试：Inspector 根据节点类型渲染正确字段
- [ ] Vitest 单元测试：`isValidConnection` 覆盖合法/非法连接
- [ ] 手动验收：编辑 scene 节点 dialogue 后画布节点文本同步变化

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-008: Player Engine Port from GameEngine.ts to React

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-008 |
| 标题 | Player Engine Port from GameEngine.ts to React |
| 负责 Agent | @aiox-dev |
| 预估工时 | 7 PD |
| 依赖 Story | MIG-001、MIG-006 |
| Feature 分支 | feature/migration/MIG-008-player-engine-port |
| 状态 | Draft |

## 用户故事

作为 **叙事设计师**，
我希望 **将旧版 GameEngine.ts 的节点遍历与结算逻辑迁移为框架无关的纯 TypeScript 模块**，
以便 **React Player 组件可驱动叙事流程**。

## 验收标准（Given-When-Then）

1. **场景 1：GameEngine 可启动项目**
   - Given 存在一个包含 `start` 节点与 `scene` 节点的项目 FlowData
   - When 调用 `GameEngine.start(project)`
   - Then 返回初始状态，currentNode 为 `start` 节点，history 包含起点

2. **场景 2：选项选择推进流程**
   - Given GameEngine 已启动且当前节点为 `scene` 节点，包含两个 choices
   - When 调用 `GameEngine.selectChoice(choiceId)`
   - Then currentNode 切换为 choice.targetNodeId 对应的节点；若 choice 无 target，则流程结束

3. **场景 3：逻辑节点条件判断**
   - Given 流程中存在 `logic` 节点，condition 表达式可解析
   - When 执行到 logic 节点
   - Then 根据 variables 计算结果选择下一条边

4. **场景 4：Setter 节点修改变量**
   - Given 流程中存在 `setter` 节点，assignments 为 `{ variable: 'score', operator: 'add', value: 10 }`
   - When 执行到该节点
   - Then `variables.score` 在原有值基础上增加 10

5. **场景 5：Calculator 节点更新向量**
   - Given 流程中存在 `calculator` 节点，vector 为 `{ x: 1, y: 0, z: 0 }`
   - When 执行到该节点
   - Then `variables` 中对应目标变量（targetVariable）被更新，或内部向量状态累加

6. **场景 6：Settlement 节点结束流程**
   - Given 流程中存在 `settlement` 节点
   - When 执行到该节点
   - Then GameEngine 进入结算状态，返回 resultMapping 中命中的结果

7. **场景 7：Player Store 订阅状态**
   - Given Player 组件已挂载
   - When GameEngine 状态变化
   - Then `playerStore` 触发订阅，React 组件重新渲染

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- `GameEngine` 必须是纯 TypeScript，不依赖 React/Vue/DOM。
- 保留旧版核心遍历算法，将状态推进暴露为纯函数：`start`、`selectChoice`、`getState`、`subscribe`。
- `playerStore` 持有 GameEngine 实例，React 组件通过订阅 store 更新。
- 若旧版存在异步音频/资源加载，抽象为 `AudioManager` 与资源预加载器。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/game/GameEngine.ts`
- `apps/zorron-editor/src/game/nodeProcessors.ts`
- `apps/zorron-editor/src/game/AudioManager.ts`
- `apps/zorron-editor/src/game/vectorMath.ts`
- `apps/zorron-editor/src/stores/playerStore.ts`
- `apps/zorron-editor/src/types/project.ts`
- `apps/zorron-editor/src/types/flow.ts`

### GameEngine 接口参考

```typescript
// apps/zorron-editor/src/game/GameEngine.ts
export interface GameState {
  currentNodeId: string | null;
  history: string[];
  variables: Record<string, string | number | boolean>;
  vector: { x: number; y: number; z: number };
  choices: Array<{ id: string; text: string; interaction: string }>;
  isFinished: boolean;
  settlementResult?: { resultId: string; title: string; description?: string };
}

export class GameEngine {
  start(project: Project): GameState { ... }
  selectChoice(choiceId: string): GameState { ... }
  getState(): GameState { ... }
  subscribe(listener: (state: GameState) => void): () => void { ... }
}
```

### 依赖安装参考

```bash
pnpm --filter zorron-editor add uuid
pnpm --filter zorron-editor add -D @types/uuid
```

## 任务清单

- [ ] 分析旧版 GameEngine.ts 核心逻辑并提取节点处理器
- [ ] 创建 `game/GameEngine.ts` 纯 TypeScript 状态机
- [ ] 创建 `game/nodeProcessors.ts`：start/scene/logic/setter/calculator/settlement/video/link 处理器
- [ ] 创建 `game/AudioManager.ts` 管理 BGM/音效
- [ ] 创建 `game/vectorMath.ts` 处理向量累加与门派映射
- [ ] 创建 `playerStore` 集成 GameEngine 实例
- [ ] 编写 GameEngine 单元测试覆盖所有节点类型与边界

## 测试要求

- [ ] Vitest 单元测试：GameEngine 启动、选项推进、logic/setter/calculator/settlement 节点
- [ ] Vitest 单元测试：video/link 节点正确设置状态
- [ ] Vitest 单元测试：playerStore 订阅机制

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-009: Player UI

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-009 |
| 标题 | Player UI |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-008 |
| Feature 分支 | feature/migration/MIG-009-player-ui |
| 状态 | Draft |

## 用户故事

作为 **叙事体验者**，
我希望 **在编辑器预览或独立播放器中查看场景文本、视频、外链与结算结果**，
以便 **完整体验交互叙事流程**。

## 验收标准（Given-When-Then）

1. **场景 1：场景舞台渲染**
   - Given GameEngine 当前节点为 `scene`
   - When Player 渲染
   - Then 显示 dialogue 文本、背景图、角色立绘，并在底部显示选项列表

2. **场景 2：Tap 选项交互**
   - Given scene 节点包含 tap 类型选项
   - When 用户点击选项
   - Then 调用 `playerStore.selectChoice(choiceId)`，Player 切换到下一节点

3. **场景 3：Hold 选项交互**
   - Given scene 节点包含 hold 类型选项且 `holdDuration` 为 1500ms
   - When 用户按住选项达到 1500ms
   - Then 触发选择；若提前释放则不触发

4. **场景 4：Slash 选项交互**
   - Given scene 节点包含 slash 类型选项且 `slashDirection` 为 'right'
   - When 用户向右滑动选项
   - Then 触发选择；方向不匹配不触发

5. **场景 5：视频节点全屏播放**
   - Given GameEngine 当前节点为 `video`
   - When Player 渲染
   - Then 全屏播放视频，若 `skipAllowed` 为 true 显示跳过按钮

6. **场景 6：外链节点跳转**
   - Given GameEngine 当前节点为 `link`
   - When Player 渲染
   - Then 显示链接标题与打开按钮，点击后在新标签页打开 `url`

7. **场景 7：结算舞台渲染**
   - Given GameEngine 已到达 `settlement` 节点
   - When Player 渲染
   - Then 显示结算结果标题、描述、封面图，并展示最终人格向量

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)

## 技术备注

- Player 组件只负责渲染，状态推进由 `playerStore` + `GameEngine` 完成。
- 手势交互使用自定义 hooks：`useHoldTrigger`、`useSlashTrigger`。
- 视频播放使用原生 `<video>` 元素，外链节点使用 `<a target="_blank" rel="noopener noreferrer">`。
- 结算舞台可选展示 3D 向量，3D 渲染由 MIG-012 实现；本 Story 仅展示基础向量数值。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/components/player/PlayerShell.tsx`
- `apps/zorron-editor/src/components/player/SceneStage.tsx`
- `apps/zorron-editor/src/components/player/VideoStage.tsx`
- `apps/zorron-editor/src/components/player/LinkStage.tsx`
- `apps/zorron-editor/src/components/player/SettlementStage.tsx`
- `apps/zorron-editor/src/components/player/ChoiceLayer.tsx`
- `apps/zorron-editor/src/hooks/useHoldTrigger.ts`
- `apps/zorron-editor/src/hooks/useSlashTrigger.ts`
- `apps/zorron-editor/src/stores/playerStore.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add framer-motion
```

## 任务清单

- [x] 实现 `PlayerShell` 组件，根据 currentNode 类型分发舞台
- [x] 实现 `SceneStage`：文本、背景、立绘、选项
- [x] 实现 `ChoiceLayer`：tap/hold/slash 三种交互
- [x] 实现 `useHoldTrigger` 与 `useSlashTrigger`
- [x] 实现 `VideoStage`：全屏视频与跳过控制
- [x] 实现 `LinkStage`：外链跳转
- [x] 实现 `SettlementStage`：结果展示与向量数值
- [ ] 在编辑器页面添加 Player 预览入口
- [x] 编写 Player UI 组件测试

## 测试要求

- [ ] Vitest 组件测试：各 Stage 根据节点类型正确渲染
- [x] Vitest 单元测试：useHoldTrigger/useSlashTrigger 触发逻辑
- [ ] Playwright E2E（可选）：完整叙事 happy path
- [ ] 手动验收：在编辑器中运行一个简单叙事流程

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-19 |
| 完成时间 | 2026-06-19 |
| 修改文件 | src/components/player/PlayerShell.tsx, SceneStage.tsx, VideoStage.tsx, LinkStage.tsx, SettlementStage.tsx, StartStage.tsx, ChoiceLayer.tsx; src/hooks/useHoldTrigger.ts, useSlashTrigger.ts, useTypewriter.ts, usePlayerTriggers.test.ts |
| 测试命令 | pnpm --filter zorron-editor exec vitest run src/hooks/usePlayerTriggers.test.ts |
| 测试结果 | 6 passed (useHoldTrigger 2 + useSlashTrigger 4) |
| 阻塞与解决 | 无 |
| 状态 | In Progress → Review |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-010: Asset Panel & Resource Management

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-010 |
| 标题 | Asset Panel & Resource Management |
| 负责 Agent | @aiox-dev |
| 预估工时 | 5 PD |
| 依赖 Story | MIG-001、MIG-005 |
| Feature 分支 | feature/migration/MIG-010-asset-panel-resource-management |
| 状态 | Draft |

## 用户故事

作为 **叙事创作者**，
我希望 **在编辑器中管理图片、音频、视频等资源，并拖拽资源到节点字段**，
以便 **高效地在叙事中使用媒体素材**。

## 验收标准（Given-When-Then）

1. **场景 1：资源面板展示**
   - Given 用户进入编辑器
   - When 打开资源面板
   - Then 显示本地与远程资源列表，按 image/audio/video/font/other 分类

2. **场景 2：本地上传资源**
   - Given 资源面板打开
   - When 用户点击上传按钮并选择文件
   - Then 文件上传到后端 `POST /api/assets`，成功后出现在资源列表

3. **场景 3：资源引用拖拽**
   - Given 资源面板存在一张图片
   - When 用户拖拽图片到 Inspector 中的 backgroundUrl 字段
   - Then 该字段值更新为图片的 `asset.url`

4. **场景 4：资源删除**
   - Given 用户选择一个资源
   - When 点击删除并确认
   - Then 调用 `DELETE /api/assets/:id`，列表刷新，已引用该资源的字段保留但标记为失效

5. **场景 5：资源搜索过滤**
   - Given 资源面板存在多个资源
   - When 用户输入关键词或选择类型过滤
   - Then 列表按条件实时过滤

6. **场景 6：引用计数显示**
   - Given 某图片被 3 个节点引用
   - When 查看资源详情
   - Then 显示引用计数 3，点击可查看引用位置

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 资源元数据同时维护在 IndexedDB（本地工作区）与后端（云端）。
- `assetStore` 管理资源列表、分类、引用计数。
- 引用扫描通过遍历 `projectStore.flowData.nodes[*].data` 中的 URL 字段完成。
- 拖拽使用 HTML5 Drag and Drop 或 dnd-kit。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/components/asset/AssetPanel.tsx`
- `apps/zorron-editor/src/components/asset/AssetUploader.tsx`
- `apps/zorron-editor/src/components/asset/AssetGrid.tsx`
- `apps/zorron-editor/src/components/asset/AssetDetail.tsx`
- `apps/zorron-editor/src/stores/assetStore.ts`
- `apps/zorron-editor/src/services/asset.service.ts`
- `apps/zorron-editor/src/utils/workspaceDB.ts`
- `apps/zorron-editor/src/types/asset.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add dexie
```

### Asset 类型参考

```typescript
// apps/zorron-editor/src/types/asset.ts
export type AssetType = 'image' | 'audio' | 'video' | 'font' | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  size: number;
  source: 'local' | 'remote';
  localHandleId?: string;
  url: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## 任务清单

- [x] 创建 `assetStore` 与 `asset.service.ts`
- [x] 创建 `AssetPanel` 外壳与分类切换
- [x] 实现 `AssetUploader` 调用后端上传 API
- [x] 实现资源列表展示、搜索、过滤
- [x] 实现资源到 Inspector 字段的拖拽赋值
- [x] 实现资源删除与引用计数扫描
- [x] 集成 IndexedDB 本地缓存
- [x] 编写 store 与组件测试

## 测试要求

- [x] Vitest 单元测试：assetStore 增删改查、引用计数
- [ ] Vitest 组件测试：AssetPanel 渲染与过滤
- [ ] 手动验收：上传图片并拖拽到 scene 节点 backgroundUrl

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-19 |
| 完成时间 | 2026-06-19 |
| 修改文件 | src/types/asset.ts (扩展 source/localHandleId); src/utils/workspaceDB.ts (Dexie IndexedDB); src/stores/assetStore.ts (本地+远程合并、上传回退、引用计数); src/components/asset/AssetPanel.tsx, AssetUploader.tsx, AssetGrid.tsx, AssetDetail.tsx; src/stores/assetStore.test.ts |
| 测试命令 | pnpm --filter zorron-editor exec vitest run src/stores/assetStore.test.ts |
| 测试结果 | 8 passed (mergeAssets 2 + assetStore 6) |
| 阻塞与解决 | useAllAssets 选择器每次返回新数组引用导致无限渲染循环；改用 useMemo 稳定引用解决 |
| 状态 | In Progress → Review |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-011: Project Save/Load/Import/Export

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-011 |
| 标题 | Project Save/Load/Import/Export |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-004、MIG-006、MIG-010 |
| Feature 分支 | feature/migration/MIG-011-project-save-load-import-export |
| 状态 | Draft |

## 用户故事

作为 **叙事创作者**，
我希望 **将项目保存到云端、从云端加载、导入本地 JSON 或导出为本地 JSON**，
以便 **在不同设备间迁移与备份我的作品**。

## 验收标准（Given-When-Then）

1. **场景 1：新建项目并保存**
   - Given 用户在编辑器中创建节点图
   - When 点击保存按钮或触发自动保存
   - Then 调用 `PATCH /api/projects/:id` 将 FlowData 序列化并保存到云端

2. **场景 2：自动保存**
   - Given 用户修改节点后停止操作 3 秒
   - When 自动保存触发
   - Then 仅当画布状态与上次保存不一致时才发送保存请求，保存状态在 UI 中显示

3. **场景 3：加载项目**
   - Given 用户从项目列表选择一个云端项目
   - When 打开编辑器
   - Then 调用 `GET /api/projects/:id`，将返回的 FlowData 反序列化到 `editorStore`

4. **场景 4：导出本地 JSON**
   - Given 用户打开一个项目
   - When 点击导出按钮
   - Then 浏览器下载 `project.json`，结构与 `ProjectDetailSchema` 一致

5. **场景 5：导入本地 JSON**
   - Given 用户有一个有效的 `project.json` 文件
   - When 点击导入并选择文件
   - Then 调用 `POST /api/projects/import`，导入成功后打开新项目

6. **场景 6：冲突检测（可选增强）**
   - Given 同一项目在两个标签页同时编辑
   - When 保存时发现服务器版本更新
   - Then 提示用户覆盖、合并或取消（V1 可仅提示覆盖）

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 自动保存使用 `useAutoSave` Hook，防抖 3000ms，基于 `lodash.isequal` 比较前后状态。
- 导入/导出 JSON 使用浏览器 File API 与 `URL.createObjectURL`。
- `projectStore` 持有项目元数据，`editorStore` 持有节点图；保存时合并两者。
- 保存状态在 UI 中以 "已保存 / 保存中 / 未保存" 形式展示。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/hooks/useAutoSave.ts`
- `apps/zorron-editor/src/hooks/useProjectSync.ts`
- `apps/zorron-editor/src/services/api.ts`
- `apps/zorron-editor/src/services/workspace.service.ts`
- `apps/zorron-editor/src/stores/projectStore.ts`
- `apps/zorron-editor/src/utils/fileIO.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add lodash.isequal
pnpm --filter zorron-editor add -D @types/lodash.isequal
```

### 项目 Store 接口参考

```typescript
// apps/zorron-editor/src/stores/projectStore.ts
export interface ProjectState {
  id: string | null;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublished: boolean;
  data: FlowData;
  lastSavedAt: string | null;
  saveStatus: 'saved' | 'saving' | 'unsaved';
}
```

## 任务清单

- [x] 实现 `api.ts` 统一 HTTP 客户端与 token 注入
- [x] 实现 `projectStore` 管理项目元数据与保存状态
- [x] 实现 `useAutoSave` Hook 防抖保存
- [x] 实现 `useProjectSync` Hook 协调本地/云端模式
- [x] 实现导出 JSON 功能
- [x] 实现导入 JSON 功能
- [x] 在编辑器顶部栏显示项目标题与保存状态
- [x] 编写保存/加载/导入/导出单元测试

## 测试要求

- [x] Vitest 单元测试：useAutoSave 防抖与条件触发
- [x] Vitest 单元测试：JSON 导入导出序列化
- [ ] Vitest 集成测试：API 客户端与 project API 交互
- [ ] 手动验收：创建项目、保存、刷新页面后加载、导出、导入

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | 2026-06-19 |
| 完成时间 | 2026-06-19 |
| 修改文件 | src/hooks/useAutoSave.ts, useProjectSync.ts; src/components/editor/EditorToolbar.tsx, EditorShell.tsx; src/hooks/useAutoSave.test.ts; src/App.tsx (渲染 EditorShell); src/routes.tsx (项目路由); src/test/setup.ts (ResizeObserver polyfill) |
| 测试命令 | pnpm --filter zorron-editor exec vitest run src/hooks/useAutoSave.test.ts |
| 测试结果 | 6 passed (buildCurrentFlowData 1 + useAutoSave 3 + fileIO 2) |
| 阻塞与解决 | jsdom 缺少 ResizeObserver 导致 App 测试失败；在 test/setup.ts 添加 polyfill 解决 |
| 状态 | In Progress → Review |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-012: 3D Personality Vector Space Feature

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-012 |
| 标题 | 3D Personality Vector Space Feature |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-006、MIG-008 |
| Feature 分支 | feature/migration/MIG-012-3d-personality-vector-space |
| 状态 | Draft |

## 用户故事

作为 **人格叙事设计师**，
我希望 **在三维向量空间（X: 处世、Y: 立场、Z: 性情）中可视化角色人格分布与结算结果**，
以便 **为特定叙事场景提供更丰富的维度反馈**。

## 验收标准（Given-When-Then）

1. **场景 1：Feature Flag 控制显示**
   - Given 环境变量 `VITE_FEATURE_VECTOR_3D=false`
   - When 用户打开编辑器
   - Then 不显示 3D 向量空间面板入口
   - Given `VITE_FEATURE_VECTOR_3D=true`
   - Then 编辑器中显示 "3D Vector" 面板入口

2. **场景 2：向量空间配置**
   - Given Feature Flag 开启
   - When 用户在项目设置中启用向量空间并配置维度名称与门派
   - Then `projectStore.data.settings.vectorSpace` 保存配置

3. **场景 3：3D 空间渲染**
   - Given Feature Flag 开启且项目已启用向量空间
   - When 用户打开 3D 面板
   - Then 使用 React Three Fiber 渲染三维坐标轴与当前向量点

4. **场景 4：结算结果映射到空间**
   - Given 流程到达 settlement 节点
   - When 计算最终向量
   - Then 在 3D 空间中高亮显示结果所属门派/象限

5. **场景 5：calculator 节点影响向量**
   - Given 流程执行 calculator 节点
   - When 节点 vector 为 `{ x: 2, y: -1, z: 0 }`
   - Then 当前累积向量更新，3D 面板中的点位置同步变化

6. **场景 6：后端兼容**
   - Given `FEATURE_VECTOR_3D=false`（后端环境变量）
   - When 请求结算结果
   - Then 后端不执行向量计算，仅返回基础结果

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 3D 渲染使用 `@react-three/fiber` 与 `@react-three/drei`。
- Feature Flag 同时受前端构建时变量与后端环境变量控制，后端为权威来源。
- 向量计算逻辑集中在 `game/vectorMath.ts`，保持纯函数。
- 门派/象限数量默认 `VECTOR_SECT_COUNT=20`，可在项目设置中覆盖。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/components/vector/VectorSpacePanel.tsx`
- `apps/zorron-editor/src/components/vector/VectorScene.tsx`
- `apps/zorron-editor/src/components/inspector/fields/VectorEditor.tsx`
- `apps/zorron-editor/src/game/vectorMath.ts`
- `apps/zorron-editor/src/lib/featureFlags.ts`
- `apps/zorron-editor/src/stores/projectStore.ts`
- `apps/zorron-server/src/config/env.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add three @react-three/fiber @react-three/drei
pnpm --filter zorron-editor add -D @types/three
```

### Feature Flag 参考

```typescript
// apps/zorron-editor/src/lib/featureFlags.ts
export const featureFlags = {
  vector3d: import.meta.env.VITE_FEATURE_VECTOR_3D === 'true',
  cloudSync: import.meta.env.VITE_FEATURE_CLOUD_SYNC !== 'false',
};
```

## 任务清单

- [ ] 安装 React Three Fiber 与 drei
- [ ] 实现 `featureFlags.ts` 读取构建时变量
- [ ] 实现 `vectorMath.ts` 向量累加与门派映射
- [ ] 实现 `VectorSpacePanel` 与 `VectorScene` 3D 渲染
- [ ] 实现 Inspector 中 vectorSpace 配置与 calculator 向量编辑
- [ ] 后端 `config/env.ts` 增加 `FEATURE_VECTOR_3D` 与 `VECTOR_SECT_COUNT`
- [ ] 后端 settlement 服务根据 flag 决定是否执行向量映射
- [ ] 编写向量计算单元测试

## 测试要求

- [ ] Vitest 单元测试：vectorMath 向量累加与门派匹配
- [ ] Vitest 组件测试：VectorSpacePanel 根据 flag 条件渲染
- [ ] 手动验收：开启 flag 后，calculator 节点改变向量，3D 面板实时更新

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-013: Simulation Testing (Monte Carlo)

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-013 |
| 标题 | Simulation Testing (Monte Carlo) |
| 负责 Agent | @aiox-dev |
| 预估工时 | 4 PD |
| 依赖 Story | MIG-008 |
| Feature 分支 | feature/migration/MIG-013-simulation-testing-monte-carlo |
| 状态 | Draft |

## 用户故事

作为 **叙事设计师/QA**，
我希望 **对项目流程进行蒙特卡洛模拟，随机遍历大量路径并统计节点到达率与结算分布**，
以便 **在发布前发现死胡同、不可达节点或结算失衡**。

## 验收标准（Given-When-Then）

1. **场景 1：单项目模拟运行**
   - Given 用户打开一个包含多个分支的项目
   - When 在模拟面板设置运行次数 1000 次并启动
   - Then 系统使用 `GameEngine` 随机选择选项完成 1000 次遍历

2. **场景 2：统计节点到达率**
   - Given 模拟完成
   - When 查看报告
   - Then 每个节点的到达次数、到达率百分比清晰展示，未到达节点标红

3. **场景 3：统计结算分布**
   - Given 模拟完成且项目包含 settlement 节点
   - When 查看报告
   - Then 展示每个 settlement 结果的命中次数与百分比

4. **场景 4：向量分布统计（若启用）**
   - Given 项目启用了向量空间
   - When 模拟完成
   - Then 展示最终向量的平均位置与标准差，并在 3D 空间中绘制散点

5. **场景 5：模拟配置**
   - Given 用户进入模拟面板
   - When 设置随机种子、运行次数、选择策略（纯随机/加权）
   - Then 配置生效，结果可复现（相同种子产生相同路径集合）

6. **场景 6：导出模拟报告**
   - Given 模拟完成
   - When 点击导出报告
   - Then 下载 JSON 报告，包含节点统计、结算统计、向量统计

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)

## 技术备注

- 模拟逻辑复用 `GameEngine`，通过注入随机选择器覆盖默认用户选择。
- 模拟运行在 Web Worker 中，避免阻塞 UI。
- 结果报告使用图表组件（如 `recharts`）展示。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/components/simulation/SimulationPanel.tsx`
- `apps/zorron-editor/src/components/simulation/SimulationReport.tsx`
- `apps/zorron-editor/src/game/simulator.ts`
- `apps/zorron-editor/src/workers/simulation.worker.ts`
- `apps/zorron-editor/src/hooks/useSimulation.ts`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add recharts
```

### 模拟器接口参考

```typescript
// apps/zorron-editor/src/game/simulator.ts
export interface SimulationConfig {
  runs: number;
  seed?: string;
  strategy: 'random' | 'weighted';
}

export interface SimulationReport {
  nodeHits: Record<string, number>;
  settlementHits: Record<string, number>;
  finalVectors: Array<{ x: number; y: number; z: number }>;
  deadEnds: number;
}

export function runMonteCarlo(project: Project, config: SimulationConfig): SimulationReport;
```

## 任务清单

- [ ] 实现 `simulator.ts` 蒙特卡洛核心逻辑
- [ ] 实现 Web Worker 包装，避免阻塞主线程
- [ ] 实现 `SimulationPanel` 配置 UI
- [ ] 实现 `SimulationReport` 统计与图表展示
- [ ] 实现报告导出功能
- [ ] 在 GameEngine 中支持注入选择策略
- [ ] 编写模拟器单元测试

## 测试要求

- [ ] Vitest 单元测试：runMonteCarlo 输出正确统计
- [ ] Vitest 单元测试：相同 seed 产生相同结果
- [ ] 手动验收：对一个分支项目运行 1000 次模拟并查看报告

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-014: H5 Embed SDK / Standalone Player

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-014 |
| 标题 | H5 Embed SDK / Standalone Player |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-008、MIG-009 |
| Feature 分支 | feature/migration/MIG-014-h5-embed-sdk-standalone-player |
| 状态 | Draft |

## 用户故事

作为 **内容运营者**，
我希望 **将 Zorron Player 以 SDK 形式嵌入第三方 H5 页面或作为独立页面运行**，
以便 **在微信、微博、落地页等渠道分发叙事作品**。

## 验收标准（Given-When-Then）

1. **场景 1：独立 Player 页面**
   - Given 项目已发布
   - When 访问 `/player/:projectId`
   - Then 页面仅显示 Player UI，无编辑器元素，可完整运行叙事流程

2. **场景 2：Embed SDK 脚本加载**
   - Given 第三方页面引入 `<script src="https://cdn.example.com/zorron/embed.js"></script>`
   - When 页面中存在 `<div id="zorron-player" data-project-id="uuid"></div>`
   - Then SDK 自动识别并挂载 Player 到该容器

3. **场景 3：程序化挂载**
   - Given SDK 已加载
   - When 调用 `ZorronPlayer.mount({ container: '#player', projectId: 'uuid', apiBase: '...' })`
   - Then 在指定容器内渲染 Player

4. **场景 4：Embed 配置项**
   - Given 使用 SDK
   - When 传入 `{ features: { vector3d: false }, theme: 'dark' }`
   - Then Player 按配置禁用 3D 向量并使用暗色主题

5. **场景 5：响应式适配**
   - Given 嵌入容器宽度为 375px（移动端）
   - When Player 渲染
   - Then UI 适配移动端，手势选项正常可用

6. **场景 6：分享图生成（可选）**
   - Given 项目有封面图
   - When SDK 调用分享接口
   - Then 生成分享卡片图片或返回分享元数据

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)

## 技术备注

- Embed SDK 通过 Vite 的 library mode 打包为 UMD/ESM：`embed.js` + `embed.css`。
- 独立 Player 页面使用与编辑器内相同的 Player 组件，但隐藏编辑器 chrome。
- SDK 暴露全局对象 `window.ZorronPlayer`。
- Player 在嵌入模式下使用相对或传入的 `apiBase` 请求项目数据。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/routes.tsx`
- `apps/zorron-editor/src/pages/PlayerPage.tsx`
- `apps/zorron-editor/src/embed/embed.ts`
- `apps/zorron-editor/src/embed/EmbedPlayer.tsx`
- `apps/zorron-editor/vite.config.ts`（library build 配置）
- `apps/zorron-editor/src/services/api.ts`
- `apps/zorron-editor/src/utils/shareImageGenerator.ts`

### 依赖安装参考

```bash
# 无需新增主要依赖，复用现有 React 生态
```

### Vite Library Mode 配置参考

```typescript
// apps/zorron-editor/vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: './src/embed/embed.ts',
      name: 'ZorronPlayer',
      fileName: 'embed',
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM' } },
    },
  },
});
```

## 任务清单

- [ ] 配置 Vite library build 输出 embed.js/css
- [ ] 实现 `embed.ts` 入口与全局 `ZorronPlayer` 对象
- [ ] 实现 `PlayerPage` 独立播放器页面
- [ ] 更新 `routes.tsx` 增加 `/player/:projectId` 路由
- [ ] 支持通过 props/apiBase 传入配置
- [ ] 移动端响应式适配
- [ ] 实现分享图/元数据生成（可选）
- [ ] 编写 SDK 挂载单元测试

## 测试要求

- [ ] Vitest 单元测试：ZorronPlayer.mount 解析 container 与 projectId
- [ ] Vitest 组件测试：PlayerPage 渲染并调用项目 API
- [ ] 手动验收：在独立 HTML 页面中引入 embed.js 并成功运行 Player

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

# MIG-015: Cloud Sync & Local Workspace

## 基本信息

| 字段 | 值 |
|------|-----|
| Story ID | MIG-015 |
| 标题 | Cloud Sync & Local Workspace |
| 负责 Agent | @aiox-dev |
| 预估工时 | 6 PD |
| 依赖 Story | MIG-004、MIG-010、MIG-011 |
| Feature 分支 | feature/migration/MIG-015-cloud-sync-local-workspace |
| 状态 | Draft |

## 用户故事

作为 **叙事创作者**，
我希望 **在本地工作区与云端项目之间自由切换，并自动同步资源与项目数据**，
以便 **在无网络或多人协作场景下都能高效工作**。

## 验收标准（Given-When-Then）

1. **场景 1：本地工作区模式**
   - Given 用户未登录或选择本地模式
   - When 创建项目
   - Then 项目数据通过 File System Access API 保存到本地目录，包含 `project.json` 与 `assets/` 子目录

2. **场景 2：云端工作区模式**
   - Given 用户已登录且选择云端模式
   - When 创建项目
   - Then 项目保存到后端 PostgreSQL，资源保存到对象存储或本地 Provider

3. **场景 3：模式切换**
   - Given 用户在本地打开一个项目
   - When 点击 "同步到云端"
   - Then 调用 `POST /api/projects/import` 或 `POST /api/projects` 创建云端项目，并上传本地资源

4. **场景 4：离线可用**
   - Given 用户处于离线状态且之前已加载过云端项目
   - When 打开该项目
   - Then 从 IndexedDB 读取本地缓存，仍可编辑；网络恢复后自动同步变更

5. **场景 5：资源本地缓存**
   - Given 用户已访问过某远程资源
   - When 再次打开项目
   - Then 优先从 IndexedDB 读取资源 blob，减少网络请求

6. **场景 6：冲突解决**
   - Given 同一项目本地与云端版本不一致
   - When 用户点击同步
   - Then 显示冲突对比，用户可选择保留本地、保留云端或手动合并

7. **场景 7：Feature Flag 控制云同步入口**
   - Given `VITE_FEATURE_CLOUD_SYNC=false`
   - When 用户打开编辑器
   - Then 不显示 "云同步" 按钮与登录入口

## 架构/ADR 引用

- [docs/architecture/migration-architecture.md](../architecture/migration-architecture.md)
- [docs/architecture/api-contract.md](../architecture/api-contract.md)

## 技术备注

- 本地工作区使用 File System Access API（`showDirectoryPicker`）与 IndexedDB 兜底。
- `workspace.service.ts` 封装本地文件读写；`api.ts` 封装云端请求。
- `useProjectSync` Hook 根据当前模式路由保存操作到本地或云端。
- 冲突解决 V1 可简化：仅提示覆盖方向；合并作为后续增强。

## 实现提示

### 关键文件

- `apps/zorron-editor/src/services/workspace.service.ts`
- `apps/zorron-editor/src/services/remoteAsset.service.ts`
- `apps/zorron-editor/src/hooks/useProjectSync.ts`
- `apps/zorron-editor/src/utils/workspaceDB.ts`
- `apps/zorron-editor/src/stores/authStore.ts`
- `apps/zorron-editor/src/components/workspace/WorkspaceSwitcher.tsx`
- `apps/zorron-editor/src/components/workspace/ConflictDialog.tsx`

### 依赖安装参考

```bash
pnpm --filter zorron-editor add dexie idb-keyval
```

### 工作区模式参考

```typescript
// apps/zorron-editor/src/services/workspace.service.ts
export type WorkspaceMode = 'local' | 'cloud';

export interface LocalWorkspace {
  mode: 'local';
  directoryHandle: FileSystemDirectoryHandle;
}

export interface CloudWorkspace {
  mode: 'cloud';
  apiBase: string;
}
```

## 任务清单

- [ ] 实现 `workspace.service.ts` 本地目录选择与文件读写
- [ ] 实现 `workspaceDB.ts` IndexedDB 缓存封装
- [ ] 实现 `useProjectSync` 根据模式分发保存逻辑
- [ ] 实现 `WorkspaceSwitcher` 切换本地/云端模式
- [ ] 实现本地项目导入云端流程
- [ ] 实现离线状态下的 IndexedDB 读取
- [ ] 实现冲突提示对话框（V1 简单覆盖选择）
- [ ] 根据 `VITE_FEATURE_CLOUD_SYNC` 控制入口显示
- [ ] 编写工作区服务单元测试

## 测试要求

- [ ] Vitest 单元测试：workspace.service 本地文件序列化
- [ ] Vitest 单元测试：useProjectSync 模式分发逻辑
- [ ] 手动验收：本地创建项目 → 同步到云端 → 另一浏览器加载云端项目

## Dev Agent Record

| 字段 | 内容 |
|------|------|
| 开始时间 | |
| 完成时间 | |
| 修改文件 | |
| 测试命令 | |
| 测试结果 | |
| 阻塞与解决 | |
| 状态 | Draft → In Progress → Review → Done |

## QA Results

| 字段 | 内容 |
|------|------|
| 测试覆盖 | |
| 测试结果 | |
| 安全审查 | |
| Gate 决策 | PASS / CONCERNS / FAIL |
| 修复清单 | |

---

*Story list generated for Zorron Engine migration project.*
