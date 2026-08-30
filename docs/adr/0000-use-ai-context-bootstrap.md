# ADR 0000: 采用三层持久化 AI Context 架构

- **状态**: 接受 (Accepted)
- **日期**: 2026-08-25
- **决策者**: AI Architecture Team

---

## 1. 背景与上下文 (Context)

Zorron Engine 是一个涉及复杂节点流编排、DSL 生成、以及多模块前后端协同的通用交互引擎。
随着多 AI Agent（Antigravity、Claude Code、Cursor 等）协作参与开发，存在以下挑战：
1. **上下文丢失**：每次开启新会话时需反复解释 monorepo 架构与分层规则。
2. **规则漂移**：缺少自动化机制检测规范与实际代码演进的同步。
3. **检索 Token 浪费**：在无索引情况下，大范围全局 grep 消耗大量 Token 并降低推理准确率。

---

## 2. 决策内容 (Decision)

我们决定在该项目中建立并执行 **三层 AI Context Engineering 规范**：

1. **规则宪法层 (Rule Layer)**:
   - 保持根目录 AGENTS.md 与 CLAUDE.md 同步，且严格控制在 <=200 行以内。
   - 规范编写使用祈使句（Imperative），清晰说明严禁事项与分层架构约束。

2. **规范与设计文档层 (Spec / Architecture Layer)**:
   - 维持 docs/vision/、docs/architecture/、docs/adr/、docs/stories/ 的结构化文档。
   - 所有重大架构设计或库变更均需记录在 docs/adr/。

3. **基础设施与元数据层 (AI Context Infrastructure)**:
   - 在 .ai-context/profile.json 中固化项目技术画像与核心脚本映射。
   - 支持通过 Git Hooks / CI 持续检测文档健康度与规则一致性。

---

## 3. 产生的后果与影响 (Consequences)

- **积极影响**:
  - 极大提升 AI Agent 在跨会话编程中的首轮命中率。
  - 统一团队内不同 AI 编程工具（AGY / Claude / Cursor）的理解基准。
- **需要履行的维护**:
  - 新增核心模块或修改基础技术栈时，需同步维护 AGENTS.md 与 .ai-context/profile.json。
