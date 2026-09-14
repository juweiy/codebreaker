import type { GameStatus } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusPresentation: Record<
  GameStatus,
  { label: string; className: string; dotClassName: string }
> = {
  active: {
    label: 'Active',
    className:
      'border-emerald-300 bg-emerald-100 text-emerald-950 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-100',
    dotClassName: 'bg-emerald-500',
  },
  archived: {
    label: 'Archived',
    className:
      'border-slate-300 bg-slate-100 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
    dotClassName: 'bg-slate-500',
  },
};

export function GameStatusBadge({
  status,
  className,
}: {
  status: GameStatus;
  className?: string;
}) {
  const presentation = statusPresentation[status];

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 px-3 py-1', presentation.className, className)}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', presentation.dotClassName)}
      />
      {presentation.label}
    </Badge>
  );
}
