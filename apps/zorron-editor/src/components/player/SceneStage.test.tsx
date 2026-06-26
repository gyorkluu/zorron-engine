/**
 * Unit tests for the SceneStage component.
 *
 * The typewriter hook and player store are mocked so we can deterministically
 * test the rendering of background/character images, speaker, dialogue, and
 * the choice layer's click behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneStage } from './SceneStage';
import type { GameState, PlayerChoice } from '@/engine/GameEngine';

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

// Mock the typewriter hook so we control `displayed`/`done`/`skip` per test.
// Tests can override these via `vi.mocked(useTypewriter).mockReturnValue(...)`.
vi.mock('@/hooks/useTypewriter', () => ({
  useTypewriter: vi.fn(() => ({
    displayed: '',
    done: true,
    skip: vi.fn(),
  })),
}));

// Mock the player store. ChoiceLayer calls `usePlayerStore((s) => s.selectChoice)`.
const mockSelectChoice = vi.fn();
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({ selectChoice: mockSelectChoice }),
  ),
}));

import { useTypewriter } from '@/hooks/useTypewriter';

/** Build a minimal GameState with the `scene` field populated. */
function makeState(overrides: {
  dialogue?: string;
  backgroundUrl?: string;
  characterUrl?: string;
  speaker?: string;
  choices?: PlayerChoice[];
}): GameState {
  return {
    currentNodeId: 'n1',
    currentNodeType: 'scene',
    history: [],
    variables: {},
    vector: { x: 0, y: 0, z: 0 },
    fragments: [],
    choices: overrides.choices ?? [],
    isFinished: false,
    settlementResult: null,
    video: null,
    link: null,
    start: null,
    scene: {
      dialogue: overrides.dialogue,
      backgroundUrl: overrides.backgroundUrl,
      characterUrl: overrides.characterUrl,
      speaker: overrides.speaker,
    },
  } as GameState;
}

function makeChoice(overrides: Partial<PlayerChoice> = {}): PlayerChoice {
  return {
    id: `ch_${Math.random().toString(36).slice(2, 8)}`,
    text: 'Option',
    interaction: 'tap',
    ...overrides,
  };
}

describe('SceneStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to a sensible default: typewriter done, empty displayed text.
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: '',
      done: true,
      skip: vi.fn(),
    });
  });

  it('renders the speaker name when present', () => {
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: 'Hello',
      done: true,
      skip: vi.fn(),
    });
    render(<SceneStage state={makeState({ speaker: 'Narrator', dialogue: 'Hello' })} />);
    expect(screen.getByText('Narrator')).toBeInTheDocument();
  });

  it('renders the dialogue text from the typewriter', () => {
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: 'Revealed dialogue',
      done: true,
      skip: vi.fn(),
    });
    render(<SceneStage state={makeState({ dialogue: 'Revealed dialogue' })} />);
    expect(screen.getByText('Revealed dialogue')).toBeInTheDocument();
  });

  it('renders the background image when backgroundUrl is provided', () => {
    const { container } = render(
      <SceneStage
        state={makeState({ backgroundUrl: 'https://example.com/bg.png' })}
      />,
    );
    // The img has `alt=""` so its implicit role is "presentation", not "img".
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const bg = imgs.find((i) => i.src === 'https://example.com/bg.png');
    expect(bg).toBeDefined();
  });

  it('renders the character image when characterUrl is provided', () => {
    const { container } = render(
      <SceneStage
        state={makeState({ characterUrl: 'https://example.com/char.png' })}
      />,
    );
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const char = imgs.find((i) => i.src === 'https://example.com/char.png');
    expect(char).toBeDefined();
  });

  it('renders the choice buttons when typewriter is done and choices exist', () => {
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: 'Pick one',
      done: true,
      skip: vi.fn(),
    });
    const choices: PlayerChoice[] = [
      makeChoice({ id: 'c1', text: 'Go north' }),
      makeChoice({ id: 'c2', text: 'Go south' }),
    ];
    render(<SceneStage state={makeState({ dialogue: 'Pick one', choices })} />);
    expect(screen.getByText('Go north')).toBeInTheDocument();
    expect(screen.getByText('Go south')).toBeInTheDocument();
  });

  it('does not render choices when the typewriter is not done yet', () => {
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: 'Pick',
      done: false,
      skip: vi.fn(),
    });
    const choices: PlayerChoice[] = [
      makeChoice({ id: 'c1', text: 'Go north' }),
    ];
    render(<SceneStage state={makeState({ dialogue: 'Pick', choices })} />);
    expect(screen.queryByText('Go north')).not.toBeInTheDocument();
  });

  it('calls selectChoice when a tap choice button is clicked', () => {
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: 'Pick',
      done: true,
      skip: vi.fn(),
    });
    const choices: PlayerChoice[] = [
      makeChoice({ id: 'c1', text: 'Go north', interaction: 'tap' }),
    ];
    render(<SceneStage state={makeState({ dialogue: 'Pick', choices })} />);
    fireEvent.click(screen.getByText('Go north'));
    expect(mockSelectChoice).toHaveBeenCalledWith('c1');
  });

  it('calls skip when the dialogue area is clicked', () => {
    const mockSkip = vi.fn();
    vi.mocked(useTypewriter).mockReturnValue({
      displayed: 'Pick',
      done: false,
      skip: mockSkip,
    });
    render(<SceneStage state={makeState({ dialogue: 'Pick' })} />);
    // The dialogue container has onClick={skip}. The displayed text lives
    // inside a <p> within that clickable container.
    fireEvent.click(screen.getByText('Pick'));
    expect(mockSkip).toHaveBeenCalledTimes(1);
  });
});
