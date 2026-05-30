import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { CitaFechaHoraPicker, openAndroidCitaPicker } from './CitaFechaHoraPicker';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { useServiciosCart } from '../../context/ServiciosCartContext';
import {
  formatServicioDuracion,
  formatServicioPrecio,
} from '../../services/salonServiciosTienda';

function servicioKey(s) {
  return String(s?.id ?? s?.nombre ?? '');
}

function defaultSlotForIndex(index) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10 + (index % 6), 0, 0, 0);
  return d;
}

export function ServiciosCarritoBody({
  clienteRow,
  onClose,
  onCitasChanged,
  onGoTab,
}) {
  const { colors: c } = useTheme();
  const { items, removeItem, clear } = useServiciosCart();
  const styles = useMemo(() => createStyles(c), [c]);
  const n = items.length;

  const [schedules, setSchedules] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSchedules((prev) => {
      const next = {};
      items.forEach((s, i) => {
        const key = servicioKey(s);
        next[key] = prev[key] ?? defaultSlotForIndex(i);
      });
      return next;
    });
  }, [items]);

  const setScheduleFor = useCallback((key, date) => {
    setSchedules((prev) => ({ ...prev, [key]: date }));
  }, []);

  const solicitarTodas = useCallback(async () => {
    if (!clienteRow?.id) {
      Alert.alert('Cliente', 'Necesitamos tu ficha enlazada al salón para agendar.');
      return;
    }
    if (!items.length) return;

    setSaving(true);
    const creadas = [];
    try {
      for (const s of items) {
        const key = servicioKey(s);
        const fechaHora = schedules[key];
        if (!fechaHora || !Number.isFinite(new Date(fechaHora).getTime())) {
          Alert.alert('Fecha y hora', `Elegí fecha y hora para ${s.nombre || 'el servicio'}.`);
          return;
        }
        const precio = Number(s.precio);
        const dur = Number(s.duracion_minutos);
        const notasServicio = s.inventarioId
          ? `Solicitud desde app clientes · inventario_id=${s.inventarioId}`
          : 'Solicitud desde app clientes';
        const { error } = await db.citas.create(
          {
            cliente_id: clienteRow.id,
            servicio: s.nombre,
            precio: Number.isFinite(precio) ? precio : 0,
            duracion_minutos: Number.isFinite(dur) ? dur : 30,
            fecha_hora: new Date(fechaHora).toISOString(),
            estado: 'pendiente',
            notas_servicio: notasServicio,
            empleado_id: null,
          },
          { forClientApp: true },
        );
        if (error) {
          const raw = String(error.message || '');
          const isRls = /row-level security|violates.*policy|permission denied/i.test(raw);
          const msg = isRls
            ? 'Tu cuenta no tiene permiso para agendar aún. Pedí al salón que vincule tu usuario.'
            : raw || 'Revisá la conexión e intentá de nuevo.';
          Alert.alert(`No se pudo agendar ${s.nombre}`, msg);
          return;
        }
        creadas.push(s.nombre);
      }

      clear();
      onCitasChanged?.();
      Alert.alert(
        'Solicitudes enviadas',
        creadas.length === 1
          ? 'Tu cita quedó pendiente. El salón te confirmará pronto.'
          : `Se enviaron ${creadas.length} solicitudes al salón. Te confirmarán pronto.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose?.();
              onGoTab?.('historial');
            },
          },
        ],
      );
    } finally {
      setSaving(false);
    }
  }, [clienteRow?.id, items, schedules, clear, onCitasChanged, onClose, onGoTab]);

  if (!clienteRow?.id) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.intro}>
          Pedí en recepción que enlacen tu cuenta con el salón para poder solicitar citas desde la app.
        </Text>
        <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {n === 0 ? (
        <Text style={styles.intro}>
          Agregá servicios con el botón + en Mis citas. Cuando termines, volvé aquí para agendar.
        </Text>
      ) : null}

      {items.map((s, index) => {
        const key = servicioKey(s);
        const fechaHora = schedules[key] ?? defaultSlotForIndex(index);

        return (
          <View key={key} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name}>{s.nombre}</Text>
                <Text style={styles.meta}>
                  {formatServicioPrecio(s)} · {formatServicioDuracion(s)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeItem(s)}
                hitSlop={10}
                accessibilityLabel="Quitar de la lista"
              >
                <X size={20} color={c.foregroundSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={styles.whenLbl}>Fecha y hora</Text>
            <CitaFechaHoraPicker
              value={fechaHora}
              onChange={(next) => setScheduleFor(key, next)}
              onRequestAndroidPicker={
                Platform.OS === 'android'
                  ? (mode) => {
                      openAndroidCitaPicker({
                        mode,
                        value: fechaHora,
                        onCommit: (next) => setScheduleFor(key, next),
                      });
                    }
                  : undefined
              }
            />
          </View>
        );
      })}

      {n > 0 ? (
        <>
          <SalonButton
            variant="heroGold"
            title={
              saving
                ? 'Enviando…'
                : n === 1
                  ? 'Solicitar cita'
                  : `Solicitar ${n} citas`
            }
            fullWidth
            style={{ marginTop: spacing.md }}
            disabled={saving}
            onPress={() => void solicitarTodas()}
          />
          {saving ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={c.primary} /> : null}
          <SalonButton
            variant="outlineGray"
            title="Vaciar lista"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={clear}
            disabled={saving}
          />
        </>
      ) : null}

      <SalonButton
        variant="outlineGray"
        title="Seguir eligiendo servicios"
        fullWidth
        style={{ marginTop: spacing.md }}
        onPress={onClose}
        disabled={saving}
      />
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    wrap: { paddingBottom: spacing.xl },
    intro: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 21,
      marginBottom: spacing.md,
    },
    card: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    name: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
    },
    meta: {
      marginTop: 2,
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    whenLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      color: c.foregroundSubtle,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceMuted,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
    },
    dateTxt: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foreground,
      flex: 1,
    },
  });
}
