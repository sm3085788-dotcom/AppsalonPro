import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

function formatLineTotal(amount, qty) {
  const n = Number(amount) * Number(qty);
  if (!Number.isFinite(n)) return 'Q 0.00';
  return `Q ${n.toFixed(2)}`;
}

function formatUnit(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'Q 0.00';
  return `Q ${n.toFixed(2)}`;
}

/**
 * Fila de carrito estilo Amazon: imagen a la izquierda, datos y acciones a la derecha.
 */
export function TiendaCartItemCard({ item, onQtyChange, onRemove, isLast }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);

  const lineTotal = formatLineTotal(item.priceAmount, item.qty);
  const unitLabel = formatUnit(item.priceAmount);
  const hint = item.stockHint || item.shippingLabel || null;

  return (
    <View style={[styles.wrap, !isLast && styles.wrapBorder]}>
      <View style={styles.row}>
        <View style={styles.thumbWrap}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.thumbImg} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <ImageIcon size={28} color={c.foregroundMuted} strokeWidth={1.5} />
            </View>
          )}
        </View>

        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={styles.linePrice}>{lineTotal}</Text>
          </View>

          <Text style={styles.unitPrice}>
            {unitLabel}
            <Text style={styles.unitSuffix}> / unidad</Text>
          </Text>

          {hint ? (
            <Text style={styles.availability} numberOfLines={2}>
              {hint}
            </Text>
          ) : null}

          <View style={styles.actionsRow}>
            <View style={styles.qtyPill}>
              <TouchableOpacity
                style={styles.qtySideBtn}
                onPress={() => onQtyChange(-1)}
                accessibilityRole="button"
                accessibilityLabel={item.qty <= 1 ? 'Quitar del carrito' : 'Disminuir cantidad'}
              >
                {item.qty <= 1 ? (
                  <Trash2 size={16} color={c.foreground} strokeWidth={2} />
                ) : (
                  <Text style={styles.qtyBtnTxt}>−</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{item.qty}</Text>
              <TouchableOpacity
                style={styles.qtySideBtn}
                onPress={() => onQtyChange(1)}
                accessibilityRole="button"
                accessibilityLabel="Aumentar cantidad"
              >
                <Text style={styles.qtyBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onRemove}
              style={styles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel="Eliminar del carrito"
            >
              <Text style={styles.deleteTxt}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(c, isDark) {
  const qtyBorder = isDark ? 'rgba(212, 175, 55, 0.55)' : '#C9A24D';
  const availColor = isDark ? '#7DCEA0' : '#067D62';

  return StyleSheet.create({
    wrap: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    wrapBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    thumbWrap: {
      width: 108,
      height: 108,
      borderRadius: radii.sm,
      overflow: 'hidden',
      backgroundColor: isDark ? c.iconCircleBg : '#F4F4F4',
    },
    thumbImg: { width: '100%', height: '100%' },
    thumbPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    main: { flex: 1, minWidth: 0 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    title: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      lineHeight: 21,
      color: c.foreground,
    },
    linePrice: {
      fontFamily: typography.fontSansMedium,
      fontSize: 17,
      color: c.foreground,
      flexShrink: 0,
    },
    unitPrice: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    unitSuffix: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundSubtle,
    },
    availability: {
      marginTop: 6,
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      lineHeight: 17,
      color: availColor,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    qtyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: qtyBorder,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      paddingHorizontal: 4,
      paddingVertical: 4,
      gap: 2,
    },
    qtySideBtn: {
      minWidth: 36,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBtnTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 18,
      color: c.foreground,
      minWidth: 22,
      textAlign: 'center',
    },
    qtyVal: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.foreground,
      minWidth: 24,
      textAlign: 'center',
      paddingHorizontal: 4,
    },
    deleteBtn: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      backgroundColor: isDark ? c.surfaceMuted : c.card,
    },
    deleteTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foreground,
    },
  });
}
