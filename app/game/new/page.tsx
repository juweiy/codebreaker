'use client';

import { NewGameForm } from '@/components/new-game-form';
import { Button } from '@/components/ui/button';
import { Route } from '@/lib/string-utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';

export default function Page() {
  return (
    <main className="min-h-svh bg-muted/20">
      <header className="border-b bg-background">
        <div className="page-shell flex h-16 items-center justify-between">
          <AppLogo href={Route.Dashboard} />
        </div>
      </header>
      <div className="page-shell max-w-2xl py-8 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href={Route.Dashboard}>
            <ArrowLeft aria-hidden="true" /> Games
          </Link>
        </Button>
        <NewGameForm className="w-full" />
      </div>
    </main>
  );
}
