import type {
  AnswerType,
  GameMode,
  PlayerPuzzle,
  RoomEndReason,
  RoomStatus,
} from './types';

export type PlayerOutcome = 'completed' | 'timed_out' | null;

export function isRoomUnfinished(status: RoomStatus): boolean {
  return status !== 'finished';
}

export function getPlayerOutcome(
  roomStatus: RoomStatus,
  endReason: RoomEndReason | null,
  endsAt: string | null,
  totalPuzzles: number,
  solvedPuzzles: number,
  now = Date.now()
): PlayerOutcome {
  if (totalPuzzles > 0 && solvedPuzzles >= totalPuzzles) return 'completed';
  if (roomStatus === 'finished' && endReason === 'completed') {
    return 'completed';
  }
  if (
    roomStatus === 'finished' &&
    (endReason === 'timeout' || endReason === null) &&
    endsAt &&
    new Date(endsAt).getTime() <= now
  ) {
    return 'timed_out';
  }
  return null;
}

export function normalizeAnswer(value: string, type: AnswerType): string {
  const trimmed = value.trim();
  if (type === 'ordering') {
    return JSON.stringify(parseOrderingAnswer(trimmed));
  }
  if (type === 'number') {
    const withoutLeadingZeroes = trimmed.replace(/^0+(?=\d)/, '');
    return withoutLeadingZeroes || '0';
  }
  return trimmed.toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

export function parseOrderingAnswer(value: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('The ordering answer must be a valid list');
  }
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 30) {
    throw new Error('Ordering puzzles need between 2 and 30 items');
  }
  if (!parsed.every((item): item is string => typeof item === 'string')) {
    throw new Error('Every ordering item must be text');
  }
  const items = parsed.map((item) => item.trim());
  if (items.some((item) => !item || item.length > 120)) {
    throw new Error('Ordering items must be between 1 and 120 characters');
  }
  const uniqueItems = new Set(
    items.map((item) => item.toLocaleLowerCase('en'))
  );
  if (uniqueItems.size !== items.length) {
    throw new Error('Each ordering item must be unique');
  }
  return items;
}

export function shuffleOrderingItems(items: string[], seed: string): string[] {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state += 0x6d2b79f5;
    let random = state;
    random = Math.imul(random ^ (random >>> 15), random | 1);
    random ^= random + Math.imul(random ^ (random >>> 7), random | 61);
    const fraction = ((random ^ (random >>> 14)) >>> 0) / 4294967296;
    const swapIndex = Math.floor(fraction * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  if (
    shuffled.length > 1 &&
    shuffled.every((item, index) => item === items[index])
  ) {
    shuffled.push(shuffled.shift()!);
  }
  return shuffled;
}

export function isPuzzleUnlocked(
  mode: GameMode,
  position: number,
  solvedPositions: number[]
): boolean {
  return (
    mode === 'any' || position === 1 || solvedPositions.includes(position - 1)
  );
}

export function calculateProgress(total: number, solved: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(solved, total) / total) * 100);
}

export function getAvailablePlayerPuzzles(
  puzzles: PlayerPuzzle[]
): PlayerPuzzle[] {
  return puzzles.filter((puzzle) => puzzle.unlocked && !puzzle.solved);
}

export function selectPlayerPuzzle(
  mode: GameMode,
  availablePuzzles: PlayerPuzzle[],
  selectedPuzzleId: string | null
): PlayerPuzzle | null {
  if (mode === 'sequential') return availablePuzzles[0] ?? null;
  return (
    availablePuzzles.find((puzzle) => puzzle.id === selectedPuzzleId) ?? null
  );
}

export function formatRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}
