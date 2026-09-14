import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import { savePuzzle } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';
import type { AnswerType } from '@/lib/domain/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const input = (await request.json()) as {
      title?: string;
      clue?: string;
      description?: string;
      answerType?: AnswerType;
      answer?: string;
    };
    if (!input.title?.trim() || !input.clue?.trim() || !input.answer?.trim()) {
      throw new Error('Title, clue, and answer are required');
    }
    if (
      input.answerType !== 'text' &&
      input.answerType !== 'number' &&
      input.answerType !== 'ordering'
    ) {
      throw new Error('Invalid answer type');
    }
    const puzzle = await savePuzzle(await requireUserId(), {
      gameId: id,
      title: input.title,
      clue: input.clue,
      description: input.description ?? '',
      answerType: input.answerType,
      answer: input.answer,
    });
    return NextResponse.json(puzzle, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
