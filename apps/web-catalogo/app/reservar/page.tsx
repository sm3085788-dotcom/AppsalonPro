import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookingForm } from '@/components/booking/BookingForm';
import { getServices } from '@/lib/data/catalog';

export const metadata = { title: 'Reservar | AppSalon Pro' };

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string }>;
}) {
  const { servicio } = await searchParams;
  const services = await getServices();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Agenda"
        title="Reserva tu cita"
        subtitle="Elige sucursal, servicio y modalidad. El salón se entera al instante."
      />
      {services.length === 0 ? (
        <EmptyState
          title="No hay servicios para reservar"
          description="Publica servicios en Supabase para habilitar la reserva."
        />
      ) : (
        <BookingForm services={services} initialServiceId={servicio} />
      )}
    </div>
  );
}
