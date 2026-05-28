import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  Award,
  Crown,
  Sparkles,
  Gift,
  Share2,
  Copy,
  Users,
  Percent,
  Calendar,
  Store,
  RefreshCw,
  X,
  Wallet,
  Truck,
} from 'lucide-react-native';
import { SalonButton } from '../luxury/SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { db, ANDREAS_META } from '@appsalon/shared-config';

const META_APP_EFECTIVO_RETIRO = ANDREAS_META.appEfectivoRetiro;
const META_APP_TARJETA_DELIVERY = ANDREAS_META.appTarjetaDelivery;
const META_CITAS = ANDREAS_META.citas;
const META_SALON = ANDREAS_META.salon;
const META_REFERIDOS = ANDREAS_META.referidos;

function RuleProgress({ icon: Icon, title, body, current, meta, tc }) {
  const p = Math.min(1, meta > 0 ? current / meta : 0);
  return (
    <View style={[localStyles.ruleCard, { borderColor: tc.cardBorder }]}>
      <View style={localStyles.ruleHead}>
        <Icon size={18} color={tc.primary} strokeWidth={2} />
        <Text style={[localStyles.ruleTitle, { color: tc.foreground }]}>{title}</Text>
      </View>
      <Text style={[localStyles.ruleBody, { color: tc.foregroundMuted ?? '#6B6B6B' }]}>{body}</Text>
      <View style={[localStyles.track, { backgroundColor: tc.iconCircleBg ?? '#F3F3F3' }]}>
        <View style={[localStyles.fill, { width: `${p * 100}%`, backgroundColor: tc.primary }]} />
      </View>
      <Text style={[localStyles.ruleMeta, { color: tc.foregroundSubtle ?? '#888' }]}>
        {current} de {meta} · datos verificados
      </Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  ruleCard: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ruleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  ruleTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    flex: 1,
  },
  ruleBody: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  ruleMeta: {
    fontFamily: typography.fontSans,
    fontSize: 11,
  },
});

export function PremiosDashboard({ onClose, clientUserId, clienteRow }) {
  const [canjeTap, setCanjeTap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [modalSalonFisico, setModalSalonFisico] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors: tc } = useTheme();
  const styles = useMemo(() => createPremiosStyles(tc), [tc]);

  const load = useCallback(async () => {
    if (!clientUserId || !clienteRow?.id) {
      setResumen(null);
      setLoadErr(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    const r = await db.premiosAndreas.getResumen({ clientUserId, clienteRow });
    setLoading(false);
    if (r.error) {
      setLoadErr(String(r.error.message || 'No se pudo cargar'));
      setResumen(null);
      return;
    }
    setResumen(r);
  }, [clientUserId, clienteRow]);

  useEffect(() => {
    void load();
  }, [load]);

  const codigo = resumen?.codigoReferido?.trim() || '—';
  const productosAppEfectivoRetiro = resumen?.productosAppEfectivoRetiro ?? 0;
  const productosAppTarjetaDelivery = resumen?.productosAppTarjetaDelivery ?? 0;
  const citasOk = resumen?.citasVerificadas ?? 0;
  const salonFisico = resumen?.productosSalonFisico ?? 0;
  const referidosOk = resumen?.referidosPrimeraCompra ?? 0;

  const shareReferral = async () => {
    if (!codigo || codigo === '—') {
      Alert.alert('Premios', 'Iniciá sesión y enlazá tu ficha para obtener tu código de invitación.');
      return;
    }
    const msg =
      `¡Te invito a Salon Andreas! Descargá la app de clientes, creá tu cuenta verificada y usá mi código ${codigo}. ` +
      `Programa ANDREAS: si 3 nuevos usuarios crean cuenta verificada con tu código y realizan su primera compra en efectivo o con tarjeta, o agendan su primera cita, ganás 29,99% en un servicio más sesión de fotos e imagen impresa, canjeable en Salon Andreas.`;
    try {
      await Share.share({
        message: msg,
        title: 'Invitación Salon Andreas',
      });
    } catch {
      /* cancelado */
    }
  };

  const copyCode = async () => {
    if (!codigo || codigo === '—') {
      Alert.alert('Código', 'Aún no tenemos un código asignado. Volvé a abrir Premios luego de iniciar sesión.');
      return;
    }
    try {
      await Clipboard.setStringAsync(codigo);
      Alert.alert('Listo', 'Código copiado al portapapeles.');
    } catch {
      Alert.alert('Código', codigo);
    }
  };

  const onCanjeInfo = (id, titulo, detalle) => {
    setCanjeTap(id);
    Alert.alert(titulo, detalle, [{ text: 'OK', onPress: () => setCanjeTap(null) }]);
  };

  const canjesIlustrativos = [
    {
      id: 'p_app_efectivo_retiro',
      titulo: '19,99% · app efectivo y retiro en salón',
      detalle:
        '1 punto por cada producto en pedidos de la app pagados en efectivo con retiro en Salon Andreas, verificados al entregar el pedido (estado entregado). Con 8 puntos: 19,99% de descuento en un producto en tu próxima compra por la app con el mismo método (efectivo + retiro en salón). Coordiná el canje en recepción.',
    },
    {
      id: 'p_app_tarjeta_delivery',
      titulo: '19,99% · app tarjeta y envío a domicilio',
      detalle:
        '1 punto por cada producto en pedidos de la app pagados con tarjeta y envío a domicilio (delivery), verificados al entregar el pedido (estado entregado). Con 8 puntos: 19,99% de descuento en un producto en tu próxima compra por la app con tarjeta y envío a domicilio. Coordiná el canje en recepción.',
    },
    {
      id: 'citas',
      titulo: '19,99% en servicio + producto',
      detalle:
        'Con 8 citas en estado completada y verificadas en el salón, obtenés 19,99% de descuento en un servicio al comprar producto en Salon Andreas. Canje en salón.',
    },
    {
      id: 'salon',
      titulo: '19,99% próximo producto (salón físico)',
      detalle:
        'Cuando adquirís un producto en el salón, la compra se registra con tu nombre y la vinculación de tu perfil en la app; podés ver cómo sube la barra. Con 8 unidades verificadas: 19,99% en la siguiente compra de producto en salón físico.',
    },
  ];

  if (!clientUserId || !clienteRow?.id) {
    return (
      <>
        <View style={[styles.card, { marginBottom: spacing.md }]}>
          <Text style={styles.cardLead}>
            Iniciá sesión y pedí en recepción que enlacen tu cuenta para ver tu código ANDREAS y el progreso de puntos.
          </Text>
        </View>
        <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      </>
    );
  }

  return (
    <>
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={['#1A1612', '#0C0B0A', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: styles.heroBorderColor }]}
        >
          <LinearGradient
            colors={['rgba(201, 162, 77, 0.2)', 'rgba(201, 162, 77, 0.04)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={styles.heroSheen}
            pointerEvents="none"
          />
          <View style={styles.heroInner}>
            <View style={styles.heroTop}>
              <View style={[styles.heroBadge, { borderColor: styles.heroGoldBorder }]}>
                <Crown size={14} color={tc.primary} strokeWidth={2.2} />
                <Text style={styles.heroBadgeTxt}>ANDREAS</Text>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity
                  onPress={() => setModalSalonFisico(true)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Ver progreso salón físico"
                  activeOpacity={0.85}
                  style={[styles.heroIconBtn, { borderColor: styles.heroGoldBorderSoft }]}
                >
                  <Store size={18} color="#F5E6A8" strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void load()}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Actualizar puntos"
                  activeOpacity={0.85}
                  disabled={loading}
                  style={[styles.heroIconBtn, { borderColor: styles.heroGoldBorderSoft }]}
                >
                  <RefreshCw size={18} color="rgba(255,255,255,0.65)" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroTitleRow}>
              <Sparkles size={16} color={tc.primary} strokeWidth={2} />
              <Text style={styles.heroEyebrow}>Programa exclusivo</Text>
            </View>
            <Text style={styles.heroPoints}>Premios</Text>
            <View style={[styles.heroDivider, { backgroundColor: tc.primary }]} />
            <Text style={styles.heroPointsLabel}>Programa de puntos Salon Andreas</Text>

            <View style={[styles.heroTaglineBox, { borderColor: styles.heroGoldBorder, backgroundColor: styles.heroTaglineBg }]}>
              <Text style={[styles.heroTagline, { color: styles.heroTaglineColor }]}>
                Cada acción que realizás con Salon Andreas tiene recompensa; todo lo que hacés tiene valor.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={tc.primary} />
      ) : loadErr ? (
        <View style={[styles.card, { marginBottom: spacing.md }]}>
          <Text style={styles.cardLead}>{loadErr}</Text>
          <SalonButton variant="mutedFill" title="Reintentar" fullWidth onPress={() => void load()} />
        </View>
      ) : null}

      {!loading && !loadErr && resumen?.rpcMissing ? (
        <View style={[styles.card, { marginBottom: spacing.md, borderColor: tc.primary }]}>
          <Text style={styles.cardLead}>
            Para contar referidos (compra o primera cita), ejecutá en Supabase el script{' '}
            <Text style={styles.leadStrong}>supabase-andreas-premios.sql</Text> (función RPC). El resto de contadores
            ya debería funcionar.
          </Text>
        </View>
      ) : null}

      {!loading && !loadErr ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cómo sumás y canjeás</Text>
            <Text style={styles.cardLead}>
              Un punto por cada unidad verificada según el canal. Al completar 8 en la misma regla, se habilita el
              canje indicado (coordinación en Salon Andreas).
            </Text>

            <RuleProgress
              icon={Wallet}
              title="App · efectivo y retiro en salón"
              body="1 punto por cada producto en pedidos de la app pagados en efectivo con retiro en Salon Andreas, verificados al entregar (estado entregado). 8 puntos: 19,99% de descuento en un producto en tu próxima compra app con efectivo y retiro en salón."
              current={productosAppEfectivoRetiro}
              meta={META_APP_EFECTIVO_RETIRO}
              tc={tc}
            />
            <RuleProgress
              icon={Truck}
              title="App · tarjeta y envío a domicilio"
              body="1 punto por cada producto en pedidos de la app pagados con tarjeta y envío a domicilio, verificados al entregar (estado entregado). 8 puntos: 19,99% de descuento en un producto en tu próxima compra app con tarjeta y delivery."
              current={productosAppTarjetaDelivery}
              meta={META_APP_TARJETA_DELIVERY}
              tc={tc}
            />
            <RuleProgress
              icon={Calendar}
              title="Citas verificadas"
              body="1 punto por cada cita en estado completada. 8 citas: 19,99% de descuento en un servicio al comprar producto en Salon Andreas."
              current={citasOk}
              meta={META_CITAS}
              tc={tc}
            />
            <RuleProgress
              icon={Store}
              title="Producto en salón físico"
              body="Cuando adquirís un producto en el salón, la compra se registra con tu nombre y la vinculación de tu perfil en la app; podés ver cómo sube la barra. Con 8 unidades: 19,99% en la siguiente compra de producto en salón físico."
              current={salonFisico}
              meta={META_SALON}
              tc={tc}
            />
          </View>

          <View style={[styles.card, { borderColor: tc.cardBorder }]}>
            <Text style={styles.cardTitle}>Referidos verificados</Text>
            <Text style={styles.cardLead}>
              Si <Text style={styles.leadStrong}>3 nuevos usuarios</Text> crean cuenta verificada, se registran con tu
              código y realizan su <Text style={styles.leadStrong}>primera compra en efectivo o con tarjeta</Text>, o{' '}
              <Text style={styles.leadStrong}>agendan su primera cita</Text>, como referidor ganás{' '}
              <Text style={styles.leadStrong}>29,99% en un servicio</Text>, más{' '}
              <Text style={styles.leadStrong}>sesión de fotos e imagen impresa</Text>, canjeable en Salon Andreas.
            </Text>
            <View style={[localStyles.ruleCard, { borderColor: tc.cardBorder, marginBottom: spacing.md }]}>
              <View style={localStyles.ruleHead}>
                <Users size={18} color={tc.primary} strokeWidth={2} />
                <Text style={[localStyles.ruleTitle, { color: tc.foreground }]}>Progreso de referidos</Text>
              </View>
              <View style={[localStyles.track, { backgroundColor: tc.iconCircleBg ?? '#F3F3F3' }]}>
                <View
                  style={[
                    localStyles.fill,
                    {
                      width: `${Math.min(1, referidosOk / META_REFERIDOS) * 100}%`,
                      backgroundColor: tc.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[localStyles.ruleMeta, { color: tc.foregroundSubtle ?? '#888', marginTop: 4 }]}>
                {referidosOk} de {META_REFERIDOS} referidos verificados (compra o primera cita)
              </Text>
            </View>

            <TouchableOpacity style={styles.codeBox} onPress={copyCode} activeOpacity={0.85}>
              <Text style={styles.codeText}>{codigo}</Text>
              <Copy size={20} color={tc.primary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.codeHint}>Toca el código para copiarlo</Text>
            <TouchableOpacity style={styles.refShareBtn} onPress={shareReferral} activeOpacity={0.9}>
              <Share2 size={18} color={tc.heroCtaText} strokeWidth={2.2} />
              <Text style={styles.refShareTxt}>Compartir invitación Salon Andreas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Gift size={20} color={tc.primary} strokeWidth={2} />
              <Text style={styles.cardTitleFlush}>Canjes (resumen)</Text>
            </View>
            <Text style={styles.cardLead}>Tocá cada ítem para ver la condición completa antes de ir a recepción.</Text>
            {canjesIlustrativos.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.canjeRow, canjeTap === c.id && styles.canjeRowActive]}
                onPress={() => onCanjeInfo(c.id, c.titulo, c.detalle)}
                activeOpacity={0.88}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.canjeTitulo}>{c.titulo}</Text>
                  <Text style={styles.canjeDetalle} numberOfLines={3}>
                    {c.detalle}
                  </Text>
                </View>
                <View style={styles.canjeCost}>
                  <Percent size={14} color={tc.primary} strokeWidth={2} />
                  <Award size={14} color={tc.primary} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <Modal
        visible={modalSalonFisico}
        animationType="slide"
        transparent
        onRequestClose={() => setModalSalonFisico(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: tc.card, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
            ]}
          >
            <View style={styles.modalHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Store size={20} color={tc.primary} strokeWidth={2} />
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Salón físico</Text>
              </View>
              <TouchableOpacity onPress={() => setModalSalonFisico(false)} hitSlop={12}>
                <X size={22} color={tc.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardLead}>
              Cada producto que comprás en el salón (no en la app) lo registra recepción en tu ficha. Llevás{' '}
              <Text style={styles.leadStrong}>{salonFisico}</Text> de <Text style={styles.leadStrong}>{META_SALON}</Text>{' '}
              unidades verificadas.
            </Text>
            <View style={[localStyles.track, { backgroundColor: tc.iconCircleBg ?? '#F3F3F3', marginBottom: spacing.md }]}>
              <View
                style={[
                  localStyles.fill,
                  {
                    width: `${Math.min(1, salonFisico / META_SALON) * 100}%`,
                    backgroundColor: tc.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.cardLead, { marginBottom: spacing.md }]}>
              Al completar {META_SALON} unidades, podés canjear <Text style={styles.leadStrong}>19,99%</Text> de
              descuento en la compra del siguiente producto en Salon Andreas. Si acabás de comprar en salón y no ves el
              cambio, pedí en recepción que lo registren y tocá actualizar.
            </Text>
            <SalonButton
              variant="heroGold"
              title={loading ? 'Actualizando…' : 'Actualizar progreso'}
              fullWidth
              disabled={loading}
              onPress={() => void load()}
            />
            <SalonButton
              variant="outlineGray"
              title="Cerrar"
              fullWidth
              style={{ marginTop: spacing.sm }}
              onPress={() => setModalSalonFisico(false)}
            />
          </View>
        </View>
      </Modal>

      <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      <Text style={styles.footNote}>
        Reglas y exclusiones las confirma el equipo en App Salón; los canjes de premios ANDREAS se coordinan en
        recepción Salon Andreas.
      </Text>
    </>
  );
}

function createPremiosStyles(c) {
  const gold = c.primary ?? '#C9A24D';
  const goldLight = '#E8D4A8';
  const goldBorder = 'rgba(201, 162, 77, 0.38)';
  const goldBorderSoft = 'rgba(201, 162, 77, 0.22)';

  return StyleSheet.create({
    heroBorderColor: goldBorder,
    heroGoldBorder: goldBorder,
    heroGoldBorderSoft: goldBorderSoft,
    heroTaglineBg: 'rgba(201, 162, 77, 0.1)',
    heroTaglineColor: goldLight,
    heroWrap: {
      marginBottom: spacing.md,
      borderRadius: radii.lg,
      ...Platform.select({
        ios: {
          shadowColor: gold,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.28,
          shadowRadius: 18,
        },
        android: { elevation: 10 },
      }),
    },
    hero: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      borderWidth: 1,
    },
    heroSheen: {
      ...StyleSheet.absoluteFillObject,
    },
    heroInner: {
      padding: spacing.lg,
      paddingTop: spacing.md,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    heroActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    heroEyebrow: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: goldLight,
    },
    heroDivider: {
      width: 44,
      height: 2,
      borderRadius: 1,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      opacity: 0.9,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(201, 162, 77, 0.14)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    heroBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: goldLight,
      letterSpacing: 1.2,
    },
    heroPoints: {
      fontFamily: typography.fontDisplay,
      fontSize: 36,
      color: '#FFFFFF',
      letterSpacing: -0.8,
      textShadowColor: 'rgba(201, 162, 77, 0.35)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    heroPointsLabel: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: 'rgba(255,255,255,0.68)',
      letterSpacing: 0.3,
      marginBottom: spacing.md,
    },
    heroTaglineBox: {
      borderRadius: radii.sm,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    heroTagline: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      lineHeight: 21,
      letterSpacing: 0.2,
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
