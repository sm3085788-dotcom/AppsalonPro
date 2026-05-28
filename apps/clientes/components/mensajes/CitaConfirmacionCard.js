import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Sparkles, User, MapPin } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  resolveCitaConfirmacionNoteSegments,
  resolveCitaConfirmacionUbicacion,
} from '@appsalon/shared-config';
function DetailRow({ icon: Icon, label, value, styles, accent }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: accent.iconBg }]}>
        <Icon size={14} color={accent.gold} strokeWidth={2} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export function CitaConfirmacionCard({ data, metaLabel }) {
  const styles = createStyles();
  const accent = {
    gold: '#C9A24D',
    iconBg: 'rgba(201, 162, 77, 0.18)',
  };

  const confirmada = data?.confirmada !== false;
  const noteSegments = resolveCitaConfirmacionNoteSegments(data);
  const ubicacion = resolveCitaConfirmacionUbicacion(data);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#2A1F3D', '#3D2E5C', '#4A3868']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={styles.kickerRow}>
            <Sparkles size={13} color={accent.gold} />
            <Text style={styles.kicker}>{data?.salon || "Andrea's salón"}</Text>
          </View>
          <View style={[styles.badge, confirmada ? styles.badgeOk : styles.badgePending]}>
            <Text style={[styles.badgeTxt, confirmada ? styles.badgeTxtOk : styles.badgeTxtPending]}>
              {confirmada ? 'Confirmada' : 'Pendiente'}
            </Text>
          </View>
        </View>

        <Text style={styles.greeting}>{data?.greeting || 'Hola,'}</Text>
        <Text style={styles.headline}>{data?.headline || 'Tu cita'}</Text>

        <View style={styles.divider} />

        <DetailRow icon={Sparkles} label="Servicio" value={data?.servicio || '—'} styles={styles} accent={accent} />
        <DetailRow icon={Calendar} label="Fecha" value={data?.fecha || '—'} styles={styles} accent={accent} />
        <DetailRow icon={Clock} label="Hora" value={data?.hora || '—'} styles={styles} accent={accent} />
        {data?.profesional ? (
          <DetailRow icon={User} label="Profesional" value={data.profesional} styles={styles} accent={accent} />
        ) : null}
        {data?.precio ? (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total estimado</Text>
            <Text style={styles.priceValue}>{data.precio}</Text>
          </View>
        ) : null}

        {noteSegments?.length ? (
          <Text style={styles.note}>
            {noteSegments.map((seg, i) => (
              <Text key={i} style={seg.bold ? styles.noteStrong : null}>
                {seg.t}
              </Text>
            ))}
          </Text>
        ) : null}

        {ubicacion ? (
          <View style={styles.footerBox}>
            <MapPin size={13} color={accent.gold} strokeWidth={2} />
            <Text style={styles.footerTxt}>{ubicacion}</Text>
          </View>
        ) : null}

        {metaLabel ? <Text style={styles.meta}>{metaLabel}</Text> : null}
      </LinearGradient>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    wrap: { width: '100%', alignSelf: 'stretch' },
    card: {
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(201, 162, 77, 0.35)',
      overflow: 'hidden',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    kicker: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: '#E8D4A8',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.pill,
    },
    badgeOk: { backgroundColor: 'rgba(76, 175, 80, 0.22)' },
    badgePending: { backgroundColor: 'rgba(255, 193, 7, 0.2)' },
    badgeTxt: { fontFamily: typography.fontSansMedium, fontSize: 10 },
    badgeTxtOk: { color: '#C8E6C9' },
    badgeTxtPending: { color: '#FFE082' },
    greeting: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      color: '#FFFFFF',
      marginBottom: 2,
    },
    headline: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      color: 'rgba(255,255,255,0.92)',
      marginBottom: spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.12)',
      marginVertical: spacing.sm,
    },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 8 },
    detailIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    detailCopy: { flex: 1 },
    detailLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.55)',
      marginBottom: 2,
    },
    detailValue: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: '#FFFFFF',
      lineHeight: 19,
    },
    priceRow: {
      marginTop: 4,
      marginBottom: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.12)',
    },
    priceLabel: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.6)',
      marginBottom: 2,
    },
    priceValue: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: '#F5E6A8',
    },
    note: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 20,
      color: 'rgba(255,255,255,0.88)',
      marginBottom: spacing.sm,
    },
    noteStrong: {
      fontFamily: typography.fontSansMedium,
      color: '#FFFFFF',
    },
    footerBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    footerTxt: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      color: 'rgba(255,255,255,0.78)',
    },
    meta: {
      marginTop: spacing.sm,
      fontFamily: typography.fontSans,
      fontSize: 10,
      color: 'rgba(255,255,255,0.5)',
    },
  });
}
