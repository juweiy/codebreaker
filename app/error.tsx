'use client';

import { ServerErrorScreen } from '@/components/server-error-screen';

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ServerErrorScreen onRetry={retry} />;
}
