import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, getMembresiaTier, membresiaLabel, normalizeMembresiaCodigoInput } from '@appsalon/shared-config';
import { SalonButton } from '../luxury/SalonButton';
import { useTheme } from '../../theme/ThemeProvider';

export function ActivarMembresiaCard({ clienteRow, onActivated, onDone }) {
  const { colors: c } = useTheme();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);

  const nivel = clienteRow?.membresia_nivel;
  const tier = getMembresiaTier(nivel);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.card,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: 14,
          color: c.foreground,
          marginBottom: spacing.xs,
        },
        activeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        },
        activeBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.pill,
        },
        activeBadgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          letterSpacing: 0.4,
        },
        hint: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundMuted,
          lineHeight: 17,
          marginBottom: spacing.sm,
        },
        input: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          letterSpacing: 1,
          color: c.foreground,
          borderWidth: 1,
          borderColor: c.cardBorder,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          backgroundColor: c.surfaceMuted,
          marginBottom: spacing.sm,
        },
      }),
    [c],
  );

  const canjear = async () => {
    const normalized = normalizeMembresiaCodigoInput(codigo);
    if (!normalized) {
      Alert.alert('Código', 'Ingresá el código que te entregó tu asesor en el salón.');
      return;
    }
    setLoading(true);
    const { data, error } = await db.membresias.canjearCodigo(normalized);
    setLoading(false);
    if (error) {
      Alert.alert('No se activó', error.message || 'Revisá el código e intentá de nuevo.');
      return;
    }
    setCodigo('');
    const label = data?.label || membresiaLabel(data?.nivel) || 'Membresía';
    onActivated?.();
    Alert.alert(
      '¡Listo!',
      `Tu membresía ${label} quedó activa en tu perfil.`,
      [{ text: 'Ver mi perfil', onPress: () => onDone?.() }],
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tu membresía</Text>
      {tier ? (
        <View style={styles.activeRow}>
          <View style={[styles.activeBadge, { backgroundColor: `${tier.accent}22` }]}>
            <Text style={[styles.activeBadgeTxt, { color: tier.accent }]}>{tier.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.hint, { marginBottom: 0, flex: 1 }]}>
            Activa desde{' '}
            {clienteRow?.membresia_activada_en
              ? new Date(clienteRow.membresia_activada_en).toLocaleDateString('es-GT')
              : '—'}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Tu asesor en el salón te propondrá Bronce, Plata o VIP y te dará un código. Ingresalo aquí para activarlo en tu
          perfil.
        </Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="AURA-VIP-XXXXX"
        placeholderTextColor={c.foregroundSubtle}
        value={codigo}
        onChangeText={(v) => setCodigo(normalizeMembresiaCodigoInput(v))}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {loading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <SalonButton
          title={tier ? 'Cambiar con nuevo código' : 'Activar membresía'}
          variant="heroGold"
          fullWidth
          onPress={canjear}
        />
      )}
    </View>
  );
}
