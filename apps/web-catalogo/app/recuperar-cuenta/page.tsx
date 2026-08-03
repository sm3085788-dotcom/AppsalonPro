import { RecoverAccountForm } from '@/components/auth/AuthForms';

export const metadata = { title: 'Recuperar cuenta | AppSalon Pro' };

export default function RecuperarCuentaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <RecoverAccountForm />
    </div>
  );
}
