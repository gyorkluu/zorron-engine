/**
 * Interaction & input node processors.
 *
 * Each renders a frame and waits for the player to submit a value. The submit
 * handlers stay on the engine (they need node-type specific validation and the
 * ability to advance), but the *entry* behaviour is fully described here.
 */

import type {
  MinigameNodeData,
  RatingNodeData,
  MultiSelectNodeData,
  TextInputNodeData,
  RankOrderNodeData,
  NumberPickerNodeData,
} from '@/types/flow';
import type { GameState } from '@/engine/GameEngine';
import type { NodeProcessor } from './types';

/** Minigame node: hand over to an embedded H5 game and await the score. */
export const minigameProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as MinigameNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'minigame',
    minigame: {
      gameUrl: data.gameUrl,
      minigameId: data.minigameId ?? data.gameUrl,
      passingScore: data.passingScore,
      scoreVariable: data.scoreVariable,
      difficulty: data.difficulty,
      timeLimit: data.timeLimit,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Rating node: slider / star rating input. */
export const ratingProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as RatingNodeData;
  const min = data.min ?? (data as { minRating?: number }).minRating ?? 1;
  const max = data.max ?? (data as { maxRating?: number }).maxRating ?? 5;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'rating',
    rating: {
      min,
      max,
      step: data.step ?? 1,
      prompt: data.question ?? data.prompt,
      variable: data.variable,
      minLabel: data.minLabel,
      maxLabel: data.maxLabel,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Multi-select node: pick one or more tags. */
export const multiSelectProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as MultiSelectNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'multi-select',
    multiSelect: {
      question: data.question ?? data.prompt,
      options: data.options,
      minSelect: data.minSelected ?? data.minSelect,
      maxSelect: data.maxSelected ?? data.maxSelect,
      variable: data.variable,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Text-input node: free-text answer. */
export const textInputProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as TextInputNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'text-input',
    textInput: {
      question: data.question ?? data.prompt,
      placeholder: data.placeholder,
      hint: data.hint,
      variable: data.variable,
      required: data.required,
      maxLength: data.maxLength,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Rank-order node: drag to order a list of items. */
export const rankOrderProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as RankOrderNodeData;
  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'rank-order',
    rankOrder: {
      question: data.question ?? data.prompt,
      hint: data.hint,
      variable: data.variable,
      items: data.items,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};

/** Number-picker node: numeric value with min / max / step constraints. */
export const numberPickerProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as NumberPickerNodeData;
  const step = data.step && data.step > 0 ? data.step : 1;
  const defaultValue =
    typeof data.defaultValue === 'number' &&
    data.defaultValue >= data.min &&
    data.defaultValue <= data.max
      ? data.defaultValue
      : data.min;

  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'number-picker',
    numberPicker: {
      question: data.question,
      hint: data.hint,
      variable: data.variable,
      min: data.min,
      max: data.max,
      step,
      unit: data.unit,
      defaultValue,
    },
    choices: [],
    isFinished: false,
  };
  return { state };
};
