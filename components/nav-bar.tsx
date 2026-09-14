import { hasEnvVars } from '@/lib/utils';
import { EnvVarWarning } from './env-var-warning';
import { AuthButton } from './auth/auth-button';
import { AppLogo } from './app-logo';
import { Button } from './ui/button';
import Link from 'next/link';
import { Route } from '@/lib/string-utils';
import { getCurrentUser } from '@/lib/auth/server';

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav
      className="w-full border-b border-border/70 bg-background/90 backdrop-blur"
      aria-label="Primary"
    >
      <div className="page-shell flex h-16 items-center justify-between gap-2">
        <AppLogo href={user ? Route.Dashboard : Route.Landing} />
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={Route.Join}>
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Join a room</span>
            </Link>
          </Button>
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton user={user} />}
        </div>
      </div>
    </nav>
  );
}
