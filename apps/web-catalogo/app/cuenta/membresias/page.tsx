import { SectionHeader } from '@/components/ui/SectionHeader';
import { MembresiasWebPanel } from '@/components/membresias/MembresiasWebPanel';
import { redirectIfProfileIncomplete } from '@/app/cuenta/actions';

export const metadata = { title: 'Membresías | AppSalon Pro' };

export default async function MembresiasPage() {
  await redirectIfProfileIncomplete('/cuenta/membresias');
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Programa VIP"
        title="Membresías Andreas"
        subtitle="Activa tu código con pago seguro vía QPayPro."
      />
      <MembresiasWebPanel />
    </div>
  );
}
