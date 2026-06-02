import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Sparkles, User, MapPin } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  resolveCitaConfirmacionNoteSegments,
  resolveCitaConfirmacionUbicacion,
} from '@appsalon/shared-config';

const SHELL_GRADIENT = ['#1a0f2e', '#2d1b52', '#3b2766'];
const GOLD = '#F5E6A8';
const ICON_BG = 'rgba(212, 175, 55, 0.16)';

function FactRow({ icon: Icon, label, value }) {
  return (
    <View style={styles.factRow}>
      <View style={styles.factIconWrap}>
        <Icon size={16} color={GOLD} strokeWidth={2} />
      </View>
      <View style={styles.factCopy}>
        <Text style={styles.factLbl}>{label}</Text>
        <Text style={styles.factVal}>{value}</Text>
      </View>
    </View>
  );
}

export function CitaConfirmacionCard({ data, metaLabel }) {
  const confirmada = data?.confirmada !== false;
  const noteSegments = resolveCitaConfirmacionNoteSegments(data);
  const ubicacion = resolveCitaConfirmacionUbicacion(data);

  return (
    <View style={styles.post}>
      <LinearGradient colors={SHELL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shell}>
        <View style={styles.topBar}>
          <View style={styles.kickerRow}>
            <Sparkles size={14} color={GOLD} />
            <Text style={styles.kicker}>{data?.salon || "Andrea's salón"}</Text>
          </View>
          <View style={[styles.badge, confirmada ? styles.badgeOk : styles.badgePending]}>
            <Text style={[styles.badgeTxt, confirmada ? styles.badgeTxtOk : styles.badgeTxtPending]}>
              {confirmada ? 'Confirmada' : 'Pendiente'}
            </Text>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.greeting}>{data?.greeting || 'Hola,'}</Text>
          <Text style={styles.headline}>{data?.headline || 'Tu cita'}</Text>
        </View>

        <View style={styles.factsPanel}>
          <FactRow icon={Sparkles} label="Servicio" value={data?.servicio || '—'} />
          <View style={styles.factSep} />
          <FactRow icon={Calendar} label="Fecha" value={data?.fecha || '—'} />
          <View style={styles.factSep} />
          <FactRow icon={Clock} label="Hora" value={data?.hora || '—'} />
          {data?.profesional ? (
            <>
              <View style={styles.factSep} />
              <FactRow icon={User} label="Profesional" value={data.profesional} />
            </>
          ) : null}
          {data?.precio ? (
            <View style={styles.priceBlock}>
              <Text style={styles.priceLbl}>Total estimado</Text>
              <Text style={styles.priceVal}>{data.precio}</Text>
            </View>
          ) : null}
        </View>

        {noteSegments?.length ? (
          <View style={styles.noteBox}>
            <Text style={styles.note}>
              {noteSegments.map((seg, i) => (
                <Text key={i} style={seg.bold ? styles.noteStrong : null}>
                  {seg.t}
                </Text>
              ))}
            </Text>
          </View>
        ) : null}

        {ubicacion ? (
          <View style={styles.ubicacionBox}>
            <View style={styles.ubicacionIconWrap}>
              <MapPin size={15} color={GOLD} strokeWidth={2} />
            </View>
            <Text style={styles.ubicacionTxt}>{ubicacion}</Text>
          </View>
        ) : null}

        {metaLabel ? <Text style={styles.meta}>{metaLabel}</Text> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radii.lg + 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  shell: {
    borderRadius: radii.lg + 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  kicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: GOLD,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeOk: { backgroundColor: 'rgba(76, 175, 80, 0.28)' },
  badgePending: { backgroundColor: 'rgba(255, 193, 7, 0.22)' },
  badgeTxt: { fontFamily: typography.fontSansMedium, fontSize: 10, letterSpacing: 0.3 },
  badgeTxtOk: { color: '#C8E6C9' },
  badgeTxtPending: { color: '#FFE082' },
  heroCopy: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  greeting: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    lineHeight: 32,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: typography.fontSans,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
  },
  factsPanel: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  factIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factCopy: { flex: 1, minWidth: 0, gap: 3 },
  factLbl: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(245,230,168,0.8)',
  },
  factVal: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  factSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 36 + spacing.sm,
  },
  priceBlock: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    gap: 2,
  },
  priceLbl: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priceVal: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: '#D4AF37',
    letterSpacing: -0.2,
  },
  noteBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  note: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.88)',
  },
  noteStrong: {
    fontFamily: typography.fontSansMedium,
    color: '#FFFFFF',
  },
  ubicacionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
  },
  ubicacionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ubicacionTxt: {
    flex: 1,
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.9)',
    paddingTop: 6,
  },
  meta: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
