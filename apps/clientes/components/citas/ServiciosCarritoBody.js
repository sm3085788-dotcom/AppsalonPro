import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { useServiciosCart } from '../../context/ServiciosCartContext';
import {
  formatServicioDuracion,
  formatServicioPrecio,
} from '../../services/salonServiciosTienda';

export function ServiciosCarritoBody({ onClose, onContinuarAgendar }) {
  const { colors: c } = useTheme();
  const { items, removeItem, clear } = useServiciosCart();
  const styles = useMemo(() => createStyles(c), [c]);
  const n = items.length;

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>
        {n > 0
          ? `Tenés ${n} servicio${n === 1 ? '' : 's'} listo${n === 1 ? '' : 's'} para agendar. Elegí fecha y hora de cada uno en el siguiente paso.`
          : 'Agregá servicios con el botón + en Mis citas. Cuando termines, volvé aquí para agendar.'}
      </Text>

      {n === 0 ? null : (
        items.map((s) => (
          <View key={String(s.id)} style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{s.nombre}</Text>
              <Text style={styles.meta}>
                {formatServicioPrecio(s)} · {formatServicioDuracion(s)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => removeItem(s)}
              hitSlop={10}
              accessibilityLabel="Quitar de la lista"
            >
              <X size={20} color={c.foregroundSubtle} />
            </TouchableOpacity>
          </View>
        ))
      )}

      {n > 0 ? (
        <>
          <SalonButton
            variant="heroGold"
            title={n === 1 ? 'Continuar a agendar' : `Continuar a agendar (${n} servicios)`}
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => {
              onClose?.();
              onContinuarAgendar?.();
            }}
          />
          <SalonButton
            variant="outlineGray"
            title="Vaciar lista"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={clear}
          />
        </>
      ) : null}

      <SalonButton
        variant="outlineGray"
        title="Seguir eligiendo servicios"
        fullWidth
        style={{ marginTop: spacing.md }}
        onPress={onClose}
      />
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    wrap: { paddingBottom: spacing.xl },
    intro: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 21,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    name: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
    },
    meta: {
      marginTop: 2,
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
  });
}
