import { LoginForm } from '@/components/auth/AuthForms';

export const metadata = { title: 'Ingresar | AppSalon Pro' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <LoginForm redirectTo={redirect || '/'} />
    </div>
  );
}
