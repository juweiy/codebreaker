'use client';

import './globals.css';
import { ServerErrorScreen } from '@/components/server-error-screen';

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServerErrorScreen onRetry={retry} />
      </body>
    </html>
  );
}
