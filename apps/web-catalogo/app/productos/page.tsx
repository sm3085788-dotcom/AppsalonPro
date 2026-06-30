import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductCard } from '@/components/catalog/ProductCard';
import { getProducts } from '@/lib/data/catalog';
import { getSelectedBranch } from '@/lib/data/selectedBranch';

export const metadata = { title: 'Productos | AppSalon Pro' };

export default async function ProductosPage() {
  const branch = await getSelectedBranch();
  const products = await getProducts(branch?.id ?? null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Tienda"
        title="Productos premium"
        subtitle={
          branch
            ? `Disponibilidad para la sucursal ${branch.nombre}.`
            : 'Selecciona una sucursal para ver disponibilidad.'
        }
      />
      {products.length === 0 ? (
        <EmptyState
          title="Sin productos disponibles"
          description="No hay productos publicados para esta sucursal por ahora."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
