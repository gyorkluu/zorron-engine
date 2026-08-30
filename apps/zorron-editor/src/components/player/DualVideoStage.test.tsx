import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DualVideoStage } from './DualVideoStage';
import type { StageNodeData } from '@/types/flow';

describe('DualVideoStage Component', () => {
  it('renders hitboxes with rect array without errors', () => {
    const data: StageNodeData = {
      label: 'Test Stage',
      carrier: {
        type: 'image',
        url: 'https://example.com/test.jpg',
      },
      interaction: {
        hitboxes: [
          {
            id: 'hb_1',
            rect: [10, 20, 30, 40],
            targetNodeId: 'node_next',
            label: 'Test Button',
          },
        ],
      },
    };

    const onHitboxClick = vi.fn();
    render(<DualVideoStage stageData={data} onHitboxClick={onHitboxClick} />);

    const btn = screen.getByRole('button');
    expect(btn).toBeDefined();
    expect(btn.style.left).toBe('10%');
    expect(btn.style.top).toBe('20%');
    expect(btn.style.width).toBe('30%');
    expect(btn.style.height).toBe('40%');

    fireEvent.click(btn);
    expect(onHitboxClick).toHaveBeenCalledWith(data.interaction?.hitboxes?.[0]);
  });

  it('renders hitboxes with individual x, y, width, height properties without rect', () => {
    const data: StageNodeData = {
      label: 'Test Stage 2',
      carrier: {
        type: 'image',
        url: 'https://example.com/test2.jpg',
      },
      interaction: {
        hitboxes: [
          {
            id: 'hb_stone',
            x: 42,
            y: 48,
            width: 16,
            height: 16,
            label: '青龙机关石',
            targetNodeId: 'minigame_lockpick',
          },
        ],
      },
    };

    const onHitboxClick = vi.fn();
    render(<DualVideoStage stageData={data} onHitboxClick={onHitboxClick} />);

    const btn = screen.getByRole('button');
    expect(btn).toBeDefined();
    expect(btn.style.left).toBe('42%');
    expect(btn.style.top).toBe('48%');
    expect(btn.style.width).toBe('16%');
    expect(btn.style.height).toBe('16%');

    fireEvent.click(btn);
    expect(onHitboxClick).toHaveBeenCalledWith(data.interaction?.hitboxes?.[0]);
  });
});
