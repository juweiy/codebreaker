import { LoginForm } from '@/components/auth/login-form';
import { Button } from '@/components/ui/button';
import { Route } from '@/lib/string-utils';
import { getCurrentUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function Page() {
  if (await getCurrentUser()) redirect(Route.Dashboard);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Button className="mb-4 -ml-3" variant="ghost" asChild>
          <Link href={Route.Landing}>
            <ArrowLeft aria-hidden="true" />
            Back to home
          </Link>
        </Button>
        <LoginForm />
      </div>
    </div>
  );
}
