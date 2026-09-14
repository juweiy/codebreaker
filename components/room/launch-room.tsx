'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Gamepad2, Users } from 'lucide-react';
import type { Game, GameRoom, Puzzle } from '@/lib/domain/types';
import { apiFetch } from '@/lib/api/client';
import { GameStatusBadge } from '@/components/game/game-status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type GameBundle = {
  game: Game;
  puzzles: Puzzle[];
};

export function LaunchRoom({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [puzzleCount, setPuzzleCount] = useState(0);
  const [roomName, setRoomName] = useState('Room 1');
  const [roomPassword, setRoomPassword] = useState('');
  const [roomDuration, setRoomDuration] = useState('60');
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGame = useCallback(async () => {
    try {
      const bundle = await apiFetch<GameBundle>(`/api/games/${gameId}`);
      setGame(bundle.game);
      setPuzzleCount(bundle.puzzles.length);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load game'
      );
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadGame(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadGame]);

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
    setCreatingRoom(true);
    setError(null);
    const duration = roomDuration.trim() ? Number(roomDuration) : null;
    try {
      const created = await apiFetch<GameRoom>(`/api/games/${gameId}/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          name: roomName.trim(),
          password: roomPassword,
          durationMinutes: duration,
        }),
      });
      router.push(`/room/${created.id}`);
    } catch (roomError) {
      setError(
        roomError instanceof Error ? roomError.message : 'Could not create room'
      );
      setCreatingRoom(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/20">
        <p className="animate-pulse text-muted-foreground">
          Preparing room setup…
        </p>
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
      <div className="page-shell max-w-3xl py-8 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href={`/game/${game.id}/rooms`}>
            <ArrowLeft aria-hidden="true" /> Rooms
          </Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {game.title}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Launch a room
            </h1>
            <p className="mt-2 text-muted-foreground">
              Configure a new session, then open its live control screen.
            </p>
          </div>
          {game.status === 'archived' ? (
            <GameStatusBadge status={game.status} />
          ) : null}
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
          <CardHeader>
            <CardTitle>Room details</CardTitle>
            <CardDescription>
              Create one room for one team of players.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRoom} className="space-y-5">
              <div>
                <Label htmlFor="room-name">Room name</Label>
                <Input
                  id="room-name"
                  className="mt-2"
                  placeholder="Room 1"
                  required
                  maxLength={100}
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="room-password">Password (optional)</Label>
                <Input
                  id="room-password"
                  className="mt-2"
                  type="password"
                  value={roomPassword}
                  onChange={(event) => setRoomPassword(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="room-duration">Time limit in minutes</Label>
                <Input
                  id="room-duration"
                  className="mt-2"
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="No limit"
                  value={roomDuration}
                  onChange={(event) => setRoomDuration(event.target.value)}
                />
              </div>
              <Button
                className="w-full"
                type="submit"
                disabled={
                  creatingRoom ||
                  puzzleCount === 0 ||
                  game.status === 'archived'
                }
              >
                <Users aria-hidden="true" />
                {creatingRoom ? 'Creating…' : 'Create and open room'}
              </Button>
              {puzzleCount === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <p>Add at least one puzzle before launching a room.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href={`/game/${game.id}`}>
                      <Gamepad2 aria-hidden="true" /> Add puzzles
                    </Link>
                  </Button>
                </div>
              ) : game.status === 'archived' ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <p>Restore this game before creating a new room.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href={`/game/${game.id}`}>
                      <Gamepad2 aria-hidden="true" /> Open game details
                    </Link>
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
