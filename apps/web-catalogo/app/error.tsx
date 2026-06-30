'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <AlertTriangle className="h-14 w-14 text-gold" />
      <h1 className="mt-6 text-2xl font-light text-cream">
        Algo salió mal
      </h1>
      <p className="mt-3 text-sm text-muted">
        Tuvimos un problema al cargar esta sección. Puedes reintentar; si
        persiste, vuelve más tarde.
      </p>
      <button
        onClick={reset}
        className="mt-8 flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-charcoal hover:bg-gold-soft"
      >
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}
