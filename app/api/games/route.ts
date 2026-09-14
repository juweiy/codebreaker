import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import { createGame, listGames } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';
import type { GameMode } from '@/lib/domain/types';

export async function GET() {
  try {
    return NextResponse.json(await listGames(await requireUserId()));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      title?: string;
      description?: string;
      finalMessage?: string;
      timeoutMessage?: string;
      mode?: GameMode;
    };
    if (!input.title?.trim()) throw new Error('Title is required');
    if (input.mode !== 'sequential' && input.mode !== 'any') {
      throw new Error('Invalid game mode');
    }
    if (input.finalMessage && input.finalMessage.trim().length > 2000) {
      throw new Error('Final message must be 2,000 characters or fewer');
    }
    if (input.timeoutMessage && input.timeoutMessage.trim().length > 2000) {
      throw new Error('Time-up message must be 2,000 characters or fewer');
    }
    const game = await createGame(await requireUserId(), {
      title: input.title,
      description: input.description,
      finalMessage: input.finalMessage,
      timeoutMessage: input.timeoutMessage,
      mode: input.mode,
    });
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
