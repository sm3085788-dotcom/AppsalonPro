import { useState, useMemo } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, Stethoscope, UserPlus } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';

const GT_PREFIX = '+502';
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

/** Solo construcción UI: reemplazar por `db.*` cuando actives la fase de lógica. */
const CONSTRUCTION_CLIENTS = [
  { id: 'c-demo-1', nombre: 'María López', telefono: '+50255112233', email: 'maria@ejemplo.com' },
  { id: 'c-demo-2', nombre: 'Carlos Ruiz', telefono: '+50277889900', email: 'carlos@ejemplo.com' },
  { id: 'c-demo-3', nombre: 'Laura Méndez', telefono: '+50233445566', email: 'laura@ejemplo.com' },
];
const CONSTRUCTION_SERVICES = [
  { id: 's-demo-1', nombre: 'Corte dama', precio: 120, duracion_minutos: 45 },
  { id: 's-demo-2', nombre: 'Coloración', precio: 350, duracion_minutos: 120 },
  { id: 's-demo-3', nombre: 'Manicure', precio: 85, duracion_minutos: 40 },
  { id: 's-demo-4', nombre: 'Peinado evento', precio: 200, duracion_minutos: 60 },
];
const CONSTRUCTION_STAFF = [
  { id: 'e-demo-1', nombre: 'Ana Pérez', rol: 'Estilista', email: 'ana@salon.gt' },
  { id: 'e-demo-2', nombre: 'Luis Morales', rol: 'Colorista', email: 'luis@salon.gt' },
  { id: 'e-demo-3', nombre: 'Sofía Castillo', rol: 'Recepción', email: 'sofia@salon.gt' },
];

/**
 * Agenda: layout y formulario (sin llamadas a servidor en esta fase).
 */
export function AppointmentsScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const [composerOpen, setComposerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceRow, setSelectedServiceRow] = useState(null);
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

  const styles = useMemo(() => createStyles(c), [c]);

  const clientMatches = useMemo(() => {
    if (selectedClient) return [];
    const q = clientQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return CONSTRUCTION_CLIENTS.filter(
      (c) =>
        String(c.nombre || '')
          .toLowerCase()
          .includes(q) ||
        String(c.telefono || '')
          .replace(/\s/g, '')
          .includes(q) ||
        String(c.email || '')
          .toLowerCase()
          .includes(q),
    ).slice(0, 6);
  }, [clientQuery, selectedClient]);

  const serviceMatches = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return CONSTRUCTION_SERVICES;
    return CONSTRUCTION_SERVICES.filter((s) =>
      String(s.nombre || '')
        .toLowerCase()
        .includes(q),
    );
  }, [serviceSearch]);

  const staffFiltered = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return CONSTRUCTION_STAFF;
    return CONSTRUCTION_STAFF.filter((e) => {
      const n = String(e.nombre || '').toLowerCase();
      const r = String(e.rol || '').toLowerCase();
      const mail = String(e.email || '').toLowerCase();
      return n.includes(q) || r.includes(q) || mail.includes(q);
    });
  }, [staffSearch]);

  const resetComposer = () => {
    setComposerOpen(false);
    setClientQuery('');
    setSelectedClient(null);
    setFullName('');
    setPhoneLocal('');
    setServiceSearch('');
    setSelectedServiceRow(null);
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
    setClientQuery(row.nombre || '');
    setFullName(row.nombre || '');
    const tel = String(row.telefono || '').replace(/\D/g, '');
    if (tel.startsWith('502')) {
      setPhoneLocal(tel.slice(3, 11));
    } else {
      setPhoneLocal(tel.slice(0, 8));
    }
  };

  const clearSelectedClient = () => {
    setSelectedClient(null);
    setClientQuery('');
    setFullName('');
    setPhoneLocal('');
  };

  const toggleMedical = (key) => {
    setMedicalFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleReferral = (key) => {
    setReferralFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const baseServicePrice = Number(selectedServiceRow?.precio);
  const basePrice = Number.isFinite(baseServicePrice) ? baseServicePrice : 0;
  const discountPctRaw = Number(String(discount || '').replace(',', '.'));
  const discountPct = Number.isFinite(discountPctRaw)
    ? Math.min(100, Math.max(0, discountPctRaw))
    : 0;
  const finalPrice = Math.max(Math.round(basePrice * (1 - discountPct / 100) * 100) / 100, 0);

  const handleSaveAppointment = () => {
    Alert.alert(
      'Modo construcción',
      'Cuando terminemos el armado visual, en la fase de lógica se conectará el guardado y las búsquedas con el servidor.',
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

  const modalContentPadBottom = insets.bottom + spacing.sm;

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome onBack={onBack} disableBodyScroll rightAction={rightAction}>
        <View style={styles.listShell}>
          <View style={styles.agendaToolbar}>
            <Text style={styles.agendaToolbarMeta}>Citas del salón</Text>
            <TouchableOpacity hitSlop={12} accessibilityRole="button" accessibilityLabel="Ordenar y filtros">
              <Text style={styles.agendaToolbarLink}>Ordenar · filtros</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listPlaceholder}>
            <Calendar size={48} color={c.foregroundSubtle} strokeWidth={1.5} />
            <Text style={[subStyles.muted, styles.listPlaceholderTxt]}>
              Aquí aparecerán las citas cuando exista lógica de datos.
            </Text>
            <Text style={styles.agendaFootnote}>
              Pendiente, confirmado y rechazado; orden por fecha más reciente (referencia, sin acción aún).
            </Text>
          </View>
        </View>
      </SubScreenChrome>

      <Modal
        visible={composerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={resetComposer}
      >
        <View style={[styles.modalRoot, { backgroundColor: c.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: insets.top,
              paddingBottom: modalContentPadBottom,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={subStyles.card}>
              <Text style={styles.formTitle}>Nueva cita</Text>
              <Text style={subStyles.muted}>
                Vista en construcción: formulario completo. Las búsquedas usan datos de muestra locales; sin
                servidor.
              </Text>
            </View>

            <View style={subStyles.card}>
              <Text style={styles.formLabel}>Cliente (buscar existente)</Text>
              <TextInput
                style={styles.input}
                placeholder="Buscar por nombre, teléfono o correo"
                placeholderTextColor={c.foregroundSubtle}
                value={clientQuery}
                onChangeText={(v) => {
                  if (selectedClient) setSelectedClient(null);
                  setClientQuery(v);
                  setFullName(v);
                }}
              />
              {clientQuery.trim().length > 0 && clientQuery.trim().length < 2 ? (
                <Text style={subStyles.muted}>Escribí al menos 2 letras para filtrar la muestra.</Text>
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
                      <Text style={subStyles.muted}>{row.telefono || 'Sin teléfono'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {selectedClient ? (
                <TouchableOpacity onPress={clearSelectedClient} style={styles.inlineBtn}>
                  <Text style={styles.inlineBtnTxt}>Quitar cliente seleccionado</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={subStyles.card}>
              <Text style={styles.formLabel}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre y apellido"
                placeholderTextColor={c.foregroundSubtle}
                value={fullName}
                onChangeText={setFullName}
              />
              <Text style={styles.formLabel}>Teléfono (Guatemala)</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixTxt}>{GT_PREFIX}</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="########"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="number-pad"
                  maxLength={8}
                  value={phoneLocal}
                  onChangeText={(v) => setPhoneLocal(v.replace(/\D/g, ''))}
                />
              </View>
            </View>

            <View style={subStyles.card}>
              <Text style={styles.formLabel}>Seleccionar servicio</Text>
              <TextInput
                style={styles.input}
                placeholder="Buscar servicio por nombre"
                placeholderTextColor={c.foregroundSubtle}
                value={serviceSearch}
                onChangeText={(t) => {
                  setServiceSearch(t);
                  if (selectedServiceRow) setSelectedServiceRow(null);
                }}
              />
              {serviceMatches.length === 0 ? (
                <Text style={subStyles.muted}>No hay servicios de muestra que coincidan.</Text>
              ) : null}
              {serviceMatches.length > 0 ? (
                <View style={styles.suggestions}>
                  {serviceMatches.map((row) => {
                    const sel = selectedServiceRow?.id === row.id;
                    const p = Number(row.precio);
                    const precioTxt = Number.isFinite(p)
                      ? `Q${p.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                      : '';
                    return (
                      <TouchableOpacity
                        key={row.id}
                        style={[styles.suggestionRow, sel && styles.suggestionRowSelected]}
                        onPress={() => setSelectedServiceRow(row)}
                      >
                        <Text style={styles.suggestionName}>{row.nombre}</Text>
                        {precioTxt ? <Text style={subStyles.muted}>{precioTxt}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {selectedServiceRow ? (
                <TouchableOpacity
                  onPress={() => setSelectedServiceRow(null)}
                  style={[styles.inlineBtn, { marginTop: spacing.sm }]}
                >
                  <Text style={styles.inlineBtnTxt}>Quitar servicio seleccionado</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={subStyles.card}>
              <View style={styles.medicalHead}>
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
            </View>

            <View style={subStyles.card}>
              <Text style={styles.formLabel}>Fecha de cita</Text>
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
            </View>

            <View style={subStyles.card}>
              <Text style={styles.formLabel}>Asignar profesional</Text>
              <TextInput
                style={styles.input}
                placeholder="Buscar por nombre, rol o correo"
                placeholderTextColor={c.foregroundSubtle}
                value={staffSearch}
                onChangeText={setStaffSearch}
              />
              {staffSearch.trim() !== '' && staffFiltered.length === 0 ? (
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
                        onPress={() => setEmployeeId(emp.id)}
                      >
                        <Text style={[styles.staffName, on && styles.staffNameOn]}>{emp.nombre}</Text>
                        <Text style={[styles.staffRol, on && styles.staffNameOn]}>{emp.rol || 'Profesional'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={subStyles.card}>
              <Text style={styles.formLabel}>Descuento manual (opcional)</Text>
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
            </View>

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
    listPlaceholder: {
      flex: 1,
      minHeight: 200,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    listPlaceholderTxt: {
      textAlign: 'center',
      maxWidth: 280,
    },
    agendaFootnote: {
      marginTop: spacing.sm,
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: c.foregroundSubtle,
      lineHeight: 16,
      textAlign: 'center',
      maxWidth: 300,
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
    suggestionName: {
      fontFamily: typography.fontSansMedium,
      color: c.foreground,
      fontSize: 14,
      marginBottom: 2,
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
      gap: spacing.sm,
      paddingBottom: spacing.lg,
    },
  });
}
