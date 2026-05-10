/**
 * Fuente única de tokens UI luxury (Clientes, Salón, etc.).
 * Los nombres de `typography` deben coincidir con los pasados a `useFonts` en cada app.
 */

export const colors = {
  background: '#F9F9F9',
  /** Variante cremosa si se necesita contraste (#FDFCFB) */
  backgroundAlt: '#FDFCFB',
  foreground: '#1A1A1A',
  foregroundMuted: '#6B6B6B',
  foregroundSubtle: '#888888',
  primary: '#C5A368',
  heroCtaText: '#2D2926',
  heroSolid: '#2D2926',
  heroAccentCircle: 'rgba(255, 255, 255, 0.06)',
  primaryForegroundOnGold: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E5E5E5',
  iconCircleBg: '#F3F3F3',
  headerProfileBtn: '#F0F0F0',
  surfaceMuted: '#F5F3EF',
  /** Círculo de avatar (Perfil) y fondo de accesos rápidos (Inicio) */
  avatarCircleBg: '#E8DDD0',
  success: '#2E7D32',
  error: '#B00020',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E8E8E8',
};

/** Paleta oscura (modo cliente); mismas claves que `colors`. */
export const colorsDark = {
  background: '#121212',
  backgroundAlt: '#161616',
  foreground: '#F5F4F2',
  /** Legible sobre card (#1E1E1E) y fondo — evita gris que “desaparece”. */
  foregroundMuted: '#C6C6C6',
  foregroundSubtle: '#ADADAD',
  primary: '#C5A368',
  heroCtaText: '#F0EFED',
  heroSolid: '#E8E4DF',
  heroAccentCircle: 'rgba(255, 255, 255, 0.08)',
  primaryForegroundOnGold: '#FFFFFF',
  card: '#1E1E1E',
  cardBorder: '#333333',
  iconCircleBg: '#2C2C2C',
  headerProfileBtn: '#2A2A2A',
  surfaceMuted: '#252220',
  avatarCircleBg: '#2E2820',
  success: '#81C784',
  error: '#CF6679',
  tabBarBg: '#1A1A1A',
  tabBarBorder: '#2E2E2E',
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  fontSans: 'Inter_400Regular',
  fontSansMedium: 'Inter_500Medium',
  fontDisplay: 'PlayfairDisplay_600SemiBold',
  fontDisplayRegular: 'PlayfairDisplay_400Regular',
};

export const tabBarLayout = {
  height: 58,
};
