# Zorron Engine 改造进度

> 依据 `outputs/zorron-engine-gap-analysis.md` 的 P0/P1/P2 路线图依次实施
> 分支：`gen-phase1` · 基线 tag：`v2.0.0-galgame-m4`
> 状态：**17 / 17 全部完成** · 更新时间：2026-08-31

## 总览

| 阶段 | 任务 | 状态 | 提交 |
| :--- | :--- | :--- | :--- |
| P0 | 1. 提交工作区 M0~M4 改动 | ✅ | `6a43c4b`…`ee7f501` |
| P0 | 2. NodeDefinition 注册表收敛 | ✅ | `fb26c74` |
| P0 | 3. GalGame 基础套件 | ✅ | `69521a9` |
| P0 | 4. Character 角色资产 | ✅ | `116cc6a` |
| P0 | 5. 节点分组 / 注释 / 折叠 | ✅ | `afd2ce3` |
| P0 | 6. 结算页可视化块 | ✅ | `d6b5288` |
| P0 | 7. i18n 硬编码清理 | ✅ | `8fa3843` `79cf736` |
| P1 | 8. 剧本 / 大纲视图 | ✅ | `efb5c02` |
| P1 | 9. 视频时间轴与热区编辑器 | ✅ | `6ac385e` |
| P1 | 10. 自动布局与对齐 | ✅ | `02bffe5` |
| P1 | 11. 草稿 / 发布分离 | ✅ | `b2935aa` |
| P1 | 12. 设备尺寸预览 | ✅ | `2530d94` |
| P1 | 13. 资产库升级 | ✅ | `826d8f0` |
| P2 | 14. 节点资产市场 | ✅ | `7eca93f` |
| P2 | 15. 多人实时协作 | ✅ | `a692fb6` |
| P2 | 16. AI Copilot 强化 | ✅ | `14bdb41` |
| P2 | 17. 大图性能虚拟化 | ✅ | `a060d1a` |

本轮共 **18 个提交**，均已推送 `gen-phase1`。

---

## P0 — 把家底立住

### 1. 提交工作区（`6a43c4b` … `ee7f501`）

9 个批次把散落在工作区的 M0~M4 成果入库，122 文件 / 13,550 行：

1. `feat(schema)` 共享契约包 flow-schema
2. `feat(server)` ffprobe 元数据管线 + save_slots
3. `feat(editor)` Stage 复合节点
4. `feat(player)` 双缓冲 + 四轨音频 + 引擎加固
5. `feat(player)` Backlog + 10 槽位存档
6. `feat(ai)` AI Copilot + Jimeng 资产生成
7. `feat(editor)` 编辑器 UI 打磨
8. `refactor(server)` 契约对齐
9. `docs` 架构规格书 / 差距分析 / 演示数据

附带 `.gitignore` 增加 `.workbuddy/`。

### 2. 注册表收敛（`fb26c74`）

- 新增 `engine/processors/`：`types.ts`、`passthrough.ts`、`narrative.ts`、`input.ts`、`settlement.ts`、`index.ts`
- NodeProcessor 契约：纯函数进、声明式结果出（state patch / variables / fragments / vectorDelta / flushVector / backlog / nextNodeId / finish）
- `NodeDefinition` 补上 `processor` / `PlayerStage` / `schema`，新增 `getNodeProcessor` / `getPlayerStage` / `getNodeSchema`
- GameEngine 删除 431 行 switch 死代码，顺带修掉旧节点帧泄漏
- PlayerShell 13 分支 switch → `getPlayerStage()`
- **净减 525 行**

### 3. GalGame 基础套件（`69521a9`）

- `engine/galgame.ts`：持久化设置、已读标记、按 `voiceDurationSec` 计算的自动节奏、`autoAdvance` / `skipStep`（拒绝替玩家作答输入节点）
- GameEngine：`frameHistory` + `goBack()` / `canGoBack()`（上限 50 帧）
- AudioManager：四轨 master 音量 `setTrackVolume()`
- 新增 `PlayerControlBar`（上一步 / AUTO / 长按 SKIP / 回顾 / 保存 / 读取 / 设置）与 `SettingsModal`
- PlayerShell 移除开发者入口与内部节点类型徽章

### 4. Character 角色资产（`116cc6a`）

- `Character` / `CharacterExpression` / `CharacterVoice` 模型 + `FlowData.characters`
- flow-schema `StageDialogue` 增加 `characterId` / `expression`
- projectStore 角色 CRUD，三处加载点恢复角色
- `CharacterPanel` 侧栏、StageForm 角色+表情选择器、StageStage 立绘与名字色渲染

### 5. 分组 / 注释 / 折叠（`afd2ce3`）

- `GroupNode`：React Flow parent/child 容器，折叠成 chip 并显示子节点数
- `NoteNode`：无 handle 便签，双击就地编辑
- FlowCanvas 监听折叠事件；`onNodeDragStop` 拖拽入组并换算坐标
- editorStore：`createGroup()` / `toggleGroupCollapse()`

### 6. 结算页可视化块（`d6b5288`）

- `blocks/registry.ts` 契约与注册表（未知块类型跳过而非报错）
- `blocks/library.tsx` 八个内置块：badge、sprite、layered-texts、radar（手写 SVG）、bar-chart（双向居中）、tags-cloud、score-badge、other-endings
- SettlementStage：有声明块就用块渲染，否则回落原布局，JX3 项目不受影响

### 7. i18n 清理（`8fa3843` + `79cf736`）

- translations 新增约 130 个键：control / settings / character / group+note / input-stage+appeal / stageForm / layout / script / asset / market / collab
- 清理 PlayerShell、PlayerControlBar、SettingsModal、CharacterPanel、GroupNode、NoteNode、InteractionStages、StageForm
- PlayerShell 已 0 中文；注释保留中文（属作者笔记，非 UI 文案）
- `SocialCardSummary.tsx` 的中文是业务文案（门派名、诗句），按 translations.ts 约定不在 i18n 范围

---

## P1 — 创作者工作流

### 8. 剧本 / 大纲视图（`efb5c02`）

- `lib/scriptParser.ts`：剧本文本格式（`# 标题` / `角色: 台词` / `> 选项 -> 目标`）解析为场景，转 Stage 节点图，并能从图反向渲染回可读剧本；畸形输入降级为单一旁白场景而不抛错
- `ScriptPanel`：导入当前画布为剧本、输入时实时场景/台词/选项统计、确认后生成节点图
- 12 个单元测试（含全角冒号、空输入、显式跳转目标、往返一致性）

### 9. 时间轴与热区编辑器（`6ac385e`）

- `StageTimelineEditor`：渲染真实媒体时长为轨道，两个可拖拽手柄，切片外区域变暗，标注 dialogue/choice/QTE 时刻；时长取自 ffprobe `assets.metadata.durationSec`，缺失时降级为估算并提示
- `HitboxCanvas`：在画面上拖拽绘制热区，可移动、四角缩放、Delete 删除；坐标为百分比，与播放器渲染一致
- `types/asset.ts` 补 `AssetMetadata`，前端终于能消费 M0 起的 ffprobe 输出

### 10. 自动布局与对齐（`02bffe5`）

- `lib/layoutTools.ts`：最长路径（Sugiyama 式）分层布局，每个节点位于最深父节点的右侧一列，带环检测；外加包围盒对齐与等距分布
- editorStore：`autoLayoutAll` / `alignSelected` / `distributeSelected`，每个都压入撤销快照
- `LayoutTools` 工具栏控件：选中不足 2 个（对齐）或 3 个（分布）时自动禁用
- 11 个单元测试

### 11. 草稿 / 发布分离（`b2935aa`）

- projects 表增 `publishedData`（jsonb 快照）与 `publishedAt`，`data` 作为工作副本
- 服务端：`publishProject` 快照工作副本并打时间戳；`revertToPublished` 恢复；`getPlayableProject` 改为返回发布快照（未发布过则回落 `data`，升级不破坏）
- 路由：`POST /api/projects/:id/publish` 与 `/:id/revert`
- 编辑器：发布先保存再快照，避免发布旧草稿；回滚仅在已发布后提供

### 12. 设备尺寸预览（`2530d94`）

- 平板 820×1180 预设（此前只有手机竖/横与桌面 16:9），由统一的 `DEVICE_VIEWPORTS` 表驱动边框与尺寸读数
- 可选安全区参考线（iOS 刘海与 home indicator 内边距）
- 顺带修两个真实缺陷（见下）

### 13. 资产库升级（`826d8f0`）

- assets 表增 `tags`（jsonb 数组）、`folder`、`scope`（project/global）、`usageCount`，迁移 0008
- `types/asset.ts` 同步字段
- AssetPanel：作用域切换（全部/本项目/全局库）+ 文件夹与标签筛选 chip 带计数；仅在库里真有文件夹或标签时才显示，小项目不增加视觉负担

---

## P2 — 生态与规模

### 14. 节点资产市场（`7eca93f`）

- `node_assets` 表（nodeType、data、category、tags、usageCount、isPublic，带租户隔离），迁移 0010
- 服务端：`listNodeAssets` 返回公开资产 + 自己的私有资产，按使用量排序；`createNodeAsset` 发布节点；`instantiateNodeAsset` 记录使用并返回待拷贝的载荷
- **实例化严格按值拷贝**：插入的节点是独立副本，不与模板产生关联
- 路由 `/api/node-assets`；编辑器 `NodeMarketPanel` 支持搜索、插入画布、发布选中节点；加载失败降级为内联提示

### 15. 多人实时协作（`a692fb6`）

- 服务端 `collabRoute`：`/collab/:projectId` WebSocket 房间，服务端持有名单、为连接分配稳定颜色，进出时广播 presence；图变更只中继给其他人（发起方已应用）
- 编辑器：`useCollaboration` 管理连接与 presence，`PresenceBar` 显示最多 4 个头像加溢出计数，未连接时不渲染
- **尽力而为**：socket 打不开（离线、代理不支持 WS）时编辑器照常工作
- 冲突解决目前是 last-write-wins，CRDT 留作后续

### 16. AI Copilot 强化（`14bdb41`）

- `lib/consistencyCheck.ts`：静态图审计，检查死胡同、不可达场景、指向缺失或空目标的选项、缺少开始节点、空分组
- settlement / link 属合法终止类型，便签整体忽略
- ScriptPanel 内按需执行，按严重级别着色并给出可玩/不可玩结论
- 10 个单元测试

### 17. 大图性能虚拟化（`a060d1a`）

- FlowCanvas 在节点数超过 60 时启用 React Flow 的 `onlyRenderVisibleElements`；低于阈值时不启用，避免视口记账反超收益
- 所有节点组件（Stage / Custom / Group / Note）此前已 memo，现在屏外节点根本不进渲染树，memo 才真正生效

---

## 工程健康度

| 检查 | 结果 |
| :--- | :--- |
| `tsc --noEmit`（flow-schema） | 0 error |
| `tsc --noEmit`（zorron-server） | 0 error |
| `tsc --noEmit`（zorron-editor） | 0 error |
| 新增单元测试 | 33 / 33 |
| 基线回归 | 442 / 442 |

新增测试文件：

- `src/lib/layoutTools.test.ts`（11）
- `src/lib/scriptParser.test.ts`（12）
- `src/lib/consistencyCheck.test.ts`（10）

数据库迁移：`0008_asset_library`、`0009_draft_publish`、`0010_node_marketplace`，均已生成并应用。

## 过程中修掉的真实缺陷

1. **预览崩溃**：PlayerShell 残留 `useNavigate()` 调用（import 已删但调用还在），且 `handleRestart` 的 `useCallback` 放在提前 return 之后，违反 hooks 顺序——两者叠加导致预览直接报错
2. **热区数据三方不一致**：契约 `StageHitboxSchema` 定义 `x/y/w/h`，编辑器却写 `rect/width/height`，播放器读 `rect || width`。现编辑器与播放器统一到契约，旧别名仍可读，存量项目不受影响
3. **前端从未消费 ffprobe**：`Asset` 类型缺 `metadata`，服务端 M0 起就在写 `durationSec`，直到时间轴功能才接上
4. **旧节点帧泄漏**：切节点时互斥字段未清理（P0-2 重构时顺带修）

## 环境注意事项

- Windows 下 vitest 并发跑全量会随机整体崩溃（无输出、exit 1），不是代码问题。可靠做法是按目录或单文件分批跑，用 `tail` 看输出
- Git Bash 下 `/tmp` 不可用（映射到不存在的 `I:\tmp`），批处理脚本用 stdin heredoc（`python - << 'PYEOF'`），不要写临时文件
- 批量改代码用 python heredoc 比逐个 Edit 高效得多，且可用 `assert` 校验锚点唯一性
- 改完 drizzle schema 必须跑 `npx drizzle-kit migrate`，否则后端测试全挂（PG 42703 列不存在）
- Elysia 的 `authPlugin` 必须在需要 `user` 的路由**之前** `.use()`
- `definitions.ts` 是 `.ts`，不能写 JSX；表单组件要放 `nodeForms.tsx`

## 遗留事项

- 全部工作仍在 `gen-phase1`，**尚未合并到主分支**
- 协作的 CRDT 冲突合并待做（目前 last-write-wins）
- `SocialCardSummary.tsx` 的业务文案按约定不做 i18n
