import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '@appsalon/design-tokens';
import { SHOPPING_WATERMARK_URI } from '../../data/remoteHeroImages';

export function QuickAccessRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  /** Solo para «Tienda» en Inicio: fondo con foto de compras en marca de agua */
  shoppingWatermark,
}) {
  const rowBody = (
    <>
      <View style={[styles.iconBubble, shoppingWatermark && styles.iconBubbleWm]}>
        {Icon ? <Icon size={20} color={colors.foreground} strokeWidth={1.7} /> : null}
      </View>
      <View style={styles.mid}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={20} color={colors.foregroundSubtle} strokeWidth={1.7} />
    </>
  );

  if (shoppingWatermark) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.wrapWm}
      >
        <ImageBackground
          source={{ uri: SHOPPING_WATERMARK_URI }}
          style={styles.rowWm}
          imageStyle={styles.wmImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.88)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.rowInner}>{rowBody}</View>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {rowBody}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapWm: {
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowWm: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  wmImage: {
    opacity: 0.38,
    borderRadius: radii.md,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.iconCircleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleWm: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mid: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  sub: {
    marginTop: 3,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 18,
  },
});
