import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { radii, typography } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * @param {'heroGold'|'solidGold'|'outlineGray'|'outlineGold'|'mutedFill'} variant
 * @param {boolean} [fullWidth]
 */
export function SalonButton({
  title,
  onPress,
  variant = 'outlineGray',
  disabled,
  loading,
  style,
  textStyle,
  fullWidth,
}) {
  const { colors } = useTheme();
  const base = {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: disabled ? 0.55 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  let buttonStyle = [base];
  let labelColor = colors.foreground;
  let borderW = 0;
  let borderC = 'transparent';
  let bg = 'transparent';

  switch (variant) {
    case 'heroGold':
      bg = colors.primary;
      labelColor = colors.heroCtaText;
      borderW = 0;
      break;
    case 'solidGold':
      bg = colors.primary;
      labelColor = colors.primaryForegroundOnGold;
      borderW = 0;
      break;
    case 'outlineGray':
      bg = colors.card;
      borderW = 1;
      borderC = colors.cardBorder;
      labelColor = colors.foreground;
      break;
    case 'outlineGold':
      bg = colors.card;
      borderW = 1;
      borderC = colors.primary;
      labelColor = colors.heroCtaText;
      break;
    case 'mutedFill':
      bg = colors.surfaceMuted;
      borderW = 0;
      labelColor = colors.foreground;
      break;
    default:
      break;
  }

  buttonStyle.push({
    backgroundColor: bg,
    borderWidth: borderW,
    borderColor: borderC,
  });
  buttonStyle.push(style);

  const labelStyle = [
    styles.label,
    { color: labelColor },
    textStyle,
  ];

  const spinColor =
    variant === 'outlineGray' || variant === 'mutedFill'
      ? colors.foregroundMuted
      : variant === 'heroGold'
        ? colors.heroCtaText
        : variant === 'solidGold'
          ? colors.primaryForegroundOnGold
          : colors.primary;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={spinColor} />
      ) : (
        <Text style={labelStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
