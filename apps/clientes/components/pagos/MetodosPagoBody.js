import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { CreditCard, Trash2 } from 'lucide-react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  isStripeConfigured,
  listStripeSavedCards,
  detachStripePaymentMethod,
  saveCardWithStripeSetup,
  formatSavedCardLabel,
  formatSavedCardSub,
} from '@appsalon/shared-config';
import { SalonButton } from '../luxury/SalonButton';
import { useSubStyles } from '../luxury/SubScreenChrome';
import { useTheme } from '../../theme/ThemeProvider';

export function MetodosPagoBody({ onClose }) {
  const subStyles = useSubStyles();
  const { colors: c } = useTheme();
  const stripe = useStripe();
  const styles = useMemo(() => createStyles(c), [c]);

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isStripeConfigured()) {
      setCards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listStripeSavedCards();
    setCards(res.ok ? res.cards : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addCard = async () => {
    if (!isStripeConfigured()) {
      Alert.alert('Pagos', 'Stripe no está configurado en esta build.');
      return;
    }
    setBusy(true);
    try {
      const res = await saveCardWithStripeSetup({ stripe });
      if (!res.ok) {
        if (!res.cancelled) Alert.alert('Tarjeta', res.error?.message || 'No se pudo guardar.');
        return;
      }
      setCards(res.cards || []);
      Alert.alert('Listo', 'Tu tarjeta quedó guardada de forma segura.');
    } finally {
      setBusy(false);
    }
  };

  const removeCard = (card) => {
    Alert.alert('Eliminar tarjeta', `¿Quitar ${formatSavedCardLabel(card)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            const res = await detachStripePaymentMethod(card.id);
            setBusy(false);
            if (!res.ok) {
              Alert.alert('Error', res.error?.message || 'No se pudo eliminar.');
              return;
            }
            await load();
          })();
        },
      },
    ]);
  };

  if (!isStripeConfigured()) {
    return (
      <>
        <View style={subStyles.card}>
          <Text style={subStyles.rowLabel}>Pagos con tarjeta</Text>
          <Text style={subStyles.rowSub}>
            Los pagos con tarjeta se habilitan al publicar la app con Stripe configurado.
          </Text>
          <View style={subStyles.divider} />
          <Text style={subStyles.rowLabel}>Efectivo en salón</Text>
          <Text style={subStyles.rowSub}>Sin cargos guardados · pagás al retirar.</Text>
        </View>
        <SalonButton variant="outlineGray" title="Listo" fullWidth onPress={onClose} />
      </>
    );
  }

  return (
    <>
      <View style={subStyles.card}>
        <Text style={subStyles.rowLabel}>Tarjetas guardadas</Text>
        <Text style={[subStyles.rowSub, { marginBottom: spacing.sm }]}>
          Tus datos se procesan con Stripe. No guardamos el número completo ni el CVV.
        </Text>
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : cards.length === 0 ? (
          <Text style={subStyles.rowSub}>Aún no tenés tarjetas guardadas.</Text>
        ) : (
          cards.map((card, idx) => (
            <View key={card.id}>
              {idx > 0 ? <View style={subStyles.divider} /> : null}
              <View style={styles.cardRow}>
                <CreditCard size={20} color={c.primary} strokeWidth={1.75} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={subStyles.rowLabel}>{formatSavedCardLabel(card)}</Text>
                  <Text style={subStyles.rowSub}>{formatSavedCardSub(card)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeCard(card)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar tarjeta"
                >
                  <Trash2 size={18} color={c.foregroundMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={subStyles.divider} />
        <Text style={subStyles.rowLabel}>Efectivo en salón</Text>
        <Text style={subStyles.rowSub}>Disponible al retirar en recepción (sin guardar).</Text>
      </View>

      <SalonButton
        variant="heroGold"
        title={busy ? 'Procesando…' : 'Agregar tarjeta'}
        fullWidth
        disabled={busy}
        onPress={() => void addCard()}
      />
      <SalonButton variant="outlineGray" title="Listo" fullWidth style={{ marginTop: spacing.sm }} onPress={onClose} />
    </>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
  });
}
