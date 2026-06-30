import { RegisterForm } from '@/components/auth/AuthForms';

export const metadata = { title: 'Crear cuenta | AppSalon Pro' };

export default function RegistroPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  );
}
