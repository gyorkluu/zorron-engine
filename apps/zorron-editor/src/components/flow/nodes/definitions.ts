/**
 * Node definition registrations - the single registration point for all
 * built-in node types.
 *
 * Importing this module (side-effect import) registers every node type's
 * metadata into the NodeDefinition registry. `nodes/index.ts` imports this so
 * registration runs before the canvas renders.
 *
 * Adding a new built-in node type: create its CanvasComponent + InspectorForm,
 * then add one `registerNode({...})` call here. No other file needs editing for
 * palette / canvas / inspector / icon / accent / terminal-flag concerns.
 */

import {
  Play,
  MessageSquare,
  GitBranch,
  Settings2,
  Calculator as CalculatorIcon,
  Trophy,
  Video,
  ExternalLink,
  Gamepad2,
  Star,
  ListChecks,
  ImageIcon,
  Type,
  ArrowUpDown,
  Sliders,
  Clapperboard,
} from 'lucide-react';
import { tt } from '@/i18n/useT';
import { registerNode } from '@/engine/nodeRegistry';
import { StageNode } from './StageNode';
import { StartNode } from './StartNode';
import { SceneNode } from './SceneNode';
import { LogicNode } from './LogicNode';
import { SetterNode } from './SetterNode';
import { CalculatorNode } from './CalculatorNode';
import { SettlementNode } from './SettlementNode';
import { VideoNode } from './VideoNode';
import { LinkNode } from './LinkNode';
import {
  MinigameNode,
  RatingNode,
  MultiSelectNode,
  MediaNode,
  TextInputNode,
  RankOrderNode,
  NumberPickerNode,
} from './InteractionNodes';
import { StageForm } from '@/components/inspector/StageForm';
import {
  StartForm,
  SceneForm,
  LogicForm,
  SetterForm,
  CalculatorForm,
  SettlementForm,
  VideoForm,
  LinkForm,
  MinigameForm,
  RatingForm,
  MultiSelectForm,
  MediaForm,
  TextInputForm,
  RankOrderForm,
  NumberPickerForm,
} from '@/components/inspector/nodeForms';

// ── 🎬 叙事与展示 (Narrative & Presentation) ───────────────────
registerNode({
  type: 'stage',
  category: 'narrative',
  labelKey: 'node.stage.label',
  descKey: 'node.stage.desc',
  icon: Clapperboard,
  accent: '#06b6d4',
  CanvasComponent: StageNode,
  InspectorForm: StageForm,
  createDefault: () => ({
    label: tt('node.default.stage'),
    carrier: {
      type: 'video',
      url: '',
      loop: false,
      playbackRate: 1.0,
    },
    interaction: {
      dialogue: { text: '' },
      choices: [],
      hitboxes: [],
    },
    fx: {
      filter: 'none',
    },
    flow: {
      preloadNext: [],
      mutations: [],
    },
  }),
});

registerNode({
  type: 'start',
  category: 'narrative',
  labelKey: 'node.start.label',
  descKey: 'node.start.desc',
  icon: Play,
  accent: '#22d3ee',
  CanvasComponent: StartNode,
  InspectorForm: StartForm,
  createDefault: () => ({
    label: tt('node.default.start'),
    title: tt('node.default.newStory'),
    intro: '',
  }),
});

registerNode({
  type: 'scene',
  category: 'narrative',
  labelKey: 'node.scene.label',
  descKey: 'node.scene.desc',
  icon: MessageSquare,
  accent: '#a78bfa',
  CanvasComponent: SceneNode,
  InspectorForm: SceneForm,
  createDefault: () => ({
    label: tt('node.default.scene'),
    dialogue: '',
    choices: [],
  }),
});

registerNode({
  type: 'media',
  category: 'narrative',
  labelKey: 'node.media.label',
  descKey: 'node.media.desc',
  icon: ImageIcon,
  accent: '#38bdf8',
  CanvasComponent: MediaNode,
  InspectorForm: MediaForm,
  createDefault: () => ({
    label: tt('node.default.media'),
    mediaType: 'image',
    url: '',
    autoAdvance: false,
    durationMs: 0,
  }),
});

registerNode({
  type: 'video',
  category: 'narrative',
  labelKey: 'node.video.label',
  descKey: 'node.video.desc',
  icon: Video,
  accent: '#fb7185',
  CanvasComponent: VideoNode,
  InspectorForm: VideoForm,
  createDefault: () => ({
    label: tt('node.default.video'),
    videoUrl: '',
    autoPlay: true,
    skipAllowed: true,
  }),
});

registerNode({
  type: 'link',
  category: 'narrative',
  labelKey: 'node.link.label',
  descKey: 'node.link.desc',
  icon: ExternalLink,
  accent: '#94a3b8',
  CanvasComponent: LinkNode,
  InspectorForm: LinkForm,
  isTerminal: true,
  createDefault: () => ({
    label: tt('node.default.link'),
    url: '',
    title: '',
  }),
});

// ── ⚡ 交互与输入 (Interaction & Input) ───────────────────────
registerNode({
  type: 'text-input',
  category: 'interaction',
  labelKey: 'node.textInput.label',
  descKey: 'node.textInput.desc',
  icon: Type,
  accent: '#818cf8',
  CanvasComponent: TextInputNode,
  InspectorForm: TextInputForm,
  createDefault: () => ({
    label: tt('node.default.textInput'),
    question: '',
    placeholder: '',
    hint: '',
    variable: '',
    required: false,
  }),
});

registerNode({
  type: 'multi-select',
  category: 'interaction',
  labelKey: 'node.multiSelect.label',
  descKey: 'node.multiSelect.desc',
  icon: ListChecks,
  accent: '#c084fc',
  CanvasComponent: MultiSelectNode,
  InspectorForm: MultiSelectForm,
  createDefault: () => ({
    label: tt('node.default.multiSelect'),
    options: [],
    minSelect: 0,
    maxSelect: 0,
  }),
});

registerNode({
  type: 'rating',
  category: 'interaction',
  labelKey: 'node.rating.label',
  descKey: 'node.rating.desc',
  icon: Star,
  accent: '#e879f9',
  CanvasComponent: RatingNode,
  InspectorForm: RatingForm,
  createDefault: () => ({
    label: tt('node.default.rating'),
    min: 1,
    max: 5,
    step: 1,
    prompt: '',
  }),
});

registerNode({
  type: 'rank-order',
  category: 'interaction',
  labelKey: 'node.rankOrder.label',
  descKey: 'node.rankOrder.desc',
  icon: ArrowUpDown,
  accent: '#a855f7',
  CanvasComponent: RankOrderNode,
  InspectorForm: RankOrderForm,
  createDefault: () => ({
    label: tt('node.default.rankOrder'),
    question: '',
    items: [],
  }),
});

registerNode({
  type: 'number-picker',
  category: 'interaction',
  labelKey: 'node.numberPicker.label',
  descKey: 'node.numberPicker.desc',
  icon: Sliders,
  accent: '#6366f1',
  CanvasComponent: NumberPickerNode,
  InspectorForm: NumberPickerForm,
  createDefault: () => ({
    label: tt('node.default.numberPicker'),
    question: '',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
  }),
});

// ── 🔀 逻辑与控制 (Logic & Flow Control) ──────────────────────
registerNode({
  type: 'logic',
  category: 'logic',
  labelKey: 'node.logic.label',
  descKey: 'node.logic.desc',
  icon: GitBranch,
  accent: '#f59e0b',
  CanvasComponent: LogicNode,
  InspectorForm: LogicForm,
  createDefault: () => ({
    label: tt('node.default.logic'),
    condition: '',
    checkType: 'variable',
  }),
});

registerNode({
  type: 'setter',
  category: 'logic',
  labelKey: 'node.setter.label',
  descKey: 'node.setter.desc',
  icon: Settings2,
  accent: '#10b981',
  CanvasComponent: SetterNode,
  InspectorForm: SetterForm,
  createDefault: () => ({
    label: tt('node.default.setter'),
    assignments: [],
  }),
});

registerNode({
  type: 'calculator',
  category: 'logic',
  labelKey: 'node.calculator.label',
  descKey: 'node.calculator.desc',
  icon: CalculatorIcon,
  accent: '#3b82f6',
  CanvasComponent: CalculatorNode,
  InspectorForm: CalculatorForm,
  createDefault: () => ({
    label: tt('node.default.calculator'),
    vector: {},
  }),
});

// ── 🎮 玩法与特殊 (Minigame & Gameplay) ───────────────────────
registerNode({
  type: 'minigame',
  category: 'gameplay',
  labelKey: 'node.minigame.label',
  descKey: 'node.minigame.desc',
  icon: Gamepad2,
  accent: '#14b8a6',
  CanvasComponent: MinigameNode,
  InspectorForm: MinigameForm,
  createDefault: () => ({
    label: tt('node.default.minigame'),
    gameUrl: '',
    scoreVariable: '',
    passingScore: 0,
  }),
});

// ── 🏆 产出与结算 (Settlement & Output) ───────────────────────
registerNode({
  type: 'settlement',
  category: 'output',
  labelKey: 'node.settlement.label',
  descKey: 'node.settlement.desc',
  icon: Trophy,
  accent: '#f472b6',
  CanvasComponent: SettlementNode,
  InspectorForm: SettlementForm,
  isTerminal: true,
  createDefault: () => ({
    label: tt('node.default.settlement'),
    resultMapping: [],
  }),
});
