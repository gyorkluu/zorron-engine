# ADR-002: 后端选用 ElysiaJS + Drizzle + PostgreSQL

## 状态

已接受 (Accepted)

## 背景

Zorron Engine 后端需要从 Koa 2 (CommonJS) / MongoDB / Mongoose 迁移到新栈。目标包括：

1. 运行时迁移到 Bun，获得更高的启动速度与请求吞吐量。
2. 代码全面 ESM 化，符合现代 Node.js/Bun 生态。
3. 输入校验统一为 Zod，前后端共享数据契约。
4. 数据库从 MongoDB 迁移到关系型数据库，以支持更严格的 schema、复杂查询和事务。
5. 保持后端 API 端点数量可控（初期约 15-25 个），同时预留扩展空间。

## 候选方案

### 后端框架

| 方案 | 说明 | 优势 | 劣势 |
|---|---|---|---|
| **ElysiaJS** | 面向 Bun 的类型安全 Web 框架 | 原生 TypeScript、Eden Treaty 类型化客户端、性能高、插件模型清晰 | 生态较新，部分中间件需自研 |
| **Hono** | 轻量跨运行时框架 | 极快、跨平台（Bun/Node/Deno/Workers） | 端点 >20 时 DI 与插件体系不如 Elysia 完善 |
| **NestJS** | 企业级 Node.js 框架 | 生态丰富、DI 成熟 | 体积大、Bun 兼容性需验证、与当前团队栈偏离 |
| **继续 Koa** | 维持现有 Koa 2 | 无需重写 | CommonJS、Bun 适配差、与现代类型安全栈脱节 |

### ORM / 数据库

| 方案 | 说明 | 优势 | 劣势 |
|---|---|---|---|
| **Drizzle + PostgreSQL** | 类型安全 SQL ORM | SQL-like API、Zod 友好、迁移工具 drizzle-kit 成熟、Bun 兼容 | 需手写复杂查询 |
| **Prisma + PostgreSQL** | 声明式 ORM | 生态大、生成类型强 | 体积大、Bun 运行时支持不完善、与 Drizzle 混用被禁止 |
| **TypeORM + PostgreSQL** | 装饰器 ORM | 功能全 | API 不稳定、Bun 兼容性一般 |
| **继续 Mongoose + MongoDB** | 维持现状 | 无需迁移数据 | 无严格 schema、事务弱、与目标关系型架构冲突 |

## 决策

后端采用 **ElysiaJS + Drizzle ORM + PostgreSQL**，运行时 **Bun**。

## 理由

### 1. ElysiaJS 作为后端框架

1. **Bun 原生优化**
   - ElysiaJS 针对 Bun 设计，启动快、吞吐高，与团队目标运行时一致。
   - 避免 Koa 的 CommonJS 包袱和 Bun 适配问题。

2. **类型安全端到端**
   - 通过 Eden Treaty 可从前端直接消费后端类型，减少 API 契约不同步风险。
   - 路由、中间件、`derive` 上下文均具备完整 TypeScript 推导。

3. **插件与依赖注入模型**
   - Elysia 的插件系统天然支持认证、限流、日志等横切关注点。
   - `derive` 机制可类型安全地注入 `user`、`logger`、`requestId`，替代 Koa 的 `ctx.state`。

4. **适合当前与未来的规模**
   - 端点数量预计在 15-25 之间，处于 Elysia 舒适区。
   - 若未来规模扩大，Elysia 插件体系仍可支撑。

### 2. Drizzle ORM 作为数据层

1. **SQL-like 类型安全**
   - Drizzle 的 API 贴近 SQL，便于优化查询、理解执行计划。
   - 严格 TypeScript 推导，避免 `any` 扩散。

2. **Zod 友好**
   - Drizzle schema 可与 Zod 轻松结合，作为前后端共享契约的基础。
   - 迁移脚本、API 校验可使用同一套类型定义。

3. **Bun 兼容与轻量化**
   - Drizzle 不依赖 Node.js 原生二进制，Bun 运行稳定。
   - 相比 Prisma，体积更小，构建产物更干净。

4. **统一 ORM 标准**
   - 按团队规范，全项目统一使用 Drizzle，禁止混用 Prisma。

### 3. PostgreSQL 作为数据库

1. **关系型数据适合项目结构**
   - `users`、`projects`、`assets` 之间存在清晰的外键关系，PostgreSQL 的完整性约束可降低数据异常。

2. **JSONB 支持动态节点数据**
   - 节点 `data` 字段结构多变，PostgreSQL JSONB 提供灵活的 schemaless 存储，同时支持索引与查询。

3. **事务与并发**
   - 项目保存、资源引用计数、用户权限检查需要 ACID 事务支持。

4. **成熟与托管便利**
   - PostgreSQL 16 是团队默认关系型主库，云厂商托管方案成熟。

## 影响

1. 后端代码需从 CommonJS 全面改为 ESM。
2. Mongoose Schema 需重写为 Drizzle 表定义。
3. 认证中间件从 Koa 洋葱模型改为 Elysia `derive` / 插件模型。
4. JWT 库从 `jsonwebtoken` 改为 `jose`，以更好支持 Bun/ESM。
5. 日志从 Winston 改为 pino，并注入 `requestId`。

## 未选方案原因

- **Hono**：虽轻量，但在依赖注入、复杂中间件链、类型化客户端方面不如 Elysia 适合企业级单体。
- **NestJS**：过于厚重，Bun 兼容性验证成本高，与「无聊但成熟」的务实选型原则偏离。
- **Prisma**：团队已明确禁止 Drizzle 与 Prisma 混用，且 Prisma 在 Bun 下的运行时支持不如 Drizzle 稳定。
- **继续 MongoDB**：关系型需求（外键、事务、复杂查询）无法被 MongoDB 高效满足。

## 相关决策

- [ADR-001: 节点编辑器选用 React Flow](./adr-001-react-flow.md)
