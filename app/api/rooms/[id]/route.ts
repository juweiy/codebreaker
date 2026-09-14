import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/require-user';
import {
  deleteRoom,
  getRoomControl,
  omitRoomPassword,
  setRoomStatus,
} from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';
import type { RoomStatus } from '@/lib/domain/types';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    return NextResponse.json(await getRoomControl(id, await requireUserId()));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { status } = (await request.json()) as { status?: RoomStatus };
    if (
      !['waiting', 'in_progress', 'paused', 'finished'].includes(status ?? '')
    ) {
      throw new Error('Invalid room status');
    }
    const room = await setRoomStatus(
      id,
      await requireUserId(),
      status as RoomStatus
    );
    return NextResponse.json(omitRoomPassword(room));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await deleteRoom(id, await requireUserId());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
