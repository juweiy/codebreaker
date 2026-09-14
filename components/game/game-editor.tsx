'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GripVertical,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import type {
  AnswerType,
  Game,
  GameMode,
  GameRoom,
  Puzzle,
} from '@/lib/domain/types';
import { isRoomUnfinished, parseOrderingAnswer } from '@/lib/domain/game-rules';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { GameStatusActions } from '@/components/game/game-status-actions';
import { GameStatusBadge } from '@/components/game/game-status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PuzzleDraft = {
  title: string;
  clue: string;
  description: string;
  answerType: AnswerType;
  answer: string;
};

const emptyPuzzle: PuzzleDraft = {
  title: '',
  clue: '',
  description: '',
  answerType: 'text',
  answer: '',
};

function getOrderingDraftItems(answer: string): string[] {
  try {
    const parsed = JSON.parse(answer) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed.length >= 2
        ? parsed
        : [...parsed, ...Array(2 - parsed.length).fill('')];
    }
  } catch {
    // A new ordering puzzle starts with blank rows below.
  }
  return ['', ''];
}

function answerTypeLabel(answerType: AnswerType): string {
  if (answerType === 'ordering') return 'Ordering';
  if (answerType === 'number') return 'Number';
  return 'Text';
}

type GameBundle = {
  game: Game;
  puzzles: Puzzle[];
  rooms: GameRoom[];
};

function SortablePuzzleItem({
  puzzle,
  index,
  puzzleCount,
  showPosition,
  disabled,
  onMove,
  onEdit,
  onDelete,
}: {
  puzzle: Puzzle;
  index: number;
  puzzleCount: number;
  showPosition: boolean;
  disabled: boolean;
  onMove: (puzzle: Puzzle, direction: -1 | 1) => void;
  onEdit: (puzzle: Puzzle) => void;
  onDelete: (puzzle: Puzzle) => void;
}) {
  const dragDisabled = disabled || puzzleCount < 2;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: puzzle.id, disabled: dragDisabled });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        'relative flex gap-3 rounded-xl border bg-background p-4 transition-[border-color,box-shadow,opacity]',
        isDragging &&
          'border-primary/70 opacity-90 shadow-xl ring-2 ring-primary/20'
      )}
    >
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'touch-none cursor-grab text-muted-foreground active:cursor-grabbing',
            isDragging && 'bg-accent text-foreground'
          )}
          disabled={dragDisabled}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${puzzle.title} to reorder`}
          title="Drag to reorder"
        >
          <GripVertical aria-hidden="true" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showPosition ? (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
          ) : null}
          <h3 className="font-semibold">{puzzle.title}</h3>
          <Badge variant="outline">{answerTypeLabel(puzzle.answer_type)}</Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {puzzle.clue}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Move ${puzzle.title} up`}
          disabled={disabled || index === 0}
          onClick={() => onMove(puzzle, -1)}
        >
          ↑
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Move ${puzzle.title} down`}
          disabled={disabled || index === puzzleCount - 1}
          onClick={() => onMove(puzzle, 1)}
        >
          ↓
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Edit ${puzzle.title}`}
          disabled={disabled}
          onClick={() => onEdit(puzzle)}
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-destructive"
          aria-label={`Delete ${puzzle.title}`}
          disabled={disabled}
          onClick={() => onDelete(puzzle)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export function GameEditor({ gameId }: { gameId: string }) {
  const router = useRouter();
  const puzzleSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [game, setGame] = useState<Game | null>(null);
  const [savedGame, setSavedGame] = useState<Game | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingGame, setSavingGame] = useState(false);
  const [showPuzzleForm, setShowPuzzleForm] = useState(false);
  const [editingPuzzleId, setEditingPuzzleId] = useState<string | null>(null);
  const [puzzleDraft, setPuzzleDraft] = useState<PuzzleDraft>(emptyPuzzle);
  const [puzzlesDirty, setPuzzlesDirty] = useState(false);
  const [savingPuzzles, setSavingPuzzles] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );
  const gameDetailsDirty = Boolean(
    game &&
      savedGame &&
      (game.title !== savedGame.title ||
        game.description !== savedGame.description ||
        game.final_message !== savedGame.final_message ||
        game.timeout_message !== savedGame.timeout_message ||
        game.mode !== savedGame.mode)
  );
  const hasUnsavedChanges = gameDetailsDirty || puzzlesDirty;

  const loadGame = useCallback(async () => {
    try {
      const bundle = await apiFetch<GameBundle>(`/api/games/${gameId}`);
      setGame(bundle.game);
      setSavedGame(bundle.game);
      setPuzzles(bundle.puzzles);
      setRooms(bundle.rooms);
      setPuzzlesDirty(false);
      setError(null);
    } catch (queryError) {
      setError(
        queryError instanceof Error ? queryError.message : 'Could not load game'
      );
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadGame(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadGame]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!pendingNavigation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingNavigation(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [pendingNavigation]);

  function guardNavigation(
    event: React.MouseEvent<HTMLAnchorElement>,
    destination: string
  ) {
    if (
      !hasUnsavedChanges ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setPendingNavigation(destination);
  }

  function leaveWithoutSaving() {
    if (!pendingNavigation) return;
    const destination = pendingNavigation;
    setPendingNavigation(null);
    setSavedGame(game);
    setPuzzlesDirty(false);
    router.push(destination);
  }

  async function saveChanges(event: React.FormEvent) {
    event.preventDefault();
    if (!game) return;
    if (!hasUnsavedChanges) return;
    if (rooms.some((room) => isRoomUnfinished(room.status))) {
      setError('Finish all open rooms before editing this game.');
      return;
    }
    if (showPuzzleForm) {
      setError('Apply or cancel the open puzzle edit before saving.');
      return;
    }
    setSavingGame(true);
    setSavingPuzzles(puzzlesDirty);
    setError(null);
    try {
      const updated = await apiFetch<Game>(`/api/games/${game.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: game.title.trim(),
          description: game.description.trim(),
          finalMessage: game.final_message.trim(),
          timeoutMessage: game.timeout_message.trim(),
          mode: game.mode,
          status: game.status,
        }),
      });
      setGame(updated);
      setSavedGame(updated);

      if (puzzlesDirty) {
        const saved = await apiFetch<Puzzle[]>(
          `/api/games/${gameId}/puzzles/batch`,
          {
            method: 'PUT',
            body: JSON.stringify({
              puzzles: puzzles.map((puzzle) => ({
                id: puzzle.id,
                title: puzzle.title,
                clue: puzzle.clue,
                description: puzzle.description,
                answerType: puzzle.answer_type,
                answer: puzzle.answer_normalized,
              })),
            }),
          }
        );
        setPuzzles(saved);
        setPuzzlesDirty(false);
      }

      setNotice('Changes saved');
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not save changes'
      );
    } finally {
      setSavingGame(false);
      setSavingPuzzles(false);
    }
  }

  function beginPuzzleEdit(puzzle?: Puzzle) {
    if (rooms.some((room) => isRoomUnfinished(room.status))) return;
    setError(null);
    setEditingPuzzleId(puzzle?.id ?? null);
    setPuzzleDraft(
      puzzle
        ? {
            title: puzzle.title,
            clue: puzzle.clue,
            description: puzzle.description,
            answerType: puzzle.answer_type,
            answer: puzzle.answer_normalized,
          }
        : emptyPuzzle
    );
    setShowPuzzleForm(true);
  }

  function applyPuzzleDraft(event: React.FormEvent) {
    event.preventDefault();
    if (rooms.some((room) => isRoomUnfinished(room.status))) return;
    setError(null);
    let normalizedDraftAnswer = puzzleDraft.answer;
    if (puzzleDraft.answerType === 'ordering') {
      try {
        normalizedDraftAnswer = JSON.stringify(
          parseOrderingAnswer(puzzleDraft.answer)
        );
      } catch (orderingError) {
        setError(
          orderingError instanceof Error
            ? orderingError.message
            : 'Check the ordering items and try again.'
        );
        return;
      }
    }
    const updatedAt = new Date().toISOString();
    const wasEditing = Boolean(editingPuzzleId);
    setPuzzles((current) => {
      if (editingPuzzleId) {
        return current.map((puzzle) =>
          puzzle.id === editingPuzzleId
            ? {
                ...puzzle,
                title: puzzleDraft.title.trim(),
                clue: puzzleDraft.clue.trim(),
                description: puzzleDraft.description.trim(),
                answer_type: puzzleDraft.answerType,
                answer_normalized: normalizedDraftAnswer,
                updated_at: updatedAt,
              }
            : puzzle
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          game_id: gameId,
          position: current.length + 1,
          title: puzzleDraft.title.trim(),
          clue: puzzleDraft.clue.trim(),
          description: puzzleDraft.description.trim(),
          answer_type: puzzleDraft.answerType,
          answer_normalized: normalizedDraftAnswer,
          created_at: updatedAt,
          updated_at: updatedAt,
        },
      ];
    });
    setPuzzlesDirty(true);
    setShowPuzzleForm(false);
    setEditingPuzzleId(null);
    setPuzzleDraft(emptyPuzzle);
    setNotice(
      `${wasEditing ? 'Puzzle updated' : 'Puzzle added'} locally. Save changes to persist it.`
    );
  }

  function deletePuzzle(puzzle: Puzzle) {
    if (rooms.some((room) => isRoomUnfinished(room.status))) return;
    if (!window.confirm(`Remove “${puzzle.title}” from this puzzle draft?`))
      return;
    setPuzzles((current) =>
      current
        .filter((item) => item.id !== puzzle.id)
        .map((item, index) => ({ ...item, position: index + 1 }))
    );
    setPuzzlesDirty(true);
    setNotice('Puzzle removed locally. Save changes to persist it.');
  }

  function movePuzzle(puzzle: Puzzle, direction: -1 | 1) {
    if (rooms.some((room) => isRoomUnfinished(room.status))) return;
    setPuzzles((current) => {
      const from = current.findIndex((item) => item.id === puzzle.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const reordered = [...current];
      [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
      return reordered.map((item, index) => ({
        ...item,
        position: index + 1,
      }));
    });
    setPuzzlesDirty(true);
    setNotice('Puzzle order updated locally. Save changes to persist it.');
  }

  function finishPuzzleDrag({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    if (
      savingGame ||
      savingPuzzles ||
      rooms.some((room) => isRoomUnfinished(room.status))
    ) {
      return;
    }

    const from = puzzles.findIndex((puzzle) => puzzle.id === active.id);
    const to = puzzles.findIndex((puzzle) => puzzle.id === over.id);
    if (from < 0 || to < 0) return;

    setPuzzles(
      arrayMove(puzzles, from, to).map((puzzle, index) => ({
        ...puzzle,
        position: index + 1,
      }))
    );
    setPuzzlesDirty(true);
    setNotice('Puzzle order updated locally. Save changes to persist it.');
  }

  async function deleteGame() {
    if (rooms.some((room) => isRoomUnfinished(room.status))) {
      setError('Finish all open rooms before deleting this game.');
      return;
    }
    if (
      !game ||
      !window.confirm(`Delete “${game.title}” and all of its rooms?`)
    )
      return;
    try {
      await apiFetch<void>(`/api/games/${game.id}`, { method: 'DELETE' });
      router.push('/dashboard');
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete game'
      );
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-muted/20">
        <p className="animate-pulse text-muted-foreground">Loading game…</p>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="page-shell py-20">
        <Card className="border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Could not open this game</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!game) return null;

  const savingChanges = savingGame || savingPuzzles;
  const openRoomCount = rooms.filter((room) =>
    isRoomUnfinished(room.status)
  ).length;
  const editingLocked = openRoomCount > 0;

  return (
    <main className="min-h-svh bg-muted/20">
      <div className="page-shell py-8 lg:py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
            <Link
              href="/dashboard"
              onClick={(event) => guardNavigation(event, '/dashboard')}
            >
              <ArrowLeft aria-hidden="true" /> Games
            </Link>
          </Button>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Game builder
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {game.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {game.status === 'archived' ? (
                <GameStatusBadge status={game.status} />
              ) : null}
              {hasUnsavedChanges ? (
                <Badge variant="secondary">Unsaved changes</Badge>
              ) : null}
              <Button
                type="submit"
                form="game-details-form"
                disabled={
                  !hasUnsavedChanges ||
                  editingLocked ||
                  savingChanges ||
                  showPuzzleForm
                }
                title={
                  editingLocked
                    ? 'Finish all open rooms before editing this game'
                    : showPuzzleForm
                      ? 'Apply or cancel the open puzzle edit first'
                      : !hasUnsavedChanges
                        ? 'No changes to save'
                        : undefined
                }
              >
                <Save aria-hidden="true" />
                {savingChanges ? 'Saving…' : 'Save changes'}
              </Button>
              <GameStatusActions
                game={game}
                disabled={savingChanges}
                onStatusChange={(updated) => {
                  setGame((current) =>
                    current
                      ? {
                          ...current,
                          status: updated.status,
                          updated_at: updated.updated_at,
                        }
                      : current
                  );
                  setNotice(`Game status changed to ${updated.status}`);
                }}
              />
            </div>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            role="status"
            className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300"
          >
            {notice}
          </div>
        ) : null}

        {editingLocked ? (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <LockKeyhole
                  className="mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-semibold">
                    Editing is locked while{' '}
                    {openRoomCount === 1 ? 'a room is' : 'rooms are'} open
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-100/80">
                    {openRoomCount}{' '}
                    {openRoomCount === 1 ? 'room is' : 'rooms are'} waiting,
                    running, or paused. Finish{' '}
                    {openRoomCount === 1 ? 'it' : 'them'} before changing game
                    details or puzzles.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="shrink-0 bg-background"
              >
                <Link href={`/game/${game.id}/rooms`}>Manage rooms</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-4xl">
          <div className="space-y-6">
            <Card>
              <form id="game-details-form" onSubmit={saveChanges}>
                <CardHeader>
                  <CardTitle>Game details</CardTitle>
                  <CardDescription className="mt-2">
                    Set the story and the messages players see when the game
                    ends.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="game-title">Title</Label>
                    <Input
                      id="game-title"
                      className="mt-2"
                      value={game.title}
                      maxLength={100}
                      required
                      disabled={editingLocked || savingChanges}
                      onChange={(event) =>
                        setGame({ ...game, title: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="game-description">Description</Label>
                    <textarea
                      id="game-description"
                      rows={4}
                      maxLength={1000}
                      className="focus-ring mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={game.description}
                      disabled={editingLocked || savingChanges}
                      onChange={(event) =>
                        setGame({ ...game, description: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="game-final-message">Success message</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Shown on the completion screen after every puzzle is
                      solved.
                    </p>
                    <textarea
                      id="game-final-message"
                      rows={3}
                      maxLength={2000}
                      required
                      className="focus-ring mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={game.final_message}
                      disabled={editingLocked || savingChanges}
                      onChange={(event) =>
                        setGame({
                          ...game,
                          final_message: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="game-timeout-message">
                      Time-up message
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Shown if a room&apos;s timer expires before every puzzle
                      is solved.
                    </p>
                    <textarea
                      id="game-timeout-message"
                      rows={3}
                      maxLength={2000}
                      required
                      className="focus-ring mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={game.timeout_message}
                      disabled={editingLocked || savingChanges}
                      onChange={(event) =>
                        setGame({
                          ...game,
                          timeout_message: event.target.value,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Puzzles</CardTitle>
                <CardDescription className="mt-2">
                  Choose how puzzles unlock, then add and arrange them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-sm">
                  <Label htmlFor="game-mode">Puzzle order</Label>
                  <select
                    id="game-mode"
                    className="focus-ring mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={game.mode}
                    disabled={editingLocked || savingChanges}
                    onChange={(event) =>
                      setGame({
                        ...game,
                        mode: event.target.value as GameMode,
                      })
                    }
                  >
                    <option value="sequential">Sequential</option>
                    <option value="any">Any order</option>
                  </select>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {game.mode === 'sequential'
                      ? 'Players unlock these from top to bottom.'
                      : 'Players may choose any puzzle.'}
                  </p>
                </div>

                {showPuzzleForm ? (
                  <form
                    onSubmit={applyPuzzleDraft}
                    className="space-y-4 rounded-xl border bg-muted/30 p-4"
                  >
                    <h3 className="font-semibold">
                      {editingPuzzleId ? 'Edit puzzle' : 'New puzzle'}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="puzzle-title">Title</Label>
                        <Input
                          id="puzzle-title"
                          className="mt-2"
                          value={puzzleDraft.title}
                          required
                          maxLength={100}
                          onChange={(event) =>
                            setPuzzleDraft({
                              ...puzzleDraft,
                              title: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="answer-type">Answer type</Label>
                        <select
                          id="answer-type"
                          className="focus-ring mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={puzzleDraft.answerType}
                          onChange={(event) =>
                            setPuzzleDraft({
                              ...puzzleDraft,
                              answerType: event.target.value as AnswerType,
                              answer:
                                event.target.value === 'ordering'
                                  ? JSON.stringify(['', ''])
                                  : '',
                            })
                          }
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="ordering">Order a list</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="puzzle-clue">Question or clue</Label>
                      <textarea
                        id="puzzle-clue"
                        className="focus-ring mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={4}
                        required
                        maxLength={2000}
                        value={puzzleDraft.clue}
                        onChange={(event) =>
                          setPuzzleDraft({
                            ...puzzleDraft,
                            clue: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="puzzle-description">
                        Additional description (optional)
                      </Label>
                      <textarea
                        id="puzzle-description"
                        className="focus-ring mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={2}
                        maxLength={2000}
                        value={puzzleDraft.description}
                        onChange={(event) =>
                          setPuzzleDraft({
                            ...puzzleDraft,
                            description: event.target.value,
                          })
                        }
                      />
                    </div>
                    {puzzleDraft.answerType === 'ordering' ? (
                      <div>
                        <Label>Correct order</Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Enter the items in the order players must arrange
                          them.
                        </p>
                        <div className="mt-3 space-y-2">
                          {getOrderingDraftItems(puzzleDraft.answer).map(
                            (item, index, items) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className="w-6 text-center text-sm font-medium text-muted-foreground"
                                  aria-hidden="true"
                                >
                                  {index + 1}
                                </span>
                                <Input
                                  value={item}
                                  required
                                  maxLength={120}
                                  aria-label={`Correct order item ${index + 1}`}
                                  onChange={(event) => {
                                    const nextItems = [...items];
                                    nextItems[index] = event.target.value;
                                    setPuzzleDraft({
                                      ...puzzleDraft,
                                      answer: JSON.stringify(nextItems),
                                    });
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={index === 0}
                                  aria-label={`Move item ${index + 1} up`}
                                  onClick={() => {
                                    setPuzzleDraft({
                                      ...puzzleDraft,
                                      answer: JSON.stringify(
                                        arrayMove(items, index, index - 1)
                                      ),
                                    });
                                  }}
                                >
                                  <ArrowUp aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={index === items.length - 1}
                                  aria-label={`Move item ${index + 1} down`}
                                  onClick={() => {
                                    setPuzzleDraft({
                                      ...puzzleDraft,
                                      answer: JSON.stringify(
                                        arrayMove(items, index, index + 1)
                                      ),
                                    });
                                  }}
                                >
                                  <ArrowDown aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={items.length <= 2}
                                  aria-label={`Remove item ${index + 1}`}
                                  onClick={() => {
                                    setPuzzleDraft({
                                      ...puzzleDraft,
                                      answer: JSON.stringify(
                                        items.filter(
                                          (_orderingItem, itemIndex) =>
                                            itemIndex !== index
                                        )
                                      ),
                                    });
                                  }}
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3"
                          disabled={
                            getOrderingDraftItems(puzzleDraft.answer).length >=
                            30
                          }
                          onClick={() =>
                            setPuzzleDraft({
                              ...puzzleDraft,
                              answer: JSON.stringify([
                                ...getOrderingDraftItems(puzzleDraft.answer),
                                '',
                              ]),
                            })
                          }
                        >
                          <Plus aria-hidden="true" />
                          Add item
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="puzzle-answer">Correct answer</Label>
                        <Input
                          id="puzzle-answer"
                          className="mt-2"
                          type={
                            puzzleDraft.answerType === 'number'
                              ? 'number'
                              : 'text'
                          }
                          value={puzzleDraft.answer}
                          required
                          onChange={(event) =>
                            setPuzzleDraft({
                              ...puzzleDraft,
                              answer: event.target.value,
                            })
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Text answers ignore capitalization and extra spaces.
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={savingChanges}
                        onClick={() => setShowPuzzleForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingChanges}>
                        Apply puzzle
                      </Button>
                    </div>
                  </form>
                ) : null}

                {puzzles.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <KeyRound className="mx-auto size-7 text-muted-foreground" />
                    <p className="mt-3 font-medium">No puzzles yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A game needs at least one puzzle before you can create a
                      room.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Drag a puzzle by its handle to reorder it. Keyboard users
                      can focus the handle and press Space, then use the arrow
                      keys. Press Space again to drop it or Escape to cancel.
                    </p>
                    <DndContext
                      sensors={puzzleSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={finishPuzzleDrag}
                      accessibility={{
                        screenReaderInstructions: {
                          draggable:
                            'To reorder a puzzle, press Space to pick it up, use the arrow keys to move it, then press Space again to drop it. Press Escape to cancel.',
                        },
                        announcements: {
                          onDragStart({ active }) {
                            const index = puzzles.findIndex(
                              (puzzle) => puzzle.id === active.id
                            );
                            return `Picked up ${puzzles[index]?.title ?? 'puzzle'}, position ${index + 1} of ${puzzles.length}.`;
                          },
                          onDragOver({ active, over }) {
                            if (!over) return;
                            const title = puzzles.find(
                              (puzzle) => puzzle.id === active.id
                            )?.title;
                            const index = puzzles.findIndex(
                              (puzzle) => puzzle.id === over.id
                            );
                            return `${title ?? 'Puzzle'} is now over position ${index + 1} of ${puzzles.length}.`;
                          },
                          onDragEnd({ active, over }) {
                            const title = puzzles.find(
                              (puzzle) => puzzle.id === active.id
                            )?.title;
                            if (!over) {
                              return `${title ?? 'Puzzle'} was not moved.`;
                            }
                            const index = puzzles.findIndex(
                              (puzzle) => puzzle.id === over.id
                            );
                            return `Dropped ${title ?? 'puzzle'} at position ${index + 1} of ${puzzles.length}.`;
                          },
                          onDragCancel({ active }) {
                            const title = puzzles.find(
                              (puzzle) => puzzle.id === active.id
                            )?.title;
                            return `Reordering ${title ?? 'puzzle'} was cancelled.`;
                          },
                        },
                      }}
                    >
                      <SortableContext
                        items={puzzles.map((puzzle) => puzzle.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ol className="space-y-3" aria-label="Puzzle order">
                          {puzzles.map((puzzle, index) => (
                            <SortablePuzzleItem
                              key={puzzle.id}
                              puzzle={puzzle}
                              index={index}
                              puzzleCount={puzzles.length}
                              showPosition={game.mode === 'sequential'}
                              disabled={editingLocked || savingChanges}
                              onMove={movePuzzle}
                              onEdit={beginPuzzleEdit}
                              onDelete={deletePuzzle}
                            />
                          ))}
                        </ol>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                <Button
                  type="button"
                  size="lg"
                  className="min-h-16 w-full text-base [&_svg]:size-5"
                  disabled={editingLocked || savingChanges || showPuzzleForm}
                  title={
                    editingLocked
                      ? 'Finish all open rooms before editing puzzles'
                      : showPuzzleForm
                        ? 'Apply or cancel the open puzzle first'
                        : undefined
                  }
                  onClick={() => beginPuzzleEdit()}
                >
                  <Plus aria-hidden="true" /> Add puzzle
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base">Danger zone</CardTitle>
                <CardDescription>
                  Deleting a game also deletes every room and result.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  disabled={editingLocked}
                  title={
                    editingLocked
                      ? 'Finish all open rooms before deleting this game'
                      : undefined
                  }
                  onClick={() => void deleteGame()}
                >
                  <Trash2 aria-hidden="true" /> Delete game
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {pendingNavigation ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/75 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            aria-describedby="unsaved-changes-description"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
          >
            <h2 id="unsaved-changes-title" className="text-xl font-semibold">
              Leave without saving?
            </h2>
            <p
              id="unsaved-changes-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              Your unsaved game or puzzle changes are only stored on this page
              and will be lost if you leave now.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                autoFocus
                onClick={() => setPendingNavigation(null)}
              >
                Stay on page
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={leaveWithoutSaving}
              >
                Leave without saving
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
