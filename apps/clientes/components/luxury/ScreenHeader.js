import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, ShoppingCart } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '@appsalon/design-tokens';

/**
 * - Inicio: búsqueda + carrito.
 * - Perfil (solo si pasas profileFirstName): «Bienvenida» + primer nombre.
 * - Resto: nada.
 */
export function ScreenHeader({
  searchValue = '',
  onSearchChange,
  placeholder = 'Buscar servicios, tendencias…',
  showHomeBar = false,
  onCartPress,
  /** Solo pestaña Perfil: primer nombre para saludo */
  profileFirstName,
}) {
  if (showHomeBar) {
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.foregroundSubtle} strokeWidth={1.8} />
            <TextInput
              style={styles.searchInput}
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={placeholder}
              placeholderTextColor={colors.foregroundSubtle}
              returnKeyType="search"
              accessibilityLabel="Buscar en la app"
            />
          </View>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={onCartPress ?? (() => {})}
            accessibilityRole="button"
            accessibilityLabel="Carrito"
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <ShoppingCart size={23} color={colors.foreground} strokeWidth={1.85} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (profileFirstName != null && String(profileFirstName).trim() !== '') {
    const name = String(profileFirstName).trim();
    return (
      <View style={styles.wrap}>
        <View style={styles.profileCopy}>
          <Text style={styles.kicker}>Bienvenida</Text>
          <Text style={styles.profileName}>{name}</Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontSans,
    fontSize: 15,
    color: colors.foreground,
    paddingVertical: 0,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    gap: 2,
    marginBottom: 2,
  },
  kicker: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.foregroundSubtle,
  },
  profileName: {
    fontFamily: typography.fontSansMedium,
    fontSize: 24,
    color: colors.foreground,
    letterSpacing: -0.3,
    marginTop: 2,
  },
});
