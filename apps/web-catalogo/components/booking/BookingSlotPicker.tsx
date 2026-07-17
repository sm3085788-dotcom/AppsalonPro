'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Phone } from 'lucide-react';
import {
  BOOKING_TIMEZONE,
  combineDateAndSlot,
  defaultBookingDateString,
  formatBookingSlotLabel,
  generateBookingSlots,
  getSlotStartFromInstant,
  zonedCalendarDateString,
} from '@/lib/bookingSlots';

function slotOptionsFromTimes(times: string[]): SlotOption[] {
  return times.map((time) => ({
    time,
    label: formatBookingSlotLabel(time),
    count: 0,
    congested: false,
  }));
}

export interface BookingSlotPickerProps {
  value: string | null;
  onChange: (iso: string | null) => void;
  sucursalId: string | null;
  /** Categoría/rama del servicio (congestión independiente por rama). */
  servicioCategoria?: string | null;
  /** Alternativa: id de inventario para resolver categoría en el API. */
  servicioId?: string | null;
  /** Alternativa: nombre del servicio (reagendar). */
  servicio?: string | null;
  branchPhone?: string | null;
  disabled?: boolean;
}

interface SlotOption {
  time: string;
  label: string;
  count: number;
  congested: boolean;
}

function slotPickerPlaceholder(
  dateStr: string,
  sucursalId: string | null,
  loadingSlots: boolean,
): string {
  if (!dateStr) return 'Elegí una fecha primero';
  if (!sucursalId) return 'Elegí una sucursal';
  if (loadingSlots) return 'Cargando horarios…';
  return 'Seleccioná un horario';
}

function slotDemandLabel(count: number): string {
  if (count === 1) return '1 cita';
  return `${count} citas`;
}

function SlotChip({
  slot,
  selected,
  disabled,
  onSelect,
}: {
  slot: SlotOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const congested = slot.congested;
  const showDemand = !congested && slot.count > 0;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg border px-1.5 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? congested
            ? 'border-amber-400 bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/40'
            : 'border-gold bg-gold/15 text-gold ring-1 ring-gold/35'
          : congested
            ? 'border-amber-500/35 bg-amber-500/8 text-foreground hover:border-amber-400/60 hover:bg-amber-500/12'
            : 'border-border bg-surface-2/70 text-foreground hover:border-gold/45 hover:bg-surface-2'
      }`}
    >
      <span className="text-xs font-medium tabular-nums leading-none">
        {formatBookingSlotLabel(slot.time)}
      </span>
      {congested ? (
        <span className="mt-1 rounded-full bg-amber-500/25 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-200">
          Saturado
        </span>
      ) : showDemand ? (
        <span className="mt-1 rounded-full bg-surface px-1.5 py-px text-[9px] font-medium tabular-nums text-muted">
          {slotDemandLabel(slot.count)}
        </span>
      ) : null}
    </button>
  );
}

function isoFromParts(dateStr: string, slotTime: string): string | null {
  const d = combineDateAndSlot(dateStr, slotTime);
  return d ? d.toISOString() : null;
}

function partsFromIso(iso: string | null): { dateStr: string; slotTime: string } {
  if (!iso) {
    return { dateStr: '', slotTime: '' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: '', slotTime: '' };
  }
  return {
    dateStr: zonedCalendarDateString(d),
    slotTime: getSlotStartFromInstant(d) ?? '',
  };
}

export function BookingSlotPicker({
  value,
  onChange,
  sucursalId,
  servicioCategoria = null,
  servicioId = null,
  servicio = null,
  branchPhone,
  disabled = false,
}: BookingSlotPickerProps) {
  const minDate = useMemo(() => zonedCalendarDateString(new Date()), []);
  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const showTimeZoneWarning = userTimeZone !== BOOKING_TIMEZONE;
  const initial = useMemo(() => partsFromIso(value), [value]);

  const [dateStr, setDateStr] = useState(
    () => initial.dateStr || defaultBookingDateString(),
  );
  const [slotTime, setSlotTime] = useState(initial.slotTime);
  const [slots, setSlots] = useState<SlotOption[]>(() =>
    slotOptionsFromTimes(generateBookingSlots()),
  );
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [densityAvailable, setDensityAvailable] = useState(true);

  useEffect(() => {
    const next = partsFromIso(value);
    setDateStr(next.dateStr || defaultBookingDateString());
    setSlotTime(next.slotTime);
  }, [value]);

  useEffect(() => {
    if (!dateStr || !sucursalId) {
      setSlots(slotOptionsFromTimes(generateBookingSlots()));
      setDensityAvailable(true);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({ date: dateStr, sucursalId });
        if (servicioCategoria?.trim()) {
          qs.set('categoria', servicioCategoria.trim());
        } else if (servicioId?.trim()) {
          qs.set('servicioId', servicioId.trim());
        } else if (servicio?.trim()) {
          qs.set('servicio', servicio.trim());
        }
        const res = await fetch(`/api/booking/slots?${qs.toString()}`);
        const data = (await res.json()) as {
          slots?: SlotOption[];
          densityAvailable?: boolean;
          error?: string;
        };
        if (cancelled) return;
        setDensityAvailable(data.densityAvailable !== false);
        if (res.ok && Array.isArray(data.slots)) {
          setSlots(
            data.slots.map((slot) => ({
              ...slot,
              label: formatBookingSlotLabel(slot.time),
            })),
          );
        } else {
          setSlots(slotOptionsFromTimes(generateBookingSlots()));
        }
      } catch {
        if (!cancelled) {
          setSlots(slotOptionsFromTimes(generateBookingSlots()));
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateStr, sucursalId, servicioCategoria, servicioId, servicio]);

  const selectedSlot = slots.find((s) => s.time === slotTime) ?? null;
  const showCongestionWarning = Boolean(selectedSlot?.congested);
  const slotsReady = Boolean(dateStr && sucursalId && !loadingSlots);
  const slotsDisabled = disabled || !slotsReady;

  function emitChange(nextDate: string, nextSlot: string) {
    if (!nextDate || !nextSlot) {
      onChange(null);
      return;
    }
    onChange(isoFromParts(nextDate, nextSlot));
  }

  return (
    <div className="space-y-2.5">
      <div>
        <label className="mb-1 block text-xs text-muted">Fecha</label>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 focus-within:border-gold">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-gold" />
          <input
            type="date"
            min={minDate}
            value={dateStr}
            disabled={disabled}
            onChange={(e) => {
              const nextDate = e.target.value;
              setDateStr(nextDate);
              const validSlot =
                slotTime && generateBookingSlots().includes(slotTime) ? slotTime : '';
              if (!validSlot) {
                setSlotTime('');
                onChange(null);
                return;
              }
              emitChange(nextDate, validSlot);
            }}
            className="w-full bg-transparent text-sm text-foreground outline-none [color-scheme:dark] disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted">Hora</label>
        <p className="mb-1.5 text-[11px] text-muted">
          Horarios en hora de Guatemala (GT)
        </p>
        {showTimeZoneWarning ? (
          <p className="mb-1.5 text-[11px] text-amber-200/90">
            Tu dispositivo usa otra zona; los horarios mostrados son del salón.
          </p>
        ) : null}
        <div
          className={`rounded-lg border bg-surface-2/40 p-2.5 ${
            showCongestionWarning
              ? 'border-amber-500/50 ring-1 ring-amber-500/25'
              : 'border-border'
          }`}
        >
          {slotsReady ? (
            <>
              {selectedSlot ? (
                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                  <p className="flex items-center gap-1.5 text-xs text-foreground">
                    <Clock className="h-3 w-3 shrink-0 text-gold" aria-hidden />
                    <span>{formatBookingSlotLabel(selectedSlot.time)}</span>
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSlotTime('');
                      onChange(null);
                    }}
                    className="text-[10px] text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    Limpiar
                  </button>
                </div>
              ) : (
                <p className="mb-2 px-0.5 text-[11px] text-muted">
                  Seleccioná un horario
                </p>
              )}
              <div
                role="radiogroup"
                aria-label="Horario"
                className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-4"
              >
                {slots.map((slot) => (
                  <SlotChip
                    key={slot.time}
                    slot={slot}
                    selected={slotTime === slot.time}
                    disabled={slotsDisabled}
                    onSelect={() => {
                      setSlotTime(slot.time);
                      emitChange(dateStr, slot.time);
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="px-1 py-6 text-center text-xs text-muted">
              {slotPickerPlaceholder(dateStr, sucursalId, loadingSlots)}
            </p>
          )}
        </div>
      </div>

      {showCongestionWarning ? (
        <div
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2.5 text-xs leading-relaxed text-amber-100"
        >
          <p>
            <strong className="font-semibold text-amber-50">Horario saturado</strong>
            {selectedSlot && selectedSlot.count > 0
              ? ` · ${selectedSlot.count} citas ya agendadas en esta franja.`
              : ' · Muy solicitado.'}{' '}
            Te recomendamos{' '}
            <strong className="font-semibold text-amber-50">llamar al salón</strong> para
            confirmar disponibilidad antes de asistir.
          </p>
          {branchPhone ? (
            <p className="mt-2 flex items-center gap-2 text-amber-200/90">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <a href={`tel:${branchPhone.replace(/\s/g, '')}`} className="underline-offset-2 hover:underline">
                {branchPhone}
              </a>
            </p>
          ) : null}
        </div>
      ) : !densityAvailable && dateStr && sucursalId && !loadingSlots ? (
        <p className="text-[11px] text-muted">
          No se pudo verificar la demanda de este día. Podés reservar igual o llamar al salón.
        </p>
      ) : null}
    </div>
  );
}
