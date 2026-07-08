import { Suspense } from 'react';
import { GiftCardActivatePanel } from '@/components/gift-card/GiftCardActivatePanel';

export const metadata = {
  title: 'Activar tarjeta VIP | AppSalon Pro',
  description: 'Activa tu tarjeta regalo con el código del salón.',
};

export default function GiftCardActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-muted">
          Cargando…
        </div>
      }
    >
      <GiftCardActivatePanel />
    </Suspense>
  );
}
