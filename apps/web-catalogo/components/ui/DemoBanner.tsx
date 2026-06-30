import { Info } from 'lucide-react';

/**
 * Aviso discreto cuando una integracion corre en modo demo (sin llaves).
 * Mantiene el sitio funcional en el navegador aunque falten credenciales.
 */
export function DemoBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold-soft">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
