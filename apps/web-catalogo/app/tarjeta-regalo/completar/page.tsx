import { Suspense } from 'react';
import { GiftCardActivatePanel } from '@/components/gift-card/GiftCardActivatePanel';

export const metadata = {
  title: 'Completar tarjeta de regalo | AppSalon Pro',
  description: 'Ingresá tu código ACT y completá los datos de tu tarjeta VIP.',
};

export default function GiftCardCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-muted">
          Cargando…
        </div>
      }
    >
      <GiftCardActivatePanel mode="complete" />
    </Suspense>
  );
}
