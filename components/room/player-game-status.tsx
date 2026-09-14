import Link from 'next/link';
import { CirclePause, Clock3, Flag, RotateCcw } from 'lucide-react';
import type { RoomStatus } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const statusContent = {
  waiting: {
    title: "You're in",
    description: 'Waiting for the game master to start the room.',
    icon: Clock3,
    className: 'border-yellow-500/40 bg-yellow-500/[.07]',
    iconClassName:
      'bg-yellow-500/15 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300',
  },
  paused: {
    title: 'Game paused',
    description:
      'Your answers are safe. The game master will resume the game shortly.',
    icon: CirclePause,
    className: 'border-blue-500/40 bg-blue-500/[.07]',
    iconClassName:
      'bg-blue-500/15 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  },
  finished: {
    title: 'This game has ended',
    description: 'The game master has closed this room.',
    icon: Flag,
    className: 'border-orange-500/40 bg-orange-500/[.07]',
    iconClassName:
      'bg-orange-500/15 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
  },
} satisfies Record<
  Exclude<RoomStatus, 'in_progress'>,
  {
    title: string;
    description: string;
    icon: typeof Clock3;
    className: string;
    iconClassName: string;
  }
>;

export function PlayerGameStatus({
  status,
}: {
  status: Exclude<RoomStatus, 'in_progress'>;
}) {
  const content = statusContent[status];
  const Icon = content.icon;

  return (
    <Card
      role="status"
      aria-live="polite"
      className={cn('mt-8', content.className)}
    >
      <CardContent className="p-8 text-center sm:p-12">
        <span
          className={cn(
            'mx-auto grid size-16 place-items-center rounded-full',
            content.iconClassName
          )}
        >
          <Icon className="size-8" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-semibold sm:text-2xl">
          {content.title}
        </h2>
        <p className="mt-2 text-muted-foreground">{content.description}</p>
        {status === 'finished' ? (
          <Button asChild size="lg" variant="primary" className="mt-6">
            <Link href="/join">
              <RotateCcw aria-hidden="true" /> Join another game
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
