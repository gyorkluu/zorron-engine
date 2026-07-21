/**
 * seed-jx3-social-card.ts
 *
 * Builds the complete FlowData for the JX3 social card scenario and seeds it
 * into the zorron-server via the REST API.
 *
 * Run: bun run scripts/seed-jx3-social-card.ts
 */

// ── Types (mirroring apps/zorron-editor/src/types/flow.ts) ──

interface Choice {
  id: string;
  text: string;
  targetNodeId?: string;
  interaction: 'tap' | 'hold' | 'slash';
  /** Optional icon image URL displayed alongside the choice text. */
  icon?: string;
}

interface SceneNodeData {
  label?: string;
  dialogue?: string;
  speaker?: string;
  backgroundUrl?: string;
  choices: Choice[];
}

interface SetterAssignment {
  variable: string;
  value: string | number | boolean;
  operator: 'set' | 'add' | 'sub';
}

interface SetterNodeData {
  label?: string;
  assignments: SetterAssignment[];
}

interface SettlementResultMapping {
  resultId: string;
  title: string;
  description?: string;
}

interface SettlementButton {
  id: string;
  label: string;
  outputHandleId?: string | null;
}

interface SettlementNodeData {
  label?: string;
  strategy?: string;
  strategyConfig?: Record<string, unknown>;
  resultMapping: SettlementResultMapping[];
  buttons?: SettlementButton[];
  visualBlocks?: Array<{ type: string; props?: Record<string, unknown> }>;
}

interface MultiSelectNodeData {
  label?: string;
  question?: string;
  variable?: string;
  options: Array<{ id: string; label: string; description?: string; icon?: string }>;
  minSelected?: number;
  maxSelected?: number;
  minSelect?: number;
  maxSelect?: number;
}

interface RatingNodeData {
  label?: string;
  variable?: string;
  min: number;
  max: number;
  step?: number;
  question?: string;
  prompt?: string;
}

interface StartNodeData {
  label?: string;
  title?: string;
  intro?: string;
}

interface TextInputNodeData {
  label?: string;
  question?: string;
  placeholder?: string;
  hint?: string;
  variable?: string;
  required?: boolean;
  maxLength?: number;
}

interface RankOrderNodeData {
  label?: string;
  question?: string;
  hint?: string;
  variable?: string;
  items: Array<{ id: string; label: string; description?: string }>;
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: unknown;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, string | number | boolean>;
  settings: Record<string, unknown>;
  version: string;
}

// ── Builder ──

const nodes: FlowNode[] = [];
const edges: FlowEdge[] = [];
let y = 0;
let nodeIdCounter = 0;

function nextId(prefix: string): string {
  nodeIdCounter += 1;
  return `${prefix}_${nodeIdCounter}`;
}

function addNode(id: string, type: string, data: unknown, yOffset = 0): void {
  nodes.push({
    id,
    type,
    position: { x: 300, y: y + yOffset },
    data,
  });
  y += 200;
}

function addEdge(source: string, target: string, sourceHandle?: string | null): void {
  const id = `e_${source}_${target}${sourceHandle ? `_${sourceHandle}` : ''}`;
  const edge: FlowEdge = { id, source, target };
  if (sourceHandle) {
    edge.sourceHandle = sourceHandle;
  }
  edges.push(edge);
}

// ── JX3 Data ──

const SERVERS = [
  '飞龙在天',
  '天鹅坪',
  '破阵子',
  '共結來緣',
  '眉间雪',
  '山海相逢',
  '蝶恋花',
  '剑胆琴心',
  '斗转星移',
  '乾坤一掷',
  '长安城',
  '龙争虎斗',
  '唯我独尊',
  '梦江南',
  '绝代天骄',
  '幽月轮',
];
// 心法 (xf) full list — ordered by forceId then xf order within each school.
// Derived from jx3_pvp_analyzer/backend/data/xf/{xfid.json, school.json}.
//   - One entry per 心法 (e.g. 明教 has two: 焚影圣诀, 明尊琉璃体).
//   - The Xoyo multi-role API returns force (门派), while the
//     /mine/match/person-history endpoint's `kungfu` field resolves to
//     the exact 心法; both map to the `mindset` variable.
const XINFAS: string[] = [
  '易筋经', '洗髓经',          // 少林
  '花间游', '离经易道',        // 万花
  '傲血战意', '铁牢律',        // 天策
  '紫霞功', '太虚剑意',        // 纯阳
  '冰心诀', '云裳心经',        // 七秀
  '毒经', '补天诀',            // 五毒
  '惊羽诀', '天罗诡道',        // 唐门
  '问水诀', '山居剑意',        // 藏剑
  '笑尘诀',                    // 丐帮
  '焚影圣诀', '明尊琉璃体',    // 明教
  '铁骨衣', '分山劲',          // 苍云
  '莫问', '相知',              // 长歌
  '北傲诀',                    // 霸刀
  '凌海诀',                    // 蓬莱
  '隐龙诀',                    // 凌雪
  '太玄经',                    // 衍天
  '无方', '灵素',              // 药宗
  '孤锋诀',                    // 刀宗
  '山海心诀',                  // 万灵
  '周天功',                    // 段氏
  '幽罗引',                    // 无相
];
const BODY_TYPES = ['成男', '成女', '正太', '萝莉'];
// 心法 → JX3 官方心法图标 ID 映射（来源: jx3_pvp_analyzer/backend/data/xf/xfid.json + school.json）
// 键为心法名，值为图标文件名（位于 zorron-editor/public/xf-icons/<id>.png）
const XINFAS_ICON: Record<string, string> = {
  '易筋经': '10003',
  '洗髓经': '10002',
  '花间游': '10021',
  '离经易道': '10028',
  '傲血战意': '10026',
  '铁牢律': '10062',
  '紫霞功': '10014',
  '太虚剑意': '10015',
  '冰心诀': '10081',
  '云裳心经': '10080',
  '毒经': '10175',
  '补天诀': '10176',
  '惊羽诀': '10224',
  '天罗诡道': '10225',
  '问水诀': '10144',
  '山居剑意': '10145',
  '笑尘诀': '10268',
  '焚影圣诀': '10242',
  '明尊琉璃体': '10243',
  '铁骨衣': '10389',
  '分山劲': '10390',
  '莫问': '10447',
  '相知': '10448',
  '北傲诀': '10464',
  '凌海诀': '10533',
  '隐龙诀': '10585',
  '太玄经': '10615',
  '无方': '10627',
  '灵素': '10626',
  '孤锋诀': '10698',
  '山海心诀': '10756',
  '周天功': '10786',
  '幽罗引': '10821',
};
const GENDERS = ['男', '女', '保密'];
const RANK_TIERS = [
  { id: 'A', text: '13 以下', value: '13以下' },
  { id: 'B', text: '13-15', value: '13-15' },
  { id: 'C', text: '15+', value: '15+' },
];
const GAME_VIEW_QUESTIONS = [
  {
    dialogue: '当你在野外做任务时，突然有人不小心打到了你，你会怎么做？',
    options: [
      { id: 'A', text: '不能忍，直接打回去', score: 5 },
      { id: 'B', text: '地图打一个问号', score: 3 },
      { id: 'C', text: '扣白字QAQ，继续任务', score: 1 },
      { id: 'D', text: '跑到安全的地方关阵营', score: 0 },
    ],
  },
  {
    dialogue: '打33时队友甩锅给你，你会怎么做？',
    options: [
      { id: 'A', text: '骂一顿潇洒走人', score: 5 },
      { id: 'B', text: '找个理由溜走', score: 3 },
      { id: 'C', text: '不说话', score: 1 },
      { id: 'D', text: '主动揽锅', score: 0 },
    ],
  },
  {
    dialogue: '被埋复活点怎么办？',
    options: [
      { id: 'A', text: '叫帮会来打回去', score: 5 },
      { id: 'B', text: '换线继续任务', score: 3 },
      { id: 'C', text: '原地挂机等他们走', score: 1 },
      { id: 'D', text: '下线睡觉', score: 0 },
    ],
  },
  {
    dialogue: '大战速刷队有人不认路，你会？',
    options: [
      { id: 'A', text: '直接踢了重排', score: 5 },
      { id: 'B', text: '打字教他走', score: 3 },
      { id: 'C', text: '默默带路', score: 1 },
      { id: 'D', text: '说没关系慢慢来', score: 0 },
    ],
  },
  {
    dialogue: '翻车团即将散团怎么办？',
    options: [
      { id: 'A', text: '怒喷队友菜', score: 5 },
      { id: 'B', text: '默默退团', score: 3 },
      { id: 'C', text: '再试一次', score: 1 },
      { id: 'D', text: '安慰大家，下次再战', score: 0 },
    ],
  },
];
const INTERESTS = ['竞技场', '吃鸡', '攻防', '野外', '截图', '打本', '开荒', '家园', '挂机', '复制', '插旗', '摸宠', '成就'];
const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
const ZODIACS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

// ── Build flow ──

// Start node
addNode('start', 'start', {
  label: '开始',
  title: '剑网3游戏社交名片',
  intro: '完成以下测试，生成你的专属游戏社交名片',
} as StartNodeData);

// Text input: 推栏号 (required, placed FIRST so subsequent scenes can be auto-skipped)
const nodeTuilanId = 'node_tuilan_id';
addNode(nodeTuilanId, 'text-input', {
  label: '推栏号输入',
  question: '请输入你的推栏号',
  placeholder: '请输入推栏号',
  hint: '为保证数据真实，请填写推栏账号。系统将自动获取你的区服、门派、体型、段位等信息，跳过对应题目。',
  variable: 'tuilan_id',
  required: true,
  maxLength: 50,
} as TextInputNodeData);

// Scene 01: Server selection
const scene01Id = 'scene_01';
const scene01Setters: string[] = [];
addNode(scene01Id, 'scene', {
  label: '区服选择',
  dialogue: '请选择你的区服',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/mode-bg.png',
  choices: SERVERS.map((s, i) => {
    const setterId = `setter_01_${i}`;
    scene01Setters.push(setterId);
    return { id: `s${i}`, text: s, interaction: 'tap' as const, targetNodeId: setterId };
  }),
} as SceneNodeData);
for (let i = 0; i < SERVERS.length; i++) {
  const setterId = scene01Setters[i];
  addNode(setterId, 'setter', {
    label: `写入区服: ${SERVERS[i]}`,
    assignments: [{ variable: 'server', value: SERVERS[i], operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene01Id, setterId, `s${i}`);
}

// Scene 02: 心法 (xf) selection — corresponds to `mindset` variable.
//   The Xoyo multi-role API returns the 门派 (force), while
//   /mine/match/person-history resolves the exact 心法 via kungfu pinyin.
const scene02Id = 'scene_02';
const scene02Setters: string[] = [];
addNode(scene02Id, 'scene', {
  label: '心法选择',
  dialogue: '请选择你的心法',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/mindset-bg.png',
  choices: XINFAS.map((m, i) => {
    const setterId = `setter_02_${i}`;
    scene02Setters.push(setterId);
    const iconId = XINFAS_ICON[m];
    return {
      id: `m${i}`,
      text: m,
      interaction: 'tap' as const,
      targetNodeId: setterId,
      icon: iconId ? `/xf-icons/${iconId}.png` : undefined,
    };
  }),
} as SceneNodeData);
for (let i = 0; i < XINFAS.length; i++) {
  const setterId = scene02Setters[i];
  addNode(setterId, 'setter', {
    label: `写入心法: ${XINFAS[i]}`,
    assignments: [{ variable: 'mindset', value: XINFAS[i], operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene02Id, setterId, `m${i}`);
}

// Scene 03: Body type
const scene03Id = 'scene_03';
const scene03Setters: string[] = [];
addNode(scene03Id, 'scene', {
  label: '体型选择',
  dialogue: '请选择你的体型',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/body-bg.png',
  choices: BODY_TYPES.map((b, i) => {
    const setterId = `setter_03_${i}`;
    scene03Setters.push(setterId);
    return { id: `b${i}`, text: b, interaction: 'tap' as const, targetNodeId: setterId };
  }),
} as SceneNodeData);
for (let i = 0; i < BODY_TYPES.length; i++) {
  const setterId = scene03Setters[i];
  addNode(setterId, 'setter', {
    label: `写入体型: ${BODY_TYPES[i]}`,
    assignments: [{ variable: 'body_type', value: BODY_TYPES[i], operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene03Id, setterId, `b${i}`);
}

// Scene 04: Gender
const scene04Id = 'scene_04';
const scene04Setters: string[] = [];
addNode(scene04Id, 'scene', {
  label: '性别选择',
  dialogue: '请选择你的性别',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/gender-bg.png',
  choices: GENDERS.map((g, i) => {
    const setterId = `setter_04_${i}`;
    scene04Setters.push(setterId);
    return { id: `g${i}`, text: g, interaction: 'tap' as const, targetNodeId: setterId };
  }),
} as SceneNodeData);
for (let i = 0; i < GENDERS.length; i++) {
  const setterId = scene04Setters[i];
  addNode(setterId, 'setter', {
    label: `写入性别: ${GENDERS[i]}`,
    assignments: [{ variable: 'gender', value: GENDERS[i], operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene04Id, setterId, `g${i}`);
}

// Node 05: Multi-select for primary mode
const node05Id = 'node_05_primary_mode';
addNode(node05Id, 'multi-select', {
  label: '主要玩法',
  question: '请选择你的主要玩法（可多选）',
  variable: 'primary_mode',
  backgroundUrl: '/stage-bg/mode-bg.png',
  options: [
    { id: 'pvp', label: 'PVP' },
    { id: 'pve', label: 'PVE' },
    { id: 'pvx', label: 'PVX' },
  ],
  minSelected: 1,
  maxSelected: 3,
} as MultiSelectNodeData);

// (Nodes 06-08 were PVP/PVE/PVX level rating nodes — removed per request.
//  The player's game level is now captured implicitly via interests + rank tier.)

// Scene 09: Rank tier
const scene09Id = 'scene_09';
const scene09Setters: string[] = [];
addNode(scene09Id, 'scene', {
  label: '段位选择',
  dialogue: '请选择你的段位',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/rank-bg.png',
  choices: RANK_TIERS.map((r, i) => {
    const setterId = `setter_09_${i}`;
    scene09Setters.push(setterId);
    return { id: r.id, text: r.text, interaction: 'tap' as const, targetNodeId: setterId };
  }),
} as SceneNodeData);
for (let i = 0; i < RANK_TIERS.length; i++) {
  const setterId = scene09Setters[i];
  addNode(setterId, 'setter', {
    label: `写入段位: ${RANK_TIERS[i].value}`,
    assignments: [{ variable: 'rank_tier', value: RANK_TIERS[i].value, operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene09Id, setterId, RANK_TIERS[i].id);
}

// Scenes 10-14: Game view questions
const gameViewSceneIds: string[] = [];
for (let qi = 0; qi < GAME_VIEW_QUESTIONS.length; qi++) {
  const q = GAME_VIEW_QUESTIONS[qi];
  const sceneId = `scene_${10 + qi}`;
  gameViewSceneIds.push(sceneId);
  const setters: string[] = [];
  addNode(sceneId, 'scene', {
    label: `游戏观题${qi + 1}`,
    dialogue: q.dialogue,
    speaker: '社交名片',
    backgroundUrl: '/stage-bg/mindset-bg.png',
    choices: q.options.map((opt) => {
      const setterId = `setter_${10 + qi}_${opt.id}`;
      setters.push(setterId);
      return { id: opt.id, text: opt.text, interaction: 'tap' as const, targetNodeId: setterId };
    }),
  } as SceneNodeData);
  for (let oi = 0; oi < q.options.length; oi++) {
    const opt = q.options[oi];
    const setterId = setters[oi];
    addNode(setterId, 'setter', {
      label: `游戏观题${qi + 1} 选项${opt.id} (+${opt.score})`,
      assignments: [{ variable: 'game_view_score', value: opt.score, operator: 'add' as const }],
    } as SetterNodeData);
    addEdge(sceneId, setterId, opt.id);
  }
}

// Node 15: Multi-select for interests
const node15Id = 'node_15_interests';
addNode(node15Id, 'multi-select', {
  label: '兴趣选择',
  question: '请选择你感兴趣的游戏玩法（1-5个）',
  variable: 'interests',
  backgroundUrl: '/stage-bg/interests-bg.png',
  options: INTERESTS.map((tag) => ({ id: tag, label: tag })),
  minSelected: 1,
  maxSelected: 5,
} as MultiSelectNodeData);

// Scene 16: MBTI selection
const scene16Id = 'scene_16';
const scene16Setters: string[] = [];
addNode(scene16Id, 'scene', {
  label: 'MBTI 选择',
  dialogue: '请选择你的 MBTI 人格类型',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/mbti-bg.png',
  choices: MBTI_TYPES.map((m, i) => {
    const setterId = `setter_16_${i}`;
    scene16Setters.push(setterId);
    return {
      id: `mbti${i}`,
      text: m,
      interaction: 'tap' as const,
      targetNodeId: setterId,
      icon: `/mbti-icons/${m}.svg`,
    };
  }),
} as SceneNodeData);
for (let i = 0; i < MBTI_TYPES.length; i++) {
  const setterId = scene16Setters[i];
  addNode(setterId, 'setter', {
    label: `写入 MBTI: ${MBTI_TYPES[i]}`,
    assignments: [{ variable: 'mbti', value: MBTI_TYPES[i], operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene16Id, setterId, `mbti${i}`);
}

// Scene 17: Zodiac selection
const scene17Id = 'scene_17';
const scene17Setters: string[] = [];
addNode(scene17Id, 'scene', {
  label: '星座选择',
  dialogue: '请选择你的星座',
  speaker: '社交名片',
  backgroundUrl: '/stage-bg/zodiac-bg.png',
  choices: ZODIACS.map((z, i) => {
    const setterId = `setter_17_${i}`;
    scene17Setters.push(setterId);
    return {
      id: `z${i}`,
      text: z,
      interaction: 'tap' as const,
      targetNodeId: setterId,
      icon: `/zodiac-icons/${z}.svg`,
    };
  }),
} as SceneNodeData);
for (let i = 0; i < ZODIACS.length; i++) {
  const setterId = scene17Setters[i];
  addNode(setterId, 'setter', {
    label: `写入星座: ${ZODIACS[i]}`,
    assignments: [{ variable: 'zodiac', value: ZODIACS[i], operator: 'set' as const }],
  } as SetterNodeData);
  addEdge(scene17Id, setterId, `z${i}`);
}

// ── Node 18: Rank-order (drag-to-reorder priority weights) ──
//   The player ranks the 5 previously-collected dimensions by personal
//   importance. The ordered ids are stored in `priority_weights` and
//   later used by the matching system to compute weighted similarity.
const node18Id = 'node_18_priority';
addNode(node18Id, 'rank-order', {
  label: '重视程度排序',
  question: '请按你对以下内容的重视程度排序（拖动或使用 ↑↓ 按钮）',
  hint: '排在最上面的内容对你最重要，将作为匹配时的最高权重',
  variable: 'priority_weights',
  backgroundUrl: '/stage-bg/priority-bg.png',
  items: [
    { id: 'rank_tier', label: '段位', description: 'PVP 技术水平' },
    { id: 'mbti', label: 'MBTI 人格', description: '性格匹配度' },
    { id: 'game_view', label: '游戏观', description: '游戏理念契合度' },
    { id: 'interests', label: '兴趣', description: '玩法偏好重合度' },
    { id: 'zodiac', label: '星座', description: '星座匹配度' },
  ],
} as RankOrderNodeData);

// ── Node 19: Expectation (期望对方的基本信息) ──
//   Multi-select for each of: server, mindset, body_type, gender.
//   Each selection is stored as a comma-separated list in an `expect_*`
//   variable. An empty selection means "no preference".
//   We implement this as a single multi-select node where the player
//   picks from a flattened option list, then the engine stores the
//   selection per category via setter nodes.
//
//   Implementation: one multi-select per category, chained sequentially.
//   The player may skip any category by submitting an empty selection
//   (minSelected=0). Four compact multi-select nodes.
const node19ServerId = 'node_19_expect_server';
addNode(node19ServerId, 'multi-select', {
  label: '期望对方区服',
  question: '你希望对方的区服是？（可多选，可不选表示无要求）',
  variable: 'expect_server',
  backgroundUrl: '/stage-bg/mode-bg.png',
  options: SERVERS.map((s) => ({ id: s, label: s })),
  minSelected: 0,
  maxSelected: 0,
} as MultiSelectNodeData);

const node19MindsetIdd = 'node_19_expect_mindset';
addNode(node19MindsetIdd, 'multi-select', {
  label: '期望对方心法',
  question: '你希望对方的心法是？（可多选，可不选表示无要求）',
  variable: 'expect_mindset',
  backgroundUrl: '/stage-bg/mindset-bg.png',
  options: XINFAS.map((m) => {
    const iconId = XINFAS_ICON[m];
    return { id: m, label: m, icon: iconId ? `/xf-icons/${iconId}.png` : undefined };
  }),
  minSelected: 0,
  maxSelected: 0,
} as MultiSelectNodeData);

const node19BodyTypeId = 'node_19_expect_body_type';
addNode(node19BodyTypeId, 'multi-select', {
  label: '期望对方体型',
  question: '你希望对方的体型是？（可多选，可不选表示无要求）',
  variable: 'expect_body_type',
  backgroundUrl: '/stage-bg/body-bg.png',
  options: BODY_TYPES.map((b) => ({ id: b, label: b })),
  minSelected: 0,
  maxSelected: 0,
} as MultiSelectNodeData);

const node19GenderId = 'node_19_expect_gender';
addNode(node19GenderId, 'multi-select', {
  label: '期望对方性别',
  question: '你希望对方的性别是？（可多选，可不选表示无要求）',
  variable: 'expect_gender',
  backgroundUrl: '/stage-bg/gender-bg.png',
  options: GENDERS.map((g) => ({ id: g, label: g })),
  minSelected: 0,
  maxSelected: 0,
} as MultiSelectNodeData);

// ── Node 20: Favorite 心法 (multi-select, max 5) ──
//   Player picks their commonly-used 心法 (up to 5). Same icon set
//   as scene_02 心法 selection. Stored as comma-joined list in
//   `favorite_xinfas`.
const node20FavoriteXinfasId = 'node_20_favorite_xinfas';
addNode(node20FavoriteXinfasId, 'multi-select', {
  label: '常用心法',
  question: '请选择你最常用的心法（最多 5 个）',
  variable: 'favorite_xinfas',
  backgroundUrl: '/stage-bg/mindset-bg.png',
  options: XINFAS.map((m) => {
    const iconId = XINFAS_ICON[m];
    return { id: m, label: m, icon: iconId ? `/xf-icons/${iconId}.png` : undefined };
  }),
  minSelected: 1,
  maxSelected: 5,
} as MultiSelectNodeData);

// ── Node 21: Signature (text-input) ──
//   Free-form personal signature shown on the social card.
const node21SignatureId = 'node_21_signature';
addNode(node21SignatureId, 'text-input', {
  label: '个性签名',
  question: '请输入你的个性签名',
  placeholder: '一句话介绍你自己',
  hint: '将展示在你的社交名片上，不超过 50 字',
  variable: 'signature',
  required: false,
  maxLength: 50,
} as TextInputNodeData);

// Settlement node
const settlementId = 'settlement';
addNode(settlementId, 'settlement', {
  label: '社交名片生成',
  strategy: 'variable-map',
  strategyConfig: {
    variableName: 'game_view_score',
    rules: [],
    fallbackAnchorId: 'social-card',
  },
  resultMapping: [
    {
      resultId: 'social-card',
      title: '你的游戏社交名片',
      description: '名片已生成，可进入搭子匹配系统',
    },
  ],
  buttons: [
    { id: 'restart', label: '重新测试', outputHandleId: null },
  ],
  visualBlocks: [
    { type: 'social-card-summary' },
  ],
} as SettlementNodeData);

// ── Edges: chain all nodes ──

// start → tuilan_id input → scene_01
addEdge('start', nodeTuilanId);
addEdge(nodeTuilanId, scene01Id);

// scene_01 setters → scene_02
for (const sid of scene01Setters) addEdge(sid, scene02Id);

// scene_02 setters → scene_03
for (const sid of scene02Setters) addEdge(sid, scene03Id);

// scene_03 setters → scene_04
for (const sid of scene03Setters) addEdge(sid, scene04Id);

// scene_04 setters → node_05
for (const sid of scene04Setters) addEdge(sid, node05Id);

// node_05 → scene_09 (nodes 06-08 removed — PVP/PVE/PVX level tests deleted)
addEdge(node05Id, scene09Id);

// scene_09 setters → scene_10
for (const sid of scene09Setters) addEdge(sid, gameViewSceneIds[0]);

// game view chain: each question's setters → next question
for (let qi = 0; qi < GAME_VIEW_QUESTIONS.length - 1; qi++) {
  const currentSetters = Array.from({ length: 4 }, (_, oi) => `setter_${10 + qi}_${String.fromCharCode(65 + oi)}`);
  const nextScene = gameViewSceneIds[qi + 1];
  for (const sid of currentSetters) addEdge(sid, nextScene);
}

// last game view question's setters → node_15
{
  const lastSetters = Array.from({ length: 4 }, (_, oi) => `setter_14_${String.fromCharCode(65 + oi)}`);
  for (const sid of lastSetters) addEdge(sid, node15Id);
}

// node_15 → scene_16
addEdge(node15Id, scene16Id);

// scene_16 setters → scene_17
for (const sid of scene16Setters) addEdge(sid, scene17Id);

// scene_17 setters → node_18 (priority rank-order)
for (const sid of scene17Setters) addEdge(sid, node18Id);

// node_18 → node_20 (favorite 心法) → node_19 expectation chain → node_21 (signature) → settlement
addEdge(node18Id, node20FavoriteXinfasId);
addEdge(node20FavoriteXinfasId, node19ServerId);
addEdge(node19ServerId, node19MindsetIdd);
addEdge(node19MindsetIdd, node19BodyTypeId);
addEdge(node19BodyTypeId, node19GenderId);
addEdge(node19GenderId, node21SignatureId);
addEdge(node21SignatureId, settlementId);

// ── Assemble FlowData ──

const flowData: FlowData = {
  nodes,
  edges,
  variables: {
    // Identity
    tuilan_id: '',
    person_id: '',
    nick_name: '',
    game_name: '',
    avatar_url: '',
    // Basic info (auto-filled when tuilan_id is provided)
    server: '',
    zone: '',
    mindset: '',           // 心法 (fallback: 门派)
    body_type: '',
    gender: '',             // API cannot provide; always user-selected
    // PVP / rank (auto-filled when tuilan_id is provided)
    rank_tier: '',
    grade_raw: '',
    grade_value: 0,
    pvp_type: '',
    mmr: 0,
    win_rate: 0,
    total_count: 0,
    ranking: 0,
    camp: '',
    // Card preset (encrypted URL, opaque)
    card_preset_url: '',
    // User-selected
    primary_mode: '',
    game_view_score: 0,
    interests: '',
    mbti: '',
    zodiac: '',
    // Priority ranking — comma-joined ordered item ids (player's importance order).
    // Items: rank_tier, mbti, game_view, interests, zodiac
    priority_weights: '',
    // Expectations for a match partner — comma-joined selected option labels.
    expect_server: '',
    expect_mindset: '',
    expect_body_type: '',
    expect_gender: '',
    // Player's commonly-used 心法 (max 5) — comma-joined 心法 names.
    favorite_xinfas: '',
    // Player's personal signature (free-form text, max 50 chars).
    signature: '',
  },
  settings: {
    title: '剑网3游戏社交名片',
    description: '基于题目设计的游戏社交名片测试',
    theme: 'ancient',
  },
  version: '1.0.0',
};

// ── Seed via API ──

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3005';

async function seed(): Promise<void> {
  console.log(`[seed] Total nodes: ${flowData.nodes.length}`);
  console.log(`[seed] Total edges: ${flowData.edges.length}`);

  // Create project
  const createRes = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '剑网3游戏社交名片',
      description: '基于题目设计的游戏社交名片测试',
      data: flowData,
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create project: ${createRes.status} ${text}`);
  }

  const created = await createRes.json() as { id: string };
  console.log(`[seed] Project created: ${created.id}`);

  // Publish project
  const pubRes = await fetch(`${API_BASE}/api/agent/projects/${created.id}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!pubRes.ok) {
    const text = await pubRes.text();
    throw new Error(`Failed to publish project: ${pubRes.status} ${text}`);
  }

  console.log(`[seed] Project published.`);
  console.log(`[seed] Player URL: http://localhost:3004/player/${created.id}`);
  console.log(`[seed] Done.`);
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
