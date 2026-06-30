import { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { CLIENT_ALERT_BELL_RED } from '../../constants/clientAlertColors';
import { useClientLocale } from '../../hooks/useClientLocale';

const CHARCOAL = '#1A1510';
const GOLD = '#C5A368';
/** paddingTop + ítem (icono + etiqueta); debe coincidir con tabBarOverlayHeight en App.js */
const TAB_BAR_CORE_HEIGHT = 8 + 4 + 40 + 4 + 14;

/** @param {{ id: string, label: string, icon: import('react').ComponentType, alert?: boolean, badgeCount?: number }[]} items */
export function BottomTabs({ items, activeId, onChange, cartCount = 0, onCartPress }) {
  const { t } = useClientLocale();
  const { colors: c, isDark } = useTheme();
  const inactiveLabelColor = isDark ? c.foreground : CHARCOAL;
  const inactiveIconColor = isDark ? c.foregroundMuted : CHARCOAL;
  const menuDivider = isDark ? 'rgba(197,163,104,0.30)' : '#F0EAE0';
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
          borderTopColor: menuDivider,
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
  alertDot: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CLIENT_ALERT_BELL_RED,
    borderWidth: 1.5,
    borderColor: c.background,
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
          fontFamily: typography.fontDisplay,
          fontSize: 11,
          letterSpacing: 0.1,
          textAlign: 'center',
          maxWidth: 78,
        },
        labelActive: {
          color: GOLD,
        },
      }),
    [c, menuDivider],
  );

  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: bottomPad,
          minHeight: TAB_BAR_CORE_HEIGHT + bottomPad,
        },
      ]}
    >
      {/* Tabs principales — carrito se inyecta antes del último (Perfil) */}
      {items.map((item, index) => {
        const active = item.id === activeId;
        const Icon = item.icon;
        const iconColor = active ? GOLD : inactiveIconColor;
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
                accessibilityLabel={
                  cartCount > 0 ? t('inicio.cartA11yCount', { count: cartCount }) : t('inicio.cartA11y')
                }
              >
                <View style={styles.iconShell}>
                  <ShoppingBag size={22} color={inactiveIconColor} strokeWidth={1.6} />
                  {cartCount > 0 ? (
                    <View style={[styles.cartBadge, { backgroundColor: CLIENT_ALERT_BELL_RED }]}>
                      <Text style={styles.cartBadgeTxt}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, { color: inactiveLabelColor }]}>{t('tabs.tienda')}</Text>
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
                {item.badgeCount > 0 ? (
                  <View style={[styles.cartBadge, { backgroundColor: CLIENT_ALERT_BELL_RED }]}>
                    <Text style={styles.cartBadgeTxt}>
                      {item.badgeCount > 99 ? '99+' : String(item.badgeCount)}
                    </Text>
                  </View>
                ) : item.alert ? (
                  <View style={styles.alertDot} />
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: active ? GOLD : inactiveLabelColor },
                  active && styles.labelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          </>
        );
      })}
    </View>
  );
}
