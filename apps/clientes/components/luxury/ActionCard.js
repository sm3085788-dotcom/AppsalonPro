import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '@appsalon/design-tokens';

export function ActionCard({ icon: Icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={22} color={colors.primary} strokeWidth={1.8} />
        </View>
      ) : null}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    minHeight: 108,
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
  },
  sub: {
    marginTop: 4,
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: colors.foregroundMuted,
    lineHeight: 15,
  },
});
