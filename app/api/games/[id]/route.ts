import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import {
  deleteGame,
  getGameBundle,
  updateGame,
  updateGameStatus,
} from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';
import type { GameMode, GameStatus } from '@/lib/domain/types';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    return NextResponse.json(await getGameBundle(id, await requireUserId()));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const input = (await request.json()) as {
      title?: string;
      description?: string;
      finalMessage?: string;
      timeoutMessage?: string;
      mode?: GameMode;
      status?: GameStatus;
    };
    if (!['active', 'archived'].includes(input.status ?? '')) {
      throw new Error('Invalid game status');
    }

    const userId = await requireUserId();
    const isStatusOnly =
      input.title === undefined &&
      input.description === undefined &&
      input.finalMessage === undefined &&
      input.timeoutMessage === undefined &&
      input.mode === undefined;
    if (isStatusOnly) {
      return NextResponse.json(
        await updateGameStatus(id, userId, input.status as GameStatus)
      );
    }

    if (!input.title?.trim()) throw new Error('Title is required');
    if (!input.description && input.description !== '') {
      throw new Error('Description is required');
    }
    if (!input.finalMessage?.trim()) {
      throw new Error('Final message is required');
    }
    if (input.finalMessage.trim().length > 2000) {
      throw new Error('Final message must be 2,000 characters or fewer');
    }
    if (!input.timeoutMessage?.trim()) {
      throw new Error('Time-up message is required');
    }
    if (input.timeoutMessage.trim().length > 2000) {
      throw new Error('Time-up message must be 2,000 characters or fewer');
    }
    if (input.mode !== 'sequential' && input.mode !== 'any') {
      throw new Error('Invalid game mode');
    }
    return NextResponse.json(
      await updateGame(id, userId, {
        title: input.title,
        description: input.description,
        finalMessage: input.finalMessage,
        timeoutMessage: input.timeoutMessage,
        mode: input.mode,
        status: input.status as GameStatus,
      })
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await deleteGame(id, await requireUserId());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
