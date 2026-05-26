import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { pickupQrImageUrl } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';

export function PickupQrDisplay({ trackingCode, size = 200, hint }) {
  const { colors: c } = useTheme();
  const uri = pickupQrImageUrl(trackingCode, size);
  const code = String(trackingCode || '').trim().toUpperCase();

  if (!code) return null;

  return (
    <View style={[styles.wrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radii.md }} />
      ) : (
        <ActivityIndicator color={c.primary} style={{ width: size, height: size }} />
      )}
      <Text style={[styles.code, { color: c.foreground }]} selectable>
        {code}
      </Text>
      <Text style={[styles.hint, { color: c.foregroundMuted }]}>
        {hint || 'Mostrá este QR en el salón al pagar o retirar.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  code: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  hint: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
