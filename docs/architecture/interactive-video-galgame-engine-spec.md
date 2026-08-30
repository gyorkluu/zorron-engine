# Zorron 现代 Web 互动影游与 AI GalGame 引擎架构规格书 (v2.0)

> **文档状态**：生效中（Living Architecture Document）  
> **单一事实来源**：`docs/architecture/interactive-video-galgame-engine-spec.md`  
> **同步要求**：后续开发中，若设计、数据契约或实现策略发生调整，**必须同步修订本文档**。

---

## 目录
1. [架构愿景与顶层设计](#一-架构愿景与顶层设计)
2. [数据契约层（SSOT 与 Hybrid Model）](#二-数据契约层ssot-与-hybrid-model)
3. [播放器内核与移动端渲染管线](#三-播放器内核与移动端渲染管线)
4. [状态机增量加固与 GalGame 核心套件](#四-状态机增量加固与-galgame-核心套件)
5. [编辑器创作者工具链与基础设施](#五-编辑器创作者工具链与基础设施)
6. [横切性保障与质量约束](#六-横切性保障与质量约束)
7. [分阶段实施里程碑 (M0 ~ M4)](#七-分阶段实施里程碑-m0--m4)

---

## 一、 架构愿景与顶层设计

### 1.1 目标定位
将 Zorron Engine 打造为**以节点为核心的现代 Web 互动影游 / AI GalGame 通用引擎**，支持任意 HTML 载体（双缓冲流视频、PixiJS WebGPU 2D 场景、Live2D/Spine、嵌入式 H5 小游戏、富文本视觉小说），具备手机/微信端零黑屏秒切、多轨独立音频心流、有限状态机（FSM）驱动分支以及完整的商业级 GalGame 游玩基础设施。

### 1.2 核心设计原则
1. **单一事实来源（SSOT）**：以共享 Zod 契约包为准，严禁前端 TS 与后端 Zod 手工镜像。
2. **渐进式增强（Progressive Enhancement）**：默认以纯 CSS/SVG 滤镜与原生 `<video>` 运行，PixiJS/WebGPU 仅作为可选高级后处理层。
3. **存量零破坏（Zero Breaking on Legacy）**：通过纯函数版本分发机制，存量 15 类扁平节点与新版 Stage 复合节点在同一工程共存。
4. **移动端优先（Mobile & WeChat First）**：严密处理单分支预热、同源 URL 去重、静音起播与手势音频解锁，严控内存与流量。

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               packages/flow-schema (SSOT)                                │
│           Zod-First Schema 2.0 ──► Hybrid Model ──► migrateV1ToV2 ──► Jexl Evaluator     │
└────────────────────────┬─────────────────────────────────────────┬───────────────────────┘
                         │ (z.infer TS Types)                      │ (Zod Validation)
                         ▼                                         ▼
┌─────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│         apps/zorron-editor              │   │            apps/zorron-server              │
│  - React Flow Coarse Types              │   │  - Asset ffprobe Metadata Pipeline         │
│  - Timeline & Hitbox Visual Editor      │   │  - Save Slots Cloud API (IndexedDB/Cloud)  │
│  - Preload Topology / Smart Recommender │   │  - AI Intent Compiler (agent.service.ts)   │
└────────────────────┬────────────────────┘   └────────────────────┬───────────────────────┘
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │          Player Core Runtime            │
                       │  - Mobile Dual Video Buffer (A/B Pool)  │
                       │  - WebAudio Unlock & 4-Track Mixing     │
                       │  - Pure CSS/SVG Filter (Pixi as Tier2)  │
                       │  - GameEngine (Guards + Snapshot + QTE) │
                       │  - GalGame Suite (Save/Backlog/Auto/Skip)│
                       └─────────────────────────────────────────┘
```

---

## 二、 数据契约层（SSOT 与 Hybrid Model）

### 2.1 共享契约包 `packages/flow-schema`
- **定位**：Monorepo 独立工作区包 `@zorron/flow-schema`。
- **模式**：Zod-First。后端 Elysia 直接引用 Schema 校验，前端通过 `z.infer<typeof ...>` 自动推导 TypeScript 类型。

### 2.2 混合判别联合模型（Hybrid Discriminated Union）
保留顶层 `type` 判别键做粗分类，`stage` 节点内部采用四层正交结构：

```typescript
// Stage 复合节点核心契约
export const StageNodeDataSchema = z.object({
  label: z.string().optional(),
  
  // 1. 舞台载体层 (Carrier)
  carrier: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('video'),
      url: z.string().url(),
      loop: z.boolean().default(false),
      timeRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(), // [startSec, endSec]
      playbackRate: z.number().default(1.0),
    }),
    z.object({
      type: z.literal('image'),
      url: z.string().url(),
      live2dConfigUrl: z.string().url().optional(),
    }),
    z.object({
      type: z.literal('html-embed'), // 小游戏、微互动 H5
      url: z.string().url(),
      sandbox: z.array(z.string()).default(['allow-scripts', 'allow-same-origin']),
    }),
  ]),

  // 2. 交互与UI层 (Interaction Layer)
  interaction: z.object({
    dialogue: z.object({
      speaker: z.string().optional(),
      text: z.string(),
      voiceUrl: z.string().url().optional(),
      voiceDurationSec: z.number().optional(), // 服务端 ffprobe 提取，供 Auto 步进
      typewriterSpeedMs: z.number().default(30),
    }).optional(),
    choices: z.array(z.object({
      id: z.string(),
      text: z.string(),
      targetNodeId: z.string(),
      guard: z.string().optional(), // Jexl 表达式
      dropFragmentId: z.string().optional(),
      vector: z.record(z.string(), z.number()).optional(),
    })).default([]),
    hitboxes: z.array(z.object({
      id: z.string(),
      rect: z.tuple([z.number(), z.number(), z.number(), z.number()]), // [x%, y%, w%, h%] (0~100)
      timeWindow: z.tuple([z.number(), z.number()]).optional(),       // 仅在视频特定秒数窗口触发
      action: z.enum(['jump', 'collect', 'trigger-fx']),
      targetNodeId: z.string().optional(),
    })).default([]),
    qteTimeoutSec: z.number().optional(),
    defaultTimeoutTargetNodeId: z.string().optional(),
  }).default({}),

  // 3. 视听与视效层 (Audio & FX Layer)
  fx: z.object({
    bgm: z.object({
      url: z.string().url(),
      fadeInMs: z.number().default(1000),
      volume: z.number().min(0).max(1).default(1.0),
    }).optional(),
    ambient: z.object({
      url: z.string().url(),
      volume: z.number().min(0).max(1).default(0.6),
    }).optional(),
    filter: z.enum(['none', 'glitch', 'heartbeat', 'bloom', 'vignette', 'black-white']).default('none'),
    cameraShake: z.object({
      intensity: z.number().min(1).max(10),
      triggerAtSec: z.number().min(0),
      durationMs: z.number().default(500),
    }).optional(),
  }).default({}),

  // 4. 状态与流转优化 (Flow Layer)
  flow: z.object({
    preloadNext: z.array(z.string()).default([]), // 优先预加载分支节点
    guards: z.record(z.string(), z.string()).optional(),
    mutations: z.array(z.object({
      variable: z.string(),
      operator: z.enum(['set', 'add', 'sub']),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })).default([]),
  }).default({}),
}).superRefine((data, ctx) => {
  // 跨字段校验: 视频 timeRange 与热区 timeWindow
  if (data.carrier.type === 'video' && data.carrier.timeRange) {
    const [start, end] = data.carrier.timeRange;
    if (start >= end) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'timeRange 起点必须小于终点', path: ['carrier', 'timeRange'] });
    }
    for (let i = 0; i < (data.interaction.hitboxes?.length ?? 0); i++) {
      const hb = data.interaction.hitboxes![i];
      if (hb.timeWindow) {
        const [hStart, hEnd] = hb.timeWindow;
        if (hStart < start || hEnd > end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Hitbox [${hb.id}] timeWindow 必须落在视频 timeRange [${start}, ${end}] 内`,
            path: ['interaction', 'hitboxes', i, 'timeWindow'],
          });
        }
      }
    }
  }
  // 跨字段校验: QTE 超时必须指定兜底分支
  if (data.interaction.qteTimeoutSec && !data.interaction.defaultTimeoutTargetNodeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '配置了 QTE 倒计时 (qteTimeoutSec) 时必须指定超时跳转目标节点 (defaultTimeoutTargetNodeId)',
      path: ['interaction', 'defaultTimeoutTargetNodeId'],
    });
  }
});
```

### 2.3 存量数据平滑迁移 (`migrateV1ToV2`)
读取侧统一经由纯函数将 `version: '1.0.0'` 的扁平节点升迁为 `2.0.0`，老数据项目 100% 可读可编辑：
- `type: 'video'` $\rightarrow$ `type: 'stage', carrier: { type: 'video' }`
- `type: 'scene'` $\rightarrow$ `type: 'stage', carrier: { type: 'image' }, interaction: { dialogue, choices }`
- `type: 'minigame'` $\rightarrow$ `type: 'stage', carrier: { type: 'html-embed' }`

### 2.4 表达式 DSL 收敛（安全沙箱 `jexl`）
废除字符串拼接和隐式条件，统一由 `@zorron/flow-schema` 导出基于 `jexl` 的安全表达式求值器，防止 XSS 和执行异常。

---

## 三、 播放器内核与移动端渲染管线

### 3.1 移动端双缓冲池机制（Dual Video Buffer）
1. **单分支预热限制**：移动端实例池固定为 2 个 `<video>`。通过拓扑权重仅预加载**概率最高的一条分支**（`readyState >= 3`），其余候选分支降级为 `preload="metadata"`。
2. **同源 URL 实例复用（URL Deduplication）**：同一视频的不同切片（`timeRange`），复用当前实例进行 `seek`，不抢占空闲池位。
3. **Instant-Cut 为默认**：切换瞬间直接将就绪的 B 路视频设为可见（Display Toggle），实现零黑帧切换。Cross-fade 作为可选增强开关。
4. **流量保护拦截**：检测 `navigator.connection?.saveData === true` 时禁用后台预热。

### 3.2 移动端自动播放与音频解锁协议
1. **静音起播（Muted-Autoplay）**：非手势自动切分支时，B 路视频一律带 `muted=true` 起播，确保不被浏览器拦截。
2. **手势音频解锁（WebAudio Touch Unlocker）**：首次用户手势交互瞬间执行 `Howler.ctx.resume()` 与空振荡器解锁，后续角色配音与主观音效统一交由 Web Audio 音轨输出。

### 3.3 分级视效后处理（Progressive FX Pipeline）
- **第一级（默认 CSS/SVG Filter 栈）**：零运行时依赖，性能极高：
  - 心跳/危机：`animation: heartbeat-pulse` + 边缘暗角 Vignette。
  - 故障撕裂：CSS `transform` 突变 + SVG `feColorMatrix` 色调分离。
  - 镜头震颤：GSAP Timeline / Tailwind Keyframe 震屏。
- **第二级（PixiJS v8 / WebGPU 扩展）**：作为可选插件挂载，初始化失败自动静默回退到第一级。

### 3.4 四轨独立调音台与 Audio Ducking
- 音频独立为 `BGM` / `Ambient` / `Voice` / `SFX` 四轨。
- 角色台词播放时触发 **Audio Ducking**：BGM 音量平滑下沉 30%，台词结束平滑恢复。

---

## 四、 状态机增量加固与 GalGame 核心套件

### 4.1 增量加固 `GameEngine`
保持现有状态单例与订阅机制，增量扩展三大能力：
1. **边级 Guard 拦截器**：执行 `safeEval(edge.guard, context)`。
2. **QTE 倒计时微状态机**：支持毫秒级 QTE 倒计时与超时自动跃迁。
3. **内存快照器**：`engine.snapshot()` 与 `engine.restore()`。

### 4.2 存档系统（Save / Load Architecture）
- **数据表 `save_slots`**：在服务端增加存档表（`userIdentifier`, `projectId`, `slotIndex`, `snapshot jsonb`, `schemaVersion`）。
- **快照数据包**：包含 `nodeId`, `variables`, `fragments`, `vector`, `history`, `bgmUrl`, `bgmPositionSec`, `backlogSnapshot`。

### 4.3 GalGame 标配套件
- **Backlog 环形缓冲区**：在 `enterNode` 统一采集台词与选项历史，上限 200 条。
- **已读标记（Dexie.js IndexedDB）**：记录用户已读 `nodeId` 集合。
- **Auto / Skip 引擎**：遇到未读剧情智能制动；根据服务端抽取的 `voiceDurationSec` 精准步进。

---

## 五、 编辑器创作者工具链与基础设施

### 5.1 媒体元数据抽取管线（ffprobe Pipeline）
在 `zorron-server` 资产上传接口（`POST /api/assets/upload`）中，引入 `ffprobe` 自动提取 `durationSec`, `width`, `height`, `fps`, `codec` 并持久化到 `assets.metadata`。

### 5.2 小游戏 Typed postMessage 协议
在 `@zorron/flow-schema` 中固化双向通信契约：
- `zorron:minigame:ready`
- `zorron:minigame:score`
- `zorron:minigame:complete`
- iframe 采用安全沙箱 `sandbox="allow-scripts allow-same-origin"`，禁止 `allow-top-navigation`。

### 5.3 检查器可视化增强
1. **视频时间轴标尺（Timeline Inspector）**：标记对话出现点、分支窗口与 QTE 区间。
2. **画面热区绘制器（Hitbox Overlay Drawer）**：支持在视频截帧上拉框定义 `hitboxes: [x%, y%, w%, h%]`。
3. **基于真实埋点的预加载推荐（Preload Analyzer）**：利用 `session_events` 历史数据自动补全高频分支的 `preloadNext`。

---

## 六、 横切性保障与质量约束

### 6.1 AI 编排链路同步（`agent.service.ts`）
升级 `ScenarioIntent` DSL 与 `flowBuilder.ts`，支持 AI Agent 直接通过声明式意图生成带有双缓冲视频、热区和预加载拓扑的 Stage 节点图。

### 6.2 可量化性能预算
- **分支切换延迟**：分支激活 $\rightarrow$ 画面渲染 P95 < 100ms。
- **黑屏帧率**：切换过程黑屏帧数 = 0。
- **网络消耗**：弱网模式下禁止多路预加载。

### 6.3 跨域（CORS）与资产配置
服务端静态目录与 S3 存储桶必须下发 `Access-Control-Allow-Origin: *`，播放器 `<video crossOrigin="anonymous">`，杜绝 Tainted Canvas 报错。

---

## 七、 分阶段实施里程碑 (M0 ~ M4)

| 里程碑 | 核心建设目标 | 产出物与交付标准 | 状态 |
| :--- | :--- | :--- | :--- |
| **M0: 地基工程 (Foundations)** | ① 创建 `@zorron/flow-schema` 共享包 (Zod-first)<br>② `migrateV1ToV2` 平滑升迁框架<br>③ 服务端 `ffprobe` 媒体元数据抽取管线<br>④ 小游戏 Typed `postMessage` 协议<br>⑤ Jexl 安全 Guard 表达式沙箱求值 | 共享包发布并在前后端依赖；存量老项目加载自动升迁为 V2 格式；12/12 契约单元测试全部通过。 | ✅ **100% 完成并验证** |
| **M1: 契约落地与 AI 编译器 (Schema 2.0 & AI)** | ① 前端切换共享 Schema 2.0，落地 Stage 复合四层表单 (`StageForm`)<br>② `hitbox`/`timeRange`/`preloadNext` 属性检查器<br>③ `agent.service.ts` ScenarioIntent 编译器同步升级<br>④ 蒙特卡洛多分支仿真器 (`simulationValidator`) 适配 Stage | 编辑器支持配置视频时间轴与热区画框，AI 助手可自动生成带分支预加载的视频图谱；前后端全栈验证通过。 | ✅ **100% 完成并验证** |
| **M2: 移动端视听内核与快照 (Player Core & Snapshots)** | ① 双 `<video>` 缓冲池（单分支预热 + Instant-Cut + 流量保护 + URL去重）<br>② `AudioManager` 升级（4 轨独立混音 + 首势 WebAudio 解锁 + Audio Ducking 台词压低 BGM）<br>③ `GameEngine` 增强（`processStage` + Guard 阻断 + Backlog 缓冲 + `snapshot()` / `restore()` 状态快照） | 手机/微信端切视频零黑屏，跨环境音频安全播放，状态随时可保存/回滚；28+14 套单元测试全部绿灯。 | ✅ **100% 完成并验证** |
| **M3: 视效与热区交互 (FX & Hotspots)** | ① 纯 CSS/SVG 滤镜栈（Glitch / Heartbeat / Vignette / Bloom / 屏幕震颤）<br>② 视频画面热区点击与 QTE 倒计时微状态机<br>③ 打字机配音流与多维度舞台交互 | 玩家可在画面中点击热区物品触发分支跳转与变量修改，支持 QTE 倒计时与电影级滤镜切换。 | ✅ **100% 完成并验证** |
| **M4: GalGame 套件与云端存档 (GalGame Suite)** | ① Backlog 剧情历史记录抽屉 (`BacklogModal.tsx`) 与语音复听<br>② `save_slots` 数据库表与 Drizzle 迁移（10 槽位/用户/项目）<br>③ 后端 REST 存档 API (`/api/projects/:id/slots`)<br>④ 前端 10 槽位存档/读档弹窗 (`SaveLoadModal.tsx`) 与快捷键 (F5/F8/L) | 完整具备商业级 GalGame / 互动影游的游玩体验，支持跨设备云端/本地存档与进度续玩。 | ✅ **100% 完成并验证** |

---

## 八、 测试验证与质量矩阵

- **Zod 单一事实来源测试** (`packages/flow-schema`): 12 / 12 测试全通。
- **服务端接口与数据库测试** (`apps/zorron-server`): 14 个测试套件，188 个集成测试全部通过。
- **前端状态机与组件测试** (`apps/zorron-editor`): 28 个测试套件，230 个组件/状态机测试全部通过。
- **Lightpanda E2E 浏览器验证**: 编辑器全流程（全能舞台节点载入、节点面板分类渲染、社交名片流转）验证无控制台异常。

