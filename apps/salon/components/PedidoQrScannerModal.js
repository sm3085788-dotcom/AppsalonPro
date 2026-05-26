import { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { trackingCodesMatch } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from './luxury/SalonButton';
import { modalSheetBottomPad } from './luxury';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PedidoQrScannerModal({ visible, expectedTracking, onClose, onVerified }) {
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
    if (trackingCodesMatch(raw, expectedTracking)) {
      scannedRef.current = true;
      onVerified?.();
      return true;
    }
    Alert.alert('Código incorrecto', 'Este QR no corresponde a este pedido. Pedile al cliente el código de su app.');
    return false;
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
            <Text style={[styles.title, { color: c.foreground }]}>Escanear QR del cliente</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            Pedido · código esperado: {String(expectedTracking || '—').toUpperCase()}
          </Text>

          {!permission?.granted ? (
            <View style={styles.permBox}>
              <Text style={[styles.sub, { color: c.foregroundMuted }]}>
                Necesitamos acceso a la cámara para leer el QR de App Clientes.
              </Text>
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

          <Text style={[styles.manualLbl, { color: c.foreground }]}>O ingresá el código manualmente</Text>
          <TextInput
            style={[styles.manualIn, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
            placeholder="Ej. A1B2C3D4E5"
            placeholderTextColor={c.foregroundSubtle}
            value={manual}
            onChangeText={setManual}
            autoCapitalize="characters"
          />
          <SalonButton
            title="Verificar código"
            variant="outlineGold"
            fullWidth
            onPress={() => verify(manual)}
          />
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
  title: { fontFamily: typography.fontDisplay, fontSize: 20 },
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
    fontSize: 16,
    marginBottom: spacing.md,
  },
});
