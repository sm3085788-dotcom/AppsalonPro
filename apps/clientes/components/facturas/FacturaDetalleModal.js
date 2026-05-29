import { useMemo } from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  formatQ,
  montoVenta,
  facturaLabel,
  profesionalLabel,
  parseVentaItems,
  formatFechaVenta,
  formatMetodoPago,
} from '../../../../shared/utils/ventaFactura';
import { SalonButton } from '../luxury/SalonButton';
import { useTheme } from '../../theme/ThemeProvider';

function modalSheetBottomPad(insets) {
  return Math.max(insets.bottom + spacing.md, spacing.lg);
}

function modalScrollBottomPad(insets) {
  return Math.max(insets.bottom + spacing.lg, spacing.xl);
}

/**
 * Detalle de factura al estilo Papelería (App Salón).
 */
export function FacturaDetalleModal({ venta, visible, onClose, clienteNombre }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const detalleItems = useMemo(() => parseVentaItems(venta?.items), [venta?.items]);

  if (!venta) return null;

  const nombreCliente =
    venta?.cliente?.nombre?.trim() || venta?.cliente_nombre?.trim() || clienteNombre?.trim() || '—';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View
          style={[
            styles.detailSheet,
            { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) },
          ]}
        >
          <View style={styles.detailHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.detailTitle, { color: c.foreground }]}>Detalle de factura</Text>
              <Text style={[styles.detailFolio, { color: c.primary }]} numberOfLines={2}>
                {facturaLabel(venta)}
              </Text>
              <Text style={[styles.detailFecha, { color: c.foregroundMuted }]}>
                {formatFechaVenta(venta.fecha)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ backgroundColor: c.background }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: modalScrollBottomPad(insets) }}
          >
            <View style={[styles.detailTotalCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Text style={[styles.detailTotalLbl, { color: c.foregroundMuted }]}>Total cobrado</Text>
              <Text style={[styles.detailTotalVal, { color: c.foreground }]}>{formatQ(montoVenta(venta))}</Text>
              <Text style={[styles.detailPago, { color: c.foregroundMuted }]}>
                Pago: {formatMetodoPago(venta.metodo_pago)}
              </Text>
              {Number(venta.descuento) > 0 ? (
                <Text style={[styles.detailPago, { color: c.primary }]}>
                  Descuento: {formatQ(venta.descuento)}
                </Text>
              ) : null}
            </View>

            <View style={[styles.detailInfoCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              {[
                ['Cliente', nombreCliente],
                ['Atendido por', profesionalLabel(venta) || 'Salón'],
              ].map(([lbl, val]) => (
                <View key={lbl} style={[styles.detailInfoRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.detailInfoLbl, { color: c.foregroundMuted }]}>{lbl}</Text>
                  <Text style={[styles.detailInfoVal, { color: c.foreground }]} numberOfLines={2}>
                    {val?.trim() ? String(val) : '—'}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.detailSectionTitle, { color: c.foreground }]}>Productos y servicios</Text>
            {detalleItems.length === 0 ? (
              <Text style={[styles.detailEmptyItems, { color: c.foregroundMuted }]}>
                Sin líneas de detalle guardadas.
              </Text>
            ) : (
              <View style={[styles.itemsTable, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                <View
                  style={[
                    styles.itemsHeadRow,
                    { borderBottomColor: c.cardBorder, backgroundColor: c.surfaceMuted },
                  ]}
                >
                  <Text style={[styles.itemsHeadTxt, styles.itemsColName, { color: c.foregroundMuted }]}>
                    Artículo
                  </Text>
                  <Text style={[styles.itemsHeadTxt, styles.itemsColQty, { color: c.foregroundMuted }]}>Cant.</Text>
                  <Text style={[styles.itemsHeadTxt, styles.itemsColMoney, { color: c.foregroundMuted }]}>
                    P. unit.
                  </Text>
                  <Text style={[styles.itemsHeadTxt, styles.itemsColMoney, { color: c.foregroundMuted }]}>
                    Subtotal
                  </Text>
                </View>
                {detalleItems.map((it) => (
                  <View key={it.key} style={[styles.itemsRow, { borderBottomColor: c.cardBorder }]}>
                    <Text style={[styles.itemsName, styles.itemsColName, { color: c.foreground }]} numberOfLines={2}>
                      {it.nombre}
                    </Text>
                    <Text style={[styles.itemsQty, styles.itemsColQty, { color: c.foreground }]}>{it.cantidad}</Text>
                    <Text style={[styles.itemsMoney, styles.itemsColMoney, { color: c.foregroundMuted }]}>
                      {formatQ(it.precio_unitario)}
                    </Text>
                    <Text style={[styles.itemsMoney, styles.itemsColMoney, { color: c.primary }]}>
                      {formatQ(it.subtotal)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {venta.notas?.trim() ? (
              <>
                <Text style={[styles.detailSectionTitle, { color: c.foreground }]}>Notas</Text>
                <View style={[styles.detailNotas, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                  <Text style={[styles.detailNotasTxt, { color: c.foregroundMuted }]}>{venta.notas.trim()}</Text>
                </View>
              </>
            ) : null}
          </ScrollView>

          <SalonButton
            title="Cerrar"
            variant="outlineGray"
            fullWidth
            onPress={onClose}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    detailBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    detailSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      maxHeight: '92%',
    },
    detailHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      marginBottom: spacing.xs,
    },
    detailFolio: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    detailFecha: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 4,
    },
    detailTotalCard: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    detailTotalLbl: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    detailTotalVal: {
      fontFamily: typography.fontDisplay,
      fontSize: 28,
      marginTop: spacing.xs,
    },
    detailPago: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginTop: spacing.xs,
    },
    detailInfoCard: {
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    detailInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailInfoLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      width: 88,
    },
    detailInfoVal: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 14,
      textAlign: 'right',
    },
    detailSectionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    detailEmptyItems: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginBottom: spacing.md,
      fontStyle: 'italic',
    },
    itemsTable: {
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    itemsHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemsHeadTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    itemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemsColName: { flex: 1, minWidth: 0 },
    itemsColQty: { width: 36, textAlign: 'center' },
    itemsColMoney: { width: 64, textAlign: 'right' },
    itemsName: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    itemsQty: { fontFamily: typography.fontSans, fontSize: 13 },
    itemsMoney: { fontFamily: typography.fontSans, fontSize: 12 },
    detailNotas: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    detailNotasTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
