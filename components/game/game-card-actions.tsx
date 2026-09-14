'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArchiveRestore,
  DoorOpen,
  Ellipsis,
  Play,
} from 'lucide-react';
import type { Game, GameStatus } from '@/lib/domain/types';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function GameCardActions({
  game,
  onStatusChange,
}: {
  game: Game;
  onStatusChange: (updated: Game) => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState<GameStatus | null>(null);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusAction =
    game.status === 'archived'
      ? {
          label: 'Restore game',
          status: 'active' as const,
          icon: ArchiveRestore,
        }
      : {
          label: 'Archive',
          status: 'archived' as const,
          icon: Archive,
        };
  const StatusIcon = statusAction.icon;

  async function changeStatus(status: GameStatus) {
    setUpdatingStatus(status);
    setError(null);
    try {
      const updated = await apiFetch<Game>(`/api/games/${game.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onStatusChange(updated);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update game status'
      );
    } finally {
      setUpdatingStatus(null);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div
          className={cn(
            'grid gap-2',
            game.status === 'active'
              ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
              : 'grid-cols-[minmax(0,1fr)_auto]'
          )}
        >
          {game.status === 'active' ? (
            <Button
              asChild
              variant="primary"
              className="h-10 w-full min-w-0 px-3"
            >
              <Link href={`/game/${game.id}/rooms/new`}>
                <Play aria-hidden="true" />
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start room</span>
              </Link>
            </Button>
          ) : null}
          <Button
            asChild
            variant="secondary"
            className="h-10 w-full min-w-0 px-3"
          >
            <Link href={`/game/${game.id}/rooms`}>
              <DoorOpen aria-hidden="true" />
              <span className="sm:hidden">Manage</span>
              <span className="hidden sm:inline">Manage rooms</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-10 w-10"
                aria-label={`More actions for ${game.title}`}
              >
                <Ellipsis aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Game actions</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={updatingStatus !== null}
                onSelect={() => {
                  if (statusAction.status === 'archived') {
                    setArchiveConfirmationOpen(true);
                    return;
                  }
                  void changeStatus(statusAction.status);
                }}
              >
                <StatusIcon aria-hidden="true" />
                {updatingStatus === statusAction.status
                  ? 'Updating…'
                  : statusAction.label}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <ConfirmationDialog
        open={archiveConfirmationOpen}
        title="Archive this game?"
        description={`“${game.title}” will move to Archived. You can restore it later.`}
        confirmLabel="Archive game"
        onCancel={() => setArchiveConfirmationOpen(false)}
        onConfirm={() => {
          setArchiveConfirmationOpen(false);
          void changeStatus('archived');
        }}
      />
    </>
  );
}
