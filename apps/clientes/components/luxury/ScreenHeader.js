import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, ShoppingCart } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * - Inicio: búsqueda + carrito.
 * - Perfil (solo si pasas profileFirstName): «Bienvenida» + primer nombre.
 * - Resto: nada.
 */
function formatBadgeCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  return x > 99 ? '99+' : String(x);
}

export function ScreenHeader({
  searchValue = '',
  onSearchChange,
  placeholder = 'Buscar servicios, tendencias…',
  showHomeBar = false,
  onCartPress,
  /** Total de unidades en el carrito de tienda. */
  cartBadgeCount = 0,
  /** En Mis citas se usa el carrito de servicios (icono aparte). */
  showCartButton = true,
  /** Solo pestaña Perfil: primer nombre para saludo */
  profileFirstName,
  /** Estilo extra del contenedor (p. ej. menos margen cuando va fijo arriba). */
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
        cartBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        cartBadge: {
          position: 'absolute',
          top: -3,
          right: -3,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
          borderWidth: 2,
          borderColor: c.background,
        },
        cartBadgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 10,
          color: '#FFFFFF',
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
          color: c.foregroundSubtle,
        },
        profileName: {
          fontFamily: typography.fontSansMedium,
          fontSize: 24,
          color: c.foreground,
          letterSpacing: -0.3,
          marginTop: 2,
        },
      }),
    [c],
  );

  if (showHomeBar) {
    const cartLabel = formatBadgeCount(cartBadgeCount);
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
              accessibilityLabel="Buscar en la app"
            />
          </View>
          {showCartButton ? (
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={onCartPress ?? (() => {})}
              accessibilityRole="button"
              accessibilityLabel={
                cartLabel ? `Carrito, ${cartLabel} productos` : 'Carrito'
              }
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <ShoppingCart size={23} color={c.foreground} strokeWidth={1.85} />
              {cartLabel ? (
                <View style={[styles.cartBadge, { backgroundColor: c.error }]}>
                  <Text style={styles.cartBadgeTxt}>{cartLabel}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  if (profileFirstName != null && String(profileFirstName).trim() !== '') {
    const name = String(profileFirstName).trim();
    return (
      <View style={[styles.wrap, wrapStyle]}>
        <View style={styles.profileCopy}>
          <Text style={styles.kicker}>Bienvenida</Text>
          <Text style={styles.profileName}>{name}</Text>
        </View>
      </View>
    );
  }

  return null;
}
