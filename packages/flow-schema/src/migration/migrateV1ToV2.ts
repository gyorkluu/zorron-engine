/**
 * Pure Migration Function from FlowData V1 to FlowData V2 (Schema 2.0).
 *
 * Converts legacy flat video, scene, and minigame nodes into Stage composite nodes.
 */

import type { FlowData, FlowNode, FlowEdge } from '../nodes/index.js';

export function migrateV1ToV2(v1Data: Partial<FlowData> & Record<string, unknown>): FlowData {
  if (!v1Data) {
    return {
      version: '2.0.0',
      nodes: [],
      edges: [],
      variables: [],
      fragments: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }

  // If already version 2.0.0, return as-is
  if (v1Data.version === '2.0.0') {
    return v1Data as FlowData;
  }

  const rawNodes = (v1Data.nodes as FlowNode[]) || [];
  const rawEdges = (v1Data.edges as FlowEdge[]) || [];

  const migratedNodes: FlowNode[] = rawNodes.map((node) => {
    const rawData = (node.data || {}) as Record<string, any>;
    const nodeType = node.type;

    // 1. Legacy 'video' node -> Stage with Video Carrier
    if (nodeType === 'video') {
      return {
        ...node,
        type: 'stage',
        data: {
          label: rawData.label || '视频片段',
          carrier: {
            type: 'video',
            url: rawData.videoUrl || '',
            loop: false,
            playbackRate: 1.0,
          },
          interaction: {
            choices: [],
            hitboxes: [],
          },
          fx: {
            filter: 'none',
          },
          flow: {
            preloadNext: [],
            mutations: [],
          },
        },
      };
    }

    // 2. Legacy 'scene' node -> Stage with Image Carrier + Dialogue/Choices
    if (nodeType === 'scene') {
      const backgroundUrl = rawData.backgroundUrl || rawData.background || '';
      const dialogueText = rawData.dialogue || '';
      const speaker = rawData.speaker || undefined;
      const choices = (rawData.choices || []).map((c: any) => ({
        id: c.id || `c-${Math.random().toString(36).substring(2, 9)}`,
        text: c.text || '继续',
        targetNodeId: c.targetNodeId || '',
        guard: c.guard || undefined,
        dropFragmentId: c.dropFragmentId || undefined,
        vector: c.vector || undefined,
        icon: c.icon || undefined,
      }));

      return {
        ...node,
        type: 'stage',
        data: {
          label: rawData.label || '剧情对话',
          backgroundUrl: backgroundUrl || undefined,
          carrier: {
            type: 'image',
            url: backgroundUrl,
            live2dConfigUrl: undefined,
          },
          interaction: {
            dialogue: dialogueText ? { speaker, text: dialogueText } : undefined,
            choices,
            hitboxes: [],
          },
          fx: {
            bgm: rawData.bgm ? { url: rawData.bgm, fadeInMs: 1000, volume: 1.0 } : undefined,
            filter: 'none',
          },
          flow: {
            preloadNext: choices.map((c: any) => c.targetNodeId).filter(Boolean),
            mutations: [],
          },
        },
      };
    }

    // 3. Legacy 'minigame' node -> Stage with HTML-Embed Carrier
    if (nodeType === 'minigame') {
      return {
        ...node,
        type: 'stage',
        data: {
          label: rawData.label || '互动玩法',
          carrier: {
            type: 'html-embed',
            url: rawData.gameUrl || '',
            sandbox: ['allow-scripts', 'allow-same-origin'],
          },
          interaction: {
            choices: [],
            hitboxes: [],
            qteTimeoutSec: rawData.passingScore ? 60 : undefined,
          },
          fx: {
            filter: 'none',
          },
          flow: {
            preloadNext: [],
            mutations: rawData.scoreVariable
              ? [{ variable: rawData.scoreVariable, operator: 'set' as const, value: 0 }]
              : [],
          },
        },
      };
    }

    // 4. Legacy 'media' node -> Stage with Image/Video Carrier
    if (nodeType === 'media') {
      const isVideo = rawData.mediaType === 'video';
      return {
        ...node,
        type: 'stage',
        data: {
          label: rawData.label || '媒体展示',
          carrier: isVideo
            ? { type: 'video', url: rawData.mediaUrl || '', loop: false, playbackRate: 1.0 }
            : { type: 'image', url: rawData.mediaUrl || '' },
          interaction: {
            dialogue: rawData.caption ? { text: rawData.caption } : undefined,
            choices: [],
            hitboxes: [],
          },
          fx: {
            filter: 'none',
          },
          flow: {
            preloadNext: [],
            mutations: [],
          },
        },
      };
    }

    // All other node types (start, settlement, logic, form nodes) pass through
    return node;
  });

  const migratedEdges: FlowEdge[] = rawEdges.map((edge) => {
    const rawData = (edge.data || {}) as Record<string, any>;
    return {
      ...edge,
      data: {
        ...rawData,
        guard: rawData.guard || rawData.condition || undefined,
      },
    };
  });

  return {
    version: '2.0.0',
    nodes: migratedNodes,
    edges: migratedEdges,
    variables: (v1Data.variables as FlowData['variables']) || [],
    fragments: (v1Data.fragments as FlowData['fragments']) || [],
    vectorSpace: v1Data.vectorSpace as FlowData['vectorSpace'],
    viewport: (v1Data.viewport as FlowData['viewport']) || { x: 0, y: 0, zoom: 1 },
  };
}
