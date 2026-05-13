import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useSubStyles } from '../components/luxury/SubScreenChrome';
import { SalonButton } from '../components/luxury/SalonButton';
import { useTheme } from '../theme/ThemeProvider';
import { db } from '@appsalon/shared-config';

function defaultNextSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

/**
 * Solicitud de cita desde la app clientes: queda en estado `pendiente` hasta que el salón confirme o rechace.
 */
export function AgendarCitaForm({ clienteRow, onClose, onGoTab, onCitasChanged }) {
  const subStyles = useSubStyles();
  const { colors: tc } = useTheme();
  const [servicios, setServicios] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [servicioSel, setServicioSel] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [fechaHora, setFechaHora] = useState(() => defaultNextSlot());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCat(true);
      const { data, error } = await db.servicios.search('', 120);
      if (!alive) return;
      setLoadingCat(false);
      if (error || !Array.isArray(data)) {
        setServicios([]);
        return;
      }
      setServicios(data);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return servicios;
    return servicios.filter((s) => String(s.nombre || '').toLowerCase().includes(q));
  }, [busqueda, servicios]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hint: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: tc.foregroundMuted,
          lineHeight: 19,
          marginBottom: spacing.md,
        },
        svcRow: {
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          backgroundColor: tc.card,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        svcRowOn: {
          borderColor: tc.primary,
          backgroundColor: tc.surfaceMuted,
        },
        svcName: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: tc.foreground,
        },
        svcMeta: {
          marginTop: 2,
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: tc.foregroundMuted,
        },
        dateRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          backgroundColor: tc.card,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        dateTxt: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: tc.foreground,
          flex: 1,
        },
      }),
    [tc],
  );

  const solicitar = useCallback(async () => {
    if (!clienteRow?.id) {
      Alert.alert('Cliente', 'Necesitamos tu ficha enlazada al salón para agendar.');
      return;
    }
    if (!servicioSel) {
      Alert.alert('Servicio', 'Elegí un servicio de la lista.');
      return;
    }
    setSaving(true);
    const precio = Number(servicioSel.precio);
    const dur = Number(servicioSel.duracion_minutos);
    const { error } = await db.citas.create({
      cliente_id: clienteRow.id,
      servicio: servicioSel.nombre,
      precio: Number.isFinite(precio) ? precio : 0,
      duracion_minutos: Number.isFinite(dur) ? dur : 30,
      fecha_hora: fechaHora.toISOString(),
      estado: 'pendiente',
      notas_servicio: 'Solicitud desde app clientes',
      empleado_id: null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo enviar', error.message || 'Revisá la conexión e intentá de nuevo.');
      return;
    }
    onCitasChanged?.();
    Alert.alert('Solicitud enviada', 'El salón verá tu cita en pendiente y te confirmará pronto.', [
      {
        text: 'OK',
        onPress: () => {
          onClose?.();
          onGoTab?.('citas');
        },
      },
    ]);
  }, [clienteRow?.id, servicioSel, fechaHora, onCitasChanged, onClose, onGoTab]);

  if (!clienteRow?.id) {
    return (
      <>
        <View style={[subStyles.card, { paddingTop: spacing.sm }]}>
          <Text style={subStyles.rowLabel}>Ficha de cliente</Text>
          <Text style={subStyles.rowSub}>
            Pedí en recepción que enlacen tu cuenta con el salón para poder solicitar citas desde la app.
          </Text>
        </View>
        <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      </>
    );
  }

  return (
    <>
      <Text style={styles.hint}>
        Elegí servicio, fecha y hora. La solicitud llega al salón en estado pendiente hasta que la confirmen o
        rechacen.
      </Text>

      <View style={[subStyles.card, { paddingTop: spacing.sm }]}>
        <Text style={subStyles.rowLabel}>Buscar servicio</Text>
        <TextInput
          style={{
            minHeight: 46,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: tc.cardBorder,
            backgroundColor: tc.card,
            color: tc.foreground,
            paddingHorizontal: spacing.md,
            marginTop: spacing.xs,
            fontFamily: typography.fontSans,
            fontSize: 15,
          }}
          placeholder="Nombre del servicio…"
          placeholderTextColor={tc.foregroundSubtle}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {loadingCat ? (
          <ActivityIndicator style={{ marginTop: spacing.md }} color={tc.primary} />
        ) : (
          <View style={{ marginTop: spacing.md, maxHeight: 220 }}>
            {filtrados.slice(0, 40).map((s) => {
              const on = servicioSel?.id === s.id;
              return (
                <TouchableOpacity
                  key={String(s.id)}
                  style={[styles.svcRow, on && styles.svcRowOn]}
                  onPress={() => setServicioSel(s)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.svcName}>{s.nombre}</Text>
                  <Text style={styles.svcMeta}>
                    Q{Number(s.precio || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{' '}
                    · {Number(s.duracion_minutos) || 30} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={[subStyles.card, { marginTop: spacing.md }]}>
        <Text style={subStyles.rowLabel}>Fecha y hora</Text>
        <TouchableOpacity style={[styles.dateRow, { marginTop: spacing.sm }]} onPress={() => setShowDate(true)}>
          <Text style={styles.dateTxt}>
            {fechaHora.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Calendar size={18} color={tc.foregroundSubtle} strokeWidth={1.8} />
        </TouchableOpacity>
        {showDate ? (
          <DateTimePicker
            mode="date"
            value={fechaHora}
            minimumDate={new Date()}
            maximumDate={new Date(new Date().getFullYear() + 1, 11, 31)}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowDate(false);
              if (d) {
                const next = new Date(fechaHora);
                next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                setFechaHora(next);
              }
            }}
          />
        ) : null}

        <TouchableOpacity style={styles.dateRow} onPress={() => setShowTime(true)}>
          <Text style={styles.dateTxt}>
            {fechaHora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Clock size={18} color={tc.foregroundSubtle} strokeWidth={1.8} />
        </TouchableOpacity>
        {showTime ? (
          <DateTimePicker
            mode="time"
            value={fechaHora}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowTime(false);
              if (d) {
                const next = new Date(fechaHora);
                next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                setFechaHora(next);
              }
            }}
          />
        ) : null}
      </View>

      <SalonButton
        title={saving ? 'Enviando…' : 'Solicitar cita'}
        variant="heroGold"
        fullWidth
        style={{ marginTop: spacing.md }}
        disabled={saving || !servicioSel}
        onPress={solicitar}
      />
      <SalonButton variant="outlineGray" title="Cancelar" fullWidth style={{ marginTop: spacing.sm }} onPress={onClose} />
    </>
  );
}
