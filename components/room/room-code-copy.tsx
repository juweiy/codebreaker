'use client';

import { useEffect, useRef, useState } from 'react';
import { writeToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { IconTooltip } from '@/components/ui/icon-tooltip';

export function RoomCodeCopy({
  code,
  prefix,
  className,
}: {
  code: string;
  prefix?: string;
  className?: string;
}) {
  const [copyState, setCopyState] = useState<'copied' | 'error' | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    },
    []
  );

  async function copyCode() {
    try {
      await writeToClipboard(code);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }

    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setCopyState(null), 2000);
  }

  const tooltipLabel =
    copyState === 'copied'
      ? 'Copied!'
      : copyState === 'error'
        ? 'Could not copy'
        : 'Copy room code';

  return (
    <IconTooltip label={tooltipLabel}>
      <button
        type="button"
        className={cn(
          'focus-ring cursor-copy rounded-md font-mono underline-offset-4 hover:underline',
          className
        )}
        aria-label={`${tooltipLabel}: ${code}`}
        onClick={() => void copyCode()}
      >
        {prefix}
        {code}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copyState === 'copied'
          ? `Room code ${code} copied`
          : copyState === 'error'
            ? 'Could not copy the room code'
            : null}
      </span>
    </IconTooltip>
  );
}
