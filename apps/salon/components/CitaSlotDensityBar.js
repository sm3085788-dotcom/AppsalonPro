import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import {
  generateBookingSlots,
  buildSlotDensityMap,
  CITA_CONGESTION_THRESHOLD,
} from '@appsalon/shared-config';

const CONGESTED_BG = '#E65100';
const CONGESTED_FG = '#FFFFFF';
const NEUTRAL_BG = '#2E7D32';
const NEUTRAL_FG = '#FFFFFF';
const EMPTY_BG = '#37474F';
const EMPTY_FG = '#CFD8DC';

/**
 * Barra horizontal de densidad por franja (8:00–22:00) para un día concreto.
 * Vista global (todas las ramas); la reserva web filtra por categoría en BookingSlotPicker.
 */
export function CitaSlotDensityBar({ citas, date, sucursalId, matrizId = null }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(), []);

  const densityMap = useMemo(
    () => buildSlotDensityMap(citas, date, sucursalId, { matrizId }),
    [citas, date, sucursalId, matrizId],
  );

  const slots = useMemo(() => generateBookingSlots(), []);

  if (!date) return null;

  return (
    <View style={[styles.wrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
      <Text style={[styles.title, { color: c.foreground }]}>Densidad del día</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {slots.map((slot) => {
          const entry = densityMap[slot];
          const count = entry?.count ?? 0;
          const congested = entry?.congested ?? false;
          const bg = count === 0 ? EMPTY_BG : congested ? CONGESTED_BG : NEUTRAL_BG;
          const fg = count === 0 ? EMPTY_FG : congested ? CONGESTED_FG : NEUTRAL_FG;
          return (
            <View key={slot} style={[styles.cell, { backgroundColor: bg }]}>
              <Text style={[styles.cellTime, { color: fg }]}>{slot}</Text>
              {count > 0 ? (
                <Text style={[styles.cellCount, { color: fg }]}>{count}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Text style={[styles.legend, { color: c.foregroundMuted }]}>
        Congestionado (≥{CITA_CONGESTION_THRESHOLD} citas)
      </Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    title: {
      fontSize: typography.size.sm,
      fontFamily: typography.fontFamily.medium,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingBottom: spacing.xs,
    },
    cell: {
      minWidth: 52,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.sm,
      alignItems: 'center',
    },
    cellTime: {
      fontSize: 10,
      fontFamily: typography.fontFamily.medium,
    },
    cellCount: {
      marginTop: 2,
      fontSize: 11,
      fontFamily: typography.fontFamily.bold,
    },
    legend: {
      marginTop: spacing.sm,
      fontSize: typography.size.xs,
    },
  });
}
