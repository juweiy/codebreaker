import type { GameRoom } from '@/lib/domain/types';

type RoomDates = Pick<GameRoom, 'created_at' | 'started_at'>;
type SortableRoom = RoomDates & Pick<GameRoom, 'status'>;

export type RoomDateSort = 'newest' | 'oldest';

export function getRoomActivityDate(room: RoomDates) {
  return room.started_at ?? room.created_at;
}

export function getRoomActivityLabel(room: RoomDates) {
  return room.started_at ? 'Played' : 'Created';
}

export function formatRoomDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function sortRoomsByActivity<T extends SortableRoom>(
  rooms: T[],
  dateSort: RoomDateSort = 'newest'
) {
  return [...rooms].sort((left, right) => {
    const liveDifference =
      Number(right.status === 'in_progress') -
      Number(left.status === 'in_progress');
    if (liveDifference !== 0) return liveDifference;

    const dateDifference =
      new Date(getRoomActivityDate(right)).getTime() -
      new Date(getRoomActivityDate(left)).getTime();
    return dateSort === 'newest' ? dateDifference : -dateDifference;
  });
}
