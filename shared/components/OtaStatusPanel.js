import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { spacing, typography, radii } from '@appsalon/design-tokens';

export function OtaStatusPanel({ theme, appLabel = 'App' }) {
  const c = theme?.colors ?? {};
  const [open, setOpen] = useState(false);

  const info = useMemo(() => {
    const runtime = Updates.runtimeVersion ?? Constants.expoConfig?.runtimeVersion ?? '—';
    const channel = Updates.channel ?? '—';
    const updateId = Updates.updateId ?? '—';
    const createdAt = Updates.createdAt
      ? new Date(Updates.createdAt).toLocaleString('es-GT')
      : '—';
    return { runtime, channel, updateId, createdAt };
  }, []);

  if (__DEV__) return null;

  return (
    <View style={[styles.wrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Estado de actualizaciones OTA"
      >
        <Text style={[styles.title, { color: c.foregroundMuted }]}>
          {appLabel} · OTA {open ? '▾' : '▸'}
        </Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.body}>
          <Text style={[styles.line, { color: c.foregroundMuted }]}>Runtime: {String(info.runtime)}</Text>
          <Text style={[styles.line, { color: c.foregroundMuted }]}>Canal: {String(info.channel)}</Text>
          <Text style={[styles.line, { color: c.foregroundMuted }]} numberOfLines={2}>
            Update ID: {String(info.updateId)}
          </Text>
          <Text style={[styles.line, { color: c.foregroundMuted }]}>Publicado: {info.createdAt}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  body: { marginTop: spacing.sm, gap: 4 },
  line: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    lineHeight: 16,
  },
});
