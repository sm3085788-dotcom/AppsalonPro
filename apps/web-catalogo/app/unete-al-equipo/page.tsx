import Link from 'next/link';
import { JoinTeamPanel } from '@/components/recruitment/JoinTeamPanel';
import { JOIN_TEAM_COPY } from '@/lib/recruitment/constants';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { displayNameFromUser } from '@/lib/clientDisplayName';

export const metadata = {
  title: 'Únete al Equipo | ANDREAS Salon',
  description:
    'Postúlate para formar parte del equipo Andreas Salon. Empresa seria, crecimiento y oportunidades en belleza.',
};

export const dynamic = 'force-dynamic';

export default async function UneteAlEquipoPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="eyebrow text-gold">{JOIN_TEAM_COPY.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-light text-cream">{JOIN_TEAM_COPY.title}</h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-muted">
          {JOIN_TEAM_COPY.introLoggedOut} {JOIN_TEAM_COPY.assistantNote}
        </p>
        <p className="mt-3 text-sm text-muted">Crea tu cuenta para postularte.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/registro?redirect=/unete-al-equipo"
            className="rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login?redirect=/unete-al-equipo"
            className="rounded-xl border border-border px-6 py-3 text-sm text-pearl hover:border-gold"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { row } = await ensureClienteFromAuth(supabase, user);
  const nombre = row?.nombre?.trim() || displayNameFromUser(user);
  const firstName = nombre.split(/\s+/)[0];

  const { data: statusData } = await supabase.rpc('get_unete_equipo_status');
  const status = (statusData || {}) as {
    ok?: boolean;
    solicitud?: Record<string, unknown> | null;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <p className="eyebrow text-gold">{JOIN_TEAM_COPY.eyebrow}</p>
      <h1 className="mt-2 text-2xl font-light leading-tight text-cream sm:text-3xl">
        {JOIN_TEAM_COPY.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{JOIN_TEAM_COPY.pageSubtitle}</p>

      <div className="mt-6">
        <JoinTeamPanel
          initialSolicitud={status.solicitud ?? null}
          firstName={firstName}
        />
      </div>
    </div>
  );
}
