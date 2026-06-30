import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCALE_KEY = '@appsalon/clientes/locale';

export const CLIENT_LOCALES = {
  es: {
    id: 'es',
    label: 'Español',
    regionLabel: 'Español (Latinoamérica)',
  },
  en: {
    id: 'en',
    label: 'English',
    regionLabel: 'English (US)',
  },
};

const CONFIG_STRINGS = {
  es: {
    language: 'Idioma',
    timezone: 'Zona horaria',
    timezoneValue: 'Guatemala (GMT−6)',
    clientVersion: 'Versión cliente',
    darkMode: 'Modo oscuro',
    on: 'Activado',
    off: 'Desactivado',
  },
  en: {
    language: 'Language',
    timezone: 'Time zone',
    timezoneValue: 'Guatemala (GMT−6)',
    clientVersion: 'Client version',
    darkMode: 'Dark mode',
    on: 'On',
    off: 'Off',
  },
};

export function useClientLocale() {
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

  const configStrings = CONFIG_STRINGS[locale] ?? CONFIG_STRINGS.es;
  const localeMeta = CLIENT_LOCALES[locale] ?? CLIENT_LOCALES.es;

  return { locale, setLocale, toggleLocale, configStrings, localeMeta, ready };
}
