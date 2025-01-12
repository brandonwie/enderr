'use client';

import Image from 'next/image';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

/**
 * Sidebar Component
 * @remarks
 * Contains:
 * - User profile section (photo and name)
 * - Inbox section with draggable items
 * - Add task button
 *
 * @todo
 * - Implement drag and drop functionality
 * - Add task creation modal
 * - Add inbox item component
 */
export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex h-full flex-col border-r">
      {/* User Profile Section */}
      <div className="flex items-center gap-3 border-b p-4">
        <div className="relative h-10 w-10 overflow-hidden rounded-full">
          {user?.picture ? (
            <Image
              src={user.picture}
              alt={user.name}
              fill
              className="object-cover"
            />
          ) : null}
        </div>
        <span className="font-medium">{user?.name ?? ''}</span>
      </div>

      {/* Inbox Section */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">Inbox</h2>
          <span className="text-xs text-muted-foreground">0</span>
        </div>

        {/* Add Task Button */}
        <Button
          variant="ghost"
          className="m-2 justify-start gap-2"
          onClick={() => {
            // TODO: Open task creation modal
            console.log('Add task clicked');
          }}
        >
          <Plus className="h-4 w-4" />
          Add a Task
        </Button>

        {/* Inbox Items List */}
        <div className="flex-1 overflow-auto p-2">
          {/* TODO: Add inbox items */}
        </div>
      </div>
    </aside>
  );
}
