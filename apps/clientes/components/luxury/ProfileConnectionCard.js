import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Database } from 'lucide-react-native';
import {
  radii,
  spacing,
  typography,
} from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

function estadoLine(session, perfilLoading, perfilMeta, clienteRow) {
  if (!session?.user) {
    return 'Estado: sin sesión iniciada';
  }
  if (perfilLoading) {
    return 'Estado: comprobando…';
  }
  if (perfilMeta?.error) {
    return 'Estado: error al leer ficha';
  }
  if (clienteRow) {
    return 'Estado: ficha cliente sincronizada';
  }
  return 'Estado: pendiente vínculo con perfil';
}

/**
 * Solo presentación; misma información que antes, estilo tipo capturas.
 */
export function ProfileConnectionCard({ session, perfilLoading, perfilMeta, clienteRow }) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.surfaceMuted,
          borderRadius: radii.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: c.cardBorder,
          overflow: 'hidden',
        },
        mainRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
        },
        iconBubble: {
          marginTop: 2,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: c.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        textCol: {
          flex: 1,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.foreground,
          marginBottom: 4,
        },
        status: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foregroundMuted,
          lineHeight: 19,
        },
        hint: {
          marginTop: spacing.sm,
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundSubtle,
          lineHeight: 17,
        },
        err: {
          marginTop: spacing.sm,
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.error,
          lineHeight: 17,
        },
        spinner: {
          marginTop: spacing.sm,
          alignSelf: 'flex-start',
        },
      }),
    [c],
  );

  const status = estadoLine(session, perfilLoading, perfilMeta, clienteRow);

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        <View style={styles.iconBubble}>
          <Database size={22} color={c.foregroundMuted} strokeWidth={1.75} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Tu cuenta</Text>
          <Text style={styles.status}>{status}</Text>
          {session?.user && perfilLoading ? (
            <ActivityIndicator
              style={styles.spinner}
              color={c.primary}
              size="small"
            />
          ) : (
            <>
              {session?.user && !perfilLoading && perfilMeta?.error ? (
                <Text style={styles.err}>Detalle: {perfilMeta.error}</Text>
              ) : null}
              {session?.user && !perfilLoading && !perfilMeta?.error && clienteRow ? (
                <Text style={styles.hint}>
                  {clienteRow.nombre}
                  {clienteRow.email ? ` · ${clienteRow.email}` : ''}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
