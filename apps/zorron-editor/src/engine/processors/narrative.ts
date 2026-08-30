/**
 * Narrative & presentational node processors.
 *
 * These nodes render a frame and wait for the player. Each returns a `state`
 * patch; the engine clears the mutually exclusive sibling fields before
 * merging, so a processor only needs to declare what it owns.
 */

import type {
  StartNodeData,
  SceneNodeData,
  StageNodeData,
  VideoNodeData,
  LinkNodeData,
  MediaNodeData,
} from '@/types/flow';
import type { GameState, PlayerChoice } from '@/engine/GameEngine';
import { applyStageMutations } from '@/engine/nodeProcessors';
import { evaluateGuard } from '@zorron/flow-schema';
import type {
  NodeProcessor,
  NodeProcessorContext,
  ProcessorBacklogEntry,
} from './types';

/** Build the `ProcessorContext` expected by the extracted pure helpers. */
function toHelperContext(ctx: NodeProcessorContext) {
  return {
    variables: ctx.variables,
    fragments: ctx.fragments,
    currentVector: ctx.currentVector,
    pendingVector: ctx.pendingVector,
    sects: ctx.anchors,
    vectorEnabled: ctx.vectorEnabled,
  };
}

/** Start node: show the intro card. The player advances it explicitly. */
export const startProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as StartNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'start',
    start: {
      title: data.title,
      intro: data.intro,
      coverUrl: data.coverUrl ?? data.cover,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Scene node: legacy dialogue + choices node, still fully supported. */
export const sceneProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as SceneNodeData;
  const choices: PlayerChoice[] = (data.choices ?? []).map((c) => ({
    id: c.id,
    text: c.text,
    interaction: c.interaction,
    holdDuration: c.holdDuration,
    slashDirection: c.slashDirection,
    icon: c.icon,
  }));

  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'scene',
    scene: {
      dialogue: data.dialogue,
      backgroundUrl: data.backgroundUrl ?? data.background,
      background: data.background,
      characterUrl: data.characterUrl ?? data.character ?? data.spiritGuide,
      character: data.character,
      spiritGuide: data.spiritGuide,
      focusObject: data.focusObject,
      speaker: data.speaker,
      bgm: data.bgm,
      sfx: data.sfx,
      isBackgroundRemote: data.isBackgroundRemote,
      isSpiritGuideRemote: data.isSpiritGuideRemote,
      isFocusObjectRemote: data.isFocusObjectRemote,
    },
    choices,
    isFinished: false,
  };
  return { state };
};

/**
 * Stage node (Schema 2.0): applies flow mutations, records the dialogue line
 * into the backlog and evaluates choice guards against the post-mutation
 * variables so a mutation can unlock a branch entered on the same node.
 */
export const stageProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as StageNodeData;
  const variables = applyStageMutations(
    data.flow?.mutations as never,
    toHelperContext(ctx),
  );

  // Guards see the mutations applied by this very node.
  const effectiveVariables = { ...ctx.variables, ...variables };

  const backlog: ProcessorBacklogEntry[] = [];
  if (data.interaction?.dialogue?.text) {
    backlog.push({
      nodeId: ctx.node.id,
      speaker: data.interaction.dialogue.speaker,
      text: data.interaction.dialogue.text,
      voiceUrl: data.interaction.dialogue.voiceUrl,
    });
  }

  const choices: PlayerChoice[] = (data.interaction?.choices ?? []).map((c) => {
    const isLocked = c.guard
      ? !evaluateGuard(c.guard, {
          variables: effectiveVariables,
          fragments: ctx.fragments,
        })
      : false;
    return { id: c.id, text: c.text, guard: c.guard, isLocked };
  });

  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'stage',
    stage: data,
    choices,
    isFinished: false,
  };
  return { variables, backlog, state };
};

/** Video node: play a clip, optionally skippable. */
export const videoProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as VideoNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'video',
    video: {
      url: data.videoUrl,
      autoPlay: data.autoPlay,
      skipAllowed: data.skipAllowed,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Link node: terminal hand-off to an external URL. */
export const linkProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as LinkNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'link',
    link: {
      url: data.url,
      title: data.title,
      description: data.description,
    },
    choices: [],
    isFinished: true,
  };
  return { state };
};

/** Media node: display an image / audio / video asset. */
export const mediaProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as MediaNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'media',
    media: {
      mediaType: data.mediaType,
      url: data.url,
      autoAdvance: data.autoAdvance,
      durationMs: data.durationMs,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};
