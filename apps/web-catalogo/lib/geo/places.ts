'use client';

import { Loader } from '@googlemaps/js-api-loader';
import { env, isMapsConfigured } from '@/lib/env';

let loaderPromise: Promise<typeof google> | null = null;

/** Carga la API de Google Maps (Places) una sola vez. null si no hay llave. */
export function loadGoogleMaps(): Promise<typeof google> | null {
  if (!isMapsConfigured) return null;
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: env.googleMapsApiKey,
      version: 'weekly',
      libraries: ['places'],
    });
    loaderPromise = loader.load();
  }
  return loaderPromise;
}
