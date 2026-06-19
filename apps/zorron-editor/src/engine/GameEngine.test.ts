/**
 * Unit tests for the GameEngine, covering all node types and traversal.
 */

import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';

/** Build a node with default position. */
function node(
  id: string,
  type: FlowNode['type'],
  data: FlowNode['data'],
  position = { x: 0, y: 0 },
): FlowNode {
  return { id, type, position, data } as FlowNode;
}

/** Build an edge. */
function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string | null = null,
): FlowEdge {
  return { id, source, target, sourceHandle, targetHandle: null };
}

/** A minimal start -> scene -> settlement flow. */
function basicFlow(): FlowData {
  const nodes: FlowNode[] = [
    node('start', 'start', { label: 'Start', title: 'T', intro: 'I' }),
    node('scene', 'scene', {
      label: 'Scene',
      dialogue: 'Hello',
      choices: [
        { id: 'c1', text: 'Go', interaction: 'tap' },
        { id: 'c2', text: 'Stay', interaction: 'tap' },
      ],
    }),
    node('end', 'settlement', {
      label: 'End',
      resultMapping: [{ resultId: 'r1', title: 'Winner' }],
    }),
  ];
  const edges: FlowEdge[] = [
    edge('e1', 'start', 'scene'),
    edge('e2', 'scene', 'end', 'c1'),
    edge('e3', 'scene', 'end', 'c2'),
  ];
  return { nodes, edges, variables: {}, settings: { vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } } }, version: '1.0.0' };
}

describe('GameEngine', () => {
  it('starts at the start node and exposes its intro', () => {
    const engine = new GameEngine(basicFlow());
    const state = engine.start();
    expect(state.currentNodeId).toBe('start');
    expect(state.currentNodeType).toBe('start');
    expect(state.start?.title).toBe('T');
    expect(state.history).toContain('start');
  });

  it('advances from start to the next node', () => {
    const engine = new GameEngine(basicFlow());
    engine.start();
    const state = engine.advanceFromStart();
    expect(state.currentNodeId).toBe('scene');
    expect(state.currentNodeType).toBe('scene');
    expect(state.scene?.dialogue).toBe('Hello');
  });

  it('exposes scene choices to the player', () => {
    const engine = new GameEngine(basicFlow());
    engine.start();
    engine.advanceFromStart();
    const state = engine.getState();
    expect(state.choices).toHaveLength(2);
    expect(state.choices[0].id).toBe('c1');
    expect(state.choices[0].text).toBe('Go');
  });

  it('advances to the settlement node when selecting a choice', () => {
    const engine = new GameEngine(basicFlow());
    engine.start();
    engine.advanceFromStart();
    const state = engine.selectChoice('c1');
    expect(state.currentNodeId).toBe('end');
    expect(state.currentNodeType).toBe('settlement');
    expect(state.isFinished).toBe(true);
    expect(state.settlementResult?.title).toBe('Winner');
  });

  it('notifies subscribers on state changes', () => {
    const engine = new GameEngine(basicFlow());
    const states: string[] = [];
    engine.subscribe((s) => states.push(s.currentNodeType ?? 'null'));
    engine.start();
    engine.advanceFromStart();
    engine.selectChoice('c1');
    expect(states).toEqual(['start', 'scene', 'settlement']);
  });

  it('ends the flow when a choice has no outgoing edge', () => {
    const flow = basicFlow();
    // Remove the edge for choice c2.
    flow.edges = flow.edges.filter((e) => e.id !== 'e3');
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.selectChoice('c2');
    expect(state.isFinished).toBe(true);
  });

  it('applies setter assignments to variables', () => {
    const flow = basicFlow();
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('setter', 'setter', {
        label: 'Setter',
        assignments: [
          { variable: 'score', value: 10, operator: 'set' },
          { variable: 'score', value: 5, operator: 'add' },
        ],
      }),
      node('scene', 'scene', {
        label: 'Scene',
        dialogue: 'After setter',
        choices: [{ id: 'c1', text: 'ok', interaction: 'tap' }],
      }),
    ];
    flow.edges = [
      edge('e1', 'start', 'setter'),
      edge('e2', 'setter', 'scene'),
    ];
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.getState();
    expect(state.currentNodeId).toBe('scene');
    expect(state.variables.score).toBe(15);
  });

  it('applies pending vector deltas at the calculator node', () => {
    const flow = basicFlow();
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('scene', 'scene', {
        label: 'Scene',
        dialogue: 'Pick',
        choices: [
          { id: 'c1', text: 'Vec', interaction: 'tap', vector: { x: 2, y: 0, z: 0 } },
        ],
      }),
      node('calc', 'calculator', { label: 'Calc', vector: { x: 0, y: 0, z: 0 } }),
      node('end', 'settlement', {
        label: 'End',
        resultMapping: [{ resultId: 'r1', title: 'Done' }],
      }),
    ];
    flow.edges = [
      edge('e1', 'start', 'scene'),
      edge('e2', 'scene', 'calc', 'c1'),
      edge('e3', 'calc', 'end'),
    ];
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.selectChoice('c1');
    expect(state.currentNodeId).toBe('end');
    expect(state.isFinished).toBe(true);
    expect(state.vector).toEqual({ x: 2, y: 0, z: 0 });
  });

  it('evaluates logic nodes with variable checks', () => {
    const flow = basicFlow();
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('logic', 'logic', {
        label: 'Logic',
        checkType: 'variable',
        varName: 'score',
        operator: '>=',
        value: 10,
      }),
      node('trueEnd', 'settlement', {
        label: 'True',
        resultMapping: [{ resultId: 't', title: 'True path' }],
      }),
      node('falseEnd', 'settlement', {
        label: 'False',
        resultMapping: [{ resultId: 'f', title: 'False path' }],
      }),
    ];
    flow.edges = [
      edge('e1', 'start', 'logic'),
      edge('e2', 'logic', 'trueEnd', 'true'),
      edge('e3', 'logic', 'falseEnd', 'false'),
    ];
    flow.variables = { score: 15 };

    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.getState();
    expect(state.currentNodeId).toBe('trueEnd');
    expect(state.settlementResult?.title).toBe('True path');
  });

  it('collects fragments dropped by choices', () => {
    const flow = basicFlow();
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('scene', 'scene', {
        label: 'Scene',
        dialogue: 'Pick',
        choices: [
          { id: 'c1', text: 'Frag', interaction: 'tap', dropFragmentId: 'frag1' },
        ],
      }),
      node('end', 'settlement', {
        label: 'End',
        resultMapping: [{ resultId: 'r1', title: 'Done' }],
      }),
    ];
    flow.edges = [
      edge('e1', 'start', 'scene'),
      edge('e2', 'scene', 'end', 'c1'),
    ];
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.selectChoice('c1');
    expect(state.fragments).toContain('frag1');
  });

  it('renders a video node and allows skipping', () => {
    const flow = basicFlow();
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('video', 'video', {
        label: 'Video',
        videoUrl: 'https://example.com/v.mp4',
        autoPlay: true,
        skipAllowed: true,
      }),
      node('end', 'settlement', {
        label: 'End',
        resultMapping: [{ resultId: 'r1', title: 'Done' }],
      }),
    ];
    flow.edges = [
      edge('e1', 'start', 'video'),
      edge('e2', 'video', 'end'),
    ];
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    let state = engine.getState();
    expect(state.currentNodeType).toBe('video');
    expect(state.video?.url).toBe('https://example.com/v.mp4');
    state = engine.skipVideo();
    expect(state.currentNodeId).toBe('end');
    expect(state.isFinished).toBe(true);
  });

  it('renders a link node as terminal', () => {
    const flow = basicFlow();
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('link', 'link', { label: 'Link', url: 'https://example.com', title: 'Go' }),
    ];
    flow.edges = [edge('e1', 'start', 'link')];
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.getState();
    expect(state.currentNodeType).toBe('link');
    expect(state.link?.url).toBe('https://example.com');
    expect(state.isFinished).toBe(true);
  });

  it('resets to the initial state', () => {
    const engine = new GameEngine(basicFlow());
    engine.start();
    engine.advanceFromStart();
    engine.selectChoice('c1');
    const state = engine.reset();
    expect(state.currentNodeId).toBeNull();
    expect(state.isFinished).toBe(false);
    expect(state.vector).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('matches the nearest sect at settlement when sects are configured', () => {
    const flow = basicFlow();
    flow.settings.vectorSpace = {
      enabled: true,
      dimensions: { x: 'x', y: 'y', z: 'z' },
      sects: [
        { id: 's1', name: 'Sect A', vector: { x: 1, y: 1, z: 1 }, title: 'A' },
        { id: 's2', name: 'Sect B', vector: { x: -1, y: -1, z: -1 }, title: 'B' },
      ],
    };
    flow.nodes = [
      node('start', 'start', { label: 'Start' }),
      node('scene', 'scene', {
        label: 'Scene',
        dialogue: 'Pick',
        choices: [
          { id: 'c1', text: 'Vec', interaction: 'tap', vector: { x: 2, y: 2, z: 2 } },
        ],
      }),
      node('calc', 'calculator', { label: 'Calc', vector: { x: 0, y: 0, z: 0 } }),
      node('end', 'settlement', {
        label: 'End',
        resultMapping: [{ resultId: 'r1', title: 'Done' }],
      }),
    ];
    flow.edges = [
      edge('e1', 'start', 'scene'),
      edge('e2', 'scene', 'calc', 'c1'),
      edge('e3', 'calc', 'end'),
    ];
    const engine = new GameEngine(flow);
    engine.start();
    engine.advanceFromStart();
    const state = engine.selectChoice('c1');
    expect(state.settlementResult?.sect?.id).toBe('s1');
    expect(state.settlementResult?.finalVector).toEqual({ x: 2, y: 2, z: 2 });
  });
});
