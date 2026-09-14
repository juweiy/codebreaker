import type { Metadata } from 'next';
import { RoomControl } from '@/components/room/room-control';

export const metadata: Metadata = { title: 'Room control' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoomControl roomId={id} />;
}
