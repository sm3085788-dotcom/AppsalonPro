import { View, Text, StyleSheet, Alert } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  isPaymentGatewayConfigured,
  isPaymentGatewayConfigured as isStripeConfigured,
  listStripeSavedCards,
  detachStripePaymentMethod,
  saveCardWithStripeSetup,
  formatSavedCardLabel,
  formatSavedCardSub,
} from '@appsalon/shared-config';
import { SalonButton } from '../luxury/SalonButton';
import { useTheme } from '../../theme/ThemeProvider';

export function MetodosPagoBody() {
  const { colors: c } = useTheme();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    if (!isStripeConfigured()) {
      setCards([]);
      setLoading(false);
      return;
    }
    const res = await listStripeSavedCards();
    setCards(res.cards || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onAddCard() {
    if (!isStripeConfigured()) {
      Alert.alert('Pagos', 'Tarjetas guardadas disponibles con QPayPro en modo direct (próximamente).');
      return;
    }
    const res = await saveCardWithStripeSetup({});
    if (!res.ok) Alert.alert('Pagos', res.error?.message || 'No se pudo guardar la tarjeta.');
    else void reload();
  }

  async function onRemove(card) {
    Alert.alert('Eliminar tarjeta', '¿Quitar esta tarjeta guardada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const res = await detachStripePaymentMethod(card.id);
          if (!res.ok) Alert.alert('Pagos', res.error?.message || 'No se pudo eliminar.');
          else void reload();
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: c.muted }]}>
        Pagos procesados por QPayPro. Tokenización de tarjetas guardadas pendiente (PAYMENT_MODE=direct).
      </Text>
      {loading ? (
        <Text style={{ color: c.muted }}>Cargando…</Text>
      ) : cards.length === 0 ? (
        <Text style={{ color: c.muted }}>No hay tarjetas guardadas.</Text>
      ) : (
        cards.map((card) => (
          <View key={card.id} style={[styles.card, { borderColor: c.border }]}>
            <Text style={{ color: c.text }}>{formatSavedCardLabel(card)}</Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>{formatSavedCardSub(card)}</Text>
            <SalonButton label="Eliminar" variant="ghost" onPress={() => onRemove(card)} />
          </View>
        ))
      )}
      <SalonButton label="Agregar tarjeta" onPress={() => void onAddCard()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, paddingVertical: 8 },
  lead: { fontSize: 13, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
});
