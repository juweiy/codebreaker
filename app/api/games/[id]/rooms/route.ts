import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import { createRoom } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const input = (await request.json()) as {
      name?: string;
      password?: string;
      durationMinutes?: number | null;
    };
    if (!input.name?.trim()) throw new Error('Room name is required');
    if (
      input.durationMinutes !== null &&
      input.durationMinutes !== undefined &&
      (!Number.isInteger(input.durationMinutes) ||
        input.durationMinutes < 1 ||
        input.durationMinutes > 1440)
    ) {
      throw new Error('Duration must be between 1 and 1440 minutes');
    }
    const room = await createRoom(id, await requireUserId(), {
      name: input.name,
      password: input.password,
      durationMinutes: input.durationMinutes ?? null,
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
