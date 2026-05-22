import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Modal,
  Switch,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, Clock, Minus, Plus, Stethoscope, UserPlus, X, Check } from 'lucide-react-native';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import DateTimePicker from '@react-native-community/datetimepicker';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';
import { db, supabase } from '@appsalon/shared-config';
import { offerEnviarCitaWhatsApp } from '../utils/citaWhatsApp';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

const MEDICAL_ITEMS = [
  { key: 'allergy', label: 'Alergias conocidas' },
  { key: 'pregnancy', label: 'Embarazo / lactancia' },
  { key: 'hypertension', label: 'Hipertensión' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'sensitiveSkin', label: 'Piel sensible' },
];
const REFERRAL_ITEMS = [
  { key: 'social', label: 'Redes sociales' },
  { key: 'recomendacion', label: 'Recomendación de un conocido' },
  { key: 'local', label: 'Pasé por el local / vitrina' },
  { key: 'google', label: 'Google u otro buscador' },
  { key: 'evento', label: 'Evento o promoción' },
  { key: 'cliente', label: 'Ya era cliente' },
];

function estadoLabel(est) {
  const v = String(est || 'pendiente').toLowerCase();
  if (v === 'pendiente') return 'Pendiente';
  if (v === 'confirmado') return 'Confirmada';
  if (v === 'rechazado') return 'Rechazada';
  if (v === 'completada') return 'Completada';
  if (v === 'cancelada') return 'Cancelada';
  return v;
}

function estadoPillBg(_c, est) {
  const v = String(est || 'pendiente').toLowerCase();
  if (v === 'confirmado') return '#2E7D32';
  if (v === 'rechazado') return '#C62828';
  if (v === 'completada') return '#5C6BC0';
  if (v === 'cancelada') return '#757575';
  return '#F9A825';
}

function estadoPillFg(_c, est) {
  const v = String(est || 'pendiente').toLowerCase();
  if (v === 'pendiente') return '#3E2E00';
  if (v === 'completada' || v === 'cancelada') return '#FFFFFF';
  return '#FFFFFF';
}

function maxQtyForCatalogRow(row) {
  if (row?.articuloTipo === 'servicio') return 99;
  const stock = Number(row?.stock_actual);
  return Number.isFinite(stock) && stock >= 0 ? Math.max(0, Math.floor(stock)) : 99;
}

function stockLabelForRow(row) {
  if (row?.articuloTipo === 'servicio') return 'Servicio · sin límite de stock';
  const n = Math.max(0, Math.floor(Number(row?.stock_actual) || 0));
  return n > 0 ? `Stock: ${n} u.` : 'Sin stock';
}

function formatCitaPrecio(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Agenda: formulario conectado a catálogo y guardado de citas.
 */
export function AppointmentsScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const [composerOpen, setComposerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedLines, setSelectedLines] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [medicalFlags, setMedicalFlags] = useState({
    allergy: false,
    pregnancy: false,
    hypertension: false,
    diabetes: false,
    sensitiveSkin: false,
  });
  const [referralFlags, setReferralFlags] = useState({
    social: false,
    recomendacion: false,
    local: false,
    google: false,
    evento: false,
    cliente: false,
  });

  const [catalogClientes, setCatalogClientes] = useState([]);
  const [catalogServicios, setCatalogServicios] = useState([]);
  const [catalogEmpleados, setCatalogEmpleados] = useState([]);

  const [agendaFiltersOpen, setAgendaFiltersOpen] = useState(false);
  const [agendaSort, setAgendaSort] = useState('fecha_desc');
  const [agendaEstado, setAgendaEstado] = useState('todos');

  const [citas, setCitas] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const sel = useListSelection();
  const [citasLoading, setCitasLoading] = useState(true);
  const [citasError, setCitasError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [detailCita, setDetailCita] = useState(null);

  const styles = useMemo(() => createStyles(c), [c]);

  const loadCitas = useCallback(async () => {
    setCitasError(null);
    const { data, error } = await db.citas.getAll();
    if (error) {
      setCitas([]);
      setCitasError(error.message || 'No se pudieron cargar las citas.');
      return;
    }
    setCitas(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let alive = true;
    setCitasLoading(true);
    void loadCitas().finally(() => {
      if (alive) setCitasLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [loadCitas]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-agenda-citas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas' },
        () => {
          void loadCitas();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCitas]);

  const loadCatalogServicios = useCallback(async (query = '') => {
    const { data, error } = await db.servicios.listForAgenda(query, 500);
    if (Array.isArray(data)) {
      setCatalogServicios(data);
    }
    return { data, error };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cRes, sRes, eRes] = await Promise.all([
        db.clientes.getAll(),
        db.servicios.listForAgenda('', 500),
        db.empleados.getAll(),
      ]);
      if (cancelled) return;
      setCatalogClientes(!cRes.error && Array.isArray(cRes.data) ? cRes.data : []);
      setCatalogServicios(Array.isArray(sRes.data) ? sRes.data : []);
      setCatalogEmpleados(!eRes.error && Array.isArray(eRes.data) ? eRes.data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (composerOpen) {
      void loadCatalogServicios();
    }
  }, [composerOpen, loadCatalogServicios]);

  const agendaFiltroResumen = useMemo(() => {
    const sortLabels = { fecha_asc: 'Fecha (próximas primero)', fecha_desc: 'Fecha (más recientes)', nombre: 'Por nombre A → Z' };
    const estLabels = {
      todos: 'Todos los estados',
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      rechazado: 'Rechazado',
    };
    return `${sortLabels[agendaSort] || agendaSort} · ${estLabels[agendaEstado] || agendaEstado}`;
  }, [agendaSort, agendaEstado]);

  const citasFiltradas = useMemo(() => {
    let rows = [...citas];
    if (agendaEstado !== 'todos') {
      rows = rows.filter((r) => String(r.estado || 'pendiente').toLowerCase() === agendaEstado);
    }
    rows.sort((a, b) => {
      if (agendaSort === 'nombre') {
        const na = (a.cliente?.nombre || a.servicio || '').toLocaleLowerCase();
        const nb = (b.cliente?.nombre || b.servicio || '').toLocaleLowerCase();
        return na.localeCompare(nb, 'es');
      }
      const ta = new Date(a.fecha_hora).getTime();
      const tb = new Date(b.fecha_hora).getTime();
      return agendaSort === 'fecha_asc' ? ta - tb : tb - ta;
    });
    return rows;
  }, [citas, agendaEstado, agendaSort]);

  const clientMatches = useMemo(() => {
    if (selectedClient) return [];
    const q = clientQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return catalogClientes.filter(
      (cl) =>
        String(cl.nombre || '')
          .toLowerCase()
          .includes(q) ||
        String(cl.telefono || '')
          .replace(/\s/g, '')
          .includes(q) ||
        String(cl.email || '')
          .toLowerCase()
          .includes(q),
    ).slice(0, 6);
  }, [clientQuery, selectedClient, catalogClientes]);

  const selectedLineIds = useMemo(() => new Set(selectedLines.map((l) => l.id)), [selectedLines]);

  const serviceMatches = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    return catalogServicios
      .filter((s) => !selectedLineIds.has(s.id))
      .filter((s) => {
        const blob = [s.nombre, s.categoria, s.barcode, s.articuloTipo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return words.every((w) => blob.includes(w));
      })
      .slice(0, 12);
  }, [serviceSearch, catalogServicios, selectedLineIds]);

  useEffect(() => {
    if (!composerOpen) return undefined;
    const q = serviceSearch.trim();
    if (q.length === 0) {
      void loadCatalogServicios('');
      return undefined;
    }
    if (q.length < 2) return undefined;
    const t = setTimeout(() => {
      void loadCatalogServicios(q);
    }, 280);
    return () => clearTimeout(t);
  }, [composerOpen, serviceSearch, loadCatalogServicios]);

  const addCatalogItem = (row) => {
    const max = maxQtyForCatalogRow(row);
    if (row.articuloTipo !== 'servicio' && max < 1) {
      Alert.alert('Sin stock', `No hay unidades disponibles de «${row.nombre}».`);
      return;
    }
    setSelectedLines((prev) => {
      const idx = prev.findIndex((l) => l.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: Math.min(max, next[idx].qty + 1) };
        return next;
      }
      return [...prev, { ...row, qty: 1 }];
    });
    setServiceSearch('');
  };

  const changeLineQty = (id, delta) => {
    setSelectedLines((prev) =>
      prev
        .map((l) => {
          if (l.id !== id) return l;
          const max = maxQtyForCatalogRow(l);
          return { ...l, qty: Math.min(max, Math.max(1, l.qty + delta)) };
        })
        .filter((l) => l.qty > 0),
    );
  };

  const removeLine = (id) => {
    setSelectedLines((prev) => prev.filter((l) => l.id !== id));
  };

  const selectedEmployee = useMemo(
    () => catalogEmpleados.find((e) => e.id === employeeId) ?? null,
    [catalogEmpleados, employeeId],
  );

  const staffFiltered = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return catalogEmpleados.filter((e) => {
      const n = String(e.nombre || '').toLowerCase();
      const r = String(e.rol || '').toLowerCase();
      const mail = String(e.email || '').toLowerCase();
      return n.includes(q) || r.includes(q) || mail.includes(q);
    });
  }, [staffSearch, catalogEmpleados]);

  const resetComposer = () => {
    setComposerOpen(false);
    setClientQuery('');
    setSelectedClient(null);
    setServiceSearch('');
    setSelectedLines([]);
    setEmployeeId(null);
    setStaffSearch('');
    setDiscount('');
    setNote('');
    setMedicalFlags({
      allergy: false,
      pregnancy: false,
      hypertension: false,
      diabetes: false,
      sensitiveSkin: false,
    });
    setReferralFlags({
      social: false,
      recomendacion: false,
      local: false,
      google: false,
      evento: false,
      cliente: false,
    });
    const now = new Date();
    setAppointmentDate(now);
    setAppointmentTime(now);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const selectClient = (row) => {
    setSelectedClient(row);
    setClientQuery('');
  };

  const clearSelectedClient = () => {
    setSelectedClient(null);
    setClientQuery('');
  };

  const toggleMedical = (key) => {
    setMedicalFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleReferral = (key) => {
    setReferralFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const basePrice = useMemo(
    () => selectedLines.reduce((sum, l) => sum + (Number(l.precio) || 0) * l.qty, 0),
    [selectedLines],
  );
  const discountPctRaw = Number(String(discount || '').replace(',', '.'));
  const discountPct = Number.isFinite(discountPctRaw)
    ? Math.min(100, Math.max(0, discountPctRaw))
    : 0;
  const finalPrice = Math.max(Math.round(basePrice * (1 - discountPct / 100) * 100) / 100, 0);
  const totalDuration = useMemo(() => {
    const mins = selectedLines.reduce((sum, l) => {
      if (l.articuloTipo !== 'servicio') return sum;
      return sum + (Number(l.duracion_minutos) || 60) * l.qty;
    }, 0);
    return mins > 0 ? mins : 30;
  }, [selectedLines]);

  const solicitarActualizacionEstado = async (id, estado) => {
    setUpdatingId(id);
    const { error } = await db.citas.updateEstado(id, estado);
    setUpdatingId(null);
    if (error) {
      Alert.alert('No se pudo actualizar', error.message || 'Intentá de nuevo.');
      return false;
    }
    await loadCitas();
    return true;
  };

  const enviarWhatsAppCita = (cita, estado = 'pendiente') => {
    if (!cita?.cliente?.telefono && !cita?.cliente_id) return;
    void offerEnviarCitaWhatsApp({
      telefono: cita.cliente?.telefono,
      clienteNombre: cita.cliente?.nombre,
      servicio: cita.servicio,
      fechaHora: cita.fecha_hora,
      profesionalNombre: cita.empleado?.nombre,
      precio: cita.precio,
      estado,
    });
  };

  const confirmarCita = (citaOrId) => {
    const cita =
      typeof citaOrId === 'object' && citaOrId?.id
        ? citaOrId
        : citas.find((c) => c.id === citaOrId) || (detailCita?.id === citaOrId ? detailCita : null);
    const id = cita?.id ?? citaOrId;
    void solicitarActualizacionEstado(id, 'confirmado').then((ok) => {
      if (!ok) return;
      setDetailCita((prev) => (prev?.id === id ? { ...prev, estado: 'confirmado' } : prev));
      if (cita) enviarWhatsAppCita({ ...cita, estado: 'confirmado' }, 'confirmado');
    });
  };

  const rechazarCita = (id) => {
    Alert.alert('Rechazar cita', '¿Marcar esta reserva como rechazada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: () =>
          void solicitarActualizacionEstado(id, 'rechazado').then(() => {
            setDetailCita((prev) => (prev?.id === id ? { ...prev, estado: 'rechazado' } : prev));
          }),
      },
    ]);
  };

  const handleSaveAppointment = async () => {
    if (!selectedLines.length) {
      Alert.alert('Producto o servicio', 'Agregá al menos un ítem del inventario.');
      return;
    }
    if (!selectedClient?.id) {
      Alert.alert('Cliente', 'Buscá y seleccioná un cliente de la lista.');
      return;
    }
    const dt = new Date(appointmentDate);
    dt.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), appointmentTime.getSeconds(), appointmentTime.getMilliseconds());
    const fecha_hora = dt.toISOString();

    const notasParts = [];
    if (note.trim()) notasParts.push(note.trim());
    const med = MEDICAL_ITEMS.filter((i) => medicalFlags[i.key]).map((i) => i.label);
    if (med.length) notasParts.push(`Salud: ${med.join(', ')}`);
    const ref = REFERRAL_ITEMS.filter((i) => referralFlags[i.key]).map((i) => i.label);
    if (ref.length) notasParts.push(`Origen: ${ref.join(', ')}`);
    const notas_servicio = notasParts.length ? notasParts.join(' · ') : null;

    const itemsDesc = selectedLines
      .map((l) => `${l.nombre}${l.qty > 1 ? ` x${l.qty}` : ''}`)
      .join(' · ');
    if (selectedLines.length > 1 || selectedLines.some((l) => l.qty > 1)) {
      notasParts.push(`Ítems: ${itemsDesc}`);
    }

    const { error } = await db.citas.create({
      cliente_id: selectedClient?.id ?? null,
      servicio: itemsDesc,
      precio: finalPrice,
      duracion_minutos: totalDuration,
      fecha_hora,
      estado: 'pendiente',
      notas_servicio,
      empleado_id: employeeId,
    });
    if (error) {
      Alert.alert('No se pudo guardar', error.message || 'Revisá la conexión e intentá de nuevo.');
      return;
    }
    await loadCitas();
    await offerEnviarCitaWhatsApp({
      telefono: selectedClient.telefono,
      clienteNombre: selectedClient.nombre,
      servicio: itemsDesc,
      fechaHora: dt,
      profesionalNombre: selectedEmployee?.nombre,
      precio: finalPrice,
      estado: 'pendiente',
    });
    Alert.alert('Cita registrada', 'La cita quedó guardada en la agenda como pendiente.');
    resetComposer();
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    let alive = true;
    const syncBars = async () => {
      try {
        await SystemUI.setBackgroundColorAsync(c.background);
        if (alive) {
          NavigationBar.setStyle(isDark ? 'dark' : 'light');
        }
      } catch {
        /* ignore */
      }
    };
    void syncBars();
    return () => {
      alive = false;
    };
  }, [composerOpen, c.background, isDark]);

  const onRefreshCitas = useCallback(async () => {
    setRefreshing(true);
    await loadCitas();
    setRefreshing(false);
  }, [loadCitas]);

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar citas',
      `¿Eliminar ${sel.count} cita(s)? Copia en Basurero antes del borrado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            let ok = 0;
            const errs = [];
            for (const id of sel.selectedIds) {
              const row = citas.find((x) => String(x.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('citas', row, () => db.citas.delete(row.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await loadCitas();
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminadas: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Cita eliminada.' : `Se eliminaron ${ok} citas.`);
          },
        },
      ],
    );
  };

  const addPersonIconColor = isDark ? '#141414' : c.foreground;

  const rightAction = (
    <TouchableOpacity
      style={[styles.addPersonCircle, isDark && styles.addPersonCircleDark]}
      onPress={() => setComposerOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Nueva cita"
      activeOpacity={0.85}
    >
      <UserPlus size={22} color={addPersonIconColor} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  const modalContentPadBottom = insets.bottom + spacing.xl + spacing.md;

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={c.background} />
      <SubScreenChrome onBack={onBack} disableBodyScroll rightAction={rightAction}>
        <View style={styles.listShell}>
          <View style={styles.agendaToolbar}>
            <Text style={styles.agendaToolbarMeta}>Citas del salón</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              <Text style={{ color: c.foregroundSubtle, fontSize: 13 }}> · </Text>
              <TouchableOpacity hitSlop={12} onPress={() => setAgendaFiltersOpen(true)}>
                <Text style={styles.agendaToolbarLink}>Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[subStyles.muted, styles.agendaFilterHint]} numberOfLines={2}>
            {agendaFiltroResumen}. Deslizá hacia abajo para actualizar.
          </Text>

          {citasError ? (
            <View style={styles.listErrorBox}>
              <Text style={[subStyles.muted, styles.listPlaceholderTxt]}>{citasError}</Text>
              <SalonButton title="Reintentar" variant="outlineGray" fullWidth onPress={() => void loadCitas()} />
            </View>
          ) : citasLoading && citas.length === 0 ? (
            <View style={styles.listPlaceholder}>
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={[subStyles.muted, styles.listPlaceholderTxt]}>Cargando citas…</Text>
            </View>
          ) : (
            <FlatList
              data={citasFiltradas}
              keyExtractor={(item) => String(item.id)}
              style={styles.agendaList}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshCitas} tintColor={c.primary} />}
              ListEmptyComponent={
                <View style={styles.listPlaceholder}>
                  <Calendar size={48} color={c.foregroundSubtle} strokeWidth={1.5} />
                  <Text style={[subStyles.muted, styles.listPlaceholderTxt]}>
                    No hay citas con estos filtros. Las solicitudes desde la app clientes aparecen aquí en pendiente.
                  </Text>
                </View>
              }
              contentContainerStyle={[
                styles.agendaListContent,
                sel.count > 0 && { paddingBottom: 100 },
              ]}
              renderItem={({ item }) => {
                const est = String(item.estado || 'pendiente').toLowerCase();
                const pendiente = est === 'pendiente' && !sel.active;
                const clienteNombre = item.cliente?.nombre || 'Sin ficha de cliente';
                const busy = updatingId === item.id;
                const picked = sel.isSelected(item.id);
                return (
                  <View
                    style={[
                      styles.citaCard,
                      { borderColor: picked ? c.primary : c.cardBorder, backgroundColor: picked ? c.surfaceMuted : c.card },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (sel.active) sel.toggleId(item.id);
                        else setDetailCita(item);
                      }}
                      onLongPress={() => {
                        if (!sel.active) sel.setActive(true);
                        sel.toggleId(item.id);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={sel.active ? `Seleccionar cita ${item.servicio}` : `Ver detalle de cita ${item.servicio}`}
                    >
                      {sel.active ? (
                        <View
                          style={[
                            styles.citaCheck,
                            {
                              borderColor: picked ? c.primary : c.cardBorder,
                              backgroundColor: picked ? c.primary : 'transparent',
                            },
                          ]}
                        >
                          {picked ? <Check size={14} color={isDark ? '#141414' : '#fff'} strokeWidth={3} /> : null}
                        </View>
                      ) : null}
                      <View style={styles.citaCardTop}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.citaServicio, { color: c.foreground }]} numberOfLines={2}>
                            {item.servicio}
                          </Text>
                          <Text style={[styles.citaCliente, { color: c.foregroundMuted }]} numberOfLines={1}>
                            {clienteNombre}
                          </Text>
                          <Text style={[styles.citaWhen, { color: c.foregroundSubtle }]}>
                            {new Date(item.fecha_hora).toLocaleString('es-GT', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {item.empleado?.nombre ? ` · ${item.empleado.nombre}` : ''}
                          </Text>
                        </View>
                        <View style={[styles.estadoPill, { backgroundColor: estadoPillBg(c, est) }]}>
                          <Text style={[styles.estadoPillTxt, { color: estadoPillFg(c, est) }]}>
                            {estadoLabel(est)}
                          </Text>
                        </View>
                      </View>
                      {item.notas_servicio ? (
                        <Text style={[styles.citaNotas, { color: c.foregroundMuted }]} numberOfLines={2}>
                          {item.notas_servicio}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    {pendiente ? (
                      <View style={styles.citaActions}>
                        <TouchableOpacity
                          style={[styles.citaActBtn, styles.citaActBtnConfirm, { opacity: busy ? 0.5 : 1 }]}
                          disabled={busy}
                          onPress={() => confirmarCita(item)}
                        >
                          <Text style={[styles.citaActBtnTxt, styles.citaActBtnTxtFilled]}>Confirmar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.citaActBtn, styles.citaActBtnReject, { opacity: busy ? 0.5 : 1 }]}
                          disabled={busy}
                          onPress={() => rechazarCita(item.id)}
                        >
                          <Text style={[styles.citaActBtnTxt, styles.citaActBtnTxtFilled]}>Rechazar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          )}
        </View>
        {sel.active && sel.count > 0 ? (
          <ListSelectionActionBar
            count={sel.count}
            onCancel={sel.exitSelectMode}
            onConfirm={confirmDeleteSelected}
            confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar'}
            confirmTextStyle={{ color: c.error }}
            confirmStyle={{ borderColor: c.error }}
            colors={c}
            bottomInset={insets.bottom}
          />
        ) : null}
      </SubScreenChrome>

      <Modal visible={agendaFiltersOpen} animationType="slide" transparent onRequestClose={() => setAgendaFiltersOpen(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background }]}>
            <View style={styles.filterHead}>
              <Text style={styles.filterTitle}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setAgendaFiltersOpen(false)} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.filterSectionLbl}>Orden</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'fecha_asc', label: 'Fecha ↑' },
                { id: 'fecha_desc', label: 'Fecha ↓' },
                { id: 'nombre', label: 'Nombre A → Z' },
              ].map((opt) => {
                const on = agendaSort === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setAgendaSort(opt.id)}
                  >
                    <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.filterSectionLbl}>Estado</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'pendiente', label: 'Pendiente' },
                { id: 'confirmado', label: 'Confirmado' },
                { id: 'rechazado', label: 'Rechazado' },
              ].map((opt) => {
                const on = agendaEstado === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setAgendaEstado(opt.id)}
                  >
                    <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setAgendaFiltersOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailCita} animationType="slide" transparent onRequestClose={() => setDetailCita(null)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.detailSheet, { backgroundColor: c.background }]}>
            {detailCita ? (
              <>
                <View style={styles.filterHead}>
                  <Text style={styles.filterTitle}>Detalle de cita</Text>
                  <TouchableOpacity onPress={() => setDetailCita(null)} hitSlop={12} accessibilityLabel="Cerrar">
                    <X size={22} color={c.foregroundMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                  <View style={styles.detailEstadoRow}>
                    <View
                      style={[
                        styles.estadoPill,
                        styles.estadoPillDetail,
                        { backgroundColor: estadoPillBg(c, detailCita.estado) },
                      ]}
                    >
                      <Text style={[styles.estadoPillTxt, { color: estadoPillFg(c, detailCita.estado) }]}>
                        {estadoLabel(detailCita.estado)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailServicio}>{detailCita.servicio}</Text>
                  {[
                    {
                      label: 'Cliente',
                      value:
                        detailCita.cliente?.nombre ||
                        (detailCita.notas_servicio?.includes('Contacto:')
                          ? detailCita.notas_servicio.split('Contacto:')[1]?.split('·')[0]?.trim()
                          : null) ||
                        'Sin ficha de cliente',
                    },
                    {
                      label: 'Teléfono',
                      value:
                        detailCita.cliente?.telefono ||
                        (() => {
                          const m = String(detailCita.notas_servicio || '').match(/Tel:\s*(\+?\d+)/);
                          return m ? m[1] : '—';
                        })(),
                    },
                    {
                      label: 'Fecha y hora',
                      value: new Date(detailCita.fecha_hora).toLocaleString('es-GT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    },
                    { label: 'Profesional', value: detailCita.empleado?.nombre || 'Sin asignar' },
                    { label: 'Precio', value: formatCitaPrecio(detailCita.precio) },
                    {
                      label: 'Duración',
                      value: detailCita.duracion_minutos
                        ? `${detailCita.duracion_minutos} min`
                        : '—',
                    },
                  ].map((row) => (
                    <View key={row.label} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{row.label}</Text>
                      <Text style={styles.detailValue}>{row.value}</Text>
                    </View>
                  ))}
                  {detailCita.notas_servicio ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notas</Text>
                      <Text style={styles.detailValueMultiline}>{detailCita.notas_servicio}</Text>
                    </View>
                  ) : null}
                </ScrollView>
                {detailCita.cliente?.telefono ? (
                  <SalonButton
                    title="Enviar confirmación por WhatsApp"
                    variant="outlineGray"
                    fullWidth
                    onPress={() =>
                      enviarWhatsAppCita(
                        detailCita,
                        String(detailCita.estado || 'pendiente').toLowerCase() === 'confirmado'
                          ? 'confirmado'
                          : 'pendiente',
                      )
                    }
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}
                {String(detailCita.estado || 'pendiente').toLowerCase() === 'pendiente' ? (
                  <View style={[styles.citaActions, { marginTop: spacing.md }]}>
                    <TouchableOpacity
                      style={[styles.citaActBtn, styles.citaActBtnConfirm]}
                      onPress={() => confirmarCita(detailCita)}
                    >
                      <Text style={[styles.citaActBtnTxt, styles.citaActBtnTxtFilled]}>Confirmar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.citaActBtn, styles.citaActBtnReject]}
                      onPress={() => rechazarCita(detailCita.id)}
                    >
                      <Text style={[styles.citaActBtnTxt, styles.citaActBtnTxtFilled]}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <SalonButton
                  title="Cerrar"
                  variant="outlineGray"
                  fullWidth
                  onPress={() => setDetailCita(null)}
                  style={{ marginTop: spacing.md }}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={composerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={resetComposer}
      >
        <View style={[styles.modalRoot, { backgroundColor: c.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={c.background} />
          <View
            style={[
              styles.composerTopBar,
              {
                paddingTop: insets.top + spacing.sm,
                borderBottomColor: c.cardBorder,
                backgroundColor: c.background,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.composerBackRow}
              onPress={resetComposer}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <ChevronLeft size={24} color={c.foreground} strokeWidth={2} />
              <Text style={[styles.composerBackTxt, { color: c.foreground }]}>Volver</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: modalContentPadBottom,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.formTitle}>Nueva cita</Text>
              <Text style={subStyles.muted}>
                Completá los datos y guardá; clientes, inventario (productos/servicios) y equipo salen de la base de datos.
              </Text>

              <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Cliente (buscar existente)</Text>
              {selectedClient ? (
                <View style={[styles.clientInfoCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                  <Text style={styles.suggestionName}>{selectedClient.nombre || 'Cliente'}</Text>
                  {selectedClient.telefono ? (
                    <Text style={[subStyles.muted, { marginTop: 4 }]}>Tel. {selectedClient.telefono}</Text>
                  ) : null}
                  {selectedClient.email ? (
                    <Text style={[subStyles.muted, { marginTop: 2 }]}>{selectedClient.email}</Text>
                  ) : null}
                  {selectedClient.direccion ? (
                    <Text style={[subStyles.muted, { marginTop: 2 }]}>{selectedClient.direccion}</Text>
                  ) : null}
                  {selectedClient.categoria ? (
                    <Text style={[subStyles.muted, { marginTop: 2 }]}>Tipo: {selectedClient.categoria}</Text>
                  ) : null}
                  <TouchableOpacity onPress={clearSelectedClient} style={[styles.inlineBtn, { marginTop: spacing.sm }]}>
                    <Text style={styles.inlineBtnTxt}>Cambiar cliente</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Buscar por nombre, teléfono o correo"
                    placeholderTextColor={c.foregroundSubtle}
                    value={clientQuery}
                    onChangeText={setClientQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {clientQuery.trim().length > 0 && clientQuery.trim().length < 2 ? (
                    <Text style={subStyles.muted}>Escribí al menos 2 letras para buscar entre los clientes.</Text>
                  ) : null}
                  {clientQuery.trim().length >= 2 && clientMatches.length === 0 ? (
                    <Text style={subStyles.muted}>Sin coincidencias para «{clientQuery.trim()}».</Text>
                  ) : null}
                  {clientMatches.length > 0 ? (
                    <View style={styles.suggestions}>
                      {clientMatches.map((row) => (
                        <TouchableOpacity
                          key={row.id}
                          style={styles.suggestionRow}
                          onPress={() => selectClient(row)}
                        >
                          <Text style={styles.suggestionName}>{row.nombre}</Text>
                          <Text style={subStyles.muted}>
                            {[row.telefono, row.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </>
              )}

              <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>Producto o servicio (inventario)</Text>
              <TextInput
                style={styles.input}
                placeholder="Escribí para buscar por nombre, marca o SKU…"
                placeholderTextColor={c.foregroundSubtle}
                value={serviceSearch}
                onChangeText={setServiceSearch}
                autoCorrect={false}
              />
              {!serviceSearch.trim() && selectedLines.length === 0 ? (
                <Text style={subStyles.muted}>Escribí al menos una palabra para ver sugerencias del inventario.</Text>
              ) : null}
              {serviceSearch.trim() && serviceMatches.length === 0 ? (
                <Text style={subStyles.muted}>No hay productos ni servicios que coincidan.</Text>
              ) : null}
              {serviceMatches.length > 0 ? (
                <View style={styles.suggestions}>
                  {serviceMatches.map((row) => {
                    const p = Number(row.precio);
                    const precioTxt = Number.isFinite(p)
                      ? `Q${p.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                      : '';
                    const tipoLabel = row.articuloTipo === 'servicio' ? 'Servicio' : 'Producto';
                    const outOfStock = row.articuloTipo !== 'servicio' && maxQtyForCatalogRow(row) < 1;
                    return (
                      <TouchableOpacity
                        key={row.id}
                        style={[styles.suggestionRow, outOfStock && styles.suggestionRowDisabled]}
                        onPress={() => addCatalogItem(row)}
                        disabled={outOfStock}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionName}>{row.nombre}</Text>
                          <Text style={subStyles.muted}>
                            {tipoLabel}
                            {row.categoria ? ` · ${row.categoria}` : ''}
                            {precioTxt ? ` · ${precioTxt}` : ''}
                          </Text>
                          <Text style={[subStyles.muted, { marginTop: 2 }]}>{stockLabelForRow(row)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {selectedLines.length > 0 ? (
                <View style={styles.selectedLinesWrap}>
                  <Text style={[styles.formLabel, { marginBottom: spacing.sm }]}>Agregados a la cita</Text>
                  {selectedLines.map((line) => {
                    const p = Number(line.precio);
                    const precioTxt = Number.isFinite(p)
                      ? `Q${(p * line.qty).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                      : '';
                    const max = maxQtyForCatalogRow(line);
                    const tipoLabel = line.articuloTipo === 'servicio' ? 'Servicio' : 'Producto';
                    return (
                      <View
                        key={line.id}
                        style={[styles.selectedLineRow, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.suggestionName}>{line.nombre}</Text>
                          <Text style={subStyles.muted}>
                            {tipoLabel}
                            {line.categoria ? ` · ${line.categoria}` : ''}
                            {precioTxt ? ` · ${precioTxt}` : ''}
                          </Text>
                          <Text style={[subStyles.muted, { marginTop: 2 }]}>{stockLabelForRow(line)}</Text>
                        </View>
                        <View style={styles.qtyRow}>
                          <TouchableOpacity
                            style={[styles.qtyBtn, { borderColor: c.cardBorder }]}
                            onPress={() => changeLineQty(line.id, -1)}
                            accessibilityLabel="Menos cantidad"
                          >
                            <Minus size={16} color={c.foreground} strokeWidth={2} />
                          </TouchableOpacity>
                          <Text style={styles.qtyTxt}>{line.qty}</Text>
                          <TouchableOpacity
                            style={[
                              styles.qtyBtn,
                              { borderColor: c.cardBorder },
                              line.qty >= max && styles.qtyBtnDisabled,
                            ]}
                            onPress={() => changeLineQty(line.id, 1)}
                            disabled={line.qty >= max}
                            accessibilityLabel="Más cantidad"
                          >
                            <Plus size={16} color={line.qty >= max ? c.foregroundSubtle : c.primary} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => removeLine(line.id)} hitSlop={8} style={styles.removeLineBtn}>
                          <X size={18} color={c.foregroundMuted} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={[styles.medicalHead, { marginTop: spacing.lg }]}>
                <Stethoscope size={18} color={c.primary} strokeWidth={1.9} />
                <Text style={styles.formTitle}>Historial médico</Text>
              </View>
              <Text style={subStyles.muted}>Usa el interruptor de cada fila para marcar antecedentes.</Text>
              {MEDICAL_ITEMS.map((item) => {
                const on = Boolean(medicalFlags[item.key]);
                return (
                  <View key={item.key} style={styles.medicalRow}>
                    <Text style={styles.medicalTxt}>{item.label}</Text>
                    <Switch
                      value={on}
                      onValueChange={() => toggleMedical(item.key)}
                      trackColor={{ false: c.cardBorder, true: c.primary }}
                      thumbColor={Platform.OS === 'android' ? (on ? c.heroCtaText : '#f4f3f4') : undefined}
                      ios_backgroundColor={c.cardBorder}
                      accessibilityLabel={item.label}
                    />
                  </View>
                );
              })}

              <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>Fecha de cita</Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.selectTxt}>{appointmentDate.toLocaleDateString('es-GT')}</Text>
                <Calendar size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
              </TouchableOpacity>
              {showDatePicker ? (
                <DateTimePicker
                  mode="date"
                  value={appointmentDate}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                    if (date) setAppointmentDate(date);
                  }}
                />
              ) : null}

              <Text style={styles.formLabel}>Horario</Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.selectTxt}>
                  {appointmentTime.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Clock size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
              </TouchableOpacity>
              {showTimePicker ? (
                <DateTimePicker
                  mode="time"
                  value={appointmentTime}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowTimePicker(false);
                    if (date) setAppointmentTime(date);
                  }}
                />
              ) : null}

              <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>Asignar profesional</Text>
              {selectedEmployee && staffSearch.trim().length < 2 ? (
                <View style={[styles.clientInfoCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                  <Text style={styles.suggestionName}>{selectedEmployee.nombre}</Text>
                  <Text style={[subStyles.muted, { marginTop: 4 }]}>
                    {[selectedEmployee.rol, selectedEmployee.telefono, selectedEmployee.email]
                      .filter(Boolean)
                      .join(' · ') || 'Profesional'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEmployeeId(null);
                      setStaffSearch('');
                    }}
                    style={[styles.inlineBtn, { marginTop: spacing.sm }]}
                  >
                    <Text style={styles.inlineBtnTxt}>Cambiar profesional</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Buscar por nombre, rol o correo"
                    placeholderTextColor={c.foregroundSubtle}
                    value={staffSearch}
                    onChangeText={(v) => {
                      setStaffSearch(v);
                      if (employeeId) setEmployeeId(null);
                    }}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {staffSearch.trim().length > 0 && staffSearch.trim().length < 2 ? (
                    <Text style={subStyles.muted}>Escribí al menos 2 letras para buscar en el equipo.</Text>
                  ) : null}
                  {staffSearch.trim().length >= 2 && staffFiltered.length === 0 ? (
                    <Text style={subStyles.muted}>No hay coincidencias con la búsqueda.</Text>
                  ) : null}
                  {staffFiltered.length > 0 ? (
                    <View style={styles.staffList}>
                      {staffFiltered.map((emp) => {
                        const on = emp.id === employeeId;
                        return (
                          <TouchableOpacity
                            key={emp.id}
                            style={[styles.staffChip, on && styles.staffChipOn]}
                            onPress={() => {
                              setEmployeeId(emp.id);
                              setStaffSearch('');
                            }}
                          >
                            <Text style={[styles.staffName, on && styles.staffNameOn]}>{emp.nombre}</Text>
                            <Text style={[styles.staffRol, on && styles.staffNameOn]}>{emp.rol || 'Profesional'}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              )}

              <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>Descuento manual (opcional)</Text>
              <View style={styles.discountRow}>
                <TextInput
                  style={[styles.input, styles.discountInput]}
                  placeholder="0"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={discount}
                  onChangeText={(v) =>
                    setDiscount(
                      v
                        .replace(/,/g, '.')
                        .replace(/[^\d.]/g, '')
                        .replace(/(\..*)\./g, '$1'),
                    )
                  }
                />
                <View style={styles.percentBox}>
                  <Text style={styles.percentBoxTxt}>%</Text>
                </View>
              </View>
              <Text style={subStyles.muted}>
                Precio lista: Q{basePrice} · Descuento: {discountPct}% · Precio final: Q{finalPrice}
              </Text>
              <Text style={[styles.formLabel, { marginTop: spacing.md }]}>¿Cómo supo de nosotros?</Text>
              <Text style={subStyles.muted}>
                Redes sociales, recomendación, búsqueda en internet, etc. Marcá lo que corresponda.
              </Text>
              {REFERRAL_ITEMS.map((item) => {
                const on = Boolean(referralFlags[item.key]);
                return (
                  <View key={item.key} style={styles.medicalRow}>
                    <Text style={styles.medicalTxt}>{item.label}</Text>
                    <Switch
                      value={on}
                      onValueChange={() => toggleReferral(item.key)}
                      trackColor={{ false: c.cardBorder, true: c.primary }}
                      thumbColor={Platform.OS === 'android' ? (on ? c.heroCtaText : '#f4f3f4') : undefined}
                      ios_backgroundColor={c.cardBorder}
                      accessibilityLabel={item.label}
                    />
                  </View>
                );
              })}
              <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Nota u observaciones</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder="Ej. preferencia de horario, productos sensibles, detalle del canal si marcás «Otro»…"
                placeholderTextColor={c.foregroundSubtle}
                multiline
                value={note}
                onChangeText={setNote}
              />

              <View style={styles.formActions}>
                <SalonButton
                  title="Cancelar"
                  variant="outlineGray"
                  fullWidth
                  onPress={resetComposer}
                />
                <SalonButton
                  title="Guardar cita"
                  variant="heroGold"
                  fullWidth
                  onPress={handleSaveAppointment}
                />
              </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: {
      flex: 1,
    },
    emptyBody: {
      flex: 1,
    },
    listShell: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    agendaToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    agendaToolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    agendaToolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.primary,
    },
    agendaFilterHint: {
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
      marginTop: -spacing.xs,
    },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
    },
    filterHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    filterTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
    },
    filterSectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    filterChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    listPlaceholder: {
      flex: 1,
      minHeight: 200,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    listErrorBox: {
      flex: 1,
      minHeight: 160,
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.md,
    },
    agendaList: {
      flex: 1,
    },
    agendaListContent: {
      paddingBottom: spacing.xl,
      flexGrow: 1,
    },
    citaCard: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
      marginBottom: spacing.sm,
      position: 'relative',
    },
    citaCheck: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    citaCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    citaServicio: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
    citaCliente: {
      marginTop: 2,
      fontFamily: typography.fontSans,
      fontSize: 14,
    },
    citaWhen: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 12,
    },
    estadoPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
      maxWidth: 110,
    },
    estadoPillTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      textAlign: 'center',
    },
    citaNotas: {
      marginTop: spacing.sm,
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    citaActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    citaActBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    citaActBtnConfirm: {
      backgroundColor: '#2E7D32',
    },
    citaActBtnReject: {
      backgroundColor: '#C62828',
    },
    citaActBtnTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    citaActBtnTxtFilled: {
      color: '#FFFFFF',
    },
    detailSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      maxHeight: '88%',
    },
    detailScroll: {
      paddingBottom: spacing.sm,
    },
    detailEstadoRow: {
      marginBottom: spacing.sm,
    },
    estadoPillDetail: {
      alignSelf: 'flex-start',
      maxWidth: undefined,
    },
    detailServicio: {
      fontFamily: typography.fontSansMedium,
      fontSize: 18,
      color: c.foreground,
      marginBottom: spacing.md,
    },
    detailRow: {
      marginBottom: spacing.md,
    },
    detailLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      color: c.foregroundMuted,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    detailValue: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
      lineHeight: 22,
    },
    detailValueMultiline: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foreground,
      lineHeight: 21,
    },
    listPlaceholderTxt: {
      textAlign: 'center',
      maxWidth: 280,
    },
    addPersonCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    addPersonCircleDark: {
      borderColor: 'rgba(255,255,255,0.35)',
    },
    modalRoot: {
      flex: 1,
    },
    composerTopBar: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    composerBackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    composerBackTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginLeft: -2,
    },
    modalScroll: {
      flex: 1,
    },
    formTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    formLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      minHeight: 46,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      color: c.foreground,
      fontFamily: typography.fontSans,
      fontSize: 14,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    noteInput: {
      minHeight: 88,
      textAlignVertical: 'top',
      paddingTop: spacing.sm,
      marginBottom: 0,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    phonePrefix: {
      minHeight: 46,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceMuted,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phonePrefixTxt: {
      fontFamily: typography.fontSansMedium,
      color: c.foreground,
      fontSize: 14,
    },
    clientInfoCard: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },
    suggestions: {
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    suggestionRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    suggestionRowSelected: {
      backgroundColor: c.surfaceMuted,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      paddingLeft: spacing.md - 3,
    },
    suggestionRowDisabled: {
      opacity: 0.45,
    },
    selectedLinesWrap: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    selectedLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    qtyBtn: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBtnDisabled: {
      opacity: 0.4,
    },
    qtyTxt: {
      minWidth: 22,
      textAlign: 'center',
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      color: c.foreground,
    },
    removeLineBtn: {
      padding: 4,
    },
    suggestionName: {
      fontFamily: typography.fontSansMedium,
      color: c.foreground,
      fontSize: 14,
      marginBottom: 2,
    },
    selectedServiceBox: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    inlineBtn: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceMuted,
    },
    inlineBtnTxt: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
    },
    discountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    discountInput: {
      flex: 1,
      marginBottom: 0,
    },
    percentBox: {
      minHeight: 46,
      minWidth: 46,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentBoxTxt: {
      fontFamily: typography.fontSansMedium,
      color: c.foregroundMuted,
      fontSize: 16,
    },
    medicalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    medicalRow: {
      marginTop: spacing.sm,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    medicalTxt: {
      flex: 1,
      fontFamily: typography.fontSans,
      color: c.foreground,
      fontSize: 13,
      paddingRight: spacing.sm,
    },
    selectRow: {
      minHeight: 46,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectTxt: {
      fontFamily: typography.fontSans,
      color: c.foreground,
      fontSize: 14,
    },
    staffList: {
      gap: spacing.xs,
    },
    staffChip: {
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    staffChipOn: {
      borderColor: c.primary,
      backgroundColor: c.surfaceMuted,
    },
    staffName: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
    },
    staffNameOn: {
      color: c.primary,
    },
    staffRol: {
      marginTop: 2,
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
    },
    formActions: {
      marginTop: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.lg,
    },
  });
}
