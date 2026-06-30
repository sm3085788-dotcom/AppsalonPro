import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, isSupabaseConfigured } from '@/lib/env';

/** Rutas que requieren sesion iniciada. */
const PROTECTED_PREFIXES = ['/reservar', '/checkout', '/cuenta'];

/**
 * Refresca la sesion de Supabase en cada request y protege rutas privadas.
 * Patron oficial @supabase/ssr adaptado a Next 16 (proxy, runtime nodejs).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Modo demo: sin Supabase no hay sesion que refrescar.
  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: no ejecutar codigo entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
