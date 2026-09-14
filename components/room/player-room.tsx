'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock3, Radio, Users } from 'lucide-react';
import { getPlayerOutcome, isPuzzleUnlocked } from '@/lib/domain/game-rules';
import { apiFetch } from '@/lib/api/client';
import { playPuzzleSound, preparePuzzleSounds } from '@/lib/puzzle-sounds';
import {
  getSavedPlayerSessionForRoom,
  savePlayerSession,
} from '@/lib/auth/player-session-storage';
import type {
  PlayerPuzzle,
  PlayerRoomState,
  PlayerSession,
} from '@/lib/domain/types';
import { AppLogo } from '@/components/app-logo';
import { PlayerGameStatus } from '@/components/room/player-game-status';
import { PuzzleWizard } from '@/components/room/puzzle-wizard';
import { PuzzleSuccessCelebration } from '@/components/room/puzzle-success-celebration';
import { RoomCodeCopy } from '@/components/room/room-code-copy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function remainingTime(endsAt: string | null, now: number) {
  if (!endsAt) return null;
  const seconds = Math.max(
    0,
    Math.floor((new Date(endsAt).getTime() - now) / 1000)
  );
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PlayerRoom({
  roomId,
  logoHref = '/',
}: {
  roomId: string;
  logoHref?: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [state, setState] = useState<PlayerRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [incorrectPuzzles, setIncorrectPuzzles] = useState<
    Record<string, boolean>
  >({});
  const incorrectTimers = useRef<Record<string, number>>({});
  const successTimer = useRef<number | null>(null);
  const savedSessionCode = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [celebration, setCelebration] = useState<{
    puzzleId: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const storedSession = getSavedPlayerSessionForRoom(roomId);
    if (!storedSession) {
      setLoading(false);
      return;
    }
    setSession(storedSession);
  }, [roomId]);

  const loadState = useCallback(async () => {
    if (!session) return;
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
      setState(data);
      setAnswers((current) => {
        let changed = false;
        const next = { ...current };
        for (const puzzle of data.puzzles) {
          if (
            puzzle.answerType === 'ordering' &&
            puzzle.orderingItems &&
            next[puzzle.id] === undefined
          ) {
            next[puzzle.id] = JSON.stringify(puzzle.orderingItems);
            changed = true;
          }
        }
        return changed ? next : current;
      });
      if (savedSessionCode.current !== data.room.code) {
        savePlayerSession(session, data.room.code);
        savedSessionCode.current = data.room.code;
      }
      setError(null);
    } catch (stateError) {
      setError(
        stateError instanceof Error ? stateError.message : 'Could not load room'
      );
    }
    setLoading(false);
  }, [roomId, session]);

  useEffect(() => {
    void loadState();
    if (!session) return;
    const interval = window.setInterval(() => void loadState(), 2000);
    return () => window.clearInterval(interval);
  }, [loadState, session]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(
    () => () => {
      Object.values(incorrectTimers.current).forEach((timeout) =>
        window.clearTimeout(timeout)
      );
      if (successTimer.current !== null) {
        window.clearTimeout(successTimer.current);
      }
    },
    []
  );

  async function submitAnswer(puzzle: PlayerPuzzle, event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const soundReady = preparePuzzleSounds();
    window.clearTimeout(incorrectTimers.current[puzzle.id]);
    setIncorrectPuzzles((current) => ({
      ...current,
      [puzzle.id]: false,
    }));
    setSubmitting(puzzle.id);
    setFeedback((current) => ({
      ...current,
      [puzzle.id]: 'Checking your answer…',
    }));
    try {
      const result = await apiFetch<{
        correct: boolean;
        alreadySolved: boolean;
        roomFinished: boolean;
      }>(`/api/rooms/${roomId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          puzzleId: puzzle.id,
          playerId: session.playerId,
          sessionToken: session.sessionToken,
          answer:
            answers[puzzle.id] ??
            (puzzle.answerType === 'ordering' && puzzle.orderingItems
              ? JSON.stringify(puzzle.orderingItems)
              : ''),
        }),
      });
      if (result.correct) {
        void soundReady.then(() => playPuzzleSound('success'));
        setFeedback((current) => ({
          ...current,
          [puzzle.id]: 'Correct — puzzle solved!',
        }));
        setCelebration({ puzzleId: puzzle.id, title: puzzle.title });
        if (successTimer.current !== null) {
          window.clearTimeout(successTimer.current);
        }
        successTimer.current = window.setTimeout(() => {
          setAnswers((current) => ({ ...current, [puzzle.id]: '' }));
          setState((current) => {
            if (!current) return current;
            const solvedPositions = current.puzzles
              .filter((item) => item.solved || item.id === puzzle.id)
              .map((item) => item.position);
            return {
              ...current,
              room: result.roomFinished
                ? {
                    ...current.room,
                    status: 'finished',
                    endReason: 'completed',
                  }
                : current.room,
              puzzles: current.puzzles.map((item) => ({
                ...item,
                solved: item.solved || item.id === puzzle.id,
                unlocked: isPuzzleUnlocked(
                  current.game.mode,
                  item.position,
                  solvedPositions
                ),
              })),
            };
          });
          setCelebration(null);
          successTimer.current = null;
        }, 1400);
      } else {
        void soundReady.then(() => playPuzzleSound('failure'));
        if (puzzle.answerType !== 'ordering') {
          setAnswers((current) => ({ ...current, [puzzle.id]: '' }));
        }
        setFeedback((current) => ({
          ...current,
          [puzzle.id]: 'Incorrect answer. Try again.',
        }));
        setIncorrectPuzzles((current) => ({
          ...current,
          [puzzle.id]: true,
        }));
        incorrectTimers.current[puzzle.id] = window.setTimeout(() => {
          setIncorrectPuzzles((current) => ({
            ...current,
            [puzzle.id]: false,
          }));
          delete incorrectTimers.current[puzzle.id];
        }, 650);
      }
    } catch (submitError) {
      setFeedback((current) => ({
        ...current,
        [puzzle.id]:
          submitError instanceof Error
            ? submitError.message
            : 'Could not submit',
      }));
    } finally {
      setSubmitting(null);
    }
  }

  const solvedCount =
    state?.puzzles.filter((puzzle) => puzzle.solved).length ?? 0;
  const timerNow =
    state?.room.status === 'paused' && state.room.pausedAt
      ? new Date(state.room.pausedAt).getTime()
      : now;
  const time =
    state?.room.status === 'finished'
      ? '—'
      : remainingTime(state?.room.endsAt ?? null, timerNow);
  const playerOutcome = state
    ? getPlayerOutcome(
        state.room.status,
        state.room.endReason,
        state.room.endsAt,
        state.puzzles.length,
        solvedCount,
        now
      )
    : null;

  useEffect(() => {
    if (playerOutcome && !celebration) {
      router.replace(`/play/${roomId}/complete`);
    }
  }, [celebration, playerOutcome, roomId, router]);

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center">
        <p className="animate-pulse text-muted-foreground">
          Joining your team…
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/20 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Join this room first</CardTitle>
            <CardDescription>
              This device does not have a player session for the room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/join">Enter a room code</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/20 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Could not open the room</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/join">Join another room</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      {celebration ? (
        <PuzzleSuccessCelebration title={celebration.title} />
      ) : null}
      <main className="min-h-svh bg-muted/20 pb-16">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="page-shell flex min-h-16 items-center justify-between gap-4 py-3">
            <AppLogo href={logoHref} />
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="size-4" /> {state.playerCount}
              </span>
              {time ? (
                <span className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock3 className="size-4" /> {time}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="page-shell max-w-4xl py-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="p-0">
                  <RoomCodeCopy
                    code={state.room.code}
                    prefix="Room "
                    className="px-2.5 py-0.5 hover:no-underline"
                  />
                </Badge>
                {state.room.status === 'in_progress' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Radio className="size-3 animate-pulse" /> Live
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {state.game.title}
              </h1>
              {state.game.description ? (
                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                  {state.game.description}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-sm text-muted-foreground">
                Playing as{' '}
                <strong className="text-foreground">
                  {state.player.displayName}
                </strong>
              </p>
            </div>
          </div>

          {state.room.status === 'in_progress' ? (
            <PuzzleWizard
              mode={state.game.mode}
              puzzles={state.puzzles}
              answers={answers}
              feedback={feedback}
              incorrectPuzzles={incorrectPuzzles}
              submittingPuzzleId={submitting}
              onAnswerChange={(puzzleId, value) =>
                setAnswers((current) => ({
                  ...current,
                  [puzzleId]: value,
                }))
              }
              onSubmit={(puzzle, event) => void submitAnswer(puzzle, event)}
            />
          ) : (
            <PlayerGameStatus status={state.room.status} />
          )}
        </div>
      </main>
    </>
  );
}
