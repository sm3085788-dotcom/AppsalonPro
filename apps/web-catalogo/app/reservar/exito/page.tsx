import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata = { title: 'Reserva confirmada | AppSalon Pro' };

export default async function ReservaExitoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
      <div className="mt-6">
        <SectionHeader
          eyebrow="Reserva"
          title="Cita solicitada"
          subtitle="Tu reserva quedó registrada sin pago en línea. Te contactaremos para confirmar horario y detalles."
        />
      </div>
      {sp.id && (
        <p className="mt-4 text-xs text-muted">Referencia: {sp.id}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/cuenta" className="rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal">
          Ver mi cuenta
        </Link>
        <Link href="/servicios" className="text-sm text-muted hover:text-gold">
          Seguir explorando
        </Link>
      </div>
    </div>
  );
}
