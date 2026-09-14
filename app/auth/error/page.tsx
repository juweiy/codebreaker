import { ServerErrorScreen } from '@/components/server-error-screen';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo =
    params.returnTo?.startsWith('/') && !params.returnTo.startsWith('//')
      ? params.returnTo
      : '/auth/login';

  return (
    <ServerErrorScreen
      title="Authentication is temporarily unavailable"
      description="CodeBreaker could not reach the login service. Your account is safe—please wait a moment and try again."
      retryHref={returnTo}
    />
  );
}
