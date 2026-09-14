import { Check } from 'lucide-react';

export function PuzzleSuccessCelebration({ title }: { title: string }) {
  return (
    <div
      className="puzzle-success-overlay fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background/90 p-6 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="puzzle-success-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="puzzle-success-message relative z-10 text-center">
        <span className="puzzle-success-check mx-auto grid size-20 place-items-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30">
          <Check className="size-11" strokeWidth={3} aria-hidden="true" />
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Correct!
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">{title} solved</p>
      </div>
    </div>
  );
}
