'use client';

import { Download, Share2 } from 'lucide-react';

export function GiftCardImageActions({
  busy,
  onDownload,
  onShare,
}: {
  busy?: boolean;
  onDownload: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => void onDownload()}
        disabled={busy}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {busy ? 'Generando…' : 'Descargar imagen'}
      </button>
      <button
        type="button"
        onClick={() => void onShare()}
        disabled={busy}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm text-cream hover:border-gold/40 disabled:opacity-60"
      >
        <Share2 className="h-4 w-4" />
        Guardar para compartir
      </button>
    </div>
  );
}
