# Zorron Engine 现状与改造方向分析

> 目标：以节点为资产的互动剧情 GalGame 式交互编辑器
> 分析时间：2026-08-30

## 一、一句话结论

**底层引擎（数据契约、播放器内核、AI 编排链路）已经搭到 70% 骨架，但离“以节点为资产的 GalGame 编辑器”还差两个量级：**

1. **节点不是资产**——节点仍被当作一次性流程图里的对象，没有可复用、可版本化、可引用的“节点资产库”。
2. **产品不是编辑器**——当前界面更像“开发者 IDE 调试器”，缺少创作者工具应有的剧本视图、角色库、时间轴、自动布局、设备预览、一键发布等专业工作流。

下面按功能、架构、UI/UX、工程化四个维度展开。

---

## 二、当前进度真实定性

### 2.1 已落地的部分（代码在工作区中，尚未全部提交）

| 领域 | 落地情况 | 证据 |
|------|---------|------|
| 数据契约 SSOT | 70% | `packages/flow-schema` 定义了 Stage 四层复合节点（Carrier / Interaction / FX / Flow），但注册表 `NodeDefinition` 未消费 `processor/schema/PlayerStage` |
| 播放器内核 | 65% | 双缓冲视频、`AudioManager`、Backlog/SaveLoadModal、Guard 求值已存在 |
| AI Agent 闭环 | 60% | `/api/agent/*`、FlowBuilder、SimulationValidator 存在，但 AI 编排产物仍偏向“测试题”，GalGame 剧情编排支持弱 |
| 多租户 / A/B / Webhook | 50% | 数据表和路由存在，但属于后端骨架，编辑器端未充分暴露 |
| 场景市场 | 40% | 只有“整项目 Fork”，没有节点/片段级交易 |

### 2.2 一个关键事实：M0~M4 全部在工作区，未进 Git 历史

当前 `git status` 仍有 **50+ 文件未提交**，最后一个提交停留在 `feat(player): persist AI judgment to backend`（JX3 社交卡片相关）。

**影响：**
- 工作区一旦丢失，大量 Stage 复合节点、存档系统、ffprobe 媒体抽取等改动无法恢复。
- 多人协作、CI、回滚都无法基于真正的代码历史。
- **第一优先行动：分批提交并 push 到 `main`。**

---

## 三、核心差距矩阵：为什么还不是“节点即资产”

| 能力 | 现状 | 顶尖产品（参考） | 差距等级 |
|------|------|-----------------|---------|
| **节点复用** | 无节点库、无预制件、无子图 | Unreal Blueprint Macro Library / Figma Components / Articy Templates | 🔴 P0 |
| **节点版本** | 无 | Figma Component Version / Git 版本对比 | 🔴 P0 |
| **节点引用 vs 拷贝** | 拷贝（Fork 整项目） | Figma Instance / Unity Prefab Override | 🟡 P1 |
| **分组/注释/子流程折叠** | 无 | Unreal Blueprint Comment / Figma Section | 🔴 P0 |
| **角色/立绘/声线资产管理** | 无 | Ren'Py Character / Articy Entity | 🔴 P0 |
| **剧本/大纲视图** | 只有节点图 | Articy Flow / Twine Story Map / Ink Weave | 🔴 P0 |
| **时间轴/镜头调度** | Stage 有 timeRange，但无时间轴编辑器 | Premiere / Eko / 互动视频平台 | 🟡 P1 |
| **Auto/Skip/已读标记** | 规格书写了，代码里无实现 | 任何商业 GalGame / Ren'Py | 🔴 P0 |
| **回退一步** | 无 | 商业 GalGame Backlog 可跳转 | 🟡 P1 |
| **结算页可视化块** | 只有“查看结局” + 坐标 | Articy 报告 / 现代 H5 测试结果页 | 🟡 P1 |
| **草稿/发布快照分离** | `projects.data` 一个大 JSONB | Webflow / Framer 发布机制 | 🟡 P1 |
| **i18n 完整度** | 66 个文件含硬编码中文 | 任何面向国际的创作者工具 | 🟡 P1 |
| **移动端 UX** | 简陋 TAP 按钮 | 一线 GalGame 手游 UI | 🟡 P1 |
| **实时协作** | 无 | Figma / Canva / Google Docs | 🟢 P2 |

---

## 四、功能与架构层详细差距

### 4.1 “节点即资产”体系：当前为 0

当前 `NodeDefinition` 注册表只聚合了：

- `type / labelKey / descKey / icon / accent`
- `CanvasComponent / InspectorForm / createDefault`
- 可选 `canConnectTo / processor`

**缺少的注册表字段（与产品愿景 5.2.3 不一致）：**

- `schema`：未注册到 `NodeDefinition`，校验仍散落在 `flow-schema` 和前端 `types/flow.ts`。
- `PlayerStage`：未注册，`PlayerShell` 仍用巨型 switch 分发。
- `processor`：注释明确说明“Not consumed by the current GameEngine switch dispatch yet.”

**结果：** 新增一个节点类型仍要改 4~5 个文件（Canvas、Inspector、Player、GameEngine、types），不符合“一处注册”的承诺。

### 4.2 没有节点资产数据库

后端表结构：

- `projects.data`：一个 JSONB，存整张流程图。
- `assets`：媒体文件元数据，无标签、无文件夹、无“被哪些节点引用”的反向索引。
- 无 `node_assets / node_templates / blueprints / component_versions` 表。

**顶尖做法：** 每个可复用节点/片段应该有自己的资产记录，包含：

- 缩略图 SVG / 封面
- 分类标签、搜索关键词
- 版本号与变更日志
- 被引用次数（实例化次数）
- 作者、授权、Fork 链

### 4.3 场景模板 ≠ 节点资产

`TemplateLibrary.tsx` 只有 4 个内置模板：

- `start-scene` / `branch` / `loop` / `end`

这些是**场景片段模板**，不是**可维护、可引用、可版本化的节点资产库**。

### 4.4 GalGame 套件缺口：Auto/Skip/已读/回退均未实现

规格书 4.3 声称：

> Auto / Skip 引擎：遇到未读剧情智能制动；根据服务端抽取的 voiceDurationSec 精准步进。

代码中搜索 `autoMode / isAuto / skipRead / readNodes / skipSeen / 已读`：**0 匹配**。

已实现：

- Backlog 抽屉（只读历史）
- Save/Load 弹窗 + 快捷键 F5/F8
- `GameEngine.snapshot()` / `restore()`

未实现：

- Auto 播放模式
- Skip 已读
- 已读节点标记（Dexie IndexedDB 也没引入）
- 回退到上一句/上一节点
- 文字速度 / 语音开关 / 音量设置面板

### 4.5 播放器状态机仍是“只进不退”

`GameEngine` 暴露的方法：

- `start / selectChoice / advanceFromX / skipVideo / submitXxx / restart`

没有 `stepBack()`、`goToNode()`、`rollbackToLastDialogue()`。

在 GalGame 中，玩家至少应该能：

- 回退一句台词
- 从 Backlog 点击历史对话直接跳回该节点
- 已读剧情可以 Skip

### 4.6 播放器顶栏是开发者残留

`PlayerShell.tsx` 顶部浮层包含：

- “工程列表”
- “节点编辑器”
- `state.currentNodeType 节点`（暴露内部节点类型给玩家）

这些都是面向开发调试的入口，正式产品应该：

- 隐藏编辑器入口
- 用剧情化 HUD 替代“节点类型徽章”
- 提供设置/存档/历史/Auto/Skip 的玩家级按钮

---

## 五、UI/UX 层详细差距

### 5.1 编辑器：深色 IDE 风格，不像创作者工具

从 `tmp-chrome-editor-loaded.png` 可见：

- 左面板是资源树 + 节点列表，信息密度高但缺乏视觉引导。
- 节点在画布上密集堆叠，无分组框、无颜色编码、无子流程折叠。
- 右侧面板空态显示“未选中节点”，没有快速启动模板或欢迎引导。
- Minimap 存在，但没有缩略图导航、没有画布书签。

**对标方向：**

- **Figma / Framer**：清晰的图层树、组件库、属性面板、原型预览一体化。
- **Articy:draft**：左侧“资产库 + 实体库”，中间 Flow，右侧属性 + 本地化。
- **Unreal Blueprint**：注释框、对齐线、节点分组、可折叠子图。

### 5.2 检查器：表单堆砌，缺少专业工具

`StageForm.tsx` 612 行，把所有 Stage 字段堆在一个长表单里：

- 视频时间轴：无可视化标尺，只有 timeRange 数字输入。
- 热区绘制：无画面截帧上的拉框编辑器。
- 角色/立绘/声线：无角色库下拉，需要手动填 URL。
- 选项/分支：无 Guard 表达式自动补全、无变量下拉。
- 预览：无设备尺寸切换、无实时预览。

**应改造为：**

- 分 Tab：基础 / 媒体 / 交互 / 音效 / 特效 / 流程
- 角色选择器：从角色库选角色、表情、声线
- 时间轴：可视化标记对话点、分支窗口、QTE 区间
- 热区：在视频/图片上直接画框
- Guard 表达式：变量自动补全 + 实时求值测试

### 5.3 结算页：极其简陋

从 `tmp-react-player-scene2.png` 可见：

- 只有“查看结局” + 向量坐标 `-5.00 -9.00 -1.00` + “重新开始”。
- 没有角色立绘、没有徽章、没有雷达图、没有文案包装。
- 规格书里的 `VisualBlock`（badge / sprite / radar / bar-chart）未在玩家端落地。

**应改造为：**

- 结果卡片（Title + 角色立绘 + 文案）
- 雷达图 / 条形图可视化
- 社交分享图生成
- 结果历史 / 再测一次

### 5.4 移动端播放器：像 Demo，不像产品

从 `tmp-legacy-player-mobile.png` 可见：

- 顶部图片加载失败（broken image）
- 对话气泡是简单矩形，无角色名、无表情差分
- 选项是带“TAP”标签的按钮，无沉浸感
- 无 Auto/Skip/设置/存档入口

**应改造为：**

- 角色立绘层 + 背景层 + UI 层 分离
- 对话名片：角色头像 + 名字 + 台词 + 打字机光标
- 底部浮动菜单：Auto / Skip / Save / Load / Backlog / Settings
- 选项以剧情化气泡/热区呈现
- 支持横屏/竖屏、安全区适配

### 5.5 i18n 完整度低

统计：

- 66 个源文件含硬编码中文
- `SocialCardSummary.tsx`（1102 行）含 296 处中文
- `StageForm.tsx`（612 行）含 51 处中文
- `PlayerShell.tsx` 含 11 处中文（“保存”“读取”“回顾”“工程列表”“节点编辑器”等）

`localeStore.ts` 支持 zh/en，但编辑器中未见切换入口。

---

## 六、后端与工程化差距

### 6.1 数据模型：大 JSONB 的隐患

`projects.data` 存整张图。问题：

- 无法对节点做细粒度查询、搜索、权限控制。
- 无法做节点级 diff / 版本 / 协作锁定。
- 发布即改线上：没有 `publishedData` 与 `draftData` 分离。

**建议拆分：**

```text
projects: 元数据 + draftData + publishedData + publishedAt
nodes:    projectId, nodeId, type, data, position, version, assetRefs[]
edges:    projectId, sourceId, targetId, guard
node_assets: 可跨项目引用的节点模板
```

### 6.2 Asset 无标签与全局库

`assets` 表只有基础字段，无：

- tags / folderId
- usageCount / referencedBy
- global vs project-scoped flag
- 角色/立绘/声线/视频切片等资产类型语义

### 6.3 版本与协作

- 前端 `HistoryPanel` 依赖 `projectStore.pushSnapshot`，看起来是 localStorage/内存快照，没有后端持久化。
- 无草稿/发布分离、无回滚、无版本对比、无多人协作 CRDT。

### 6.4 测试与文档

- 测试覆盖：后端 188 用例、前端 242 用例、flow-schema 12 用例均通过。
- 但测试明显未覆盖：Auto/Skip、已读标记、回退、节点资产、移动端播放、角色库等缺失功能。
- 架构规格书声称 M0~M4 100% 完成，但 Auto/Skip/Dexie 等条目没有代码对应，存在“文档先行、实现缺位”。

---

## 七、改造路线图（按优先级）

### 🔴 P0：地基与产品化底线（3~4 个月）

1. **Git 提交整理**：把当前工作区 M0~M4 改动按 Conventional Commits 分批次提交、push、打 tag。
2. **完成 NodeDefinition 注册表收敛**：
   - 把 `schema`、`PlayerStage`、`processor` 真正注册到 `NodeDefinition`
   - `GameEngine` 与 `PlayerShell` 改为通过注册表 dispatch
   - 实现“新增一个节点类型只需一个 `registerNode()` 调用”
3. **补齐 GalGame 基础套件**：
   - Auto 模式（基于 voiceDurationSec / 打字机速度）
   - Skip 已读
   - 已读标记（Dexie IndexedDB）
   - 回退到上一句/上一节点
   - 设置面板（文字速度、音量、语音开关）
4. **角色/立绘/声线资产管理**：
   - 新增 Character 数据模型
   - 编辑器 Character Library
   - Stage 节点选择角色、表情、声线
5. **节点分组/注释/子流程折叠**：
   - React Flow `parentId` 分组
   - 注释节点（Sticky Note）
   - 子图节点 / Group 折叠
6. **结算页可视化块落地**：
   - badge / sprite / radar / bar-chart / game-profile-summary
   - 结果分享图生成
7. **i18n 清理**：
   - 把 66 个文件硬编码中文全部接入 `translations.ts`
   - 编辑器内增加语言切换入口

### 🟡 P1：创作者工作流完善（4~6 个月）

8. **剧本/大纲视图**：
   - 左侧大纲树（章节 → 场景 → 节点）
   - 文本剧本模式（纯文本编辑对话，自动同步到节点）
   - 分支图/条件路径高亮
9. **时间轴与热区编辑器**：
   - 视频时间轴标尺
   - 在视频截帧上画热区
   - QTE 区间可视化
10. **自动布局与对齐**：
    - 一键自动布局（分层/树形）
    - 对齐线 / 等距分布
    - 画布书签 / 缩略图导航
11. **草稿/发布分离**：
    - `projects.draftData` 与 `publishedData`
    - 发布历史与一键回滚
12. **设备预览**：
    - 编辑器内切换手机/平板/桌面尺寸
    - 真实 H5 二维码预览
13. **资产库升级**：
    - 标签、文件夹、搜索
    - 全局资产 vs 项目资产
    - 引用反向索引

### 🟢 P2：生态与规模化（6~12 个月）

14. **节点资产市场**：
    - `node_assets` 表
    - 节点上传、版本、Fork、引用统计
    - 实例化（Instance）与覆盖（Override）机制
15. **多人实时协作**：
    - Yjs / CRDT 同步
    - 光标、评论、版本对比
16. **AI Copilot 强化**：
    - 角色对话生成
    - 剧情连贯性校验
    - 从剧本文本自动生成节点图
17. **性能优化**：
    - 大图虚拟化
    - 1000+ 节点流畅编辑
    - 播放端资源预加载策略优化

---

## 八、TOP 10 立即行动清单

1. **提交代码**：把 `git status` 中 50+ 修改文件分批提交并 push。
2. **对齐规格与实现**：在架构规格书中删除/标注 Auto/Skip/Dexie 等未实现条目，或补齐代码。
3. **完成 NodeDefinition 注册表**：补齐 `schema / PlayerStage / processor`，重构 `GameEngine` dispatch。
4. **新增 Character 数据模型与编辑器面板**。
5. **实现 Auto / Skip / 已读 / 回退** 四个 GalGame 核心功能。
6. **播放器去开发者化**：隐藏“节点编辑器”“工程列表”入口，用剧情化 HUD 替换节点类型徽章。
7. **重做 SettlementStage**：至少支持 badge + sprite + radar + 文案包装。
8. **i18n 大清理**：抽离 66 个文件的硬编码中文。
9. **增加节点分组/注释/子流程折叠**。
10. **拆分 projects.data**：引入 `draftData / publishedData` 与独立 `nodes`/`edges` 表。

---

## 九、参考顶尖产品清单

| 类别 | 产品 | 最值得借鉴的点 |
|------|------|---------------|
| 节点编辑器 | Unreal Blueprints | 分组注释、对齐线、子图折叠、宏库 |
| 组件系统 | Figma Components | Instance / Override / 版本 / 库共享 |
| 叙事设计 | Articy:draft | 实体库、Flow、大纲、本地化、报告 |
| GalGame 引擎 | Ren'Py | 角色定义、脚本语言、历史/快进/回退、存档 |
| 互动视频 | Eko / Wirewax | 分支时间轴、热点编辑、 viewer  analytics |
| 低代码设计 | Webflow / Framer | 草稿/发布分离、响应式预览、设计系统 |
| 协作 | Notion / Canva | 实时协作、评论、版本历史、模板市场 |

---

## 十、总结

Zorron Engine 已经从“剑网3 门派测试工具”成功泛化为一个通用交互引擎的**技术骨架**，但在“以节点为资产的 GalGame 编辑器”这条路上，**真正的产品化工作才刚刚开始**。

当前最紧迫的不是加更多功能，而是：

1. **把已有的骨架提交入库**（防止工作区丢失）。
2. **把“节点”从流程图对象升级为可复用资产**（节点库、版本、引用、实例化）。
3. **把编辑器从开发者工具改造为创作者工具**（角色库、剧本视图、时间轴、设备预览、一键发布）。
4. **把播放器从 Demo 改造为商业级 GalGame 体验**（Auto/Skip/已读/回退/设置/精美结算）。

按 P0 → P1 → P2 的顺序推进，大约 12~18 个月可以追到一流产品的可用形态。
