'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Black_Ops_One, Cinzel_Decorative, Pirata_One } from 'next/font/google';
import { useEffect, useState } from 'react';

const mysteryFont = Cinzel_Decorative({
  subsets: ['latin'],
  weight: '700',
});

const treasureFont = Pirata_One({
  subsets: ['latin'],
  weight: '400',
});

const escapeFont = Black_Ops_One({
  subsets: ['latin'],
  weight: '400',
});

const hooks = [
  {
    text: 'Mystery Night’s',
    className: mysteryFont.className,
    colorClassName: 'text-violet-700 dark:text-violet-300',
  },
  {
    text: 'Treasure Hunt’s',
    className: treasureFont.className,
    colorClassName: 'text-amber-700 dark:text-amber-300',
  },
  {
    text: 'Escape Room’s',
    className: escapeFont.className,
    colorClassName: 'text-blue-700 dark:text-blue-300',
  },
  {
    text: 'next adventure’s',
    className: '',
    colorClassName: 'text-emerald-700 dark:text-emerald-300',
  },
] as const;

const TYPE_DELAY = 85;
const DELETE_DELAY = 45;
const READ_DELAY = 1800;
const BETWEEN_HOOKS_DELAY = 250;

type AnimationPhase = 'typing' | 'deleting' | 'complete';

export function HeroHook() {
  const [hookIndex, setHookIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<AnimationPhase>('typing');
  const [isPaused, setIsPaused] = useState(false);

  const currentHook = hooks[hookIndex];

  useEffect(() => {
    if (isPaused || phase === 'complete') {
      return;
    }

    let delay = TYPE_DELAY;
    let nextStep: () => void;

    if (phase === 'typing' && displayedText.length < currentHook.text.length) {
      nextStep = () =>
        setDisplayedText(currentHook.text.slice(0, displayedText.length + 1));
    } else if (phase === 'typing' && hookIndex === hooks.length - 1) {
      delay = READ_DELAY;
      nextStep = () => setPhase('complete');
    } else if (phase === 'typing') {
      delay = READ_DELAY;
      nextStep = () => setPhase('deleting');
    } else if (displayedText.length > 0) {
      delay = DELETE_DELAY;
      nextStep = () => setDisplayedText(displayedText.slice(0, -1));
    } else {
      delay = BETWEEN_HOOKS_DELAY;
      nextStep = () => {
        setHookIndex((currentIndex) => currentIndex + 1);
        setPhase('typing');
      };
    }

    const timeout = window.setTimeout(nextStep, delay);
    return () => window.clearTimeout(timeout);
  }, [currentHook.text, displayedText, hookIndex, isPaused, phase]);

  const handleAnimationControl = () => {
    if (phase === 'complete') {
      setHookIndex(0);
      setDisplayedText('');
      setPhase('typing');
      setIsPaused(false);
      return;
    }

    setIsPaused((paused) => !paused);
  };

  const controlLabel =
    phase === 'complete'
      ? 'Replay heading animation'
      : isPaused
        ? 'Resume heading animation'
        : 'Pause heading animation';

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
        <span className="sr-only">
          Your digital game master for every adventure.
        </span>
        <span aria-hidden="true">
          <span className="block">
            Your{' '}
            <span className="motion-reduce:hidden">
              <span
                className={cn(
                  'tracking-normal',
                  currentHook.className,
                  currentHook.colorClassName
                )}
              >
                {displayedText}
              </span>
              {phase !== 'complete' && (
                <span className="ml-1 inline-block h-[0.8em] w-[0.06em] translate-y-[0.04em] bg-current" />
              )}
            </span>
            <span className="hidden text-emerald-700 motion-reduce:inline dark:text-emerald-300">
              next adventure’s
            </span>
          </span>
          <span className="block">digital game master.</span>
        </span>
      </h1>

      <Button
        type="button"
        size="sm"
        variant="tertiary"
        className="mt-6 text-muted-foreground motion-reduce:hidden"
        aria-pressed={phase === 'complete' ? undefined : isPaused}
        onClick={handleAnimationControl}
      >
        {phase === 'complete' ? (
          <RotateCcw aria-hidden="true" />
        ) : isPaused ? (
          <Play aria-hidden="true" />
        ) : (
          <Pause aria-hidden="true" />
        )}
        {controlLabel}
      </Button>
    </div>
  );
}
