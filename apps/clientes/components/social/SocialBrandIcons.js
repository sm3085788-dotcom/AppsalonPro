import { View, StyleSheet } from 'react-native';

/** Instagram glyph — brand gradient approximation (Meta brand guidelines). */
export function InstagramBrandIcon({ size = 24 }) {
  const r = size / 2;
  return (
    <View
      style={[
        styles.instagramOuter,
        {
          width: size,
          height: size,
          borderRadius: r * 0.28,
        },
      ]}
    >
      <View
        style={[
          styles.instagramRing,
          {
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.16,
            borderWidth: Math.max(1.5, size * 0.07),
          },
        ]}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          right: size * 0.18,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: '#FFF',
        }}
      />
    </View>
  );
}

/** Facebook «f» — Meta brand blue #1877F2. */
export function FacebookBrandIcon({ size = 24 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: '#1877F2',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.28,
          height: size * 0.52,
          backgroundColor: '#FFF',
          borderTopLeftRadius: size * 0.06,
          borderBottomLeftRadius: size * 0.04,
          marginLeft: size * 0.08,
        }}
      />
    </View>
  );
}

/** WhatsApp — verde marca #25D366. */
export function WhatsAppBrandIcon({ size = 24 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: '#25D366',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: size * 0.23,
          borderWidth: Math.max(1.5, size * 0.06),
          borderColor: '#FFF',
          transform: [{ rotate: '-12deg' }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  instagramOuter: {
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  instagramRing: {
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
});
