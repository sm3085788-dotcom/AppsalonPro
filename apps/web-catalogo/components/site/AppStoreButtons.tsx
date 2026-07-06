/** Botones de descarga App Store / Google Play — deshabilitados mientras la app está en construcción. */
export function AppStoreButtons() {
  return (
    <div className="space-y-4">
      <p className="max-w-sm rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-sm font-normal leading-relaxed text-cream/90 ring-1 ring-gold/10">
        Estamos construyendo la app para una experiencia aún mejor. Muy pronto en{' '}
        <span className="font-medium text-gold">App Store</span> y{' '}
        <span className="font-medium text-gold">Google Play</span>.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
          Próximamente
        </span>
        <div className="flex flex-wrap gap-3 opacity-45 pointer-events-none select-none" aria-hidden>
          <StoreBadge label="App Store" />
          <StoreBadge label="Google Play" />
        </div>
      </div>
    </div>
  );
}

function StoreBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/90 px-5 py-2.5 shadow-sm ring-1 ring-black/5">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
    </div>
  );
}
