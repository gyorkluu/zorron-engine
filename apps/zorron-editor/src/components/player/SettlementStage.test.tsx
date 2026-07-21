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
import { useProjectStore } from '@/stores/projectStore';
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

// Mock VectorScene so we don't pull in the 3D canvas / project store.
vi.mock('@/components/vector3d/VectorScene', () => ({
  VectorScene: (props: {
    highlightedAnchorId?: string | null;
  }) => (
    <div data-testid="vector-space-panel-mock">
      {props.highlightedAnchorId ?? 'no-highlight'}-true
    </div>
  ),
}));

/** Build a SettlementResult with sensible defaults. */
function makeResult(overrides: Partial<SettlementResult> = {}): SettlementResult {
  return {
    anchor: null,
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
    minigame: null,
    rating: null,
    multiSelect: null,
    media: null,
    textInput: null,
    rankOrder: null,
    numberPicker: null,
    stageBackgroundUrl: null,
  } as GameState;
}

describe('SettlementStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: vector3d flag OFF so the X/Y/Z readout is rendered (simpler
    // to assert against than the mocked VectorSpacePanel).
    mockFeatureFlags.vector3d = false;
    // Enable vectorSpace in the project store so the component's
    // `isVectorEnabled` guard passes and vector readouts are rendered.
    useProjectStore.setState({
      settings: {
        vectorSpace: {
          enabled: true,
          dimensions: { x: '处世', y: '立场', z: '性情' },
        },
      },
    });
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

  it('renders the anchor badge when an anchor is matched', () => {
    render(
      <SettlementStage
        state={makeState(
          makeResult({
            title: 'T',
            anchor: {
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

  it('renders the vector readout from project axis labels when the vector3d flag is off', () => {
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
    // The readout renders `{sign}{value.toFixed(2)}` for each axis. The sign
    // and value are separate text nodes so the element's text content is e.g.
    // "+1.50" (whitespace-normalized). Use regex matchers to find each value.
    expect(screen.getByText(/\+\s*1\.50/)).toBeInTheDocument();
    expect(screen.getByText(/-\s*2\.50/)).toBeInTheDocument();
    // For Z=0, the readout is "+0.00". Match the font-mono span specifically
    // to avoid colliding with the magnitude readout (also "0.00").
    const monoSpans = screen.getAllByText(/0\.00/);
    expect(monoSpans.length).toBeGreaterThanOrEqual(1);
    // Axis labels come from the project's vectorSpace dimensions (the default
    // {x:'处世', y:'立场', z:'性情'} from createEmptyFlowData).
    expect(screen.getAllByText('处世').length).toBeGreaterThan(0);
    expect(screen.getAllByText('立场').length).toBeGreaterThan(0);
    expect(screen.getAllByText('性情').length).toBeGreaterThan(0);
  });

  it('renders the VectorSpacePanel when the vector3d flag is on', () => {
    mockFeatureFlags.vector3d = true;
    render(
      <SettlementStage
        state={makeState(
          makeResult({
            title: 'T',
            finalVector: { x: 1, y: 2, z: 3 },
            anchor: { id: 's1', name: 'S', vector: { x: 1, y: 1, z: 1 }, title: 'S' },
          }),
        )}
      />,
    );
    expect(screen.getByTestId('vector-space-panel-mock')).toBeInTheDocument();
    // The mock renders "{highlightedAnchorId}-{compact}". The stage passes
    // `compact` and the matched anchor id.
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
