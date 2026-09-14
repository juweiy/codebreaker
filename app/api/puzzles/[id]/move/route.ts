import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import { movePuzzle } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { direction } = (await request.json()) as { direction?: -1 | 1 };
    if (direction !== -1 && direction !== 1) {
      throw new Error('Direction must be -1 or 1');
    }
    await movePuzzle(id, await requireUserId(), direction);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
