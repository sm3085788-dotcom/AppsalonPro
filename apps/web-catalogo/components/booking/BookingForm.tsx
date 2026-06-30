'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Home, Store, Loader2, Radio } from 'lucide-react';
import { useBranch } from '@/components/branch/BranchContext';
import { useBranchBookingsRealtime } from '@/lib/realtime/useBranchBookingsRealtime';
import { AddressAutocomplete } from '@/components/geo/AddressAutocomplete';
import { createBooking } from '@/app/reservar/actions';
import { formatQ } from '@/lib/format';
import type { DeliveryAddress, FulfillmentType, Service } from '@/lib/types/db';

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
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('salon');
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Req 2: hook realtime de la sucursal; usamos su emisor liviano.
  const { emitBooking, state } = useBranchBookingsRealtime({
    branchId: selectedBranchId,
  });

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  function validar(): string | null {
    if (!serviceId) return 'Selecciona un servicio.';
    if (!selectedBranchId) return 'Selecciona una sucursal.';
    if (!fecha) return 'Elige fecha y hora.';
    if (fulfillment === 'domicilio' && !address)
      return 'Ingresa la dirección del servicio a domicilio.';
    return null;
  }

  async function onReservarSalon() {
    const v = validar();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await createBooking({
        servicioId: serviceId,
        servicio: selectedService?.nombre ?? 'Servicio',
        fechaHora: new Date(fecha).toISOString(),
        sucursalId: selectedBranchId!,
        fulfillment,
        latitud: address?.latitud ?? null,
        longitud: address?.longitud ?? null,
        direccion: address?.direccion ?? null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Notifica al APK de la sucursal con payload liviano {booking_id, estado}.
      await emitBooking(res.id, 'pendiente');
      setSuccess('¡Cita reservada! El salón fue notificado en tiempo real.');
      router.refresh();
    } catch {
      setError('Error al reservar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function onPagarTarjeta() {
    const v = validar();
    if (v) {
      setError(v);
      return;
    }
    const params = new URLSearchParams({
      type: 'booking',
      servicio: serviceId,
      fecha: new Date(fecha).toISOString(),
      fulfillment,
    });
    if (selectedBranchId) params.set('branch', selectedBranchId);
    if (fulfillment === 'domicilio' && address) {
      params.set('lat', String(address.latitud));
      params.set('lng', String(address.longitud));
      params.set('direccion', address.direccion);
    }
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6 rounded-2xl border border-border bg-surface p-6">
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
                {s.nombre} · {formatQ(s.precio)}
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

        <div>
          <label className="mb-2 block text-sm text-muted">Modalidad</label>
          <div className="grid grid-cols-2 gap-3">
            <FulfillmentOption
              active={fulfillment === 'salon'}
              icon={Store}
              label="En el salón"
              onClick={() => setFulfillment('salon')}
            />
            <FulfillmentOption
              active={fulfillment === 'domicilio'}
              icon={Home}
              label="A domicilio"
              onClick={() => setFulfillment('domicilio')}
            />
          </div>
        </div>

        {fulfillment === 'domicilio' && (
          <div>
            <label className="mb-2 block text-sm text-muted">
              Dirección del servicio
            </label>
            <AddressAutocomplete onSelect={setAddress} />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onReservarSalon}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gold py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reservar (pago en salón)
          </button>
          <button
            onClick={onPagarTarjeta}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft"
          >
            Pagar con tarjeta
          </button>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-light text-cream">Tu reserva</h3>
        <Row label="Servicio" value={selectedService?.nombre ?? '—'} />
        <Row label="Sucursal" value={selectedBranch?.nombre ?? '—'} />
        <Row
          label="Precio"
          value={selectedService ? formatQ(selectedService.precio) : '—'}
        />
        <div className="flex items-center gap-2 border-t border-border pt-4 text-xs">
          <Radio
            className={`h-3.5 w-3.5 ${
              state === 'connected' ? 'text-emerald-400' : 'text-muted'
            }`}
          />
          <span className="text-muted">
            Tiempo real:{' '}
            {state === 'connected'
              ? 'conectado a la sucursal'
              : state === 'reconnecting'
                ? 'reconectando…'
                : state === 'idle'
                  ? 'en espera'
                  : 'conectando…'}
          </span>
        </div>
      </aside>
    </div>
  );
}

function FulfillmentOption({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm transition-colors ${
        active
          ? 'border-gold bg-gold/10 text-gold'
          : 'border-border text-muted hover:border-gold/40'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
