'use client';

import { Share2 } from 'lucide-react';

export function GiftCardDualImageActions({
  busy,
  onShare,
}: {
  busy?: boolean;
  onShare: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onShare()}
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-semibold text-charcoal disabled:opacity-60"
    >
      <Share2 className="h-4 w-4" />
      {busy ? 'Generando…' : 'Compartir frente y reverso'}
    </button>
  );
}
