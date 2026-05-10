import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  Award,
  Crown,
  Gift,
  Share2,
  Copy,
  Users,
  Wallet,
  TrendingUp,
  Sparkles,
  Percent,
} from 'lucide-react-native';
import { SalonButton } from '../luxury/SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

const MOCK = {
  nivel: 'Aura Gold',
  nivelSiguiente: 'Platinum',
  puntos: 2450,
  puntosParaSiguiente: 3000,
  saldoQuetzales: 45,
  descuentoAcumuladoPct: 12,
  codigoReferido: 'AURA-SM308-482',
  invitadosActivos: 3,
  puntosPorReferidos: 900,
  /** Demo: metas de referido */
  metaInvitados: 5,
  /** Paquete que se activa en la cuenta del nuevo cliente al ingresar el código (demo). */
  bienvenidaCitasPrivilegio: 5,
  bienvenidaDescuentoPct: 20,
  /** Premio para quien recomienda, al confirmarse la primera visita del referido (demo). */
  premioReferidorVisitas: 1,
  premioReferidorDescuentoPct: 60,
};

const CANJES_DEMO = [
  {
    id: 'c1',
    titulo: 'Q25 en tienda',
    detalle: 'Válido en productos seleccionados',
    costoPuntos: 500,
  },
  {
    id: 'c2',
    titulo: '10% tu próxima visita',
    detalle: 'Servicio o tratamiento completo',
    costoPuntos: 1200,
  },
  {
    id: 'c3',
    titulo: 'Upgrade de técnica',
    detalle: 'Balayage o color premium',
    costoPuntos: 2400,
  },
];

export function PremiosDashboard({ onClose }) {
  const [canjeTap, setCanjeTap] = useState(null);
  const { colors: tc } = useTheme();
  const styles = useMemo(() => createPremiosStyles(tc), [tc]);

  const progress = Math.min(
    1,
    MOCK.puntosParaSiguiente > 0 ? MOCK.puntos / MOCK.puntosParaSiguiente : 1,
  );
  const invProgress = Math.min(1, MOCK.invitadosActivos / MOCK.metaInvitados);

  const shareReferral = async () => {
    const msg =
      `¡Te invito a Aura Salón! Descargá App Clientes y, al crear tu cuenta, ingresá mi código ${MOCK.codigoReferido}. ` +
      `Se carga solo en tu perfil el premio «Cita privilegiada de bienvenida»: ${MOCK.bienvenidaCitasPrivilegio} citas con ${MOCK.bienvenidaDescuentoPct}% de descuento sobre todo lo que gastes en el salón (servicios y productos). ` +
      `Y cuando completes tu primera visita, a mí se me activa automáticamente el premio por recomendación: ${MOCK.premioReferidorVisitas} visita de consumo + ${MOCK.premioReferidorDescuentoPct}% de descuento en el siguiente producto o servicio. ` +
      `Te esperamos.`;
    try {
      await Share.share({
        message: msg,
        title: 'Invitación Aura Salón',
      });
    } catch {
      /* cancelado */
    }
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(MOCK.codigoReferido);
      Alert.alert('Listo', 'Código copiado al portapapeles.');
    } catch {
      Alert.alert('Demo', MOCK.codigoReferido);
    }
  };

  const onCanjeDemo = (id) => {
    setCanjeTap(id);
    Alert.alert(
      'Canje · demo',
      'Cuando conectemos el programa real, aquí confirmaremos el canje y descontaremos tus puntos.',
      [{ text: 'OK', onPress: () => setCanjeTap(null) }],
    );
  };

  return (
    <>
      <LinearGradient
        colors={['#3A3532', '#2D2926', '#4A3F2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Crown size={14} color={tc.primary} strokeWidth={2.2} />
            <Text style={styles.heroBadgeTxt}>{MOCK.nivel}</Text>
          </View>
          <Sparkles size={20} color="rgba(255,255,255,0.35)" strokeWidth={2} />
        </View>
        <Text style={styles.heroPoints}>{MOCK.puntos.toLocaleString('es-GT')}</Text>
        <Text style={styles.heroPointsLabel}>puntos Aura disponibles</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.heroMeta}>
          {MOCK.puntosParaSiguiente - MOCK.puntos > 0
            ? `Te faltan ${(MOCK.puntosParaSiguiente - MOCK.puntos).toLocaleString('es-GT')} pts para ${MOCK.nivelSiguiente}`
            : `¡Listo para subir a ${MOCK.nivelSiguiente}!`}
        </Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Wallet size={18} color={tc.primary} strokeWidth={2} />
          <Text style={styles.statValue}>Q{MOCK.saldoQuetzales}</Text>
          <Text style={styles.statLabel}>saldo canjeable</Text>
        </View>
        <View style={styles.statCard}>
          <Percent size={18} color={tc.primary} strokeWidth={2} />
          <Text style={styles.statValue}>{MOCK.descuentoAcumuladoPct}%</Text>
          <Text style={styles.statLabel}>dto. acumulado</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={18} color={tc.primary} strokeWidth={2} />
          <Text style={styles.statValue}>+{MOCK.puntosPorReferidos}</Text>
          <Text style={styles.statLabel}>pts referidos</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recomienda clientes nuevos</Text>
        <Text style={styles.cardLead}>
          Compartí tu código por WhatsApp, redes o en persona. La persona nueva{' '}
          <Text style={styles.leadStrong}>descarga App Clientes</Text>, se registra y{' '}
          <Text style={styles.leadStrong}>ingresa tu código de referido</Text>: el sistema lo valida y{' '}
          <Text style={styles.leadStrong}>automáticamente</Text> le activa el premio de bienvenida en su cuenta (sin
          trámites en recepción).
        </Text>

        <View style={styles.welcomeCallout}>
          <Text style={styles.welcomeCalloutKicker}>Lo que recibe quien usa tu código</Text>
          <Text style={styles.welcomeCalloutTitle}>Cita privilegiada de bienvenida</Text>
          <Text style={styles.welcomeCalloutBody}>
            Paquete de bienvenida con{' '}
            <Text style={styles.welcomeStrong}>
              {MOCK.bienvenidaCitasPrivilegio} citas con {MOCK.bienvenidaDescuentoPct}% de descuento
            </Text>{' '}
            sobre todo lo que invierta en el salón (servicios y productos) durante ese período promocional. Se aplica al
            cargar el código al registrarse; vos seguís sumando puntos Aura cuando esa persona completa su primera visita.
          </Text>
        </View>
        <View style={styles.welcomeCallout}>
          <Text style={styles.welcomeCalloutKicker}>Lo que ganás vos por recomendar</Text>
          <Text style={styles.welcomeCalloutTitle}>Premio por recomendación confirmada</Text>
          <Text style={styles.welcomeCalloutBody}>
            Cuando la persona referida completa su primera visita al salón, se habilita automáticamente en tu cuenta:{' '}
            <Text style={styles.welcomeStrong}>
              {MOCK.premioReferidorVisitas} visita de consumo + {MOCK.premioReferidorDescuentoPct}% de descuento
            </Text>{' '}
            en el siguiente producto o servicio que elijas.
          </Text>
        </View>

        <TouchableOpacity style={styles.codeBox} onPress={copyCode} activeOpacity={0.85}>
          <Text style={styles.codeText}>{MOCK.codigoReferido}</Text>
          <Copy size={20} color={tc.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.codeHint}>Toca el código para copiarlo</Text>
        <View style={styles.refActions}>
          <TouchableOpacity style={styles.refShareBtn} onPress={shareReferral} activeOpacity={0.9}>
            <Share2 size={18} color={tc.heroCtaText} strokeWidth={2.2} />
            <Text style={styles.refShareTxt}>Compartir invitación</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.refMeter}>
          <View style={styles.refMeterHead}>
            <Users size={16} color={tc.foreground} strokeWidth={2} />
            <Text style={styles.refMeterTitle}>Meta de bienvenidas este mes</Text>
          </View>
          <View style={styles.progressTrackMuted}>
            <View style={[styles.progressFillGold, { width: `${invProgress * 100}%` }]} />
          </View>
          <Text style={styles.refMeterSub}>
            {MOCK.invitadosActivos} de {MOCK.metaInvitados} personas ya usaron tu código y visitaron el salón · cuando
            se confirma esa primera visita, se activa tu premio de recomendación y además sumás{' '}
            <Text style={styles.refMeterBold}>puntos Aura</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeadRow}>
          <Gift size={20} color={tc.primary} strokeWidth={2} />
          <Text style={styles.cardTitleFlush}>Canjes con puntos</Text>
        </View>
        <Text style={styles.cardLead}>
          Canjeá puntos por dinero en tienda, porcentajes en servicios o upgrades exclusivos (demo).
        </Text>
        {CANJES_DEMO.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.canjeRow, canjeTap === c.id && styles.canjeRowActive]}
            onPress={() => onCanjeDemo(c.id)}
            activeOpacity={0.88}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.canjeTitulo}>{c.titulo}</Text>
              <Text style={styles.canjeDetalle}>{c.detalle}</Text>
            </View>
            <View style={styles.canjeCost}>
              <Award size={14} color={tc.primary} strokeWidth={2} />
              <Text style={styles.canjeCostTxt}>{c.costoPuntos} pts</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      <Text style={styles.footNote}>
        Beneficios del referido (nuevo cliente) y del referidor (quien comparte el código) son ilustrativos · vigencia,
        exclusiones y reglas finales las configura el salón en App Salón.
      </Text>
    </>
  );
}

function createPremiosStyles(c) {
  return StyleSheet.create({
  hero: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  heroBadgeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 0.4,
  },
  heroPoints: {
    fontFamily: typography.fontDisplay,
    fontSize: 36,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroPointsLabel: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: c.primary,
  },
  heroMeta: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: c.foreground,
  },
  statLabel: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: c.foregroundMuted ?? '#6B6B6B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: c.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: c.foreground,
    marginBottom: spacing.xs,
  },
  cardTitleFlush: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: c.foreground,
  },
  cardLead: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted ?? '#6B6B6B',
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  leadStrong: {
    fontFamily: typography.fontSansMedium,
    color: c.foreground,
  },
  welcomeCallout: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 163, 104, 0.45)',
    backgroundColor: 'rgba(197, 163, 104, 0.09)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  welcomeCalloutKicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: c.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  welcomeCalloutTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: c.foreground,
    marginBottom: spacing.xs,
  },
  welcomeCalloutBody: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted ?? '#6B6B6B',
    lineHeight: 20,
  },
  welcomeStrong: {
    fontFamily: typography.fontSansMedium,
    color: c.foreground,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceMuted ?? '#F5F3EF',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  codeText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 17,
    letterSpacing: 1,
    color: c.foreground,
  },
  codeHint: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: c.foregroundSubtle ?? '#888',
    marginBottom: spacing.sm,
  },
  refActions: {
    marginBottom: spacing.md,
  },
  refShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.primary,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  refShareTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: c.heroCtaText,
  },
  refMeter: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.cardBorder,
  },
  refMeterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  refMeterTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: c.foreground,
  },
  progressTrackMuted: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.iconCircleBg ?? '#F3F3F3',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFillGold: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: c.primary,
  },
  refMeterSub: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundMuted ?? '#6B6B6B',
    lineHeight: 17,
  },
  refMeterBold: {
    fontFamily: typography.fontSansMedium,
    color: c.foreground,
  },
  canjeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
    marginBottom: spacing.sm,
    backgroundColor: c.background,
  },
  canjeRowActive: {
    borderColor: c.primary,
    backgroundColor: 'rgba(197, 163, 104, 0.08)',
  },
  canjeTitulo: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: c.foreground,
  },
  canjeDetalle: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundMuted ?? '#6B6B6B',
    marginTop: 2,
  },
  canjeCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
  },
  canjeCostTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: c.primary,
  },
  footNote: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: c.foregroundSubtle ?? '#888',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    lineHeight: 15,
  },
});
}

