/**
 * Backend Agent Module - Node Skills & Boundary Rules.
 *
 * Synchronized with frontend `nodeSkills.ts` to ensure consistent
 * LLM understanding and system boundary enforcement across server compilation and simulation.
 */

export interface BackendNodeSkill {
  type: string;
  name: string;
  keywords: string[];
  summary: string;
  boundaries: string[];
}

export const BACKEND_NODE_SKILLS: Record<string, BackendNodeSkill> = {
  start: {
    type: 'start',
    name: '起点节点 (Start Node)',
    keywords: ['起点', '开始', '封面', '标题', 'start'],
    summary: '工程入口，场景唯一的起点。',
    boundaries: ['系统有且仅有 1 个 start 节点', '禁止删除或创建多于 1 个'],
  },
  scene: {
    type: 'scene',
    name: '剧情/选项节点 (Scene Node)',
    keywords: ['剧情', '题目', '选项', '对话', '问答', 'scene'],
    summary: '核心对话与多选项分流。',
    boundaries: ['至少包含 1 个选项 choice'],
  },
  settlement: {
    type: 'settlement',
    name: '结算节点 (Settlement Node)',
    keywords: ['结算', '结论', '结果', '卡片', 'settlement'],
    summary: '测试游玩的终端卡片输出。',
    boundaries: ['终端节点，不可拉出出边'],
  },
  logic: {
    type: 'logic',
    name: '条件分支节点 (Logic Node)',
    keywords: ['逻辑', '条件', '分支', '判断', 'logic'],
    summary: '判断玩家变量或得分进行分流。',
    boundaries: ['变量名需存在且合规'],
  },
};
