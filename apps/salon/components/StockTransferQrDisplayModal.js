import { View, Text, Modal, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { buildStockTransferQrPayload, stockTransferQrImageUrl } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from './luxury/SalonButton';
import { modalSheetBottomPad } from './luxury';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function StockTransferQrDisplayModal({ visible, payload, sucursalNombre, productLabels, onClose }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const qrRaw = payload ? buildStockTransferQrPayload(payload) : '';
  const qrUrl = payload ? stockTransferQrImageUrl(qrRaw, 300) : null;
  const totalUnits = (payload?.i || []).reduce((sum, row) => sum + (row.cantidad || 0), 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: c.foreground }]}>Código QR de stock</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            Mostrá o enviá este QR a la sucursal «{sucursalNombre || '—'}». En Inventario → Nuevo stock escanean el
            código y se importan {payload?.i?.length || 0} producto(s) · {totalUnits} u. · lote {payload?.l || '—'}.
          </Text>

          {qrUrl ? (
            <View style={[styles.qrWrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Image source={{ uri: qrUrl }} style={styles.qrImg} accessibilityLabel="Código QR de traslado de stock" />
            </View>
          ) : null}

          <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: spacing.md }}>
            {(payload?.i || []).map((row) => (
              <Text key={row.inventario_id} style={[styles.line, { color: c.foreground }]} numberOfLines={2}>
                · {productLabels?.[row.inventario_id] || row.inventario_id.slice(0, 8)} — +{row.cantidad} u.
              </Text>
            ))}
          </ScrollView>

          <SalonButton title="Listo" variant="heroGold" fullWidth onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '92%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontFamily: typography.fontDisplay, fontSize: 20 },
  sub: { fontFamily: typography.fontSans, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  qrWrap: {
    alignSelf: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  qrImg: { width: 260, height: 260 },
  listScroll: { maxHeight: 120, marginBottom: spacing.md },
  line: { fontFamily: typography.fontSans, fontSize: 13, lineHeight: 20 },
});
