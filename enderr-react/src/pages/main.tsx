/**
 * Main page component
 * @remarks Contains the calendar view and week navigation
 * @alternative Could be split into smaller components for better maintainability:
 * - WeekNavigation
 * - CalendarGrid
 * - CalendarEvent
 */
export default function MainPage() {
  return (
    <>
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
    </>
  );
}
