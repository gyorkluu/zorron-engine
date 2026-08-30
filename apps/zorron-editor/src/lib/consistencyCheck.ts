/**
 * Story consistency checks.
 *
 * Static graph analysis that answers "is this story actually playable?"
 * before anyone runs a simulation: are there dead ends, unreachable scenes,
 * choices wired to nothing, or no start at all.
 */

import type { FlowEdge, FlowNode } from '@/types/flow';

export type IssueKind =
  | 'no-start'
  | 'dead-end'
  | 'unreachable'
  | 'dangling-choice'
  | 'orphan'
  | 'empty-choice';

export interface ConsistencyIssue {
  kind: IssueKind;
  /** Node the issue concerns, when there is one. */
  nodeId?: string;
  severity: 'error' | 'warning';
  message: string;
}

/** Node types that legitimately end a story. */
const TERMINAL_TYPES = new Set(['settlement', 'link']);

/** Types that do not participate in the story graph at all. */
const NON_STORY_TYPES = new Set(['note']);

/**
 * Audit a graph for structural problems.
 *
 * Terminal node types (settlement, link) are allowed to have no outgoing
 * edges; everything else reaching a dead end is reported.
 */
export function checkConsistency(
  nodes: FlowNode[],
  edges: FlowEdge[],
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const story = nodes.filter((n) => !NON_STORY_TYPES.has(n.type ?? ''));

  if (story.length === 0) return issues;

  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  for (const node of story) {
    outgoing.set(node.id, 0);
    incoming.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!outgoing.has(edge.source) || !incoming.has(edge.target)) continue;
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  // 1. A story needs an entry point.
  const hasStart = story.some((n) => n.type === 'start');
  if (!hasStart) {
    issues.push({
      kind: 'no-start',
      severity: 'error',
      message: '没有开始节点，玩家无从进入故事。',
    });
  }

  for (const node of story) {
    const out = outgoing.get(node.id) ?? 0;
    const into = incoming.get(node.id) ?? 0;
    const isGroup = node.type === 'group';
    const isTerminal = TERMINAL_TYPES.has(node.type ?? '');

    // 2. Dead ends — nothing leaves a non-terminal node.
    if (out === 0 && !isTerminal && !isGroup) {
      const choices = readChoices(node);
      if (choices.length === 0) {
        issues.push({
          kind: 'dead-end',
          nodeId: node.id,
          severity: 'error',
          message: `「${labelOf(node)}」没有任何出边，故事会在此中断。`,
        });
      }
    }

    // 3. Unreachable — nothing leads in, and it is not the start.
    if (into === 0 && node.type !== 'start' && !isGroup && story.length > 1) {
      issues.push({
        kind: 'unreachable',
        nodeId: node.id,
        severity: 'warning',
        message: `「${labelOf(node)}」没有入边，玩家永远到不了这里。`,
      });
    }

    // 4. Choices that name a target which no longer exists.
    for (const choice of readChoices(node)) {
      if (!choice.targetNodeId) {
        issues.push({
          kind: 'dangling-choice',
          nodeId: node.id,
          severity: 'error',
          message: `「${labelOf(node)}」的选项「${choice.text}」没有指定目标节点。`,
        });
      } else if (!nodes.some((n) => n.id === choice.targetNodeId)) {
        issues.push({
          kind: 'dangling-choice',
          nodeId: node.id,
          severity: 'error',
          message: `「${labelOf(node)}」的选项「${choice.text}」指向了不存在的节点。`,
        });
      }
    }

    // 5. Choice nodes with no options at all.
    if (
      (node.type === 'scene' || node.type === 'stage') &&
      readChoices(node).length === 0 &&
      out === 0 &&
      !isTerminal
    ) {
      issues.push({
        kind: 'empty-choice',
        nodeId: node.id,
        severity: 'warning',
        message: `「${labelOf(node)}」没有可选项，也没有后继节点。`,
      });
    }
  }

  // 6. Groups that contain nothing.
  for (const node of story) {
    if (node.type !== 'group') continue;
    const children = story.filter((n) => n.parentId === node.id);
    if (children.length === 0) {
      issues.push({
        kind: 'orphan',
        nodeId: node.id,
        severity: 'warning',
        message: `分组「${labelOf(node)}」是空的。`,
      });
    }
  }

  return issues;
}

/** Read the choice list from whichever node shape is in play. */
function readChoices(
  node: FlowNode,
): Array<{ text: string; targetNodeId?: string }> {
  const data = node.data as {
    choices?: Array<{ text?: string; targetNodeId?: string }>;
    interaction?: {
      choices?: Array<{ text?: string; targetNodeId?: string }>;
    };
  };
  const list = data?.interaction?.choices ?? data?.choices ?? [];
  return list.map((c) => ({ text: c.text ?? '', targetNodeId: c.targetNodeId }));
}

/** Human label for a node, falling back to its id. */
function labelOf(node: FlowNode): string {
  const label = (node.data as { label?: unknown })?.label;
  return typeof label === 'string' && label ? label : node.id;
}

/** True when the graph has no blocking problems. */
export function isStoryPlayable(issues: ConsistencyIssue[]): boolean {
  return !issues.some((i) => i.severity === 'error');
}
