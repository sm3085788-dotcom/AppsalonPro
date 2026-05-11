import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Cabecera tipo clientes: barra de búsqueda opcional para el panel staff.
 */
export function ScreenHeader({
  searchValue = '',
  onSearchChange,
  placeholder = 'Buscar en el panel…',
  showHomeBar = false,
  wrapStyle,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: spacing.lg,
          paddingHorizontal: 2,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        searchBar: {
          flex: 1,
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
        searchInput: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
          paddingVertical: 0,
        },
      }),
    [c],
  );

  if (!showHomeBar) {
    return null;
  }

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <View style={styles.row}>
        <View style={styles.searchBar}>
          <Search size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={placeholder}
            placeholderTextColor={c.foregroundSubtle}
            returnKeyType="search"
            accessibilityLabel="Buscar en el panel"
          />
        </View>
      </View>
    </View>
  );
}
