/**
 * Zorron Engine - Node Skill Registry & Knowledge Base.
 *
 * Provides granular Prompt instructions, Data Schema requirements, and usage
 * boundaries for each supported node type in Zorron Engine.
 *
 * When users converse with the AI Copilot, the `SkillMatcher` dynamically extracts
 * relevant Node Skills to inject into the LLM system context, ensuring optimal AI
 * generation quality while protecting core engine contracts.
 */

import type { NodeType } from '@/types/flow';

export interface NodeSkill {
  type: NodeType;
  name: string;
  keywords: string[];
  summary: string;
  /** Complete JSON structure expectations and data format instruction. */
  schemaDoc: string;
  /** Detailed system prompt guidance for AI when generating or editing this node. */
  promptInstruction: string;
  /** Safety and structural boundaries for this specific node type. */
  boundaries: string[];
  /** Concrete examples of high-quality node contents. */
  examples: string[];
}

export const NODE_SKILL_REGISTRY: Record<string, NodeSkill> = {
  start: {
    type: 'start',
    name: '起点节点 (Start Node)',
    keywords: ['起点', '开始', '封面', '标题', '测试名称', '入口', 'start', 'intro', 'cover'],
    summary: '工程的唯一运行入口，用于展现测试/场景的标题、封面图片与简介。',
    schemaDoc: `{
  "title": "场景标题 (string, 必填)",
  "intro": "场景引言/指导语 (string, 选填)",
  "coverUrl": "封面图片URL (string, 选填)"
}`,
    promptInstruction: `作为起点节点，你需要编写极具吸引力的标题与开场导语：
1. 标题要能激发玩家好奇心或认同感（例如：“测测你的武侠潜意识门派”）。
2. 导语要简明扼要说明测试目的与预计耗时（1-2句）。
3. 保证整个工程必须且只能有一个 start 节点。`,
    boundaries: [
      '系统中必须有且仅有 1 个 start 节点。',
      'start 节点不能被删除。',
      'start 节点只能作为连线起点，不能有入边 (Incoming edges)。',
    ],
    examples: ['标题："剑网3门派契合度测试"，导语："在乱世江湖中，你的抉择将决定你的宿命归处。"'],
  },

  scene: {
    type: 'scene',
    name: '剧情/选项节点 (Scene Node)',
    keywords: ['剧情', '题目', '选项', '对话', '问答', '场景', '选择', 'scene', 'choice', 'dialogue'],
    summary: '核心交互节点，呈现一段旁白/对话及多个供玩家选择的选项，可包含维度增量或碎片掉落。',
    schemaDoc: `{
  "speaker": "说话者名称/旁白 (string, 选填)",
  "dialogue": "剧情描述/问题正文 (string, 必填)",
  "backgroundUrl": "背景图片URL (string, 选填)",
  "characterUrl": "人物立绘URL (string, 选填)",
  "choices": [
    {
      "id": "choice_xxx (string, 唯一)",
      "text": "选项文案 (string, 必填)",
      "targetNodeId": "目标节点ID (string, 选填)",
      "interaction": "tap | hold | slash (默认 tap)",
      "vector": { "a": 10, "b": -5 } // 维度增量 (选填)
    }
  ]
}`,
    promptInstruction: `设计剧情与题目节点时：
1. 问题描述（dialogue）应富有代入感和情境感。
2. 选项（choices）数量通常为 2~4 个，文案需有鲜明的性格分支区别。
3. 若场景开启了维度计算（Vector Space），每个选项应当附带合理的向量增量 (vector)。`,
    boundaries: [
      '每个 scene 节点至少需要包含 1 个选项 (choice)。',
      '选项 id 在节点内部必须唯一。',
      '每个选项可以单独连接到不同的下游目标节点。',
    ],
    examples: ['对话："夜黑风高，前方破庙传来救命声，你将如何选择？" 选项1："提剑入内", 选项2："悄然绕行"'],
  },

  logic: {
    type: 'logic',
    name: '逻辑条件分支节点 (Logic Node)',
    keywords: ['逻辑', '条件', '分支', '判断', '阈值', '检查', '变量比较', 'logic', 'condition', 'branch'],
    summary: '根据当前玩家的变量值、维度得分或收集到的碎片进行条件分支判断，分流剧情。',
    schemaDoc: `{
  "condition": "表达式说明 (string)",
  "checkType": "count | has-specific | variable (默认 variable)",
  "varName": "检查的变量名 (string)",
  "operator": ">= | <= | == | > | <",
  "value": 10 // 比较目标数值 (number)
}`,
    promptInstruction: `配置逻辑分支时：
1. 明确判断条件关联的变量名（如 'courage', 'score'）或维度。
2. 逻辑节点通常有两个输出句柄：满足条件 (True) 与不满足条件 (False)。
3. 确保前后变量名称拼写完全一致，防止逻辑死结。`,
    boundaries: [
      'logic 节点的变量名称必须在系统变量池中已定义或自动初始化。',
      'logic 节点必须提供清晰的双分支走向，避免死循环。',
    ],
    examples: ['检查变量勇气勇气 (courage) >= 15，满足则进入勇敢路线，否则进入谨慎路线。'],
  },

  setter: {
    type: 'setter',
    name: '变量赋值节点 (Setter Node)',
    keywords: ['赋值', '设置变量', '增加分数', '修改状态', 'setter', 'variable', 'assign'],
    summary: '直接对全局变量或玩家属性进行赋值、累加或扣减操作。',
    schemaDoc: `{
  "assignments": [
    {
      "variable": "变量名 (string, 必填)",
      "operator": "set | add | sub (默认 set)",
      "value": 10 // 目标值 (number | string | boolean)
    }
  ]
}`,
    promptInstruction: `使用赋值节点：
1. 用于在不产生直接交互选择的情况下，在后台悄悄修改玩家状态（例如通关加分、标记路线）。
2. 支持变量自增 (add)、自减 (sub) 或直接覆盖 (set)。`,
    boundaries: [
      '变量名必须合规，只包含英文字母、数字和下划线。',
    ],
    examples: ['把变量 gold (金币) 增加 100，或把 visited_village 设为 true。'],
  },

  calculator: {
    type: 'calculator',
    name: '向量计算/公式节点 (Calculator Node)',
    keywords: ['计算', '公式', '向量运算', '得分计算', 'calculator', 'formula', 'vector'],
    summary: '用于对维度向量（N维空间）进行复杂的数学计算与更新。',
    schemaDoc: `{
  "targetVariable": "结果存放变量 (string)",
  "description": "计算公式或逻辑说明 (string)",
  "vector": { "x": 5, "y": -2 }
}`,
    promptInstruction: `使用计算节点进行复杂维度得分整合，通常放在最终结算节点之前。`,
    boundaries: ['公式必须合法，不得引用不存在的数学方法。'],
    examples: ['计算总分，将所有正向维度累加并存储到 total_score。'],
  },

  settlement: {
    type: 'settlement',
    name: '结算/结论卡片节点 (Settlement Node)',
    keywords: ['结算', '结论', '结果', '卡片', '报告', 'MBTI', '终点', 'settlement', 'result', 'end'],
    summary: '场景运行的终点，根据玩家累计的维度向量或变量分值，生成匹配的结果卡片。',
    schemaDoc: `{
  "strategy": "vector-nearest | threshold | count-tally (默认 vector-nearest)",
  "resultMapping": [
    {
      "resultId": "res_01",
      "title": "结论名称 (例如：少林 - 禅心傲骨)",
      "description": "详细结果分析文案 (string)",
      "coverUrl": "卡片封面图 (string)"
    }
  ],
  "buttons": [
    { "id": "btn_share", "label": "分享结果 / 再测一次" }
  ]
}`,
    promptInstruction: `设计结算节点：
1. 结算节点是最终的游玩出口，必须包含丰满、温暖或深刻的结果解析文本。
2. 配置不同的结论映射 (resultMapping)，覆盖玩家可能测试出来的所有类型。
3. 策略 (strategy) 推荐使用 'vector-nearest' (最近向量法) 或 'threshold' (阈值匹配)。`,
    boundaries: [
      'settlement 节点为终端节点 (Terminal Node)，不能再拉出出边 (Outgoing edges)。',
      '场景中必须至少有 1 个 settlement 节点。',
    ],
    examples: ['根据维度向量匹配最近的门派：藏剑、七秀、万花、少林等，并展示对应卡片。'],
  },

  video: {
    type: 'video',
    name: '交互视频节点 (Video Node)',
    keywords: ['视频', '动画', '过场', '播放', 'video', 'media', 'movie'],
    summary: '播放一段短视频或剧情过场，播放完毕后可自动跳转或出现互动选项。',
    schemaDoc: `{
  "videoUrl": "视频文件URL (string, 必填)",
  "autoPlay": true,
  "controls": false,
  "skipAllowed": true
}`,
    promptInstruction: `用于多媒体叙事场景，配置视频 URL 并指定播放结束后跳转的下游节点。`,
    boundaries: ['视频 URL 必须是有效的媒体协议或资源路径。'],
    examples: ['播放一段 10 秒的剑网3大唐盛景过场动画，播完后跳转至下一个选择节点。'],
  },

  link: {
    type: 'link',
    name: '外链/跳转节点 (Link Node)',
    keywords: ['跳转', '外链', '网址', 'H5', '打开链接', 'link', 'url', 'redirect'],
    summary: '引导玩家跳转到外部 H5 页面、活动页或小程序。',
    schemaDoc: `{
  "url": "跳转的目标网址 (string, 必填)",
  "openInNewTab": true
}`,
    promptInstruction: `用于测试结束后的商业变现或活动引导。`,
    boundaries: ['link 节点通常也是终点节点之一。'],
    examples: ['跳转至官方充值页或情缘匹配活动 H5 页面。'],
  },

  minigame: {
    type: 'minigame',
    name: '互动小游戏节点 (Minigame Node)',
    keywords: ['小游戏', '游戏', '互动', 'QTE', '挑战', 'minigame', 'game', 'play'],
    summary: '在流程中嵌一个 H5 互动小游戏（如连连看、反应力测试、拼图），依据游戏得分走向不同分支。',
    schemaDoc: `{
  "gameId": "游戏标识 (string, 必填)",
  "passScore": 60, // 通关所需分数
  "timeLimit": 30 // 时间限制(秒)
}`,
    promptInstruction: `在趣味测试或情境模拟中加入 QTE 或小游戏互动，极大提升玩家留存率与参与感。`,
    boundaries: ['小游戏完成后会产生 victory (通关) 与 defeat (失败) 两种输出分支。'],
    examples: ['嵌入一个‘快速按键解剑印’小游戏，限制时间 10 秒。'],
  },

  rating: {
    type: 'rating',
    name: '打分/星级选择节点 (Rating Node)',
    keywords: ['评分', '打分', '星级', '满意度', '打分题', 'rating', 'star', 'score'],
    summary: '供玩家进行 1-5 星或 1-10 分的直观评估打分。',
    schemaDoc: `{
  "question": "评分问题正文 (string, 必填)",
  "maxStars": 5,
  "targetVariable": "评分保存的变量名 (string)"
}`,
    promptInstruction: `适用于问卷调研或体验满意度评估，直接将得分存储到变量中。`,
    boundaries: ['星级范围必须在 3 ~ 10 之间。'],
    examples: ['“请为本次江湖体验打分：1星极其不满，5星非常满意”'],
  },

  'multi-select': {
    type: 'multi-select',
    name: '多选题节点 (Multi-Select Node)',
    keywords: ['多选', '多项选择', '标签选择', '复选', 'multi-select', 'checkbox'],
    summary: '允许玩家同时勾选多个选项，汇总选中的权重或存入标签集合。',
    schemaDoc: `{
  "question": "多选标题 (string, 必填)",
  "minSelect": 1,
  "maxSelect": 3,
  "choices": [
    { "id": "m1", "text": "行侠仗义" },
    { "id": "m2", "text": "隐逸山林" }
  ]
}`,
    promptInstruction: `当需要玩家多项勾选标签（如“挑选你喜欢的3种兵器”）时使用。`,
    boundaries: ['maxSelect 必须大于等于 minSelect。'],
    examples: ['多选题：“以下哪些门派心法是你曾修炼过的？（多选）”'],
  },

  media: {
    type: 'media',
    name: '富媒体卡片节点 (Media Node)',
    keywords: ['图片', '音频', '富媒体', '展示', '卡片', 'media', 'image', 'audio'],
    summary: '展示含有图片、音频或说明文字的纯展示型节点。',
    schemaDoc: `{
  "mediaType": "image | audio",
  "mediaUrl": "资源地址 (string)",
  "caption": "说明文案 (string)"
}`,
    promptInstruction: `用于阶段性的故事插画展示或背景音效播放。`,
    boundaries: ['展示类节点需有确定触发下一步的继续按钮。'],
    examples: ['展示一张门派风景大图，带有“播放背景名曲”音频按钮。'],
  },

  'text-input': {
    type: 'text-input',
    name: '文本输入问答节点 (Text Input Node)',
    keywords: ['输入', '填空', '问答', '自定义文本', '姓名', 'text-input', 'input'],
    summary: '让玩家手动输入文本（如侠客姓名、定制誓言等），并存储在变量中。',
    schemaDoc: `{
  "promptText": "输入提示语 (string, 必填)",
  "placeholder": "占位文本 (string)",
  "targetVariable": "user_name"
}`,
    promptInstruction: `常用于让玩家打造个性化身份（输入侠名/昵称），后续剧情可以动态引用这个变量。`,
    boundaries: ['变量名必填且合法。'],
    examples: ['“少侠留步，请留下你的江湖尊姓大名：”'],
  },

  'rank-order': {
    type: 'rank-order',
    name: '排序节点 (Rank Order Node)',
    keywords: ['排序', '优先级', '拖拽排序', '偏好排序', 'rank', 'order', 'sort'],
    summary: '让玩家对给定的多个选项按偏好或优先级拖拽排序。',
    schemaDoc: `{
  "title": "排序引导语 (string, 必填)",
  "items": [
    { "id": "rk_1", "label": "武艺高强" },
    { "id": "rk_2", "label": "富甲一方" }
  ]
}`,
    promptInstruction: `用于测评玩家的核心价值观或需求优先级。`,
    boundaries: ['排序项至少要有 3 项。'],
    examples: ['“请将以下你最看重的江湖财富按优先级从高到低排序”'],
  },

  'number-picker': {
    type: 'number-picker',
    name: '数值滑动选择节点 (Number Picker Node)',
    keywords: ['数值', '滑块', '数字', '年龄', '区间选择', 'number-picker', 'slider'],
    summary: '通过滑动条或数字加减器选择一个具体数值（如年龄、心仪数值）。',
    schemaDoc: `{
  "title": "数值选择标题 (string, 必填)",
  "min": 18,
  "max": 80,
  "step": 1,
  "targetVariable": "user_age"
}`,
    promptInstruction: `用于精准收集玩家的量化参数或调参。`,
    boundaries: ['min 必须小于 max。'],
    examples: ['滑动选择侠客的入世年龄（18 - 80岁）。'],
  },
};

/** Dynamically register a new custom Node Skill into the registry at runtime. */
export function registerDynamicSkill(skill: NodeSkill): void {
  NODE_SKILL_REGISTRY[skill.type] = skill;
}
