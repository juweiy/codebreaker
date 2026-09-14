create extension if not exists pgcrypto;

do $$ begin
  create type game_mode as enum ('sequential', 'any');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type game_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type answer_type as enum ('text', 'number');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type room_status as enum ('waiting', 'in_progress', 'paused', 'finished');
exception when duplicate_object then null;
end $$;

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  final_message text not null default 'Congratulations! You completed the game.' check (char_length(final_message) between 1 and 2000),
  mode game_mode not null default 'sequential',
  status game_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists puzzles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null check (char_length(title) between 1 and 100),
  clue text not null check (char_length(clue) between 1 and 2000),
  description text not null default '' check (char_length(description) <= 2000),
  answer_type answer_type not null default 'text',
  answer_normalized text not null check (char_length(answer_normalized) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id, position)
);

create table if not exists game_rooms (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  owner_id text not null,
  name text not null check (char_length(name) between 1 and 100),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  password_hash text,
  status room_status not null default 'waiting',
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  started_at timestamptz,
  ends_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  session_token uuid not null default gen_random_uuid() unique,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists room_solves (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  puzzle_id uuid not null references puzzles(id) on delete cascade,
  player_id uuid not null references room_players(id) on delete cascade,
  solved_at timestamptz not null default now(),
  unique(room_id, puzzle_id)
);

create index if not exists games_owner_updated_idx on games(owner_id, updated_at desc);
create index if not exists puzzles_game_position_idx on puzzles(game_id, position);
create index if not exists rooms_owner_created_idx on game_rooms(owner_id, created_at desc);
create index if not exists rooms_game_idx on game_rooms(game_id);
create index if not exists players_room_idx on room_players(room_id);
create index if not exists solves_room_idx on room_solves(room_id);
