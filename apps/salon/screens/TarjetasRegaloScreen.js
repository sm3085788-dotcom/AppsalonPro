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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gift } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  listGiftCardsStaff,
  lookupGiftCardStaff,
  activateGiftCardAtSalon,
  verifyGiftCardBirthday,
  registerGiftCardUse,
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

export function TarjetasRegaloScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [useAmount, setUseAmount] = useState('');
  const [useNotes, setUseNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const res = await listGiftCardsStaff(40);
    if (res.ok) setCards(res.cards || []);
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

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Tarjetas regalo"
        subtitle="VIP · QR · activación y saldo"
        onBack={onBack}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <SalonButton
          title="Escanear QR"
          variant="heroGold"
          fullWidth
          onPress={() => setScannerOpen(true)}
          disabled={busy}
          style={{ marginBottom: spacing.md }}
        />

        {selected ? (
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
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  placeholder="Monto Q"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={useAmount}
                  onChangeText={setUseAmount}
                />
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  placeholder="Notas (opcional)"
                  placeholderTextColor={c.foregroundSubtle}
                  value={useNotes}
                  onChangeText={setUseNotes}
                />
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
        ) : loading ? (
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
                Aún no hay tarjetas. Las nuevas aparecerán al pagarse en la web.
              </Text>
            }
          />
        )}
      </SubScreenChrome>

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
});
