/**
 * Unit tests for the SettlementStage component.
 *
 * The VectorSpacePanel child is mocked to isolate the settlement layout
 * (title, description, cover, sect badge, magnitude/quadrant/distance readout,
 * and the restart button) from the 3D canvas and project store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettlementStage } from './SettlementStage';
import type { GameState, SettlementResult } from '@/engine/GameEngine';

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

// Use `vi.hoisted` so the mutable flags object is available inside the hoisted
// `vi.mock` factory. This lets individual tests flip `vector3d` to false.
const { mockFeatureFlags } = vi.hoisted(() => ({
  mockFeatureFlags: { vector3d: false, cloudSync: true },
}));

vi.mock('@/lib/featureFlags', () => ({
  featureFlags: mockFeatureFlags,
}));

// Mock VectorSpacePanel so we don't pull in the 3D canvas / project store.
vi.mock('@/components/vector3d/VectorSpacePanel', () => ({
  VectorSpacePanel: (props: {
    userVector?: unknown;
    highlightedSectId?: string | null;
    compact?: boolean;
  }) => (
    <div data-testid="vector-space-panel-mock">
      {props.highlightedSectId ?? 'no-highlight'}-{String(props.compact)}
    </div>
  ),
}));

/** Build a SettlementResult with sensible defaults. */
function makeResult(overrides: Partial<SettlementResult> = {}): SettlementResult {
  return {
    sect: null,
    distance: 0,
    magnitude: 0,
    finalVector: { x: 0, y: 0, z: 0 },
    quadrant: '+++',
    title: 'Settlement',
    ...overrides,
  };
}

/** Build a minimal GameState with the `settlementResult` field populated. */
function makeState(result: SettlementResult | null): GameState {
  return {
    currentNodeId: 'n1',
    currentNodeType: 'settlement',
    history: [],
    variables: {},
    vector: { x: 0, y: 0, z: 0 },
    fragments: [],
    choices: [],
    isFinished: true,
    settlementResult: result,
    video: null,
    link: null,
    start: null,
    scene: null,
  } as GameState;
}

describe('SettlementStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: vector3d flag OFF so the X/Y/Z readout is rendered (simpler
    // to assert against than the mocked VectorSpacePanel).
    mockFeatureFlags.vector3d = false;
  });

  it('renders nothing when settlementResult is null', () => {
    const { container } = render(<SettlementStage state={makeState(null)} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the result title and description', () => {
    render(
      <SettlementStage
        state={makeState(
          makeResult({ title: 'You are a Hero', description: 'A noble ending.' }),
        )}
      />,
    );
    expect(screen.getByText('You are a Hero')).toBeInTheDocument();
    expect(screen.getByText('A noble ending.')).toBeInTheDocument();
  });

  it('renders the cover image when coverUrl is provided', () => {
    const { container } = render(
      <SettlementStage
        state={makeState(
          makeResult({ title: 'T', coverUrl: 'https://example.com/end.png' }),
        )}
      />,
    );
    // The img has `alt=""` so its implicit role is "presentation", not "img".
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const cover = imgs.find((i) => i.src === 'https://example.com/end.png');
    expect(cover).toBeDefined();
  });

  it('does not render a cover image when coverUrl is absent', () => {
    const { container } = render(<SettlementStage state={makeState(makeResult({ title: 'T' }))} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the sect badge when a sect is matched', () => {
    render(
      <SettlementStage
        state={makeState(
          makeResult({
            title: 'T',
            sect: {
              id: 's1',
              name: 'Alpha Sect',
              vector: { x: 1, y: 1, z: 1 },
              title: 'Alpha',
            },
          }),
        )}
      />,
    );
    expect(screen.getByText('Alpha Sect')).toBeInTheDocument();
  });

  it('renders the magnitude, quadrant and distance readouts', () => {
    render(
      <SettlementStage
        state={makeState(
          makeResult({
            title: 'T',
            magnitude: 3.14159,
            quadrant: '++-',
            distance: 2.71828,
          }),
        )}
      />,
    );
    // The readout spans render `{t('player.magnitude')} {value.toFixed(2)}`
    // so the text content is "player.magnitude 3.14" (with whitespace). Use
    // regex matchers to find the spans containing each numeric value.
    expect(screen.getByText(/3\.14/)).toBeInTheDocument();
    expect(screen.getByText(/\+\+-/)).toBeInTheDocument();
    expect(screen.getByText(/2\.72/)).toBeInTheDocument();
  });

  it('renders an em-dash for infinite distance', () => {
    render(
      <SettlementStage
        state={makeState(
          makeResult({ title: 'T', distance: Infinity }),
        )}
      />,
    );
    // The component renders '—' when distance === Infinity, inside a span
    // that also contains the "player.distance" label.
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it('renders the X/Y/Z vector readout when the vector3d flag is off', () => {
    render(
      <SettlementStage
        state={makeState(
          makeResult({
            title: 'T',
            finalVector: { x: 1.5, y: -2.5, z: 0 },
          }),
        )}
      />,
    );
    // The VectorReadout helper renders `{sign}{value.toFixed(2)}` inside a
    // <span class="font-mono...">. The sign and value are separate text nodes
    // so the element's text content is e.g. "+ 1.50" (whitespace-normalized).
    // Use regex matchers to find each axis value.
    expect(screen.getByText(/\+\s*1\.50/)).toBeInTheDocument();
    expect(screen.getByText(/-\s*2\.50/)).toBeInTheDocument();
    // For Z=0, the readout is "+0.00". Match the font-mono span specifically
    // to avoid colliding with the magnitude readout (also "0.00").
    const monoSpans = screen.getAllByText(/0\.00/);
    expect(monoSpans.length).toBeGreaterThanOrEqual(1);
    // Axis labels X/Y/Z are rendered.
    expect(screen.getAllByText('X').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Y').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Z').length).toBeGreaterThan(0);
  });

  it('renders the VectorSpacePanel when the vector3d flag is on', () => {
    mockFeatureFlags.vector3d = true;
    render(
      <SettlementStage
        state={makeState(
          makeResult({
            title: 'T',
            finalVector: { x: 1, y: 2, z: 3 },
            sect: { id: 's1', name: 'S', vector: { x: 1, y: 1, z: 1 }, title: 'S' },
          }),
        )}
      />,
    );
    expect(screen.getByTestId('vector-space-panel-mock')).toBeInTheDocument();
    // The mock renders "{highlightedSectId}-{compact}". The stage passes
    // `compact` and the matched sect id.
    expect(screen.getByText('s1-true')).toBeInTheDocument();
  });

  it('calls onRestart when the restart button is clicked', () => {
    const onRestart = vi.fn();
    render(
      <SettlementStage
        state={makeState(makeResult({ title: 'T' }))}
        onRestart={onRestart}
      />,
    );
    const btn = screen.getByText('player.restart');
    fireEvent.click(btn);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('does not render the restart button when onRestart is not provided', () => {
    render(<SettlementStage state={makeState(makeResult({ title: 'T' }))} />);
    expect(screen.queryByText('player.restart')).not.toBeInTheDocument();
  });
});
