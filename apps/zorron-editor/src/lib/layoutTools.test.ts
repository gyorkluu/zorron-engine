/**
 * Layout tool tests.
 *
 * The algorithms are pure, so these cover the tricky parts directly: chain
 * depth, fan-out ordering, cycle safety, and the align/distribute maths.
 */

import { describe, it, expect } from 'vitest';
import {
  autoLayout,
  alignNodes,
  distributeNodes,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
} from './layoutTools';
import type { FlowEdge, FlowNode } from '@/types/flow';

/** Build a node with a fixed 220x90 box so spacing maths is predictable. */
function node(id: string, x = 0, y = 0): FlowNode {
  return {
    id,
    type: 'start',
    position: { x, y },
    data: { label: id },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
  } as unknown as FlowNode;
}

function edge(source: string, target: string): FlowEdge {
  return { id: `${source}->${target}`, source, target } as FlowEdge;
}

describe('autoLayout', () => {
  it('places a linear chain in successive columns', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const [a, b, c] = autoLayout(nodes, [edge('a', 'b'), edge('b', 'c')]);

    expect(b.position.x).toBeGreaterThan(a.position.x);
    expect(c.position.x).toBeGreaterThan(b.position.x);
  });

  it('puts unrelated roots in the first column', () => {
    const nodes = [node('a'), node('z')];
    const [a, z] = autoLayout(nodes, []);
    expect(a.position.x).toBe(z.position.x);
  });

  it('takes the longest path when a node has several parents', () => {
    // a -> b -> d, and a -> c -> d: d must sit after both b and c.
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const [a, b, , d] = autoLayout(nodes, [
      edge('a', 'b'),
      edge('a', 'c'),
      edge('b', 'd'),
      edge('c', 'd'),
    ]);

    expect(b.position.x).toBeGreaterThan(a.position.x);
    expect(d.position.x).toBeGreaterThan(b.position.x);
  });

  it('survives a cycle without hanging', () => {
    const nodes = [node('a'), node('b')];
    const result = autoLayout(nodes, [edge('a', 'b'), edge('b', 'a')]);
    expect(result).toHaveLength(2);
    expect(Number.isFinite(result[0].position.x)).toBe(true);
  });

  it('never emits negative coordinates', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 40), node('c', 0, 80)];
    const result = autoLayout(nodes, [edge('a', 'b'), edge('b', 'c')]);
    for (const n of result) {
      expect(n.position.x).toBeGreaterThanOrEqual(0);
      expect(n.position.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('alignNodes', () => {
  it('aligns left edges', () => {
    const nodes = [node('a', 0, 0), node('b', 50, 10), node('c', 120, 20)];
    const result = alignNodes(nodes, 'left');
    expect(result.map((n) => n.position.x)).toEqual([0, 0, 0]);
  });

  it('shares a vertical centre line', () => {
    const nodes = [node('a', 0, 0), node('b', 300, 0)];
    const [a, b] = alignNodes(nodes, 'centerX');
    const centreA = a.position.x + DEFAULT_NODE_WIDTH / 2;
    const centreB = b.position.x + DEFAULT_NODE_WIDTH / 2;
    expect(centreA).toBeCloseTo(centreB);
  });

  it('leaves fewer than two nodes untouched', () => {
    const single = [node('a', 17, 23)];
    expect(alignNodes(single, 'left')[0].position).toEqual({ x: 17, y: 23 });
  });
});

describe('distributeNodes', () => {
  it('equalises horizontal gaps', () => {
    const nodes = [node('a', 0, 0), node('b', 40, 0), node('c', 500, 0)];
    const [a, b, c] = distributeNodes(nodes, 'horizontal');
    const gap1 = b.position.x - (a.position.x + DEFAULT_NODE_WIDTH);
    const gap2 = c.position.x - (b.position.x + DEFAULT_NODE_WIDTH);
    expect(gap1).toBeCloseTo(gap2);
  });

  it('keeps the outermost nodes fixed', () => {
    const nodes = [node('a', 0, 0), node('b', 40, 0), node('c', 500, 0)];
    const [a, , c] = distributeNodes(nodes, 'horizontal');
    expect(a.position.x).toBe(0);
    expect(c.position.x).toBe(500);
  });

  it('needs at least three nodes to do anything', () => {
    const nodes = [node('a', 0, 0), node('b', 40, 0)];
    expect(distributeNodes(nodes, 'horizontal')).toEqual(nodes);
  });
});
