import { View, Text, StyleSheet } from 'react-native';
import { Wallet, Banknote, UserRound } from 'lucide-react-native';
import { typography } from '@appsalon/design-tokens';
import {
  isClienteAppVerificado,
  isClienteWeb,
  isClienteManual,
  clienteOrigenLabel,
  CLIENTE_WEB_AURA,
  CLIENTE_MANUAL_AURA,
} from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Icono de origen de ficha cliente: App (Wallet), Web (Banknote), Manual (UserRound).
 */
export function ClienteOrigenIcon({ row, size = 16, showLabel = false, style }) {
  const { colors: c } = useTheme();
  const label = clienteOrigenLabel(row);

  let Icon = UserRound;
  let color = CLIENTE_MANUAL_AURA.chipText;
  if (isClienteAppVerificado(row)) {
    Icon = Wallet;
    color = c.primary;
  } else if (isClienteWeb(row)) {
    Icon = Banknote;
    color = CLIENTE_WEB_AURA.chipText;
  } else if (isClienteManual(row)) {
    Icon = UserRound;
    color = CLIENTE_MANUAL_AURA.chipText;
  }

  return (
    <View style={[styles.wrap, style]} accessibilityLabel={`Origen: ${label}`}>
      <Icon size={size} color={color} strokeWidth={2.1} />
      {showLabel ? (
        <Text style={[styles.lbl, { color }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lbl: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
  },
});
