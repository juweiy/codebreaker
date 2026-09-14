'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Link2 } from 'lucide-react';
import { writeToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type CopyTarget = 'link' | 'code';
type CopyState = CopyTarget | 'error' | null;

export function RoomShareActions({
  code,
  roomName,
  className,
}: {
  code: string;
  roomName: string;
  className?: string;
}) {
  const [copyState, setCopyState] = useState<CopyState>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    },
    []
  );

  async function copy(value: CopyTarget) {
    const text =
      value === 'code'
        ? code
        : `${window.location.origin}/join?room=${encodeURIComponent(code)}`;
    try {
      await writeToClipboard(text);
      setCopyState(value);
    } catch {
      setCopyState('error');
    }
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setCopyState(null), 2000);
  }

  const copiedLabel =
    copyState === 'code'
      ? 'Room code copied'
      : copyState === 'link'
        ? 'Room link copied'
        : copyState === 'error'
          ? 'Could not access the clipboard'
          : null;

  return (
    <div className={cn('flex shrink-0', className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="rounded-r-none"
        aria-label={copiedLabel ?? `Copy room link for ${roomName}`}
        title={copiedLabel ?? 'Copy room link'}
        onClick={() => void copy('link')}
      >
        {copyState === 'link' || copyState === 'code' ? (
          <Check className="text-emerald-600" aria-hidden="true" />
        ) : (
          <Link2 aria-hidden="true" />
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="-ml-px w-8 rounded-l-none px-0"
            aria-label={`More copy options for ${roomName}`}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Share room</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => void copy('link')}>
            <Link2 aria-hidden="true" /> Copy room link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copy('code')}>
            <Copy aria-hidden="true" /> Copy room code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="sr-only" role="status" aria-live="polite">
        {copiedLabel}
      </span>
    </div>
  );
}
