/**
 * Main page component
 * @remarks Contains the calendar view and inbox sidebar
 */
export default function MainPage() {
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

      {/* Calendar View */}
      <div className='flex-1'>
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Calendar</h1>
          <div className='flex items-center gap-2'>
            {/* TODO: Add week navigation */}
          </div>
        </div>
        <div className='rounded-lg border'>
          {/* TODO: Add calendar grid */}
          <div className='aspect-[5/3] p-4'>
            <p className='text-center text-muted-foreground'>
              Calendar view coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
