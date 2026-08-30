import { describe, it, expect } from 'vitest';
import { StageNodeDataSchema } from '../src/nodes/stage.js';

describe('StageNodeDataSchema', () => {
  it('validates a video stage carrier with dialogue and choices', () => {
    const validStage = {
      label: 'Intro Video',
      carrier: {
        type: 'video',
        url: 'https://example.com/video1.mp4',
        loop: false,
        timeRange: [0, 15],
      },
      interaction: {
        dialogue: {
          speaker: '林剑心',
          text: '少侠，前面的路充满凶险。',
          typewriterSpeedMs: 40,
        },
        choices: [
          { id: 'c1', text: '拔剑迎战', targetNodeId: 'node-battle' },
          { id: 'c2', text: '暂避锋芒', targetNodeId: 'node-hide' },
        ],
        hitboxes: [
          {
            id: 'hb-sword',
            rect: [20, 30, 40, 50] as [number, number, number, number],
            timeWindow: [5, 12] as [number, number],
            action: 'jump' as const,
            targetNodeId: 'node-battle',
          },
        ],
      },
      fx: {
        filter: 'bloom',
        cameraShake: {
          intensity: 5,
          triggerAtSec: 8,
          durationMs: 400,
        },
      },
      flow: {
        preloadNext: ['node-battle', 'node-hide'],
      },
    };

    const parsed = StageNodeDataSchema.safeParse(validStage);
    expect(parsed.success).toBe(true);
  });

  it('rejects video carrier where timeRange start >= end', () => {
    const invalidStage = {
      carrier: {
        type: 'video',
        url: 'https://example.com/video1.mp4',
        timeRange: [15, 10], // invalid
      },
    };

    const parsed = StageNodeDataSchema.safeParse(invalidStage);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('timeRange start (15) must be strictly less than end (10)');
    }
  });

  it('rejects hitbox with timeWindow outside carrier timeRange', () => {
    const invalidStage = {
      carrier: {
        type: 'video',
        url: 'https://example.com/video1.mp4',
        timeRange: [0, 10],
      },
      interaction: {
        hitboxes: [
          {
            id: 'hb-out-of-bounds',
            rect: [10, 10, 20, 20] as [number, number, number, number],
            timeWindow: [5, 15] as [number, number], // 15 > 10
            action: 'jump' as const,
          },
        ],
      },
    };

    const parsed = StageNodeDataSchema.safeParse(invalidStage);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('must fall within carrier timeRange');
    }
  });

  it('rejects QTE without defaultTimeoutTargetNodeId', () => {
    const invalidQte = {
      carrier: {
        type: 'image',
        url: 'https://example.com/image1.jpg',
      },
      interaction: {
        qteTimeoutSec: 10,
        // missing defaultTimeoutTargetNodeId
      },
    };

    const parsed = StageNodeDataSchema.safeParse(invalidQte);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('defaultTimeoutTargetNodeId must be provided');
    }
  });
});
