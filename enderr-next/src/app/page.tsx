'use client';

import { Calendar } from '@/components/calendar';
import { Sidebar } from '@/components/sidebar';

/**
 * Home Page Component
 * @remarks
 * Main layout with:
 * - Fixed width sidebar (256px)
 * - Fluid calendar view that fills remaining space
 * Uses CSS Grid for responsive layout
 */
export default function Home() {
  return (
    <main className="grid h-[calc(100vh-3.5rem)] grid-cols-[256px_1fr]">
      <Sidebar />
      <Calendar />
    </main>
  );
}
