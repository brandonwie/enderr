import { RouterProvider } from 'react-router-dom';
import { router } from './lib/router';

/**
 * Root App component
 * @remarks Provides router and global providers
 */
export default function App() {
  return <RouterProvider router={router} />;
}
