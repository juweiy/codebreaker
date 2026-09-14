import Link from 'next/link';
import { Button } from '../ui/button';
import { Route } from '@/lib/string-utils';
import { LogoutButton } from './logout-button';

export const AuthButton = ({
  user,
}: {
  user: { email?: string | null } | null;
}) => {
  return user ? (
    <div className="flex items-center gap-4">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {user.email || 'Game master'}
      </span>
      <Button asChild size="sm" aria-label="Go to dashboard">
        <Link href={Route.Dashboard}>Dashboard</Link>
      </Button>
      <LogoutButton variant="ghost" />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={'outline'} aria-label="Log in">
        <Link href={Route.Login}>Log in</Link>
      </Button>
      <Button asChild size="sm" variant={'default'} aria-label="Sign up">
        <Link href={Route.SignUp}>Sign up</Link>
      </Button>
    </div>
  );
};

export default AuthButton;
