import { useEffect } from 'react';
import * as Updates from 'expo-updates';

/** En builds con expo-updates (APK), aplica el bundle OTA más reciente al abrir la app. */
export function useClientOtaUpdate() {
  useEffect(() => {
    if (__DEV__) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (cancelled || !check.isAvailable) return;
        await Updates.fetchUpdateAsync();
        if (!cancelled) await Updates.reloadAsync();
      } catch {
        // Sin updates en simulador o builds sin canal configurado.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
