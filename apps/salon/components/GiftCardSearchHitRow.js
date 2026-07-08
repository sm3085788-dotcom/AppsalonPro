import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gift } from 'lucide-react-native';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

function formatQ(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `Q${v.toFixed(2)}`;
}

function estadoLabel(hit) {
  if (hit.kind === 'activation') return 'Pendiente activación';
  const e = hit.estado;
  if (e === 'depleted') return 'Completada';
  if (e === 'activated') return 'Activa';
  if (e === 'issued') return 'Emitida';
  return e || '—';
}

/**
 * Fila de resultado de búsqueda de tarjeta regalo (GC-/ACT-).
 */
export function GiftCardSearchHitRow({ hit, onPress, style }) {
  const { colors: c } = useTheme();
  if (!hit?.codigo) return null;

  const paraDe = [hit.para_nombre, hit.de_nombre ? `De ${hit.de_nombre}` : null]
    .filter(Boolean)
    .join(' · ');

  const saldoTxt =
    hit.kind === 'activation'
      ? formatQ(hit.monto)
      : `${formatQ(hit.saldo)} / ${formatQ(hit.monto)}`;

  const vinculo = hit.cliente_vinculado_nombre
    ? `Vinculada: ${hit.cliente_vinculado_nombre}`
    : hit.kind === 'card'
      ? 'Sin cliente vinculado'
      : null;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: c.cardBorder }, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Tarjeta ${hit.codigo}`}
    >
      <Gift size={18} color={c.primary} strokeWidth={2} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.code, { color: c.foreground }]} numberOfLines={1}>
            {hit.codigo}
          </Text>
          <Text style={[styles.estado, { color: c.foregroundMuted }]}>{estadoLabel(hit)}</Text>
        </View>
        <Text style={[styles.sub, { color: c.foregroundMuted }]} numberOfLines={2}>
          {[saldoTxt, paraDe, vinculo].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  code: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    flex: 1,
  },
  estado: {
    fontFamily: typography.fontSans,
    fontSize: 11,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
