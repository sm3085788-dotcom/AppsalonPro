import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { CitaFechaHoraPicker } from './CitaFechaHoraPicker';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { db, visitaQrImageUrl } from '@appsalon/shared-config';
import {
  labelEstadoCita,
  estadoCitaTone,
  clientePuedeModificarCita,
  citaEstaConfirmada,
  citaNecesitaValidacionVisita,
} from '../../utils/citasLabels';

/**
 * Tarjeta de gestión de una cita (Reprogramar / Cancelar) para Mis citas e Historial.
 */
export function CitaGestionCard({ cita, onRefreshCitas, onGoTab, compact = false }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c, compact), [c, compact]);
  const [reprogramOpen, setReprogramOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(() =>
    cita?.fecha_hora ? new Date(cita.fecha_hora) : new Date(),
  );
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [visitaToken, setVisitaToken] = useState(() => String(cita?.visita_qr_token || '').trim());

  useEffect(() => {
    if (cita?.fecha_hora) {
      setNuevaFecha(new Date(cita.fecha_hora));
    }
  }, [cita?.id, cita?.fecha_hora]);

  useEffect(() => {
    setVisitaToken(String(cita?.visita_qr_token || '').trim());
    setQrError(null);
  }, [cita?.id, cita?.visita_qr_token, cita?.visita_validada_en]);

  const cargarQrVisita = useCallback(async () => {
    if (!cita?.id || !citaEstaConfirmada(cita.estado) || cita.visita_validada_en) return;
    setQrLoading(true);
    setQrError(null);
    const { data, error } = await db.citas.asegurarVisitaQr(cita.id, { allowClientFallback: true });
    setQrLoading(false);
    if (error) {
      setQrError(error.message || 'No se pudo generar el QR. Pedí ayuda en recepción.');
      return;
    }
    if (data) {
      setVisitaToken(String(data).trim());
      onRefreshCitas?.();
    }
  }, [cita?.id, cita?.estado, cita?.visita_validada_en, onRefreshCitas]);

  useEffect(() => {
    if (!cita?.id || !citaNecesitaValidacionVisita(cita) || visitaToken) {
      setQrLoading(false);
      return;
    }
    void cargarQrVisita();
  }, [cita?.id, cita?.estado, cita?.visita_validada_en, visitaToken, cargarQrVisita]);

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

      {citaNecesitaValidacionVisita(cita) ? (
        <View style={styles.visitaQrBox}>
          <Text style={styles.visitaQrTitle}>Tu código de visita</Text>
          <Text style={styles.hint}>
            Mostrá este QR al llegar al salón. Recepción lo escanea y ahí suma el punto en Premios (y tu referido, si
            aplica).
          </Text>
          {qrLoading ? (
            <Text style={[styles.hint, { marginTop: spacing.sm }]}>Generando tu QR…</Text>
          ) : visitaToken && visitaQrImageUrl(visitaToken, 200) ? (
            <Image
              source={{ uri: visitaQrImageUrl(visitaToken, 200) }}
              style={styles.visitaQrImg}
              accessibilityLabel="Código QR de visita"
            />
          ) : (
            <>
              <Text style={[styles.hint, { marginTop: spacing.xs, color: c.destructive || '#C62828' }]}>
                {qrError || 'No se pudo cargar el QR.'}
              </Text>
              <SalonButton
                title="Generar QR de visita"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.sm }}
                disabled={qrLoading}
                onPress={() => void cargarQrVisita()}
              />
            </>
          )}
        </View>
      ) : confirmada ? (
        <Text style={styles.hint}>Visita validada en salón. El punto ya sumó en Premios.</Text>
      ) : null}

      {puedeModificar && reprogramOpen ? (
        <View style={styles.reprogramBox}>
          <Text style={styles.reprogramLabel}>Nueva fecha y hora</Text>
          <CitaFechaHoraPicker value={nuevaFecha} onChange={setNuevaFecha} />
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
    visitaQrBox: {
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
    },
    visitaQrTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: 4,
      alignSelf: 'flex-start',
    },
    visitaQrImg: {
      width: 200,
      height: 200,
      marginTop: spacing.sm,
      borderRadius: radii.sm,
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
