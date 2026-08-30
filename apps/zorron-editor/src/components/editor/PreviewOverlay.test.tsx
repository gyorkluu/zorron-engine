import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PreviewOverlay } from './PreviewOverlay';
import { useEditorStore } from '@/stores/editorStore';

describe('PreviewOverlay Device Switcher', () => {
  it('switches between mobile portrait, mobile landscape, and desktop PC viewports', () => {
    useEditorStore.setState({
      nodes: [
        {
          id: 'start_1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { label: 'Start', title: 'Test Project', intro: 'Hello' },
        },
      ],
      edges: [],
    });

    const onExit = vi.fn();
    render(
      <MemoryRouter>
        <PreviewOverlay onExit={onExit} />
      </MemoryRouter>,
    );

    const mobilePortraitBtn = screen.getByTestId('device-mobile-portrait');
    const mobileLandscapeBtn = screen.getByTestId('device-mobile-landscape');
    const desktopBtn = screen.getByTestId('device-desktop');

    expect(mobilePortraitBtn).toBeDefined();
    expect(mobileLandscapeBtn).toBeDefined();
    expect(desktopBtn).toBeDefined();

    // Switch to Landscape
    fireEvent.click(mobileLandscapeBtn);
    expect(mobileLandscapeBtn.className).toContain('text-cyan-300');

    // Switch to Desktop PC
    fireEvent.click(desktopBtn);
    expect(desktopBtn.className).toContain('text-cyan-300');

    // Switch back to Portrait
    fireEvent.click(mobilePortraitBtn);
    expect(mobilePortraitBtn.className).toContain('text-cyan-300');
  });
});
