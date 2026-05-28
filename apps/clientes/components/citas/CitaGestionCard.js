import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
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

/**
 * Tarjeta de gestión de una cita (Reprogramar / Cancelar) para Mis citas e Historial.
 */
export function CitaGestionCard({ cita, onRefreshCitas, onGoTab, compact = false }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c, compact), [c, compact]);
  const [reprogramOpen, setReprogramOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(() =>
    cita?.fecha_hora ? new Date(cita.fecha_hora) : new Date(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cita?.fecha_hora) {
      setNuevaFecha(new Date(cita.fecha_hora));
    }
  }, [cita?.id, cita?.fecha_hora]);

  useEffect(() => {
    if (cita && !clientePuedeModificarCita(cita.estado)) {
      setReprogramOpen(false);
    }
  }, [cita?.id, cita?.estado]);

  const cancelarCita = useCallback(async () => {
    if (!cita?.id) return;
    if (!clientePuedeModificarCita(cita.estado)) {
      Alert.alert(
        'Cita confirmada',
        'El salón ya confirmó esta cita. Para otra fecha, agendá una cita nueva desde Mis citas.',
      );
      return;
    }
    Alert.alert('Cancelar cita', `¿Cancelar ${cita.servicio || 'esta cita'}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          const { error } = await db.citas.cancelar(cita.id, 'Cancelada por el cliente', {
            forClientApp: true,
          });
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
  }, [cita, onRefreshCitas]);

  const guardarReprogramacion = useCallback(async () => {
    if (!cita?.id) return;
    if (!clientePuedeModificarCita(cita.estado)) {
      Alert.alert(
        'Cita confirmada',
        'No podés reprogramar una cita ya confirmada. Agendá una nueva desde Mis citas.',
      );
      return;
    }
    setSaving(true);
    const { error } = await db.citas.update(
      cita.id,
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
  }, [cita?.id, cita?.estado, nuevaFecha, onRefreshCitas]);

  if (!cita) return null;

  const estado = estadoCitaTone(cita.estado);
  const puedeModificar = clientePuedeModificarCita(cita.estado);
  const confirmada = citaEstaConfirmada(cita.estado);
  const dt = new Date(cita.fecha_hora);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.titulo} numberOfLines={2}>
          {cita.servicio || 'Cita'}
        </Text>
        <View style={[styles.pill, { backgroundColor: estado.bg, maxWidth: '52%' }]}>
          <Text style={[styles.pillTxt, { color: estado.fg }]} numberOfLines={2}>
            {labelEstadoCita(cita.estado)}
          </Text>
        </View>
      </View>
      <View style={styles.whenRow}>
        <View style={styles.chip}>
          <Calendar size={compact ? 14 : 16} color={c.primary} strokeWidth={1.8} />
          <Text style={styles.chipTxt}>
            {dt.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.chip}>
          <Clock size={compact ? 14 : 16} color={c.primary} strokeWidth={1.8} />
          <Text style={styles.chipTxt}>
            {dt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      {puedeModificar ? (
        <Text style={styles.hint}>
          El salón revisará tu solicitud y te confirmará la cita por mensaje.
        </Text>
      ) : null}

      {confirmada ? (
        <Text style={styles.hint}>
          Cita confirmada. Revisá el detalle en Andreas Pro (Mensajes).
        </Text>
      ) : null}

      {puedeModificar && reprogramOpen ? (
        <View style={styles.reprogramBox}>
          <Text style={styles.reprogramLabel}>Nueva fecha y hora</Text>
          <TouchableOpacity style={styles.dateRow} onPress={() => setShowDate(true)} activeOpacity={0.85}>
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
          <TouchableOpacity style={styles.dateRow} onPress={() => setShowTime(true)} activeOpacity={0.85}>
            <Text style={styles.dateTxt}>
              {nuevaFecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
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
              setNuevaFecha(new Date(cita.fecha_hora));
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
  );
}

function createStyles(c, compact) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: compact ? radii.md : radii.xl,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: compact ? spacing.md : spacing.lg,
      marginBottom: spacing.sm,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    titulo: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: compact ? 16 : 18,
      color: c.foreground,
      lineHeight: compact ? 21 : 24,
    },
    pill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    pillTxt: { fontFamily: typography.fontSansMedium, fontSize: 11 },
    whenRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: c.surfaceMuted,
    },
    chipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foreground },
    hint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    reprogramBox: { marginTop: spacing.xs },
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
    duoBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  });
}
