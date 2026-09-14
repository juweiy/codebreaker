import 'server-only';

import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, getTableColumns, ne, sql } from 'drizzle-orm';
import { getDb, getSql } from './client';
import {
  gameRooms,
  games,
  puzzles,
  roomEvents,
  roomPlayers,
  roomSolves,
  type GameRoomRow,
  type PuzzleRow,
} from './schema';
import {
  isPuzzleUnlocked,
  normalizeAnswer,
  parseOrderingAnswer,
  shuffleOrderingItems,
} from '@/lib/domain/game-rules';
import {
  DEFAULT_FINAL_MESSAGE,
  DEFAULT_TIMEOUT_MESSAGE,
  type AnswerType,
  type GameMode,
  type GameStatus,
  type PlayerRoomState,
  type PlayerSession,
  type RoomEndReason,
  type RoomEvent,
  type RoomEventType,
  type RoomStatus,
} from '@/lib/domain/types';

export function omitRoomPassword<T extends { password_hash: string | null }>(
  room: T
): Omit<T, 'password_hash'> {
  const { password_hash, ...safeRoom } = room;
  void password_hash;
  return safeRoom;
}

const scryptAsync = promisify(scrypt);

function nowIso() {
  return new Date().toISOString();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return true;
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function createRoomCode() {
  return randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

async function assertGameOwner(gameId: string, ownerId: string) {
  const db = getDb();
  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.owner_id, ownerId)))
    .limit(1);
  if (!game) throw new Error('Game not found');
  return game;
}

async function assertGameEditable(gameId: string, ownerId: string) {
  const game = await assertGameOwner(gameId, ownerId);
  const [openRoom] = await getDb()
    .select({ id: gameRooms.id })
    .from(gameRooms)
    .where(and(eq(gameRooms.game_id, gameId), ne(gameRooms.status, 'finished')))
    .limit(1);
  if (openRoom) {
    throw new Error(
      'Finish all waiting, running, or paused rooms before editing this game'
    );
  }
  return game;
}

async function assertRoomOwner(roomId: string, ownerId: string) {
  const db = getDb();
  const [room] = await db
    .select()
    .from(gameRooms)
    .where(and(eq(gameRooms.id, roomId), eq(gameRooms.owner_id, ownerId)))
    .limit(1);
  if (!room) throw new Error('Room not found');
  return room;
}

async function listRoomEvents(roomId: string, limit = 10_000) {
  const rows = await getDb()
    .select({
      id: roomEvents.id,
      room_id: roomEvents.room_id,
      event_type: roomEvents.event_type,
      player_id: roomEvents.player_id,
      puzzle_id: roomEvents.puzzle_id,
      answer: roomEvents.answer,
      answer_correct: roomEvents.answer_correct,
      detail: roomEvents.detail,
      created_at: roomEvents.created_at,
      player_name: roomPlayers.display_name,
      puzzle_title: puzzles.title,
      total_count: sql<number>`count(*) over()::int`,
    })
    .from(roomEvents)
    .leftJoin(roomPlayers, eq(roomPlayers.id, roomEvents.player_id))
    .leftJoin(puzzles, eq(puzzles.id, roomEvents.puzzle_id))
    .where(eq(roomEvents.room_id, roomId))
    .orderBy(desc(roomEvents.created_at))
    .limit(limit);

  return {
    events: rows.map(({ total_count, event_type, ...event }) => {
      void total_count;
      return { ...event, event_type: event_type as RoomEventType };
    }) satisfies RoomEvent[],
    totalCount: rows[0]?.total_count ?? 0,
  };
}

export async function getRoomActivityLog(roomId: string, ownerId: string) {
  const room = await assertRoomOwner(roomId, ownerId);
  const db = getDb();
  const [gameRows, activity] = await Promise.all([
    db
      .select({ id: games.id, title: games.title })
      .from(games)
      .where(eq(games.id, room.game_id))
      .limit(1),
    listRoomEvents(roomId),
  ]);
  const game = gameRows[0];
  if (!game) throw new Error('Game not found');
  return {
    room: omitRoomPassword(room),
    game,
    events: activity.events,
  };
}

function getRoomStatusEvent(
  previousStatus: RoomStatus,
  nextStatus: RoomStatus,
  endReason: RoomEndReason | null
): { type: RoomEventType; detail: string } | null {
  if (nextStatus === 'in_progress') {
    return previousStatus === 'paused'
      ? { type: 'room_resumed', detail: 'Room resumed by game master' }
      : { type: 'room_started', detail: 'Room started by game master' };
  }
  if (nextStatus === 'paused') {
    return { type: 'room_paused', detail: 'Room paused by game master' };
  }
  if (nextStatus === 'finished') {
    const detail =
      endReason === 'timeout'
        ? 'Time expired'
        : endReason === 'completed'
          ? 'All puzzles were solved'
          : 'Room ended by game master';
    return { type: 'room_ended', detail };
  }
  return null;
}

export async function listGames(ownerId: string) {
  const db = getDb();
  const rows = await db
    .select({
      ...getTableColumns(games),
      puzzle_count: sql<number>`(
        select count(*)::int from ${puzzles}
        where ${puzzles.game_id} = ${games.id}
      )`,
      room_count: sql<number>`(
        select count(*)::int from ${gameRooms}
        where ${gameRooms.game_id} = ${games.id}
      )`,
    })
    .from(games)
    .where(eq(games.owner_id, ownerId))
    .orderBy(desc(games.updated_at));
  return rows.map(({ puzzle_count, room_count, ...game }) => ({
    ...game,
    puzzles: [{ count: puzzle_count }],
    game_rooms: [{ count: room_count }],
  }));
}

export async function listRooms(ownerId: string) {
  const db = getDb();
  const rows = await db
    .select({
      ...getTableColumns(gameRooms),
      game_title: games.title,
      player_count: sql<number>`(
        select count(*)::int from ${roomPlayers}
        where ${roomPlayers.room_id} = ${gameRooms.id}
      )`,
      solve_count: sql<number>`(
        select count(*)::int from ${roomSolves}
        where ${roomSolves.room_id} = ${gameRooms.id}
      )`,
      puzzle_count: sql<number>`(
        select count(*)::int from ${puzzles}
        where ${puzzles.game_id} = ${gameRooms.game_id}
      )`,
    })
    .from(gameRooms)
    .innerJoin(games, eq(games.id, gameRooms.game_id))
    .where(eq(gameRooms.owner_id, ownerId))
    .orderBy(
      sql`case when ${gameRooms.status} = 'in_progress' then 0 else 1 end`,
      desc(sql`coalesce(${gameRooms.started_at}, ${gameRooms.created_at})`)
    );

  return rows.map(
    ({ game_title, player_count, solve_count, puzzle_count, ...room }) => ({
      ...omitRoomPassword(room),
      game: { id: room.game_id, title: game_title },
      player_count,
      solve_count,
      puzzle_count,
    })
  );
}

export async function createGame(
  ownerId: string,
  input: {
    title: string;
    description?: string;
    finalMessage?: string;
    timeoutMessage?: string;
    mode: GameMode;
  }
) {
  const db = getDb();
  const [created] = await db
    .insert(games)
    .values({
      owner_id: ownerId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      final_message: input.finalMessage?.trim() || DEFAULT_FINAL_MESSAGE,
      timeout_message: input.timeoutMessage?.trim() || DEFAULT_TIMEOUT_MESSAGE,
      mode: input.mode,
    })
    .returning();
  return created;
}

export async function getGameBundle(gameId: string, ownerId: string) {
  const game = await assertGameOwner(gameId, ownerId);
  const db = getDb();
  const [gamePuzzles, rooms] = await Promise.all([
    db
      .select()
      .from(puzzles)
      .where(eq(puzzles.game_id, gameId))
      .orderBy(asc(puzzles.position)),
    db
      .select()
      .from(gameRooms)
      .where(eq(gameRooms.game_id, gameId))
      .orderBy(desc(gameRooms.created_at)),
  ]);
  return {
    game,
    puzzles: gamePuzzles,
    rooms: rooms.map(omitRoomPassword),
  };
}

export async function updateGame(
  gameId: string,
  ownerId: string,
  input: {
    title: string;
    description: string;
    finalMessage: string;
    timeoutMessage: string;
    mode: GameMode;
    status: GameStatus;
  }
) {
  await assertGameEditable(gameId, ownerId);
  const db = getDb();
  const [updated] = await db
    .update(games)
    .set({
      title: input.title.trim(),
      description: input.description.trim(),
      final_message: input.finalMessage.trim(),
      timeout_message: input.timeoutMessage.trim(),
      mode: input.mode,
      status: input.status,
      updated_at: nowIso(),
    })
    .where(eq(games.id, gameId))
    .returning();
  return updated;
}

export async function updateGameStatus(
  gameId: string,
  ownerId: string,
  status: GameStatus
) {
  await assertGameOwner(gameId, ownerId);
  const [updated] = await getDb()
    .update(games)
    .set({ status, updated_at: nowIso() })
    .where(eq(games.id, gameId))
    .returning();
  return updated;
}

export async function deleteGame(gameId: string, ownerId: string) {
  await assertGameEditable(gameId, ownerId);
  await getDb().delete(games).where(eq(games.id, gameId));
}

export async function savePuzzle(
  ownerId: string,
  input: {
    id?: string;
    gameId: string;
    position?: number;
    title: string;
    clue: string;
    description: string;
    answerType: AnswerType;
    answer: string;
  }
) {
  await assertGameEditable(input.gameId, ownerId);
  const db = getDb();
  const values = {
    title: input.title.trim(),
    clue: input.clue.trim(),
    description: input.description.trim(),
    answer_type: input.answerType,
    answer_normalized: normalizeAnswer(input.answer, input.answerType),
    updated_at: nowIso(),
  };
  if (input.id) {
    const [updated] = await db
      .update(puzzles)
      .set(values)
      .where(and(eq(puzzles.id, input.id), eq(puzzles.game_id, input.gameId)))
      .returning();
    if (!updated) throw new Error('Puzzle not found');
    return updated;
  }
  const [last] = await db
    .select({ position: puzzles.position })
    .from(puzzles)
    .where(eq(puzzles.game_id, input.gameId))
    .orderBy(desc(puzzles.position))
    .limit(1);
  const [created] = await db
    .insert(puzzles)
    .values({
      game_id: input.gameId,
      position: input.position ?? (last?.position ?? 0) + 1,
      ...values,
    })
    .returning();
  return created;
}

export async function replacePuzzles(
  gameId: string,
  ownerId: string,
  input: Array<{
    id: string;
    title: string;
    clue: string;
    description: string;
    answerType: AnswerType;
    answer: string;
  }>
) {
  await assertGameEditable(gameId, ownerId);

  const neonSql = getSql();
  const updatedAt = nowIso();
  const puzzleIds = `{${input.map((puzzle) => puzzle.id).join(',')}}`;
  const results = await neonSql.transaction((tx) => [
    tx`UPDATE puzzles
       SET position = position + 1000000
       WHERE game_id = ${gameId}`,
    tx.query(
      'DELETE FROM puzzles WHERE game_id = $1 AND NOT (id = ANY($2::uuid[]))',
      [gameId, puzzleIds]
    ),
    ...input.map((puzzle, index) => {
      const answer = normalizeAnswer(puzzle.answer, puzzle.answerType);
      return tx`INSERT INTO puzzles (
          id, game_id, position, title, clue, description,
          answer_type, answer_normalized, updated_at
        ) VALUES (
          ${puzzle.id}, ${gameId}, ${index + 1}, ${puzzle.title.trim()},
          ${puzzle.clue.trim()}, ${puzzle.description.trim()},
          ${puzzle.answerType}, ${answer}, ${updatedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          position = EXCLUDED.position,
          title = EXCLUDED.title,
          clue = EXCLUDED.clue,
          description = EXCLUDED.description,
          answer_type = EXCLUDED.answer_type,
          answer_normalized = EXCLUDED.answer_normalized,
          updated_at = EXCLUDED.updated_at
        WHERE puzzles.game_id = EXCLUDED.game_id`;
    }),
    tx`SELECT id, game_id, position, title, clue, description,
              answer_type, answer_normalized, created_at, updated_at
       FROM puzzles
       WHERE game_id = ${gameId}
       ORDER BY position`,
  ]);

  return results.at(-1) as PuzzleRow[];
}

export async function deletePuzzle(puzzleId: string, ownerId: string) {
  const db = getDb();
  const [target] = await db
    .select({ puzzle: puzzles, owner_id: games.owner_id })
    .from(puzzles)
    .innerJoin(games, eq(games.id, puzzles.game_id))
    .where(eq(puzzles.id, puzzleId))
    .limit(1);
  if (!target || target.owner_id !== ownerId)
    throw new Error('Puzzle not found');
  await assertGameEditable(target.puzzle.game_id, ownerId);
  const neonSql = getSql();
  const updatedAt = nowIso();
  await neonSql.transaction((tx) => [
    tx`DELETE FROM puzzles WHERE id = ${puzzleId}`,
    tx`UPDATE puzzles
       SET position = position + 1000000
       WHERE game_id = ${target.puzzle.game_id}`,
    tx`WITH ranked AS (
         SELECT id, row_number() OVER (ORDER BY position)::integer AS new_position
         FROM puzzles
         WHERE game_id = ${target.puzzle.game_id}
       )
       UPDATE puzzles AS puzzle
       SET position = ranked.new_position, updated_at = ${updatedAt}
       FROM ranked
       WHERE puzzle.id = ranked.id`,
  ]);
}

export async function movePuzzle(
  puzzleId: string,
  ownerId: string,
  direction: -1 | 1
) {
  const db = getDb();
  const [target] = await db
    .select({ puzzle: puzzles, owner_id: games.owner_id })
    .from(puzzles)
    .innerJoin(games, eq(games.id, puzzles.game_id))
    .where(eq(puzzles.id, puzzleId))
    .limit(1);
  if (!target || target.owner_id !== ownerId)
    throw new Error('Puzzle not found');
  await assertGameEditable(target.puzzle.game_id, ownerId);
  const [swap] = await db
    .select()
    .from(puzzles)
    .where(
      and(
        eq(puzzles.game_id, target.puzzle.game_id),
        eq(puzzles.position, target.puzzle.position + direction)
      )
    )
    .limit(1);
  if (!swap) return;
  const neonSql = getSql();
  const updatedAt = nowIso();
  await neonSql.transaction((tx) => [
    tx`UPDATE puzzles SET position = 1000000
       WHERE id = ${target.puzzle.id}`,
    tx`UPDATE puzzles
       SET position = ${target.puzzle.position}, updated_at = ${updatedAt}
       WHERE id = ${swap.id}`,
    tx`UPDATE puzzles
       SET position = ${swap.position}, updated_at = ${updatedAt}
       WHERE id = ${target.puzzle.id}`,
  ]);
}

export async function createRoom(
  gameId: string,
  ownerId: string,
  input: { name: string; password?: string; durationMinutes: number | null }
) {
  const game = await assertGameOwner(gameId, ownerId);
  if (game.status !== 'active') {
    throw new Error('Restore this game before creating a new room');
  }
  const db = getDb();
  const [firstPuzzle] = await db
    .select({ id: puzzles.id })
    .from(puzzles)
    .where(eq(puzzles.game_id, gameId))
    .limit(1);
  if (!firstPuzzle)
    throw new Error('Add at least one puzzle before creating a room');

  const passwordHash = input.password
    ? await hashPassword(input.password)
    : null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const [created] = await db
        .insert(gameRooms)
        .values({
          game_id: gameId,
          owner_id: ownerId,
          name: input.name.trim(),
          code: createRoomCode(),
          password_hash: passwordHash,
          duration_minutes: input.durationMinutes,
        })
        .returning();
      await db.insert(roomEvents).values({
        room_id: created.id,
        event_type: 'room_created',
        detail: 'Room created by game master',
      });
      return omitRoomPassword(created);
    } catch (error) {
      if (attempt === 9) throw error;
    }
  }
  throw new Error('Could not create a unique room code');
}

export async function getRoomControl(roomId: string, ownerId: string) {
  let room = await assertRoomOwner(roomId, ownerId);
  if (
    room.status === 'in_progress' &&
    room.ends_at &&
    new Date(room.ends_at).getTime() <= Date.now()
  ) {
    room = await setRoomStatus(roomId, ownerId, 'finished', 'timeout');
  }
  const db = getDb();
  const [game, gamePuzzles, players, solves, activity] = await Promise.all([
    db.select().from(games).where(eq(games.id, room.game_id)).limit(1),
    db
      .select()
      .from(puzzles)
      .where(eq(puzzles.game_id, room.game_id))
      .orderBy(asc(puzzles.position)),
    db
      .select({
        id: roomPlayers.id,
        room_id: roomPlayers.room_id,
        display_name: roomPlayers.display_name,
        joined_at: roomPlayers.joined_at,
        last_seen_at: roomPlayers.last_seen_at,
      })
      .from(roomPlayers)
      .where(eq(roomPlayers.room_id, roomId))
      .orderBy(asc(roomPlayers.joined_at)),
    db
      .select()
      .from(roomSolves)
      .where(eq(roomSolves.room_id, roomId))
      .orderBy(asc(roomSolves.solved_at)),
    listRoomEvents(roomId, 15),
  ]);
  const safeRoom = omitRoomPassword(room);
  return {
    room: { ...safeRoom, games: game[0] },
    puzzles: gamePuzzles,
    players,
    solves,
    events: activity.events,
    eventCount: activity.totalCount,
  };
}

export async function setRoomStatus(
  roomId: string,
  ownerId: string,
  status: RoomStatus,
  endReason: RoomEndReason = 'admin'
) {
  const room = await assertRoomOwner(roomId, ownerId);
  if (room.status === status) return room;
  const now = new Date();
  let startedAt = room.started_at;
  let endsAt = room.ends_at;
  let pausedAt = room.paused_at;
  if (status === 'in_progress' && !startedAt) {
    startedAt = now.toISOString();
    endsAt = room.duration_minutes
      ? new Date(now.getTime() + room.duration_minutes * 60_000).toISOString()
      : null;
  } else if (status === 'in_progress' && pausedAt && endsAt) {
    const pauseDuration = now.getTime() - new Date(pausedAt).getTime();
    endsAt = new Date(new Date(endsAt).getTime() + pauseDuration).toISOString();
  }
  pausedAt = status === 'paused' ? now.toISOString() : null;
  const resolvedEndReason = status === 'finished' ? endReason : null;
  const [updated] = await getDb()
    .update(gameRooms)
    .set({
      status,
      started_at: startedAt,
      ends_at: endsAt,
      paused_at: pausedAt,
      end_reason: resolvedEndReason,
      updated_at: now.toISOString(),
    })
    .where(eq(gameRooms.id, roomId))
    .returning();

  const event = getRoomStatusEvent(room.status, status, resolvedEndReason);
  if (event) {
    await getDb().insert(roomEvents).values({
      room_id: roomId,
      event_type: event.type,
      detail: event.detail,
      created_at: now.toISOString(),
    });
  }
  return updated;
}

export async function deleteRoom(roomId: string, ownerId: string) {
  await assertRoomOwner(roomId, ownerId);
  await getDb().delete(gameRooms).where(eq(gameRooms.id, roomId));
}

export async function joinRoom(input: {
  code: string;
  password: string;
  displayName: string;
}): Promise<PlayerSession> {
  const db = getDb();
  const [room] = await db
    .select()
    .from(gameRooms)
    .where(eq(gameRooms.code, input.code.toUpperCase().trim()))
    .limit(1);
  if (!room || room.status === 'finished') {
    throw new Error('Room not found or already finished');
  }
  if (!(await verifyPassword(input.password, room.password_hash))) {
    throw new Error('Incorrect room password');
  }
  const [player] = await db
    .insert(roomPlayers)
    .values({ room_id: room.id, display_name: input.displayName.trim() })
    .returning();
  await db.insert(roomEvents).values({
    room_id: room.id,
    event_type: 'player_joined',
    player_id: player.id,
  });
  return {
    roomId: room.id,
    playerId: player.id,
    sessionToken: player.session_token,
  };
}

async function getPlayerSession(
  roomId: string,
  playerId: string,
  sessionToken: string
) {
  const db = getDb();
  const [player] = await db
    .select()
    .from(roomPlayers)
    .where(
      and(
        eq(roomPlayers.id, playerId),
        eq(roomPlayers.room_id, roomId),
        eq(roomPlayers.session_token, sessionToken)
      )
    )
    .limit(1);
  if (!player) throw new Error('Player session not found');
  return player;
}

async function finishRoomForTimeout(roomId: string) {
  const timestamp = nowIso();
  const [updated] = await getDb()
    .update(gameRooms)
    .set({
      status: 'finished',
      end_reason: 'timeout',
      paused_at: null,
      updated_at: timestamp,
    })
    .where(and(eq(gameRooms.id, roomId), eq(gameRooms.status, 'in_progress')))
    .returning();
  if (updated) {
    await getDb().insert(roomEvents).values({
      room_id: roomId,
      event_type: 'room_ended',
      detail: 'Time expired',
      created_at: timestamp,
    });
  }
  return updated;
}

export async function getPlayerRoomState(
  roomId: string,
  playerId: string,
  sessionToken: string
): Promise<PlayerRoomState> {
  const player = await getPlayerSession(roomId, playerId, sessionToken);
  const db = getDb();
  let [room] = await db
    .select()
    .from(gameRooms)
    .where(eq(gameRooms.id, roomId))
    .limit(1);
  if (!room) throw new Error('Room not found');
  if (
    room.status === 'in_progress' &&
    room.ends_at &&
    new Date(room.ends_at).getTime() <= Date.now()
  ) {
    room = (await finishRoomForTimeout(roomId)) ?? room;
  }
  const [gameRows, gamePuzzles, solves, playerCountRows] = await Promise.all([
    db.select().from(games).where(eq(games.id, room.game_id)).limit(1),
    db
      .select()
      .from(puzzles)
      .where(eq(puzzles.game_id, room.game_id))
      .orderBy(asc(puzzles.position)),
    db.select().from(roomSolves).where(eq(roomSolves.room_id, roomId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(roomPlayers)
      .where(eq(roomPlayers.room_id, roomId)),
  ]);
  const game = gameRows[0];
  if (!game) throw new Error('Game not found');
  const solvedIds = new Set(solves.map((solve) => solve.puzzle_id));
  const solvedPositions = gamePuzzles
    .filter((puzzle) => solvedIds.has(puzzle.id))
    .map((puzzle) => puzzle.position);
  await db
    .update(roomPlayers)
    .set({ last_seen_at: nowIso() })
    .where(eq(roomPlayers.id, player.id));
  return {
    room: {
      id: room.id,
      name: room.name,
      code: room.code,
      status: room.status,
      startedAt: room.started_at,
      endsAt: room.ends_at,
      pausedAt: room.paused_at,
      endReason: room.end_reason as RoomEndReason | null,
    },
    game: {
      id: game.id,
      title: game.title,
      description: game.description,
      finalMessage: game.final_message,
      timeoutMessage: game.timeout_message,
      mode: game.mode,
    },
    player: { id: player.id, displayName: player.display_name },
    playerCount: playerCountRows[0]?.count ?? 0,
    puzzles: gamePuzzles.map((puzzle) => {
      const orderingItems =
        puzzle.answer_type === 'ordering'
          ? shuffleOrderingItems(
              parseOrderingAnswer(puzzle.answer_normalized),
              `${room.id}:${puzzle.id}`
            )
          : null;
      return {
        id: puzzle.id,
        position: puzzle.position,
        title: puzzle.title,
        clue: puzzle.clue,
        description: puzzle.description,
        answerType: puzzle.answer_type,
        orderingItems,
        solved: solvedIds.has(puzzle.id),
        unlocked: isPuzzleUnlocked(game.mode, puzzle.position, solvedPositions),
      };
    }),
  };
}

export async function submitAnswer(input: {
  roomId: string;
  puzzleId: string;
  playerId: string;
  sessionToken: string;
  answer: string;
}) {
  const db = getDb();
  const [context] = await db
    .select({
      playerId: roomPlayers.id,
      roomId: gameRooms.id,
      roomStatus: gameRooms.status,
      roomEndsAt: gameRooms.ends_at,
      gameId: games.id,
      gameMode: games.mode,
      puzzleId: puzzles.id,
      puzzlePosition: puzzles.position,
      answerType: puzzles.answer_type,
      answerNormalized: puzzles.answer_normalized,
      alreadySolved: sql<boolean>`exists (
        select 1 from room_solves existing_solve
        where existing_solve.room_id = ${gameRooms.id}
          and existing_solve.puzzle_id = ${puzzles.id}
      )`,
      previousSolved: sql<boolean>`exists (
        select 1
        from room_solves previous_solve
        inner join puzzles previous_puzzle
          on previous_puzzle.id = previous_solve.puzzle_id
        where previous_solve.room_id = ${gameRooms.id}
          and previous_puzzle.game_id = ${games.id}
          and previous_puzzle.position = ${puzzles.position} - 1
      )`,
    })
    .from(roomPlayers)
    .innerJoin(gameRooms, eq(gameRooms.id, roomPlayers.room_id))
    .innerJoin(games, eq(games.id, gameRooms.game_id))
    .innerJoin(
      puzzles,
      and(eq(puzzles.id, input.puzzleId), eq(puzzles.game_id, games.id))
    )
    .where(
      and(
        eq(roomPlayers.id, input.playerId),
        eq(roomPlayers.room_id, input.roomId),
        eq(roomPlayers.session_token, input.sessionToken)
      )
    )
    .limit(1);
  if (!context) throw new Error('Player session or puzzle not found');
  if (context.roomStatus !== 'in_progress') {
    throw new Error('The room is not currently in progress');
  }
  if (
    context.roomEndsAt &&
    new Date(context.roomEndsAt).getTime() <= Date.now()
  ) {
    await finishRoomForTimeout(context.roomId);
    throw new Error('Time is up');
  }
  if (context.alreadySolved) {
    return { correct: true, alreadySolved: true, roomFinished: false };
  }
  const unlocked =
    context.gameMode === 'any' ||
    context.puzzlePosition === 1 ||
    context.previousSolved;
  if (!unlocked) {
    throw new Error('This puzzle is still locked');
  }
  const answer = input.answer.trim();
  const correct =
    normalizeAnswer(answer, context.answerType) === context.answerNormalized;
  if (!correct) {
    await db.insert(roomEvents).values({
      room_id: context.roomId,
      event_type: 'answer_attempted',
      player_id: context.playerId,
      puzzle_id: context.puzzleId,
      answer: answer.slice(0, 500),
      answer_correct: false,
    });
    return { correct: false, alreadySolved: false, roomFinished: false };
  }

  const timestamp = nowIso();
  const results = await getSql().transaction((tx) => [
    tx`INSERT INTO room_events (
        room_id, event_type, player_id, puzzle_id, answer,
        answer_correct, created_at
      ) VALUES (
        ${context.roomId}, 'answer_attempted', ${context.playerId},
        ${context.puzzleId}, ${answer.slice(0, 500)}, true, ${timestamp}
      )`,
    tx`INSERT INTO room_solves (room_id, puzzle_id, player_id)
      VALUES (${context.roomId}, ${context.puzzleId}, ${context.playerId})
      ON CONFLICT (room_id, puzzle_id) DO NOTHING`,
    tx`UPDATE game_rooms AS room
      SET status = 'finished', end_reason = 'completed', paused_at = null,
          updated_at = ${timestamp}
      WHERE room.id = ${context.roomId}
        AND room.status = 'in_progress'
        AND NOT EXISTS (
          SELECT 1 FROM puzzles AS puzzle
          WHERE puzzle.game_id = ${context.gameId}
            AND NOT EXISTS (
              SELECT 1 FROM room_solves AS solve
              WHERE solve.room_id = ${context.roomId}
                AND solve.puzzle_id = puzzle.id
            )
        )
      RETURNING room.id`,
    tx`INSERT INTO room_events (room_id, event_type, detail, created_at)
      SELECT ${context.roomId}, 'room_ended', 'All puzzles were solved',
             ${timestamp}
      WHERE EXISTS (
        SELECT 1 FROM game_rooms
        WHERE id = ${context.roomId}
          AND status = 'finished'
          AND end_reason = 'completed'
          AND updated_at = ${timestamp}
      )`,
  ]);
  const completedRooms = results[2] as unknown as Array<{ id: string }>;
  return {
    correct: true,
    alreadySolved: false,
    roomFinished: completedRooms.length > 0,
  };
}

export type SafeGameRoom = Omit<GameRoomRow, 'password_hash'>;
