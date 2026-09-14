import type { Metadata } from 'next';
import { GameRooms } from '@/components/room/game-rooms';

export const metadata: Metadata = { title: 'Rooms' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GameRooms gameId={id} />;
}
