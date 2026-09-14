'use client';

import Link from 'next/link';
import { Home, RefreshCw, ServerCrash } from 'lucide-react';
import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ServerErrorScreen({
  title = 'The server is taking a break',
  description = 'CodeBreaker could not complete that request. This is usually temporary, so please try again in a moment.',
  retryHref,
  onRetry,
}: {
  title?: string;
  description?: string;
  retryHref?: string;
  onRetry?: () => void;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/20 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AppLogo />
        </div>
        <Card className="border-red-500/30 bg-red-500/[.04] text-center shadow-lg">
          <CardContent className="p-8 sm:p-10">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-500/15 text-red-700 dark:text-red-300">
              <ServerCrash className="size-8" aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-3 leading-7 text-muted-foreground">
              {description}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {onRetry ? (
                <Button type="button" variant="primary" onClick={onRetry}>
                  <RefreshCw aria-hidden="true" /> Try again
                </Button>
              ) : retryHref ? (
                <Button asChild variant="primary">
                  <Link href={retryHref}>
                    <RefreshCw aria-hidden="true" /> Try again
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link href="/">
                  <Home aria-hidden="true" /> Return home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
