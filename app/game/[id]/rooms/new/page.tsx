import type { Metadata } from 'next';
import { LaunchRoom } from '@/components/room/launch-room';

export const metadata: Metadata = { title: 'Launch a room' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LaunchRoom gameId={id} />;
}
