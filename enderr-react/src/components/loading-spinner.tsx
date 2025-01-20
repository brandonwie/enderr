/**
 * Loading spinner component
 * @remarks Simple loading indicator for auth state transitions
 */
function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center'>
      <div className='text-center'>
        <div className='mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
        <p className='text-sm text-muted-foreground'>{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
