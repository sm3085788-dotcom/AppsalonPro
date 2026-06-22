import { forwardRef, useImperativeHandle } from 'react';
import { View, Text } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { spacing } from '@appsalon/design-tokens';
import { checkoutDomicilioConStripe } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';

export const TiendaDomicilioStripePay = forwardRef(function TiendaDomicilioStripePay(_props, ref) {
  const stripe = useStripe();
  const { colors: c } = useTheme();

  useImperativeHandle(ref, () => ({
    checkout: (checkoutPayload) =>
      checkoutDomicilioConStripe({
        stripe,
        checkoutPayload,
        merchantDisplayName: 'Aura Salón',
      }),
  }));

  return (
    <View>
      <Text style={{ fontSize: 13, color: c.foregroundMuted, lineHeight: 20 }}>
        Pagás en quetzales (GTQ) de forma segura con Stripe. Al confirmar se abre la pantalla de pago; tu pedido
        queda en preparación sin código QR.
      </Text>
      <Text style={{ fontSize: 12, color: c.foregroundSubtle, marginTop: spacing.xs, lineHeight: 18 }}>
        Modo prueba: podés usar 4242 4242 4242 4242 · cualquier fecha futura · cualquier CVC.
      </Text>
    </View>
  );
});
