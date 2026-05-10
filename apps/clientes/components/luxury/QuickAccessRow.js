import { useMemo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

export function QuickAccessRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: c.avatarCircleBg,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: c.cardBorder,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        iconBubble: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: c.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        mid: {
          flex: 1,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.foreground,
        },
        sub: {
          marginTop: 3,
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foregroundMuted,
          lineHeight: 18,
        },
      }),
    [c],
  );

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconBubble}>
        {Icon ? <Icon size={20} color={c.foreground} strokeWidth={1.7} /> : null}
      </View>
      <View style={styles.mid}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={20} color={c.foregroundSubtle} strokeWidth={1.7} />
    </TouchableOpacity>
  );
}
