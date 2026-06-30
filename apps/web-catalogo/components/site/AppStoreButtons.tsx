import { Apple, Play } from 'lucide-react';

/** Botones de descarga App Store / Google Play (Req 9). */
export function AppStoreButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href="#"
        className="flex items-center gap-3 rounded-xl border border-border bg-charcoal px-5 py-2.5 transition-colors hover:border-border-strong"
      >
        <Apple className="h-6 w-6 text-cream" strokeWidth={1.25} />
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-light text-muted">Descárgala en</span>
          <span className="block text-sm font-medium text-cream">
            App Store
          </span>
        </span>
      </a>
      <a
        href="#"
        className="flex items-center gap-3 rounded-xl border border-border bg-charcoal px-5 py-2.5 transition-colors hover:border-border-strong"
      >
        <Play className="h-6 w-6 text-cream" strokeWidth={1.25} />
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-light text-muted">Disponible en</span>
          <span className="block text-sm font-medium text-cream">
            Google Play
          </span>
        </span>
      </a>
    </div>
  );
}
