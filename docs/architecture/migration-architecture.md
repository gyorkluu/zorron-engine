# Zorron Engine 迁移架构设计

## 1. 愿景与范围

### 1.1 愿景

将 Zorron Engine 从「人格测试编辑器」演进为**通用交互叙事编辑器**。迁移后保留并强化以下核心域：

1. 8 种节点类型：`start`、`scene`、`logic`、`setter`、`calculator`、`settlement`、`video`、`link`。
2. 3D 人格向量空间（X: 处世，Y: 立场，Z: 性情），作为可选域能力。
3. Player Engine：节点遍历、选项选择、向量结算。
4. 资源管理：本地工作区 + 远程对象存储/CDN。
5. 项目保存 / 加载 / 云同步。

### 1.2 目标栈

| 层级 | 当前 | 目标 |
|---|---|---|
| 前端 | Vue 3 + Pinia + Vue Flow | React 18+ + Zustand + React Flow |
| 构建 | Vite 6 | Vite 6 |
| UI | 自定义 | shadcn/ui + Radix UI + Tailwind CSS |
| 后端 | Koa 2 + CommonJS | ElysiaJS + ESM |
| 运行时 | Node.js | Bun |
| 数据库 | MongoDB + Mongoose | PostgreSQL + Drizzle ORM |
| 日志 | Winston | pino |
| 输入校验 | 无统一 | Zod |

---

## 2. 高层架构图

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  zorron-editor                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Editor Shell │  │  Node Editor │  │   Player     │  │  3D Vector (opt)     │ │
│  │  (React)      │  │  (React Flow)│  │  (React)     │  │  (React Three Fiber) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                 │                  │                     │             │
│  ┌──────▼─────────────────▼──────────────────▼─────────────────────▼───────────┐ │
│  │                              Zustand Stores                                 │ │
│  │  editorStore | projectStore | assetStore | authStore | uiStore | playerStore │ │
│  └──────┬─────────────────────────────────────────────────────────────────────┘ │
│         │                                                                        │
│  ┌──────▼─────────────────────────────────────────────────────────────────────┐ │
│  │                         Services / Composables / Hooks                     │ │
│  │  api.service.ts | asset.service.ts | workspace.service.ts | game.service.ts  │ │
│  └──────┬─────────────────────────────────────────────────────────────────────┘ │
│         │            HTTP/Eden (类型化)                                          │
└─────────┼────────────────────────────────────────────────────────────────────────┘
          │
          │  REST / JSON / 文件上传
          │
┌─────────▼────────────────────────────────────────────────────────────────────────┐
│                                  zorron-server                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                          ElysiaJS App                                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │  │
│  │  │ auth.route │  │project.rout│  │ asset.route│  │ health / ready / admin   │ │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────────────────────────┘ │  │
│  │        │               │               │                                    │  │
│  │  ┌─────▼───────────────▼───────────────▼────────────────────────────────┐   │  │
│  │  │                   Controllers / Services / Repositories              │   │  │
│  │  │  auth.service | project.service | project.repository | asset.service │   │  │
│  │  └─────┬────────────────────────────────────────────────────────────────┘   │  │
│  │        │                                                                    │  │
│  │  ┌─────▼──────┐  ┌────────────┐  ┌────────────┐  ┌───────────────────────┐  │  │
│  │  │   Zod      │  │   pino     │  │    JWT     │  │ Storage Provider      │  │  │
│  │  │ Validation │  │ logger     │  │ (jose)     │  │ (Local / S3 / R2 ...) │  │  │
│  │  └─────┬──────┘  └────────────┘  └────────────┘  └───────────┬───────────┘  │  │
│  └────────┼─────────────────────────────────────────────────────┼──────────────┘  │
│           │                                                      │                 │
│  ┌────────▼──────────────────────────────────────────────────────▼─────────────┐  │
│  │                       PostgreSQL  +  Redis  +  Object Storage              │  │
│  │  Drizzle ORM  |  sessions/rate-limit/cache  |  asset files / CDN           │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 前端模块结构

```text
apps/zorron-editor/src/
├── main.tsx                    # 应用入口
├── routes.tsx                  # 路由配置（桌面 / H5 / Player Embed）
├── App.tsx                     # 主布局、快捷键注册、全局错误边界
├── components/
│   ├── ui/                     # shadcn/ui 组件目录
│   ├── flow/
│   │   ├── FlowCanvas.tsx      # React Flow 画布容器
│   │   ├── NodePalette.tsx     # dnd-kit 节点面板
│   │   ├── nodes/              # 8 种自定义节点
│   │   │   ├── StartNode.tsx
│   │   │   ├── SceneNode.tsx
│   │   │   ├── LogicNode.tsx
│   │   │   ├── SetterNode.tsx
│   │   │   ├── CalculatorNode.tsx
│   │   │   ├── SettlementNode.tsx
│   │   │   ├── VideoNode.tsx
│   │   │   └── LinkNode.tsx
│   │   └── edges/              # 自定义边
│   ├── inspector/
│   │   ├── InspectorPanel.tsx
│   │   └── fields/             # 节点字段编辑器
│   ├── player/
│   │   ├── PlayerShell.tsx
│   │   ├── SceneStage.tsx
│   │   ├── VideoStage.tsx
│   │   ├── SettlementStage.tsx
│   │   └── ChoiceLayer.tsx
│   ├── asset/
│   │   ├── AssetPanel.tsx
│   │   ├── AssetUploader.tsx
│   │   └── CdnManager.tsx
│   └── vector/
│       └── VectorSpacePanel.tsx  # Feature Flag 控制
├── hooks/                      # React 业务 Hooks
│   ├── useAutoSave.ts
│   ├── useWorkspace.ts
│   ├── useHoldTrigger.ts
│   ├── useSlashTrigger.ts
│   ├── useAudioManager.ts
│   └── useProjectSync.ts
├── stores/                     # Zustand 分层状态
│   ├── editorStore.ts
│   ├── projectStore.ts
│   ├── assetStore.ts
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── playerStore.ts
├── services/
│   ├── api.ts                  # Eden Treaty 或统一 fetch 客户端
│   ├── asset.service.ts
│   ├── workspace.service.ts    # File System Access API + IndexedDB
│   └── remoteAsset.service.ts
├── game/                       # 纯逻辑，与框架无关
│   ├── GameEngine.ts
│   ├── AudioManager.ts
│   ├── nodeProcessors.ts
│   └── vectorMath.ts
├── types/
│   ├── asset.ts
│   ├── project.ts
│   ├── flow.ts
│   └── user.ts
├── utils/
│   ├── workspaceDB.ts          # IndexedDB 封装
│   ├── dataCollector.ts
│   └── shareImageGenerator.ts
├── lib/
│   └── featureFlags.ts         # Feature Flag 配置
└── styles/
    └── globals.css             # Tailwind 入口 + CSS 变量
```

### 3.1 前端分层原则

1. **组件只负责渲染**：React 组件处理 JSX、事件转发、布局；业务逻辑下沉到 Hooks 或 Zustand。
2. **Flow 数据层独立**：React Flow 的 `nodes` / `edges` 由 `editorStore` 持有，通过 `useNodesState` / `useEdgesState` 桥接。
3. **GameEngine 作为外部状态机**：Player 组件订阅 `playerStore`，`playerStore` 内部调用 `GameEngine` 的纯函数推进剧情。
4. **本地优先 + 云端同步**：`workspace.service.ts` 管理本地文件系统；`useProjectSync.ts` 负责本地/远程模式切换与自动保存。

---

## 4. 后端分层架构

后端采用**严格单向依赖**的分层设计：

```text
routes → controllers → services → repositories → database
         ↑ middleware (横切关注点)
```

```text
apps/zorron-server/src/
├── config/
│   ├── env.ts                  # Zod 解析环境变量
│   ├── database.ts             # Drizzle client 初始化
│   └── redis.ts                # ioredis 连接
├── db/
│   ├── schema.ts               # Drizzle 表定义
│   ├── migrations/             # drizzle-kit 生成
│   └── seed.ts                 # 初始数据
├── middleware/
│   ├── logger.ts               # requestId + pino 注入
│   ├── auth.ts                 # JWT derive 插件
│   ├── errorHandler.ts         # 统一 AppError 响应
│   └── rateLimit.ts            # Redis 限流
├── modules/
│   ├── auth/
│   │   ├── auth.route.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.schema.ts
│   │   └── auth.test.ts
│   ├── project/
│   │   ├── project.route.ts
│   │   ├── project.controller.ts
│   │   ├── project.service.ts
│   │   ├── project.repository.ts
│   │   ├── project.schema.ts
│   │   └── project.test.ts
│   ├── asset/
│   │   ├── asset.route.ts
│   │   ├── asset.controller.ts
│   │   ├── asset.service.ts
│   │   ├── asset.repository.ts
│   │   ├── asset.schema.ts
│   │   └── asset.test.ts
│   └── user/
│       ├── user.route.ts
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       ├── user.schema.ts
│       └── user.test.ts
├── shared/
│   ├── logger.ts               # pino 实例
│   ├── errors.ts               # AppError 类
│   └── storage/
│       ├── provider.ts         # 存储抽象接口
│       ├── local.provider.ts
│       └── s3.provider.ts
├── app.ts                      # Elysia 实例组装
└── server.ts                   # Bun 入口
```

### 4.1 依赖规则

1. `route` 只调用 `controller` 或 `service`。
2. `controller` 负责解析请求、调用 `service`、格式化响应。
3. `service` 负责业务规则编排，可调用多个 `repository` 或外部服务。
4. `repository` 只负责数据库访问（Drizzle）。
5. `shared` 中的工具函数可被任意层使用，但不得包含业务规则。

### 4.2 认证与上下文注入

使用 Elysia `derive` 注入 `user` 上下文，替代 Koa 的 `ctx.state.user`：

```ts
// 概念示例，非实现代码
const authPlugin = new Elysia()
  .derive({ as: 'scoped' }, async ({ headers, set }) => {
    const token = headers.authorization?.replace('Bearer ', '');
    if (!token) return { user: null };
    const payload = await verifyJwt(token);
    return { user: payload };
  });

app.use(authPlugin)
   .get('/projects', ({ user }) => projectService.list(user.id), { requireAuth: true });
```

### 4.3 日志与可观测性

- 所有请求通过中间件生成 `requestId`（UUID v7）。
- `pino` 输出结构化 JSON 日志，字段包括 `requestId`、`method`、`path`、`statusCode`、`durationMs`、`userId`。
- 关键路径（DB、外部存储、结算计算）通过 `logger.child({ requestId })` 记录。

---

## 5. 状态管理策略

### 5.1 Zustand Store 划分

| Store | 职责 | 持久化 |
|---|---|---|
| `editorStore` | React Flow 画布状态（nodes/edges/selectedNode/viewport）、撤销重做 | 不持久化，依赖 project load |
| `projectStore` | 当前项目数据（settings、variables、vector config、flowData） | 本地文件 / 远程 API |
| `assetStore` | 资源列表、分类规则、引用计数、CDN 状态 | IndexedDB + 远程 API |
| `authStore` | 用户信息、JWT、登录弹窗可见性 | localStorage（token） |
| `uiStore` | 面板折叠、主题、全局 loading、toast | localStorage（部分 UI 偏好） |
| `playerStore` | Player 运行状态（currentNode、history、choices） | 不持久化 |

### 5.2 跨 Store 依赖

旧版 `workbench.ts` 存在 Store 交叉调用。新版通过**事件 / 依赖注入**解耦：

1. `useProjectSync(projectStore, assetStore)` Hook 监听项目变化，触发自动保存。
2. `assetStore` 不直接引用 `projectStore`；引用追踪通过 `projectStore.flowData` 反向扫描完成。
3. `authStore` 通过 `api` 拦截器统一注入 token，避免其他 Store 感知认证细节。

### 5.3 撤销重做

在 `editorStore` 中使用 `lodash.isequal` 比较节点/边快照，维护 `past` / `future` 栈。Undo/Redo 仅作用于画布结构，不影响项目配置。

---

## 6. 资源管道与 CDN 策略

### 6.1 资源生命周期

```text
本地扫描 ──→ workspaceDB ──→ assetStore ──→ 项目引用
   │                            │
   │                            ▼
   │                      远程同步（可选）
   │                            │
   ▼                            ▼
File System Access API     Object Storage (S3/R2)
                                │
                                ▼
                           CDN 分发
```

### 6.2 资源 URL 规范

前端只使用统一的 `asset.url`，禁止直接拼接路径：

```ts
// 概念示例
interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'font' | 'other';
  source: 'local' | 'remote';
  localHandleId?: string;        // IndexedDB 句柄标识
  url: string;                   // blob: / https://cdn... / /api/assets/...
  size: number;
  mimeType: string;
}
```

### 6.3 存储 Provider 抽象

后端通过统一接口支持本地磁盘与对象存储：

```ts
// 概念示例
interface StorageProvider {
  put(key: string, file: File): Promise<string>;       // 返回可访问 URL
  getSignedUrl(key: string, expires?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

环境变量 `STORAGE_PROVIDER=local|s3|r2` 切换实现。

### 6.4 CDN 配置

1. 旧版 `assets/cdn-mapping.json` 退役，迁移到数据库配置表或环境变量。
2. 生产环境使用对象存储 + CDN；开发环境使用本地存储 Provider。
3. 上传后的资源元数据存入 PostgreSQL；文件内容存入对象存储或本地磁盘。

---

## 7. Player 嵌入架构

### 7.1 运行模式

Player 支持两种运行模式：

1. **编辑器内嵌模式**：在 `PlayerShell` 中运行，用于实时预览。
2. **独立嵌入模式**：通过打包产物 `embed.js` / `embed.css` 嵌入第三方页面。

### 7.2 Player 组件拆分

```text
PlayerShell
├── SceneStage      # 剧情文本 + 背景 + 角色立绘
├── VideoStage      # 视频节点全屏播放
├── LinkStage       # 外链跳转
├── SettlementStage # 结算结果 + 向量展示
└── ChoiceLayer     # tap / hold / slash 交互选项
```

### 7.3 与 GameEngine 的协作

- `GameEngine` 保持为纯 TypeScript 状态机，暴露 `start(project)`、`selectChoice(choiceId)`、`getState()` 等方法。
- `playerStore` 持有 `GameEngine` 实例，React 组件订阅 store 变化。
- 交互 Hook（`useHoldTrigger`、`useSlashTrigger`）在 `ChoiceLayer` 中绑定手势，触发 `playerStore.selectChoice`。

### 7.4 嵌入 SDK 约定

```html
<!-- 概念示例 -->
<div id="zorron-player" data-project-id="uuid"></div>
<script src="https://cdn.example.com/zorron/embed.js"></script>
<script>
  ZorronPlayer.mount({
    container: '#zorron-player',
    projectId: 'uuid',
    apiBase: 'https://api.example.com',
    features: { vector3d: false }
  });
</script>
```

---

## 8. Feature Flags

### 8.1 3D 人格向量空间

3D 向量空间是域特色能力，但作为可选功能通过 Feature Flag 开启，确保编辑器对通用叙事场景保持简洁。

| Flag | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `FEATURE_VECTOR_3D` | `FEATURE_VECTOR_3D` | `false` | 是否显示 3D 人格向量面板 |
| `VECTOR_SECT_COUNT` | `VECTOR_SECT_COUNT` | `20` | 默认门派/象限数量 |
| `FEATURE_CLOUD_SYNC` | `FEATURE_CLOUD_SYNC` | `true` | 是否启用云端同步入口 |

### 8.2 渐进式交付

1. 核心编辑器（节点编辑、保存、Player）默认启用。
2. 3D 向量、云同步、H5 构建等能力通过环境变量切换。
3. 前端通过 `lib/featureFlags.ts` 读取构建时注入的 `import.meta.env`；后端通过 `config/env.ts` 读取环境变量。

---

## 9. 环境配置概念

### 9.1 `.env.example`（前后端共用参考）

```bash
# ===== 通用 =====
NODE_ENV=development
LOG_LEVEL=info
REQUEST_ID_HEADER=x-request-id

# ===== 后端服务 =====
PORT=3000
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173

# PostgreSQL
DATABASE_URL=postgresql://zorron:zorron@localhost:5432/zorron

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

# 存储 Provider: local | s3 | r2
STORAGE_PROVIDER=local
STORAGE_LOCAL_ROOT=./uploads
STORAGE_BASE_URL=http://localhost:3000/uploads

# 对象存储（当 STORAGE_PROVIDER=s3|r2 时）
STORAGE_ENDPOINT=
STORAGE_REGION=auto
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_PUBLIC_URL=

# ===== 前端 =====
VITE_API_BASE_URL=http://localhost:3000
VITE_FEATURE_VECTOR_3D=false
VITE_FEATURE_CLOUD_SYNC=true
```

### 9.2 `docker-compose.yml`（本地开发概念）

```yaml
# 概念示例，非最终产物
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: zorron
      POSTGRES_PASSWORD: zorron
      POSTGRES_DB: zorron
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  server:
    build:
      context: ./apps/zorron-server
    environment:
      DATABASE_URL: postgresql://zorron:zorron@postgres:5432/zorron
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

volumes:
  pgdata:
```

---

## 10. 关键非功能性需求

1. **所有外部输入必须经过 Zod 校验**：包括路由参数、请求体、查询参数、环境变量。
2. **后端必须暴露 `/health`（存活）和 `/ready`（就绪）**：`/ready` 检查 PostgreSQL 与 Redis 连通性。
3. **结构化日志**：使用 `pino`，所有日志携带 `requestId`。
4. **错误响应统一格式**：
   ```ts
   interface AppErrorResponse {
     code: string;        // 业务错误码，如 AUTH_001
     message: string;
     details?: unknown;   // 仅 dev 环境返回
     requestId: string;
   }
   ```
5. **CORS 与限流**：后端默认启用 CORS 白名单与 Redis 限流。
6. **12-Factor**：配置通过环境变量注入，不提交 `.env` 到版本控制。

---

## 11. 实施阶段概要

1. **阶段 1：基础设施与数据契约**
   - 初始化 React + Vite + Tailwind + shadcn/ui + Zustand。
   - 初始化 Elysia + Drizzle + PostgreSQL + pino。
   - 定义 `FlowData`、`GameNode`、`GameEdge`、`Asset`、`Project`、`User` Zod Schema。
   - 编写 Drizzle 迁移脚本。

2. **阶段 2：核心引擎复用**
   - 迁移 `GameEngine.ts`、`AudioManager.ts`、资源类型、workspaceDB。
   - 建立前端 `game/` 目录，确保与框架解耦。

3. **阶段 3：节点编辑器**
   - 搭建 React Flow 画布，逐个迁移 8 种节点类型。
   - 实现导入/导出、撤销重做、自动保存。

4. **阶段 4：播放器**
   - 拆分 `Player.vue` 为 React 子组件。
   - 复用 `GameEngine` 驱动状态机。

5. **阶段 5：后端与云同步**
   - 实现认证、项目 CRUD、文件服务。
   - 集成前端 API 服务，支持本地/远程模式切换。

6. **阶段 6：3D 可视化与打磨**
   - 使用 React Three Fiber 实现可选 3D 向量视图。
   - 完善埋点、错误处理、移动端 H5 适配。

---

## 12. 迁移状态更新（2026-06）

### 已完成项

#### 基础架构迁移
- ✅ Monorepo 结构（pnpm workspace）已建立
- ✅ React 18 + Vite 前端已从 Vue 3 完整迁移
- ✅ ElysiaJS + Bun 后端已搭建
- ✅ Drizzle ORM + PostgreSQL 16 数据层已就绪
- ✅ Redis 缓存/队列已集成

#### 功能迁移
- ✅ 8 种节点类型（start, scene, logic, setter, calculator, settlement, video, link）全部迁移
- ✅ 3 种交互方式（tap, hold, slash）已实现
- ✅ 三维向量空间（Canvas 等距投影）已迁移
- ✅ 蒙特卡洛模拟器已迁移（Mulberry32 PRNG）
- ✅ H5 Embed SDK（UMD + ESM）已就绪
- ✅ Feature Flags（vector3d, cloudSync）已实现

#### 国际化
- ✅ 中英文双语界面已实现（中文默认）
- ✅ 轻量级 i18n 方案（translations + localeStore + useT）
- ✅ 200+ 翻译键覆盖全部 UI

#### 示例数据
- ✅ 「江湖奇遇录」完整示例项目已迁移（9 节点 + 10 边 + 3 门派）
- ✅ 后端 seed.ts 已更新

### P1 优化（已完成）
- ✅ 编辑器内预览播放器
- ✅ 首次使用引导教程
- ✅ 右键上下文菜单（复制/粘贴/删除/添加节点）
- ✅ 节点搜索（Ctrl+P 快速跳转）
- ✅ CI/CD 流水线（GitHub Actions：lint → test → build → docker）

### P2 优化（已完成）
- ✅ 变量管理面板（含引用计数）
- ✅ 碎片系统可视化
- ✅ 模板库（预设模板一键插入）
- ✅ 可视化条件构建器
- ✅ 版本历史快照

### 技术债务清理（已完成）
- ✅ 速率限制中间件（TD-1）
- ✅ 补充 Inspector 表单和播放器 Stage 组件测试（TD-2）
- ✅ 迁移文档更新（TD-3）
- ✅ OpenAPI 自动导出（TD-4）

### 待办事项（P3 及以后）
- ⬜ 用户权限体系（RBAC）
- ⬜ 多人协作编辑（CRDT）
- ⬜ 资源 CDN 分发
- ⬜ 数据分析仪表盘
- ⬜ 移动端适配优化
