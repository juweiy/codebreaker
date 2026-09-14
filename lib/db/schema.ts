import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const gameMode = pgEnum('game_mode', ['sequential', 'any']);
export const gameStatus = pgEnum('game_status', ['active', 'archived']);
export const answerType = pgEnum('answer_type', ['text', 'number', 'ordering']);
export const roomStatus = pgEnum('room_status', [
  'waiting',
  'in_progress',
  'paused',
  'finished',
]);

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    owner_id: text('owner_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    final_message: text('final_message')
      .notNull()
      .default('Congratulations! You completed the game.'),
    timeout_message: text('timeout_message')
      .notNull()
      .default("Time's up! The game ended before you solved every puzzle."),
    mode: gameMode('mode').notNull().default('sequential'),
    status: gameStatus('status').notNull().default('active'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('games_owner_updated_idx').on(table.owner_id, table.updated_at),
  ]
);

export const puzzles = pgTable(
  'puzzles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    game_id: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
    clue: text('clue').notNull(),
    description: text('description').notNull().default(''),
    answer_type: answerType('answer_type').notNull().default('text'),
    answer_normalized: text('answer_normalized').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('puzzles_game_position_unique').on(table.game_id, table.position),
    index('puzzles_game_position_idx').on(table.game_id, table.position),
  ]
);

export const gameRooms = pgTable(
  'game_rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    game_id: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    owner_id: text('owner_id').notNull(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    password_hash: text('password_hash'),
    status: roomStatus('status').notNull().default('waiting'),
    duration_minutes: integer('duration_minutes'),
    started_at: timestamp('started_at', {
      withTimezone: true,
      mode: 'string',
    }),
    ends_at: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
    paused_at: timestamp('paused_at', { withTimezone: true, mode: 'string' }),
    end_reason: text('end_reason'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('rooms_owner_created_idx').on(table.owner_id, table.created_at),
    index('rooms_game_idx').on(table.game_id),
  ]
);

export const roomPlayers = pgTable(
  'room_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    room_id: uuid('room_id')
      .notNull()
      .references(() => gameRooms.id, { onDelete: 'cascade' }),
    display_name: text('display_name').notNull(),
    session_token: uuid('session_token').notNull().defaultRandom().unique(),
    joined_at: timestamp('joined_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    last_seen_at: timestamp('last_seen_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('players_room_idx').on(table.room_id)]
);

export const roomSolves = pgTable(
  'room_solves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    room_id: uuid('room_id')
      .notNull()
      .references(() => gameRooms.id, { onDelete: 'cascade' }),
    puzzle_id: uuid('puzzle_id')
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    player_id: uuid('player_id')
      .notNull()
      .references(() => roomPlayers.id, { onDelete: 'cascade' }),
    solved_at: timestamp('solved_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('solves_room_puzzle_unique').on(table.room_id, table.puzzle_id),
    index('solves_room_idx').on(table.room_id),
  ]
);

export const roomEvents = pgTable(
  'room_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    room_id: uuid('room_id')
      .notNull()
      .references(() => gameRooms.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    player_id: uuid('player_id').references(() => roomPlayers.id, {
      onDelete: 'set null',
    }),
    puzzle_id: uuid('puzzle_id').references(() => puzzles.id, {
      onDelete: 'set null',
    }),
    answer: text('answer'),
    answer_correct: boolean('answer_correct'),
    detail: text('detail'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('room_events_room_created_idx').on(table.room_id, table.created_at),
  ]
);

export type GameRow = typeof games.$inferSelect;
export type PuzzleRow = typeof puzzles.$inferSelect;
export type GameRoomRow = typeof gameRooms.$inferSelect;
export type RoomPlayerRow = typeof roomPlayers.$inferSelect;
export type RoomSolveRow = typeof roomSolves.$inferSelect;
export type RoomEventRow = typeof roomEvents.$inferSelect;
