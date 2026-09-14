import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api/response';
import { requireUserId } from '@/lib/auth/require-user';
import { listRooms } from '@/lib/db/codebreaker';

export async function GET() {
  try {
    return NextResponse.json(await listRooms(await requireUserId()));
  } catch (error) {
    return apiError(error);
  }
}
