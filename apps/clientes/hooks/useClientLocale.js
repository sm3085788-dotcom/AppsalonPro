import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStrings, t as translate, localeTag as toLocaleTag } from '../i18n';

const LOCALE_KEY = '@appsalon/clientes/locale';

export const CLIENT_LOCALES = {
  es: { id: 'es', label: 'Español', regionLabel: 'Español (Latinoamérica)' },
  en: { id: 'en', label: 'English', regionLabel: 'English (US)' },
};

const ClientLocaleContext = createContext(null);

export function ClientLocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('es');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_KEY);
        if (alive && (stored === 'es' || stored === 'en')) setLocaleState(stored);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setLocale = useCallback(async (next) => {
    const id = next === 'en' ? 'en' : 'es';
    setLocaleState(id);
    await AsyncStorage.setItem(LOCALE_KEY, id);
  }, []);

  const toggleLocale = useCallback(async () => {
    await setLocale(locale === 'es' ? 'en' : 'es');
  }, [locale, setLocale]);

  const strings = useMemo(() => getStrings(locale), [locale]);
  const localeMeta = useMemo(
    () => ({
      ...CLIENT_LOCALES[locale],
      regionLabel: strings.localeMeta?.[locale] ?? CLIENT_LOCALES[locale].regionLabel,
    }),
    [locale, strings],
  );

  const t = useCallback((key, vars) => translate(strings, key, vars), [strings]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      strings,
      t,
      localeMeta,
      localeTag: toLocaleTag(locale),
      ready,
      configStrings: {
        language: strings.config.language,
        timezone: strings.config.timezone,
        timezoneValue: strings.config.timezoneValue,
        clientVersion: strings.config.clientVersion,
        darkMode: strings.config.darkMode,
        on: strings.config.on,
        off: strings.config.off,
      },
    }),
    [locale, setLocale, toggleLocale, strings, t, localeMeta, ready],
  );

  return <ClientLocaleContext.Provider value={value}>{children}</ClientLocaleContext.Provider>;
}

export function useClientLocale() {
  const ctx = useContext(ClientLocaleContext);
  if (!ctx) {
    throw new Error('useClientLocale must be used within ClientLocaleProvider');
  }
  return ctx;
}
