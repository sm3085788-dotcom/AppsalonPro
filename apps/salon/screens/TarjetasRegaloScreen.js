import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gift, KeyRound } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  listGiftCardsStaff,
  lookupGiftCardStaff,
  activateGiftCardAtSalon,
  verifyGiftCardBirthday,
  registerGiftCardUse,
  createGiftCardActivationCode,
  listGiftCardActivationCodesStaff,
  normalizeGtWhatsappPhone,
  SALON_CONTACTO,
} from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { GiftCardQrScannerModal } from '../components/GiftCardQrScannerModal';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function formatQ(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `Q${v.toFixed(2)}`;
}

const WEB_ACTIVATE_URL = 'https://appsalon-pro-web-catalogo.vercel.app/tarjeta-regalo/activar';

export function TarjetasRegaloScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const [cards, setCards] = useState([]);
  const [pendingCodes, setPendingCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [useAmount, setUseAmount] = useState('');
  const [useNotes, setUseNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [emitOpen, setEmitOpen] = useState(true);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [emitForm, setEmitForm] = useState({
    monto: '',
    paraNombre: '',
    deNombre: '',
    mensaje: '',
    compradorTelefono: '',
  });

  const loadList = useCallback(async () => {
    const [cardsRes, codesRes] = await Promise.all([
      listGiftCardsStaff(40),
      listGiftCardActivationCodesStaff(15),
    ]);
    if (cardsRes.ok) setCards(cardsRes.cards || []);
    if (codesRes.ok) setPendingCodes(codesRes.codes || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadList();
      setLoading(false);
    })();
  }, [loadList]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadList();
    setRefreshing(false);
  }, [loadList]);

  const openCode = useCallback(async (codigo) => {
    setBusy(true);
    setScannerOpen(false);
    try {
      const res = await lookupGiftCardStaff(codigo);
      if (!res.ok) {
        Alert.alert('Tarjeta regalo', res.error || 'No encontrada.');
        return;
      }
      setSelected(res.card);
      setUseAmount('');
      setUseNotes('');
    } finally {
      setBusy(false);
    }
  }, []);

  const runEmitCode = useCallback(async () => {
    const monto = Number(String(emitForm.monto).replace(',', '.'));
    if (!Number.isFinite(monto) || monto < 50 || monto > 2000) {
      Alert.alert('Monto', 'El monto debe estar entre Q50 y Q2000.');
      return;
    }
    if (!emitForm.paraNombre.trim() || !emitForm.deNombre.trim() || !emitForm.compradorTelefono.trim()) {
      Alert.alert('Datos', 'Completa para, de y teléfono del comprador.');
      return;
    }
    const phone = normalizeGtWhatsappPhone(emitForm.compradorTelefono);
    if (!phone) {
      Alert.alert('Teléfono', 'Ingresá un número válido (8 dígitos o 502 + 8).');
      return;
    }
    setBusy(true);
    try {
      const res = await createGiftCardActivationCode({
        monto,
        paraNombre: emitForm.paraNombre.trim(),
        deNombre: emitForm.deNombre.trim(),
        mensaje: emitForm.mensaje.trim(),
        compradorTelefono: phone,
      });
      if (!res.ok) {
        Alert.alert('Código de activación', res.error || 'No se pudo generar.');
        return;
      }
      setGeneratedCode(res);
      await loadList();
      setEmitForm({ monto: '', paraNombre: '', deNombre: '', mensaje: '', compradorTelefono: '' });
    } finally {
      setBusy(false);
    }
  }, [emitForm, loadList]);

  const shareActivationCode = useCallback((codeRow) => {
    const code = codeRow?.codigo_activacion || codeRow?.codigoActivacion;
    if (!code) return;
    const phone =
      normalizeGtWhatsappPhone(codeRow?.comprador_telefono || codeRow?.compradorTelefono) ||
      SALON_CONTACTO.whatsapp;
    const msg = [
      `Tarjeta VIP ANDREAS · código de activación: ${code}`,
      `Monto: ${formatQ(codeRow.monto)}`,
      `Actívala en: ${WEB_ACTIVATE_URL}`,
      `Servicio al cliente: ${SALON_CONTACTO.telefonoLabel}`,
    ].join('\n');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    void Linking.openURL(url);
  }, []);

  const runActivate = useCallback(async () => {
    if (!selected?.codigo) return;
    Alert.alert(
      'Activar tarjeta',
      '¿Confirmás identidad del destinatario? La tarjeta quedará activa para usar saldo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await activateGiftCardAtSalon(selected.codigo);
              if (!res.ok) {
                Alert.alert('Tarjeta regalo', res.error || 'No se pudo activar.');
                return;
              }
              setSelected(res.card);
              await loadList();
              Alert.alert('Listo', 'Tarjeta activada.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [selected, loadList]);

  const runBirthday = useCallback(async () => {
    if (!selected?.codigo) return;
    Alert.alert(
      'Verificar cumpleaños',
      '¿Confirmás identificación? Tras agotar saldo, aplicar 15% manual en caja.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Verificar ID',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await verifyGiftCardBirthday(selected.codigo);
              if (!res.ok) {
                Alert.alert('Tarjeta regalo', res.error || 'No se pudo verificar.');
                return;
              }
              setSelected(res.card);
              Alert.alert('Verificado', res.message || 'Cumpleaños confirmado.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [selected]);

  const runUse = useCallback(async () => {
    if (!selected?.codigo) return;
    const monto = Number(String(useAmount).replace(',', '.'));
    if (!Number.isFinite(monto) || monto <= 0) {
      Alert.alert('Monto', 'Ingresá un monto válido.');
      return;
    }
    setBusy(true);
    try {
      const res = await registerGiftCardUse(selected.codigo, monto, useNotes);
      if (!res.ok) {
        Alert.alert('Tarjeta regalo', res.error || 'No se pudo registrar.');
        return;
      }
      setSelected(res.card);
      setUseAmount('');
      setUseNotes('');
      await loadList();
      if (res.card?.cumpleanos_bonus_disponible) {
        Alert.alert('Saldo agotado', 'Aplicar 15% manual en caja (cumpleaños verificado).');
      }
    } finally {
      setBusy(false);
    }
  }, [selected, useAmount, useNotes, loadList]);

  const inputStyle = [
    styles.input,
    { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card },
  ];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Tarjetas regalo"
        subtitle="VIP · código · activación y saldo"
        onBack={onBack}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {!selected ? (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
            <TouchableOpacity
              style={[styles.emitHeader, { borderColor: c.cardBorder, backgroundColor: c.card }]}
              onPress={() => setEmitOpen((v) => !v)}
            >
              <KeyRound size={18} color={c.primary} />
              <Text style={[styles.emitHeaderTxt, { color: c.foreground }]}>
                Emitir código de activación
              </Text>
            </TouchableOpacity>

            {emitOpen ? (
              <View style={[styles.emitBox, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                <Text style={[styles.emitHint, { color: c.foregroundMuted }]}>
                  Tras validar monto y pago con tarjeta, generá un código para que el comprador lo
                  ingrese en la web y obtenga la tarjeta compartible.
                </Text>
                <TextInput style={inputStyle} placeholder="Monto Q (50–2000)" placeholderTextColor={c.foregroundSubtle} keyboardType="decimal-pad" value={emitForm.monto} onChangeText={(v) => setEmitForm((f) => ({ ...f, monto: v }))} />
                <TextInput style={inputStyle} placeholder="Para (destinatario)" placeholderTextColor={c.foregroundSubtle} value={emitForm.paraNombre} onChangeText={(v) => setEmitForm((f) => ({ ...f, paraNombre: v }))} />
                <TextInput style={inputStyle} placeholder="De (comprador)" placeholderTextColor={c.foregroundSubtle} value={emitForm.deNombre} onChangeText={(v) => setEmitForm((f) => ({ ...f, deNombre: v }))} />
                <TextInput style={inputStyle} placeholder="Teléfono comprador (WhatsApp)" placeholderTextColor={c.foregroundSubtle} keyboardType="phone-pad" value={emitForm.compradorTelefono} onChangeText={(v) => setEmitForm((f) => ({ ...f, compradorTelefono: v }))} />
                <TextInput style={inputStyle} placeholder="Mensaje (opcional)" placeholderTextColor={c.foregroundSubtle} value={emitForm.mensaje} onChangeText={(v) => setEmitForm((f) => ({ ...f, mensaje: v }))} />
                <SalonButton title="Generar código ACT-" variant="heroGold" fullWidth onPress={() => void runEmitCode()} disabled={busy} />
              </View>
            ) : null}

            {pendingCodes.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text style={[styles.sectionLbl, { color: c.foreground }]}>Códigos pendientes</Text>
                {pendingCodes.map((row) => (
                  <View key={row.id} style={[styles.row, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: c.foreground }]}>{row.codigo_activacion}</Text>
                      <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
                        {row.para_nombre} · {formatQ(row.monto)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => shareActivationCode(row)}>
                      <Text style={{ color: c.primary, fontFamily: typography.fontSansMedium, fontSize: 13 }}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <SalonButton
              title="Escanear QR tarjeta"
              variant="outlineGold"
              fullWidth
              onPress={() => setScannerOpen(true)}
              disabled={busy}
              style={{ marginTop: spacing.lg, marginBottom: spacing.md }}
            />

            {loading ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
            ) : (
              <FlatList
                data={cards}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.row, { backgroundColor: c.card, borderColor: c.cardBorder }]}
                    onPress={() => void openCode(item.codigo)}
                  >
                    <Gift size={18} color={c.primary} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={[styles.rowTitle, { color: c.foreground }]}>{item.codigo}</Text>
                      <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
                        {item.para_nombre} · {formatQ(item.saldo)} · {item.estado}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: c.foregroundMuted }]}>
                    Las tarjetas activadas aparecerán aquí cuando el comprador use su código en la web.
                  </Text>
                }
              />
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
            <Text style={[styles.detailTitle, { color: c.foreground }]}>{selected.codigo}</Text>
            <Text style={[styles.detailMeta, { color: c.foregroundMuted }]}>
              Para: {selected.para_nombre} · De: {selected.de_nombre}
            </Text>
            <Text style={[styles.detailMeta, { color: c.foregroundMuted }]}>
              Saldo: {formatQ(selected.saldo)} / {formatQ(selected.monto_inicial)} · {selected.estado}
            </Text>
            <Text style={[styles.detailMeta, { color: c.foregroundMuted }]}>
              Emisión: {formatWhen(selected.emitida_en)} · Vence: {formatWhen(selected.vence_en)}
            </Text>
            {selected.mensaje ? (
              <Text style={[styles.detailQuote, { color: c.foreground }]}>&ldquo;{selected.mensaje}&rdquo;</Text>
            ) : null}

            {selected.estado === 'issued' ? (
              <SalonButton title="Activar tarjeta (verificar ID)" variant="heroGold" fullWidth onPress={() => void runActivate()} disabled={busy} style={{ marginTop: spacing.lg }} />
            ) : null}

            {selected.estado === 'activated' ? (
              <>
                <SalonButton
                  title={selected.cumpleanos_verificado ? 'Cumpleaños verificado' : 'Verificar cumpleaños (ID)'}
                  variant="outlineGold"
                  fullWidth
                  onPress={() => void runBirthday()}
                  disabled={busy || selected.cumpleanos_verificado}
                  style={{ marginTop: spacing.lg }}
                />
                <Text style={[styles.fieldLbl, { color: c.foreground }]}>Registrar uso de saldo</Text>
                <TextInput style={inputStyle} placeholder="Monto Q" placeholderTextColor={c.foregroundSubtle} keyboardType="decimal-pad" value={useAmount} onChangeText={setUseAmount} />
                <TextInput style={inputStyle} placeholder="Notas (opcional)" placeholderTextColor={c.foregroundSubtle} value={useNotes} onChangeText={setUseNotes} />
                <SalonButton title="Registrar descuento" variant="heroGold" fullWidth onPress={() => void runUse()} disabled={busy} />
              </>
            ) : null}

            {selected.cumpleanos_bonus_disponible ? (
              <Text style={[styles.bonusHint, { color: c.primary }]}>
                15% cumpleaños — aplicar manual en caja.
              </Text>
            ) : null}

            <SalonButton title="Cerrar ficha" variant="outlineGray" fullWidth onPress={() => setSelected(null)} style={{ marginTop: spacing.lg }} />
          </ScrollView>
        )}
      </SubScreenChrome>

      <Modal visible={Boolean(generatedCode)} transparent animationType="fade" onRequestClose={() => setGeneratedCode(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Código generado</Text>
            <Text style={[styles.modalCode, { color: c.primary }]}>{generatedCode?.codigo_activacion}</Text>
            <Text style={[styles.modalMeta, { color: c.foregroundMuted }]}>
              {generatedCode?.para_nombre} · {formatQ(generatedCode?.monto)}
            </Text>
            <Text style={[styles.modalHint, { color: c.foregroundMuted }]}>
              Dictá este código al comprador. Debe ingresarlo en la web para obtener la tarjeta PNG.
            </Text>
            <SalonButton title="Enviar por WhatsApp" variant="heroGold" fullWidth onPress={() => shareActivationCode(generatedCode)} style={{ marginTop: spacing.md }} />
            <SalonButton title="Cerrar" variant="outlineGray" fullWidth onPress={() => setGeneratedCode(null)} style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      </Modal>

      <GiftCardQrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onPayload={(code) => void openCode(code)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  emitHeaderTxt: { fontFamily: typography.fontSansMedium, fontSize: 15, flex: 1 },
  emitBox: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  emitHint: { fontFamily: typography.fontSans, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  sectionLbl: { fontFamily: typography.fontSansMedium, fontSize: 14, marginBottom: spacing.sm },
  detailTitle: { fontFamily: typography.fontDisplay, fontSize: 22 },
  detailMeta: { fontFamily: typography.fontSans, fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  detailQuote: { fontFamily: typography.fontSans, fontSize: 14, fontStyle: 'italic', marginTop: spacing.md },
  fieldLbl: { fontFamily: typography.fontSansMedium, fontSize: 14, marginTop: spacing.lg, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: typography.fontSans,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  bonusHint: { fontFamily: typography.fontSansMedium, fontSize: 13, marginTop: spacing.md },
  empty: { fontFamily: typography.fontSans, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowTitle: { fontFamily: typography.fontSansMedium, fontSize: 15 },
  rowSub: { fontFamily: typography.fontSans, fontSize: 13, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  modalTitle: { fontFamily: typography.fontSansMedium, fontSize: 16 },
  modalCode: { fontFamily: typography.fontDisplay, fontSize: 28, marginTop: spacing.md, letterSpacing: 2 },
  modalMeta: { fontFamily: typography.fontSans, fontSize: 14, marginTop: spacing.xs },
  modalHint: { fontFamily: typography.fontSans, fontSize: 13, marginTop: spacing.md, lineHeight: 19 },
});
