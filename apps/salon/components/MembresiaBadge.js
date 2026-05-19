import { View, Text, StyleSheet } from 'react-native';
import { typography, radii } from '@appsalon/design-tokens';
import { getMembresiaTier } from '@appsalon/shared-config';

export function MembresiaBadge({ nivel, compact = false }) {
  const tier = getMembresiaTier(nivel);
  if (!tier) return null;

  return (
    <View style={[styles.chip, compact && styles.chipCompact, { backgroundColor: `${tier.accent}24` }]}>
      <Text style={[styles.txt, compact && styles.txtCompact, { color: tier.accent }]}>{tier.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  txt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 0.35,
  },
  txtCompact: {
    fontSize: 9,
  },
});
