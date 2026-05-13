import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as colorsLight, colorsDark } from '@appsalon/design-tokens';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

const STORAGE_KEY = '@appsalon/salon/colorScheme';

const ThemeContext = createContext({
  ready: false,
  scheme: 'light',
  isDark: false,
  colors: colorsLight,
  setScheme: () => {},
});

export function ThemeProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [scheme, setSchemeState] = useState('light');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) return;
      if (v === 'dark' || v === 'light') {
        setSchemeState(v);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setScheme = useCallback(async (next) => {
    const s = next === 'dark' ? 'dark' : 'light';
    setSchemeState(s);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isDark = scheme === 'dark';
    const bg = isDark ? colorsDark.background : colorsLight.background;
    void SystemUI.setBackgroundColorAsync(bg);
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setStyle(isDark ? 'dark' : 'light');
      } catch {
        /* ignore */
      }
    }
  }, [ready, scheme]);

  const value = useMemo(() => {
    const isDark = scheme === 'dark';
    return {
      ready,
      scheme,
      isDark,
      colors: isDark ? colorsDark : colorsLight,
      setScheme,
    };
  }, [ready, scheme, setScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
