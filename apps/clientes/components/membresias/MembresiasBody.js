import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Medal, Sparkles } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

const TIERS = [
  {
    id: 'bronce',
    label: 'Bronce',
    subtitle: 'Inicio en Aura · acumulás desde la primera visita',
    accent: '#B87333',
    Icon: Medal,
    benefits: [
      '5% de descuento en servicios seleccionados del menú Aura.',
      'Puntos Aura estándar (x1) en cada visita pagada.',
      'Tips de mantenimiento y recordatorios de retoque en la app.',
    ],
  },
  {
    id: 'plata',
    label: 'Plata',
    subtitle: 'Más valor en cada cita y en tienda',
    accent: '#9CA3AF',
    Icon: Sparkles,
    benefits: [
      '10% de descuento en servicios y 5% en productos de línea profesional.',
      'Puntos Aura acelerados (x1,25) al pagar en salón.',
      'Prioridad ligera en lista de espera de agenda.',
      'Detalle de cumpleaños: mini beneficio o obsequio según campaña.',
    ],
  },
  {
    id: 'vip',
    label: 'VIP',
    subtitle: 'Experiencia prioritaria y máximos beneficios',
    accent: '#C5A368',
    Icon: Crown,
    benefits: [
      'Hasta 20% en servicios premium y 15% en productos (según cartelera).',
      'Puntos Aura x2 en visitas confirmadas con tu código de cliente.',
      'Canal preferente con recepción / WhatsApp del salón para agendar.',
      'Acceso anticipado a promociones, lanzamientos y eventos cerrados.',
      'Un upgrade de servicio al año sujeto a disponibilidad.',
    ],
  },
];

export function MembresiasBody() {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        intro: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foregroundMuted,
          lineHeight: 19,
          marginBottom: spacing.md,
        },
        tierCard: {
          backgroundColor: c.card,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        tierHead: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        },
        tierIconWrap: {
          width: 44,
          height: 44,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tierHeadText: {
          flex: 1,
        },
        tierLabel: {
          fontFamily: typography.fontDisplay,
          fontSize: 20,
          color: c.foreground,
          letterSpacing: -0.3,
        },
        tierSubtitle: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundMuted,
          marginTop: 4,
          lineHeight: 16,
        },
        benefitsBlock: {
          paddingTop: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.cardBorder,
        },
        benefitsKicker: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: c.primary,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: spacing.xs,
        },
        benefitLine: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foreground,
          lineHeight: 20,
          marginBottom: 6,
        },
        foot: {
          fontFamily: typography.fontSans,
          fontSize: 11,
          color: c.foregroundSubtle,
          lineHeight: 15,
          marginTop: spacing.xs,
        },
      }),
    [c],
  );

  return (
    <>
      <Text style={styles.intro}>
        Elegí tu camino de membresía. El salón define en App Salón cómo se sube de nivel y
        vigencia de cada beneficio.
      </Text>

      {TIERS.map((tier) => {
        const Icon = tier.Icon;
        return (
          <View
            key={tier.id}
            style={[styles.tierCard, { borderLeftColor: tier.accent, borderLeftWidth: 4 }]}
          >
            <View style={styles.tierHead}>
              <View style={[styles.tierIconWrap, { backgroundColor: `${tier.accent}18` }]}>
                <Icon size={22} color={tier.accent} strokeWidth={2} />
              </View>
              <View style={styles.tierHeadText}>
                <Text style={styles.tierLabel}>{tier.label}</Text>
                <Text style={styles.tierSubtitle}>{tier.subtitle}</Text>
              </View>
            </View>
            <View style={styles.benefitsBlock}>
              <Text style={styles.benefitsKicker}>Beneficios</Text>
              {tier.benefits.map((line, i) => (
                <Text key={i} style={styles.benefitLine}>
                  · {line}
                </Text>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.foot}>
        Niveles Bronce, Plata y VIP son ilustrativos · condiciones finales y exclusiones las publica
        el salón.
      </Text>
    </>
  );
}
