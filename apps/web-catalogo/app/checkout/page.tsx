import { SectionHeader } from '@/components/ui/SectionHeader';
import { env } from '@/lib/env';
import { CheckoutClient } from './CheckoutClient';

export const metadata = { title: 'Checkout | AppSalon Pro' };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Tienda web"
        title="Checkout"
        subtitle="Elegí modalidad de entrega y forma de pago."
      />
      <div className="mt-8">
        <CheckoutClient shippingFeeGtq={env.productShippingFeeGtq} />
      </div>
    </div>
  );
}
