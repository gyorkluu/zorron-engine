/**
 * Scenario type metadata and node capability catalog.
 *
 * These are served by GET /api/agent/scenario-types and
 * GET /api/agent/node-capabilities so AI Agents can discover what the
 * engine supports before generating a ScenarioIntent.
 */

export interface ScenarioTypeInfo {
  type: string;
  name: string;
  description: string;
  /** Whether this scenario type uses the vector space. */
  usesVectorSpace: boolean;
  /** Default settlement strategy for this scenario type. */
  defaultStrategy: string;
  /** Recommended visual blocks for the settlement page. */
  recommendedVisualBlocks: string[];
  /** Example dimensions for vector-type scenarios. */
  exampleDimensions?: Record<string, string>;
}

export const SCENARIO_TYPES: ScenarioTypeInfo[] = [
  {
    type: 'personality-test',
    name: '人格测试',
    description:
      'Multi-dimensional personality assessment. Players make choices that accumulate vector deltas, then matched to the nearest archetype anchor.',
    usesVectorSpace: true,
    defaultStrategy: 'vector-nearest',
    recommendedVisualBlocks: ['badge', 'sprite', 'layered-texts', 'radar'],
    exampleDimensions: { x: '处世', y: '立场', z: '性情' },
  },
  {
    type: 'game-social-card',
    name: '游戏社交卡片',
    description:
      'Generates a game social card from gameplay-style questions. Output includes a game profile for matching systems.',
    usesVectorSpace: true,
    defaultStrategy: 'vector-nearest',
    recommendedVisualBlocks: [
      'badge',
      'sprite',
      'layered-texts',
      'radar',
      'game-profile-summary',
    ],
    exampleDimensions: { x: '攻击', y: '防御', z: '机动' },
  },
  {
    type: 'quiz',
    name: '知识竞赛',
    description:
      'Single-answer quiz with correct/incorrect scoring. Settlement uses count-tally to compute the final score.',
    usesVectorSpace: false,
    defaultStrategy: 'count-tally',
    recommendedVisualBlocks: ['score-badge', 'bar-chart', 'text-only'],
  },
  {
    type: 'survey',
    name: '问卷调研',
    description:
      'Multi-select survey that maps choices to tags. Settlement uses variable-map to produce a user tag profile.',
    usesVectorSpace: false,
    defaultStrategy: 'variable-map',
    recommendedVisualBlocks: ['tags-cloud', 'text-only'],
  },
  {
    type: 'story-adventure',
    name: '剧情冒险',
    description:
      'Branching narrative with fragment collection. Multiple endings reached via variable-map settlement.',
    usesVectorSpace: false,
    defaultStrategy: 'variable-map',
    recommendedVisualBlocks: ['ending-card', 'text-only'],
  },
  {
    type: 'custom',
    name: '自定义',
    description:
      'Fully custom scenario. Agent specifies all dimensions, anchors, steps, and settlement config.',
    usesVectorSpace: false,
    defaultStrategy: 'vector-nearest',
    recommendedVisualBlocks: ['badge', 'title', 'text-only'],
  },
];

export interface NodeCapabilityInfo {
  type: string;
  label: string;
  description: string;
  isTerminal: boolean;
  /** Fields the agent can set when declaring a step of this kind. */
  fields: string[];
}

export const NODE_CAPABILITIES: NodeCapabilityInfo[] = [
  {
    type: 'start',
    label: '开始',
    description: 'Entry point of the flow. Shows title and intro.',
    isTerminal: false,
    fields: ['title', 'intro', 'coverUrl'],
  },
  {
    type: 'scene',
    label: '场景',
    description: 'Dialogue with player choices. Each choice can carry vector deltas and fragments.',
    isTerminal: false,
    fields: ['dialogue', 'speaker', 'choices', 'backgroundUrl', 'characterUrl'],
  },
  {
    type: 'logic',
    label: '逻辑',
    description: 'Conditional branch based on variables, fragment count, or specific fragment.',
    isTerminal: false,
    fields: ['checkType', 'varName', 'operator', 'value', 'countThreshold', 'targetFragmentId'],
  },
  {
    type: 'setter',
    label: '赋值',
    description: 'Sets or modifies game variables.',
    isTerminal: false,
    fields: ['assignments'],
  },
  {
    type: 'calculator',
    label: '计算',
    description: 'Applies pending vector deltas and optionally writes magnitude to a variable.',
    isTerminal: false,
    fields: ['targetVariable'],
  },
  {
    type: 'settlement',
    label: '结算',
    description: 'Terminal node that evaluates the final result using a settlement strategy.',
    isTerminal: true,
    fields: ['strategy', 'strategyConfig', 'resultMapping', 'buttons'],
  },
  {
    type: 'video',
    label: '视频',
    description: 'Video playback node with optional skip.',
    isTerminal: false,
    fields: ['videoUrl', 'skipAllowed'],
  },
  {
    type: 'link',
    label: '链接',
    description: 'Terminal node that redirects to an external URL.',
    isTerminal: true,
    fields: ['url', 'title', 'description'],
  },
];

/** Available settlement strategies. */
export const SETTLEMENT_STRATEGIES = [
  {
    id: 'vector-nearest',
    name: 'Vector Nearest',
    description: 'Matches the player vector to the nearest anchor by Euclidean distance with quadrant locking.',
  },
  {
    id: 'threshold',
    name: 'Threshold',
    description: 'Evaluates axis-threshold rules to find the first matching anchor.',
  },
  {
    id: 'count-tally',
    name: 'Count Tally',
    description: 'Counts fragments or variable values to find the highest-mapped anchor.',
  },
  {
    id: 'variable-map',
    name: 'Variable Map',
    description: 'Compares a game variable against rules to select an anchor.',
  },
];
