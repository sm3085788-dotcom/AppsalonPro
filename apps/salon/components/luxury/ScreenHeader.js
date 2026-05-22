import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@appsalon/design-tokens';
import { SalonSearchBar } from './SalonSearchBar';

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
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginBottom: spacing.lg,
          paddingHorizontal: 2,
        },
      }),
    [],
  );

  if (!showHomeBar) {
    return null;
  }

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <SalonSearchBar
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={placeholder}
        accessibilityLabel="Buscar en todo el salón"
      />
    </View>
  );
}
