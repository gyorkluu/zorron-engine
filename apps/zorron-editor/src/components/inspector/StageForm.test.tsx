import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageForm } from './StageForm';
import type { FlowNode, StageNodeData } from '@/types/flow';

describe('StageForm', () => {
  it('renders correctly with InspectorPanel props format ({ node, update })', () => {
    const mockUpdate = vi.fn();
    const mockNode: FlowNode = {
      id: 'stage_test_1',
      type: 'stage',
      position: { x: 0, y: 0 },
      data: {
        label: '开场影游舞台',
        carrier: {
          type: 'video',
          url: 'https://example.com/video.mp4',
          loop: false,
          playbackRate: 1.0,
        },
        interaction: {
          dialogue: {
            speaker: '莫雨',
            text: '江湖浩瀚，你欲往何方？',
          },
          choices: [
            { id: 'c1', targetNodeId: 'node_2', text: '前往浩气盟' },
          ],
          hitboxes: [],
        },
        fx: {
          filter: 'vignette',
        },
        flow: {
          preloadNext: ['node_2'],
          mutations: [],
        },
      } as StageNodeData,
    };

    render(<StageForm node={mockNode} update={mockUpdate} />);

    // 1. Check label is displayed
    const labelInput = screen.getByPlaceholderText('例如：开场影游视频') as HTMLInputElement;
    expect(labelInput.value).toBe('开场影游舞台');

    // 2. Modify label
    fireEvent.change(labelInput, { target: { value: '开场影游新舞台' } });
    expect(mockUpdate).toHaveBeenCalledWith({ label: '开场影游新舞台' });

    // 3. Check tabs exist
    expect(screen.getByText('载体')).toBeInTheDocument();
    expect(screen.getByText('交互')).toBeInTheDocument();
    expect(screen.getByText('视听')).toBeInTheDocument();
    expect(screen.getByText('流转')).toBeInTheDocument();

    // 4. Switch to interaction tab
    fireEvent.click(screen.getByText('交互'));
    expect(screen.getByDisplayValue('莫雨')).toBeInTheDocument();
    expect(screen.getByDisplayValue('江湖浩瀚，你欲往何方？')).toBeInTheDocument();
  });

  it('renders gracefully when node.data is empty/undefined without throwing', () => {
    const mockUpdate = vi.fn();
    const emptyNode: FlowNode = {
      id: 'stage_empty',
      type: 'stage',
      position: { x: 0, y: 0 },
      data: {} as any,
    };

    expect(() => {
      render(<StageForm node={emptyNode} update={mockUpdate} />);
    }).not.toThrow();

    expect(screen.getByPlaceholderText('例如：开场影游视频')).toBeInTheDocument();
  });
});
