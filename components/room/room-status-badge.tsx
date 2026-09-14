import type { RoomStatus } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const labels: Record<RoomStatus, string> = {
  waiting: 'Waiting',
  in_progress: 'Live',
  paused: 'Paused',
  finished: 'Ended',
};

const styles: Record<RoomStatus, string> = {
  waiting:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  in_progress:
    'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  paused:
    'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  finished:
    'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

export function RoomStatusBadge({
  status,
  className,
}: {
  status: RoomStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(styles[status], className)}>
      {status === 'in_progress' ? (
        <span
          className="mr-1.5 size-1.5 rounded-full bg-current motion-safe:animate-pulse"
          aria-hidden="true"
        />
      ) : null}
      {labels[status]}
    </Badge>
  );
}
