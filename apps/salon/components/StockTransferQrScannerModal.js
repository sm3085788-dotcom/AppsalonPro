import { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { parseStockTransferQrPayload } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from './luxury/SalonButton';
import { modalSheetBottomPad } from './luxury';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function StockTransferQrScannerModal({ visible, onClose, onPayload }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      scannedRef.current = false;
      setManual('');
    }
  }, [visible]);

  const verify = (raw) => {
    const payload = parseStockTransferQrPayload(raw);
    if (!payload) {
      Alert.alert('QR incorrecto', 'Este código no es un traslado de stock válido de AppsalonPro.');
      return false;
    }
    scannedRef.current = true;
    onPayload?.(payload);
    return true;
  };

  const onBarcode = ({ data }) => {
    if (scannedRef.current) return;
    verify(data);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: c.foreground }]}>Escanear traslado de stock</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            Escaneá el QR generado en matriz (Inventario → Nuevo stock). Se sumará el stock a tu sucursal
            automáticamente.
          </Text>

          {!permission?.granted ? (
            <View style={styles.permBox}>
              <SalonButton title="Permitir cámara" variant="heroGold" fullWidth onPress={() => requestPermission()} />
            </View>
          ) : (
            <View style={[styles.camWrap, { borderColor: c.cardBorder }]}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scannedRef.current ? undefined : onBarcode}
              />
            </View>
          )}

          <Text style={[styles.manualLbl, { color: c.foreground }]}>O pegá el código manualmente</Text>
          <TextInput
            style={[styles.manualIn, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
            placeholder="APSSTOCK:…"
            placeholderTextColor={c.foregroundSubtle}
            value={manual}
            onChangeText={setManual}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <SalonButton title="Importar código" variant="heroGold" fullWidth onPress={() => verify(manual)} />
          <SalonButton title="Cancelar" variant="outlineGray" fullWidth onPress={onClose} style={{ marginTop: spacing.sm }} />
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
  title: { fontFamily: typography.fontDisplay, fontSize: 20, flex: 1, paddingRight: spacing.sm },
  sub: { fontFamily: typography.fontSans, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  permBox: { marginBottom: spacing.md },
  camWrap: {
    height: 280,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  manualLbl: { fontFamily: typography.fontSansMedium, fontSize: 14, marginBottom: spacing.xs },
  manualIn: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: typography.fontSans,
    fontSize: 13,
    marginBottom: spacing.md,
  },
});
