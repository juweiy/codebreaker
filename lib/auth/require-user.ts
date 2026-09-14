import 'server-only';

import { getCurrentUser } from './server';

export async function requireUserId() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Unauthorized');
  return user.id;
}
