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
}

interface SceneNodeData {
  label?: string;
  dialogue?: string;
  speaker?: string;
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
  options: Array<{ id: string; label: string; description?: string }>;
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

const SERVERS = ['双线一区', '双线二区', '念破', '华山论剑', '梦江南', '如梦令'];
const MINDSETS = ['紫霞功', '太虚剑意', '易经少林', '离经易道', '补天决', '毒经', '花间游', '傲血战意'];
const BODY_TYPES = ['成男', '成女', '正太', '萝莉'];
const GENDERS = ['男', '女'];
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

// Scene 01: Server selection
const scene01Id = 'scene_01';
const scene01Setters: string[] = [];
addNode(scene01Id, 'scene', {
  label: '区服选择',
  dialogue: '请选择你的区服',
  speaker: '社交名片',
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

// Scene 02: Mindset selection
const scene02Id = 'scene_02';
const scene02Setters: string[] = [];
addNode(scene02Id, 'scene', {
  label: '心法选择',
  dialogue: '请选择你的心法',
  speaker: '社交名片',
  choices: MINDSETS.map((m, i) => {
    const setterId = `setter_02_${i}`;
    scene02Setters.push(setterId);
    return { id: `m${i}`, text: m, interaction: 'tap' as const, targetNodeId: setterId };
  }),
} as SceneNodeData);
for (let i = 0; i < MINDSETS.length; i++) {
  const setterId = scene02Setters[i];
  addNode(setterId, 'setter', {
    label: `写入心法: ${MINDSETS[i]}`,
    assignments: [{ variable: 'mindset', value: MINDSETS[i], operator: 'set' as const }],
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
  options: [
    { id: 'pvp', label: 'PVP' },
    { id: 'pve', label: 'PVE' },
    { id: 'pvx', label: 'PVX' },
  ],
  minSelected: 1,
  maxSelected: 3,
} as MultiSelectNodeData);

// Nodes 06-08: Rating for PVP/PVE/PVX level
const node06Id = 'node_06_pvp_level';
addNode(node06Id, 'rating', {
  label: 'PVP 水平',
  variable: 'pvp_level',
  min: 1,
  max: 10,
  step: 1,
  question: '请评价你的 PVP 水平（1-10）',
} as RatingNodeData);

const node07Id = 'node_07_pve_level';
addNode(node07Id, 'rating', {
  label: 'PVE 水平',
  variable: 'pve_level',
  min: 1,
  max: 10,
  step: 1,
  question: '请评价你的 PVE 水平（1-10）',
} as RatingNodeData);

const node08Id = 'node_08_pvx_level';
addNode(node08Id, 'rating', {
  label: 'PVX 水平',
  variable: 'pvx_level',
  min: 1,
  max: 10,
  step: 1,
  question: '请评价你的 PVX 水平（1-10）',
} as RatingNodeData);

// Scene 09: Rank tier
const scene09Id = 'scene_09';
const scene09Setters: string[] = [];
addNode(scene09Id, 'scene', {
  label: '段位选择',
  dialogue: '请选择你的段位',
  speaker: '社交名片',
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
  choices: MBTI_TYPES.map((m, i) => {
    const setterId = `setter_16_${i}`;
    scene16Setters.push(setterId);
    return { id: `mbti${i}`, text: m, interaction: 'tap' as const, targetNodeId: setterId };
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
  choices: ZODIACS.map((z, i) => {
    const setterId = `setter_17_${i}`;
    scene17Setters.push(setterId);
    return { id: `z${i}`, text: z, interaction: 'tap' as const, targetNodeId: setterId };
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

// start → scene_01
addEdge('start', scene01Id);

// scene_01 setters → scene_02
for (const sid of scene01Setters) addEdge(sid, scene02Id);

// scene_02 setters → scene_03
for (const sid of scene02Setters) addEdge(sid, scene03Id);

// scene_03 setters → scene_04
for (const sid of scene03Setters) addEdge(sid, scene04Id);

// scene_04 setters → node_05
for (const sid of scene04Setters) addEdge(sid, node05Id);

// node_05 → node_06 → node_07 → node_08 → scene_09
addEdge(node05Id, node06Id);
addEdge(node06Id, node07Id);
addEdge(node07Id, node08Id);
addEdge(node08Id, scene09Id);

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

// scene_17 setters → settlement
for (const sid of scene17Setters) addEdge(sid, settlementId);

// ── Assemble FlowData ──

const flowData: FlowData = {
  nodes,
  edges,
  variables: {
    server: '',
    mindset: '',
    body_type: '',
    gender: '',
    primary_mode: '',
    pvp_level: 0,
    pve_level: 0,
    pvx_level: 0,
    rank_tier: '',
    game_view_score: 0,
    interests: '',
    mbti: '',
    zodiac: '',
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
