export interface BookingNotasMeta {
  payment_intent_id?: string;
  deposit_gtq?: number;
  servicio_id?: string | null;
  refunded?: boolean;
  refunded_at?: string;
}

export {
  BOOKING_DEPOSIT_PERCENT,
  BOOKING_DEPOSIT_MIN_GTQ,
  BOOKING_REFUND_HOURS_BEFORE,
  PRECIO_A_TU_MEDIDA_LABEL,
  PRECIO_A_TU_MEDIDA_HINT,
  BOOKING_DEPOSIT_LABEL,
  BOOKING_DEPOSIT_POLICY,
  bookingDepositPolicyText,
  computeBookingDepositGtq,
  bookingRefundEligible,
  bookingRefundTooLateMessage,
  bookingRefundDeadlineIso,
  splitBookingNotas,
  mergeBookingNotas,
} from '../../../shared/config/reservaCheckout.js';

import {
  splitBookingNotas as splitRaw,
} from '../../../shared/config/reservaCheckout.js';

export function parseBookingNotas(raw: string | null | undefined): {
  staff: string;
  meta: BookingNotasMeta;
} {
  const { staff, meta } = splitRaw(raw);
  return { staff, meta: meta as BookingNotasMeta };
}
