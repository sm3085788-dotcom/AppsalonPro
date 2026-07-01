import Link from 'next/link';
import { Sparkles } from 'lucide-react';

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
          <h4 className="eyebrow mb-5">Cuenta</h4>
          <ul className="space-y-3 font-light text-muted">
            <li>
              <Link href="/login" className="transition-colors hover:text-cream">
                Ingresar
              </Link>
            </li>
            <li>
              <Link href="/registro" className="transition-colors hover:text-cream">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="transition-colors hover:text-cream">
                Privacidad
              </Link>
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
