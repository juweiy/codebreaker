'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { calculateProgress } from '@/lib/domain/game-rules';
import {
  formatRoomDateTime,
  getRoomActivityDate,
  getRoomActivityLabel,
} from '@/lib/domain/room-display';
import { apiFetch } from '@/lib/api/client';
import type {
  Game,
  GameRoom,
  Puzzle,
  RoomEvent,
  RoomPlayer,
  RoomSolve,
  RoomStatus,
} from '@/lib/domain/types';
import { AppLogo } from '@/components/app-logo';
import { RoomActivityList } from '@/components/room/room-activity-list';
import { RoomCodeCopy } from '@/components/room/room-code-copy';
import { RoomStatusBadge } from '@/components/room/room-status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type RoomWithGame = GameRoom & { games: Game };
type RoomControlData = {
  room: RoomWithGame;
  puzzles: Puzzle[];
  players: RoomPlayer[];
  solves: RoomSolve[];
  events: RoomEvent[];
  eventCount: number;
};

function remainingTime(endsAt: string | null, now: number): string {
  if (!endsAt) return 'No time limit';
  const seconds = Math.max(
    0,
    Math.floor((new Date(endsAt).getTime() - now) / 1000)
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function RoomControl({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomWithGame | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [solves, setSolves] = useState<RoomSolve[]>([]);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [endConfirmationOpen, setEndConfirmationOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);

  const loadRoom = useCallback(async () => {
    try {
      const data = await apiFetch<RoomControlData>(`/api/rooms/${roomId}`);
      setError(null);
      setRoom(data.room);
      setPuzzles(data.puzzles);
      setPlayers(data.players);
      setSolves(data.solves);
      setEvents(data.events);
      setEventCount(data.eventCount);
    } catch (queryError) {
      setError(
        queryError instanceof Error ? queryError.message : 'Could not load room'
      );
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRoom(), 0);
    const interval = window.setInterval(() => void loadRoom(), 2000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadRoom]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const progress = calculateProgress(puzzles.length, solves.length);
  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined' || !room) return '';
    return `${window.location.origin}/join?room=${room.code}`;
  }, [room]);

  async function setStatus(status: RoomStatus) {
    setUpdating(true);
    setError(null);
    try {
      await apiFetch<GameRoom>(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadRoom();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'Could not update room'
      );
    } finally {
      setUpdating(false);
    }
  }

  async function copyJoinLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function deleteRoom() {
    if (!room || !window.confirm(`Delete room “${room.name}”?`)) return;
    try {
      await apiFetch<void>(`/api/rooms/${roomId}`, { method: 'DELETE' });
      router.push(`/game/${room.game_id}/rooms`);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete room'
      );
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center">
        <p className="animate-pulse text-muted-foreground">Opening room…</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page-shell py-20">
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Room unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-svh bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="page-shell flex h-16 items-center">
          <AppLogo href="/dashboard" />
        </div>
      </header>

      <div className="page-shell py-8 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href={`/game/${room.game_id}/rooms`}>
            <ArrowLeft aria-hidden="true" /> Rooms
          </Link>
        </Button>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {room.games.title}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {room.name}
            </h1>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden="true" />
              {getRoomActivityLabel(room)}{' '}
              {formatRoomDateTime(getRoomActivityDate(room))}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoomStatusBadge status={room.status} />
            {room.status === 'waiting' ? (
              <Button
                disabled={updating}
                onClick={() => void setStatus('in_progress')}
              >
                <Play aria-hidden="true" /> Start room
              </Button>
            ) : null}
            {room.status === 'in_progress' ? (
              <Button
                variant="outline"
                disabled={updating}
                onClick={() => void setStatus('paused')}
              >
                <Pause aria-hidden="true" /> Pause
              </Button>
            ) : null}
            {room.status === 'paused' ? (
              <Button
                disabled={updating}
                onClick={() => void setStatus('in_progress')}
              >
                <RotateCcw aria-hidden="true" /> Resume
              </Button>
            ) : null}
            {room.status !== 'finished' ? (
              <Button
                variant="destructive"
                disabled={updating}
                onClick={() => setEndConfirmationOpen(true)}
              >
                <Square aria-hidden="true" /> End room
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" /> Players
              </div>
              <p className="mt-2 text-3xl font-bold">{players.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" /> Progress
              </div>
              <p className="mt-2 text-3xl font-bold">{progress}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" /> Time remaining
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {room.status === 'finished'
                  ? '—'
                  : remainingTime(
                      room.ends_at,
                      room.status === 'paused' && room.paused_at
                        ? new Date(room.paused_at).getTime()
                        : now
                    )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Room code</p>
              <RoomCodeCopy
                code={room.code}
                className="mt-2 text-3xl font-bold tracking-[.18em]"
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Puzzle progress</CardTitle>
                <CardDescription>
                  A solve is shared by the whole room in real time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ol className="space-y-3">
                  {puzzles.map((puzzle) => {
                    const solve = solves.find(
                      (item) => item.puzzle_id === puzzle.id
                    );
                    const solver = players.find(
                      (player) => player.id === solve?.player_id
                    );
                    return (
                      <li
                        key={puzzle.id}
                        className="flex items-center gap-3 rounded-lg border p-4"
                      >
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                            solve
                              ? 'bg-emerald-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {solve ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            puzzle.position
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{puzzle.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {solve
                              ? `Solved${solver ? ` by ${solver.display_name}` : ''}`
                              : 'Not solved yet'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>Room activity</CardTitle>
                  <CardDescription className="mt-1.5">
                    Player attempts and game master actions.
                  </CardDescription>
                </div>
                {eventCount > events.length ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/room/${roomId}/logs`}>View all</Link>
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                <RoomActivityList events={events} />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            {room.status !== 'finished' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Invite players</CardTitle>
                  <CardDescription>
                    Share the link or ask players to enter the room code.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RoomCodeCopy
                    code={room.code}
                    className="w-full rounded-lg border bg-muted/40 p-4 text-center text-3xl font-bold tracking-[.2em] hover:bg-muted/70 hover:no-underline"
                  />
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => void copyJoinLink()}
                  >
                    <Copy aria-hidden="true" />{' '}
                    {copied ? 'Copied!' : 'Copy join link'}
                  </Button>
                  <Button asChild className="w-full" variant="ghost">
                    <a href={joinUrl} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" /> Open player view
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
                <CardDescription>Everyone who joined this room</CardDescription>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Waiting for the first player to join.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {players.map((player) => (
                      <li key={player.id} className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-full bg-muted">
                          <UserRound className="size-4" />
                        </span>
                        <span className="text-sm font-medium">
                          {player.display_name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full text-destructive hover:text-destructive"
              variant="ghost"
              onClick={() => void deleteRoom()}
            >
              <Trash2 aria-hidden="true" /> Delete room
            </Button>
          </aside>
        </div>
      </div>

      <ConfirmationDialog
        open={endConfirmationOpen}
        title="End this room?"
        description={`“${room.name}” will end immediately for every player and cannot be resumed.`}
        confirmLabel="End room"
        confirmVariant="destructive"
        onCancel={() => setEndConfirmationOpen(false)}
        onConfirm={() => {
          setEndConfirmationOpen(false);
          void setStatus('finished');
        }}
      />
    </main>
  );
}
