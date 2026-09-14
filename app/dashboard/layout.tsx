import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import Link from 'next/link';
import { DoorOpen, Gamepad2, LayoutDashboard, Plus, Users } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';

export const dynamic = 'force-dynamic';

const items = [
  {
    title: 'My games',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'My rooms',
    url: '/dashboard/rooms',
    icon: DoorOpen,
  },
  {
    title: 'Create game',
    url: '/game/new',
    icon: Plus,
  },
  {
    title: 'Join as player',
    url: '/join',
    icon: Users,
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-svh bg-muted/20 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-background lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="flex items-center justify-between p-5">
          <AppLogo href="/dashboard" />
          <IconTooltip label="Theme settings">
            <ThemeSwitcher />
          </IconTooltip>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard">
          {items.map((item) => (
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start"
              key={item.url}
            >
              <Link href={item.url}>
                <item.icon aria-hidden="true" />
                {item.title}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Gamepad2 className="size-4" aria-hidden="true" />
            Game master
          </div>
          <LogoutButton variant="ghost" className="w-full" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <IconTooltip label="Dashboard">
            <AppLogo href="/dashboard" compactUntilSmall />
          </IconTooltip>
          <div className="flex items-center gap-1">
            <IconTooltip label="My games">
              <Button asChild size="icon" variant="ghost">
                <Link href="/dashboard" aria-label="My games">
                  <LayoutDashboard aria-hidden="true" />
                </Link>
              </Button>
            </IconTooltip>
            <IconTooltip label="My rooms">
              <Button asChild size="icon" variant="ghost">
                <Link href="/dashboard/rooms" aria-label="My rooms">
                  <DoorOpen aria-hidden="true" />
                </Link>
              </Button>
            </IconTooltip>
            <IconTooltip label="Create game">
              <Button asChild size="icon" variant="ghost">
                <Link href="/game/new" aria-label="Create game">
                  <Plus aria-hidden="true" />
                </Link>
              </Button>
            </IconTooltip>
            <IconTooltip label="Theme settings">
              <ThemeSwitcher />
            </IconTooltip>
            <LogoutButton size="sm" variant="ghost" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
