import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/string-utils';
import { cn } from '@/lib/utils';

export function AppLogo({
  className,
  href = '/',
  compactUntilSmall = false,
}: {
  className?: string;
  href?: string;
  compactUntilSmall?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg font-semibold',
        className
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <KeyRound className="size-4" aria-hidden="true" />
      </span>
      <span
        className={cn(
          compactUntilSmall ? 'sr-only sm:not-sr-only' : 'max-[379px]:sr-only'
        )}
      >
        {APP_NAME}
      </span>
    </Link>
  );
}
