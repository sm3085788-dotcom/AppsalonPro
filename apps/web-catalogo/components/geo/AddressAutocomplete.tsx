'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/geo/places';
import { isMapsConfigured } from '@/lib/env';
import type { DeliveryAddress } from '@/lib/types/db';

/**
 * Req 7: autocompletado de direcciones con Google Places. Captura coordenadas
 * exactas (latitud/longitud) para el servicio a domicilio. Si no hay llave de
 * Maps, degrada a entrada manual (sin coordenadas).
 */
export function AddressAutocomplete({
  onSelect,
}: {
  onSelect: (address: DeliveryAddress | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState(!isMapsConfigured);

  useEffect(() => {
    const promise = loadGoogleMaps();
    if (!promise) {
      setManual(true);
      return;
    }
    let autocomplete: google.maps.places.Autocomplete | null = null;
    promise
      .then((google) => {
        if (!inputRef.current) return;
        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry'],
          types: ['address'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete!.getPlace();
          const loc = place.geometry?.location;
          if (!loc) {
            onSelect(null);
            return;
          }
          onSelect({
            direccion: place.formatted_address ?? inputRef.current!.value,
            latitud: loc.lat(),
            longitud: loc.lng(),
          });
        });
        setReady(true);
      })
      .catch(() => setManual(true));

    return () => {
      if (autocomplete && typeof google !== 'undefined') {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 focus-within:border-gold">
        <MapPin className="h-4 w-4 text-gold" />
        <input
          ref={inputRef}
          type="text"
          placeholder={
            manual
              ? 'Escribe tu dirección (modo manual)'
              : 'Busca tu dirección…'
          }
          onChange={(e) => {
            if (manual) {
              onSelect(
                e.target.value
                  ? { direccion: e.target.value, latitud: 0, longitud: 0 }
                  : null,
              );
            }
          }}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </div>
      {!manual && !ready && (
        <p className="mt-1 text-xs text-muted">Cargando mapa…</p>
      )}
      {manual && (
        <p className="mt-1 text-xs text-muted">
          Maps no está configurado: las coordenadas no se capturarán
          automáticamente.
        </p>
      )}
    </div>
  );
}
