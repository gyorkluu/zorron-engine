import { EditorShell } from '@/components/editor/EditorShell';

/**
 * Root application component.
 *
 * Renders the full editor shell (toolbar + asset panel + canvas + inspector).
 * Project id routing is handled by React Router; here we default to local
 * mode (no cloud project) so creators can start immediately.
 */
export default function App() {
  return <EditorShell />;
}
