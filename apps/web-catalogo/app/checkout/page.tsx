import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Checkout | AppSalon Pro' };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a productos
      </Link>
      <SectionHeader
        eyebrow="Tienda web"
        title="Compra en línea no disponible"
        subtitle="Por ahora puedes ver nuestro catálogo y adquirir productos directamente en el salón."
      />
      <EmptyState
        title="Catálogo informativo"
        description="La compra online de productos estará habilitada próximamente. Visítanos en recepción o reserva un servicio desde la web."
      />
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/productos"
          className="rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal"
        >
          Ver productos
        </Link>
        <Link href="/reservar" className="text-sm text-muted hover:text-gold">
          Agendar cita
        </Link>
      </div>
    </div>
  );
}
