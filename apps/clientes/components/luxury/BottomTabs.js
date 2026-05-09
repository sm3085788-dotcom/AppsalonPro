import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  tabBarLayout,
  typography,
} from '@appsalon/design-tokens';

/**
 * @param {{ id: string, label: string, icon: import('react').ComponentType<{ size?: number, color?: string, strokeWidth?: number }> }[]} items
 * @param {(id: string) => void} onChange
 */
export function BottomTabs({ items, activeId, onChange }) {
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
        const color = active ? colors.primary : colors.foregroundSubtle;

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
              <Icon size={22} color={color} strokeWidth={active ? 2.1 : 1.6} />
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 8,
    backgroundColor: colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
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
    color: colors.foregroundSubtle,
    letterSpacing: 0.15,
    textAlign: 'center',
    maxWidth: 78,
  },
  labelActive: {
    color: colors.primary,
    fontFamily: typography.fontSansMedium,
  },
});
