export function isAuthServerUnavailable(error: unknown): boolean {
  const details =
    error && typeof error === 'object'
      ? (error as {
          message?: unknown;
          status?: unknown;
          statusCode?: unknown;
        })
      : null;
  const message =
    typeof details?.message === 'string'
      ? details.message
      : error instanceof Error
        ? error.message
        : String(error ?? '');
  const status = Number(details?.status ?? details?.statusCode ?? 0);

  return (
    status >= 500 ||
    /unable to connect to authentication server|failed to fetch|fetch failed|network error|network request failed|service unavailable|econnrefused/i.test(
      message
    )
  );
}

export function getAuthServerErrorPath(returnTo: string): string {
  return `/auth/error?returnTo=${encodeURIComponent(returnTo)}`;
}
