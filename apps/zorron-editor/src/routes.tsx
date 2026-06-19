import { createBrowserRouter, useParams } from 'react-router-dom';
import App from './App';
import { EditorShell } from '@/components/editor/EditorShell';
import { CloudProjectList } from '@/components/cloud/CloudProjectList';
import { PlayerPage } from '@/h5/PlayerPage';

// [React Router]: application route definitions
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    // Cloud project list dashboard.
    path: '/projects',
    element: <CloudProjectList />,
  },
  {
    // Open a specific cloud project by id.
    path: '/projects/:projectId',
    element: <ProjectRoute />,
  },
  {
    // Standalone player page (no editor chrome).
    path: '/player/:projectId',
    element: <PlayerPage />,
  },
]);

/** Route wrapper that reads the projectId param and passes it to EditorShell. */
function ProjectRoute() {
  const { projectId } = useParams<{ projectId: string }>();
  return <EditorShell projectId={projectId ?? null} />;
}
