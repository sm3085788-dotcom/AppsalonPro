'use client';

interface PromotionCardProps {
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt: string;
  badge?: string;
  description?: string;
  cta?: {
    label: string;
    href: string;
  };
  variant?: 'hero' | 'gallery';
}

export function PromotionCard({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  badge,
  description,
  cta,
  variant = 'gallery',
}: PromotionCardProps) {
  if (variant === 'hero') {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-cream/10">
        {/* Imagen de fondo */}
        <div className="relative h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        {/* Contenido */}
        <div className="relative p-6">
          {badge && (
            <p className="inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold mb-3">
              {badge}
            </p>
          )}
          <h3 className="text-xl font-light text-cream">{title}</h3>
          {description && (
            <p className="mt-2 text-sm font-light text-muted">{description}</p>
          )}
          {cta && (
            <a
              href={cta.href}
              className="link-underline mt-4 inline-block text-xs font-light uppercase tracking-[0.18em] text-gold hover:text-gold-soft"
            >
              {cta.label}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-cream/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Imagen */}
        <div className="relative h-64 sm:h-80 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        {/* Contenido */}
        <div className="flex flex-col justify-center p-6">
          {badge && (
            <p className="inline-block w-fit rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold mb-3">
              {badge}
            </p>
          )}
          <h3 className="text-2xl font-light text-cream">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-lg font-light text-gold">{subtitle}</p>
          )}
          {description && (
            <p className="mt-4 text-sm font-light text-muted leading-relaxed">{description}</p>
          )}
          {cta && (
            <a
              href={cta.href}
              className="link-underline mt-6 inline-block w-fit text-xs font-light uppercase tracking-[0.18em] text-gold hover:text-gold-soft"
            >
              {cta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
