import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateProgress,
  formatRoomCode,
  getAvailablePlayerPuzzles,
  getPlayerOutcome,
  isPuzzleUnlocked,
  isRoomUnfinished,
  normalizeAnswer,
  parseOrderingAnswer,
  selectPlayerPuzzle,
  shuffleOrderingItems,
} from '../lib/domain/game-rules.ts';
import type { PlayerPuzzle } from '../lib/domain/types.ts';

test('normalizes text answers without changing internal words', () => {
  assert.equal(normalizeAnswer('  The   Red KEY ', 'text'), 'the red key');
});

test('normalizes leading zeroes in number answers', () => {
  assert.equal(normalizeAnswer('0042', 'number'), '42');
  assert.equal(normalizeAnswer('000', 'number'), '0');
});

test('normalizes ordering answers as a trimmed JSON list', () => {
  assert.equal(
    normalizeAnswer('[" First ", "Second"]', 'ordering'),
    '["First","Second"]'
  );
  assert.deepEqual(parseOrderingAnswer('["First","Second"]'), [
    'First',
    'Second',
  ]);
  assert.throws(() => normalizeAnswer('["same","Same"]', 'ordering'));
});

test('ordering items are shuffled consistently without revealing the answer', () => {
  const items = ['first', 'second', 'third', 'fourth'];
  const shuffled = shuffleOrderingItems(items, 'room:puzzle');
  assert.deepEqual(shuffled, shuffleOrderingItems(items, 'room:puzzle'));
  assert.notDeepEqual(shuffled, items);
  assert.deepEqual([...shuffled].sort(), [...items].sort());
});

test('sequential puzzles require the preceding solve', () => {
  assert.equal(isPuzzleUnlocked('sequential', 1, []), true);
  assert.equal(isPuzzleUnlocked('sequential', 3, [1]), false);
  assert.equal(isPuzzleUnlocked('sequential', 3, [1, 2]), true);
});

test('any-order games unlock every puzzle', () => {
  assert.equal(isPuzzleUnlocked('any', 8, []), true);
});

const playerPuzzles: PlayerPuzzle[] = [
  {
    id: 'solved',
    position: 1,
    title: 'Solved puzzle',
    clue: 'Solved',
    description: '',
    answerType: 'text',
    orderingItems: null,
    solved: true,
    unlocked: true,
  },
  {
    id: 'current',
    position: 2,
    title: 'Current puzzle',
    clue: 'Current',
    description: '',
    answerType: 'text',
    orderingItems: null,
    solved: false,
    unlocked: true,
  },
  {
    id: 'later',
    position: 3,
    title: 'Later puzzle',
    clue: 'Later',
    description: '',
    answerType: 'text',
    orderingItems: null,
    solved: false,
    unlocked: false,
  },
];

test('the puzzle wizard only considers unlocked unsolved puzzles', () => {
  assert.deepEqual(
    getAvailablePlayerPuzzles(playerPuzzles).map((puzzle) => puzzle.id),
    ['current']
  );
});

test('sequential wizard flow always chooses the next available puzzle', () => {
  const available = getAvailablePlayerPuzzles(playerPuzzles);
  assert.equal(
    selectPlayerPuzzle('sequential', available, 'later')?.id,
    'current'
  );
});

test('open-order wizard flow honors an available puzzle selection', () => {
  const choices = playerPuzzles.map((puzzle) => ({
    ...puzzle,
    solved: false,
    unlocked: true,
  }));
  assert.equal(selectPlayerPuzzle('any', choices, 'later')?.id, 'later');
  assert.equal(selectPlayerPuzzle('any', choices, null), null);
});

test('progress is bounded and handles empty games', () => {
  assert.equal(calculateProgress(0, 0), 0);
  assert.equal(calculateProgress(6, 4), 67);
  assert.equal(calculateProgress(2, 3), 100);
});

test('room codes are uppercase alphanumeric and six characters long', () => {
  assert.equal(formatRoomCode('a1-b2 c3d4'), 'A1B2C3');
});

test('unfinished rooms lock game editing', () => {
  assert.equal(isRoomUnfinished('waiting'), true);
  assert.equal(isRoomUnfinished('in_progress'), true);
  assert.equal(isRoomUnfinished('paused'), true);
  assert.equal(isRoomUnfinished('finished'), false);
});

test('completed puzzles take precedence over an expired timer', () => {
  const expired = '2026-01-01T00:00:00.000Z';
  const now = new Date('2026-01-01T00:01:00.000Z').getTime();
  assert.equal(
    getPlayerOutcome('finished', 'completed', expired, 3, 3, now),
    'completed'
  );
});

test('an expired unfinished room produces a timed-out result', () => {
  const expired = '2026-01-01T00:00:00.000Z';
  const now = new Date('2026-01-01T00:01:00.000Z').getTime();
  assert.equal(
    getPlayerOutcome('finished', 'timeout', expired, 3, 2, now),
    'timed_out'
  );
  assert.equal(getPlayerOutcome('finished', 'admin', expired, 3, 2, now), null);
  assert.equal(getPlayerOutcome('finished', 'admin', null, 3, 2, now), null);
});
