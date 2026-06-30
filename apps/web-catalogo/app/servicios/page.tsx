import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ServiceCard } from '@/components/catalog/ServiceCard';
import { getServices } from '@/lib/data/catalog';

export const metadata = { title: 'Servicios | AppSalon Pro' };

export default async function ServiciosPage() {
  const services = await getServices();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Catálogo"
        title="Servicios de alta gama"
        subtitle="Elige tu servicio y reserva en la sucursal que prefieras."
      />
      {services.length === 0 ? (
        <EmptyState
          title="Aún no hay servicios publicados"
          description="Configura Supabase y publica servicios para verlos aquí."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}
