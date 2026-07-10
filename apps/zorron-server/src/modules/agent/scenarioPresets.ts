/**
 * ECO-001: Built-in scenario presets.
 *
 * Each preset is a complete ScenarioIntent template that an AI Agent can use
 * as a starting point. The agent fetches a preset via GET /api/agent/presets,
 * then customizes dimension names, anchor titles, step dialogues, and
 * settlement config before compiling.
 *
 * Presets cover the 5 scenario types defined in scenarioTypes.ts.
 */

import type { ScenarioIntent } from './agent.schema';

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  /** The scenario type this preset is designed for. */
  type: string;
  /** The full ScenarioIntent template. */
  intent: ScenarioIntent;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  // ── 1. Personality Test ──
  {
    id: 'preset-personality-test',
    name: '人格测试模板',
    description:
      '3-dimensional personality assessment with vector accumulation and nearest-anchor matching. Players make choices that push their vector toward one of several archetypes.',
    type: 'personality-test',
    intent: {
      type: 'personality-test',
      title: '人格测试',
      description: '通过一系列情景选择，发现你的人格类型',
      dimensions: { x: '处世', y: '立场', z: '性情' },
      anchors: [
        {
          id: 'anchor-a',
          name: '类型A',
          vector: { x: 2, y: 0, z: 0 },
          title: '坚毅型',
          description: '果断、直接、以行动为导向',
        },
        {
          id: 'anchor-b',
          name: '类型B',
          vector: { x: -2, y: 2, z: 0 },
          title: '调和型',
          description: '温和、善解人意、注重平衡',
        },
        {
          id: 'anchor-c',
          name: '类型C',
          vector: { x: 0, y: -2, z: 2 },
          title: '创意型',
          description: '灵活、富有想象力、不拘一格',
        },
      ],
      steps: [
        {
          id: 'q1',
          kind: 'scene',
          dialogue: '面对突发的冲突，你的第一反应是？',
          speaker: '旁白',
          choices: [
            { text: '直接介入解决', interaction: 'tap', vector: { x: 1, y: 0, z: 0 } },
            { text: '先了解双方立场', interaction: 'tap', vector: { x: -1, y: 1, z: 0 } },
            { text: '想一个创意方案', interaction: 'tap', vector: { x: 0, y: -1, z: 1 } },
          ],
        },
        {
          id: 'q2',
          kind: 'scene',
          dialogue: '团队合作中，你更倾向于？',
          speaker: '旁白',
          choices: [
            { text: '带领团队前进', interaction: 'tap', vector: { x: 1, y: 0, z: 0 } },
            { text: '协调成员关系', interaction: 'tap', vector: { x: -1, y: 1, z: 0 } },
            { text: '提出创新思路', interaction: 'tap', vector: { x: 0, y: -1, z: 1 } },
          ],
        },
        {
          id: 'q3',
          kind: 'scene',
          dialogue: '面对未知的挑战，你会？',
          speaker: '旁白',
          choices: [
            { text: '迎难而上', interaction: 'tap', vector: { x: 1, y: 0, z: 0 } },
            { text: '评估风险再行动', interaction: 'tap', vector: { x: -1, y: 1, z: 0 } },
            { text: '寻找非常规路径', interaction: 'tap', vector: { x: 0, y: -1, z: 1 } },
          ],
        },
        {
          id: 'calc',
          kind: 'calculator',
          targetVariable: 'personalityScore',
        },
      ],
      settlement: {
        strategy: 'vector-nearest',
        visualBlocks: ['badge', 'sprite', 'layered-texts', 'radar'],
      },
    },
  },

  // ── 2. Game Social Card ──
  {
    id: 'preset-game-social-card',
    name: '游戏社交卡片模板',
    description:
      'Generates a game social card with gameplay-style questions. Uses game-relevant dimensions (attack/defense/mobility) and produces a profile suitable for matching systems.',
    type: 'game-social-card',
    intent: {
      type: 'game-social-card',
      title: '游戏社交卡片',
      description: '通过游戏化的选择，生成你的游戏社交卡片',
      dimensions: { x: '攻击', y: '防御', z: '机动' },
      anchors: [
        {
          id: 'warrior',
          name: '战士',
          vector: { x: 2, y: 1, z: 0 },
          title: '前线战士',
          description: '喜欢正面交锋，以力量压制对手',
        },
        {
          id: 'guardian',
          name: '守护者',
          vector: { x: 0, y: 2, z: 1 },
          title: '坚盾守护者',
          description: '擅长防守和保护队友',
        },
        {
          id: 'scout',
          name: '斥候',
          vector: { x: 1, y: 0, z: 2 },
          title: '机动斥候',
          description: '灵活机动，善于寻找战机',
        },
      ],
      steps: [
        {
          id: 'intro',
          kind: 'scene',
          dialogue: '进入战场，你的首选装备是？',
          speaker: '教官',
          choices: [
            { text: '重型武器', interaction: 'tap', vector: { x: 1, y: 0, z: 0 } },
            { text: '坚固盾牌', interaction: 'tap', vector: { x: 0, y: 1, z: 0 } },
            { text: '轻型护甲', interaction: 'tap', vector: { x: 0, y: 0, z: 1 } },
          ],
        },
        {
          id: 'q2',
          kind: 'scene',
          dialogue: '团队遭遇伏击，你的反应是？',
          speaker: '教官',
          choices: [
            { text: '冲入敌阵', interaction: 'tap', vector: { x: 1, y: 0, z: 0 } },
            { text: '构筑防线', interaction: 'tap', vector: { x: 0, y: 1, z: 0 } },
            { text: '侧翼迂回', interaction: 'tap', vector: { x: 0, y: 0, z: 1 } },
          ],
        },
        {
          id: 'q3',
          kind: 'scene',
          dialogue: '最终BOSS战中，你的角色是？',
          speaker: '教官',
          choices: [
            { text: '输出核心', interaction: 'tap', vector: { x: 1, y: 0, z: 0 } },
            { text: '坦克抗伤', interaction: 'tap', vector: { x: 0, y: 1, z: 0 } },
            { text: '游走支援', interaction: 'tap', vector: { x: 0, y: 0, z: 1 } },
          ],
        },
        {
          id: 'calc',
          kind: 'calculator',
          targetVariable: 'combatStyle',
        },
      ],
      settlement: {
        strategy: 'vector-nearest',
        visualBlocks: ['badge', 'sprite', 'layered-texts', 'radar', 'game-profile-summary'],
      },
    },
  },

  // ── 3. Quiz ──
  {
    id: 'preset-quiz',
    name: '知识竞赛模板',
    description:
      'Single-answer quiz with correct/incorrect scoring. Uses count-tally settlement to compute the final score and display a bar chart.',
    type: 'quiz',
    intent: {
      type: 'quiz',
      title: '知识竞赛',
      description: '回答问题，测试你的知识水平',
      steps: [
        {
          id: 'q1',
          kind: 'scene',
          dialogue: '地球绕太阳一周需要多少天？',
          speaker: '主持人',
          choices: [
            { text: '365天', interaction: 'tap', dropFragmentId: 'correct' },
            { text: '300天', interaction: 'tap' },
            { text: '400天', interaction: 'tap' },
          ],
        },
        {
          id: 'q2',
          kind: 'scene',
          dialogue: '光速大约是每秒多少公里？',
          speaker: '主持人',
          choices: [
            { text: '30万公里', interaction: 'tap', dropFragmentId: 'correct' },
            { text: '10万公里', interaction: 'tap' },
            { text: '50万公里', interaction: 'tap' },
          ],
        },
        {
          id: 'q3',
          kind: 'scene',
          dialogue: '水的化学分子式是？',
          speaker: '主持人',
          choices: [
            { text: 'H2O', interaction: 'tap', dropFragmentId: 'correct' },
            { text: 'CO2', interaction: 'tap' },
            { text: 'O2', interaction: 'tap' },
          ],
        },
        {
          id: 'calc',
          kind: 'calculator',
          targetVariable: 'score',
        },
      ],
      settlement: {
        strategy: 'count-tally',
        strategyConfig: { countFragmentId: 'correct' },
        resultMapping: [
          { resultId: 'perfect', title: '满分', description: '全部答对！' },
          { resultId: 'good', title: '优秀', description: '答对大部分' },
          { resultId: 'try-again', title: '再接再厉', description: '继续努力' },
        ],
        visualBlocks: ['score-badge', 'bar-chart', 'text-only'],
      },
    },
  },

  // ── 4. Survey ──
  {
    id: 'preset-survey',
    name: '问卷调研模板',
    description:
      'Multi-select survey that maps choices to tags. Uses variable-map settlement to produce a user tag profile displayed as a tag cloud.',
    type: 'survey',
    intent: {
      type: 'survey',
      title: '用户兴趣调研',
      description: '选择你感兴趣的领域，生成你的兴趣画像',
      steps: [
        {
          id: 'q1',
          kind: 'scene',
          dialogue: '你平时喜欢哪些类型的娱乐？（可多选）',
          speaker: '调研员',
          choices: [
            { text: '电影', interaction: 'tap', dropFragmentId: 'tag-movie' },
            { text: '音乐', interaction: 'tap', dropFragmentId: 'tag-music' },
            { text: '游戏', interaction: 'tap', dropFragmentId: 'tag-game' },
            { text: '阅读', interaction: 'tap', dropFragmentId: 'tag-reading' },
          ],
        },
        {
          id: 'q2',
          kind: 'scene',
          dialogue: '你更喜欢哪种学习方式？',
          speaker: '调研员',
          choices: [
            { text: '视频教程', interaction: 'tap', dropFragmentId: 'tag-visual' },
            { text: '书籍阅读', interaction: 'tap', dropFragmentId: 'tag-reading' },
            { text: '实践操作', interaction: 'tap', dropFragmentId: 'tag-hands-on' },
            { text: '讨论交流', interaction: 'tap', dropFragmentId: 'tag-social' },
          ],
        },
        {
          id: 'calc',
          kind: 'calculator',
          targetVariable: 'tagCount',
        },
      ],
      settlement: {
        strategy: 'variable-map',
        strategyConfig: { variableName: 'tagCount' },
        resultMapping: [
          { resultId: 'visual-learner', title: '视觉型', description: '偏好图像和视频' },
          { resultId: 'reader', title: '阅读型', description: '偏好文字内容' },
          { resultId: 'social-learner', title: '社交型', description: '偏好互动学习' },
        ],
        visualBlocks: ['tags-cloud', 'text-only'],
      },
    },
  },

  // ── 5. Story Adventure ──
  {
    id: 'preset-story-adventure',
    name: '剧情冒险模板',
    description:
      'Branching narrative with multiple endings. Uses variable-map settlement to select an ending based on accumulated story variables.',
    type: 'story-adventure',
    intent: {
      type: 'story-adventure',
      title: '迷雾森林',
      description: '在迷雾森林中探索，你的选择将决定你的命运',
      steps: [
        {
          id: 'start',
          kind: 'scene',
          dialogue: '你来到一片迷雾森林的入口，左右各有一条路。',
          speaker: '旁白',
          choices: [
            { text: '走向左边的小径', interaction: 'tap', nextStep: 'left-path' },
            { text: '走向右边的古道', interaction: 'tap', nextStep: 'right-path' },
          ],
        },
        {
          id: 'left-path',
          kind: 'scene',
          dialogue: '你发现一座古老的石碑，上面刻着神秘的符文。',
          speaker: '旁白',
          choices: [
            { text: '触摸符文', interaction: 'tap', nextStep: 'rune-ending' },
            { text: '继续前行', interaction: 'tap', nextStep: 'settlement' },
          ],
        },
        {
          id: 'right-path',
          kind: 'scene',
          dialogue: '你遇到一位神秘的老者，他向你伸出手。',
          speaker: '旁白',
          choices: [
            { text: '握住他的手', interaction: 'tap', nextStep: 'sage-ending' },
            { text: '绕道而行', interaction: 'tap', nextStep: 'settlement' },
          ],
        },
        {
          id: 'rune-ending',
          kind: 'scene',
          dialogue: '符文亮起，你获得了古老的力量。',
          speaker: '旁白',
          choices: [{ text: '结束冒险', interaction: 'tap', nextStep: 'settlement' }],
        },
        {
          id: 'sage-ending',
          kind: 'scene',
          dialogue: '老者赐予你智慧的启示。',
          speaker: '旁白',
          choices: [{ text: '结束冒险', interaction: 'tap', nextStep: 'settlement' }],
        },
      ],
      settlement: {
        strategy: 'variable-map',
        resultMapping: [
          { resultId: 'power-ending', title: '力量之路', description: '你选择了力量' },
          { resultId: 'wisdom-ending', title: '智慧之路', description: '你选择了智慧' },
          { resultId: 'neutral-ending', title: '平淡之路', description: '你选择了安全' },
        ],
        visualBlocks: ['ending-card', 'text-only'],
      },
    },
  },
];

/** Find a preset by id. */
export function findPreset(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.id === id);
}
