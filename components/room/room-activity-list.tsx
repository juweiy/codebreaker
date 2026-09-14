import {
  CheckCircle2,
  CirclePause,
  CirclePlay,
  DoorOpen,
  Flag,
  History,
  Play,
  XCircle,
} from 'lucide-react';
import type { RoomEvent } from '@/lib/domain/types';
import { formatRoomDateTime } from '@/lib/domain/room-display';
import { cn } from '@/lib/utils';

function eventContent(event: RoomEvent) {
  const player = event.player_name ?? 'A player';
  const puzzle = event.puzzle_title ?? 'a puzzle';

  switch (event.event_type) {
    case 'room_created':
      return { title: 'Room created', detail: event.detail, icon: History };
    case 'room_started':
      return { title: 'Room started', detail: event.detail, icon: Play };
    case 'room_paused':
      return { title: 'Room paused', detail: event.detail, icon: CirclePause };
    case 'room_resumed':
      return { title: 'Room resumed', detail: event.detail, icon: CirclePlay };
    case 'room_ended':
      return { title: 'Room ended', detail: event.detail, icon: Flag };
    case 'player_joined':
      return {
        title: `${player} joined the room`,
        detail: null,
        icon: DoorOpen,
      };
    case 'answer_attempted':
      return {
        title: event.answer_correct
          ? `${player} solved ${puzzle}`
          : `${player} tried ${puzzle}`,
        detail: `Answer: “${event.answer ?? ''}” · ${
          event.answer_correct ? 'Correct' : 'Incorrect'
        }`,
        icon: event.answer_correct ? CheckCircle2 : XCircle,
      };
  }
}

export function RoomActivityList({ events }: { events: RoomEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        New room activity will appear here.
      </p>
    );
  }

  return (
    <ol className="divide-y" aria-label="Room activity, newest first">
      {events.map((event) => {
        const content = eventContent(event);
        const Icon = content.icon;
        return (
          <li key={event.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <span
              className={cn(
                'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground',
                event.event_type === 'answer_attempted' &&
                  event.answer_correct &&
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                event.event_type === 'answer_attempted' &&
                  event.answer_correct === false &&
                  'bg-destructive/10 text-destructive'
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <p className="font-medium">{content.title}</p>
                <time
                  className="shrink-0 text-xs text-muted-foreground"
                  dateTime={event.created_at}
                >
                  {formatRoomDateTime(event.created_at)}
                </time>
              </div>
              {content.detail ? (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {content.detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
