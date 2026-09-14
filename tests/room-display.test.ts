import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRoomActivityDate,
  getRoomActivityLabel,
  sortRoomsByActivity,
} from '../lib/domain/room-display.ts';

const created = '2026-08-20T10:00:00.000Z';

test('uses start time as the played date when a room has started', () => {
  const room = {
    created_at: created,
    started_at: '2026-08-21T11:00:00.000Z',
  };

  assert.equal(getRoomActivityLabel(room), 'Played');
  assert.equal(getRoomActivityDate(room), room.started_at);
});

test('uses creation time before a room has started', () => {
  const room = { created_at: created, started_at: null };

  assert.equal(getRoomActivityLabel(room), 'Created');
  assert.equal(getRoomActivityDate(room), created);
});

test('keeps live rooms first while sorting dates within each group', () => {
  const rooms = [
    {
      id: 'finished-new',
      status: 'finished' as const,
      created_at: '2026-08-28T12:00:00.000Z',
      started_at: '2026-08-28T13:00:00.000Z',
    },
    {
      id: 'live-old',
      status: 'in_progress' as const,
      created_at: '2026-08-20T12:00:00.000Z',
      started_at: '2026-08-20T13:00:00.000Z',
    },
    {
      id: 'waiting-oldest',
      status: 'waiting' as const,
      created_at: '2026-08-10T12:00:00.000Z',
      started_at: null,
    },
  ];

  assert.deepEqual(
    sortRoomsByActivity(rooms, 'newest').map((room) => room.id),
    ['live-old', 'finished-new', 'waiting-oldest']
  );
  assert.deepEqual(
    sortRoomsByActivity(rooms, 'oldest').map((room) => room.id),
    ['live-old', 'waiting-oldest', 'finished-new']
  );
});
