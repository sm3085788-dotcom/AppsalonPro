import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BirthdayClubPanel } from '@/components/birthday/BirthdayClubPanel';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureClienteFromAuth } from '@/lib/data/cliente';

export const metadata = {
  title: 'Tu Cumpleaños | ANDREAS Salon',
  description: 'Club de cumpleaños ANDREAS — beneficios exclusivos para tu día especial.',
};

export default async function TuCumpleanosPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="eyebrow text-gold">Club cumpleaños</p>
        <h1 className="mt-3 text-3xl font-light text-cream">Tu Cumpleaños</h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-muted">
          En Andreas Salon consentimos tu día especial. Crea tu cuenta en la web para descubrir
          beneficios exclusivos y compartir tu emoción con nuestro equipo.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/registro?redirect=/tu-cumpleanos"
            className="rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login?redirect=/tu-cumpleanos"
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
  if (!row?.cumpleanos) {
    redirect('/cuenta/perfil?from=/tu-cumpleanos');
  }

  const { data: statusData } = await supabase.rpc('get_birthday_club_status');
  const status = (statusData || {}) as {
    enrollment?: { status?: string } | null;
    reaction?: { reaction?: string; comment?: string | null } | null;
  };

  const enrolled = Boolean(status.enrollment);
  const reaction = (status.reaction?.reaction as 'like' | 'dislike' | 'love' | null) || null;
  const comment = status.reaction?.comment || '';

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow text-gold">Club cumpleaños</p>
      <h1 className="mt-3 text-3xl font-light text-cream sm:text-4xl">
        En Andreas Salon consentimos tu día especial
      </h1>
      <p className="mt-4 text-sm font-light leading-relaxed text-muted">
        Hola{row.nombre ? `, ${row.nombre.split(/\s+/)[0]}` : ''}. Estos son los beneficios que
        preparamos para celebrar contigo.
      </p>

      <div className="mt-10">
        <BirthdayClubPanel
          initialEnrolled={enrolled}
          initialReaction={reaction}
          initialComment={comment}
        />
      </div>
    </div>
  );
}
