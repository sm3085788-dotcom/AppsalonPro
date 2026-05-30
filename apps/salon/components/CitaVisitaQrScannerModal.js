import { useRef, useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { visitaTokensMatch } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from './luxury/SalonButton';
import { modalSheetBottomPad } from './luxury';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CitaVisitaQrScannerModal({ visible, expectedToken, onClose, onVerified }) {
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
    if (visitaTokensMatch(raw, expectedToken)) {
      scannedRef.current = true;
      onVerified?.();
      return true;
    }
    Alert.alert('QR incorrecto', 'Este código no corresponde a la visita de esta cita.');
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
            <Text style={[styles.title, { color: c.foreground }]}>Validar visita (referido)</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            Escaneá el QR de visita del cliente en App Clientes (cita confirmada).
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

          <TextInput
            style={[styles.manualIn, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
            placeholder="Token manual"
            placeholderTextColor={c.foregroundSubtle}
            value={manual}
            onChangeText={setManual}
            autoCapitalize="characters"
          />
          <SalonButton title="Verificar código" variant="heroGold" fullWidth onPress={() => verify(manual)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontFamily: typography.fontSansMedium, fontSize: 17 },
  sub: { fontFamily: typography.fontSans, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  permBox: { marginBottom: spacing.md },
  camWrap: { height: 220, borderRadius: radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.md },
  manualIn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: typography.fontSansMedium,
    letterSpacing: 1,
  },
});
