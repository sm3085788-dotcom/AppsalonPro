import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Medal, Sparkles } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { MEMBRESIA_TIERS, getMembresiaTier } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { ActivarMembresiaCard } from './ActivarMembresiaCard';

const TIER_ICONS = {
  bronce: Medal,
  plata: Sparkles,
  vip: Crown,
};

const TIER_BENEFITS = {
  bronce: [
    '5% de descuento en servicios seleccionados del menú Aura.',
    'Puntos Aura estándar (x1) en cada visita pagada.',
    'Tips de mantenimiento y recordatorios de retoque en la app.',
  ],
  plata: [
    '10% de descuento en servicios y 5% en productos de línea profesional.',
    'Puntos Aura acelerados (x1,25) al pagar en salón.',
    'Prioridad ligera en lista de espera de agenda.',
    'Detalle de cumpleaños: mini beneficio u obsequio según campaña.',
  ],
  vip: [
    'Hasta 20% en servicios premium y 15% en productos (según cartelera).',
    'Puntos Aura x2 en visitas confirmadas con tu código de cliente.',
    'Canal preferente con recepción / WhatsApp del salón para agendar.',
    'Acceso anticipado a promociones, lanzamientos y eventos cerrados.',
    'Un upgrade de servicio al año sujeto a disponibilidad.',
  ],
};

export function MembresiasBody({ clienteRow, onMembershipChanged, onClose }) {
  const { colors: c } = useTheme();
  const activeTier = getMembresiaTier(clienteRow?.membresia_nivel);

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
        tierCardActive: {
          borderWidth: 2,
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
        activeTag: {
          alignSelf: 'flex-start',
          marginTop: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radii.pill,
        },
        activeTagTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 10,
          letterSpacing: 0.5,
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
      <ActivarMembresiaCard
        clienteRow={clienteRow}
        onActivated={onMembershipChanged}
        onDone={onClose}
      />

      <Text style={styles.intro}>
        {activeTier
          ? `Tenés membresía ${activeTier.label}. Los beneficios dependen del nivel activo en tu perfil.`
          : 'Niveles definidos por el salón. Tu asesor te propone un plan y te entrega un código para activarlo arriba.'}
      </Text>

      {MEMBRESIA_TIERS.map((tier) => {
        const Icon = TIER_ICONS[tier.id] || Medal;
        const isActive = activeTier?.id === tier.id;
        const benefits = TIER_BENEFITS[tier.id] || [];
        return (
          <View
            key={tier.id}
            style={[
              styles.tierCard,
              { borderLeftColor: tier.accent, borderLeftWidth: 4 },
              isActive && styles.tierCardActive,
              isActive && { borderColor: tier.accent },
            ]}
          >
            <View style={styles.tierHead}>
              <View style={[styles.tierIconWrap, { backgroundColor: `${tier.accent}18` }]}>
                <Icon size={22} color={tier.accent} strokeWidth={2} />
              </View>
              <View style={styles.tierHeadText}>
                <Text style={styles.tierLabel}>{tier.label}</Text>
                <Text style={styles.tierSubtitle}>{tier.subtitle}</Text>
                {isActive ? (
                  <View style={[styles.activeTag, { backgroundColor: `${tier.accent}22` }]}>
                    <Text style={[styles.activeTagTxt, { color: tier.accent }]}>TU NIVEL ACTIVO</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.benefitsBlock}>
              <Text style={styles.benefitsKicker}>Beneficios</Text>
              {benefits.map((line, i) => (
                <Text key={i} style={styles.benefitLine}>
                  · {line}
                </Text>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.foot}>
        Bronce, Plata y VIP se activan solo con el código que genera tu asesor en App Salón · condiciones finales las
        publica el salón.
      </Text>
    </>
  );
}
