'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  EyeOff,
  Gamepad2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { Game } from '@/lib/domain/types';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GameCardActions } from '@/components/game/game-card-actions';
import { GameStatusBadge } from '@/components/game/game-status-badge';

type DashboardGame = Game & {
  puzzles: { count: number }[];
  game_rooms: { count: number }[];
};

function DashboardGameCard({
  game,
  onStatusChange,
}: {
  game: DashboardGame;
  onStatusChange: (updated: Game) => void;
}) {
  return (
    <Card className="group h-full transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-6">
        <Link
          href={`/game/${game.id}`}
          className="focus-ring -m-2 flex flex-1 flex-col rounded-lg p-2"
        >
          <div className="flex items-start justify-between gap-4">
            {game.status === 'archived' ? (
              <GameStatusBadge status={game.status} />
            ) : null}
            <ArrowRight
              className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
          <h2 className="mt-6 text-xl font-semibold">{game.title}</h2>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
            {game.description || 'No description yet.'}
          </p>
          <div className="mt-6 flex gap-4 border-t pt-4 text-sm text-muted-foreground">
            <span>{game.puzzles?.[0]?.count ?? 0} puzzles</span>
            <span>{game.game_rooms?.[0]?.count ?? 0} rooms</span>
            <span className="ml-auto capitalize">{game.mode}</span>
          </div>
        </Link>
        <div className="mt-5 border-t pt-4">
          <GameCardActions game={game} onStatusChange={onStatusChange} />
        </div>
      </CardContent>
    </Card>
  );
}

function GameGrid({
  games,
  onStatusChange,
}: {
  games: DashboardGame[];
  onStatusChange: (updated: Game) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {games.map((game) => (
        <DashboardGameCard
          key={game.id}
          game={game}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

export function DashboardGames() {
  const [games, setGames] = useState<DashboardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGames(await apiFetch<DashboardGame[]>('/api/games'));
    } catch (queryError) {
      setError(
        queryError instanceof Error
          ? queryError.message
          : 'Could not load games'
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadGames(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadGames]);

  const activeGames = games.filter((game) => game.status === 'active');
  const archivedGames = games.filter((game) => game.status === 'archived');

  const updateGameStatus = (updated: Game) => {
    setGames((current) =>
      current.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              status: updated.status,
              updated_at: updated.updated_at,
            }
          : item
      )
    );
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Game master
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            My games
          </h1>
          <p className="mt-2 text-muted-foreground">
            Design your puzzles, launch rooms, and watch teams progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {archivedGames.length > 0 ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              aria-expanded={showArchived}
              aria-controls="archived-games"
              onClick={() => setShowArchived((visible) => !visible)}
            >
              {showArchived ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              {showArchived
                ? 'Hide archived'
                : `View archived (${archivedGames.length})`}
            </Button>
          ) : null}
          <Button asChild size="lg">
            <Link href="/game/new">
              <Plus aria-hidden="true" /> Create game
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="mt-8 border-destructive/40">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <div>
              <h2 className="font-semibold">Could not load your games</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              {error.toLowerCase().includes('not configured') ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Add the Neon environment values and run the database
                  migration, then try again.
                </p>
              ) : null}
            </div>
            <Button variant="outline" onClick={() => void loadGames()}>
              <RefreshCw aria-hidden="true" /> Try again
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              className="h-52 animate-pulse rounded-xl border bg-muted"
              key={item}
            />
          ))}
        </div>
      ) : games.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-muted">
              <Gamepad2 className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold">
              Build your first game
            </h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Start with a title and game mode, then add the puzzles your team
              will discover in the real world.
            </p>
            <Button asChild className="mt-6">
              <Link href="/game/new">Create a game</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8">
          {activeGames.length > 0 ? (
            <GameGrid games={activeGames} onStatusChange={updateGameStatus} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
                <Archive
                  className="size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-xl font-semibold">No active games</h2>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Restore an archived game or create a new one to start a room.
                </p>
              </CardContent>
            </Card>
          )}

          {showArchived && archivedGames.length > 0 ? (
            <section
              id="archived-games"
              className="mt-10 border-t pt-8"
              aria-labelledby="archived-games-heading"
            >
              <div className="mb-5">
                <h2
                  id="archived-games-heading"
                  className="text-2xl font-semibold tracking-tight"
                >
                  Archived games
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Restore a game to return it to your active list.
                </p>
              </div>
              <GameGrid
                games={archivedGames}
                onStatusChange={updateGameStatus}
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
