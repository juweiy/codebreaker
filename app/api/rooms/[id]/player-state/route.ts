import { NextResponse } from 'next/server';
import { getPlayerRoomState } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const input = (await request.json()) as {
      playerId?: string;
      sessionToken?: string;
    };
    if (!input.playerId || !input.sessionToken) {
      throw new Error('Player session not found');
    }
    return NextResponse.json(
      await getPlayerRoomState(id, input.playerId, input.sessionToken)
    );
  } catch (error) {
    return apiError(error);
  }
}
