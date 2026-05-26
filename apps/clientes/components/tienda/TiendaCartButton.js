import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { typography } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useTiendaCart } from '../../context/TiendaCartContext';

function formatBadgeCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  return x > 99 ? '99+' : String(x);
}

/** Carrito flotante / barra superior de la pantalla Tienda. */
export function TiendaCartButton({ onPress }) {
  const { colors: c } = useTheme();
  const { cartCount } = useTiendaCart();
  const badgeLabel = formatBadgeCount(cartCount);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
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
        badge: {
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
          backgroundColor: c.error,
        },
        badgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 10,
          color: '#FFFFFF',
        },
      }),
    [c],
  );

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badgeLabel ? `Carrito, ${badgeLabel} productos` : 'Carrito'}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.88}
    >
      <ShoppingCart size={22} color={c.foreground} strokeWidth={1.85} />
      {badgeLabel ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{badgeLabel}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
