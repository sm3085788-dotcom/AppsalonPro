import { useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Barra de búsqueda unificada App Salón (pill, icono, limpiar).
 */
export function SalonSearchBar({
  value = '',
  onChangeText,
  placeholder = 'Buscar…',
  accessibilityLabel = 'Buscar',
  style,
  inputStyle,
  showClear = true,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: c.card,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: c.cardBorder,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          minHeight: 44,
        },
        input: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
          paddingVertical: 0,
        },
        clearBtn: {
          padding: 4,
        },
      }),
    [c],
  );

  const hasText = String(value || '').length > 0;

  return (
    <View style={[styles.bar, style]}>
      <Search size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.foregroundSubtle}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {showClear && hasText ? (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
        >
          <X size={18} color={c.foregroundMuted} strokeWidth={2} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
