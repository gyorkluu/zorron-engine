# 剑网3 游戏社交名片应用 — 制作指南

> **文档定位**：手把手教你用 Zorron Engine 制作一个"剑网3游戏社交名片"应用，并将测试结果与情缘杯搭子匹配系统融合。
> **前置阅读**：[产品愿景](../vision/product-vision.md)
> **题目来源**：`D:\Users\Administrator\文档\自定义 Office 模板\题目设计.xlsx`
> **最后更新**：2026-07-11

---

## 0. 概述

### 0.1 这个应用做什么

玩家进入一个交互式 H5 测试，完成以下环节：

1. **基本信息采集**（8 题）：区服、心法、体型、性别、主要玩法、PVP/PVE/PVX 水平自评
2. **段位选择**（1 题）：手动选择自己的段位档位（13 以下 / 13-15 / 15+）
3. **游戏观题目**（5 题）：每题选项有分值，累计后分为天使/一般/暴躁三档
4. **兴趣选择**：13 个标签最多选 5 个
5. **MBTI + 星座**：MBTI 直接作为人格画像，星座单选

最终生成一张**游戏社交名片**，包含：基本信息 + 段位 + 游戏观等级 + 兴趣标签 + MBTI + 星座。

> **人格维度直接用 MBTI 代替**，不再设置 7 道个性题目。MBTI 既是人格画像，也是名片展示核心。

### 0.2 核心设计原则

> **不使用向量匹配。** 游戏观题目用计分制分类，段位用手动选择，MBTI 直接填选。

| 题目类型 | 结算方式 | 对应 zorron 策略 |
| --- | --- | --- |
| 基本信息（8 题） | 选项 → 变量直接映射 | `variable-map` |
| 段位选择（1 题） | 选项 → 变量直接映射 | `variable-map` |
| 游戏观题目（5 题） | 选项分值累加 → 分档 | `count-tally` |
| 兴趣/MBTI/星座 | 选项 → 变量直接映射 | `variable-map` |

---

## 1. 题目设计详解

### 1.1 基本信息 + 段位 + 兴趣 + MBTI + 星座

来自"设计表"的定义：

| 字段 | 类型 | 采集方式 |
| --- | --- | --- |
| 区服 | 单选 | 下拉选项（双线一区/念破等） |
| 心法 | 单选 | 下拉选项（28 个心法） |
| 体型 | 单选 | 成男/成女/正太/萝莉 |
| 性别 | 单选 | 男/女 |
| 主要玩法 | 多选 | PVP/PVE/PVX |
| PVP 水平 | 评分 | 1-10 |
| PVE 水平 | 评分 | 1-10 |
| PVX 水平 | 评分 | 1-10 |
| **段位** | **单选** | **13 以下 / 13-15 / 15+** |
| 兴趣 | 多选（最多5） | 竞技场/吃鸡/攻防/野外/截图/打本/开荒/家园/挂机/复制/插旗/摸宠/成就 |
| MBTI | 单选 | 16 种人格（INTJ/INTP/...） |
| 星座 | 单选 | 12 星座 |

> **段位**为手动选择，替代原 PVP 门派知识题。三档对应：13 以下（新手/休闲）、13-15（中端）、15+（高端）。

### 1.2 游戏观题目（5 题，来自"价值观测试题库"）

每题选项有分值，累计后分档。

| 题号 | 问题摘要 | 选项数 | 选项 → 分值 | 备注 |
| --- | --- | --- | --- | --- |
| 1 | 野外被人打到怎么办 | 4 (ABCD) | A-D 递增 | 游戏包容度递增 |
| 2 | 打33队友甩锅怎么办 | 4 (ABCD) | A=5/B=3/C=1/D=0 | 0-5天使/6-15一般/16-25暴躁 |
| 3 | 被埋复活点怎么办 | 4 (ABCD) | 同上分值体系 | — |
| 4 | 大战速刷队有人不认路 | 4 (ABCD) | 同上分值体系 | — |
| 5 | 翻车团即将散团怎么办 | 4 (ABCD) | 同上分值体系 | — |

**游戏观总分计算**：

```
总分 = 题目1分值 + 题目2分值 + 题目3分值 + 题目4分值 + 题目5分值
0-5分  → 天使
6-15分 → 一般
16-25分 → 暴躁
```

> 游戏观得分参与匹配系统评分（权重 0.35）。

### 1.3 MBTI 人格画像

MBTI 直接作为人格维度，16 种人格类型：

| 大类 | 类型 | 特征 |
| --- | --- | --- |
| 分析家 | INTJ/INTP/ENTJ/ENTP | 战略思考、逻辑驱动 |
| 外交官 | INFJ/INFP/ENFJ/ENFP | 共情力强、价值驱动 |
| 守护者 | ISTJ/ISFJ/ESTJ/ESFJ | 稳定可靠、秩序导向 |
| 探索家 | ISTP/ISFP/ESTP/ESFP | 灵活应变、行动导向 |

> MBTI 在名片中作为人格画像核心展示，不参与匹配评分（仅展示）。

---

## 2. zorron-engine 场景设计

### 2.1 流程图

```
start（开场）
    ↓
────── 基本信息 ──────
scene_01：区服选择（下拉）
scene_02：心法选择（下拉，28个心法）
scene_03：体型选择（4选项）
scene_04：性别选择（2选项）
scene_05：主要玩法（3选项多选：PVP/PVE/PVX）
scene_06：PVP 水平自评（1-10 评分）
scene_07：PVE 水平自评（1-10 评分）
scene_08：PVX 水平自评（1-10 评分）
    ↓（每个 scene 后接 setter 写入变量）
────── 段位选择 ──────
scene_09：段位选择（3选项：13以下/13-15/15+ → 写入变量 rank_tier）
    ↓
────── 游戏观题目 ──────
scene_10：游戏观题1 — 被打到（4选项 → 加分到变量 game_view_score）
scene_11：游戏观题2 — 队友甩锅（4选项 A=5/B=3/C=1/D=0 → 加分）
scene_12：游戏观题3 — 被埋复活点（4选项 → 加分）
scene_13：游戏观题4 — 有人不认路（4选项 → 加分）
scene_14：游戏观题5 — 翻车团散团（4选项 → 加分）
    ↓（每个 scene 后接 setter 累加 game_view_score）
────── 兴趣 + MBTI + 星座 ──────
scene_15：兴趣选择（13选项多选，最多5 → 写入变量 interests）
scene_16：MBTI 选择（16选项 → 写入变量 mbti）
scene_17：星座选择（12选项 → 写入变量 zodiac）
    ↓
settlement：结算
    ├── 策略：variable-map
    ├── 基本信息：区服/心法/体型/性别/玩法/水平
    ├── 段位：13以下/13-15/15+
    ├── 游戏观等级：天使/一般/暴躁
    ├── 人格画像：MBTI
    └── 兴趣 + 星座
    ↓
结算页展示：社交名片
    ↓
按钮：「重新测试」/「进入搭子匹配」
```

### 2.2 全局变量定义

在 zorron-editor 的 Variables 面板中定义以下变量：

```typescript
variables = {
  // 基本信息
  server: "",           // 区服
  mindset: "",          // 心法
  body_type: "",        // 体型
  gender: "",            // 性别
  primary_mode: "",     // 主要玩法（pvp/pve/pvx）
  pvp_level: 0,         // PVP 水平 1-10
  pve_level: 0,         // PVE 水平 1-10
  pvx_level: 0,         // PVX 水平 1-10

  // 段位（手动选择）
  rank_tier: "",        // 13以下 / 13-15 / 15+

  // 游戏观（分值累加）
  game_view_score: 0,   // 0-25

  // 兴趣
  interests: "",        // 逗号分隔

  // MBTI + 星座
  mbti: "",             // 4 字符（如 INTJ）
  zodiac: "",            // 星座
}
```

### 2.3 结算策略选择

本应用**不使用 vector-nearest 策略**，使用 `variable-map` 策略：

```typescript
// settlement 节点配置
{
  strategy: 'variable-map',
  // variable-map 策略：按变量值直接映射结果
  resultMapping: [
    {
      resultId: 'social-card',
      title: '游戏社交名片',
      description: '你的专属社交名片已生成',
    }
  ],
  visualBlocks: [
    'social-card-summary',  // 自定义块：展示完整名片
    'mbti-portrait',        // 自定义块：MBTI 人格画像
    'game-view-tier',       // 自定义块：游戏观等级
    'rank-tier',            // 自定义块：段位
  ],
  buttons: [
    { label: '重新测试', action: 'restart' },
    { label: '进入搭子匹配', action: 'link', url: 'http://localhost:5174/matching' }
  ]
}
```

### 2.4 VectorSpace 配置

**不启用向量空间**。在 VectorSpaceSettings 中设置 `enabled: false`。

---

## 3. 制作步骤

### 3.1 创建项目

1. 打开编辑器 `http://localhost:5173`
2. 点击「新建项目」
3. 标题填 `剑网3游戏社交名片`
4. 描述填 `基于题目设计的游戏社交名片测试`

### 3.2 关闭向量空间

1. 点击画布空白处
2. 在 Inspector 底部 VectorSpaceSettings 中：
   - `enabled`：**关闭**

### 3.3 配置全局变量

在 Variables 面板添加 2.2 节列出的全部变量（共 13 个）。

### 3.4 创建基本信息采集节点（8 个）

创建 8 个 scene 节点用于基本信息采集：

**scene_01（区服选择）**：
- dialogue: "请选择你的区服"
- choices: 双线一区/念破/...

**scene_02（心法选择）**：
- dialogue: "请选择你的心法"
- choices: 28 个心法选项

**scene_03（体型）**：
- dialogue: "请选择你的体型"
- choices: 成男/成女/正太/萝莉

**scene_04（性别）**：
- dialogue: "请选择你的性别"
- choices: 男/女

**scene_05（主要玩法）**：
- dialogue: "你的主要玩法是？（可多选）"
- choices: PVP/PVE/PVX
- 用 multi-select 节点

**scene_06-08（水平自评）**：
- 用 rating 节点（1-10 分滑块）
- 分别采集 pvp_level / pve_level / pvx_level

每个 scene 后接 setter 节点写入变量。

### 3.5 创建段位选择节点（1 个）

**scene_09（段位选择）**：

```
dialogue: "请选择你的段位"
speaker: "社交名片"
choices:
  - id: A, text: "13 以下"  → setter: rank_tier = "13以下"
  - id: B, text: "13-15"    → setter: rank_tier = "13-15"
  - id: C, text: "15+"      → setter: rank_tier = "15+"
```

> 段位为手动选择，替代原 PVP 门派知识题。玩家根据自身实际段位选择对应档位。

### 3.6 创建游戏观题目节点（5 个）

每题选项有分值，用 setter 累加 `game_view_score`。

**scene_10（游戏观题1：被打到）**：
```
dialogue: "当你在野外做任务时，突然有人不小心打到了你，你会怎么做？"
choices:
  - id: A, text: "不能忍，直接打回去"     → setter: game_view_score += 5
  - id: B, text: "地图打一个问号"         → setter: game_view_score += 3
  - id: C, text: "扣白字QAQ，继续任务"    → setter: game_view_score += 1
  - id: D, text: "跑到安全的地方关阵营"   → setter: game_view_score += 0
```

> setter 节点用 `operator: 'add'` 累加分值。

**scene_11-14**：相同模式，5 题分值累加到 `game_view_score`（0-25）。

### 3.7 创建兴趣 + MBTI + 星座节点（3 个）

**scene_15（兴趣选择）**：
- 用 multi-select 节点
- 13 个选项：竞技场/吃鸡/攻防/野外/截图/打本/开荒/家园/挂机/复制/插旗/摸宠/成就
- 最多选 5
- 结果写入 `interests` 变量（逗号分隔）

**scene_16（MBTI 选择）**：
- 16 个选项：INTJ/INTP/ENTJ/ENTP/INFJ/INFP/ENFJ/ENFP/ISTJ/ISFJ/ESTJ/ESFJ/ISTP/ISFP/ESTP/ESFP
- 选项直接写入 `mbti` 变量
- 作为人格画像核心展示

**scene_17（星座）**：
- 12 个选项：白羊/金牛/双子/巨蟹/狮子/处女/天秤/天蝎/射手/摩羯/水瓶/双鱼

### 3.8 创建结算节点

```typescript
{
  type: 'settlement',
  data: {
    label: '社交名片生成',
    strategy: 'variable-map',
    resultMapping: [{
      resultId: 'social-card',
      title: '你的游戏社交名片',
      description: '名片已生成，可进入搭子匹配系统'
    }],
    visualBlocks: ['social-card-summary'],
    buttons: [
      { label: '重新测试', action: 'restart' },
      { label: '进入搭子匹配', action: 'link', url: 'http://localhost:5174/matching' }
    ]
  }
}
```

### 3.9 连线

按流程图（2.1 节）连接所有节点：

1. start → scene_01 → ... → scene_17 → settlement
2. 每个 scene 的选项 → setter → 下一个 scene
3. 确保所有路径最终到达 settlement

### 3.10 保存与仿真验证

1. 保存项目
2. 运行蒙特卡洛仿真（200 次）
3. 检查：
   - 死路率 < 5%
   - 无死循环
   - 游戏观分数分布：天使/一般/暴躁三档都有覆盖
   - 所有变量最终都有非空值

---

## 4. 结算页定制

### 4.1 社交名片展示块

注册自定义可视化块 `social-card-summary`：

```tsx
// SocialCardSummaryBlock.tsx
function SocialCardSummaryBlock({ output }: BlockProps) {
  const m = output.metadata
  return (
    <div className="space-y-4">
      {/* 基本信息区 */}
      <div className="rounded-lg border border-teal-500/30 bg-slate-900/50 p-4">
        <h3 className="text-teal-300 font-bold mb-2">基本信息</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span>区服</span><span>{m.server}</span>
          <span>心法</span><span>{m.mindset}</span>
          <span>体型</span><span>{m.body_type}</span>
          <span>性别</span><span>{m.gender}</span>
          <span>主要玩法</span><span>{m.primary_mode}</span>
        </div>
      </div>

      {/* 游戏水平区 */}
      <div className="rounded-lg border border-teal-500/30 bg-slate-900/50 p-4">
        <h3 className="text-teal-300 font-bold mb-2">游戏水平</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <span>PVP: {m.pvp_level}/10</span>
          <span>PVE: {m.pve_level}/10</span>
          <span>PVX: {m.pvx_level}/10</span>
        </div>
      </div>

      {/* 段位区 */}
      <div className="rounded-lg border border-amber-500/30 bg-slate-900/50 p-4">
        <h3 className="text-amber-300 font-bold mb-2">段位</h3>
        <div className="text-lg font-bold">
          {m.rank_tier === '13以下' ? '13 以下（新手/休闲）' :
           m.rank_tier === '13-15' ? '13-15（中端）' :
           m.rank_tier === '15+' ? '15+（高端）' : m.rank_tier}
        </div>
      </div>

      {/* MBTI 人格画像区 */}
      <div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-4">
        <h3 className="text-purple-300 font-bold mb-2">MBTI 人格画像</h3>
        <div className="text-2xl font-bold text-purple-200">{m.mbti}</div>
        <div className="text-sm text-purple-400 mt-1">
          {getMbtiDescription(m.mbti)}
        </div>
      </div>

      {/* 游戏观等级 */}
      <div className="rounded-lg border border-orange-500/30 bg-slate-900/50 p-4">
        <h3 className="text-orange-300 font-bold mb-2">游戏观等级</h3>
        <div className="text-lg font-bold">
          {m.game_view_score}分 — {
            m.game_view_score <= 5 ? '天使' :
            m.game_view_score <= 15 ? '一般' : '暴躁'
          }
        </div>
      </div>

      {/* 兴趣 + 星座 */}
      <div className="rounded-lg border border-teal-500/30 bg-slate-900/50 p-4">
        <h3 className="text-teal-300 font-bold mb-2">其他</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span>兴趣</span><span>{m.interests}</span>
          <span>星座</span><span>{m.zodiac}</span>
        </div>
      </div>
    </div>
  )
}

// MBTI 类型描述
function getMbtiDescription(mbti: string): string {
  const descriptions: Record<string, string> = {
    INTJ: '建筑师 · 战略思考者',
    INTP: '逻辑学家 · 理性分析',
    ENTJ: '指挥官 · 天生领袖',
    ENTP: '辩论家 · 创新思维',
    INFJ: '提倡者 · 理想主义',
    INFP: '调停者 · 诗意善良',
    ENFJ: '主人公 · 魅四射',
    ENFP: '竞选者 · 热情洋溢',
    ISTJ: '物流师 · 稳重可靠',
    ISFJ: '守卫者 · 温暖守护',
    ESTJ: '总经理 · 秩序维护',
    ESFJ: '执政官 · 热心助人',
    ISTP: '鉴赏家 · 实践达人',
    ISFP: '探险家 · 艺术气质',
    ESTP: '企业家 · 行动派',
    ESFP: '表演者 · 享乐主义',
  }
  return descriptions[mbti] ?? ''
}
```

---

## 5. 结果持久化与融合

### 5.1 保存测试结果

玩家完成后，将 SettlementResult 中的 metadata 保存：

```typescript
async function saveTestResult(userId: string, result: SettlementResult) {
  await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: '你的项目ID',
      userIdentifier: userId,
      settlementResult: result,
      metadata: {
        // 基本信息
        server: result.metadata.server,
        mindset: result.metadata.mindset,
        body_type: result.metadata.body_type,
        gender: result.metadata.gender,
        primary_mode: result.metadata.primary_mode,
        pvp_level: result.metadata.pvp_level,
        pve_level: result.metadata.pve_level,
        pvx_level: result.metadata.pvx_level,
        // 段位
        rank_tier: result.metadata.rank_tier,
        // 游戏观
        game_view_score: result.metadata.game_view_score,
        game_view_tier: result.metadata.game_view_score <= 5 ? 'angel' :
                        result.metadata.game_view_score <= 15 ? 'normal' : 'aggressive',
        // 兴趣 + MBTI + 星座
        interests: result.metadata.interests,
        mbti: result.metadata.mbti,
        zodiac: result.metadata.zodiac,
      },
    }),
  })
}
```

### 5.2 适配器转换（zorron → 情缘杯）

将 zorron 名片转换为情缘杯的 CreateProfileInput：

```typescript
function zorronToProfile(
  m: ZorronMetadata,           // zorron 名片 metadata
  characterId: string,         // 情缘杯已认证角色 ID
): CreateProfileInput {
  // 游戏观分值 → 搭子系统的五题答案映射
  // 天使(0-5)：沟通温和、包容度高
  // 一般(6-15)：中等
  // 暴躁(16-25)：激进、直接
  const tier = m.game_view_score <= 5 ? 'angel' :
               m.game_view_score <= 15 ? 'normal' : 'aggressive'

  const tierToAnswers = {
    angel: {
      goal: 'ranked',           // 稳定名次
      decision: 'suggest',      // 提建议
      losingStreak: 'pause',    // 缓一缓
      communication: 'brief',   // 简短关键信息
      mistakeHandling: 'comfort', // 先安慰
    },
    normal: {
      goal: 'ranked',
      decision: 'confirm',      // 确认后执行
      losingStreak: 'review',   // 复盘
      communication: 'text',    // 文字为主
      mistakeHandling: 'remind', // 当场提醒
    },
    aggressive: {
      goal: 'champion',         // 冠军
      decision: 'execute',      // 立刻执行
      losingStreak: 'change',    // 换阵容
      communication: 'high_callout', // 高频报点
      mistakeHandling: 'post_review', // 赛后复盘
    },
  }

  const answers = tierToAnswers[tier]

  return {
    characterId,
    primaryMode: m.primary_mode as 'pvp' | 'pve' | 'pvx',
    pvpLevel: m.pvp_level,
    pveLevel: m.pve_level,
    pvxLevel: m.pvx_level,
    availability: [],  // 需额外采集或从名片推导
    preferences: { servers: [], sects: [], bodyTypes: [], genders: [] },
    visibility: { mbti: true, zodiac: true, screenshot: false },
    mbti: m.mbti || null,
    zodiac: m.zodiac || null,
    slogan: `${m.mbti}·${m.rank_tier}·${m.game_view_score}分`,
    interests: m.interests.split(',').filter(Boolean).slice(0, 5),
    answers: [
      { questionKey: 'goal', answerValue: answers.goal },
      { questionKey: 'decision', answerValue: answers.decision },
      { questionKey: 'losingStreak', answerValue: answers.losingStreak },
      { questionKey: 'communication', answerValue: answers.communication },
      { questionKey: 'mistakeHandling', answerValue: answers.mistakeHandling },
    ],
  }
}
```

### 5.3 端到端流程

```
1. 玩家在情缘杯完成角色认证 → 获得 characterId
2. 玩家点击「制作社交名片」→ 打开 zorron H5 测试
3. 玩家依次完成：
   基本信息(8题) → 段位选择(1题) → 游戏观题目(5题) → 兴趣+MBTI+星座(3题)
4. 结算页展示社交名片
5. 前端保存结果 → POST /api/sessions
6. 玩家点击「进入搭子匹配」→ 跳转情缘杯
7. 情缘杯拉取结果 → 适配器转换 → POST /api/v1/partner-profiles
8. 玩家进入匹配大厅，档案已自动填充
```

---

## 6. 题目数据来源映射

### 6.1 xlsx → zorron 节点映射

| xlsx Sheet | zorron 节点 | 变量 |
| --- | --- | --- |
| 设计表 R2-R4（基本信息） | scene_01-08 | server/mindset/body_type/gender/primary_mode/pvp_level/pve_level/pvx_level |
| —（手动段位，替代原 PVP 题库） | scene_09 | rank_tier |
| 价值观测试题库 R26-R41（游戏观题目5题） | scene_10-14 | game_view_score（累加） |
| 设计表 R10-R11（兴趣13项） | scene_15 | interests |
| 设计表 R8（MBTI 16种人格） | scene_16 | mbti |
| —（星座） | scene_17 | zodiac |

> **PVP 门派题库已删除**，用 scene_09 段位手动选择替代。
> **个性题目（7 题）已删除**，MBTI 直接作为人格画像。

### 6.2 xlsx 选项 → 变量值映射

**段位选择**：
```
手动选择：13以下 / 13-15 / 15+
变量: rank_tier = "13以下" | "13-15" | "15+"
```

**游戏观题2（队友甩锅，计分）**：
```
xlsx: A骂一顿潇洒走人(5分) / B找个理由溜走(3分) / C不说话(1分) / D主动揽锅(0分)
变量: game_view_score += 5 | 3 | 1 | 0
```

---

## 7. 测试验证

### 7.1 仿真验证

| 检查项 | 标准 |
| --- | --- |
| 死路率 | < 5% |
| 死循环 | 0 次 |
| 游戏观分布 | 天使/一般/暴躁三档都有覆盖 |
| 变量完整性 | 所有 13 个变量最终都有非空值 |
| 段位分布 | 三档（13以下/13-15/15+）都有覆盖 |

### 7.2 手动播放验证

1. 打开编辑器，加载项目，点击「播放」
2. 依次完成所有题目
3. 验证结算页：
   - 基本信息正确显示
   - 段位正确显示（13以下/13-15/15+）
   - 游戏观等级正确（分数 → 天使/一般/暴躁）
   - MBTI 正确显示
   - 兴趣标签正确
   - 星座正确

---

## 8. 检查清单

- [ ] VectorSpace 已关闭（enabled=false）
- [ ] 13 个全局变量已定义
- [ ] 8 个基本信息 scene 节点 + setter 已连线
- [ ] 1 个段位选择 scene 节点 + setter 已连线
- [ ] 5 个游戏观题目 scene 节点 + setter 已连线（选项→分值累加）
- [ ] 兴趣 multi-select 节点已配置（最多5）
- [ ] MBTI 节点已配置（16 选项）
- [ ] 星座节点已配置（12 选项）
- [ ] settlement 节点 strategy = `variable-map`
- [ ] 结算页 visualBlocks 已配置
- [ ] 仿真验证：死路率 < 5%，游戏观三档有覆盖
- [ ] 手动播放：全流程可完成
- [ ] 结算页：名片信息完整
- [ ] 融合测试：zorron 结果可转换为情缘杯档案

---

## 9. 相关资源

| 资源 | 路径 |
| --- | --- |
| 题目设计 xlsx | `D:\Users\Administrator\文档\自定义 Office 模板\题目设计.xlsx` |
| 产品愿景文档 | [product-vision.md](../vision/product-vision.md) |
| 类型定义 | `apps/zorron-editor/src/types/flow.ts` |
| 结算策略 | `apps/zorron-editor/src/engine/settlementStrategies.ts` |
| 节点注册表 | `apps/zorron-editor/src/components/flow/nodes/definitions.ts` |
| Embed SDK | `apps/zorron-editor/src/h5/embed.tsx` |
| 情缘杯 Profile Schema | `qingyuan-cup-api/src/modules/matching/schemas.ts` |
| 情缘杯匹配算法 | `qingyuan-cup-api/src/modules/matching/score.service.ts` |
