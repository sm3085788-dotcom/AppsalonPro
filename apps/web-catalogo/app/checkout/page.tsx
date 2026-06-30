import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  computeProductOrder,
  computeBookingAmount,
} from '@/lib/data/orderAmounts';
import { getSelectedBranchId } from '@/lib/data/selectedBranch';
import type { CreatePaymentIntentInput } from '@/lib/types/db';

export const metadata = { title: 'Checkout | AppSalon Pro' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const branchId = sp.branch || (await getSelectedBranchId());
  const supabase = await createSupabaseServerClient();

  let input: CreatePaymentIntentInput | null = null;
  let summary: { lines: { label: string; qty?: number; amount: number }[]; total: number } | null =
    null;
  let errorMsg: string | null = null;

  if (sp.type === 'product' && sp.item) {
    const qty = Math.max(1, Number(sp.qty) || 1);
    const res = await computeProductOrder(
      supabase,
      [{ inventarioId: sp.item, cantidad: qty }],
      branchId ?? null,
    );
    if (res.ok) {
      input = {
        kind: 'product',
        sucursalId: branchId ?? '',
        items: [{ inventarioId: sp.item, cantidad: qty }],
      };
      summary = {
        lines: res.order.lines.map((l) => ({
          label: l.product_name,
          qty: l.qty,
          amount: l.line_total,
        })),
        total: res.order.total,
      };
    } else {
      errorMsg = res.error;
    }
  } else if (sp.type === 'booking' && sp.servicio) {
    const res = await computeBookingAmount(supabase, sp.servicio);
    if (res.ok) {
      input = {
        kind: 'booking',
        sucursalId: branchId ?? '',
        booking: {
          servicioId: sp.servicio,
          servicio: res.nombre,
          fechaHora: sp.fecha || new Date().toISOString(),
          fulfillment: sp.fulfillment === 'domicilio' ? 'domicilio' : 'salon',
          latitud: sp.lat ? Number(sp.lat) : null,
          longitud: sp.lng ? Number(sp.lng) : null,
          direccion: sp.direccion || null,
        },
      };
      summary = {
        lines: [{ label: res.nombre, amount: res.total }],
        total: res.total,
      };
    } else {
      errorMsg = res.error;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Seguir explorando
      </Link>
      <SectionHeader eyebrow="Pago seguro" title="Finaliza tu compra" />
      {input && summary ? (
        <CheckoutForm input={input} summary={summary} />
      ) : (
        <EmptyState
          title="No hay nada para pagar"
          description={
            errorMsg ?? 'Agrega un producto o reserva un servicio para continuar.'
          }
        />
      )}
    </div>
  );
}
