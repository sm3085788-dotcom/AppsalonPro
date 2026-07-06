import { redirect } from 'next/navigation';

/** @deprecated Checkout con pago — redirige a vista previa sin cobro. */
export default function GiftCardCheckoutPage() {
  redirect('/tarjeta-regalo/preview');
}
