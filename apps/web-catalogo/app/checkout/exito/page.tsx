import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const metadata = { title: 'Pago confirmado | AppSalon Pro' };

export default function CheckoutExitoPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <CheckCircle2 className="h-16 w-16 text-emerald-400" />
      <h1 className="mt-6 text-3xl font-light text-cream">¡Gracias por tu compra!</h1>
      <p className="mt-3 text-sm text-muted">
        Tu pago fue procesado. Recibirás la confirmación y el seguimiento en tu
        cuenta. El salón ya fue notificado en tiempo real.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/productos"
          className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:border-gold hover:text-gold"
        >
          Seguir comprando
        </Link>
        <Link
          href="/cuenta"
          className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-soft"
        >
          Ver mi cuenta
        </Link>
      </div>
    </div>
  );
}
