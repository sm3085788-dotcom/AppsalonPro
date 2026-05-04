// 🎨 Tema y Colores de AppSalon Pro
// Configuración centralizada de diseño para ambas apps

import { DefaultTheme as PaperDefaultTheme } from 'react-native-paper';

// ============ PALETA DE COLORES ============
export const Colors = {
  // Primarios
  gold: '#D4AF37',
  silver: '#C0C0C0',
  cream: '#FDFBF7',
  
  // Neutros
  white: '#FFFFFF',
  charcoal: '#2C2C2C',
  gray: '#6C6C6C',
  lightGray: '#E0E0E0',
  darkGray: '#4A4A4A',
  
  // Estados
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Transparencias
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  goldTransparent: 'rgba(212, 175, 55, 0.1)',
  
  // Gradientes (arrays para LinearGradient)
  goldGradient: ['#D4AF37', '#B8A134'],
  silverGradient: ['#C0C0C0', '#A8A8A8'],
  creamGradient: ['#FFFFFF', '#FDFBF7'],
  luxuryGradient: ['#D4AF37', '#C0C0C0', '#FDFBF7'],
};

// ============ TEMA DE REACT NATIVE PAPER ============
export const PaperTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: Colors.gold,
    accent: Colors.silver,
    background: Colors.cream,
    surface: Colors.white,
    text: Colors.charcoal,
    placeholder: Colors.gray,
    backdrop: Colors.overlay,
    error: Colors.error,
    notification: Colors.gold,
    onSurface: Colors.charcoal,
  },
  roundness: 16,
  fonts: {
    ...PaperDefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '200',
    },
  },
};

// ============ TIPOGRAFÍA ============
export const Typography = {
  // Tamaños
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body: 14,
  caption: 12,
  tiny: 10,
  
  // Pesos
  thin: '100',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  
  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.8,
};

// ============ ESPACIADO ============
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ============ SOMBRAS ============
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============ BORDER RADIUS ============
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 999,
};

// ============ ESTILOS COMUNES ============
export const CommonStyles = {
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.medium,
  },
  cardElevated: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.large,
  },
  
  // Botones
  buttonPrimary: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.round,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  buttonSecondary: {
    backgroundColor: Colors.silver,
    borderRadius: BorderRadius.round,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  buttonOutline: {
    borderColor: Colors.gold,
    borderWidth: 1,
    borderRadius: BorderRadius.round,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  
  // Texto
  textHeading: {
    fontSize: Typography.h1,
    fontWeight: Typography.light,
    color: Colors.charcoal,
    letterSpacing: 2,
  },
  textSubheading: {
    fontSize: Typography.h4,
    fontWeight: Typography.light,
    color: Colors.gray,
  },
  textBody: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: Colors.charcoal,
    lineHeight: Typography.body * Typography.lineHeightNormal,
  },
  textCaption: {
    fontSize: Typography.caption,
    fontWeight: Typography.light,
    color: Colors.gray,
  },
  
  // Input
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.body,
    color: Colors.charcoal,
  },
  inputFocused: {
    borderColor: Colors.gold,
    borderWidth: 2,
  },
  
  // Header
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.small,
  },
  
  // Lista
  listItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    ...Shadows.small,
  },
  
  // Separadores
  divider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: Spacing.md,
  },
  
  // Badge
  badge: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Status indicators
  statusSuccess: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusError: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusWarning: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
};

// ============ ANIMACIONES ============
export const Animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Exportación por defecto del tema completo
export default {
  Colors,
  PaperTheme,
  Typography,
  Spacing,
  Shadows,
  BorderRadius,
  CommonStyles,
  Animations,
};
