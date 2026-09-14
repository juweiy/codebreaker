import type { Metadata } from 'next';
import { PlayerCompletion } from '@/components/room/player-completion';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = { title: 'Game result' };
export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  return <PlayerCompletion roomId={id} logoHref={user ? '/dashboard' : '/'} />;
}
