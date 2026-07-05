/**
 * Aviso global cuando la web está desplegada sin Supabase (modo demo).
 */
export function ConfigStatusBanner({
  configured,
}: {
  configured: boolean;
}) {
  if (configured) return null;

  return (
    <div
      role="status"
      className="border-b border-gold/30 bg-gold/10 px-4 py-2.5 text-center text-sm font-light text-gold-soft"
    >
      Modo demostración — el catálogo aún no está conectado al salón. Contacta al administrador.
    </div>
  );
}
