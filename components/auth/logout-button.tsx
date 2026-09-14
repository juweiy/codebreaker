'use client';

import { Route } from '@/lib/string-utils';
import { authClient } from '@/lib/auth/client';
import {
  getAuthServerErrorPath,
  isAuthServerUnavailable,
} from '@/lib/auth/errors';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { ButtonProps } from '@/components/ui/button';

export function LogoutButton(props: ButtonProps) {
  const router = useRouter();

  const logout = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
      router.push(Route.Landing);
      router.refresh();
    } catch (error: unknown) {
      if (isAuthServerUnavailable(error)) {
        router.push(getAuthServerErrorPath('/dashboard'));
        return;
      }
      throw error;
    }
  };

  return (
    <Button {...props} onClick={logout}>
      Log out
    </Button>
  );
}
