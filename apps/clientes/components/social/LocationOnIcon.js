import { View, StyleSheet } from 'react-native';

/** Material-style location_on pin (24dp baseline). */
export function LocationOnIcon({ size = 24, color = '#E53935' }) {
  const pinW = size * 0.46;
  const pinH = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: pinW,
          height: pinH,
          borderTopLeftRadius: pinW,
          borderTopRightRadius: pinW,
          borderBottomLeftRadius: pinW * 0.15,
          borderBottomRightRadius: pinW * 0.15,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          marginTop: -size * 0.08,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: pinW * 0.42,
          height: pinW * 0.42,
          borderRadius: pinW * 0.21,
          backgroundColor: '#FFF',
          marginTop: -size * 0.06,
        }}
      />
    </View>
  );
}
