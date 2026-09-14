'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, KeyRound } from 'lucide-react';
import type { GameMode, PlayerPuzzle } from '@/lib/domain/types';
import {
  getAvailablePlayerPuzzles,
  selectPlayerPuzzle,
} from '@/lib/domain/game-rules';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayerPuzzle as PlayerPuzzleScreen } from '@/components/room/player-puzzle';

export function PuzzleWizard({
  mode,
  puzzles,
  answers,
  feedback,
  incorrectPuzzles,
  submittingPuzzleId,
  onAnswerChange,
  onSubmit,
}: {
  mode: GameMode;
  puzzles: PlayerPuzzle[];
  answers: Record<string, string>;
  feedback: Record<string, string>;
  incorrectPuzzles: Record<string, boolean>;
  submittingPuzzleId: string | null;
  onAnswerChange: (puzzleId: string, value: string) => void;
  onSubmit: (puzzle: PlayerPuzzle, event: React.FormEvent) => void;
}) {
  const availablePuzzles = useMemo(
    () => getAvailablePlayerPuzzles(puzzles),
    [puzzles]
  );
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);

  const currentPuzzle = selectPlayerPuzzle(
    mode,
    availablePuzzles,
    selectedPuzzleId
  );

  if (mode === 'any' && !currentPuzzle && availablePuzzles.length > 0) {
    return (
      <section className="mt-8" aria-labelledby="puzzle-board-title">
        <div className="mb-5">
          <h2 id="puzzle-board-title" className="text-2xl font-bold">
            Puzzles
          </h2>
          <p className="mt-1 text-muted-foreground">
            Choose any puzzle to open it.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {puzzles.map((puzzle) => {
            const isSolved = puzzle.solved;
            return (
              <button
                key={puzzle.id}
                type="button"
                disabled={isSolved || !puzzle.unlocked}
                className="focus-ring group min-h-44 rounded-xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-sm"
                onClick={() => setSelectedPuzzleId(puzzle.id)}
                aria-label={
                  isSolved ? `${puzzle.title}, solved` : `Open ${puzzle.title}`
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-disabled:group-hover:bg-muted group-disabled:group-hover:text-muted-foreground">
                    {isSolved ? (
                      <Check className="size-5" aria-hidden="true" />
                    ) : (
                      <KeyRound className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  {isSolved ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      Solved
                    </Badge>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Puzzle {puzzle.position}
                    </span>
                  )}
                </div>
                <h3 className="mt-7 text-xl font-semibold">{puzzle.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {isSolved ? 'Completed by your team.' : puzzle.clue}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (!currentPuzzle) {
    return (
      <Card className="mt-8 border-dashed">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold">Preparing the next puzzle</h2>
          <p className="mt-2 text-muted-foreground">
            Your team&apos;s progress is syncing now.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentIndex = puzzles.findIndex(
    (puzzle) => puzzle.id === currentPuzzle.id
  );
  const stepLabel =
    mode === 'sequential'
      ? `Puzzle ${currentIndex + 1} of ${puzzles.length}`
      : `${availablePuzzles.length} ${availablePuzzles.length === 1 ? 'puzzle' : 'puzzles'} remaining`;

  return (
    <section className="mt-8" aria-label="Puzzle wizard">
      {mode === 'any' ? (
        <div className="mb-4">
          <Button
            type="button"
            variant="ghost"
            className="-ml-3"
            onClick={() => setSelectedPuzzleId(null)}
          >
            <ArrowLeft aria-hidden="true" />
            All puzzles
          </Button>
        </div>
      ) : null}

      <PlayerPuzzleScreen
        key={currentPuzzle.id}
        puzzle={currentPuzzle}
        stepLabel={stepLabel}
        answer={answers[currentPuzzle.id] ?? ''}
        feedback={feedback[currentPuzzle.id] ?? ''}
        incorrect={Boolean(incorrectPuzzles[currentPuzzle.id])}
        submitting={submittingPuzzleId === currentPuzzle.id}
        onAnswerChange={(value) => onAnswerChange(currentPuzzle.id, value)}
        onSubmit={(event) => onSubmit(currentPuzzle, event)}
      />
    </section>
  );
}
