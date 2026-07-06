'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Store } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { useBranch } from '@/components/branch/BranchContext';
import { formatQ } from '@/lib/format';
import {
  PRECIO_A_TU_MEDIDA_HINT,
  PRECIO_A_TU_MEDIDA_LABEL,
} from '@/lib/bookingPolicy';
import { createBooking } from '@/app/reservar/actions';
import type { Service } from '@/lib/types/db';

export function BookingForm({
  services,
  initialServiceId,
}: {
  services: Service[];
  initialServiceId?: string;
}) {
  const router = useRouter();
  const { selectedBranchId, selectedBranch } = useBranch();

  const [serviceId, setServiceId] = useState(
    initialServiceId && services.some((s) => s.id === initialServiceId)
      ? initialServiceId
      : (services[0]?.id ?? ''),
  );
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  function validar(): string | null {
    if (!serviceId) return 'Selecciona un servicio.';
    if (!selectedBranchId) return 'Selecciona una sucursal.';
    if (!fecha) return 'Elige fecha y hora.';
    return null;
  }

  function onReservar() {
    const v = validar();
    if (v) {
      setError(v);
      return;
    }
    if (!selectedService || !selectedBranchId) return;
    startTransition(async () => {
      const result = await createBooking({
        servicioId: serviceId,
        servicio: selectedService.nombre,
        fechaHora: new Date(fecha).toISOString(),
        sucursalId: selectedBranchId,
        fulfillment: 'salon',
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/reservar/exito?id=${encodeURIComponent(result.id)}`);
    });
  }

  function serviceOptionLabel(s: Service) {
    if (s.precioVariable) return `${s.nombre} · ${PRECIO_A_TU_MEDIDA_LABEL}`;
    return `${s.nombre} · ${formatQ(s.precio)}`;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6">
        <div>
          <label className="mb-2 block text-sm text-muted">Sucursal</label>
          <BranchSelect variant="field" />
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Servicio</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold"
          >
            {services.length === 0 && <option value="">Sin servicios</option>}
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {serviceOptionLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Fecha y hora</label>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 focus-within:border-gold">
            <CalendarClock className="h-4 w-4 text-gold" />
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <Store className="h-4 w-4 text-gold" />
          <div>
            <p className="text-sm text-foreground">Atención en el salón</p>
            <p className="text-xs text-muted">
              Te esperamos en la sucursal seleccionada.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={onReservar}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
        >
          {pending ? 'Reservando…' : 'Confirmar reserva'}
        </button>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-light text-cream">Tu reserva</h3>
        <Row label="Servicio" value={selectedService?.nombre ?? '—'} />
        <Row label="Sucursal" value={selectedBranch?.nombre ?? '—'} />
        {selectedService?.precioVariable ? (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted">Precio</span>
            <div className="text-right">
              <span className="block text-gold">{PRECIO_A_TU_MEDIDA_LABEL}</span>
              <span className="text-xs text-muted">{PRECIO_A_TU_MEDIDA_HINT}</span>
            </div>
          </div>
        ) : (
          <Row
            label="Precio en salón"
            value={selectedService ? formatQ(selectedService.precio) : '—'}
          />
        )}
        <Row
          label="Precio referencia"
          value={
            selectedService?.precioVariable
              ? PRECIO_A_TU_MEDIDA_LABEL
              : selectedService
                ? formatQ(selectedService.precio)
                : '—'
          }
        />
        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted">
          Sin pago en línea. El salón confirmará tu cita y el valor final en recepción.
        </p>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={highlight ? 'font-medium text-gold' : 'text-foreground'}>
        {value}
      </span>
    </div>
  );
}
