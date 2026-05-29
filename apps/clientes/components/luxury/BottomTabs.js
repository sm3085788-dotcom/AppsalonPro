import { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  tabBarLayout,
  typography,
} from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * @param {{ id: string, label: string, icon: import('react').ComponentType<{ size?: number, color?: string, strokeWidth?: number }> }[]} items
 * @param {(id: string) => void} onChange
 */
const CHARCOAL = '#1A1510';
const GOLD = '#C5A368';

export function BottomTabs({ items, activeId, onChange, cartCount = 0, onCartPress }) {
  const { colors: c, isDark } = useTheme();
  const inactiveColor = isDark ? c.foregroundSubtle : CHARCOAL;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-around',
          paddingTop: 8,
          // Match root screen background to avoid a visible "band" near system nav area.
          backgroundColor: c.background,
          borderTopWidth: 1,
          borderTopColor: c.tabBarBorder,
        },
        item: {
          flex: 1,
          alignItems: 'center',
          paddingTop: 4,
          gap: 4,
        },
  cartItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
    gap: 3,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 9,
    color: '#FFF',
  },
  iconShell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'relative',
  },
    label: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    letterSpacing: 0.15,
    textAlign: 'center',
    maxWidth: 78,
  },
        labelActive: {
          color: c.primary,
          fontFamily: typography.fontSansMedium,
        },
      }),
    [c],
  );

  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: bottomPad,
          minHeight: tabBarLayout.height + bottomPad,
        },
      ]}
    >
      {/* Tabs principales — carrito se inyecta antes del último (Perfil) */}
      {items.map((item, index) => {
        const active = item.id === activeId;
        const Icon = item.icon;
        const iconColor = active ? GOLD : inactiveColor;
        const isLast = index === items.length - 1;

        return (
          <>
            {/* Carrito justo antes de Perfil (último tab) */}
            {isLast && onCartPress ? (
              <TouchableOpacity
                key="cart"
                style={styles.cartItem}
                onPress={onCartPress}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={cartCount > 0 ? `Carrito, ${cartCount} productos` : 'Carrito'}
              >
                <View style={styles.iconShell}>
                  <ShoppingCart size={22} color={inactiveColor} strokeWidth={1.6} />
                  {cartCount > 0 ? (
                    <View style={[styles.cartBadge, { backgroundColor: c.error }]}>
                      <Text style={styles.cartBadgeTxt}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, { color: inactiveColor }]}>Carrito</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              key={item.id}
              style={styles.item}
              onPress={() => onChange(item.id)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.iconShell}>
                <Icon size={22} color={iconColor} strokeWidth={active ? 2.1 : 1.6} />
              </View>
              <Text style={[styles.label, { color: active ? GOLD : inactiveColor }, active && styles.labelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </>
        );
      })}
    </View>
  );
}
