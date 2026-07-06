type CartLine = {
  id: string;
  title?: string;
  qty: number;
  priceAmount?: number;
};

type AndreasCanjeSnap = {
  descuento_pct?: number;
  descuento_monto?: number;
  subtotal_antes?: number;
};

export function applyDiscountToSubtotal(subtotal: number, descuentoPct: number) {
  const sub = Math.max(0, Number(subtotal) || 0);
  const pct = Math.max(0, Math.min(100, Number(descuentoPct) || 0));
  const discount = Math.round(sub * pct) / 100;
  const total = Math.max(0, Math.round((sub - discount) * 100) / 100);
  return { subtotal: sub, descuento_pct: pct, discount, total };
}

export function gtqToMinorUnits(totalQuetzales: number) {
  return Math.max(1, Math.round(Number(totalQuetzales) * 100));
}

export type { CartLine, AndreasCanjeSnap };
