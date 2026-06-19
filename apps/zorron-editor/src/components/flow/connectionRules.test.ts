/**
 * Unit tests for the edge connection rules used by FlowCanvas.
 *
 * The rules are: terminal nodes (settlement, link) cannot be sources, and
 * duplicate edges between the same source/target/handles are rejected.
 */

import { describe, it, expect } from 'vitest';
import type { Connection, Edge, Node } from '@xyflow/react';
import type { NodeType } from '@/types/flow';

/** Terminal node types that cannot have outgoing edges. */
const TERMINAL_TYPES: ReadonlySet<NodeType> = new Set(['settlement', 'link']);

/** Replicate the isValidConnection logic from FlowCanvas for unit testing. */
function isValidConnection(
  connection: Connection & { source: string; target: string },
  nodes: Node[],
  edges: Edge[],
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  if (sourceNode && TERMINAL_TYPES.has(sourceNode.type as NodeType)) {
    return false;
  }
  const exists = edges.some(
    (e) =>
      e.source === connection.source &&
      e.target === connection.target &&
      (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
      (e.targetHandle ?? null) === (connection.targetHandle ?? null),
  );
  return !exists;
}

function makeNode(id: string, type: string): Node {
  return { id, type, position: { x: 0, y: 0 }, data: {} };
}

describe('connection rules', () => {
  it('allows a normal scene -> settlement connection', () => {
    const nodes = [makeNode('s1', 'scene'), makeNode('end', 'settlement')];
    expect(isValidConnection({ source: 's1', target: 'end' }, nodes, [])).toBe(true);
  });

  it('rejects a settlement node as a source', () => {
    const nodes = [makeNode('end', 'settlement'), makeNode('s2', 'scene')];
    expect(isValidConnection({ source: 'end', target: 's2' }, nodes, [])).toBe(false);
  });

  it('rejects a link node as a source', () => {
    const nodes = [makeNode('l1', 'link'), makeNode('s2', 'scene')];
    expect(isValidConnection({ source: 'l1', target: 's2' }, nodes, [])).toBe(false);
  });

  it('allows a logic node true/false outputs', () => {
    const nodes = [makeNode('lg', 'logic'), makeNode('a', 'scene'), makeNode('b', 'scene')];
    expect(
      isValidConnection({ source: 'lg', target: 'a', sourceHandle: 'true' }, nodes, []),
    ).toBe(true);
    expect(
      isValidConnection({ source: 'lg', target: 'b', sourceHandle: 'false' }, nodes, []),
    ).toBe(true);
  });

  it('rejects duplicate edges between the same nodes and handles', () => {
    const nodes = [makeNode('s1', 'scene'), makeNode('s2', 'scene')];
    const edges: Edge[] = [
      { id: 'e1', source: 's1', target: 's2', sourceHandle: null, targetHandle: null },
    ];
    expect(isValidConnection({ source: 's1', target: 's2' }, nodes, edges)).toBe(false);
  });

  it('allows distinct edges from the same source via different handles', () => {
    const nodes = [makeNode('lg', 'logic'), makeNode('a', 'scene'), makeNode('b', 'scene')];
    const edges: Edge[] = [
      { id: 'e1', source: 'lg', target: 'a', sourceHandle: 'true', targetHandle: null },
    ];
    expect(
      isValidConnection({ source: 'lg', target: 'b', sourceHandle: 'false' }, nodes, edges),
    ).toBe(true);
  });
});
