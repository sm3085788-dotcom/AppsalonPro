import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, ChevronRight } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { CLIENT_ALERT_BELL_RED } from '../../constants/clientAlertColors';

/** Aviso sutil en Inicio cuando falta completar la ficha. */
export function ProfileIncompleteBanner({ onPress, missingLabels }) {
  const { colors: c } = useTheme();
  const hint =
    missingLabels?.length > 0
      ? `Falta: ${missingLabels.slice(0, 3).join(', ')}`
      : 'Completá tu teléfono, dirección y fecha de nacimiento.';

  return (
    <TouchableOpacity
      style={[
        styles.wrap,
        {
          backgroundColor: `${CLIENT_ALERT_BELL_RED}14`,
          borderColor: `${CLIENT_ALERT_BELL_RED}55`,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Completar perfil"
    >
      <View style={[styles.iconCircle, { backgroundColor: `${CLIENT_ALERT_BELL_RED}22` }]}>
        <AlertCircle size={18} color={CLIENT_ALERT_BELL_RED} strokeWidth={2} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: c.foreground }]}>Completá tu perfil</Text>
        <Text style={[styles.sub, { color: c.foregroundMuted }]} numberOfLines={2}>
          {hint}
        </Text>
      </View>
      <ChevronRight size={18} color={CLIENT_ALERT_BELL_RED} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
});
