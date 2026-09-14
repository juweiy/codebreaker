import { Button } from '@/components/ui/button';
import { HeroHook } from '@/components/hero-hook';
import { Route } from '@/lib/string-utils';
import { ArrowRight, Radio, ScanLine, Users } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <>
      <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center py-20 lg:py-28">
        <div className="page-shell flex max-w-5xl flex-col items-center text-center">
          <HeroHook />
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Keep the clues in the real world while CodeBreaker handles answers,
            unlocks, timing, and your whole team&apos;s progress.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary">
              <Link href={Route.SignUp}>
                Build a game <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={Route.Join}>Join with a room code</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-20">
        <div className="page-shell grid gap-8 md:grid-cols-3">
          {[
            {
              icon: ScanLine,
              title: 'Bring any story to life',
              body: 'Create text or number puzzles that connect naturally to props, locks, QR clues, and physical spaces.',
            },
            {
              icon: Users,
              title: 'One shared team progress',
              body: 'Every solve and unlock reaches the whole room so players always see the same game state.',
            },
            {
              icon: Radio,
              title: 'Run it from anywhere',
              body: 'Launch, pause, and monitor rooms live while players join from their own phones.',
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border bg-card p-6"
            >
              <feature.icon className="size-6" aria-hidden="true" />
              <h2 className="mt-5 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
