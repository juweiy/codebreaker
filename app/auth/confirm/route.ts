import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  redirect(requestedNext.startsWith('/') ? requestedNext : '/dashboard');
}
