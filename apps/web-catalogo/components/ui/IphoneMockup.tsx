import { Sparkles, Calendar, Star, ShoppingBag } from 'lucide-react';

/**
 * Mockup de iPhone en CSS puro (sin imagenes externas) para el hero de descarga.
 */
export function IphoneMockup() {
  return (
    <div className="relative mx-auto h-[560px] w-[280px]">
      <div className="absolute inset-0 rounded-[44px] border border-border bg-surface p-3 shadow-[0_0_0_2px_rgba(212,175,55,0.15)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-3 z-10 h-6 w-32 -translate-x-1/2 rounded-full bg-charcoal" />
        {/* Pantalla */}
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[34px] bg-background">
          <div className="flex items-center justify-between px-5 pt-9 pb-4">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-xs tracking-widest text-cream">
                APPSALON
              </span>
            </div>
            <div className="h-7 w-7 rounded-full border border-border bg-surface-2" />
          </div>

          <div className="px-5">
            <div className="rounded-2xl border border-border bg-surface-2 p-4">
              <p className="text-[10px] uppercase tracking-wide text-gold">
                Tu próxima cita
              </p>
              <p className="mt-1 text-sm font-medium text-cream">
                Corte & color premium
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                <Calendar className="h-3 w-3" /> Vie 10:30 · Matriz
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 px-5">
            {[
              { icon: ShoppingBag, label: 'Tienda' },
              { icon: Star, label: 'Reseñas' },
              { icon: Calendar, label: 'Citas' },
              { icon: Sparkles, label: 'Premios' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4"
              >
                <Icon className="h-5 w-5 text-gold" />
                <span className="text-[10px] text-muted">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto px-5 pb-7">
            <div className="rounded-full bg-gold py-2.5 text-center text-xs font-semibold text-charcoal">
              Reservar ahora
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
