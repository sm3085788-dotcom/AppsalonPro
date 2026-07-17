import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ClearCartOnSuccess } from '@/components/checkout/ClearCartOnSuccess';
import { OrderReceiptInvoice } from '@/components/checkout/OrderReceiptInvoice';
import { PersistLastOrderReceipt } from '@/components/checkout/PersistLastOrderReceipt';
import { PickupQrDisplay } from '@/components/tienda/PickupQrDisplay';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getCurrentUser } from '@/lib/auth';
import { getOrderReceiptForUser } from '@/lib/orders/orderReceipt';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata = { title: 'Pago confirmado | AppSalon Pro' };

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ tracking?: string; cash?: string; orderId?: string }>;
}) {
  const params = await searchParams;
  const isCashPickup = params.cash === '1' && Boolean(params.tracking);
  const tracking = params.tracking ?? '';
  const orderId = params.orderId?.trim() ?? '';

  let receipt = null;
  const user = await getCurrentUser();
  if (isSupabaseConfigured && user && orderId) {
    try {
      const supabase = await createSupabaseServerClient();
      receipt = await getOrderReceiptForUser(supabase, user.id, orderId);
    } catch {
      receipt = null;
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <PersistLastOrderReceipt />
        </Suspense>
        <ClearCartOnSuccess />
        <SectionHeader
          eyebrow="Tienda"
          title="Tu pedido"
          subtitle="Comprobante de tu gestión con detalle de productos."
        />
        <div className="mt-8">
          <OrderReceiptInvoice
            receipt={receipt}
            showPickupQr={isCashPickup && Boolean(receipt.trackingCode)}
          />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/productos"
            className="inline-flex rounded-xl border border-border px-6 py-3 text-sm text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            Seguir comprando
          </Link>
          <Link
            href="/cuenta?tab=pedidos"
            className="inline-flex rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal hover:bg-gold-soft"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <Suspense fallback={null}>
        <PersistLastOrderReceipt />
      </Suspense>
      <ClearCartOnSuccess />
      <CheckCircle2 className="h-16 w-16 text-emerald-400" />
      <h1 className="mt-6 text-3xl font-light text-cream">
        {isCashPickup ? '¡Pedido registrado!' : '¡Gracias por tu compra!'}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {isCashPickup
          ? 'Tu pedido quedó pendiente de pago. Mostrá el código QR en recepción al retirar y pagar en efectivo.'
          : 'Tu pago fue procesado. Recibirás la confirmación y el seguimiento en tu cuenta. El salón ya fue notificado.'}
      </p>

      {isCashPickup ? (
        <PickupQrDisplay
          trackingCode={tracking}
          hint="El salón escaneará este QR para confirmar tu pago y entregar el pedido."
        />
      ) : null}

      <div className="mt-8 flex gap-3">
        <Link
          href="/productos"
          className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:border-gold hover:text-gold"
        >
          Seguir comprando
        </Link>
        <Link
          href="/cuenta?tab=pedidos"
          className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-soft"
        >
          Ver mis pedidos
        </Link>
      </div>
    </div>
  );
}
