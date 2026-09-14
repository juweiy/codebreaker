'use client';

import { LoaderCircle, Send } from 'lucide-react';
import type { PlayerPuzzle as PlayerPuzzleData } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlayerOrderingAnswer } from '@/components/room/player-ordering-answer';

export function PlayerPuzzle({
  puzzle,
  stepLabel,
  answer,
  feedback,
  incorrect,
  submitting,
  onAnswerChange,
  onSubmit,
}: {
  puzzle: PlayerPuzzleData;
  stepLabel: string;
  answer: string;
  feedback: string;
  incorrect: boolean;
  submitting: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Card
      aria-busy={submitting}
      className={cn(
        'overflow-hidden transition-colors',
        submitting && 'border-primary/50 shadow-lg shadow-primary/5',
        incorrect && 'puzzle-answer-error'
      )}
    >
      <CardHeader className="border-b bg-muted/20 px-6 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {stepLabel}
        </p>
        <CardTitle className="mt-2 text-2xl sm:text-3xl">
          {puzzle.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <p className="whitespace-pre-wrap text-lg leading-8 sm:text-xl sm:leading-9">
          {puzzle.clue}
        </p>
        {puzzle.description ? (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">
            {puzzle.description}
          </p>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          {puzzle.answerType === 'ordering' ? (
            <PlayerOrderingAnswer
              answer={answer}
              initialItems={puzzle.orderingItems ?? []}
              disabled={submitting}
              onAnswerChange={onAnswerChange}
            />
          ) : (
            <Input
              type={puzzle.answerType === 'number' ? 'number' : 'text'}
              inputMode={puzzle.answerType === 'number' ? 'numeric' : 'text'}
              placeholder="Enter your answer"
              aria-label={`Answer for ${puzzle.title}`}
              value={answer}
              required
              autoComplete="off"
              onChange={(event) => onAnswerChange(event.target.value)}
            />
          )}
          <Button
            type="submit"
            className={
              puzzle.answerType === 'ordering' ? 'w-full sm:w-auto' : ''
            }
            disabled={submitting}
          >
            {submitting ? (
              <LoaderCircle
                className="motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send aria-hidden="true" />
            )}
            {submitting ? 'Checking…' : 'Submit answer'}
          </Button>
        </form>

        {submitting ? (
          <div
            className="mt-4 h-1 overflow-hidden rounded-full bg-primary/10"
            aria-hidden="true"
          >
            <div className="puzzle-check-progress h-full w-1/3 rounded-full bg-primary" />
          </div>
        ) : null}

        {feedback ? (
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'mt-3 text-sm',
              feedback.startsWith('Correct')
                ? 'text-emerald-600 dark:text-emerald-400'
                : feedback.startsWith('Checking')
                  ? 'text-muted-foreground'
                  : 'text-destructive',
              feedback.startsWith('Incorrect') && 'sr-only'
            )}
          >
            {feedback}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
