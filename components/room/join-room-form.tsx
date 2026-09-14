'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, DoorOpen } from 'lucide-react';
import { formatRoomCode } from '@/lib/domain/game-rules';
import type { PlayerRoomState, PlayerSession } from '@/lib/domain/types';
import { apiFetch } from '@/lib/api/client';
import {
  clearPlayerSession,
  getSavedPlayerSessionForCode,
  savePlayerSession,
} from '@/lib/auth/player-session-storage';
import { AppLogo } from '@/components/app-logo';
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

export function JoinRoomForm({
  initialCode,
  logoHref = '/',
}: {
  initialCode: string;
  logoHref?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(formatRoomCode(initialCode));
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resumePlayer() {
      await Promise.resolve();
      if (cancelled) return;

      const storedSession = getSavedPlayerSessionForCode(code);
      if (!storedSession) {
        setResuming(false);
        return;
      }
      const savedSession = storedSession;
      setResuming(true);
      setError(null);

      try {
        const state = await apiFetch<PlayerRoomState>(
          `/api/rooms/${savedSession.roomId}/player-state`,
          {
            method: 'POST',
            body: JSON.stringify({
              playerId: savedSession.playerId,
              sessionToken: savedSession.sessionToken,
            }),
          }
        );
        if (cancelled) return;
        if (formatRoomCode(state.room.code) !== code) {
          clearPlayerSession(savedSession, code);
          setResuming(false);
          return;
        }
        savePlayerSession(savedSession, state.room.code);
        router.replace(`/play/${savedSession.roomId}`);
      } catch {
        if (cancelled) return;
        clearPlayerSession(savedSession, code);
        setResuming(false);
      }
    }

    void resumePlayer();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  async function joinRoom(event: React.FormEvent) {
    event.preventDefault();
    setJoining(true);
    setError(null);
    try {
      const session = await apiFetch<PlayerSession>('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify({
          code,
          password,
          displayName: displayName.trim(),
        }),
      });
      savePlayerSession(session, code);
      router.push(`/play/${session.roomId}`);
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : 'Could not join'
      );
      setJoining(false);
    }
  }

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-muted/20 p-4 py-12">
      <div className="absolute left-6 top-6">
        <AppLogo href={logoHref} />
      </div>
      <div className="absolute -left-24 top-1/3 size-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute -right-24 bottom-1/4 size-80 rounded-full bg-purple-500/10 blur-3xl" />
      <Card className="relative w-full max-w-md shadow-xl shadow-black/5">
        <CardHeader className="text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <DoorOpen className="size-6" aria-hidden="true" />
          </span>
          <CardTitle className="text-2xl">Join a game room</CardTitle>
          <CardDescription>
            Enter the code from your game master and choose the name your team
            will see.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={joinRoom} className="space-y-5">
            <div>
              <Label htmlFor="room-code">Room code</Label>
              <Input
                id="room-code"
                className="mt-2 h-14 text-center font-mono text-2xl font-bold uppercase tracking-[.2em]"
                value={code}
                placeholder="A1B2C3"
                autoCapitalize="characters"
                autoComplete="off"
                required
                minLength={6}
                maxLength={6}
                onChange={(event) =>
                  setCode(formatRoomCode(event.target.value))
                }
              />
            </div>
            <div>
              <Label htmlFor="display-name">Your name</Label>
              <Input
                id="display-name"
                className="mt-2"
                value={displayName}
                placeholder="Enter your name"
                required
                maxLength={50}
                autoComplete="nickname"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="room-password">Room password</Label>
              <Input
                id="room-password"
                className="mt-2"
                type="password"
                value={password}
                placeholder="Leave blank if none"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            {resuming ? (
              <p
                role="status"
                className="rounded-lg bg-primary/10 p-3 text-center text-sm text-foreground"
              >
                Returning you to the room as your saved player…
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                joining || resuming || code.length !== 6 || !displayName.trim()
              }
            >
              {resuming
                ? 'Opening saved room…'
                : joining
                  ? 'Joining…'
                  : 'Join room'}
              {!joining && !resuming ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Running the game?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-foreground underline"
            >
              Login as game master
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
