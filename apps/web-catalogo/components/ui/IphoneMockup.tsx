/**
 * Mockup de iPhone que muestra la pantalla real de la app AppSalon Pro Clientes.
 */
export function IphoneMockup() {
  return (
    <div className="relative mx-auto h-[560px] w-[280px]">
      <div className="absolute inset-0 rounded-[44px] border border-border bg-surface p-3 shadow-[0_0_0_2px_rgba(212,175,55,0.15)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-3 z-10 h-6 w-32 -translate-x-1/2 rounded-full bg-charcoal" />
        {/* Pantalla */}
        <div className="h-full w-full overflow-hidden rounded-[34px] bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/app-home.png"
            alt="Pantalla principal de la app AppSalon Pro para clientes"
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}
