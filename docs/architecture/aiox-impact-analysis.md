# AIOX Impact Analysis — Zorron Engine 迁移项目

## 1. 概述

### 1.1 分析目标

本文档针对 `i:\workspace\Nodejs-workspace\bot\project\zorronEngine` 项目，分析其从 **Vue 3 / Koa / MongoDB** 迁移至 **React 18+ / ElysiaJS / PostgreSQL** 的影响范围、可复用资产、必须重写的部分以及高风险区域。

### 1.2 迁移愿景

将 Zorron Engine 从一款"人格测试编辑器"演进为**通用交互叙事编辑器**。核心域概念必须保留：

1. 8 种节点类型：start、scene、logic、setter、calculator、settlement、video、link
2. 3D 人格向量空间（X: 处世 / Y: 立场 / Z: 性情）
3. 玩家运行引擎（Player Engine）
4. 资源管理系统（本地 + 云端）
5. 项目保存 / 加载 / 云同步

### 1.3 技术栈变更对照

| 层级 | 当前技术 | 目标技术 | 影响程度 |
|------|---------|---------|---------|
| 前端框架 | Vue 3 (Composition API) | React 18+ (FC + Hooks) | 高 |
| 构建工具 | Vite 6 | Vite 6 | 低 |
| 状态管理 | Pinia | Zustand | 高 |
| 节点编辑器 | @vue-flow/core | @xyflow/react | 高 |
| UI 组件库 | 自定义 + 无统一库 | shadcn/ui + Radix UI | 高 |
| 样式方案 | scoped CSS + 少量 Tailwind | Tailwind CSS + CSS Modules | 中 |
| 3D 可视化 | 无 / Canvas 2D | React Three Fiber + Three.js | 中 |
| 后端框架 | Koa 2 (CommonJS) | ElysiaJS (ESM) | 高 |
| 运行时 | Node.js | Bun | 中 |
| 数据库 | MongoDB + Mongoose | PostgreSQL + Drizzle ORM | 高 |
| 缓存 | Redis (ioredis) | Redis (ioredis) | 低 |
| ORM | Mongoose | Drizzle ORM | 高 |
| 输入校验 | 无统一方案 | Zod | 中 |
| 日志 | Winston | pino | 低 |

---

## 2. 影响矩阵

### 2.1 域概念 → 新栈映射

| 域概念 | 当前实现 | 新栈映射 | 影响说明 |
|--------|---------|---------|---------|
| 节点数据模型 | `GameEngine.ts` 中接口 + `App.vue` 硬编码默认值 | Drizzle JSONB/关系表 + Zod Schema | 节点 `data` 字段为 schemaless，需设计兼容结构 |
| 8 种节点类型 | Vue Flow 自定义节点组件 (`*Node.vue`) | React Flow 自定义节点组件 (`*Node.tsx`) | 全部 UI 重写，视觉样式可保留 |
| 节点连接图 | `@vue-flow/core` + `useVueFlow()` | `@xyflow/react` + `useReactFlow()` | API 语义接近但细节差异大 |
| 3D 人格向量空间 | `GameEngine` 纯计算 + `ProjectStore` 默认 20 门派 | 独立 service + R3F 可视化面板 | 计算逻辑可复用，可视化需新建 |
| 玩家引擎 | `GameEngine.ts` 类 | 原样迁移为 TypeScript 类/函数 | **纯逻辑，可完整复用** |
| 分支判定逻辑 | `processLogicNode` | 保留算法，抽离为纯函数 | 可复用 |
| 结算匹配算法 | `processSettlementNode` / `calculateResult` | 保留算法，抽离为纯函数 | 可复用 |
| 资源扫描 | `assetService.ts` + File System Access API | 逻辑复用，包装为 React Hook | 浏览器 API 不变，UI 层重写 |
| 资源分类规则 | `DEFAULT_CLASSIFICATION_RULES` | 作为 Zustand store 或 DB 配置 | 规则定义可复用 |
| 资源引用追踪 | `AssetStore.ts` Pinia | Zustand store + Drizzle 持久化 | 逻辑可复用，持久化方式变 |
| 本地工作区 | `workspaceDB.ts` IndexedDB + File System Handle | 逻辑复用，封装为 Hook | IndexedDB 与 File System API 不变 |
| 项目保存/加载 | `workbench.ts` Pinia + `project.json` | Zustand + Elysia 项目服务 | 本地/云端双模式保留 |
| 云端项目 CRUD | Koa routes (`projects.js`) + Mongoose | Elysia route + Drizzle repository | 业务规则复用，代码重写 |
| 用户认证 | Koa routes (`auth.js`) + JWT | Elysia plugin + JWT (jose) | 流程复用，中间件机制变 |
| 文件上传 | Koa + multer + 本地 `uploads/` | Elysia + 对象存储/本地存储 | 存储抽象需重新设计 |
| 音频播放 | `AudioManager.ts` (Howler.js 单例) | 原样迁移为 React 外部服务 | Howler 与 React 无冲突，可复用 |
| 埋点统计 | `dataCollector.ts` | 逻辑复用，封装为 Hook | 与框架无关 |

### 2.2 模块级影响矩阵

#### 2.2.1 前端 `zorron-editor/src`

| 模块 / 文件 | 当前职责 | 迁移策略 | 影响等级 |
|------------|---------|---------|---------|
| `App.vue` | 主应用、节点注册、工具栏、右键菜单、快捷键、导入导出 | 重写为 React 主布局组件 | 高 |
| `components/SceneNode.vue` | 剧情节点 UI（三层视觉 + 选项句柄） | 重写为 React Flow 节点 | 高 |
| `components/StartNode.vue` | 封面节点 | 重写 | 高 |
| `components/LogicNode.vue` | 条件判断节点 | 重写 | 高 |
| `components/SetterNode.vue` | 变量结算节点 | 重写 | 高 |
| `components/CalculatorNode.vue` | 向量应用节点 | 重写 | 高 |
| `components/SettlementNode.vue` | 最终审判节点 | 重写 | 高 |
| `components/VideoNode.vue` | 视频节点 | 重写 | 高 |
| `components/LinkNode.vue` | 外链节点 | 重写 | 高 |
| `components/Player.vue` | 游戏播放器（核心体验） | 重写为 React 组件 | **极高** |
| `components/SettlementResult.vue` | 结算结果页 | 重写 | 高 |
| `components/Inspector.vue` | 节点属性编辑器 | 重写为 shadcn/ui 表单 | 高 |
| `components/GameConfigModal.vue` | 人格配置弹窗 | 重写 | 中 |
| `components/AssetPanel.vue` | 资源面板 | 重写 | 高 |
| `components/CdnManager.vue` | CDN 管理 | 重写 | 中 |
| `components/WelcomeScreen.vue` | 启动页 | 重写 | 中 |
| `components/ProjectList.vue` | 云端项目列表 | 重写 | 中 |
| `components/LoginModal.vue` | 登录弹窗 | 重写 | 中 |
| `components/VariablesModal.vue` | 全局变量弹窗 | 重写 | 中 |
| `components/CollapsiblePanel.vue` | 可折叠面板 | 可用 shadcn ResizablePanel 替代 | 中 |
| `components/Typewriter.vue` | 打字机效果 | 重写为 React 组件 | 中 |
| `components/ZorronAbout.vue` | 关于页 | 重写 | 低 |
| `composables/useHoldTrigger.ts` | 长按交互逻辑 | 改写为 React Hook，逻辑复用 | 中 |
| `composables/useSlashTrigger.ts` | 滑斩交互逻辑 | 改写为 React Hook，逻辑复用 | 中 |
| `game/GameEngine.ts` | 游戏运行核心逻辑 | **完整复用**，移除 `console.log` | 低 |
| `game/AudioManager.ts` | 音频管理单例 | **完整复用** | 低 |
| `stores/project.ts` | 项目存档数据（变量、人格配置） | 改写为 Zustand store | 中 |
| `stores/workbench.ts` | 编辑器环境状态、文件系统、云同步 | 改写为 Zustand store + Hooks | 高 |
| `stores/asset.ts` | 资源管理 Pinia Store | 改写为 Zustand store | 中 |
| `stores/user.ts` | 用户状态 | 改写为 Zustand store | 中 |
| `stores/panel.ts` | 面板状态 | 改写为 Zustand store | 低 |
| `services/api.ts` | API 封装 | 改写为基于 Elysia 类型或 fetch 的 service | 中 |
| `services/assetService.ts` | 本地资源扫描/分类 | 逻辑复用，去 Pinia 依赖 | 中 |
| `services/remoteAssetService.ts` | 远程资源 API | 逻辑复用，改 base URL 配置 | 中 |
| `types/asset.ts` | 资源类型定义 | **完整复用**，可补充 Zod Schema | 低 |
| `utils/workspaceDB.ts` | IndexedDB 封装 | **完整复用** | 低 |
| `utils/dataCollector.ts` | 埋点数据收集 | 逻辑复用 | 低 |
| `utils/shareImageGenerator.ts` | 分享图生成 | 评估后复用或重写 | 中 |
| `styles/h5-global.css` | H5 全局样式 | 改写为 Tailwind 主题/CSS 变量 | 中 |
| `style.css` | 全局样式 | 改写 | 中 |
| `assets/cdn-mapping.json` | 硬编码 CDN 映射 | 退役，迁移至 DB/配置表 | 中 |

#### 2.2.2 后端 `zorron-server/src`

| 模块 / 文件 | 当前职责 | 迁移策略 | 影响等级 |
|------------|---------|---------|---------|
| `index.js` | Koa 应用启动、中间件挂载 | 重写为 Elysia `app.ts` / `server.ts` | 高 |
| `config/database.js` | MongoDB 连接 | 替换为 PostgreSQL + Drizzle 连接 | 高 |
| `config/redis.js` | Redis 连接 | 可复用，适配 Bun/ESM | 低 |
| `middleware/auth.js` | JWT 认证中间件 | 重写为 Elysia `derive` / 插件 | 高 |
| `middleware/errorHandler.js` | 统一错误处理 | 重写为 Elysia 全局错误处理 | 高 |
| `models/User.js` | 用户 Mongoose Schema | 重写为 Drizzle schema + Zod | 高 |
| `models/Project.js` | 项目 Mongoose Schema | 重写为 Drizzle schema；`data` 字段 JSONB | 高 |
| `models/File.js` | 文件 Mongoose Schema | 重写为 Drizzle schema | 高 |
| `routes/auth.js` | 注册/登录/登出 | 重写为 Elysia route + service | 高 |
| `routes/projects.js` | 项目 CRUD | 重写为 Elysia route + controller + service + repository | 高 |
| `routes/files.js` | 文件上传/下载 | 重写，抽象存储 provider | 高 |
| `routes/users.js` | 用户资料 | 重写 | 中 |
| `utils/logger.js` | Winston 日志 | 替换为 pino | 低 |

---

## 3. 组件分类

### 3.1 可复用（逻辑 / 数据 / 类型）

以下资产与 UI 框架或后端框架无关，可直接迁移或在少量包装后复用：

1. **`game/GameEngine.ts`** — 游戏运行核心。
   - 节点遍历、选项选择、向量计算、结算匹配、缓存读写均为纯 TypeScript 逻辑。
   - 迁移时建议：移除 `console.log`，改为通过事件 / 日志注入；将 `GameNode.data: any` 收紧为 Zod 推导类型。

2. **`game/AudioManager.ts`** — 音频管理单例。
   - 基于 Howler.js，与 React 无冲突。
   - 迁移时建议：保持单例，作为 React 外部服务调用。

3. **`types/asset.ts`** — 资源类型、分类规则、搜索参数。
   - 类型定义可完整复用，后续补充 Zod Schema 作为数据契约。

4. **`utils/workspaceDB.ts`** — IndexedDB 封装。
   - 使用 `idb` 库，浏览器环境无关。
   - 迁移时建议：保留 API，仅将 `Asset.handle` / `Asset.url` 序列化逻辑保持现状。

5. **`utils/dataCollector.ts`** — 埋点数据收集。
   - 纯逻辑，可完整复用。

6. **节点处理算法** — `processLogicNode`、`processSetterNode`、`processCalculatorNode`、`processSettlementNode`。
   - 可抽离为独立 pure functions，便于单元测试和跨平台复用。

7. **3D 向量计算** — `euclideanDistance`、`vectorMagnitude`、`getQuadrant`、`findNearestSectByQuadrant`。
   - 纯数学函数，可完整复用。

8. **资源分类规则** — `DEFAULT_CLASSIFICATION_RULES`。
   - 规则定义可复用，持久化方式改为 Zustand 或数据库配置表。

9. **后端业务规则** — 用户注册/登录校验、项目权限检查、文件元数据模型。
   - 规则可复用，代码需重写。

### 3.2 必须重写（UI / Runtime / 框架绑定）

以下组件与 Vue / Koa / Mongoose 强绑定，必须重写：

1. **所有 Vue 单文件组件（`.vue`）**
   - 尤其是 `App.vue`、`Player.vue`、`SceneNode.vue`、`Inspector.vue`。
   - 需要迁移为 React FC + Hooks，模板语法改写为 JSX，scoped CSS 改写为 Tailwind / CSS Modules。

2. **Pinia Stores → Zustand Stores**
   - `project.ts`、`workbench.ts`、`asset.ts`、`user.ts`、`panel.ts`。
   - 注意：`workbench.ts` 中存在 `getAssetStore()` 懒加载和循环 store 引用，需在 Zustand 中重新设计依赖关系。

3. **Vue Flow → React Flow**
   - 节点注册、连接事件、画布控制、坐标转换、`toObject` / `fromObject` 均需按 React Flow API 重写。

4. **Composables → React Hooks**
   - `useHoldTrigger.ts`、`useSlashTrigger.ts`。

5. **Koa 后端 → ElysiaJS**
   - 中间件机制从洋葱模型变为 Elysia 的 `derive` / `onBeforeHandle` / 插件。
   - 路由、请求体解析、文件上传、静态文件服务均需重写。

6. **Mongoose Schemas → Drizzle ORM**
   - 用户、项目、文件三张核心表需重新定义。
   - `Project.data` 中的 `nodes` / `edges` / `variables` / `settings` 等动态结构建议用 PostgreSQL JSONB 存储，同时用 Zod 校验。

7. **API Service 层**
   - 当前 `api.ts` 使用裸 `fetch`，且缺乏统一错误码和 requestId。
   - 新栈中建议使用 Elysia 的 Eden Treaty 类型化客户端或统一封装的 fetch 层。

8. **认证与授权**
   - Koa 的 `authMiddleware` 需要改为 Elysia 的 `derive` 注入 `user` 上下文，并在各路由中使用。

### 3.3 建议退役

1. **`assets/cdn-mapping.json`**
   - 当前硬编码 CDN 映射，应迁移到数据库配置表或环境变量中，避免每次新增资源都改代码。

2. **Baklava V1 迁移文档**
   - `docs/migration.md` 描述的是旧版 Baklava 编辑器迁移，与新目标栈无关，应标记为归档或删除。

3. **Player.vue 中的硬编码剧情文案**
   - `game-intro` 段落包含《奉天证道》剑三相关内容，与"通用交互叙事编辑器"目标冲突，应改为从项目数据读取。

4. **旧版 CommonJS 后端代码**
   - 完整迁移到 ESM， retiring `require()` / `module.exports`。

5. **Winston 日志**
   - 按 Harness 标准统一替换为 pino，并注入 requestId。

6. **裸 `fetch` 与 `XMLHttpRequest` 混用**
   - `remoteAssetService.ts` 中直接调用 `fetch`/`XMLHttpRequest`，应统一为带拦截器的 HTTP 客户端。

---

## 4. 高风险迁移区域

### 4.1 极高风险

#### 4.1.1 节点编辑器从 Vue Flow 迁移到 React Flow

- **风险点**：
  1. `nodeTypes` 注册方式从 Vue 的 `markRaw(Component)` 变为 React 的组件引用。
  2. 自定义节点的 `Handle` 位置、样式、连接桩 ID 需重新实现。
  3. `onConnect`、`toObject`、`fromObject`、画布坐标转换 API 名称和返回值不同。
  4. 右键菜单添加节点、节点拖拽创建、画布导航控件需重新绑定事件。
- **建议**：
  - 先建立最小可运行的 React Flow 画布（2-3 个节点），验证数据流后再迁移全部节点类型。
  - 定义统一的 `FlowData` Zod Schema，确保 Vue Flow 保存的数据可被 React Flow 正确加载。

#### 4.1.2 `Player.vue` 播放器重写

- **风险点**：
  1. 组件超过 2700 行，包含 start / scene / video / link / settlement 五种渲染分支、复杂 CSS 动画、移动端适配。
  2. 交互类型 `tap` / `hold` / `slash` 与 `useHoldTrigger` / `useSlashTrigger` 深度耦合。
  3. 资源预加载、音频解锁、缓存恢复、结算跳转等生命周期复杂。
- **建议**：
  - 将播放器拆分为 `PlayerShell`、`SceneStage`、`VideoStage`、`SettlementStage`、`ChoiceLayer` 等子组件。
  - 保留 `GameEngine` 作为状态机，React 组件仅负责渲染和事件转发。

#### 4.1.3 数据 Schema 从 MongoDB 迁移到 PostgreSQL

- **风险点**：
  1. `Project.data.nodes[].data` 为 `Mixed` 类型，结构自由；PostgreSQL 需用 JSONB 或拆表。
  2. 现有保存的项目文件需要迁移脚本兼容。
  3. 用户 ID、项目 ID、文件 ID 从 MongoDB ObjectId 变为 UUID/自增 ID，影响前后端所有关联字段。
- **建议**：
  - 节点 `data` 先用 JSONB 存储，逐步为高频字段（如 `choices`、`dialogue`）建立规范化表。
  - 编写一次性数据迁移脚本，并在迁移前对旧项目 JSON 做全量备份。

### 4.2 高风险

#### 4.2.1 Pinia → Zustand 状态迁移

- **风险点**：
  1. `workbench.ts` 与 `project.ts`、`asset.ts`、`user.ts` 存在交叉调用。
  2. `workbench.ts` 中的自动保存 timer、File System Handle、IndexedDB 操作需要在 React 生命周期中正确管理。
  3. `selectedNode` 等响应式状态需要与 React Flow 的 `useNodesState` 协同。
- **建议**：
  - 按职责拆分 store：editor store、project store、asset store、auth store、ui store。
  - 自动保存逻辑封装为 `useAutoSave` Hook，避免 store 与 React Flow 实例直接耦合。

#### 4.2.2 本地文件系统工作区

- **风险点**：
  1. File System Access API 在 React 中的调用时机（如 `showDirectoryPicker` 必须在用户手势内触发）。
  2. 目录句柄持久化到 IndexedDB 后，权限可能在浏览器清理后失效。
  3. 自动保存时权限静默降级逻辑需要完整保留。
- **建议**：
  - 封装 `useWorkspace()` Hook，集中处理授权、扫描、备份、恢复。

#### 4.2.3 资源管理与云端同步

- **风险点**：
  1. 本地资源使用 `URL.createObjectURL`，远程资源使用 `${STATIC_BASE_URL}/uploads/...`，URL 解析逻辑分散在 `workbench.ts`、`assetService.ts`、`remoteAssetService.ts`、`Player.vue`。
  2. 资源引用计数、分类规则、CDN 状态需要在前后端保持一致。
- **建议**：
  - 统一资源 URL 解析函数，前端只认 `asset.url`，不直接拼接路径。
  - 后端文件服务抽象为 storage provider（本地/对象存储可切换）。

#### 4.2.4 音频生命周期在 React 中管理

- **风险点**：
  1. `AudioManager` 单例在组件挂载/卸载时需要正确停止和释放。
  2. 移动端自动播放策略、微信环境解锁逻辑需要保留。
- **建议**：
  - 在 React 中使用 `useEffect` 注册全局点击事件以解锁音频，组件卸载时调用 `stopAll()`。

#### 4.2.5 认证授权中间件迁移

- **风险点**：
  1. Koa 的 `ctx.state.user` 与 Elysia 的 `derive` 注入方式不同。
  2. JWT 签发与校验库需要从 `jsonwebtoken` 切换为 `jose`（Bun/ESM 更友好）。
- **建议**：
  - 编写 Elysia 认证插件，在 `app.derive()` 中注入 `user` 和 `token`。
  - 所有受保护路由通过 `.use(authPlugin)` 获取类型安全上下文。

### 4.3 中等风险

#### 4.3.1 3D 人格向量可视化

- **风险点**：当前仅有 3D 计算逻辑，无 3D 可视化；迁移后若使用 React Three Fiber，需处理性能、相机控制、锚点标注。
- **建议**：作为可选功能通过 Feature Flag 开启，避免阻塞核心编辑器迁移。

#### 4.3.2 移动端 H5 构建

- **风险点**：当前 `h5-main.ts` / `build:h5` 针对 Vue；React 版本需重新配置入口和适配样式。
- **建议**：使用同一套 React 代码库，通过 Vite 条件入口或环境变量区分桌面/H5。

#### 4.3.3 字体与静态资源

- **风险点**：当前使用 `临海隶书`、`ShangguRound` 等自定义字体，字体构建脚本 `build:font` 依赖 Vue 项目结构。
- **建议**：保留字体文件与构建脚本，仅调整输出目录。

---

## 5. 迁移阶段建议

### 阶段 1：基础设施与数据契约

1. 初始化 React + Vite + Tailwind + shadcn/ui + Zustand 项目骨架。
2. 初始化 Elysia + Drizzle + PostgreSQL + pino 后端骨架。
3. 定义核心 Zod Schema：`FlowData`、`GameNode`、`GameEdge`、`Asset`、`Project`、`User`。
4. 创建 Drizzle 迁移脚本。

### 阶段 2：核心引擎复用

1. 将 `GameEngine.ts` 移植到新前端项目，保持纯逻辑。
2. 将 `AudioManager.ts` 移植并封装为 React 可用服务。
3. 将资源类型、分类规则、workspaceDB 移植。

### 阶段 3：节点编辑器

1. 搭建 React Flow 画布。
2. 逐个迁移 8 种节点类型，优先 `start`、`scene`。
3. 实现导入/导出、自动保存、工作区连接。

### 阶段 4：播放器

1. 拆分 `Player.vue` 为多个 React 组件。
2. 复用 `GameEngine` 驱动状态机。
3. 恢复 tap/hold/slash 交互。

### 阶段 5：后端与云同步

1. 实现 Elysia 认证、项目、文件服务。
2. 集成前端 API 服务。
3. 实现本地/远程模式切换。

### 阶段 6：3D 可视化与打磨

1. 使用 React Three Fiber 实现可选的 3D 人格向量视图。
2. 完善埋点、错误处理、移动端适配。

---

## 6. 结论

本次迁移的核心价值在于**保留并强化 Zorron Engine 的域模型**，同时将运行时装配到更现代、类型更安全、AI Agent 更友好的 React / Elysia / PostgreSQL 栈上。

- **最大可复用资产**：`GameEngine.ts`、`AudioManager.ts`、资源类型定义、向量结算算法。
- **最大重写成本**：`Player.vue`、所有 Vue 节点组件、Pinia Stores、Koa 后端、Mongoose Schema。
- **最高风险区域**：节点编辑器框架切换、播放器重写、数据 Schema 迁移、Pinia 交叉状态拆解。

建议在正式开发前，先用 1-2 个迭代完成**原型验证**（React Flow 画布 + 复用 GameEngine + Elysia 项目 CRUD），以确认数据契约和关键交互在新栈下可行。

---

## 7. 参考文件

- IDS 报告：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-editor\.aios-core\data\aiox-zorron-ids-report.md`
- UI 研究：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-editor\.aios-core\data\aiox-ui-research.md`
- 游戏引擎：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-editor\src\game\GameEngine.ts`
- 主应用：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-editor\src\App.vue`
- 播放器：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-editor\src\components\Player.vue`
- 工作台状态：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-editor\src\stores\workbench.ts`
- 后端入口：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-server\src\index.js`
- 项目模型：`i:\workspace\Nodejs-workspace\bot\project\zorronEngine\zorron-server\src\models\Project.js`
