import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as colorsLight, colorsDark } from '@appsalon/design-tokens';
import { applyNativeChromeTheme } from './applyNativeChromeTheme';

const STORAGE_KEY = '@appsalon/clientes/colorScheme';

const ThemeContext = createContext({
  ready: false,
  scheme: 'light',
  isDark: false,
  colors: colorsLight,
  setScheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [scheme, setSchemeState] = useState('system');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) return;
      if (v === 'dark' || v === 'light' || v === 'system') {
        setSchemeState(v);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setScheme = useCallback(async (next) => {
    const s = next === 'dark' || next === 'light' ? next : 'system';
    setSchemeState(s);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isDark = scheme === 'system' ? systemScheme === 'dark' : scheme === 'dark';
    const bg = isDark ? colorsDark.background : colorsLight.background;
    applyNativeChromeTheme(isDark, bg);
  }, [ready, scheme, systemScheme]);

  const value = useMemo(() => {
    const isDark = scheme === 'system' ? systemScheme === 'dark' : scheme === 'dark';
    return {
      ready,
      scheme,
      isDark,
      colors: isDark ? colorsDark : colorsLight,
      setScheme,
    };
  }, [ready, scheme, setScheme, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
