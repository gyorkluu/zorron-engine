# Zorron Engine 改造进度

> 依据 `outputs/zorron-engine-gap-analysis.md` 的 P0/P1/P2 路线图依次实施
> 分支：`gen-phase1` · 基线 tag：`v2.0.0-galgame-m4`
> 更新时间：2026-08-30

## 总览

| 阶段 | 任务 | 状态 |
| :--- | :--- | :--- |
| P0 | 1. 提交工作区 M0~M4 改动 | ✅ 完成 |
| P0 | 2. NodeDefinition 注册表收敛 | ✅ 完成 |
| P0 | 3. GalGame 基础套件 | ✅ 完成 |
| P0 | 4. Character 角色资产 | ✅ 完成 |
| P0 | 5. 节点分组 / 注释 / 折叠 | ✅ 完成 |
| P0 | 6. 结算页可视化块 | ✅ 完成 |
| P0 | 7. i18n 硬编码清理 | 🟡 主体完成 |
| P1 | 8. 剧本 / 大纲视图 | ⬜ 未开始 |
| P1 | 9. 视频时间轴与热区编辑器 | ⬜ 未开始 |
| P1 | 10. 自动布局与对齐 | ⬜ 未开始 |
| P1 | 11. 草稿 / 发布分离 | ⬜ 未开始 |
| P1 | 12. 设备尺寸预览 | ⬜ 未开始 |
| P1 | 13. 资产库升级 | ⬜ 未开始 |
| P2 | 14. 节点资产市场 | ⬜ 未开始 |
| P2 | 15. 多人实时协作 | ⬜ 未开始 |
| P2 | 16. AI Copilot 强化 | ⬜ 未开始 |
| P2 | 17. 大图性能虚拟化 | ⬜ 未开始 |

**已完成 7 / 17 项**，累计 13 个提交、约 17,000 行改动。

---

## 已完成明细

### P0-1 提交工作区（`6a43c4b` … `ee7f501`）

9 个批次把此前散落在工作区的 M0~M4 成果入库，122 文件 / 13,550 行。

1. `feat(schema)` 共享契约包 flow-schema
2. `feat(server)` ffprobe 元数据管线 + save_slots
3. `feat(editor)` Stage 复合节点
4. `feat(player)` 双缓冲 + 四轨音频 + 引擎加固
5. `feat(player)` Backlog + 10 槽位存档
6. `feat(ai)` AI Copilot + Jimeng 资产生成
7. `feat(editor)` 编辑器 UI 打磨
8. `refactor(server)` 契约对齐
9. `docs` 架构规格书 / 差距分析 / 演示数据

附带：`.gitignore` 增加 `.workbuddy/`；基线验证 442 测试全绿。

### P0-2 注册表收敛（`fb26c74`）

- 新增 `engine/processors/`：`types.ts`、`passthrough.ts`、`narrative.ts`、`input.ts`、`settlement.ts`、`index.ts`
- NodeProcessor 契约：纯函数进、声明式结果出（state patch / variables / fragments / vectorDelta / flushVector / backlog / nextNodeId / finish）
- `NodeDefinition` 补上 `processor` / `PlayerStage` / `schema`；新增 `getNodeProcessor` / `getPlayerStage` / `getNodeSchema`
- GameEngine 删除 431 行 switch 死代码；顺带修掉旧节点帧泄漏
- PlayerShell 13 分支 switch → `getPlayerStage()`
- **净减 525 行**，242 测试仍全绿

### P0-3 GalGame 套件（`69521a9`）

- `engine/galgame.ts`：持久化设置、已读标记、按 `voiceDurationSec` 计算的自动节奏、`autoAdvance` / `skipStep`（拒绝替玩家作答输入节点）
- GameEngine：`frameHistory` + `goBack()` / `canGoBack()`（上限 50 帧）
- AudioManager：四轨 master 音量 `setTrackVolume()`
- 新增 `PlayerControlBar`（上一步 / AUTO / 长按 SKIP / 回顾 / 保存 / 读取 / 设置）与 `SettingsModal`
- PlayerShell 移除开发者入口与内部节点类型徽章；新增 Backspace / L 快捷键

### P0-4 角色资产（`116cc6a`）

- `Character` / `CharacterExpression` / `CharacterVoice` 模型 + `FlowData.characters`
- flow-schema `StageDialogue` 增加 `characterId` / `expression`
- projectStore 角色 CRUD，三处加载点恢复角色，随项目保存
- `CharacterPanel` 侧栏角色库、StageForm 角色+表情选择器、StageStage 立绘与名字色渲染

### P0-5 分组与便签（`afd2ce3`）

- `GroupNode`：React Flow parent/child 容器，折叠成 chip 并显示子节点数
- `NoteNode`：无 handle 便签，双击就地编辑
- FlowCanvas 监听折叠事件；`onNodeDragStop` 拖拽入组并换算坐标
- editorStore：`createGroup()` / `toggleGroupCollapse()`

### P0-6 结算页可视化块（`d6b5288`）

- `blocks/registry.ts` 契约与注册表（未知块类型跳过而非报错）
- `blocks/library.tsx` 八个内置块：badge、sprite、layered-texts、radar（手写 SVG）、bar-chart（双向居中）、tags-cloud、score-badge、other-endings
- `blocks/VisualBlockRenderer.tsx`
- SettlementStage 有声明块就用块渲染，否则回落到原布局，JX3 项目不受影响

### P0-7 i18n（`8fa3843`，主体）

- translations 新增四组约 55 键：`control.*`、`settings.*`、`character.*`、`group.*` / `note.*`
- 清理 PlayerControlBar、SettingsModal、CharacterPanel、GroupNode、NoteNode、分组/便签表单
- PlayerShell 已 0 中文

**遗留**：`InteractionStages.tsx`（46 行）与 `StageForm.tsx`（51 行）仍有硬编码中文，属既有技术债。
`SocialCardSummary.tsx` 的 296 处是门派名/诗句等业务文案，按 translations 的约定不属于 UI chrome。

---

## 工程健康度

| 检查 | 结果 |
| :--- | :--- |
| `tsc --noEmit`（3 个工作区包） | 0 error |
| flow-schema 测试 | 12 / 12 |
| editor 测试 | 242 / 242 |
| server 测试 | 188 / 188 |
| **合计** | **442 / 442** |

### 环境注意事项

Windows 下 vitest 并发跑全量会随机整体崩溃（无输出、exit 1），不是代码问题。
可靠做法：按目录或单文件分批跑，`--pool=forks` 比默认 threads 稳定，用 `tail` 查看输出。

---

## 剩余工作要点

**P1（创作者工作流）**

- **剧本/大纲视图**：章节→场景→节点树 + 纯文本剧本模式，与节点双向同步
- **时间轴与热区编辑器**：StageForm 内嵌视频标尺、在截帧上拉框画 hitbox、QTE 区间可视化
- **自动布局**：分层/树形布局 + 拖拽对齐参考线
- **草稿/发布分离**：`projects` 拆 `draftData` / `publishedData`，发布历史与回滚
- **设备预览**：编辑器内切换手机/平板/桌面尺寸
- **资产库升级**：tags / folder / 全局与项目级 / 引用反向索引

**P2（生态与规模）**

- **节点资产市场**：`node_assets` 表 + 实例化与覆盖
- **多人协作**：Yjs/CRDT + 光标 + 版本对比
- **AI Copilot**：角色对话生成、剧情连贯性校验、剧本文本转节点图
- **性能**：1000+ 节点虚拟化渲染

## 建议的下一步顺序

1. **P0-7 收尾** — 清理 InteractionStages 与 StageForm 的硬编码中文（约 1 小时）
2. **P1-12 设备预览** — 改动面小、创作者立刻感知得到
3. **P1-10 自动布局** — 大图可用性收益高
4. **P1-9 时间轴与热区** — 互动影游的核心编辑能力
5. **P1-8 剧本视图** — GalGame 创作者的主战场
6. **P1-11 草稿/发布分离** — 上线前必须具备
