/**
 * Unit tests for the VectorSpacePanel and VectorSpaceSettings components.
 *
 * The 3D canvas rendering is exercised via mocks; we assert on the conditional
 * rendering driven by the feature flag and project settings.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VectorSpacePanel } from './VectorSpacePanel';
import { VectorSpaceSettings } from './VectorSpaceSettings';
import { useProjectStore } from '@/stores/projectStore';
import { usePlayerStore } from '@/stores/playerStore';
import { createEmptyFlowData } from '@/types/flow';

// Use `vi.hoisted` so the mutable flags object is available inside the hoisted
// `vi.mock` factory. This lets individual tests flip `vector3d` to false
// without fighting the module cache (which `vi.doMock` cannot override once a
// top-level `vi.mock` has loaded the module).
const { mockFeatureFlags } = vi.hoisted(() => ({
  mockFeatureFlags: { vector3d: true, cloudSync: true },
}));

// Mock the feature flags so we can toggle the 3D flag per test.
vi.mock('@/lib/featureFlags', () => ({
  featureFlags: mockFeatureFlags,
}));

// Mock the VectorScene canvas component to avoid canvas/DOM issues in jsdom.
vi.mock('./VectorScene', () => ({
  VectorScene: () => (
    <div data-testid="vector-scene-mock">vector scene</div>
  ),
}));

// Mock the player store. The component calls `usePlayerStore((s) => s.state)`,
// so the mock must return the engine `GameState` (or null) directly — NOT
// wrapped in `{ state: ... }`. Returning the state directly mirrors how the
// Zustand selector would unwrap it.
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn(() => null),
}));

// Mock i18n: default locale is zh, so tests assert on Chinese strings.
// This mock returns the key itself for simple lookups, matching the
// actual translation values used in the components under test.
vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'vector3d.enable': '启用三维向量空间',
        'vector3d.sects.add': '+ 添加门派',
        'vector3d.sects.del': '删除',
        'vector3d.sects.title': '门派锚点（{n}）',
        'vector3d.sects': '{n} 个门派',
        'vector3d.sects.namePh': '门派名称',
        'vector3d.sects.titleField': '称号',
        'vector3d.sects.titlePh': '显示称号',
        'vector3d.sects.anchor': '锚点向量',
        'vector3d.sects.anchor.hint': '此门派在三维空间中的位置。',
        'vector3d.sects.default': '门派 {n}',
        'vector3d.sects.empty': '暂无门派锚点。添加一个来定义人格原型。',
        'vector3d.settings': '向量空间',
        'vector3d.xAxis': 'X 轴',
        'vector3d.yAxis': 'Y 轴',
        'vector3d.zAxis': 'Z 轴',
        'vector3d.title': '三维向量空间',
        'vector3d.disabled': '向量空间未启用。在项目设置中开启以可视化三维人格空间。',
      };
      let str = map[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
  }),
  tt: (key: string) => key,
}));

describe('VectorSpacePanel', () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.setState({
      settings: createEmptyFlowData().settings,
    });
    // Reset the mutable feature flag between tests so a previous test's
    // mutation does not leak into the next one.
    mockFeatureFlags.vector3d = true;
    // Reset the player store mock to its default (no player running).
    vi.mocked(usePlayerStore).mockReturnValue(null);
  });

  it('renders nothing when the feature flag is off', () => {
    // Flip the mutable flag — the component reads `featureFlags.vector3d` at
    // render time, so it observes the new value immediately.
    mockFeatureFlags.vector3d = false;
    const { container } = render(<VectorSpacePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a disabled hint when the vector space is not enabled', () => {
    render(<VectorSpacePanel />);
    expect(screen.getByTestId('vector-space-disabled')).toBeInTheDocument();
  });

  it('renders the panel when the vector space is enabled', () => {
    useProjectStore.setState({
      settings: {
        vectorSpace: {
          enabled: true,
          dimensions: { x: '处世', y: '立场', z: '性情' },
          sects: [
            { id: 's1', name: 'Alpha', vector: { x: 1, y: 1, z: 1 }, title: 'A' },
          ],
        },
      },
    });
    render(<VectorSpacePanel />);
    expect(screen.getByTestId('vector-space-panel')).toBeInTheDocument();
    expect(screen.getByText('1 个门派')).toBeInTheDocument();
  });

  it('uses the player vector when no override is provided', () => {
    useProjectStore.setState({
      settings: {
        vectorSpace: {
          enabled: true,
          dimensions: { x: 'X', y: 'Y', z: 'Z' },
        },
      },
    });
    // The component calls `usePlayerStore((s) => s.state)` and expects the
    // returned value to BE the engine state (with `vector` on it). The mock
    // returns the value directly, so we return the GameState here.
    vi.mocked(usePlayerStore).mockReturnValue({
      vector: { x: 5, y: -2, z: 3 },
      currentNodeId: 'n1',
      currentNodeType: 'scene',
      history: [],
      variables: {},
      fragments: [],
      choices: [],
      isFinished: false,
      settlementResult: null,
      video: null,
      link: null,
      start: null,
      scene: null,
    } as never);
    render(<VectorSpacePanel />);
    expect(screen.getByTestId('vector-space-panel')).toBeInTheDocument();
    // The readout should show the player vector's X value.
    expect(screen.getByText('5.00')).toBeInTheDocument();
  });
});

describe('VectorSpaceSettings', () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.setState({
      settings: createEmptyFlowData().settings,
    });
  });

  it('renders the enable toggle', () => {
    render(<VectorSpaceSettings />);
    expect(screen.getByText('启用三维向量空间')).toBeInTheDocument();
  });

  it('shows dimension labels and sect editor when enabled', () => {
    useProjectStore.setState({
      settings: {
        vectorSpace: {
          enabled: true,
          dimensions: { x: '处世', y: '立场', z: '性情' },
          sects: [],
        },
      },
    });
    render(<VectorSpaceSettings />);
    expect(screen.getByPlaceholderText('处世')).toBeInTheDocument();
    expect(screen.getByText('门派锚点（0）')).toBeInTheDocument();
  });

  it('adds a sect anchor when the add button is clicked', () => {
    useProjectStore.setState({
      settings: {
        vectorSpace: {
          enabled: true,
          dimensions: { x: 'X', y: 'Y', z: 'Z' },
          sects: [],
        },
      },
    });
    render(<VectorSpaceSettings />);
    fireEvent.click(screen.getByText('+ 添加门派'));
    expect(useProjectStore.getState().settings.vectorSpace.sects).toHaveLength(1);
  });

  it('removes a sect anchor when the delete button is clicked', () => {
    useProjectStore.setState({
      settings: {
        vectorSpace: {
          enabled: true,
          dimensions: { x: 'X', y: 'Y', z: 'Z' },
          sects: [
            { id: 's1', name: 'Alpha', vector: { x: 1, y: 1, z: 1 }, title: 'A' },
          ],
        },
      },
    });
    render(<VectorSpaceSettings />);
    fireEvent.click(screen.getByText('删除'));
    expect(useProjectStore.getState().settings.vectorSpace.sects).toHaveLength(0);
  });

  it('toggles the vector space enabled state', () => {
    render(<VectorSpaceSettings />);
    fireEvent.click(screen.getByText('启用三维向量空间'));
    expect(useProjectStore.getState().settings.vectorSpace.enabled).toBe(true);
  });
});
