/**
 * Unit tests for the CloudProjectList component.
 *
 * The project store, auth store and router are mocked so we can test the
 * list rendering, search and empty states in isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CloudProjectList } from './CloudProjectList';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { ProjectListItem } from '@/types/project';

// Mock the feature flags.
vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { vector3d: true, cloudSync: true },
}));

// Mock react-router-dom's useNavigate.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the WorkspaceSwitcher so it doesn't trigger directory picker logic.
vi.mock('@/components/workspace/WorkspaceSwitcher', () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher-mock" />,
}));

// Mock the project service so the store doesn't hit the network.
vi.mock('@/services/project.service', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  exportProject: vi.fn(),
  importProject: vi.fn(),
}));

function makeListItem(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 'p1',
    title: 'Test Project',
    description: 'A test project',
    coverUrl: null,
    isPublished: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CloudProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.getState().reset();
    useAuthStore.setState({
      isAuthenticated: true,
      user: null,
      token: 't',
      isLoading: false,
      error: null,
    });
    useWorkspaceStore.getState().reset();
  });

  it('shows a sign-in prompt when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false });
    render(<CloudProjectList />);
    expect(screen.getByTestId('cloud-list-unauth')).toBeInTheDocument();
    expect(screen.getByText('Sign in required')).toBeInTheDocument();
  });

  it('shows a loading state initially', () => {
    useProjectStore.setState({ listLoading: true, list: [] });
    render(<CloudProjectList />);
    expect(screen.getByTestId('list-loading')).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', () => {
    useProjectStore.setState({ list: [], listLoading: false });
    // Switch to local mode so the mount useEffect does not call fetchList(),
    // which would otherwise flip listLoading back to true and show the loading
    // state instead of the empty state.
    useWorkspaceStore.getState().setMode('local');
    render(<CloudProjectList />);
    expect(screen.getByTestId('list-empty')).toBeInTheDocument();
  });

  it('renders the project list items', () => {
    const projects = [
      makeListItem({ id: 'p1', title: 'Alpha' }),
      makeListItem({ id: 'p2', title: 'Beta', isPublished: true }),
    ];
    useProjectStore.setState({ list: projects, listLoading: false });
    render(<CloudProjectList />);
    expect(screen.getByTestId('project-list-items')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('navigates to the editor when Open is clicked', () => {
    const projects = [makeListItem({ id: 'p1', title: 'Alpha' })];
    useProjectStore.setState({ list: projects, listLoading: false });
    render(<CloudProjectList />);
    fireEvent.click(screen.getByTestId('open-project-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1');
  });

  it('shows the New Project button', () => {
    useProjectStore.setState({ list: [], listLoading: false });
    render(<CloudProjectList />);
    expect(screen.getByTestId('new-project-button')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    useProjectStore.setState({ list: [], listLoading: false });
    render(<CloudProjectList />);
    expect(screen.getByTestId('project-search-input')).toBeInTheDocument();
  });
});
