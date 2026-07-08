'use client';

import { Download, Share2 } from 'lucide-react';

export function GiftCardDualImageActions({
  busy,
  onDownloadBoth,
  onShare,
}: {
  busy?: boolean;
  onDownloadBoth: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onDownloadBoth()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-semibold text-charcoal disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {busy ? 'Generando…' : 'Descargar ambas'}
      </button>
      <button
        type="button"
        onClick={() => void onShare()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/5 py-2.5 text-sm text-cream hover:border-gold/50 disabled:opacity-60"
      >
        <Share2 className="h-4 w-4" />
        Compartir frente y reverso
      </button>
    </div>
  );
}
