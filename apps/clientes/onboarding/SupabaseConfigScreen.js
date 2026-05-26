import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AuraLogoMark } from '../components/AuraLogoMark';

/**
 * La app clientes requiere Supabase; sin .env no hay login ni sincronización con el salón.
 */
export function SupabaseConfigScreen() {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.background,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <AuraLogoMark diameter={100} />
      <Text style={[styles.title, { color: c.foreground }]}>Falta conexión al salón</Text>
      <Text style={[styles.body, { color: c.foregroundMuted }]}>
        Configurá en apps/clientes/.env las variables EXPO_PUBLIC_SUPABASE_URL y
        EXPO_PUBLIC_SUPABASE_ANON_KEY (mismo proyecto que App Salón). Reiniciá Expo con -c.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
