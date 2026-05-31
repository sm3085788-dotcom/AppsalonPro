import { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { getPremiosCelebrationHint } from '../../utils/premiosPointsAlert';

const GOLD       = '#C9A24D';
const GOLD_LIGHT = '#F5E6A8';
const CONFETTI_COLORS = [
  '#C9A24D', '#F5E6A8', '#FFFFFF', '#E8D4A8',
  '#D4A853', '#FFF8E7', '#B8952E', '#FFE59A',
];

// ─── Pieza de confeti ────────────────────────────────────────────────────────

function ConfettiPiece({ screenW, screenH, delay }) {
  const x         = useRef(Math.random() * screenW).current;
  const size      = useRef(6 + Math.random() * 8).current;
  const color     = useRef(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]).current;
  const isSquare  = useRef(Math.random() > 0.4).current;

  const fall   = useRef(new Animated.Value(-30)).current;
  const spin   = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 2200 + Math.random() * 1800;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(fall, { toValue: screenH + 40, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800 + Math.random() * 600, easing: Easing.linear, useNativeDriver: true })),
        Animated.loop(
          Animated.sequence([
            Animated.timing(wobble, { toValue: 1, duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(wobble, { toValue: -1, duration: 400 + Math.random() * 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      ]),
    ]).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateX = wobble.interpolate({ inputRange: [-1, 1], outputRange: [-12, 12] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: x,
        opacity,
        transform: [{ translateY: fall }, { translateX }, { rotate }],
        width: size,
        height: isSquare ? size : size * 0.5,
        borderRadius: isSquare ? 1 : size,
        backgroundColor: color,
      }}
    />
  );
}

// ─── Globo flotante ──────────────────────────────────────────────────────────

function Balloon({ screenH, x, delay, emoji }) {
  const rise  = useRef(new Animated.Value(screenH + 60)).current;
  const sway  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(rise, { toValue: -80, duration: 3000 + Math.random() * 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sway, { toValue: 1, duration: 700 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(sway, { toValue: -1, duration: 700 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      ]),
    ]).start();
  }, []);

  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-18, 18] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        fontSize: 42,
        transform: [{ translateY: rise }, { translateX }, { scale }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export function PremiosCelebrationModal({ visible, ruleId, onVerPremio, onDismiss }) {
  const { width: W, height: H } = useWindowDimensions();
  const hintText = getPremiosCelebrationHint(ruleId);

  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOp    = useRef(new Animated.Value(0)).current;
  const titlePop  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    cardScale.setValue(0.5);
    cardOp.setValue(0);
    titlePop.setValue(0);
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
        Animated.timing(cardOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.spring(titlePop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const CONFETTI_COUNT = 28;
  const confettiPieces = useMemo(
    () => Array.from({ length: CONFETTI_COUNT }, (_, i) => ({ key: i, delay: i * 60 })),
    [],
  );

  const BALLOONS = useMemo(
    () => [
      { emoji: '🎈', x: W * 0.08,  delay: 200 },
      { emoji: '🎊', x: W * 0.72,  delay: 500 },
      { emoji: '🎈', x: W * 0.42,  delay: 350 },
      { emoji: '🥂', x: W * 0.82,  delay: 700 },
      { emoji: '🎉', x: W * 0.22,  delay: 600 },
    ],
    [W],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={[styles.backdrop, { width: W, height: H }]}>

        {/* Tarjeta central */}
        <Animated.View style={[styles.cardWrap, { opacity: cardOp, transform: [{ scale: cardScale }] }]}>
          <LinearGradient
            colors={['#1a0f00', '#2e1c05', '#4a2e0a', '#2e1c05', '#1a0f00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Borde dorado */}
            <LinearGradient
              colors={['transparent', GOLD, GOLD_LIGHT, GOLD, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topBorder}
              pointerEvents="none"
            />

            {/* Ícono trofeo */}
            <Text style={styles.trophy}>🏆</Text>

            {/* Título animado */}
            <Animated.Text
              style={[
                styles.title,
                {
                  transform: [
                    { scale: titlePop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
                },
              ]}
            >
              ¡Ganaste!
            </Animated.Text>

            {/* Línea dorada */}
            <View style={styles.divider} />

            <Text style={styles.subtitle}>
              Tenés un premio listo para{'\n'}canjear en Salon Andreas.
            </Text>

            <Text style={styles.hint}>{hintText}</Text>

            {/* Botones */}
            <TouchableOpacity style={styles.btnPrimary} onPress={onVerPremio} activeOpacity={0.88}>
              <Text style={styles.btnPrimaryTxt}>Ver mi premio →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={onDismiss} activeOpacity={0.82}>
              <Text style={styles.btnSecondaryTxt}>Cerrar</Text>
            </TouchableOpacity>

            {/* Borde inferior */}
            <LinearGradient
              colors={['transparent', GOLD, GOLD_LIGHT, GOLD, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bottomBorder}
              pointerEvents="none"
            />
          </LinearGradient>
        </Animated.View>

        {/* Confetti — sobre la tarjeta */}
        {visible && confettiPieces.map((p) => (
          <ConfettiPiece key={p.key} screenW={W} screenH={H} delay={p.delay} />
        ))}

        {/* Globos — sobre la tarjeta */}
        {visible && BALLOONS.map((b, i) => (
          <Balloon key={i} screenH={H} x={b.x} delay={b.delay} emoji={b.emoji} />
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(10,7,3,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardWrap: {
    width: '84%',
    maxWidth: 360,
    borderRadius: radii.xl,
    ...Platform.select({
      ios: { shadowColor: GOLD, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 24 },
      android: { elevation: 20 },
    }),
  },
  card: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,162,77,0.35)',
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  trophy: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 38,
    color: GOLD_LIGHT,
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(201,162,77,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: GOLD,
    opacity: 0.7,
    borderRadius: 1,
    marginVertical: spacing.md,
  },
  subtitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: '#F5F0E8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: 'rgba(245,240,232,0.55)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  btnPrimary: {
    backgroundColor: GOLD,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnPrimaryTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: '#1a0f00',
    letterSpacing: 0.3,
  },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
  },
  btnSecondaryTxt: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: 'rgba(245,240,232,0.45)',
    letterSpacing: 0.3,
  },
});
