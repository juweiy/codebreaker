import type { Metadata } from 'next';
import { JoinRoomForm } from '@/components/room/join-room-form';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = { title: 'Join a room' };
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const [{ room }, user] = await Promise.all([searchParams, getCurrentUser()]);
  return (
    <JoinRoomForm
      initialCode={room ?? ''}
      logoHref={user ? '/dashboard' : '/'}
    />
  );
}
