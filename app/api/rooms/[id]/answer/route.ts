import { NextResponse } from 'next/server';
import { submitAnswer } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const input = (await request.json()) as {
      puzzleId?: string;
      playerId?: string;
      sessionToken?: string;
      answer?: string;
    };
    if (
      !input.puzzleId ||
      !input.playerId ||
      !input.sessionToken ||
      !input.answer?.trim()
    ) {
      throw new Error('Puzzle, player session, and answer are required');
    }
    return NextResponse.json(
      await submitAnswer({
        roomId: id,
        puzzleId: input.puzzleId,
        playerId: input.playerId,
        sessionToken: input.sessionToken,
        answer: input.answer,
      })
    );
  } catch (error) {
    return apiError(error);
  }
}
