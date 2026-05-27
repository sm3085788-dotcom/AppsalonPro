import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { db } from '@appsalon/shared-config';
import {
  labelEstadoCita,
  estadoCitaTone,
  clientePuedeModificarCita,
  citaEstaConfirmada,
} from '../../utils/citasLabels';

function formatGtq(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 'Precio a confirmar';
  return `Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function CitaResumenCard({ cita, styles }) {
  const tone = estadoCitaTone(cita.estado);
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTop}>
        <Text style={styles.historyService}>{cita.servicio}</Text>
        <View style={styles.historyRightCol}>
          <View style={[styles.estadoPill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.estadoPillTxt, { color: tone.fg }]}>
              {labelEstadoCita(cita.estado)}
            </Text>
          </View>
          <Text style={styles.historyPrice}>{formatGtq(cita.precio)}</Text>
        </View>
      </View>
      <Text style={styles.historyMeta}>
        {new Date(cita.fecha_hora).toLocaleDateString('es-GT', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
        {' · '}
        {new Date(cita.fecha_hora).toLocaleTimeString('es-GT', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

export function HistorialCitasTab({
  header,
  proximaCita,
  otrasProximas = [],
  pasadas = [],
  canceladasFuturas = [],
  citasLoading,
  hasSupabaseEnv,
  clienteRow,
  scrollBottom,
  contentPaddingTop,
  onRefreshCitas,
  onVerHistorialCompleto,
  onGoTab,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);
  const [reprogramOpen, setReprogramOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(() =>
    proximaCita?.fecha_hora ? new Date(proximaCita.fecha_hora) : new Date(),
  );
  const [saving, setSaving] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshCitas?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshCitas]);

  useEffect(() => {
    if (proximaCita && !clientePuedeModificarCita(proximaCita.estado)) {
      setReprogramOpen(false);
    }
  }, [proximaCita?.id, proximaCita?.estado]);

  const cancelarCita = useCallback(async () => {
    if (!proximaCita?.id) return;
    if (!clientePuedeModificarCita(proximaCita.estado)) {
      Alert.alert(
        'Cita confirmada',
        'El salón ya confirmó esta cita. Para otra fecha, agendá una cita nueva desde Mis citas.',
      );
      return;
    }
    Alert.alert('Cancelar cita', `¿Cancelar ${proximaCita.servicio || 'esta cita'}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          const { error } = await db.citas.cancelar(
            proximaCita.id,
            'Cancelada por el cliente',
            { forClientApp: true },
          );
          setSaving(false);
          if (error) {
            Alert.alert('No se pudo cancelar', error.message || 'Intentá de nuevo.');
            return;
          }
          setReprogramOpen(false);
          onRefreshCitas?.();
        },
      },
    ]);
  }, [proximaCita, onRefreshCitas]);

  const guardarReprogramacion = useCallback(async () => {
    if (!proximaCita?.id) return;
    if (!clientePuedeModificarCita(proximaCita.estado)) {
      Alert.alert(
        'Cita confirmada',
        'No podés reprogramar una cita ya confirmada. Agendá una nueva desde Mis citas.',
      );
      return;
    }
    setSaving(true);
    const { error } = await db.citas.update(
      proximaCita.id,
      {
        fecha_hora: nuevaFecha.toISOString(),
        estado: 'pendiente',
      },
      { forClientApp: true },
    );
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo reprogramar', error.message || 'Intentá de nuevo.');
      return;
    }
    setReprogramOpen(false);
    Alert.alert('Cita actualizada', 'El salón verá la nueva fecha y hora en su agenda.');
    onRefreshCitas?.();
  }, [proximaCita?.id, nuevaFecha, onRefreshCitas]);

  const estado = proximaCita ? estadoCitaTone(proximaCita.estado) : null;
  const puedeModificar = proximaCita && clientePuedeModificarCita(proximaCita.estado);
  const confirmada = proximaCita && citaEstaConfirmada(proximaCita.estado);

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

      <Text style={styles.pageDisplay}>Historial</Text>
      <Text style={styles.pageLead}>Tu próxima visita y citas anteriores.</Text>

      {citasLoading && hasSupabaseEnv ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
      ) : proximaCita ? (
        <>
          <Text style={styles.sectionKicker}>Tu próxima visita</Text>
          <View style={styles.proximaCard}>
            <View style={styles.proximaTop}>
              <Text style={styles.proximaTitulo} numberOfLines={2}>
                {proximaCita.servicio}
              </Text>
              {estado ? (
                <View style={[styles.estadoPill, { backgroundColor: estado.bg }]}>
                  <Text style={[styles.estadoPillTxt, { color: estado.fg }]}>
                    {labelEstadoCita(proximaCita.estado)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.proximaWhenRow}>
              <View style={styles.whenChip}>
                <Calendar size={16} color={c.primary} strokeWidth={1.8} />
                <Text style={styles.whenTxt}>
                  {new Date(proximaCita.fecha_hora).toLocaleDateString('es-GT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
              <View style={styles.whenChip}>
                <Clock size={16} color={c.primary} strokeWidth={1.8} />
                <Text style={styles.whenTxt}>
                  {new Date(proximaCita.fecha_hora).toLocaleTimeString('es-GT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            {confirmada ? (
              <Text style={styles.confirmHint}>
              Cita confirmada por el salón, te enviamos un mensaje con todos los detalles, revisalo
              porfavor.
              </Text>
            ) : null}

            {puedeModificar && reprogramOpen ? (
              <View style={styles.reprogramBox}>
                <Text style={styles.reprogramLabel}>Nueva fecha y hora</Text>
                <TouchableOpacity
                  style={styles.dateRow}
                  onPress={() => setShowDate(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dateTxt}>
                    {nuevaFecha.toLocaleDateString('es-GT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Calendar size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
                </TouchableOpacity>
                {showDate ? (
                  <DateTimePicker
                    mode="date"
                    value={nuevaFecha}
                    minimumDate={new Date()}
                    onChange={(_, d) => {
                      if (Platform.OS !== 'ios') setShowDate(false);
                      if (d) {
                        const next = new Date(nuevaFecha);
                        next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                        setNuevaFecha(next);
                      }
                    }}
                  />
                ) : null}
                <TouchableOpacity
                  style={styles.dateRow}
                  onPress={() => setShowTime(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dateTxt}>
                    {nuevaFecha.toLocaleTimeString('es-GT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Clock size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
                </TouchableOpacity>
                {showTime ? (
                  <DateTimePicker
                    mode="time"
                    value={nuevaFecha}
                    onChange={(_, d) => {
                      if (Platform.OS !== 'ios') setShowTime(false);
                      if (d) {
                        const next = new Date(nuevaFecha);
                        next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                        setNuevaFecha(next);
                      }
                    }}
                  />
                ) : null}
                <SalonButton
                  title={saving ? 'Guardando…' : 'Guardar nueva fecha'}
                  variant="solidGold"
                  fullWidth
                  style={{ marginTop: spacing.sm }}
                  disabled={saving}
                  onPress={() => void guardarReprogramacion()}
                />
                <SalonButton
                  title="Cerrar"
                  variant="outlineGray"
                  fullWidth
                  style={{ marginTop: spacing.sm }}
                  onPress={() => setReprogramOpen(false)}
                />
              </View>
            ) : puedeModificar ? (
              <View style={styles.duoBtns}>
                <SalonButton
                  variant="outlineGray"
                  title="Reprogramar"
                  style={{ flex: 1 }}
                  fullWidth
                  disabled={saving}
                  onPress={() => {
                    setNuevaFecha(new Date(proximaCita.fecha_hora));
                    setReprogramOpen(true);
                  }}
                />
                <SalonButton
                  variant="outlineGray"
                  title="Cancelar"
                  style={{ flex: 1 }}
                  fullWidth
                  disabled={saving}
                  onPress={() => void cancelarCita()}
                />
              </View>
            ) : confirmada ? (
              <SalonButton
                variant="heroGold"
                title="Agendar otra cita"
                fullWidth
                style={{ marginTop: spacing.sm }}
                onPress={() => onGoTab?.('citas')}
              />
            ) : null}
          </View>
        </>
      ) : (
        <Text style={[styles.pageLead, { marginBottom: spacing.lg }]}>
          No tenés citas próximas. Elegí un servicio en Mis citas.
        </Text>
      )}

      {otrasProximas.length > 0 ? (
        <>
          <Text style={[styles.sectionKicker, { marginTop: spacing.md }]}>
            Otras citas programadas
          </Text>
          {otrasProximas.map((h) => (
            <CitaResumenCard key={h.id} cita={h} styles={styles} />
          ))}
        </>
      ) : null}

      {canceladasFuturas.length > 0 ? (
        <>
          <Text style={[styles.sectionKicker, { marginTop: spacing.md }]}>Canceladas</Text>
          {canceladasFuturas.map((h) => (
            <CitaResumenCard key={h.id} cita={h} styles={styles} />
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionKicker, { marginTop: spacing.md }]}>Visitas anteriores</Text>
      {pasadas.length > 0 ? (
        pasadas.map((h) => <CitaResumenCard key={h.id} cita={h} styles={styles} />)
      ) : (
        <Text style={styles.pageLead}>Aún no hay visitas anteriores registradas.</Text>
      )}

      <SalonButton
        variant="outlineGray"
        title="Ver historial completo"
        fullWidth
        onPress={onVerHistorialCompleto}
        style={{ marginTop: spacing.lg }}
      />
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
    proximaCard: {
      backgroundColor: c.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    proximaTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    proximaTitulo: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 18,
      color: c.foreground,
      lineHeight: 24,
    },
    estadoPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    estadoPillTxt: { fontFamily: typography.fontSansMedium, fontSize: 11 },
    proximaWhenRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    whenChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: c.surfaceMuted,
    },
    whenTxt: { fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foreground },
    confirmHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    reprogramBox: { marginTop: spacing.sm },
    reprogramLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.sm,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    dateTxt: { fontFamily: typography.fontSans, fontSize: 15, color: c.foreground, flex: 1 },
    duoBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    lockHint: {
      marginTop: spacing.sm,
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: c.foregroundSubtle,
      textAlign: 'center',
    },
    historyCard: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    historyTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    historyService: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
    },
    historyRightCol: { alignItems: 'flex-end' },
    historyPrice: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundSubtle,
    },
    historyMeta: {
      marginTop: spacing.xs,
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
  });
}
