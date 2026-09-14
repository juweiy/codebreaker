'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  FileText,
  KeyRound,
  LayoutList,
  Plus,
} from 'lucide-react';
import type { Game, GameRoom } from '@/lib/domain/types';
import {
  formatRoomDateTime,
  getRoomActivityDate,
  getRoomActivityLabel,
  sortRoomsByActivity,
} from '@/lib/domain/room-display';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api/client';
import { GameStatusBadge } from '@/components/game/game-status-badge';
import { RoomCodeCopy } from '@/components/room/room-code-copy';
import { RoomShareActions } from '@/components/room/room-share-actions';
import { RoomStatusBadge } from '@/components/room/room-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type GameRoomsBundle = {
  game: Game;
  rooms: GameRoom[];
};

export function GameRooms({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const bundle = await apiFetch<GameRoomsBundle>(`/api/games/${gameId}`);
      setGame(bundle.game);
      setRooms(bundle.rooms);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load rooms'
      );
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRooms(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRooms]);

  const sortedRooms = useMemo(() => sortRoomsByActivity(rooms), [rooms]);

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/20">
        <p className="animate-pulse text-muted-foreground">Loading rooms…</p>
      </div>
    );
  }

  if (!game) {
    return (
      <main className="page-shell py-20">
        <Card className="border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Could not open this game</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-muted/20">
      <div className="page-shell py-8 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/dashboard">
            <ArrowLeft aria-hidden="true" /> My games
          </Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Room management
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {game.title} rooms
            </h1>
            <p className="mt-2 text-muted-foreground">
              Open a room to control it or review previous sessions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {game.status === 'archived' ? (
              <GameStatusBadge status={game.status} />
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/game/${game.id}`}>
                <FileText aria-hidden="true" /> View game details
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/rooms">
                <LayoutList aria-hidden="true" /> All rooms
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/game/${game.id}/rooms/new`}>
                <Plus aria-hidden="true" /> Launch room
              </Link>
            </Button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Rooms</CardTitle>
              <CardDescription className="mt-2">
                Live rooms are kept at the top for quick access.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
            </Badge>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted">
                  <KeyRound
                    className="size-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
                <h2 className="mt-4 font-semibold">No rooms yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Launch a room when you are ready for a team to play.
                </p>
                <Button asChild className="mt-5">
                  <Link href={`/game/${game.id}/rooms/new`}>
                    <Plus aria-hidden="true" /> Launch room
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedRooms.map((room) => (
                  <div
                    key={room.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border bg-background p-4 transition hover:border-foreground/30 hover:bg-muted/40',
                      room.status === 'in_progress' &&
                        'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10'
                    )}
                  >
                    <Link
                      href={`/room/${room.id}`}
                      className="focus-ring rounded-lg"
                      aria-label={`Open ${room.name}`}
                    >
                      <span
                        className={cn(
                          'grid size-10 shrink-0 place-items-center rounded-lg bg-muted font-mono text-sm font-semibold',
                          room.status === 'in_progress' &&
                            'bg-emerald-500 text-white'
                        )}
                      >
                        {room.code.slice(0, 2)}
                      </span>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/room/${room.id}`}
                          className="focus-ring rounded-sm font-semibold hover:underline"
                        >
                          {room.name}
                        </Link>
                        <RoomStatusBadge status={room.status} />
                      </div>
                      <RoomCodeCopy
                        code={room.code}
                        prefix="Code "
                        className="mt-1 text-sm text-muted-foreground"
                      />
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarClock className="size-4" aria-hidden="true" />
                        {getRoomActivityLabel(room)}{' '}
                        {formatRoomDateTime(getRoomActivityDate(room))}
                      </p>
                    </div>
                    <RoomShareActions code={room.code} roomName={room.name} />
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        href={`/room/${room.id}`}
                        aria-label={`Open ${room.name}`}
                      >
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
