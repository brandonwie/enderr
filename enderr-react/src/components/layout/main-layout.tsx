/**
 * Main layout component for the main page and its children
 * @remarks
 * - Provides the layout structure with inbox sidebar and main content area
 * - Used for all authenticated routes under the main page
 * - Inbox sidebar is sticky and scrollable
 * - Main content area is flexible and can contain any child components
 */
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className='flex gap-4'>
      {/* Inbox Sidebar */}
      <aside className='sticky top-[5rem] h-[calc(100vh-8rem)] w-80 shrink-0 border-r'>
        <div className='flex h-full flex-col'>
          <div className='border-b p-4'>
            <h2 className='text-lg font-semibold'>Inbox</h2>
          </div>
          <div className='flex-1 overflow-auto p-4'>
            {/* TODO: Add inbox items */}
            <p className='text-sm text-muted-foreground'>No items in inbox</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className='flex-1'>
        <Outlet />
      </div>
    </div>
  );
}
