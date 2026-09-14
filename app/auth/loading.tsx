export default function Loading() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div
        className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="font-medium">Loading account form…</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This should only take a moment.
        </p>
      </div>
    </div>
  );
}
