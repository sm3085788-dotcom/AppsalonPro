import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { loadServiciosTiendaCatalog, formatServicioPrecio, formatServicioDuracion } from '../services/salonServiciosTienda';
import { useServiciosCart } from '../context/ServiciosCartContext';

function defaultNextSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

function normNombreServicio(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function servicioCoincideVinculo(s, linkId, linkName) {
  const id = String(linkId || '').trim();
  if (id) {
    if (String(s.inventarioId || '') === id) return true;
    if (String(s.id || '') === id || String(s.id || '') === `inv-${id}`) return true;
  }
  const want = normNombreServicio(linkName);
  if (want && normNombreServicio(s.nombre) === want) return true;
  return false;
}

/**
 * Solicitud de cita desde la app clientes: queda en estado `pendiente` hasta que el salón confirme o rechace.
 */
export function AgendarCitaForm({
  clienteRow,
  onClose,
  onGoTab,
  onCitasChanged,
  initialServicioNombre = null,
  initialServicioId = null,
  soloServicioVinculado = false,
  onCitaBooked,
  modoCarrito = false,
}) {
  const subStyles = useSubStyles();
  const { colors: tc } = useTheme();
  const { items: cartItems, removeItem, clear: clearCart } = useServiciosCart();
  const cartInicialRef = useRef(null);
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
      const list = await loadServiciosTiendaCatalog();
      if (!alive) return;
      setLoadingCat(false);
      setServicios(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (modoCarrito) {
      if (cartInicialRef.current == null && cartItems.length > 0) {
        cartInicialRef.current = cartItems.length;
      }
      if (cartItems.length > 0) setServicioSel(cartItems[0]);
      else setServicioSel(null);
      return;
    }
    if (!servicios.length) return;
    if (soloServicioVinculado) {
      const hit = servicios.find((s) =>
        servicioCoincideVinculo(s, initialServicioId, initialServicioNombre),
      );
      if (hit) setServicioSel(hit);
      return;
    }
    const want = normNombreServicio(initialServicioNombre);
    if (!want) return;
    const hit = servicios.find((s) => normNombreServicio(s.nombre) === want);
    if (hit) setServicioSel(hit);
  }, [
    modoCarrito,
    cartItems,
    initialServicioNombre,
    initialServicioId,
    soloServicioVinculado,
    servicios,
  ]);

  const serviciosCatalogo = useMemo(() => {
    if (!soloServicioVinculado) return servicios;
    const hits = servicios.filter((s) =>
      servicioCoincideVinculo(s, initialServicioId, initialServicioNombre),
    );
    return hits.length ? hits : servicios;
  }, [servicios, soloServicioVinculado, initialServicioId, initialServicioNombre]);

  const cartTotal = cartItems.length;
  const cartTotalFijo = cartInicialRef.current || cartTotal;
  const cartPaso =
    modoCarrito && cartTotalFijo > 0 ? cartTotalFijo - cartTotal + 1 : 0;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return serviciosCatalogo;
    return serviciosCatalogo.filter((s) => String(s.nombre || '').toLowerCase().includes(q));
  }, [busqueda, serviciosCatalogo]);

  const mostrarListaServicios = !soloServicioVinculado || serviciosCatalogo.length > 1;

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
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          backgroundColor: tc.card,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
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
          marginTop: spacing.xs,
          fontFamily: typography.fontSans,
          fontSize: 14,
          color: tc.foregroundMuted,
        },
        searchInput: {
          minHeight: 48,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          backgroundColor: tc.card,
          color: tc.foreground,
          paddingHorizontal: spacing.md,
          marginTop: spacing.xs,
          fontFamily: typography.fontSans,
          fontSize: 15,
        },
        sectionTitle: {
          fontFamily: typography.fontSansMedium,
          fontSize: 16,
          color: tc.foreground,
          marginBottom: spacing.xs,
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
    const notasServicio = servicioSel.inventarioId
      ? `Solicitud desde app clientes · inventario_id=${servicioSel.inventarioId}`
      : 'Solicitud desde app clientes';
    const { error } = await db.citas.create(
      {
        cliente_id: clienteRow.id,
        servicio: servicioSel.nombre,
        precio: Number.isFinite(precio) ? precio : 0,
        duracion_minutos: Number.isFinite(dur) ? dur : 30,
        fecha_hora: fechaHora.toISOString(),
        estado: 'pendiente',
        notas_servicio: notasServicio,
        empleado_id: null,
      },
      { forClientApp: true },
    );
    setSaving(false);
    if (error) {
      const raw = String(error.message || '');
      const isRls = /row-level security|violates.*policy|permission denied/i.test(raw);
      const msg = isRls
        ? 'Tu cuenta no tiene permiso para agendar aún. Pedí al salón que vincule tu usuario y habilite agenda en tu perfil.'
        : raw || 'Revisá la conexión e intentá de nuevo.';
      Alert.alert('No se pudo enviar', msg);
      return;
    }
    onCitasChanged?.();
    onCitaBooked?.();

    const nombreEnviado = servicioSel.nombre;
    const quedan = modoCarrito ? cartItems.length - 1 : 0;

    if (modoCarrito) {
      removeItem(servicioSel);
    }

    if (modoCarrito && quedan > 0) {
      setFechaHora(defaultNextSlot());
      Alert.alert(
        'Solicitud enviada',
        `${nombreEnviado} quedó pendiente. Te falta agendar ${quedan} servicio${quedan === 1 ? '' : 's'} más.`,
        [{ text: 'Continuar' }],
      );
      return;
    }

    if (modoCarrito) {
      clearCart();
    }

    const enviados = cartInicialRef.current || 1;
    Alert.alert(
      'Solicitud enviada',
      modoCarrito && enviados > 1
        ? `Se enviaron ${enviados} solicitudes al salón. Te confirmarán pronto.`
        : 'El salón verá tu cita en pendiente y te confirmará pronto.',
      [
        {
          text: 'OK',
          onPress: () => {
            onClose?.();
            onGoTab?.(modoCarrito ? 'historial' : 'citas');
          },
        },
      ],
    );
  }, [
    clienteRow?.id,
    servicioSel,
    fechaHora,
    onCitasChanged,
    onCitaBooked,
    onClose,
    onGoTab,
    modoCarrito,
    cartItems.length,
    removeItem,
    clearCart,
  ]);

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

  if (modoCarrito && cartTotal === 0) {
    return (
      <>
        <Text style={styles.hint}>No hay servicios en tu lista. Agregá algunos en Mis citas.</Text>
        <SalonButton variant="outlineGray" title="Volver" fullWidth onPress={onClose} />
      </>
    );
  }

  return (
    <>
      {modoCarrito && servicioSel ? (
        <View style={[subStyles.card, { marginBottom: spacing.md }]}>
          <Text style={subStyles.rowLabel}>
            Servicio {cartPaso} de {cartTotalFijo}
          </Text>
          <Text style={[styles.svcName, { marginTop: spacing.xs }]}>{servicioSel.nombre}</Text>
          <Text style={styles.svcMeta}>
            {formatServicioPrecio(servicioSel)} · {formatServicioDuracion(servicioSel)}
          </Text>
        </View>
      ) : soloServicioVinculado ? (
        loadingCat ? (
          <ActivityIndicator style={{ marginVertical: spacing.lg }} color={tc.primary} />
        ) : servicioSel ? (
          <View style={[subStyles.card, { marginBottom: spacing.md }]}>
            <Text style={styles.sectionTitle}>Servicio de la promoción</Text>
            <Text style={[styles.svcName, { marginTop: spacing.xs }]}>{servicioSel.nombre}</Text>
            <Text style={styles.svcMeta}>
              {formatServicioPrecio(servicioSel)} · {formatServicioDuracion(servicioSel)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.hint, { marginBottom: spacing.md }]}>
            No encontramos el servicio de la promoción en el catálogo. Pedí ayuda al salón.
          </Text>
        )
      ) : (
        <View>
          <Text style={styles.sectionTitle}>Servicios</Text>
          {mostrarListaServicios ? (
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre del servicio…"
              placeholderTextColor={tc.foregroundSubtle}
              value={busqueda}
              onChangeText={setBusqueda}
            />
          ) : null}
          {loadingCat ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} color={tc.primary} />
          ) : (
            <View style={{ marginTop: spacing.md, maxHeight: mostrarListaServicios ? 300 : undefined }}>
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
                      {s.precioVariable || !(Number(s.precio) > 0)
                        ? 'Precio variable · según volumen'
                        : `Q${Number(s.precio).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}{' '}
                      · {s.duracion_agenda?.trim() || `${Number(s.duracion_minutos) || 30} min`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

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
        title={
          saving
            ? 'Enviando…'
            : modoCarrito && cartTotalFijo > 1 && cartPaso < cartTotalFijo
              ? 'Solicitar y continuar'
              : 'Solicitar cita'
        }
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
