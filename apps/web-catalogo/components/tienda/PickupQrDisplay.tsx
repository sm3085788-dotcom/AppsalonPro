import { pickupQrImageUrl } from '@/lib/pickupQr';
import { ExpandableCompactQr } from '@/components/ui/ExpandableCompactQr';

export function PickupQrDisplay({
  trackingCode,
  size = 200,
  hint,
  compact = false,
  inline = false,
}: {
  trackingCode: string;
  size?: number;
  hint?: string;
  /** Mismo formato compacto que el QR de citas en Mi cuenta. */
  compact?: boolean;
  /** QR pequeño embebido en cabecera de comprobante. */
  inline?: boolean;
}) {
  const code = String(trackingCode || '').trim().toUpperCase();
  const qrSize = inline ? (compact ? 64 : 80) : compact ? 88 : size;
  const uri = pickupQrImageUrl(trackingCode, qrSize);
  if (!code) return null;

  if (inline) {
    if (!uri) return null;
    return (
      <ExpandableCompactQr
        src={uri}
        srcLarge={pickupQrImageUrl(trackingCode, 280) ?? uri}
        alt={`Código QR de retiro ${code}`}
        subtitle={code}
        size={qrSize}
        showHint={false}
      />
    );
  }

  if (compact) {
    if (!uri) return null;
    return (
      <ExpandableCompactQr
        src={uri}
        srcLarge={pickupQrImageUrl(trackingCode, 280) ?? uri}
        alt={`Código QR de retiro ${code}`}
        hint={hint || 'Escanealo en salón'}
        subtitle={code}
        size={qrSize}
      />
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-border bg-surface p-6">
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uri}
          alt={`Código QR de retiro ${code}`}
          width={size}
          height={size}
          className="rounded-xl"
        />
      ) : null}
      <p className="mt-4 font-medium tracking-[0.2em] text-cream">{code}</p>
      <p className="mt-2 max-w-sm text-center text-sm text-muted">
        {hint || 'Mostrá este QR en el salón al pagar o retirar.'}
      </p>
    </div>
  );
}
