/**
 * Consistency check tests.
 *
 * These describe what "playable" means, so regressions in the analysis are
 * caught rather than shipped.
 */

import { describe, it, expect } from 'vitest';
import { checkConsistency, isStoryPlayable } from './consistencyCheck';
import type { FlowEdge, FlowNode } from '@/types/flow';

function node(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data: { label: id, ...data } } as unknown as FlowNode;
}

function edge(source: string, target: string): FlowEdge {
  return { id: `${source}->${target}`, source, target } as FlowEdge;
}

describe('checkConsistency', () => {
  it('accepts a clean start -> scene -> settlement chain', () => {
    const issues = checkConsistency(
      [
        node('s', 'start'),
        node('a', 'stage', { interaction: { choices: [] } }),
        node('z', 'settlement'),
      ],
      [edge('s', 'a'), edge('a', 'z')],
    );
    expect(issues).toHaveLength(0);
    expect(isStoryPlayable(issues)).toBe(true);
  });

  it('flags a missing start node', () => {
    const issues = checkConsistency([node('a', 'stage')], []);
    expect(issues.some((i) => i.kind === 'no-start')).toBe(true);
    expect(isStoryPlayable(issues)).toBe(false);
  });

  it('flags a dead end that is not a terminal type', () => {
    const issues = checkConsistency(
      [node('s', 'start'), node('a', 'stage')],
      [edge('s', 'a')],
    );
    expect(issues.some((i) => i.kind === 'dead-end')).toBe(true);
  });

  it('does not flag settlement or link as dead ends', () => {
    const issues = checkConsistency(
      [node('s', 'start'), node('z', 'settlement'), node('l', 'link')],
      [edge('s', 'z'), edge('s', 'l')],
    );
    expect(issues.filter((i) => i.kind === 'dead-end')).toHaveLength(0);
  });

  it('flags an unreachable scene', () => {
    const issues = checkConsistency(
      [
        node('s', 'start'),
        node('a', 'stage', { interaction: { choices: [] } }),
        node('lost', 'stage', { interaction: { choices: [] } }),
        node('z', 'settlement'),
      ],
      [edge('s', 'a'), edge('a', 'z')],
    );
    expect(issues.some((i) => i.kind === 'unreachable' && i.nodeId === 'lost')).toBe(true);
  });

  it('flags a choice pointing at a missing node', () => {
    const issues = checkConsistency(
      [
        node('s', 'start'),
        node('a', 'scene', {
          choices: [{ id: 'c1', text: '走左边', targetNodeId: 'ghost' }],
        }),
      ],
      [edge('s', 'a')],
    );
    expect(issues.some((i) => i.kind === 'dangling-choice')).toBe(true);
  });

  it('flags a choice with no target at all', () => {
    const issues = checkConsistency(
      [node('s', 'start'), node('a', 'scene', { choices: [{ id: 'c1', text: '空白' }] })],
      [edge('s', 'a')],
    );
    expect(issues.some((i) => i.kind === 'dangling-choice')).toBe(true);
  });

  it('ignores sticky notes entirely', () => {
    const issues = checkConsistency([node('n1', 'note', { text: '备忘' })], []);
    expect(issues).toHaveLength(0);
  });

  it('flags an empty group', () => {
    const issues = checkConsistency(
      [node('s', 'start'), node('g', 'group', { label: '第一章' })],
      [],
    );
    expect(issues.some((i) => i.kind === 'orphan' && i.nodeId === 'g')).toBe(true);
  });

  it('returns nothing for an empty graph', () => {
    expect(checkConsistency([], [])).toHaveLength(0);
  });
});
