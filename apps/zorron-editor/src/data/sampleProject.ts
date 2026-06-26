/**
 * Sample narrative project data - "江湖奇遇" (Jianghu Adventure).
 *
 * A complete FlowData showcasing all 8 node types, variable usage,
 * vector space configuration with sects, and branching paths.
 * Migrated from the test fixtures in GameEngine.test.ts and
 * simulator.test.ts into a runnable sample project.
 */

import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';

/** Sample nodes covering all 8 node types. */
const nodes: FlowNode[] = [
  {
    id: 'start_1',
    type: 'start',
    position: { x: 0, y: 0 },
    data: {
      label: '开始',
      title: '江湖奇遇录',
      intro: '少年仗剑出长安，踏入风云变幻的江湖……',
    },
  },
  {
    id: 'scene_1',
    type: 'scene',
    position: { x: 300, y: 0 },
    data: {
      label: '山道偶遇',
      dialogue: '你在山道上遇到一位老者，他拦住你的去路，说道："年轻人，前方危险，不如随我绕行。"',
      speaker: '神秘老者',
      choices: [
        {
          id: 'c_accept',
          text: '听从劝告，绕行小道',
          interaction: 'tap',
          targetNodeId: 'setter_1',
          vector: { x: 1, y: -1, z: 0 },
          dropFragmentId: 'frag_wisdom',
        },
        {
          id: 'c_refuse',
          text: '长按拒绝，坚持前行',
          interaction: 'hold',
          holdDuration: 1500,
          targetNodeId: 'scene_2',
          vector: { x: -1, y: 1, z: 1 },
        },
      ],
    },
  },
  {
    id: 'setter_1',
    type: 'setter',
    position: { x: 300, y: 250 },
    data: {
      label: '获得智慧碎片',
      assignments: [
        { variable: 'wisdom', value: 10, operator: 'set' },
        { variable: 'courage', value: -2, operator: 'add' },
      ],
    },
  },
  {
    id: 'scene_2',
    type: 'scene',
    position: { x: 600, y: 0 },
    data: {
      label: '山贼拦路',
      dialogue: '前方山道上，三名山贼挡住了去路。为首者冷笑道："留下银两，放你过去！"',
      speaker: '山贼头目',
      choices: [
        {
          id: 'c_fight',
          text: '挥剑迎敌',
          interaction: 'slash',
          slashDirection: 'right',
          targetNodeId: 'calc_1',
          vector: { x: 0, y: 2, z: 1 },
        },
        {
          id: 'c_pay',
          text: '掏钱买路',
          interaction: 'tap',
          targetNodeId: 'logic_1',
          vector: { x: 0, y: -1, z: -1 },
        },
      ],
    },
  },
  {
    id: 'calc_1',
    type: 'calculator',
    position: { x: 600, y: 250 },
    data: {
      label: '勇气向量结算',
      vector: { x: 0, y: 0, z: 0 },
      targetVariable: 'bravery',
      description: '战斗后勇气值提升',
    },
  },
  {
    id: 'logic_1',
    type: 'logic',
    position: { x: 900, y: 0 },
    data: {
      label: '银两检查',
      checkType: 'variable',
      varName: 'wisdom',
      operator: '>=',
      value: 10,
      condition: 'wisdom >= 10',
    },
  },
  {
    id: 'video_1',
    type: 'video',
    position: { x: 900, y: 250 },
    data: {
      label: '过场动画',
      videoUrl: 'https://example.com/jianghu-intro.mp4',
      autoPlay: true,
      skipAllowed: true,
    },
  },
  {
    id: 'settlement_1',
    type: 'settlement',
    position: { x: 1200, y: 0 },
    data: {
      label: '结局判定',
      resultMapping: [
        {
          resultId: 'r_hero',
          title: '侠之大者',
          description: '你以勇气和智慧闯过难关，江湖传颂你的名号。',
          coverUrl: 'https://example.com/hero-ending.png',
        },
        {
          resultId: 'r_sage',
          title: '智者归隐',
          description: '你以智慧化解纷争，选择归隐山林。',
          coverUrl: 'https://example.com/sage-ending.png',
        },
      ],
    },
  },
  {
    id: 'link_1',
    type: 'link',
    position: { x: 1200, y: 250 },
    data: {
      label: '外部链接',
      url: 'https://zorron.io/jianghu-lore',
      title: '了解更多江湖传说',
      description: '点击访问外部资料站',
    },
  },
];

/** Sample edges connecting the narrative flow. */
const edges: FlowEdge[] = [
  { id: 'e_start_scene1', source: 'start_1', target: 'scene_1', sourceHandle: null, targetHandle: null },
  { id: 'e_scene1_setter', source: 'scene_1', target: 'setter_1', sourceHandle: 'c_accept', targetHandle: null },
  { id: 'e_scene1_scene2', source: 'scene_1', target: 'scene_2', sourceHandle: 'c_refuse', targetHandle: null },
  { id: 'e_setter_logic', source: 'setter_1', target: 'logic_1', sourceHandle: null, targetHandle: null },
  { id: 'e_scene2_calc', source: 'scene_2', target: 'calc_1', sourceHandle: 'c_fight', targetHandle: null },
  { id: 'e_scene2_logic', source: 'scene_2', target: 'logic_1', sourceHandle: 'c_pay', targetHandle: null },
  { id: 'e_calc_video', source: 'calc_1', target: 'video_1', sourceHandle: null, targetHandle: null },
  { id: 'e_video_settlement', source: 'video_1', target: 'settlement_1', sourceHandle: null, targetHandle: null },
  { id: 'e_logic_settlement', source: 'logic_1', target: 'settlement_1', sourceHandle: 'true', targetHandle: null },
  { id: 'e_logic_link', source: 'logic_1', target: 'link_1', sourceHandle: 'false', targetHandle: null },
];

/** Complete sample FlowData with vector space and variables. */
export const sampleFlowData: FlowData = {
  nodes,
  edges,
  variables: {
    wisdom: 0,
    courage: 5,
    bravery: 0,
  },
  settings: {
    title: '江湖奇遇录',
    description: '一个展示 Zorron Engine 全部节点类型的示例叙事项目',
    coverUrl: 'https://example.com/jianghu-cover.png',
    bgmUrl: 'https://example.com/jianghu-bgm.mp3',
    vectorSpace: {
      enabled: true,
      dimensions: { x: '处世', y: '立场', z: '性情' },
      sects: [
        {
          id: 'sect_hero',
          name: '侠客门',
          vector: { x: 1, y: 2, z: 1 },
          title: '侠客',
          description: '勇武正直，仗剑天涯',
          coverUrl: 'https://example.com/sect-hero.png',
        },
        {
          id: 'sect_sage',
          name: '隐士门',
          vector: { x: 2, y: -1, z: 0 },
          title: '隐士',
          description: '智慧通达，归隐山林',
          coverUrl: 'https://example.com/sect-sage.png',
        },
        {
          id: 'sect_rogue',
          name: '游侠门',
          vector: { x: -1, y: 1, z: 2 },
          title: '游侠',
          description: '放荡不羁，行走江湖',
          coverUrl: 'https://example.com/sect-rogue.png',
        },
      ],
    },
  },
  version: '1.0.0',
};

/** Sample project metadata for display. */
export const sampleProjectMeta = {
  title: '江湖奇遇录',
  description: '一个展示 Zorron Engine 全部节点类型的示例叙事项目',
};
