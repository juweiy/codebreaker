import { NextResponse } from 'next/server';
import { joinRoom } from '@/lib/db/codebreaker';
import { apiError } from '@/lib/api/response';

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      code?: string;
      password?: string;
      displayName?: string;
    };
    if (!input.code || input.code.length !== 6 || !input.displayName?.trim()) {
      throw new Error('A six-character room code and your name are required');
    }
    return NextResponse.json(
      await joinRoom({
        code: input.code,
        password: input.password ?? '',
        displayName: input.displayName,
      }),
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
