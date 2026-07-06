import { SectionHeader } from '@/components/ui/SectionHeader';
import { MembresiasPublicCatalog } from '@/components/membresias/MembresiasPublicCatalog';

export const metadata = {
  title: 'Membresías | AppSalon Pro',
  description:
    'Conoce los niveles Bronce, Plata y VIP de Andreas. Beneficios exclusivos en salón. Adquiere tu membresía en cualquier sucursal.',
};

export default function MembresiasPublicPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Programa de beneficios"
        title="Membresías Andreas"
        subtitle="Experiencias diseñadas para quienes viven la belleza como ritual. Consulta precios, beneficios y adquiere tu membresía en salón."
      />
      <MembresiasPublicCatalog />
    </div>
  );
}
