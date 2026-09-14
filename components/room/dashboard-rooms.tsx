'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gamepad2,
  Radio,
  RefreshCw,
  Users,
} from 'lucide-react';
import type { GameRoom, RoomStatus } from '@/lib/domain/types';
import {
  formatRoomDateTime,
  getRoomActivityDate,
  getRoomActivityLabel,
  sortRoomsByActivity,
  type RoomDateSort,
} from '@/lib/domain/room-display';
import { apiFetch } from '@/lib/api/client';
import { RoomCodeCopy } from '@/components/room/room-code-copy';
import { RoomShareActions } from '@/components/room/room-share-actions';
import { RoomStatusBadge } from '@/components/room/room-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type DashboardRoom = GameRoom & {
  game: { id: string; title: string };
  player_count: number;
  solve_count: number;
  puzzle_count: number;
};

type RoomFilter = 'all' | RoomStatus;
const filters: Array<{ value: RoomFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'Live' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'paused', label: 'Paused' },
  { value: 'finished', label: 'Finished' },
];

function getRoomProgress(room: DashboardRoom) {
  return room.puzzle_count
    ? Math.round((room.solve_count / room.puzzle_count) * 100)
    : 0;
}

function LiveRoomCard({ room }: { room: DashboardRoom }) {
  const progress = getRoomProgress(room);

  return (
    <Card className="h-full border-emerald-500/40 bg-emerald-500/5 shadow-emerald-500/5 transition hover:-translate-y-0.5 hover:border-emerald-500/60 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <RoomStatusBadge status={room.status} />
          <RoomCodeCopy
            code={room.code}
            className="text-sm font-semibold tracking-wider text-muted-foreground"
          />
        </div>

        <h3 className="mt-5 text-xl font-semibold">{room.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{room.game.title}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/70 p-3">
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-4" aria-hidden="true" /> Players
            </p>
            <p className="mt-1 text-lg font-semibold">{room.player_count}</p>
          </div>
          <div className="rounded-lg bg-muted/70 p-3">
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Progress
            </p>
            <p className="mt-1 text-lg font-semibold">{progress}%</p>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="size-4" aria-hidden="true" />
          {getRoomActivityLabel(room)}{' '}
          {formatRoomDateTime(getRoomActivityDate(room))}
        </p>

        <div className="mt-5 flex gap-2">
          <Button asChild className="min-w-0 flex-1">
            <Link href={`/room/${room.id}`}>
              <Radio aria-hidden="true" /> Open live control
            </Link>
          </Button>
          <RoomShareActions code={room.code} roomName={room.name} />
        </div>
      </CardContent>
    </Card>
  );
}

function RoomHistoryRow({ room }: { room: DashboardRoom }) {
  const progress = getRoomProgress(room);

  return (
    <Card className="transition hover:border-foreground/30 hover:shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center xl:flex-nowrap">
          <div className="min-w-0 md:min-w-56 md:flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{room.name}</h3>
              <RoomStatusBadge status={room.status} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {room.game.title}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <RoomCodeCopy
              code={room.code}
              className="font-semibold tracking-wider text-foreground"
            />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-4" aria-hidden="true" />
              {room.player_count}
              <span className="sr-only">players</span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {progress}%<span className="sr-only">complete</span>
            </span>
          </div>

          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground xl:w-56">
            <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {getRoomActivityLabel(room)}{' '}
              {formatRoomDateTime(getRoomActivityDate(room))}
            </span>
          </p>

          <div className="flex shrink-0 items-center gap-2 md:ml-auto xl:ml-0">
            <RoomShareActions code={room.code} roomName={room.name} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/room/${room.id}`}>
                Open room <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardRooms() {
  const [rooms, setRooms] = useState<DashboardRoom[]>([]);
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [dateSort, setDateSort] = useState<RoomDateSort>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRooms(await apiFetch<DashboardRoom[]>('/api/rooms'));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load rooms'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRooms(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadRooms]);

  const visibleRooms = useMemo(() => {
    const filtered =
      filter === 'all' ? rooms : rooms.filter((room) => room.status === filter);

    return sortRoomsByActivity(filtered, dateSort);
  }, [dateSort, filter, rooms]);

  const liveRooms = visibleRooms.filter(
    (room) => room.status === 'in_progress'
  );
  const otherRooms = visibleRooms.filter(
    (room) => room.status !== 'in_progress'
  );

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Game master
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            My rooms
          </h1>
          <p className="mt-2 text-muted-foreground">
            Control live sessions and revisit rooms from every game.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard">
            <Gamepad2 aria-hidden="true" /> Choose a game to launch
          </Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border bg-background p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Room status"
          >
            {filters.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Label htmlFor="room-date-sort" className="shrink-0">
            Sort
          </Label>
          <select
            id="room-date-sort"
            className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-40"
            value={dateSort}
            onChange={(event) =>
              setDateSort(event.target.value as RoomDateSort)
            }
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {error ? (
        <Card className="mt-8 border-destructive/40">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div>
              <h2 className="font-semibold">Could not load your rooms</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void loadRooms()}>
              <RefreshCw aria-hidden="true" /> Try again
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              className="h-28 animate-pulse rounded-xl border bg-muted"
              key={item}
            />
          ))}
        </div>
      ) : visibleRooms.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-muted">
              <Users className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold">
              {rooms.length === 0 ? 'No rooms yet' : 'No matching rooms'}
            </h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              {rooms.length === 0
                ? 'Choose a game to launch your first room.'
                : 'Try another room status to see more sessions.'}
            </p>
            {rooms.length === 0 ? (
              <Button asChild className="mt-6">
                <Link href="/dashboard">View my games</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-10">
          {liveRooms.length > 0 ? (
            <section aria-labelledby="live-rooms-title">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                  <Radio
                    className="size-4 motion-safe:animate-pulse"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <h2 id="live-rooms-title" className="text-xl font-semibold">
                    Live now
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Open controls without digging through room history.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {liveRooms.map((room) => (
                  <LiveRoomCard key={room.id} room={room} />
                ))}
              </div>
            </section>
          ) : null}

          {otherRooms.length > 0 ? (
            <section aria-labelledby="other-rooms-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="other-rooms-title" className="text-xl font-semibold">
                    {filter === 'all' ? 'Room history' : 'Rooms'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {otherRooms.length}{' '}
                    {otherRooms.length === 1 ? 'room' : 'rooms'} shown
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {otherRooms.map((room) => (
                  <RoomHistoryRow key={room.id} room={room} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
