/**
 * Canvas layout tools — auto-layout, alignment and distribution.
 *
 * Pure functions over node arrays so they can be unit-tested without React
 * Flow, and reused by a future "tidy up selection" command palette entry.
 */

import type { FlowEdge, FlowNode } from '@/types/flow';

/** Assumed node box, used when a node has not been measured yet. */
export const DEFAULT_NODE_WIDTH = 220;
export const DEFAULT_NODE_HEIGHT = 90;

export interface LayoutOptions {
  /** Horizontal gap between layers. */
  gapX?: number;
  /** Vertical gap between nodes in the same layer. */
  gapY?: number;
  /** Node width used for spacing. */
  nodeWidth?: number;
  /** Node height used for spacing. */
  nodeHeight?: number;
}

/** Read a node's rendered width, falling back to the default box. */
function widthOf(node: FlowNode, fallback: number): number {
  const measured = (node as { measured?: { width?: number } }).measured?.width;
  return measured ?? (node as { width?: number }).width ?? fallback;
}

/** Read a node's rendered height, falling back to the default box. */
function heightOf(node: FlowNode, fallback: number): number {
  const measured = (node as { measured?: { height?: number } }).measured?.height;
  return measured ?? (node as { height?: number }).height ?? fallback;
}

/**
 * Longest-path (Sugiyama-style) layered layout.
 *
 * Every node is placed one column to the right of its deepest parent, so edges
 * always point rightward. Nodes without parents — a start node, or orphans —
 * form column zero. Each column is centred vertically and keeps the author's
 * existing top-to-bottom order as a tie-break, which makes re-running the
 * layout stable instead of reshuffling the graph each time.
 */
export function autoLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: LayoutOptions = {},
): FlowNode[] {
  const {
    gapX = 120,
    gapY = 40,
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
  } = options;

  if (nodes.length === 0) return nodes;

  const incoming = new Map<string, string[]>();
  for (const node of nodes) incoming.set(node.id, []);
  for (const edge of edges) {
    const list = incoming.get(edge.target);
    if (list && incoming.has(edge.source)) list.push(edge.source);
  }

  // Depth via DFS with a cycle guard — an author can always wire a loop.
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const resolveDepth = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = incoming.get(id) ?? [];
    const value =
      parents.length === 0 ? 0 : Math.max(...parents.map(resolveDepth)) + 1;
    visiting.delete(id);
    depth.set(id, value);
    return value;
  };
  for (const node of nodes) resolveDepth(node.id);

  // Bucket by depth, preserving the current order inside each column.
  const orderIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const columns = new Map<number, FlowNode[]>();
  for (const node of nodes) {
    const d = depth.get(node.id) ?? 0;
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(node);
  }

  const positioned = new Map<string, { x: number; y: number }>();
  let maxColumnHeight = 0;

  for (const [d, group] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    group.sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    );
    const columnHeight =
      group.reduce((sum, n) => sum + heightOf(n, nodeHeight), 0) +
      (group.length - 1) * gapY;
    maxColumnHeight = Math.max(maxColumnHeight, columnHeight);

    // Centre this column against the tallest one so the graph reads horizontally.
    let y = -columnHeight / 2;
    for (const node of group) {
      positioned.set(node.id, { x: d * (nodeWidth + gapX), y });
      y += heightOf(node, nodeHeight) + gapY;
    }
  }

  // Normalise so nothing lands on a negative coordinate.
  const minY = Math.min(...[...positioned.values()].map((p) => p.y), 0);
  const offsetY = minY < 0 ? -minY + 40 : 0;

  return nodes.map((node) => {
    const next = positioned.get(node.id);
    if (!next) return node;
    return { ...node, position: { x: next.x + 40, y: next.y + offsetY } };
  });
}

/** Edge of the selection bounding box a node should be aligned to. */
export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

/**
 * Align nodes against their shared bounding box.
 *
 * Vertical modes move y, horizontal modes move x; the other axis is untouched,
 * which is what designers expect from every other canvas tool.
 */
export function alignNodes(nodes: FlowNode[], mode: AlignMode): FlowNode[] {
  if (nodes.length < 2) return nodes;

  const boxes = nodes.map((n) => ({
    node: n,
    x: n.position.x,
    y: n.position.y,
    w: widthOf(n, DEFAULT_NODE_WIDTH),
    h: heightOf(n, DEFAULT_NODE_HEIGHT),
  }));

  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const top = Math.min(...boxes.map((b) => b.y));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return boxes.map(({ node, x, y, w, h }) => {
    switch (mode) {
      case 'left':
        return { ...node, position: { ...node.position, x: left } };
      case 'right':
        return { ...node, position: { ...node.position, x: right - w } };
      case 'centerX':
        return { ...node, position: { ...node.position, x: centerX - w / 2 } };
      case 'top':
        return { ...node, position: { ...node.position, y: top } };
      case 'bottom':
        return { ...node, position: { ...node.position, y: bottom - h } };
      case 'centerY':
        return { ...node, position: { ...node.position, y: centerY - h / 2 } };
      default:
        return node;
    }
  });
}

/** Spread nodes evenly along an axis, keeping the outermost two fixed. */
export function distributeNodes(
  nodes: FlowNode[],
  axis: 'horizontal' | 'vertical',
): FlowNode[] {
  if (nodes.length < 3) return nodes;

  const withBoxes = nodes.map((n) => ({
    node: n,
    size: axis === 'horizontal' ? widthOf(n, DEFAULT_NODE_WIDTH) : heightOf(n, DEFAULT_NODE_HEIGHT),
    pos: axis === 'horizontal' ? n.position.x : n.position.y,
  }));

  withBoxes.sort((a, b) => a.pos - b.pos);
  const first = withBoxes[0];
  const last = withBoxes[withBoxes.length - 1];

  const spanStart = first.pos;
  const spanEnd = last.pos + last.size;
  const totalSize = withBoxes.reduce((sum, b) => sum + b.size, 0);
  const gap = (spanEnd - spanStart - totalSize) / (withBoxes.length - 1);

  let cursor = spanStart;
  const positioned = new Map<string, number>();
  for (const box of withBoxes) {
    positioned.set(box.node.id, cursor);
    cursor += box.size + gap;
  }

  return nodes.map((node) => {
    const next = positioned.get(node.id);
    if (next === undefined) return node;
    return axis === 'horizontal'
      ? { ...node, position: { ...node.position, x: next } }
      : { ...node, position: { ...node.position, y: next } };
  });
}
