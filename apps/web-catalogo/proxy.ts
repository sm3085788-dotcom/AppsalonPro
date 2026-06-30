import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy-session';

/**
 * Next 16 renombro `middleware` a `proxy` (runtime nodejs).
 * Aqui refrescamos la sesion SSR y protegemos rutas privadas.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluye estaticos e imagenes; corre en el resto (incluye rutas privadas).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
