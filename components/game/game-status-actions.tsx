'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, EllipsisVertical } from 'lucide-react';
import type { Game, GameStatus } from '@/lib/domain/types';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type StatusAction = {
  label: string;
  status: GameStatus;
  icon: typeof Archive;
};

const actionsByStatus: Record<GameStatus, StatusAction[]> = {
  active: [{ label: 'Archive', status: 'archived', icon: Archive }],
  archived: [
    {
      label: 'Restore game',
      status: 'active',
      icon: ArchiveRestore,
    },
  ],
};

export function GameStatusActions({
  game,
  onStatusChange,
  className,
  disabled = false,
}: {
  game: Game;
  onStatusChange: (updated: Game) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [updatingStatus, setUpdatingStatus] = useState<GameStatus | null>(null);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className={cn('space-y-2', className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={disabled || updatingStatus !== null}
              aria-label={`More actions for ${game.title}`}
              title="More game actions"
            >
              <EllipsisVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Game actions</DropdownMenuLabel>
            {actionsByStatus[game.status].map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.status}
                  disabled={updatingStatus !== null}
                  onSelect={() => {
                    if (action.status === 'archived') {
                      setArchiveConfirmationOpen(true);
                      return;
                    }
                    void changeStatus(action.status);
                  }}
                >
                  <Icon aria-hidden="true" />
                  {updatingStatus === action.status
                    ? 'Updating…'
                    : action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
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
