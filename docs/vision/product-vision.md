# Zorron Engine — AI 驱动的通用交互引擎

> **文档定位**：本文件是项目的北极星文档，阐述"为什么做、做成什么样、怎么做到"。
> 所有架构决策、技术方案、迭代计划都应以本文档为准绳。
> 最后更新：2026-07-10

---

## 1. 前因：为什么要做这件事

### 1.1 痛点观察

互联网产品的"用户侧"长期面临一个矛盾：

- **产品需要理解用户**：推荐、匹配、个性化、分级运营，都依赖对用户的深度画像。
- **用户讨厌填表单**：冗长的注册流程、刻板的问卷调研、千篇一律的测评，用户要么跳过，要么敷衍。

传统"表单式采集"的代价是：**数据质量低、完成率低、用户体验差**。运营花了大量成本搭问卷、发奖励，最终回收的只是用户的应付填答。

### 1.2 机会窗口

三个趋势正在汇合：

| 趋势                | 带来的能力                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **AI Agent 能力成熟** | 能理解自然语言需求、自动编排内容、生成选项与文案、校验逻辑闭环。创作门槛从"会画流程图"降为"会描述需求"。                |
| **节点式交互成熟**       | React Flow / Vue Flow 让"画流程图"从工程能力变为通用能力。节点可表达任意交互单元：选项、视频、小游戏、问答、评分。 |
| **内容化测试兴起**       | MBTI、职业锚、游戏人格测试在年轻人中广受欢迎。用户愿意为"看见自己"投入 5-10 分钟，前提是过程有趣。               |

### 1.3 现有方案的局限

市面上的测评/问卷工具存在三类问题：

| 局限         | 表现                                       |
| ---------- | ---------------------------------------- |
| **场景单一**   | 只能做问卷，不能做交互视频、小游戏、剧情分支。                  |
| **创作门槛高**  | 需要懂流程图、懂条件分支、懂变量赋值。非技术人员难以自主创作。          |
| **结果不可消费** | 测试结果只在页面展示，无法被外部系统（推荐系统、匹配系统、CRM）API 拉取。 |

### 1.4 Zorron Engine 的答案

> **Zorron Engine 是一个以节点为核心的通用交互引擎。**
> **凡是"用户录入信息或做选择 → 根据交互信息得出结论"的场景，都可以用它来构建。**

它不是问卷工具，不是人格测试工具，而是一个**交互场景运行时**：

- 场景是多样的：人格测试、题目测试、情景模拟、交互式视频、H5 小游戏、调研问卷……
- 节点是多样的：一组选项、一段视频、一个小游戏、一段对话、一道题目……
- 创作是 AI 驱动的：Agent 理解需求 → 自动编排节点 → 校验逻辑 → 生成可运行场景。
- 结果是可消费的：测试结果通过 API 持久化，可被任何外部系统拉取使用。

---

## 2. 后果：做成之后会带来什么

### 2.1 对最终用户（玩家）

| 价值       | 说明                                               |
| -------- | ------------------------------------------------ |
| **愿意参与** | 测试不再是枯燥的表单，而是有剧情、有选择、有惊喜的互动体验。5-10 分钟获得一张专属卡片。   |
| **结果有用** | 测试结果不是终点，而是连接其他服务的"社交名片"——可以用来匹配搭子、加入战队、获取个性化推荐。 |
| **数据可控** | 用户决定哪些信息对外可见（MBTI、星座、截图等），隐私优先。                  |

### 2.2 对场景创作者（运营 / 产品 / AI Agent）

| 价值        | 说明                                           |
| --------- | -------------------------------------------- |
| **零代码创作** | 描述需求即可生成完整交互场景。AI Agent 负责编排节点、连线、插入条件、生成文案。 |
| **多场景复用** | 同一套引擎支持人格测试、问卷、知识竞赛、剧情冒险等，无需为每种场景重新造轮子。      |
| **质量自验证** | 内置蒙特卡洛仿真器，自动检测死路、死循环、结果分布失衡，无需人工逐路径测试。       |

### 2.3 对外部系统（消费方）

| 价值        | 说明                                                      |
| --------- | ------------------------------------------------------- |
| **结果可拉取** | 通过 `/api/sessions` 获取用户测试结果，结构化 JSON，可直接对接推荐、匹配、CRM。    |
| **场景可编程** | AI Agent 通过 `/api/agent/compile` 提交意图，自动生成场景并发布，无需人工介入。 |
| **嵌入无门槛** | 通过 Embed SDK 一行 `<script>` 即可将场景嵌入任意 H5 页面、小程序、App。     |

### 2.4 对生态

当引擎具备"AI 自动创作 + 多场景复用 + 结果可消费"三要素后，会形成**场景市场**的正反馈：

```
AI Agent 创作场景越多 → 用户可玩内容越丰富
                                ↓
                         用户参与度越高 → 产生的结果数据越多
                                ↓
                         外部系统价值越大 → 吸引更多场景接入
                                ↓
                         引擎生态越繁荣 → AI 训练素材越丰富
```

---

## 3. 目标：要达成什么

### 3.1 北极星目标

> **让"创作一个交互场景"的门槛，从"懂流程图 + 懂条件分支 + 懂数据结构"降为"会描述需求"。**

衡量标准：一个完全不懂流程图的产品经理，通过自然语言向 AI Agent 描述需求，10 分钟内获得一个可运行、已验证、可发布的交互场景。

### 3.2 产品目标

| 目标          | 衡量指标                | 验收标准                              |
| ----------- | ------------------- | --------------------------------- |
| **场景多样性**   | 引擎支持的场景类型数          | 至少 5 种：人格测试、知识竞赛、问卷调研、剧情冒险、游戏社交卡片 |
| **AI 创作闭环** | Agent 从意图到可运行场景的成功率 | 90% 以上的提交能通过仿真验证并发布               |
| **用户参与度**   | 平均完成率               | 玩家进入场景后完成率 ≥ 75%                  |
| **结果消费率**   | 外部系统拉取结果的比例         | 60% 以上的测试结果被至少一个外部系统消费            |
| **嵌入覆盖**    | Embed SDK 接入站点数     | 任意 H5 页面可通过 `<script>` 嵌入         |

### 3.3 非目标

明确不做的事，避免范围蔓延：

- **不做即时聊天**：引擎负责"采集→计算→输出"，不做实时通讯。
- **不做用户身份系统**：用户身份由外部系统（如情缘杯的 userId）传入，引擎不维护账号体系。
- **不做内容审核**：AI 生成的内容审核由接入方负责，引擎只提供结果输出。
- **不做竞技排名**：所有场景的输出是"个人结论"，不涉及多人对抗。

---

## 4. 计划：分几步走

### 4.1 总体路线

```
Phase 1: 通用化基础          ← 当前阶段
    维度泛化 + 结算策略注册表 + NodeDefinition 注册表
        ↓
Phase 2: AI Agent 接入
    ScenarioDSL + FlowBuilder + SimulationValidator + Agent API
        ↓
Phase 3: 场景生态
    场景预设 + 可视化块组合 + 场景市场
        ↓
Phase 4: 规模化
    多租户 + 外部系统集成 + AI 创作质量提升
```

### 4.2 Phase 1：通用化基础（P0）

**目标**：把引擎从"剑网3门派测试专用"变为"场景无关的通用引擎"。

| 改造项                          | 现状                                 | 目标                                                                    |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| **维度泛化**                     | `PersonalityVector {x,y,z}` 写死 3 维 | 支持任意 N 维，`Vector = Record<AxisId, number>`                            |
| **结算策略注册表**                  | `findNearestSect` 硬编码门派匹配          | 策略可注册：`vector-nearest` / `threshold` / `count-tally` / `variable-map` |
| **结果原型抽象**                   | `SectAnchor` 绑定门派概念                | 通用 `ResultAnchor`，支持向量坐标、阈值条件、标签集合                                    |
| **NodeDefinition 注册表**       | 节点元信息散落 10+ 文件                     | 收敛到单一注册点：`{ type, component, processor, schema, icon, ... }`          |
| **vectorSpace.enabled 真正生效** | 字段存在但引擎不消费                         | enabled=false 时跳过向量计算                                                 |
| **i18n 去门派化**                | 翻译键用"门派"                           | 改为"锚点 / 原型"                                                           |

**验收**：新增一种节点类型只需 1 个文件注册；支持 2 维和 4 维场景；禁用向量引擎后能跑纯问卷场景。

### 4.3 Phase 2：AI Agent 接入（P0）

**目标**：AI Agent 能通过 API 端到端完成"理解需求 → 编排节点 → 验证 → 发布 → 结果持久化"。

| 组件                      | 职责                                                 |
| ----------------------- | -------------------------------------------------- |
| **ScenarioDSL**         | Agent 提交的声明式意图描述（做什么，不关心怎么连线）                      |
| **FlowBuilder**         | 把 ScenarioIntent 翻译为引擎可执行的 FlowData（nodes + edges） |
| **SimulationValidator** | 蒙特卡洛仿真验证：死路、死循环、结果分布失衡、节点覆盖率                       |
| **Agent API**           | `/api/agent/*` 端点：场景类型查询、能力清单、编译、迭代、发布、结果保存        |
| **test_sessions 表**     | 持久化玩家测试结果，供外部系统拉取                                  |

**Agent 工作流**：

```
Agent 收到需求
    ↓
GET /api/agent/scenario-types    ← 获取可用场景类型
GET /api/agent/node-capabilities  ← 获取节点能力清单
    ↓
生成 ScenarioIntent              ← Agent 声明：维度 + 锚点 + 步骤 + 结算策略
    ↓
POST /api/agent/compile           ← 提交编译
    ↓
后端：FlowBuilder.build() → SimulationValidator.validate()
    ↓
验证通过？
  否 → 返回 issues → Agent 修正 → 重新提交
  是 → 保存项目 → 返回 projectId
    ↓
POST /api/agent/projects/:id/publish  ← 发布
    ↓
玩家游玩 → POST /api/agent/sessions   ← 结果持久化
    ↓
外部系统 GET /api/agent/sessions?userIdentifier=xxx  ← 消费结果
```

**验收**：Agent 提交一个"游戏社交卡片"场景意图，10 分钟内获得可运行、已验证、已发布、可被搭子系统消费的 H5 场景。

### 4.4 Phase 3：场景生态（P1）

**目标**：从"AI 一次性创作"进化为"可复用、可组合、可分发"的场景生态。

| 组件         | 职责                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **场景预设系统** | 内置 5+ 场景模板：人格测试、知识竞赛、问卷、剧情冒险、游戏社交卡片。Agent 可基于模板快速起步。                                                    |
| **可视化块组合** | 结算页从"焊死布局"变为可组合块：badge / sprite / layered-texts / radar / bar-chart / tags-cloud / game-profile-summary |
| **节点类型扩展** | 新增节点：`minigame`（嵌入 H5 小游戏）、`rating`（评分滑块）、`multi-select`（多选标签）、`media`（音频/图片）                           |
| **场景市场**   | 已发布场景可被其他创作者 fork、改编、再发布                                                                                |

**验收**：创作者 fork 一个"剑网3人格测试"场景，改维度名和锚点，10 分钟发布为"MBTI 职场人格测试"。

### 4.5 Phase 4：规模化（P2）

**目标**：支撑多接入方、多场景并发的生产级运行。

| 能力            | 说明                                       |
| ------------- | ---------------------------------------- |
| **多租户隔离**     | 不同接入方（情缘杯、招聘系统、社区运营）的项目、数据、结果隔离          |
| **AI 创作质量提升** | 基于历史场景和结果数据，Agent 创作质量持续优化（A/B 测试、完成率优化） |
| **结果订阅**      | 外部系统可订阅"某用户完成测试"事件，实时推送                  |
| **性能优化**      | 高并发场景下的仿真器分布式执行、WebAssembly 加速           |

---

## 5. 方案：技术架构

### 5.1 四层架构

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 4: Agent 接入层                                       │
│  ScenarioDSL / Agent API / 场景预设                          │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: 创作抽象层                                        │
│  FlowBuilder / SimulationValidator / NodeDefinition Registry │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: 结算与渲染层                                       │
│  Settlement Strategy Registry / Visual Block System          │
├──────────────────────────────────────────────────────────────┤
│  Layer 1: 引擎核心层（现有）                                 │
│  GameEngine / vectorMath / simulator / nodeProcessors         │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 核心抽象

#### 5.2.1 维度泛化

```typescript
// 改造前：写死 3 维
interface PersonalityVector { x: number; y: number; z: number; }

// 改造后：任意 N 维
interface AxisDef { id: string; label: string; min: number; max: number; }
type Vector = Record<string, number>;
```

#### 5.2.2 结算策略注册表

```typescript
interface SettlementStrategy {
  id: string;  // 'vector-nearest' | 'threshold' | 'count-tally' | 'variable-map'
  compute(ctx: SettlementContext, config: SettlementNodeConfig): SettlementOutput;
}

// 内置策略
- vector-nearest: 向量最近邻匹配（当前门派匹配的泛化版）
- threshold:      阈值判定（按变量值分段）
- count-tally:    选项计数统计
- variable-map:   变量直接映射结果
```

#### 5.2.3 NodeDefinition 注册表

```typescript
interface NodeDefinition<TData extends BaseNodeData = BaseNodeData> {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  CanvasComponent: React.ComponentType<ZorronNodeProps>;
  InspectorForm: React.ComponentType<{ nodeId: string }>;
  PlayerStage: React.ComponentType<{ node: FlowNode; state: GameState }>;
  schema: z.ZodType<TData>;
  createDefault: (id: string) => TData;
  processor: (node: FlowNode, ctx: ProcessorContext) => NodeProcessResult;
  canConnectTo: (targetType: string) => boolean;
  isTerminal?: boolean;
}

// 新增节点只需 1 处注册
registerNode({
  type: 'minigame',
  label: '小游戏',
  // ... 所有元信息聚合在此
});
```

#### 5.2.4 可视化块组合

```typescript
interface VisualBlock {
  id: string;  // 'badge' | 'sprite' | 'layered-texts' | 'radar' | 'bar-chart' | ...
  component: React.ComponentType<BlockProps>;
  matches: (output: SettlementOutput) => boolean;
}

// 结算页按声明渲染
function SettlementStage({ node, output }) {
  const blocks = node.data.visualBlocks ?? ['badge', 'title', 'text-only'];
  return blocks.map(id => <Block id={id} output={output} />);
}
```

#### 5.2.5 ScenarioDSL

```typescript
interface ScenarioIntent {
  id: string;
  type: 'personality-test' | 'game-social-card' | 'quiz' | 'survey' | 'story-adventure' | 'custom';
  title: string;
  description: string;
  dimensions?: AxisDef[];                    // 向量型场景
  anchors?: ResultAnchor[];                   // 结果锚点
  steps: ScenarioStep[];                      // 交互步骤（声明式）
  settlement: SettlementConfig;               // 结算策略 + 可视化块
  output?: { persistResult: boolean; callbackUrl?: string; };
}

// Agent 声明"做什么"，FlowBuilder 负责"怎么连线"
const flowData = FlowBuilder.build(intent);
```

### 5.3 引擎执行模型（保持不变）

Agent 编排完成后，引擎执行模型保持现有设计：

| 特性           | 说明                                                         |
| ------------ | ---------------------------------------------------------- |
| **预编译流程图**   | Agent 在构建期生成完整 nodes/edges，运行时不可修改拓扑                       |
| **线性前进**     | 不支持回退/跳转，分支通过 logic 节点和 scene 选项实现                         |
| **透传节点同步递归** | logic/setter/calculator 立即执行，不停顿                           |
| **两阶段向量应用**  | choice.vector → pendingVector → calculator → currentVector |
| **观察者模式**    | 引擎通过 subscribe/notify 推送状态快照                               |

### 5.4 数据持久化

```sql
-- 现有表
projects (id, ownerId, title, data JSONB, isPublished, ...)

-- 新增表
test_sessions (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  user_identifier TEXT NOT NULL,     -- 外部用户标识
  settlement_result JSONB NOT NULL,  -- 完整结算结果
  metadata JSONB,                    -- 扩展数据（游戏画像等）
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 新增 API
POST /api/sessions                           -- 保存测试结果
GET  /api/sessions?userIdentifier=xxx        -- 按用户拉取
GET  /api/sessions?projectId=xxx             -- 按项目拉取
```

### 5.5 Agent API

```
GET  /api/agent/scenario-types          -- 可用场景类型 + schema
GET  /api/agent/node-capabilities       -- 节点能力清单
POST /api/agent/compile                 -- 意图 → FlowData → 验证 → 保存
POST /api/agent/compile/iterate         -- 基于验证结果迭代修正
POST /api/agent/projects/:id/publish    -- 发布场景
POST /api/agent/sessions                -- 保存玩家测试结果
GET  /api/agent/sessions                -- 外部系统拉取结果
```

---

## 6. 适用场景示例

以下场景都可以用 Zorron Engine 构建，只需 Agent 生成不同的 ScenarioIntent：

### 6.1 人格测试

```
维度：3 维（处世/立场/性情）
锚点：20 个人格原型 + 坐标 + 双层文案
步骤：10 个选择场景，每个 4 选项带向量增量
结算：vector-nearest（象限锁定 + 最近邻）
可视化：badge + sprite + layered-texts + radar
```

### 6.2 游戏社交卡片

```
维度：3 维（攻击/防御/机动）+ 游戏画像字段
锚点：10 个游戏门派 + 坐标 + 文案
步骤：8 个交互步骤（含游戏画像采集）
结算：vector-nearest + 游戏画像 metadata
可视化：badge + sprite + layered-texts + radar + game-profile-summary
输出：persistResult=true, callbackUrl=搭子系统 API
```

### 6.3 知识竞赛

```
维度：无（非向量型）
步骤：10 道单选题，每题有正确答案
结算：count-tally（统计答对数）
可视化：score-badge + bar-chart + text-only
输出：分数 + 评级
```

### 6.4 问卷调研

```
维度：无
步骤：8 个多选/单选场景
结算：variable-map（选项 → 标签映射）
可视化：tags-cloud + text-only
输出：用户标签画像
```

### 6.5 剧情冒险

```
维度：无（或 2 维善/恶）
锚点：5 个结局分支
步骤：15 个场景节点，含条件分支 + 碎片收集
结算：variable-map（按碎片组合映射结局）
可视化：ending-card + text-only
输出：到达的结局 + 路径轨迹
```

### 6.6 交互式视频

```
维度：无
步骤：5 个视频节点 + 选择节点交替
结算：variable-map（按选择组合映射结局）
可视化：video-ending + text-only
输出：观看的结局
```

### 6.7 H5 小游戏集成

```
维度：2 维（策略/反应）
步骤：3 个 minigame 节点（嵌入式小游戏）+ 选择节点
结算：threshold（按小游戏总分分段）
可视化：score-badge + game-profile-summary
输出：游戏能力画像
```

---

## 7. 验收标准

### 7.1 通用化验收（Phase 1）

| 验收项      | 标准                                |
| -------- | --------------------------------- |
| 新增节点类型   | 只需 1 个文件注册，不改其他文件                 |
| 新增结算策略   | 只需实现 SettlementStrategy 接口并注册     |
| 支持 2 维场景 | 改 vectorDimensions 配置，不改代码        |
| 支持 4 维场景 | 同上                                |
| 禁用向量引擎   | vectorSpace.enabled=false 时跳过向量计算 |

### 7.2 Agent 接入验收（Phase 2）

| 验收项           | 标准                             |
| ------------- | ------------------------------ |
| Agent 提交意图    | ScenarioIntent 通过 Zod 校验       |
| 自动构建 FlowData | FlowBuilder 输出合法 nodes + edges |
| 仿真验证          | 死路率 < 5%，无死循环，节点覆盖率 > 90%      |
| 迭代修正          | Agent 基于验证 issues 调整后通过验证      |
| 结果持久化         | 测试结果可通过 API 拉取                 |
| 外部消费          | 搭子系统可通过 API 获取用户测试结果           |

### 7.3 端到端验收

**场景**：为情缘杯搭子系统制作游戏社交卡片

```
1. Agent 收到需求："制作一个游戏社交卡片测试，输出可被搭子匹配系统消费的 profile"
2. Agent 调用 /api/agent/scenario-types，选择 'game-social-card'
3. Agent 生成 ScenarioIntent（3 维向量 + 10 门派锚点 + 8 交互步骤）
4. Agent 调用 /api/agent/compile，后端构建 + 验证通过
5. Agent 调用 /api/agent/projects/:id/publish，获取 playUrl
6. 玩家打开 playUrl，8 分钟完成测试，获得社交卡片
7. 前端调用 /api/agent/sessions 保存结果
8. 搭子系统调用 /api/agent/sessions?userIdentifier=u-001 拉取结果
9. 搭子系统将卡片适配为匹配 profile，用户进入匹配大厅
```

**验收**：全流程无需人工介入，10 分钟内从需求到可运行场景。

---

## 8. 风险与对策

| 风险               | 影响                                        | 对策                                      |
| ---------------- | ----------------------------------------- | --------------------------------------- |
| **AI 生成内容质量不稳定** | 场景逻辑有漏洞、文案低质                              | SimulationValidator 自动校验 + 人工抽检 + 反馈闭环  |
| **节点类型爆炸**       | 注册表臃肿，维护成本上升                              | 限定内置节点类型，自定义节点走插件机制                     |
| **维度泛化牵连面广**     | vectorMath / projection / VectorScene 都需改 | 分阶段：先泛化 vectorMath → 再泛化渲染 → 最后泛化编辑器 UI |
| **Agent API 滥用** | 恶意提交大量编译请求                                | 限流 + 鉴权 + 编译结果缓存                        |
| **结果数据隐私**       | 用户测试结果含敏感信息                               | 默认不公开，按字段 visibility 控制，外部拉取需授权         |

---

## 9. 相关文档

| 文档                                          | 说明                      |
| ------------------------------------------- | ----------------------- |
| [ADR-001](../adr/adr-001-react-flow.md)     | 节点编辑器选用 React Flow      |
| [ADR-002](../adr/adr-002-elysia-drizzle.md) | 后端选用 ElysiaJS + Drizzle |
| [API 契约](../architecture/api-contract.md)   | 后端 REST API 完整契约        |
| `types/flow.ts`                             | FlowData / 节点 / 向量类型定义  |
| `engine/GameEngine.ts`                      | 引擎状态机与节点执行器             |
| `engine/vectorMath.ts`                      | 向量数学工具库                 |
| `engine/simulator.ts`                       | 蒙特卡洛仿真器                 |

---

## 附录 A：术语表

| 术语                             | 定义                                          |
| ------------------------------ | ------------------------------------------- |
| **节点 (Node)**                  | 交互场景的最小构建单元。可以是选项、视频、小游戏、问答等任意交互形式。         |
| **流程图 (FlowData)**             | 节点和连线组成的 DAG，描述完整的交互流程。引擎预编译后执行。            |
| **维度 (Axis)**                  | 向量型场景的坐标轴。如人格测试的"处世/立场/性情"，游戏卡片的"攻击/防御/机动"。 |
| **锚点 (Anchor)**                | 结果空间中的参照点。玩家向量与锚点的距离决定匹配结果。通用化后不限于"门派"。     |
| **结算策略 (Settlement Strategy)** | 将玩家交互数据转化为最终结果的算法。如向量最近邻、阈值判定、选项计数。         |
| **可视化块 (Visual Block)**        | 结算页的可组合渲染单元。如徽章、立绘、分层文案、雷达图、条形图。            |
| **ScenarioIntent**             | Agent 提交的声明式意图描述，包含维度、锚点、步骤、结算配置。           |
| **FlowBuilder**                | 将 ScenarioIntent 翻译为引擎可执行 FlowData 的构建器。    |
| **SimulationValidator**        | 通过蒙特卡洛仿真验证 FlowData 编排质量的验证器。               |
| **test_session**               | 玩家完成测试后的结果记录，可被外部系统通过 API 拉取。               |
