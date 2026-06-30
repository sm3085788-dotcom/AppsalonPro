import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <Compass className="h-14 w-14 text-gold" />
      <h1 className="mt-6 text-3xl font-light text-cream">Página no encontrada</h1>
      <p className="mt-3 text-sm text-muted">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-charcoal hover:bg-gold-soft"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
