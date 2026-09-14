import type { Metadata } from 'next';
import { PlayerRoom } from '@/components/room/player-room';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = { title: 'Play' };
export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  return <PlayerRoom roomId={id} logoHref={user ? '/dashboard' : '/'} />;
}
