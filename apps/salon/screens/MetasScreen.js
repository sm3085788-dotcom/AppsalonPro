import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, useSubStyles, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { db } from '@appsalon/shared-config';

const PROP_TYPES = [
  { id: 'global_mensual', label: 'Global mensual', hint: 'Facturación u objetivo único del salón', symbol: 'Q' },
  { id: 'clientes_nuevos', label: 'Clientes nuevos', hint: 'Altas o primeras visitas del mes', symbol: '#' },
  { id: 'suscripciones', label: 'Suscripciones', hint: 'Planes activos o renovaciones', symbol: '#' },
  { id: 'individual', label: 'Por empleado', hint: 'Meta personalizada a una persona', symbol: '#' },
  { id: 'ventas_pred', label: 'Ventas predeterminadas', hint: 'Metas base por paquete o servicio', symbol: 'Q' },
  { id: 'eventos', label: 'Eventos', hint: 'Objetivos para temporadas o campañas', symbol: '#' },
];

const PROP_TIPO_DB = {
  global_mensual: 'ventas',
  clientes_nuevos: 'clientes',
  suscripciones: 'clientes',
  individual: 'servicios',
  ventas_pred: 'ventas',
  eventos: 'ingresos',
};

export function MetasScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [modalProp, setModalProp] = useState(false);
  const [propTipo, setPropTipo] = useState('global_mensual');
  const [propValor, setPropValor] = useState('');
  const [propNota, setPropNota] = useState('');
  const [empleadoSearch, setEmpleadoSearch] = useState('');
  const [modalMetaFiltros, setModalMetaFiltros] = useState(false);
  const [metaSort, setMetaSort] = useState('nombre_asc');
  const [metaRolFiltro, setMetaRolFiltro] = useState('todos');
  const [empleadosCatalog, setEmpleadosCatalog] = useState([]);
  const [metaEmpleadoId, setMetaEmpleadoId] = useState(null);
  const [enviandoMeta, setEnviandoMeta] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await db.empleados.getAll();
      if (cancelled) return;
      if (!error && Array.isArray(data)) setEmpleadosCatalog(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl * 1.5);
  const selectedType = PROP_TYPES.find((x) => x.id === propTipo);

  const abrirPropuesta = (tipoId) => {
    setPropTipo(tipoId);
    setPropValor('');
    setPropNota('');
    setEmpleadoSearch('');
    setMetaEmpleadoId(null);
    setMetaSort('nombre_asc');
    setMetaRolFiltro('todos');
    setModalMetaFiltros(false);
    setModalProp(true);
  };

  const metaFiltroResumen = useMemo(() => {
    const s = metaSort === 'nombre_desc' ? 'Nombre Z → A' : 'Nombre A → Z';
    const r =
      metaRolFiltro === 'todos'
        ? 'Todos los roles'
        : metaRolFiltro === 'estilista'
          ? 'Estilistas'
          : metaRolFiltro === 'colorista'
            ? 'Coloristas'
            : 'Recepción';
    return `${s} · ${r}`;
  }, [metaSort, metaRolFiltro]);

  const empleadoResults = useMemo(() => {
    let rows = [...empleadosCatalog];
    const q = empleadoSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) => {
        const blob = [e.nombre, e.rol].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (metaRolFiltro === 'estilista') rows = rows.filter((e) => String(e.rol || '').toLowerCase().includes('estilista'));
    if (metaRolFiltro === 'colorista') rows = rows.filter((e) => String(e.rol || '').toLowerCase().includes('colorista'));
    if (metaRolFiltro === 'recepcion') {
      rows = rows.filter(
        (e) =>
          String(e.rol || '').toLowerCase().includes('recepción') || String(e.rol || '').toLowerCase().includes('recepcion'),
      );
    }
    rows.sort((a, b) => {
      const cmp = String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
      return metaSort === 'nombre_desc' ? -cmp : cmp;
    });
    return rows;
  }, [empleadoSearch, metaSort, metaRolFiltro, empleadosCatalog]);

  const cerrarPropuesta = () => {
    setModalProp(false);
    setModalMetaFiltros(false);
    setMetaEmpleadoId(null);
  };

  const enviarPropuesta = async () => {
    const v = Number(String(propValor).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(v) || v <= 0) {
      Alert.alert('Valor', 'Ingresá un número objetivo mayor a 0.');
      return;
    }
    if (propTipo === 'individual' && !metaEmpleadoId) {
      Alert.alert('Por empleado', 'Elegí un empleado de la lista.');
      return;
    }
    if (enviandoMeta) return;
    setEnviandoMeta(true);
    const periodo = new Date().toISOString().slice(0, 7);
    const alcance = propTipo === 'individual' ? 'individual' : 'global';
    const payload = {
      titulo: selectedType?.label || 'Meta',
      tipo: PROP_TIPO_DB[propTipo] || 'ventas',
      valor_objetivo: v,
      actual: 0,
      periodo,
      alcance,
      asignado_a: propTipo === 'individual' ? metaEmpleadoId : null,
      activo: true,
    };
    const { error } = await db.metas.create(payload);
    setEnviandoMeta(false);
    if (error) {
      Alert.alert('No se pudo guardar', error.message || 'Intentá de nuevo.');
      return;
    }
    Alert.alert('Listo', 'La meta quedó registrada.');
    cerrarPropuesta();
  };

  const renderProgressBar = (ratio) => (
    <View style={[styles.progressTrack, { backgroundColor: c.surfaceMuted }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, ratio * 100))}%`, backgroundColor: c.primary }]} />
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome title="Metas" onBack={onBack} bottomPadding={0} disableBodyScroll>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: padBottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.propGrid}>
            {PROP_TYPES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.propTile, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                onPress={() => abrirPropuesta(p.id)}
                activeOpacity={0.88}
              >
                <View style={styles.propHead}>
                  <Text style={styles.propTileTitle}>{p.label}</Text>
                  <View style={[styles.symbolChip, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                    <Text style={[styles.symbolChipTxt, { color: c.foregroundMuted }]}>{p.symbol}</Text>
                  </View>
                </View>
                <Text style={[subStyles.muted, styles.propTileHint]} numberOfLines={2}>
                  {p.hint}
                </Text>
                <Text style={styles.progressLabel}>Sin avance registrado</Text>
                {renderProgressBar(0)}
                <View style={styles.propTileFoot}>
                  <Text style={[styles.propLink, { color: c.primary }]}>Proponer</Text>
                  <ChevronRight size={16} color={c.primary} strokeWidth={2.2} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SubScreenChrome>

      <Modal visible={modalProp} animationType="slide" transparent onRequestClose={cerrarPropuesta}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={12}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ width: '100%', paddingBottom: insets.bottom + spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalCard, { backgroundColor: c.background }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Nueva propuesta</Text>
              <TouchableOpacity onPress={cerrarPropuesta} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLbl}>Tipo</Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>
              {selectedType?.label}
            </Text>

            <Text style={styles.fieldLbl}>Objetivo numérico</Text>
            <View style={[styles.inputRow, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Text style={[styles.inputPrefix, { color: c.foregroundMuted }]}>{selectedType?.symbol || '#'}</Text>
              <TextInput
                style={[styles.input, styles.inputNoMargin, { color: c.foreground }]}
                placeholder={propTipo === 'global_mensual' ? '0.00' : '0'}
                placeholderTextColor={c.foregroundSubtle}
                keyboardType="decimal-pad"
                value={propValor}
                onChangeText={(v) => setPropValor(v.replace(/[^\d.,]/g, ''))}
              />
            </View>

            {propTipo === 'individual' ? (
              <>
                <Text style={styles.fieldLbl}>Empleado</Text>
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  placeholder="Buscar empleado por nombre, rol o código…"
                  placeholderTextColor={c.foregroundSubtle}
                  value={empleadoSearch}
                  onChangeText={setEmpleadoSearch}
                />
                <View style={styles.filterRow}>
                  <Text style={styles.filterMeta}>
                    {empleadoResults.length} coincidencia{empleadoResults.length === 1 ? '' : 's'}
                  </Text>
                  <TouchableOpacity
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Ordenar y filtros"
                    onPress={() => setModalMetaFiltros(true)}
                  >
                    <Text style={[styles.filterLink, { color: c.primary }]}>Ordenar · filtros</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.sm }]} numberOfLines={2}>
                  {metaFiltroResumen}
                </Text>
                {empleadoResults.length ? (
                  <View style={styles.empResultBox}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                      {empleadoResults.map((e) => (
                        <TouchableOpacity
                          key={e.id}
                          style={[
                            styles.empRow,
                            {
                              borderColor: metaEmpleadoId === e.id ? c.primary : c.cardBorder,
                              backgroundColor: c.card,
                            },
                          ]}
                          onPress={() => {
                            setMetaEmpleadoId(e.id);
                            setEmpleadoSearch(e.nombre || '');
                          }}
                          activeOpacity={0.88}
                        >
                          <Text style={[styles.empRowName, { color: c.foreground }]} numberOfLines={1}>
                            {e.nombre}
                          </Text>
                          <Text style={[styles.empRowRol, { color: c.foregroundMuted }]} numberOfLines={1}>
                            {e.rol}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>Sin coincidencias con los filtros actuales.</Text>
                )}
              </>
            ) : null}

            <Text style={styles.fieldLbl}>Nota (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              placeholder="Contexto o acuerdo con gerencia"
              placeholderTextColor={c.foregroundSubtle}
              value={propNota}
              onChangeText={setPropNota}
              multiline
            />

            <View style={styles.actionStack}>
              <SalonButton
                title={enviandoMeta ? 'Guardando…' : 'Enviar propuesta'}
                variant="heroGold"
                fullWidth
                onPress={enviarPropuesta}
              />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                onPress={cerrarPropuesta}
              />
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={modalMetaFiltros} animationType="slide" transparent onRequestClose={() => setModalMetaFiltros(false)}>
        <View style={styles.metasFiltrosBackdrop}>
          <View style={[styles.metasFiltrosSheet, { backgroundColor: c.background }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalMetaFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLbl}>Orden</Text>
            <View style={styles.metasChipRow}>
              {[
                { id: 'nombre_asc', label: 'Nombre A → Z' },
                { id: 'nombre_desc', label: 'Nombre Z → A' },
              ].map((opt) => {
                const on = metaSort === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.metasChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setMetaSort(opt.id)}
                  >
                    <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium, fontSize: 13 }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLbl}>Rol</Text>
            <View style={styles.metasChipRow}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'estilista', label: 'Estilista' },
                { id: 'colorista', label: 'Colorista' },
                { id: 'recepcion', label: 'Recepción' },
              ].map((opt) => {
                const on = metaRolFiltro === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.metasChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setMetaRolFiltro(opt.id)}
                  >
                    <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium, fontSize: 13 }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalMetaFiltros(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    propGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    propTile: {
      width: '48%',
      flexGrow: 1,
      minWidth: 148,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
    },
    propHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
      gap: spacing.sm,
    },
    propTileTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.foreground,
      flex: 1,
    },
    symbolChip: {
      borderWidth: 1,
      borderRadius: radii.pill,
      minWidth: 26,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignItems: 'center',
    },
    symbolChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    propTileHint: {
      fontSize: 12,
      lineHeight: 17,
      minHeight: 32,
    },
    progressLabel: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
      marginTop: spacing.sm,
      marginBottom: 6,
    },
    progressTrack: {
      height: 6,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: radii.pill,
    },
    propTileFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      gap: 2,
    },
    propLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalCard: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    modalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 44,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    inputNoMargin: {
      marginBottom: 0,
      flex: 1,
      paddingHorizontal: spacing.xs,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    inputPrefix: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      minWidth: 20,
      textAlign: 'center',
    },
    inputArea: {
      minHeight: 88,
      paddingTop: spacing.sm,
      textAlignVertical: 'top',
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
    },
    filterMeta: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    filterLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    actionStack: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    empResultBox: {
      maxHeight: 200,
      marginBottom: spacing.md,
    },
    empRow: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    empRowName: { fontFamily: typography.fontSansMedium, fontSize: 15 },
    empRowRol: { fontFamily: typography.fontSans, fontSize: 13, marginTop: 2 },
    metasFiltrosBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    metasFiltrosSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
    },
    metasChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    metasChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
  });
}
