import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY, isStripeConfigured } from '@appsalon/shared-config';

export function StripeRoot({ children }) {
  if (!isStripeConfigured()) {
    return children;
  }
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.appsalonpro.clientes">
      {children}
    </StripeProvider>
  );
}
