/**
 * Unit tests for the StartStage component.
 *
 * Tests rendering of the title/intro, optional cover image, and the begin
 * button's click handler (which delegates to the player store).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartStage } from './StartStage';
import type { GameState } from '@/engine/GameEngine';

// Mock useT so we get predictable, deterministic strings in the DOM.
vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        key,
      );
    },
    locale: 'en',
  }),
  tt: (key: string) => key,
}));

// Mock the player store. StartStage calls `usePlayerStore((s) => s.advanceFromStart)`
// so we expose a mock `advanceFromStart` function we can assert against.
const mockAdvanceFromStart = vi.fn();
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({
      advanceFromStart: mockAdvanceFromStart,
    }),
  ),
}));

/** Build a minimal GameState with the `start` field populated. */
function makeState(overrides: {
  title?: string;
  intro?: string;
  coverUrl?: string;
}): GameState {
  return {
    currentNodeId: 'n1',
    currentNodeType: 'start',
    history: [],
    variables: {},
    vector: { x: 0, y: 0, z: 0 },
    fragments: [],
    choices: [],
    isFinished: false,
    settlementResult: null,
    video: null,
    link: null,
    scene: null,
    start: {
      title: overrides.title,
      intro: overrides.intro,
      coverUrl: overrides.coverUrl,
    },
  } as GameState;
}

describe('StartStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title and intro text', () => {
    render(<StartStage state={makeState({ title: 'My Story', intro: 'A tale begins.' })} />);
    expect(screen.getByText('My Story')).toBeInTheDocument();
    expect(screen.getByText('A tale begins.')).toBeInTheDocument();
  });

  it('renders the begin button', () => {
    render(<StartStage state={makeState({ title: 'T' })} />);
    expect(screen.getByText('player.begin')).toBeInTheDocument();
  });

  it('renders the cover image when coverUrl is provided', () => {
    const { container } = render(
      <StartStage state={makeState({ title: 'T', coverUrl: 'https://example.com/cover.png' })} />,
    );
    // The img has `alt=""` so its implicit role is "presentation", not "img".
    // Query the DOM directly to avoid the accessible-role mismatch.
    const img = container.querySelector('img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toBe('https://example.com/cover.png');
  });

  it('does not render a cover image when coverUrl is absent', () => {
    const { container } = render(<StartStage state={makeState({ title: 'T' })} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('calls advanceFromStart when the begin button is clicked', () => {
    render(<StartStage state={makeState({ title: 'T' })} />);
    fireEvent.click(screen.getByText('player.begin'));
    expect(mockAdvanceFromStart).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when the start state is null', () => {
    const { container } = render(
      <StartStage state={{ ...makeState({}), start: null } as GameState} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('omits the title element when title is undefined but still renders the begin button', () => {
    render(<StartStage state={makeState({ intro: 'Only intro' })} />);
    // The begin button is always rendered (when start exists).
    expect(screen.getByText('player.begin')).toBeInTheDocument();
    expect(screen.getByText('Only intro')).toBeInTheDocument();
    // No h1 title element should be present.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
