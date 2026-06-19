# ADR-001: 节点编辑器选用 React Flow

## 状态

已接受 (Accepted)

## 背景

Zorron Engine 从 Vue 3 / Vue Flow 迁移到 React 18+ 生态后，必须重新选择节点编辑库。节点编辑器是产品的核心交互界面，需要支持：

1. 8 种自定义节点：`start`、`scene`、`logic`、`setter`、`calculator`、`settlement`、`video`、`link`。
2. 自定义连接桩（Handle）、边样式、节点拖拽与连接事件。
3. 与 React 18 严格模式、Zustand 状态管理、Tailwind 样式方案良好集成。
4. 与现有 Vue Flow 保存的数据结构尽可能兼容，降低迁移成本。
5. 支持 TypeScript 严格类型，便于 AI Agent 生成集成代码。

## 候选方案

| 方案 | 说明 | 优势 | 劣势 |
|---|---|---|---|
| **React Flow** (`@xyflow/react`) | React 官方节点编辑器库 | 社区最大、文档完善、TypeScript 优先、与 Vue Flow 同一家公司 | 部分高级功能需 Pro 授权 |
| **Rete.js** | 模块化节点编辑器框架 | 框架无关、插件丰富 | 学习曲线陡峭、React 集成需额外适配、社区小于 React Flow |
| **BaklavaJS** | 旧版 Zorron 曾评估的库 | 轻量 | 社区小、更新慢、不适合生产 |
| **自研 Canvas 引擎** | 基于 HTML5 Canvas 或 SVG 从零实现 | 完全可控 | 开发成本极高、可访问性差、重复造轮 |

## 决策

选用 **React Flow (`@xyflow/react`)** 作为迁移后的节点编辑器库。

## 理由

1. **React 原生集成**
   - React Flow 是 React 生态中最成熟的节点编辑器，与函数组件、Hooks、Zustand 配合自然。
   - 无需像 Rete.js 那样引入额外的渲染适配层。

2. **与 Vue Flow 数据兼容**
   - React Flow 与 Vue Flow 同属 xyflow 组织，核心数据模型（`nodes`、`edges`、`position`、`data`）一致。
   - 旧项目保存的 `project.json` 可直接被 React Flow 加载，只需重写节点 UI 组件。

3. **TypeScript 与开发者体验**
   - 完整类型定义，节点 `data` 可通过泛型约束，便于与 Zod Schema 对齐。
   - API 语义清晰（`useReactFlow`、`addNodes`、`onConnect`），团队上手成本低。

4. **可访问性与可维护性**
   - 内置键盘导航、ARIA 属性，符合现代 Web 应用标准。
   - 活跃的社区与商业支持，降低长期维护风险。

5. **AI Agent-Ready**
   - 清晰的模块边界与类型契约，便于 AI Agent 生成自定义节点组件和 Flow 操作逻辑。

## 影响

1. 需要重写 8 种 Vue Flow 自定义节点为 React Flow 节点组件。
2. 画布控制逻辑（缩放、导航、右键菜单、拖拽创建）需按 React Flow API 重新绑定。
3. 撤销重做、自动保存、导入导出逻辑需在 React Flow 数据模型上重新实现。

## 替代方案未选原因

- **Rete.js**：框架无关设计在 React 项目中显得过重，且 React 集成层社区维护不如 React Flow 原生稳定。
- **BaklavaJS**：社区活跃度与生产成熟度不足，不适合核心编辑器。
- **自研**：违背「胶水编程优先」原则，且会显著拉长迁移周期。

## 相关决策

- [ADR-002: 后端选用 ElysiaJS + Drizzle + PostgreSQL](./adr-002-elysia-drizzle.md)
