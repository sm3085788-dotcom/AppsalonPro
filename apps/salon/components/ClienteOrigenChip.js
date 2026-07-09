import { View, Text, StyleSheet } from 'react-native';
import { radii, typography } from '@appsalon/design-tokens';
import {
  clienteOrigenLabel,
  isClienteManual,
  isClienteWeb,
  CLIENTE_MANUAL_AURA,
  CLIENTE_WEB_AURA,
} from '@appsalon/shared-config';

function origenChipStyle(row, c) {
  if (isClienteManual(row)) {
    return { bg: CLIENTE_MANUAL_AURA.chip, text: CLIENTE_MANUAL_AURA.chipText };
  }
  if (isClienteWeb(row)) {
    return { bg: CLIENTE_WEB_AURA.chip, text: CLIENTE_WEB_AURA.chipText };
  }
  return { bg: c.surfaceMuted, text: c.foregroundMuted };
}

export function ClienteOrigenChip({ row, colors: c }) {
  const chip = origenChipStyle(row, c);
  const label = clienteOrigenLabel(row);
  return (
    <View style={[styles.chip, { backgroundColor: chip.bg }]}>
      <Text style={[styles.chipTxt, { color: chip.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  chipTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
  },
});
