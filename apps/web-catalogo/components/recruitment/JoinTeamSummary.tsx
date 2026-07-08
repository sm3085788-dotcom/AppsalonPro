'use client';

import {
  activeBranchLabels,
  featuredServicesSummary,
  JOIN_TEAM_COPY,
  modalidadLabel,
  type JoinTeamEstado,
} from '@/lib/recruitment/constants';
import { JoinTeamStatusBadge } from './JoinTeamStatusBadge';
import { formatFechaHora } from '@/lib/format';

export type JoinTeamSolicitud = {
  id: string;
  experiencia_ramas: Record<string, boolean>;
  rama_destacada: string | null;
  modalidad: string;
  mensaje: string;
  estado: JoinTeamEstado;
  created_at: string;
};

function StatusBadge({ estado }: { estado: JoinTeamEstado }) {
  return <JoinTeamStatusBadge estado={estado} />;
}

export function JoinTeamSummary({
  solicitud,
  justSubmitted = false,
}: {
  solicitud: JoinTeamSolicitud;
  justSubmitted?: boolean;
}) {
  const ramas = activeBranchLabels(solicitud.experiencia_ramas);

  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-gold">Resumen de tu solicitud</p>
          <h2 className="mt-2 text-xl font-light text-cream">
            {justSubmitted ? '¡Solicitud enviada!' : 'Tu postulación'}
          </h2>
        </div>
        <StatusBadge estado={solicitud.estado} />
      </div>

      {justSubmitted ? (
        <p className="text-sm leading-relaxed text-muted">{JOIN_TEAM_COPY.postSubmit}</p>
      ) : null}

      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">Experiencia</dt>
          <dd className="mt-1 text-cream">
            {ramas.length > 0 ? ramas.join(' · ') : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">Servicios destacados</dt>
          <dd className="mt-1 text-cream">
            {featuredServicesSummary(solicitud.experiencia_ramas)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">Modalidad</dt>
          <dd className="mt-1 text-cream">{modalidadLabel(solicitud.modalidad)}</dd>
        </div>
        {solicitud.mensaje?.trim() ? (
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">Mensaje</dt>
            <dd className="mt-1 text-cream">{solicitud.mensaje.trim()}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-muted">Fecha</dt>
          <dd className="mt-1 text-muted">{formatFechaHora(solicitud.created_at)}</dd>
        </div>
      </dl>

      <p className="text-xs leading-relaxed text-muted">{JOIN_TEAM_COPY.assistantNote}</p>
    </article>
  );
}
