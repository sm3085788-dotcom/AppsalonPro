import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="text-lg font-light tracking-[0.2em] text-cream">
              APPSALON <span className="text-gold">PRO</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm font-light leading-relaxed text-muted">
            Ecosistema de salones de belleza de lujo. Reserva, compra y vive una
            experiencia de alta gama.
          </p>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-medium text-cream">Explorar</h4>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/servicios" className="hover:text-gold">
                Servicios
              </Link>
            </li>
            <li>
              <Link href="/productos" className="hover:text-gold">
                Productos
              </Link>
            </li>
            <li>
              <Link href="/reservar" className="hover:text-gold">
                Reservar cita
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h4 className="mb-3 font-medium text-cream">Cuenta</h4>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/login" className="hover:text-gold">
                Ingresar
              </Link>
            </li>
            <li>
              <Link href="/registro" className="hover:text-gold">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-gold">
                Privacidad
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} AppSalon Pro · Hecho con Next.js y Supabase
      </div>
    </footer>
  );
}
