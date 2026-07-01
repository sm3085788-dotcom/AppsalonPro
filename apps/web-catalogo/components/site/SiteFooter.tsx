import Link from 'next/link';
import { Sparkles, Mail, MapPin } from 'lucide-react';

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
        <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.74.07-.9.04-1.38.19-1.7.32-.43.16-.74.36-1.06.68-.32.32-.52.63-.68 1.06-.13.32-.28.8-.32 1.7C3.24 8.75 3.24 9.1 3.24 12s0 3.25.07 4.49c.04.9.19 1.38.32 1.7.16.43.36.74.68 1.06.32.32.63.52 1.06.68.32.13.8.28 1.7.32 1.24.07 1.59.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.19 1.7-.32.43-.16.74-.36 1.06-.68.32-.32.52-.63.68-1.06.13-.32.28-.8.32-1.7.07-1.24.07-1.59.07-4.49s0-3.25-.07-4.49c-.04-.9-.19-1.38-.32-1.7a2.85 2.85 0 0 0-.68-1.06 2.85 2.85 0 0 0-1.06-.68c-.32-.13-.8-.28-1.7-.32C15.5 4 15.15 4 12 4Zm0 3.06A4.94 4.94 0 1 1 12 16.94 4.94 4.94 0 0 1 12 7.06Zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28Zm5.14-2.02a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/50200000000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
        <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.9 9.9 0 0 0 4.88 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.06.8.82-2.98-.2-.31a8.28 8.28 0 0 1-1.27-4.25c0-4.57 3.72-8.29 8.3-8.29 2.22 0 4.3.86 5.87 2.43a8.24 8.24 0 0 1 2.43 5.87c0 4.57-3.72 8.29-8.3 8.29Zm4.55-6.2c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.03 2.59.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.87h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
        <path d="M16.6 5.82a4.28 4.28 0 0 1-1.03-2.82h-3.1v12.6a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.4-2.47V7.9a5.7 5.7 0 0 0-.8-.06 5.7 5.7 0 1 0 5.7 5.7V8.6a7.34 7.34 0 0 0 4.3 1.38V6.87a4.28 4.28 0 0 1-3.27-1.05Z" />
      </svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-[18px] w-[18px] text-gold" />
            <span className="text-[15px] font-light tracking-[0.32em] text-cream">
              APPSALON <span className="text-gold">PRO</span>
            </span>
          </div>
          <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-muted">
            Salón boutique de belleza de autor. Reserva, descubre y vive una
            experiencia hecha a tu medida.
          </p>

          {/* Redes sociales */}
          <div className="mt-7 flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-gold hover:text-gold"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="text-sm lg:col-span-3 lg:col-start-7">
          <h4 className="eyebrow mb-5">Explorar</h4>
          <ul className="space-y-3 font-light text-muted">
            <li>
              <Link href="/servicios" className="transition-colors hover:text-cream">
                Servicios
              </Link>
            </li>
            <li>
              <Link href="/productos" className="transition-colors hover:text-cream">
                Productos
              </Link>
            </li>
            <li>
              <Link href="/reservar" className="transition-colors hover:text-cream">
                Reservar cita
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm lg:col-span-3">
          <h4 className="eyebrow mb-5">Contacto</h4>
          <ul className="space-y-4 font-light text-muted">
            <li>
              <a
                href="mailto:hola@appsalonpro.com"
                className="flex items-start gap-3 transition-colors hover:text-cream"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                hola@appsalonpro.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
              <span>
                Sucursal principal
                <br />
                12 Calle 1-25, Zona 10, Ciudad
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-8 text-center text-xs font-light tracking-wide text-muted">
        © {new Date().getFullYear()} AppSalon Pro · Hecho con Next.js y Supabase
      </div>
    </footer>
  );
}
