import { CheckCircle2, Receipt } from 'lucide-react';
import { PickupQrDisplay } from '@/components/tienda/PickupQrDisplay';
import { formatFechaHora, formatQ } from '@/lib/format';
import type { OrderReceipt } from '@/lib/orders/orderReceipt';

export function OrderReceiptInvoice({
  receipt,
  showPickupQr = false,
  compact = false,
}: {
  receipt: OrderReceipt;
  showPickupQr?: boolean;
  compact?: boolean;
}) {
  const isCashPickup =
    receipt.paymentMethod === 'efectivo' && receipt.fulfillmentType !== 'domicilio';

  return (
    <div className="w-full text-left">
      <div
        className={`flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 ${
          compact ? 'p-3' : 'gap-3 rounded-2xl p-4'
        }`}
      >
        <CheckCircle2
          className={`shrink-0 text-emerald-400 ${compact ? 'mt-0.5 h-4 w-4' : 'mt-0.5 h-6 w-6'}`}
          aria-hidden
        />
        <div>
          <p className={`font-light text-cream ${compact ? 'text-sm' : 'text-lg'}`}>
            {isCashPickup ? '¡Pedido registrado!' : '¡Gracias por tu compra!'}
          </p>
          <p className={`text-muted ${compact ? 'mt-0.5 text-xs leading-snug' : 'mt-1 text-sm'}`}>
            {isCashPickup
              ? 'Tu gestión quedó registrada. Mostrá el QR en recepción al retirar y pagá en efectivo.'
              : 'Tu pago fue procesado. Guardá este comprobante para tu seguimiento.'}
          </p>
        </div>
      </div>

      <article
        className={`overflow-hidden rounded-xl border border-border bg-surface ${
          compact ? 'mt-3' : 'mt-6 rounded-2xl'
        }`}
      >
        <header
          className={`border-b border-border bg-surface-2/60 ${
            compact ? 'px-3 py-2.5' : 'px-5 py-4 sm:px-6'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-1.5">
              <Receipt
                className={`shrink-0 text-gold ${compact ? 'h-4 w-4' : 'h-5 w-5'}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p
                  className={`uppercase tracking-[0.16em] text-muted ${
                    compact ? 'text-[10px]' : 'text-xs'
                  }`}
                >
                  Comprobante de pedido
                </p>
                <p
                  className={`text-cream ${compact ? 'text-sm font-medium' : 'mt-0.5 font-medium'}`}
                >
                  {receipt.trackingCode || `Pedido ${receipt.id.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className={`text-right text-muted ${compact ? 'text-xs' : 'text-sm'}`}>
                <p>{formatFechaHora(receipt.createdAt)}</p>
                {receipt.customerName ? (
                  <p className="text-foreground">{receipt.customerName}</p>
                ) : null}
              </div>
              {showPickupQr && receipt.trackingCode ? (
                <PickupQrDisplay
                  trackingCode={receipt.trackingCode}
                  inline
                  compact={compact}
                />
              ) : null}
            </div>
          </div>
        </header>

        <div className={`${compact ? 'space-y-3 px-3 py-3' : 'space-y-4 px-5 py-5 sm:px-6'}`}>
          <ul className={compact ? 'space-y-2.5' : 'space-y-4'}>
            {receipt.lines.map((line) => (
              <li key={`${line.productId}-${line.productName}`} className="flex gap-3">
                <div
                  className={`shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 ${
                    compact ? 'h-14 w-14' : 'h-20 w-20 rounded-xl'
                  }`}
                >
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                      Sin foto
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-cream ${compact ? 'text-sm font-medium' : 'font-medium'}`}>
                    {line.productName}
                  </p>
                  {line.description ? (
                    <p
                      className={`line-clamp-2 text-muted ${
                        compact ? 'mt-0.5 text-[11px] leading-snug' : 'mt-1 text-xs leading-relaxed'
                      }`}
                    >
                      {line.description}
                    </p>
                  ) : null}
                  <p className={`text-muted ${compact ? 'mt-1 text-[11px]' : 'mt-2 text-xs'}`}>
                    {formatQ(line.unitPrice)} × {line.qty}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-medium text-gold ${
                    compact ? 'text-xs' : 'text-sm'
                  }`}
                >
                  {formatQ(line.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <div
            className={`flex items-center justify-between border-t border-border ${
              compact ? 'pt-3' : 'pt-4'
            }`}
          >
            <span className={`text-cream ${compact ? 'text-sm' : ''}`}>Total</span>
            <span className={`font-light text-gold ${compact ? 'text-lg' : 'text-xl'}`}>
              {formatQ(receipt.totalAmount)}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
