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
} from 'lucide-react';
import { tt } from '@/i18n/useT';
import { registerNode } from '@/engine/nodeRegistry';
import { StartNode } from './StartNode';
import { SceneNode } from './SceneNode';
import { LogicNode } from './LogicNode';
import { SetterNode } from './SetterNode';
import { CalculatorNode } from './CalculatorNode';
import { SettlementNode } from './SettlementNode';
import { VideoNode } from './VideoNode';
import { LinkNode } from './LinkNode';
import { MinigameNode, RatingNode, MultiSelectNode, MediaNode } from './InteractionNodes';
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
} from '@/components/inspector/nodeForms';

registerNode({
  type: 'start',
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
  type: 'logic',
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
  labelKey: 'node.setter.label',
  descKey: 'node.setter.desc',
  icon: Settings2,
  accent: '#34d399',
  CanvasComponent: SetterNode,
  InspectorForm: SetterForm,
  createDefault: () => ({
    label: tt('node.default.setter'),
    assignments: [],
  }),
});

registerNode({
  type: 'calculator',
  labelKey: 'node.calculator.label',
  descKey: 'node.calculator.desc',
  icon: CalculatorIcon,
  accent: '#60a5fa',
  CanvasComponent: CalculatorNode,
  InspectorForm: CalculatorForm,
  createDefault: () => ({
    label: tt('node.default.calculator'),
    vector: {},
  }),
});

registerNode({
  type: 'settlement',
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

registerNode({
  type: 'video',
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

registerNode({
  type: 'minigame',
  labelKey: 'node.minigame.label',
  descKey: 'node.minigame.desc',
  icon: Gamepad2,
  accent: '#10b981',
  CanvasComponent: MinigameNode,
  InspectorForm: MinigameForm,
  createDefault: () => ({
    label: tt('node.default.minigame'),
    gameUrl: '',
    scoreVariable: '',
    passingScore: 0,
  }),
});

registerNode({
  type: 'rating',
  labelKey: 'node.rating.label',
  descKey: 'node.rating.desc',
  icon: Star,
  accent: '#06b6d4',
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
  type: 'multi-select',
  labelKey: 'node.multiSelect.label',
  descKey: 'node.multiSelect.desc',
  icon: ListChecks,
  accent: '#8b5cf6',
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
  type: 'media',
  labelKey: 'node.media.label',
  descKey: 'node.media.desc',
  icon: ImageIcon,
  accent: '#f59e0b',
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
