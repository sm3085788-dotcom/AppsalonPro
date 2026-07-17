'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Store } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { useBranch } from '@/components/branch/BranchContext';
import { formatQ } from '@/lib/format';
import {
  PRECIO_A_TU_MEDIDA_HINT,
  PRECIO_A_TU_MEDIDA_LABEL,
} from '@/lib/bookingPolicy';
import { createBooking } from '@/app/reservar/actions';
import { BookingSlotPicker } from '@/components/booking/BookingSlotPicker';
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
  const [fechaHora, setFechaHora] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  function validar(): string | null {
    if (!serviceId) return 'Selecciona un servicio.';
    if (!selectedBranchId) return 'Selecciona una sucursal.';
    if (!fechaHora) return 'Elige fecha y hora.';
    return null;
  }

  function onReservar() {
    const v = validar();
    if (v) {
      setError(v);
      return;
    }
    if (!selectedService || !selectedBranchId || !fechaHora) return;
    startTransition(async () => {
      const result = await createBooking({
        servicioId: serviceId,
        servicio: selectedService.nombre,
        fechaHora,
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
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-4">
        <div>
          <label className="mb-1 block text-xs text-muted">Sucursal</label>
          <BranchSelect variant="field" compact />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Servicio</label>
          <div className="group relative">
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface-2 py-2.5 pl-3 pr-9 text-sm text-foreground outline-none focus:border-gold"
            >
              {services.length === 0 && <option value="">Sin servicios</option>}
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {serviceOptionLabel(s)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted group-focus-within:text-gold"
              aria-hidden
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Fecha y hora</label>
          <BookingSlotPicker
          value={fechaHora}
          onChange={setFechaHora}
          sucursalId={selectedBranchId}
          servicioCategoria={selectedService?.categoria}
          servicioId={serviceId || null}
          branchPhone={selectedBranch?.telefono}
          disabled={pending}
        />
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
          <Store className="h-3.5 w-3.5 shrink-0 text-gold" />
          <div>
            <p className="text-xs text-foreground">Atención en el salón</p>
            <p className="text-[11px] text-muted">
              Te esperamos en la sucursal seleccionada.
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={onReservar}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-xs font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60 sm:text-sm"
        >
          {pending ? 'Reservando…' : 'Confirmar reserva'}
        </button>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-surface p-4">
        <h3 className="text-base font-light text-cream">Tu reserva</h3>
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
        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
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
