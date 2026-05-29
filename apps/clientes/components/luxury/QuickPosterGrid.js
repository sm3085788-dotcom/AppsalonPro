import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';

/**
 * Grid de acceso rápido en estilo "poster" para la pantalla Inicio.
 * columns=1 → lista vertical full-width  (por defecto)
 * columns=2 → grid 2 columnas
 */
export function QuickPosterGrid({ items, columns = 1 }) {
  if (columns === 1) {
    return (
      <View style={styles.list}>
        {items.map((item, index) => (
          <PosterTile
            key={item.id}
            item={item}
            fullWidth
            isFirst={index === 0}
            isLast={index === items.length - 1}
          />
        ))}
      </View>
    );
  }

  // 2 columnas
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return (
    <View style={styles.grid}>
      {rows.map((pair, ri) => (
        <View key={ri} style={styles.row}>
          {pair.map((item) => (
            <PosterTile key={item.id} item={item} />
          ))}
          {pair.length === 1 ? <View style={styles.tileFlex} /> : null}
        </View>
      ))}
    </View>
  );
}

function PosterTile({ item, fullWidth = false, isFirst = false, isLast = false }) {
  const hasBadge = item.badge && item.badgeCount > 0;

  return (
    <TouchableOpacity
      style={fullWidth ? styles.tileFullWidth : styles.tileFlex}
      onPress={item.onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.tile,
          fullWidth ? styles.tileH : styles.tileHGrid,
          fullWidth && styles.tileFlat,
          !fullWidth && { borderColor: item.accent + '55' },
        ]}
      >
        {/* Emoji + badges */}
        <View style={styles.emojiCol}>
          <Text style={styles.emoji}>{item.emoji}</Text>
        </View>

        {/* Texto */}
        <View style={styles.textCol}>
          <Text style={styles.label}>{item.label}</Text>
          {item.sub ? (
            <Text style={styles.sub} numberOfLines={1}>{item.sub}</Text>
          ) : null}
        </View>

        {/* Badges al lado derecho */}
        <View style={styles.rightCol}>
          {hasBadge ? (
            <View style={styles.countBadge}>
              <Text style={styles.countTxt}>
                {item.badgeCount > 99 ? '99+' : String(item.badgeCount)}
              </Text>
            </View>
          ) : null}
          {item.bellBadge ? (
            <View style={styles.bellBadge}>
              <Bell size={10} color="#FFF" strokeWidth={2.5} />
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 1-columna (sin gaps, pegados)
  list: {},
  tileFullWidth: {
    width: '100%',
  },
  tileH: {
    height: 72,
  },
  tileFlat: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  // 2-columnas
  grid: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tileFlex: {
    flex: 1,
  },
  tileHGrid: {
    minHeight: 148,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingTop: spacing.lg,
  },
  // tile base (el borderRadius se sobreescribe por isFirst/isLast en 1-col)
  tile: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emojiCol: {
    width: 44,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    backgroundColor: '#16A34A',
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  countTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: '#FFF',
  },
  bellBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
