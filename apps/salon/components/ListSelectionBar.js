import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, typography } from '@appsalon/design-tokens';
import { SalonButton, modalSheetBottomPad } from './luxury';

/**
 * Barra de modo selección: enlace en toolbar + acciones inferiores.
 * No muestra icono de basurero en cada tarjeta.
 */
export function ListSelectionToolbarLink({ active, onPress, color }) {
  return (
    <TouchableOpacity hitSlop={12} onPress={onPress} accessibilityRole="button" accessibilityLabel="Modo selección">
      <Text style={[toolbarStyles.link, { color }]}>{active ? 'Cancelar selección' : 'Seleccionar'}</Text>
    </TouchableOpacity>
  );
}

export function ListSelectionActionBar({
  count,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmVariant = 'outlineGray',
  confirmTextStyle,
  confirmStyle,
  bottomInset = 0,
  colors,
}) {
  if (count < 1) return null;
  return (
    <View
      style={[
        actionStyles.bar,
        {
          borderTopColor: colors.cardBorder,
          backgroundColor: colors.card,
          paddingBottom: modalSheetBottomPad({ bottom: bottomInset }),
        },
      ]}
    >
      <Text style={[actionStyles.meta, { color: colors.foregroundMuted }]}>
        {count} seleccionado{count === 1 ? '' : 's'}
      </Text>
      <View style={actionStyles.btns}>
        <SalonButton title="Cancelar" variant="outlineGray" onPress={onCancel} style={actionStyles.btn} />
        <SalonButton
          title={confirmLabel}
          variant={confirmVariant}
          onPress={onConfirm}
          style={[actionStyles.btn, confirmStyle]}
          textStyle={confirmTextStyle}
        />
      </View>
    </View>
  );
}

const toolbarStyles = StyleSheet.create({
  link: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
  },
});

const actionStyles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  meta: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    textAlign: 'center',
  },
  btns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: { flex: 1 },
});
