import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import {
  labelEstadoCita,
  estadoCitaTone,
  citaNecesitaValidacionVisita,
} from '../../utils/citasLabels';
import { CitaGestionCard } from './CitaGestionCard';

function formatGtq(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 'Precio a confirmar';
  return `Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function CitaResumenCard({ cita, styles, themeColors }) {
  const tone = estadoCitaTone(cita.estado);
  const dt = new Date(cita.fecha_hora);
  const fecha = dt.toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const hora = dt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.historyCard}>
      <View style={[styles.historyAccent, { backgroundColor: tone.fg }]} />
      <View style={styles.historyBody}>
        <View style={styles.historyRow}>
          <Text style={styles.historyService} numberOfLines={1}>
            {cita.servicio || 'Cita'}
          </Text>
          <View style={[styles.historyPill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.historyPillTxt, { color: tone.fg }]}>
              {labelEstadoCita(cita.estado)}
            </Text>
          </View>
        </View>
        <View style={styles.historyFoot}>
          <View style={styles.historyWhen}>
            <Calendar size={12} color={themeColors.foregroundMuted} strokeWidth={2} />
            <Text style={styles.historyWhenTxt} numberOfLines={1}>
              {`${fecha} · ${hora}`}
            </Text>
          </View>
          <Text style={styles.historyPrice} numberOfLines={1}>
            {formatGtq(cita.precio)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function HistorialCitasTab({
  header,
  proximaCita,
  otrasProximas = [],
  pasadas = [],
  canceladasRechazadas = [],
  citasLoading,
  hasSupabaseEnv,
  clienteRow,
  scrollBottom,
  contentPaddingTop,
  onRefreshCitas,
  onGoTab,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);

  const citasGestion = useMemo(() => {
    const list = [];
    if (proximaCita) list.push(proximaCita);
    for (const cita of otrasProximas || []) {
      if (cita && !list.some((x) => String(x.id) === String(cita.id))) list.push(cita);
    }
    return list;
  }, [proximaCita, otrasProximas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshCitas?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshCitas]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollInner,
        { paddingBottom: scrollBottom, paddingTop: contentPaddingTop },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={c.primary}
          colors={[c.primary]}
        />
      }
    >
      {header}

      <Text style={styles.pageDisplay}>Citas</Text>
      <Text style={styles.pageLead}>Tu próxima visita y citas anteriores.</Text>

      {citasLoading && hasSupabaseEnv ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
      ) : citasGestion.length > 0 ? (
        <>
          <Text style={styles.sectionKicker}>Tu próxima visita</Text>
          <CitaGestionCard
            cita={citasGestion[0]}
            onRefreshCitas={onRefreshCitas}
            onGoTab={onGoTab}
          />
          {citasGestion.length > 1 ? (
            <>
              <Text style={[styles.sectionKicker, { marginTop: spacing.md }]}>
                Otras citas programadas
              </Text>
              {citasGestion.slice(1).map((h) => (
                <CitaGestionCard
                  key={h.id}
                  cita={h}
                  compact
                  onRefreshCitas={onRefreshCitas}
                  onGoTab={onGoTab}
                />
              ))}
            </>
          ) : null}
        </>
      ) : (
        <Text style={[styles.pageLead, { marginBottom: spacing.lg }]}>
          No tenés citas próximas. Elegí un servicio en Mis citas.
        </Text>
      )}

      {canceladasRechazadas.length > 0 ? (
        <>
          <Text style={[styles.sectionKicker, { marginTop: spacing.md }]}>Rechazadas</Text>
          {canceladasRechazadas.map((h) => (
            <CitaResumenCard key={h.id} cita={h} styles={styles} themeColors={c} />
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionKicker, { marginTop: spacing.md }]}>Visitas anteriores</Text>
      {pasadas.length > 0 ? (
        pasadas.map((h) =>
          citaNecesitaValidacionVisita(h) ? (
            <CitaGestionCard
              key={h.id}
              cita={h}
              compact
              onRefreshCitas={onRefreshCitas}
              onGoTab={onGoTab}
            />
          ) : (
            <CitaResumenCard key={h.id} cita={h} styles={styles} themeColors={c} />
          ),
        )
      ) : (
        <Text style={styles.pageLead}>Aún no hay visitas anteriores registradas.</Text>
      )}

    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.background },
    scrollInner: { flexGrow: 1, paddingHorizontal: spacing.lg },
    pageDisplay: {
      fontFamily: typography.fontDisplay,
      fontSize: 27,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    pageLead: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 21,
      marginBottom: spacing.lg,
    },
    sectionKicker: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      color: c.primary,
      marginBottom: spacing.sm,
    },
    historyCard: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      marginBottom: 6,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#1a1024',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.07,
          shadowRadius: 3,
        },
        android: { elevation: 1 },
      }),
    },
    historyAccent: {
      width: 3,
      alignSelf: 'stretch',
    },
    historyBody: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 9,
      paddingHorizontal: spacing.sm,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 5,
    },
    historyService: {
      flex: 1,
      minWidth: 0,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.foreground,
      letterSpacing: 0.1,
    },
    historyPill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radii.pill,
      flexShrink: 0,
    },
    historyPillTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 0.3,
    },
    historyFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    historyWhen: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    historyWhenTxt: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: c.foregroundMuted,
    },
    historyPrice: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: c.foregroundSubtle,
      flexShrink: 0,
      maxWidth: '42%',
      textAlign: 'right',
    },
  });
}
