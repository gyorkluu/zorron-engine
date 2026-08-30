import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import '@/components/flow/nodes/definitions';
import { auditCanvasActions } from './actionValidator';

describe('actionValidator Guardrail Suite', () => {
  const mockStartNode: Node = {
    id: 'start_01',
    type: 'start',
    position: { x: 0, y: 0 },
    data: { title: '测试' },
  };

  const mockSceneNode: Node = {
    id: 'scene_01',
    type: 'scene',
    position: { x: 100, y: 100 },
    data: { dialogue: '测试对话', choices: [{ id: 'c1', text: '选项1' }] },
  };

  const mockSettlementNode: Node = {
    id: 'settlement_01',
    type: 'settlement',
    position: { x: 300, y: 300 },
    data: { resultMapping: [] },
  };

  it('should intercept deletion of start node', () => {
    const result = auditCanvasActions(
      [{ type: 'DELETE_NODE', nodeId: 'start_01' }],
      [mockStartNode, mockSceneNode],
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('GUARD_DELETE_START_PROHIBITED');
    expect(result.sanitizedActions.length).toBe(0);
  });

  it('should intercept creation of duplicate start node', () => {
    const result = auditCanvasActions(
      [{ type: 'CREATE_NODE', nodeType: 'start' }],
      [mockStartNode],
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('GUARD_SINGLETON_START');
  });

  it('should intercept outgoing edge from terminal node (settlement)', () => {
    const result = auditCanvasActions(
      [
        {
          type: 'CONNECT_NODES',
          sourceId: 'settlement_01',
          targetId: 'scene_01',
        },
      ],
      [mockStartNode, mockSceneNode, mockSettlementNode],
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0].code).toBe('GUARD_TERMINAL_OUTGOING');
  });

  it('should allow valid scene to scene connections and safe data updates', () => {
    const result = auditCanvasActions(
      [
        {
          type: 'CONNECT_NODES',
          sourceId: 'start_01',
          targetId: 'scene_01',
        },
        {
          type: 'UPDATE_NODE_DATA',
          nodeId: 'scene_01',
          patch: { dialogue: '新的文本内容' },
        },
      ],
      [mockStartNode, mockSceneNode],
      [],
    );

    expect(result.valid).toBe(true);
    expect(result.sanitizedActions.length).toBe(2);
  });
});
