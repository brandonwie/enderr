'use client';

import { useParams } from 'next/navigation';

import { InboxItemContent } from '@/components/inbox/inbox-item-content';

export default function InboxItemPage() {
  const { id } = useParams();

  if (!id) {
    return <div>No ID provided</div>;
  }

  return <InboxItemContent id={id as string} />;
}
