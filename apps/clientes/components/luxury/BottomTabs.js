import { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
export function BottomTabs({ items, activeId, onChange }) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-around',
          paddingTop: 8,
          backgroundColor: c.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: c.tabBarBorder,
        },
        item: {
          flex: 1,
          alignItems: 'center',
          paddingTop: 4,
          gap: 4,
        },
        iconShell: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
        },
        label: {
          fontFamily: typography.fontSans,
          fontSize: 10,
          color: c.foregroundSubtle,
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
      {items.map((item) => {
        const active = item.id === activeId;
        const Icon = item.icon;
        const iconColor = active ? c.primary : c.foregroundSubtle;

        return (
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
            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
