type IphoneMockupProps = {
  /** Ruta de la captura a mostrar dentro del teléfono. */
  src?: string;
  alt?: string;
  /** Escala visual: 'lg' para el destacado, 'sm' para los secundarios. */
  size?: 'lg' | 'sm';
  className?: string;
};

/**
 * Mockup de iPhone que muestra una pantalla real de la app AppSalon Pro Clientes.
 * Acepta distintas capturas para componer una galería de teléfonos.
 */
export function IphoneMockup({
  src = '/images/app-home.png',
  alt = 'Pantalla de la app AppSalon Pro para clientes',
  size = 'lg',
  className = '',
}: IphoneMockupProps) {
  const dims =
    size === 'lg'
      ? 'h-[480px] w-[236px] rounded-[40px]'
      : 'h-[380px] w-[186px] rounded-[32px]';
  const screenRadius = size === 'lg' ? 'rounded-[34px]' : 'rounded-[28px]';
  const notch =
    size === 'lg' ? 'top-3 h-6 w-32' : 'top-2.5 h-5 w-24';

  return (
    <div className={`relative mx-auto ${dims} ${className}`}>
      <div
        className={`absolute inset-0 ${dims} border border-border-strong bg-surface p-3 shadow-[0_0_0_2px_rgba(212,175,55,0.15),0_40px_90px_-40px_rgba(212,175,55,0.35)]`}
      >
        {/* Notch */}
        <div
          className={`absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-charcoal ${notch}`}
        />
        {/* Pantalla */}
        <div className={`h-full w-full overflow-hidden ${screenRadius} bg-background`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src || "/placeholder.svg"}
            alt={alt}
            className="h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}
