'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock3, Home, PartyPopper, RotateCcw } from 'lucide-react';
import type { PlayerRoomState } from '@/lib/domain/types';
import { getPlayerOutcome, type PlayerOutcome } from '@/lib/domain/game-rules';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api/client';
import {
  getSavedPlayerSessionForRoom,
  savePlayerSession,
} from '@/lib/auth/player-session-storage';
import { AppLogo } from '@/components/app-logo';
import { RoomCodeCopy } from '@/components/room/room-code-copy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PlayerCompletion({
  roomId,
  logoHref = '/',
}: {
  roomId: string;
  logoHref?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PlayerRoomState | null>(null);
  const [outcome, setOutcome] = useState<PlayerOutcome>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCompletion() {
      const session = getSavedPlayerSessionForRoom(roomId);
      if (!session) {
        setError('This device does not have a player session for the room.');
        return;
      }

      try {
        const data = await apiFetch<PlayerRoomState>(
          `/api/rooms/${roomId}/player-state`,
          {
            method: 'POST',
            body: JSON.stringify({
              playerId: session.playerId,
              sessionToken: session.sessionToken,
            }),
          }
        );
        if (cancelled) return;
        savePlayerSession(session, data.room.code);
        const solvedCount = data.puzzles.filter(
          (puzzle) => puzzle.solved
        ).length;
        const result = getPlayerOutcome(
          data.room.status,
          data.room.endReason,
          data.room.endsAt,
          data.puzzles.length,
          solvedCount
        );
        if (!result) {
          router.replace(`/play/${roomId}`);
          return;
        }
        setState(data);
        setOutcome(result);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not open the completion screen'
        );
      }
    }

    void loadCompletion();
    return () => {
      cancelled = true;
    };
  }, [roomId, router]);

  if (error) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/20 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <h1 className="text-xl font-semibold">
              Could not open your result
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-6">
              <Link href="/join">Join a game</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!state || !outcome) {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/20">
        <p className="animate-pulse text-muted-foreground">
          Preparing your result…
        </p>
      </div>
    );
  }

  const completed = outcome === 'completed';
  const solvedCount = state.puzzles.filter((puzzle) => puzzle.solved).length;

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-muted/20 p-4 py-12">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-80',
          completed
            ? 'bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_65%)]'
            : 'bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_65%)]'
        )}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl">
        <div className="mb-8 flex justify-center">
          <AppLogo href={logoHref} />
        </div>
        <Card
          className={cn(
            'overflow-hidden text-center shadow-xl',
            completed ? 'border-emerald-500/40' : 'border-red-500/40'
          )}
        >
          <CardContent
            className={cn(
              'px-6 py-12 sm:px-12 sm:py-16',
              completed ? 'bg-emerald-500/[.07]' : 'bg-red-500/[.07]'
            )}
          >
            <span
              className={cn(
                'mx-auto grid size-16 place-items-center rounded-full text-white shadow-lg',
                completed
                  ? 'bg-emerald-600 shadow-emerald-600/20'
                  : 'bg-red-600 shadow-red-600/20'
              )}
            >
              {completed ? (
                <PartyPopper className="size-8" aria-hidden="true" />
              ) : (
                <Clock3 className="size-8" aria-hidden="true" />
              )}
            </span>
            <Badge
              className={cn(
                'mt-6',
                completed ? 'bg-emerald-600' : 'bg-red-600'
              )}
            >
              {completed ? 'Game complete' : "Time's up"}
            </Badge>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1 text-sm font-medium text-muted-foreground">
              <span>{state.game.title} ·</span>
              <RoomCodeCopy code={state.room.code} prefix="Room " />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              {completed
                ? `Congratulations, ${state.player.displayName}!`
                : `Time's up, ${state.player.displayName}`}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl whitespace-pre-wrap text-xl leading-8 text-muted-foreground sm:text-2xl sm:leading-9">
              {completed ? state.game.finalMessage : state.game.timeoutMessage}
            </p>
            <p className="mt-8 text-sm text-muted-foreground">
              {completed
                ? `Your team solved all ${state.puzzles.length} puzzles.`
                : `Your team solved ${solvedCount} of ${state.puzzles.length} puzzles before time ran out.`}
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="primary">
                <Link href="/join">
                  <RotateCcw aria-hidden="true" /> Join another game
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/">
                  <Home aria-hidden="true" /> Return home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
