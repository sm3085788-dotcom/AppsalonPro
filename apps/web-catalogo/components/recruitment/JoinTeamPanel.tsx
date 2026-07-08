'use client';

import { useMemo, useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import { submitJoinTeamAction } from '@/app/unete-al-equipo/actions';
import {
  activeFeaturedServiceLabels,
  BEAUTY_BRANCHES,
  BEAUTY_BRANCH_SECTIONS,
  JOIN_TEAM_COPY,
  JOIN_TEAM_POLICIES,
  MODALIDAD_OPTIONS,
  featuredServicesSummary,
  type BeautyBranch,
  type BeautyBranchKey,
  type JoinTeamModalidad,
  type JoinTeamEstado,
} from '@/lib/recruitment/constants';
import { JoinTeamSummary, type JoinTeamSolicitud } from './JoinTeamSummary';

function BranchToggle({
  branch,
  on,
  onToggle,
}: {
  branch: BeautyBranch;
  on: boolean;
  onToggle: (key: BeautyBranchKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(branch.key)}
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        on
          ? 'border-gold/50 bg-gold/10 text-cream'
          : 'border-border bg-surface text-pearl hover:border-border-strong'
      }`}
    >
      <span className="min-w-0 flex-1 pr-2 text-[13px] leading-snug">{branch.label}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {branch.featured ? (
          <span className="text-[9px] uppercase tracking-[0.1em] text-gold">Destacado</span>
        ) : null}
        <span
          className={`relative h-4 w-8 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-surface-2'}`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-charcoal transition-transform ${
              on ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </span>
      </span>
    </button>
  );
}

function emptyExperiencia(): Record<BeautyBranchKey, boolean> {
  return BEAUTY_BRANCHES.reduce(
    (acc, b) => {
      acc[b.key] = false;
      return acc;
    },
    {} as Record<BeautyBranchKey, boolean>,
  );
}

function parseSolicitud(raw: Record<string, unknown> | null | undefined): JoinTeamSolicitud | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    experiencia_ramas: (raw.experiencia_ramas as Record<string, boolean>) || {},
    rama_destacada: (raw.rama_destacada as string) || null,
    modalidad: String(raw.modalidad || ''),
    mensaje: String(raw.mensaje || ''),
    estado: (raw.estado as JoinTeamEstado) || 'enviado',
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

export function JoinTeamPanel({
  initialSolicitud,
  firstName,
}: {
  initialSolicitud: Record<string, unknown> | null;
  firstName?: string;
}) {
  const existing = parseSolicitud(initialSolicitud);
  const hasActive =
    existing && (existing.estado === 'enviado' || existing.estado === 'recibido' || existing.estado === 'revisado');

  const [submitted, setSubmitted] = useState<JoinTeamSolicitud | null>(hasActive ? existing : null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [experiencia, setExperiencia] = useState(emptyExperiencia);
  const [modalidad, setModalidad] = useState<JoinTeamModalidad | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [aceptaValores, setAceptaValores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const featuredActive = useMemo(
    () => activeFeaturedServiceLabels(experiencia),
    [experiencia],
  );
  const hasBranch = useMemo(() => Object.values(experiencia).some(Boolean), [experiencia]);
  const canSubmit = hasBranch && modalidad && aceptaValores && !pending;

  const toggleBranch = (key: BeautyBranchKey) => {
    setExperiencia((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onSubmit = () => {
    if (!canSubmit || !modalidad) return;
    setError(null);
    startTransition(async () => {
      const res = await submitJoinTeamAction({
        experiencia,
        modalidad,
        mensaje,
        aceptaValores,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const sol = parseSolicitud(res.solicitud);
      if (!sol) {
        setError('La solicitud se envió pero no se pudo mostrar el resumen.');
        return;
      }
      setExperiencia(emptyExperiencia());
      setModalidad(null);
      setMensaje('');
      setAceptaValores(false);
      setSubmitted(sol);
      setJustSubmitted(true);
    });
  };

  if (submitted) {
    return <JoinTeamSummary solicitud={submitted} justSubmitted={justSubmitted} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          {firstName ? `${firstName}, ` : ''}
          {JOIN_TEAM_COPY.introLoggedIn} {JOIN_TEAM_COPY.assistantNote}
        </p>
      </div>

      <section className="space-y-2">
        <div>
          <h2 className="text-base font-light text-cream">Tu experiencia</h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">{JOIN_TEAM_COPY.suggestedBranches}</p>
        </div>

        <div className="space-y-3">
          {BEAUTY_BRANCH_SECTIONS.map((section) => {
            const featuredBranches =
              section.id === 'general'
                ? section.branches.filter((b) => b.featured)
                : [];
            const otherBranches =
              section.id === 'general'
                ? section.branches.filter((b) => !b.featured)
                : section.branches;

            return (
              <div key={section.id} className="space-y-1.5">
                {section.title ? (
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                    {section.title}
                  </p>
                ) : null}
                {featuredBranches.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                      Servicios destacados
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {featuredBranches.map((branch) => (
                        <BranchToggle
                          key={branch.key}
                          branch={branch}
                          on={experiencia[branch.key]}
                          onToggle={toggleBranch}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {otherBranches.length > 0 ? (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {otherBranches.map((branch) => (
                      <BranchToggle
                        key={branch.key}
                        branch={branch}
                        on={experiencia[branch.key]}
                        onToggle={toggleBranch}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {featuredActive.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-gold sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Servicios destacados activos: <strong>{featuredActive.join(' · ')}</strong>
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-light text-cream">¿Cómo colaborar?</h2>
        <div className="space-y-1.5">
          {MODALIDAD_OPTIONS.map((opt) => {
            const selected = modalidad === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setModalidad(opt.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? 'border-gold/50 bg-gold/10'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <p className="text-sm font-medium text-cream">{opt.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{opt.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5 rounded-xl border border-border bg-surface px-4 py-3">
        <h2 className="text-base font-light text-cream">Políticas de compromiso</h2>
        <ul className="space-y-2">
          {JOIN_TEAM_POLICIES.map((policy) => (
            <li
              key={policy.title}
              className="rounded-lg border border-border bg-charcoal/40 px-3 py-2"
            >
              <p className="text-sm font-medium text-pearl">{policy.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{policy.body}</p>
            </li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={aceptaValores}
            onChange={(e) => setAceptaValores(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-gold"
          />
          <span className="text-xs leading-relaxed text-muted">
            Acepto y me comprometo con estas políticas antes de enviar mi solicitud.
          </span>
        </label>
      </section>

      <section className="space-y-1.5">
        <label htmlFor="join-team-message" className="text-sm text-cream">
          Mensaje (opcional)
        </label>
        <textarea
          id="join-team-message"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={3}
          placeholder="Trayectoria, certificaciones o disponibilidad…"
          className="w-full rounded-lg border border-border bg-charcoal px-3 py-2 text-sm text-cream placeholder:text-muted focus:border-gold focus:outline-none"
        />
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </div>
  );
}
