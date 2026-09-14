import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import { deletePuzzle, savePuzzle } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';
import type { AnswerType } from '@/lib/domain/types';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const input = (await request.json()) as {
      gameId?: string;
      title?: string;
      clue?: string;
      description?: string;
      answerType?: AnswerType;
      answer?: string;
    };
    if (
      !input.gameId ||
      !input.title?.trim() ||
      !input.clue?.trim() ||
      !input.answer?.trim()
    ) {
      throw new Error('Game, title, clue, and answer are required');
    }
    if (
      input.answerType !== 'text' &&
      input.answerType !== 'number' &&
      input.answerType !== 'ordering'
    ) {
      throw new Error('Invalid answer type');
    }
    return NextResponse.json(
      await savePuzzle(await requireUserId(), {
        id,
        gameId: input.gameId,
        title: input.title,
        clue: input.clue,
        description: input.description ?? '',
        answerType: input.answerType,
        answer: input.answer,
      })
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await deletePuzzle(id, await requireUserId());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
