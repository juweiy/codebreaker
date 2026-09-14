import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserId } from '@/lib/auth/require-user';
import { getRoomActivityLog } from '@/lib/db/codebreaker';
import { AppLogo } from '@/components/app-logo';
import { RoomActivityList } from '@/components/room/room-activity-list';
import { RoomStatusBadge } from '@/components/room/room-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Room activity' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRoomActivityLog(id, await requireUserId());

  return (
    <main className="min-h-svh bg-muted/20 pb-16">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="page-shell flex h-16 items-center">
          <AppLogo href="/dashboard" />
        </div>
      </header>

      <div className="page-shell max-w-4xl py-8 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href={`/room/${id}`}>
            <ArrowLeft aria-hidden="true" /> Room control
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {data.game.title} · {data.room.name}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Room activity
            </h1>
          </div>
          <RoomStatusBadge status={data.room.status} />
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Full log</CardTitle>
          </CardHeader>
          <CardContent>
            <RoomActivityList events={data.events} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
