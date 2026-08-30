/**
 * Zorron Engine - Action Guardrail & System Boundary Validator.
 *
 * Intercepts and audits raw AI Canvas Actions before they are applied to the
 * Editor Store, preventing core engine crashes, corrupted schemas, invalid edge connections,
 * or illegal deletion/creation of singleton nodes (such as `start`).
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeType, GameNodeData } from '@/types/flow';
import { canConnect, getTerminalTypes } from './nodeRegistry';

export type CanvasAction =
  | {
      type: 'CREATE_NODE';
      nodeType: NodeType;
      position?: { x: number; y: number };
      data?: Partial<GameNodeData>;
      connectFrom?: { nodeId: string; handleId?: string };
    }
  | {
      type: 'UPDATE_NODE_DATA';
      nodeId: string;
      patch: Partial<GameNodeData>;
    }
  | {
      type: 'DELETE_NODE';
      nodeId: string;
    }
  | {
      type: 'CONNECT_NODES';
      sourceId: string;
      targetId: string;
      sourceHandle?: string;
      targetHandle?: string;
    }
  | {
      type: 'DISCONNECT_NODES';
      edgeId: string;
    }
  | {
      type: 'REGISTER_CUSTOM_NODE_TYPE';
      customType: string;
      label: string;
      accent?: string;
      defaultData?: Record<string, unknown>;
    }
  | {
      type: 'LOAD_FLOW_DATA';
      nodes: Node[];
      edges: Edge[];
    };

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  actionIndex?: number;
}

export interface AuditResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Filtered safe actions that can be safely applied. */
  sanitizedActions: CanvasAction[];
}

/**
 * Audits a sequence of AI Canvas Actions against current canvas state and engine boundaries.
 */
export function auditCanvasActions(
  actions: CanvasAction[],
  currentNodes: Node[],
  currentEdges: Edge[],
): AuditResult {
  const issues: ValidationIssue[] = [];
  const sanitizedActions: CanvasAction[] = [];

  // Track simulated node set during evaluation
  const nodeMap = new Map<string, Node>(currentNodes.map((n) => [n.id, n]));
  let startNodeCount = currentNodes.filter((n) => n.type === 'start').length;

  actions.forEach((act, idx) => {
    switch (act.type) {
      case 'CREATE_NODE': {
        // Boundary Rule 1: Singleton Start Node Guard
        if (act.nodeType === 'start') {
          if (startNodeCount >= 1) {
            issues.push({
              severity: 'error',
              code: 'GUARD_SINGLETON_START',
              message: '引擎规则拦截：系统中已存在 Start 节点，禁止重复创建第二个起点节点。',
              actionIndex: idx,
            });
            return; // Reject action
          }
          startNodeCount++;
        }

        // Boundary Rule 2: Connection source existence check if connectFrom provided
        if (act.connectFrom && !nodeMap.has(act.connectFrom.nodeId)) {
          issues.push({
            severity: 'error',
            code: 'GUARD_INVALID_CONNECT_SOURCE',
            message: `引擎规则拦截：无法将新建节点连接至不存在的源节点 "${act.connectFrom.nodeId}"。`,
            actionIndex: idx,
          });
          // Still create node, but drop unsafe connectFrom
          const safeAct = { ...act };
          delete safeAct.connectFrom;
          sanitizedActions.push(safeAct);
          return;
        }

        sanitizedActions.push(act);
        break;
      }

      case 'DELETE_NODE': {
        const targetNode = nodeMap.get(act.nodeId);

        // Boundary Rule 3: Start Node Protection (Cannot be deleted)
        if (targetNode && targetNode.type === 'start') {
          issues.push({
            severity: 'error',
            code: 'GUARD_DELETE_START_PROHIBITED',
            message: '引擎规则拦截：Start 起点节点是场景入口核心，绝对禁止被删除！',
            actionIndex: idx,
          });
          return; // Reject action
        }

        if (!targetNode) {
          issues.push({
            severity: 'warning',
            code: 'GUARD_NODE_NOT_FOUND',
            message: `删除指令被忽略：节点 "${act.nodeId}" 在当前画布中未找到。`,
            actionIndex: idx,
          });
          return;
        }

        if (targetNode.type === 'start') {
          startNodeCount--;
        }
        nodeMap.delete(act.nodeId);
        sanitizedActions.push(act);
        break;
      }

      case 'CONNECT_NODES': {
        const sourceNode = nodeMap.get(act.sourceId);
        const targetNode = nodeMap.get(act.targetId);

        if (!sourceNode || !targetNode) {
          issues.push({
            severity: 'error',
            code: 'GUARD_EDGE_NODE_MISSING',
            message: `连线失败：源节点 (${act.sourceId}) 或目标节点 (${act.targetId}) 不存在。`,
            actionIndex: idx,
          });
          return;
        }

        // Boundary Rule 4: Terminal Node Outgoing Edge Guard
        const terminalTypes = getTerminalTypes();
        if (terminalTypes.has(sourceNode.type as NodeType)) {
          issues.push({
            severity: 'error',
            code: 'GUARD_TERMINAL_OUTGOING',
            message: `引擎规则拦截：终端节点 "${sourceNode.type}" 禁止拉出出边连向外部节点！`,
            actionIndex: idx,
          });
          return;
        }

        // Boundary Rule 5: Connection Rule check
        if (!canConnect(sourceNode.type as NodeType, targetNode.type as NodeType)) {
          issues.push({
            severity: 'error',
            code: 'GUARD_INVALID_CONNECTION_TYPE',
            message: `引擎规则拦截：禁止从节点 "${sourceNode.type}" 连线到 "${targetNode.type}"。`,
            actionIndex: idx,
          });
          return;
        }

        sanitizedActions.push(act);
        break;
      }

      case 'UPDATE_NODE_DATA': {
        const node = nodeMap.get(act.nodeId);
        if (!node) {
          issues.push({
            severity: 'warning',
            code: 'GUARD_UPDATE_NODE_MISSING',
            message: `修改未生效：目标节点 "${act.nodeId}" 不存在。`,
            actionIndex: idx,
          });
          return;
        }

        // Boundary Rule 6: Schema Integrity Safeguard for Scene choices
        if (node.type === 'scene' && act.patch.choices) {
          if (!Array.isArray(act.patch.choices) || act.patch.choices.length === 0) {
            issues.push({
              severity: 'error',
              code: 'GUARD_EMPTY_SCENE_CHOICES',
              message: '引擎规则拦截：剧情节点 (Scene) 的选项数组 (choices) 不能为空，至少保留 1 个选项。',
              actionIndex: idx,
            });
            return;
          }
        }

        sanitizedActions.push(act);
        break;
      }

      case 'LOAD_FLOW_DATA': {
        // Boundary Rule 7: Entire Flow Data Validation
        const flowStartCount = act.nodes.filter((n) => n.type === 'start').length;
        if (flowStartCount !== 1) {
          issues.push({
            severity: 'error',
            code: 'GUARD_FLOW_START_COUNT',
            message: `引擎规则拦截：导入的 Flow 数据必须包含且仅包含 1 个 Start 节点 (当前检测到 ${flowStartCount} 个)。`,
            actionIndex: idx,
          });
          return;
        }
        sanitizedActions.push(act);
        break;
      }

      default:
        sanitizedActions.push(act);
    }
  });

  const hasErrors = issues.some((i) => i.severity === 'error');
  return {
    valid: !hasErrors,
    issues,
    sanitizedActions,
  };
}
