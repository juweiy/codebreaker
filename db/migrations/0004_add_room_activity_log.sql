alter table game_rooms
  add column if not exists end_reason text
  check (end_reason is null or end_reason in ('admin', 'completed', 'timeout'));

create table if not exists room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'room_created',
      'room_started',
      'room_paused',
      'room_resumed',
      'room_ended',
      'player_joined',
      'answer_attempted'
    )
  ),
  player_id uuid references room_players(id) on delete set null,
  puzzle_id uuid references puzzles(id) on delete set null,
  answer text,
  answer_correct boolean,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists room_events_room_created_idx
  on room_events(room_id, created_at desc);
