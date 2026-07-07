import { SectionHeader } from '@/components/ui/SectionHeader';
import { MembresiasPublicCatalog } from '@/components/membresias/MembresiasPublicCatalog';
import { getCurrentUser } from '@/lib/auth';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { whatsappContextFromCliente } from '@/lib/salonContact';

export const metadata = {
  title: 'Membresías | AppSalon Pro',
  description:
    'Conoce los niveles Bronce, Plata y VIP de Andreas. Beneficios exclusivos en salón. Adquiere tu membresía en cualquier sucursal.',
};

export default async function MembresiasPublicPage() {
  const user = await getCurrentUser();
  let customerWhatsappContext = undefined;

  if (user) {
    const supabase = await createSupabaseServerClient();
    const { row } = await ensureClienteFromAuth(supabase, user);
    customerWhatsappContext = whatsappContextFromCliente(row, user.email);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Programa de beneficios"
        title="Membresías Andreas"
        subtitle="Experiencias diseñadas para quienes viven la belleza como ritual. Consulta precios, beneficios y adquiere tu membresía en salón."
      />
      <MembresiasPublicCatalog customerWhatsappContext={customerWhatsappContext} />
    </div>
  );
}
