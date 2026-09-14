import type { PlayerSession } from '@/lib/domain/types';

const roomSessionPrefix = 'codebreaker:session:';
const roomCodeSessionPrefix = 'codebreaker:session-code:';

function normalizeRoomCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function parseSession(value: string | null): PlayerSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PlayerSession>;
    if (
      typeof parsed.roomId !== 'string' ||
      typeof parsed.playerId !== 'string' ||
      typeof parsed.sessionToken !== 'string'
    ) {
      return null;
    }
    return parsed as PlayerSession;
  } catch {
    return null;
  }
}

export function getSavedPlayerSessionForRoom(roomId: string) {
  if (typeof window === 'undefined') return null;
  const key = `${roomSessionPrefix}${roomId}`;
  const session = parseSession(window.localStorage.getItem(key));
  if (!session) window.localStorage.removeItem(key);
  return session;
}

export function getSavedPlayerSessionForCode(roomCode: string) {
  if (typeof window === 'undefined') return null;
  const code = normalizeRoomCode(roomCode);
  if (code.length !== 6) return null;
  const key = `${roomCodeSessionPrefix}${code}`;
  const session = parseSession(window.localStorage.getItem(key));
  if (!session) window.localStorage.removeItem(key);
  return session;
}

export function savePlayerSession(session: PlayerSession, roomCode: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    `${roomSessionPrefix}${session.roomId}`,
    JSON.stringify(session)
  );
  const code = normalizeRoomCode(roomCode);
  if (code.length === 6) {
    window.localStorage.setItem(
      `${roomCodeSessionPrefix}${code}`,
      JSON.stringify(session)
    );
  }
}

export function clearPlayerSession(session: PlayerSession, roomCode: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${roomSessionPrefix}${session.roomId}`);

  const code = normalizeRoomCode(roomCode);
  const codeKey = `${roomCodeSessionPrefix}${code}`;
  const savedForCode = parseSession(window.localStorage.getItem(codeKey));
  if (
    savedForCode?.roomId === session.roomId &&
    savedForCode.playerId === session.playerId
  ) {
    window.localStorage.removeItem(codeKey);
  }
}
