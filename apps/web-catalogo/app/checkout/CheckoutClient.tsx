'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { useBranch } from '@/components/branch/BranchContext';
import { useTiendaCart } from '@/components/tienda/TiendaCartContext';

export function CheckoutClient({ shippingFeeGtq }: { shippingFeeGtq: number }) {
  const router = useRouter();
  const { selectedBranchId } = useBranch();
  const { cartItems, cartCount, cartHydrated } = useTiendaCart();

  useEffect(() => {
    if (!cartHydrated) return;
    if (cartCount === 0) router.replace('/carrito');
  }, [cartCount, cartHydrated, router]);

  const items = useMemo(
    () => cartItems.map((i) => ({ inventarioId: i.id, cantidad: i.qty })),
    [cartItems],
  );

  const summary = useMemo(() => {
    const lines = cartItems.map((i) => ({
      label: i.title,
      qty: i.qty,
      amount: Math.round(i.priceAmount * i.qty * 100) / 100,
    }));
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    return { lines, subtotal, shippingFee: shippingFeeGtq, total: subtotal };
  }, [cartItems, shippingFeeGtq]);

  if (!selectedBranchId || !cartHydrated || cartCount === 0) {
    return null;
  }

  return (
    <>
      <Link
        href="/carrito"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al carrito
      </Link>
      <CheckoutForm sucursalId={selectedBranchId} items={items} summary={summary} />
    </>
  );
}
