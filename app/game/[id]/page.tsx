import type { Metadata } from 'next';
import { GameEditor } from '@/components/game/game-editor';

export const metadata: Metadata = { title: 'Game builder' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GameEditor gameId={id} />;
}
