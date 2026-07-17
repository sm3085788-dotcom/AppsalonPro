'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveLastWebOrderSession } from '@/lib/orders/lastOrderReceiptSession';

/** Guarda el pedido recién confirmado para mostrarlo en carrito vacío u otras pantallas. */
export function PersistLastOrderReceipt() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('orderId')?.trim();
    if (!orderId) return;
    saveLastWebOrderSession({
      orderId,
      trackingCode: searchParams.get('tracking'),
      cash: searchParams.get('cash') === '1',
    });
  }, [searchParams]);

  return null;
}
