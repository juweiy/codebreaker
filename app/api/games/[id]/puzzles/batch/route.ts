import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import { replacePuzzles } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';
import type { AnswerType } from '@/lib/domain/types';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PuzzleInput = {
  id?: string;
  title?: string;
  clue?: string;
  description?: string;
  answerType?: AnswerType;
  answer?: string;
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params;
    const body = (await request.json()) as { puzzles?: PuzzleInput[] };
    if (!Array.isArray(body.puzzles)) throw new Error('Puzzles are required');
    if (body.puzzles.length > 100) {
      throw new Error('A game can contain at most 100 puzzles');
    }

    const ids = new Set<string>();
    const puzzleInputs = body.puzzles.map((puzzle) => {
      if (!puzzle.id || !uuidPattern.test(puzzle.id) || ids.has(puzzle.id)) {
        throw new Error('Every puzzle must have a unique valid ID');
      }
      ids.add(puzzle.id);
      if (
        !puzzle.title?.trim() ||
        !puzzle.clue?.trim() ||
        !puzzle.answer?.trim()
      ) {
        throw new Error('Every puzzle needs a title, clue, and answer');
      }
      if (
        puzzle.answerType !== 'text' &&
        puzzle.answerType !== 'number' &&
        puzzle.answerType !== 'ordering'
      ) {
        throw new Error('Every puzzle needs a valid answer type');
      }
      return {
        id: puzzle.id,
        title: puzzle.title,
        clue: puzzle.clue,
        description: puzzle.description ?? '',
        answerType: puzzle.answerType,
        answer: puzzle.answer,
      };
    });

    return NextResponse.json(
      await replacePuzzles(gameId, await requireUserId(), puzzleInputs)
    );
  } catch (error) {
    return apiError(error);
  }
}
