import { createBrowserRouter, useParams } from 'react-router-dom';
import App from './App';
import { EditorShell } from '@/components/editor/EditorShell';
import { CloudProjectList } from '@/components/cloud/CloudProjectList';
import { PlayerPage } from '@/h5/PlayerPage';
import HomePage from './HomePage';
import TestCardPage from './TestCardPage';
import TestCardProfilePage from './TestCardProfilePage';

// [React Router]: application route definitions
// 正式版根路径 / 指向 HomePage（JX3 社交卡片展示页）。
// 编辑器入口已下移到 /editor，避免与正式版入口冲突。
export const router = createBrowserRouter([
  {
    // 正式版入口：JX3 社交卡片展示页
    // URL 查询参数 ?tuilanId=xxx 可动态查询玩家 profile
    path: '/',
    element: <HomePage />,
  },
  {
    // 编辑器（原 / 路径下移）
    path: '/editor',
    element: <App />,
  },
  {
    // 旧的 test-card 测试入口（保留兼容）
    path: '/test-card',
    element: <TestCardPage />,
  },
  {
    path: '/test-card-profile',
    element: <TestCardProfilePage />,
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
