'use client';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_FINAL_MESSAGE,
  DEFAULT_TIMEOUT_MESSAGE,
  type GameMode,
} from '@/lib/domain/types';
import { ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';

export function NewGameForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [finalMessage, setFinalMessage] = useState(DEFAULT_FINAL_MESSAGE);
  const [timeoutMessage, setTimeoutMessage] = useState(DEFAULT_TIMEOUT_MESSAGE);
  const [mode, setMode] = useState<GameMode>('sequential');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const createNewGame = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ id: string }>('/api/games', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          finalMessage: finalMessage.trim(),
          timeoutMessage: timeoutMessage.trim(),
          mode,
        }),
      });
      router.push(`/game/${data.id}`);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Could not create game'
      );
      setSaving(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-8">
          <CardTitle className="text-3xl">Create a New Game</CardTitle>
          <CardDescription>You can change these details later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createNewGame} className="flex flex-col">
            <div className="flex flex-col gap-5 pb-8">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Set the scene for your players…"
                  className="focus-ring mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="final-message">Success message</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Players see this after solving every puzzle.
                </p>
                <textarea
                  id="final-message"
                  value={finalMessage}
                  onChange={(event) => setFinalMessage(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  required
                  placeholder="You escaped!"
                  className="focus-ring mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="timeout-message">Time-up message</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Players see this if a room&apos;s timer expires before every
                  puzzle is solved.
                </p>
                <textarea
                  id="timeout-message"
                  value={timeoutMessage}
                  onChange={(event) => setTimeoutMessage(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  required
                  placeholder="Time's up! The door remains locked."
                  className="focus-ring mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <fieldset>
                <legend className="text-sm font-medium">Puzzle order</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: 'sequential' as const,
                      title: 'Sequential',
                      body: 'Solving one puzzle unlocks the next.',
                    },
                    {
                      value: 'any' as const,
                      title: 'Any order',
                      body: 'Players can choose any unsolved puzzle.',
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg border p-4 transition ${
                        mode === option.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="mode"
                        value={option.value}
                        checked={mode === option.value}
                        onChange={() => setMode(option.value)}
                      />
                      <span className="font-medium">{option.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {option.body}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            {error ? (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={saving || !title.trim()}>
              {saving ? 'Creating…' : 'Create and add puzzles'}
              {!saving ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
