import { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { getModuleById } from '../navigation/salonRoutes';

export function GlobalSearchResults({
  query,
  hits = [],
  loading = false,
  onOpenModule,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  const q = query.trim();
  if (q.length < 2) return null;

  const grouped = useMemo(() => {
    const map = new Map();
    for (const hit of hits) {
      const key = hit.category || 'Otros';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(hit);
    }
    return Array.from(map.entries());
  }, [hits]);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.hint, { color: c.foregroundMuted }]}>Buscando en todo el salón…</Text>
      </View>
    );
  }

  if (!hits.length) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.empty, { color: c.foregroundMuted }]}>
          Sin coincidencias para «{q}». Probá nombre de cliente, teléfono, servicio, agenda, SKU o folio.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: c.foregroundSubtle }]}>
        {hits.length} resultado{hits.length === 1 ? '' : 's'} en el sistema
      </Text>
      {grouped.map(([category, items]) => (
        <View key={category} style={[styles.group, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
          <Text style={[styles.groupLbl, { color: c.primary }]}>{category}</Text>
          {items.map((hit, idx) => {
            const mod = getModuleById(hit.moduleId);
            return (
              <TouchableOpacity
                key={hit.id}
                style={[
                  styles.row,
                  idx < items.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: 1 },
                ]}
                onPress={() =>
                  onOpenModule(
                    hit.moduleId,
                    hit.giftCardCodigo ? { giftCardCodigo: hit.giftCardCodigo } : undefined,
                  )
                }
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${mod?.title || hit.category}: ${hit.title}`}
              >
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                    {hit.title}
                  </Text>
                  {hit.subtitle ? (
                    <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={2}>
                      {hit.subtitle}
                    </Text>
                  ) : null}
                  {mod ? (
                    <Text style={[styles.rowMod, { color: c.foregroundSubtle }]}>
                      Ir a {mod.title}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={18} color={c.foregroundSubtle} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
    },
    hint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    empty: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
    heading: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    group: {
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    groupLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
    rowMod: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      marginTop: 4,
    },
  });
}
