export type GameMode = 'sequential' | 'any';
export type GameStatus = 'active' | 'archived';
export type AnswerType = 'text' | 'number' | 'ordering';
export type RoomStatus = 'waiting' | 'in_progress' | 'paused' | 'finished';
export type RoomEndReason = 'admin' | 'completed' | 'timeout';
export type RoomEventType =
  | 'room_created'
  | 'room_started'
  | 'room_paused'
  | 'room_resumed'
  | 'room_ended'
  | 'player_joined'
  | 'answer_attempted';

export const DEFAULT_FINAL_MESSAGE = 'Congratulations! You completed the game.';
export const DEFAULT_TIMEOUT_MESSAGE =
  "Time's up! The game ended before you solved every puzzle.";

export type Game = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  final_message: string;
  timeout_message: string;
  mode: GameMode;
  status: GameStatus;
  created_at: string;
  updated_at: string;
};

export type Puzzle = {
  id: string;
  game_id: string;
  position: number;
  title: string;
  clue: string;
  description: string;
  answer_type: AnswerType;
  answer_normalized: string;
  created_at: string;
  updated_at: string;
};

export type GameRoom = {
  id: string;
  game_id: string;
  owner_id: string;
  name: string;
  code: string;
  status: RoomStatus;
  duration_minutes: number | null;
  started_at: string | null;
  ends_at: string | null;
  paused_at: string | null;
  end_reason: RoomEndReason | null;
  created_at: string;
  updated_at: string;
};

export type RoomPlayer = {
  id: string;
  room_id: string;
  display_name: string;
  joined_at: string;
  last_seen_at: string;
};

export type RoomSolve = {
  id: string;
  room_id: string;
  puzzle_id: string;
  player_id: string;
  solved_at: string;
};

export type RoomEvent = {
  id: string;
  room_id: string;
  event_type: RoomEventType;
  player_id: string | null;
  puzzle_id: string | null;
  answer: string | null;
  answer_correct: boolean | null;
  detail: string | null;
  created_at: string;
  player_name: string | null;
  puzzle_title: string | null;
};

export type PlayerPuzzle = {
  id: string;
  position: number;
  title: string;
  clue: string;
  description: string;
  answerType: AnswerType;
  orderingItems: string[] | null;
  solved: boolean;
  unlocked: boolean;
};

export type PlayerRoomState = {
  room: {
    id: string;
    name: string;
    code: string;
    status: RoomStatus;
    startedAt: string | null;
    endsAt: string | null;
    pausedAt: string | null;
    endReason: RoomEndReason | null;
  };
  game: {
    id: string;
    title: string;
    description: string;
    finalMessage: string;
    timeoutMessage: string;
    mode: GameMode;
  };
  player: { id: string; displayName: string };
  playerCount: number;
  puzzles: PlayerPuzzle[];
};

export type PlayerSession = {
  roomId: string;
  playerId: string;
  sessionToken: string;
};
