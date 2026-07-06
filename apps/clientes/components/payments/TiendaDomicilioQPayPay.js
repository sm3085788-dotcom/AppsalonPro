import React, { forwardRef, useImperativeHandle } from 'react';
import { Linking } from 'react-native';
import { Text, View } from 'react-native';
import { checkoutDomicilioConQPayPro } from '@appsalon/shared-config';

/** Checkout domicilio vía QPayPro (redirect). */
export const TiendaDomicilioQPayPay = forwardRef(function TiendaDomicilioQPayPay(_props, ref) {
  useImperativeHandle(ref, () => ({
    checkout: ({ checkoutPayload, returnUrl }) =>
      checkoutDomicilioConQPayPro({
        checkoutPayload,
        returnUrl,
        openUrl: (url) => Linking.openURL(url),
      }),
  }));

  return (
    <View>
      <Text style={{ color: '#a8a29a', fontSize: 12, lineHeight: 18 }}>
        Pagás en quetzales (GTQ) con QPayPro. Al confirmar se abre el checkout seguro; tu pedido se registra al
        completar el pago.
      </Text>
    </View>
  );
});

/** @deprecated */
export const TiendaDomicilioStripePay = TiendaDomicilioQPayPay;
