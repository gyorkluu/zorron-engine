/**
 * Full Interactive Narrative & AI GalGame Demo Project
 * 《剑网3·风起稻香》全节点综合演示工程
 *
 * Demonstrates all major node categories and advanced Stage 2.0 capabilities:
 * - Stage 2.0 (4-layer model: Carrier, Interaction, FX, Flow)
 * - Video stream + Dual buffering + Hitbox + QTE Countdown
 * - Audio ducking + CSS/SVG Filters (Vignette, Heartbeat, Bloom)
 * - Branching, Logic guard expressions, Setter variables, Calculator vectors
 * - Minigame, Rating, Rank Order, Multi-Select, Text Input
 * - Settlement result matching and external community link.
 */

import type { FlowData, FlowNode, FlowEdge, ProjectMeta } from '@/types/flow';

export const fullDemoProjectMeta: ProjectMeta = {
  title: '《剑网3·风起稻香》AI 互动影游全节点演示',
  description: '融合 4 层正交舞台、热区 QTE、小游戏、多维决策分支与人格结算的综合演示工程',
  version: '2.0.0',
};

export const fullDemoNodes: FlowNode[] = [
  // 1. 开始节点 (Start)
  {
    id: 'start_0',
    type: 'start',
    position: { x: 50, y: 250 },
    data: {
      label: '剧情开始',
      title: '《风起稻香》交互试炼',
      intro: '盛唐风云变幻，你作为初入江湖的少年侠客，在稻香村古井旁偶遇重伤的莫雨与神秘追兵……',
    },
  },

  // 2. 全能舞台 1：开场视频与对话分支 (Stage 2.0 - Carrier & Choices)
  {
    id: 'stage_prologue',
    type: 'stage',
    position: { x: 380, y: 200 },
    data: {
      label: '稻香村·初遇莫雨',
      carrier: {
        type: 'video',
        url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
        loop: false,
        playbackRate: 1.0,
        timeRange: [0, 8],
      },
      interaction: {
        dialogue: {
          speaker: '莫雨',
          text: '咳……追兵就在身后。少侠，若不想惹祸上身，速速离去！',
          voiceUrl: 'https://actions.google.com/sounds/v1/human_voices/human_male_grunt.ogg',
          autoAdvance: false,
          typingSpeed: 30,
        },
        choices: [
          {
            id: 'c_fight',
            text: '拔剑相助：同退追兵！',
            targetNodeId: 'setter_chivalry',
            vector: { chivalry: 20, courage: 15 },
          },
          {
            id: 'c_puzzle',
            text: '观察四周：寻找机关密道！',
            targetNodeId: 'stage_qte_hitbox',
            vector: { wisdom: 20, agility: 10 },
          },
        ],
        hitboxes: [],
      },
      fx: {
        filter: 'vignette',
        bgm: {
          url: 'https://actions.google.com/sounds/v1/ambiences/wind_heavy_gusts.ogg',
          volume: 0.6,
          loop: true,
        },
      },
      flow: {
        preloadNext: ['setter_chivalry', 'stage_qte_hitbox'],
        mutations: [],
      },
    },
  },

  // 3. 路线 A: 侠义赋值节点 (Setter)
  {
    id: 'setter_chivalry',
    type: 'setter',
    position: { x: 750, y: 100 },
    data: {
      label: '侠义值提升',
      assignments: [
        { variable: 'chivalry', value: 20, operator: 'add' },
        { variable: 'courage', value: 15, operator: 'add' },
        { variable: 'faction_affinity', value: 'haogi', operator: 'set' },
      ],
    },
  },

  // 4. 路线 B: 全能舞台 2：QTE 与画面热区点击 (Stage 2.0 - Hitbox & QTE)
  {
    id: 'stage_qte_hitbox',
    type: 'stage',
    position: { x: 750, y: 350 },
    data: {
      label: '古井机关·紧急 QTE',
      carrier: {
        type: 'video',
        url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
        loop: true,
        playbackRate: 1.0,
        timeRange: [8, 14],
      },
      interaction: {
        dialogue: {
          speaker: '系统提示',
          text: '【QTE 倒计时】在追兵包围前，点击井壁凸起的青龙机关石！',
        },
        hitboxes: [
          {
            id: 'hb_stone',
            action: 'jump',
            x: 42,
            y: 48,
            width: 16,
            height: 16,
            label: '青龙机关石',
            targetNodeId: 'minigame_lockpick',
            highlightOnHover: true,
            soundEffect: 'https://actions.google.com/sounds/v1/doors/creaky_door_open.ogg',
          },
        ],
        choices: [],
        qte: {
          duration: 6,
          actionType: 'click',
          targetNodeId: 'minigame_lockpick',
          failTargetNodeId: 'rating_eval',
        },
      },
      fx: {
        filter: 'heartbeat',
      },
      flow: {
        preloadNext: ['minigame_lockpick'],
        mutations: [],
      },
    },
  },

  // 5. 玩法节点：九宫机关解密 (Minigame)
  {
    id: 'minigame_lockpick',
    type: 'minigame',
    position: { x: 1100, y: 350 },
    data: {
      label: '九宫天机锁',
      minigameId: 'nine-grid-puzzle',
      difficulty: 'medium',
      timeLimit: 30,
      passTargetNodeId: 'multi_evidence',
      failTargetNodeId: 'rating_eval',
    },
  },

  // 6. 交互节点：多选线索调查 (Multi-Select)
  {
    id: 'multi_evidence',
    type: 'multi-select',
    position: { x: 1450, y: 350 },
    data: {
      label: '搜集现场遗留线索',
      prompt: '在破庙与密道中，你发现了以下哪些可疑物件？（多选）',
      minSelect: 1,
      maxSelect: 3,
      options: [
        { id: 'opt_token', text: '带有浩气盟朱雀徽记的腰牌', vector: { chivalry: 10 } },
        { id: 'opt_poison', text: '恶人谷特制的腐骨灵药残渣', vector: { evil: 10 } },
        { id: 'opt_scroll', text: '隐元会关于山河社稷图的残卷', vector: { wisdom: 15 } },
      ],
      targetNodeId: 'rank_tactics',
    },
  },

  // 7. 交互节点：优先级排序 (Rank-Order)
  {
    id: 'rank_tactics',
    type: 'rank-order',
    position: { x: 1800, y: 350 },
    data: {
      label: '突围战术排序',
      prompt: '请将接下来的突围战术按执行优先级由先到后排序：',
      items: [
        { id: 't1', text: '【奇穴全开】运转内力护住心脉' },
        { id: 't2', text: '【声东击西】投掷烟幕弹迷惑追兵' },
        { id: 't3', text: '【凌霄御风】施展大轻功掠向密林' },
      ],
      targetNodeId: 'input_name',
    },
  },

  // 8. 交互节点：玩家名册录入 (Text-Input)
  {
    id: 'input_name',
    type: 'text-input',
    position: { x: 2150, y: 350 },
    data: {
      label: '侠士尊号录入',
      prompt: '大侠已成功突围！请在《大唐江湖群侠录》上留下尊号：',
      placeholder: '例如：剑纯天下第一',
      variable: 'player_name',
      targetNodeId: 'rating_eval',
    },
  },

  // 9. 交互节点：江湖评分 (Rating)
  {
    id: 'rating_eval',
    type: 'rating',
    position: { x: 1100, y: 100 },
    data: {
      label: '本次应变评价',
      prompt: '对本次突围应变与战术决策给出自我评价（1~5星）：',
      maxRating: 5,
      variable: 'self_rating',
      targetNodeId: 'logic_branch',
    },
  },

  // 10. 逻辑与控制：条件分支判断 (Logic)
  {
    id: 'logic_branch',
    type: 'logic',
    position: { x: 2480, y: 220 },
    data: {
      label: '阵营归属判定',
      checkType: 'variable',
      varName: 'chivalry',
      operator: '>=',
      value: 20,
      conditions: [
        {
          id: 'cond_haogi',
          expression: 'chivalry >= 20',
          targetNodeId: 'stage_haogi_end',
        },
      ],
      defaultTargetNodeId: 'stage_neutral_end',
    },
  },

  // 11. 全能舞台 3：浩气名侠胜利终幕 (Stage 2.0 - Bloom FX & Happy Ending)
  {
    id: 'stage_haogi_end',
    type: 'stage',
    position: { x: 2850, y: 100 },
    data: {
      label: '落雁峰·浩气长存',
      carrier: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
      },
      interaction: {
        dialogue: {
          speaker: '谢渊',
          text: '心怀浩然正气，拔剑护佑苍生。少侠，浩气盟正需你这般英才！',
        },
        choices: [
          {
            id: 'c_settle_1',
            text: '查看我的江湖门派测试报告',
            targetNodeId: 'settlement_final',
          },
        ],
      },
      fx: {
        filter: 'bloom',
      },
    },
  },

  // 12. 全能舞台 4：逍遥隐逸结局 (Stage 2.0 - Sepia FX)
  {
    id: 'stage_neutral_end',
    type: 'stage',
    position: { x: 2850, y: 350 },
    data: {
      label: '青岩万花·逍遥隐逸',
      carrier: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
      },
      interaction: {
        dialogue: {
          speaker: '东方宇轩',
          text: '不慕荣利，独钓寒江。万花谷晴昼海，随时为君敞开。',
        },
        choices: [
          {
            id: 'c_settle_2',
            text: '查看我的江湖门派测试报告',
            targetNodeId: 'settlement_final',
          },
        ],
      },
      fx: {
        filter: 'sepia',
      },
    },
  },

  // 13. 产出与结算节点 (Settlement)
  {
    id: 'settlement_final',
    type: 'settlement',
    position: { x: 3220, y: 220 },
    data: {
      label: '江湖人格结算卡',
      strategy: 'mapping',
      title: '《大唐江湖英雄谱》结算卡',
      description: '大侠已完成稻香村奇遇试炼',
      resultMapping: [
        {
          resultId: 'res_tiance',
          title: '天策府 / 浩气盟 · 傲骨长枪',
          description: '胸怀天下，尽诛宵小。你拥有坚毅果决的领袖气质与无畏勇气。',
          badgeUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300',
        },
        {
          resultId: 'res_wanhua',
          title: '万花谷 · 妙手仁心',
          description: '兼济天下，风雅高洁。你善于洞察全局，以智慧与医道化解纷争。',
          badgeUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300',
        },
      ],
      targetNodeId: 'link_community',
    },
  },

  // 14. 外部链接引导节点 (Link)
  {
    id: 'link_community',
    type: 'link',
    position: { x: 3550, y: 220 },
    data: {
      label: '分享到大唐江湖榜',
      url: 'https://jx3.xoyo.com',
      openInNewTab: true,
    },
  },
];

export const fullDemoEdges: FlowEdge[] = [
  { id: 'e_start_stage', source: 'start_0', target: 'stage_prologue', type: 'zorron' },
  { id: 'e_stage_setter', source: 'stage_prologue', target: 'setter_chivalry', type: 'zorron' },
  { id: 'e_stage_qte', source: 'stage_prologue', target: 'stage_qte_hitbox', type: 'zorron' },
  { id: 'e_setter_rating', source: 'setter_chivalry', target: 'rating_eval', type: 'zorron' },
  { id: 'e_qte_minigame', source: 'stage_qte_hitbox', target: 'minigame_lockpick', type: 'zorron' },
  { id: 'e_mini_evidence', source: 'minigame_lockpick', target: 'multi_evidence', type: 'zorron' },
  { id: 'e_evidence_rank', source: 'multi_evidence', target: 'rank_tactics', type: 'zorron' },
  { id: 'e_rank_name', source: 'rank_tactics', target: 'input_name', type: 'zorron' },
  { id: 'e_name_eval', source: 'input_name', target: 'rating_eval', type: 'zorron' },
  { id: 'e_eval_logic', source: 'rating_eval', target: 'logic_branch', type: 'zorron' },
  { id: 'e_logic_haogi', source: 'logic_branch', target: 'stage_haogi_end', sourceHandle: 'true', type: 'zorron' },
  { id: 'e_logic_neutral', source: 'logic_branch', target: 'stage_neutral_end', sourceHandle: 'false', type: 'zorron' },
  { id: 'e_haogi_settle', source: 'stage_haogi_end', target: 'settlement_final', type: 'zorron' },
  { id: 'e_neutral_settle', source: 'stage_neutral_end', target: 'settlement_final', type: 'zorron' },
  { id: 'e_settle_link', source: 'settlement_final', target: 'link_community', type: 'zorron' },
];

export const fullDemoFlowData: FlowData = {
  meta: fullDemoProjectMeta,
  nodes: fullDemoNodes,
  edges: fullDemoEdges,
};
