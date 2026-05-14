import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Trash2, Calendar, ArrowUpDown, ListOrdered, ChevronDown, ChevronUp, Search } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import {
  purgeCitas,
  purgeVentasYRelacionadas,
  purgeCajasYMovimientos,
  purgePedidosEcommerce,
  purgeMarketingRed,
  purgeClientes,
  purgeEmpleados,
  purgeInventario,
  purgeProveedores,
  purgeMetas,
  purgeNotificaciones,
  purgeIncidentes,
  purgeAuditLogs,
  purgeBasureroLocal,
  purgeReportesLocales,
  purgeAllModules,
  normalizeDateRangeOpts,
} from '../services/controlPanelPurge';
import { searchModuleItems, deleteModuleItem, moduleSupportsSearch, listModuleItems, moduleListsOnExpand } from '../services/controlPanelItemOps';

const PURGE_ACTIONS = [
  {
    id: 'ventas_chain',
    title: 'Ventas, devoluciones y cambios',
    detail: 'Devoluciones, cambios de producto y ventas (Papelería). Con fechas: por campo fecha de cada tabla.',
    run: purgeVentasYRelacionadas,
  },
  {
    id: 'caja_chain',
    title: 'Caja: movimientos y cajas',
    detail: 'Movimientos por fecha/hora; cajas por fecha_apertura (día).',
    run: purgeCajasYMovimientos,
  },
  {
    id: 'pedidos',
    title: 'Pedidos e-commerce',
    detail: 'Órdenes y líneas. Con fechas: órdenes por created_at.',
    outcome: 'bulk',
    run: purgePedidosEcommerce,
  },
  {
    id: 'citas',
    title: 'Citas (agenda)',
    detail: 'Por fecha_hora si usás rango.',
    run: purgeCitas,
  },
  {
    id: 'marketing',
    title: 'Marketing y mensajes',
    detail: 'Comentarios, likes de posts en rango, mensajes y publicaciones. Con fechas: por created_at.',
    run: purgeMarketingRed,
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones internas',
    detail: 'Por created_at si usás rango.',
    run: purgeNotificaciones,
  },
  {
    id: 'metas',
    title: 'Metas del equipo',
    detail: 'Por creado_a si usás rango.',
    run: purgeMetas,
  },
  {
    id: 'incidentes',
    title: 'Incidentes',
    detail: 'Por fecha si usás rango.',
    run: purgeIncidentes,
  },
  {
    id: 'inventario',
    title: 'Inventario (productos/servicios)',
    detail: 'Por updated_at si usás rango. Sin rango: todo el catálogo.',
    run: purgeInventario,
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    detail: 'Solo borrado total (sin filtro por fecha en esquema).',
    run: purgeProveedores,
  },
  {
    id: 'clientes',
    title: 'Clientes',
    detail: 'Por created_at si usás rango. FK: puede fallar si hay datos vinculados.',
    run: purgeClientes,
  },
  {
    id: 'empleados',
    title: 'Empleados',
    detail: 'Por created_at si usás rango (si existe en BD).',
    run: purgeEmpleados,
  },
  {
    id: 'audit',
    title: 'Logs de auditoría admin',
    detail: 'Por created_at si usás rango; sin rango vacía la tabla.',
    outcome: 'bulk',
    run: purgeAuditLogs,
  },
  {
    id: 'basurero_local',
    title: 'Basurero local (teléfono)',
    detail: 'Copias en este dispositivo. Con fechas: solo entradas por fecha de borrado local.',
    run: purgeBasureroLocal,
    localOnly: true,
  },
  {
    id: 'reportes_local',
    title: 'Reportes generados (teléfono)',
    detail: 'Lista guardada en la pantalla Reportes de este dispositivo. Con fechas: por fecha de generación.',
    run: purgeReportesLocales,
    localOnly: true,
  },
];

function formatShortDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function ControlPanelScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const [purgingId, setPurgingId] = useState(null);
  const [purgeAllBusy, setPurgeAllBusy] = useState(false);
  const [includeReportes, setIncludeReportes] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [moduleSearch, setModuleSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [sortMode, setSortMode] = useState('default');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);

  const styles = useMemo(() => createStyles(), []);

  const rangeActive = !!(dateFrom && dateTo);

  const sortedActions = useMemo(() => {
    const list = [...PURGE_ACTIONS];
    if (sortMode === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    }
    return list;
  }, [sortMode]);

  const buildOpts = useCallback(() => {
    if (!dateFrom || !dateTo) return {};
    return { dateFrom, dateTo };
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!expandedId || !moduleSupportsSearch(expandedId)) {
      setSearchResults([]);
      return undefined;
    }
    const q = moduleSearch.trim();
    if (!moduleListsOnExpand(expandedId) && q.length < 2) {
      setSearchResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const rows = await listModuleItems(expandedId, q);
        if (!cancelled) setSearchResults(rows);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchBusy(false);
      }
    }, moduleListsOnExpand(expandedId) && q.length < 2 ? 0 : 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expandedId, moduleSearch]);

  const toggleExpanded = useCallback((actionId) => {
    setExpandedId((prev) => {
      if (prev === actionId) return null;
      return actionId;
    });
    setModuleSearch('');
    setSearchResults([]);
  }, []);

  const finishPurgeMessage = useCallback((action, n) => {
    if (action.id === 'basurero_local') {
      return typeof n === 'number' && n > 0
        ? `Se eliminaron ${n} entradas del basurero local.`
        : rangeActive
          ? 'No había entradas locales en ese rango.'
          : 'Se vació la copia local del basurero en este dispositivo.';
    }
    if (action.id === 'reportes_local') {
      if (typeof n === 'number' && n > 0) {
        return `Se eliminaron ${n} reporte(s) guardados en este dispositivo.`;
      }
      if (rangeActive) return 'No había reportes guardados en ese rango de fechas.';
      return 'No había reportes guardados en este dispositivo.';
    }
    if (action.outcome === 'bulk' && !rangeActive) {
      return 'Borrado masivo enviado. Si RLS o FK lo impiden, verás error arriba; si no, las tablas quedaron vacías.';
    }
    if (typeof n === 'number' && n > 0) return `Se eliminaron ${n} registros.`;
    if (typeof n === 'number') return 'No había registros que borrar en ese criterio.';
    return 'Operación completada.';
  }, [rangeActive]);

  const confirmPurge = useCallback(
    (action) => {
      let rangeNote = '';
      if (rangeActive) {
        try {
          normalizeDateRangeOpts({ dateFrom, dateTo });
          rangeNote = action.localOnly
            ? `\n\nSolo entradas de este teléfono entre ${formatShortDate(dateFrom)} y ${formatShortDate(
                dateTo,
              )} (fecha de generación o borrado local).`
            : `\n\nSolo se eliminarán registros entre ${formatShortDate(dateFrom)} y ${formatShortDate(
                dateTo,
              )} (según la fecha de cada tabla, donde aplique).`;
        } catch (err) {
          Alert.alert('Fechas inválidas', err?.message || 'Revisá el rango.');
          return;
        }
      }
      const msg = `${action.detail}${rangeNote}\n\nEsta acción no se puede deshacer.`;
      Alert.alert(`Borrar todo: ${action.title}`, msg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            setPurgingId(action.id);
            try {
              const n = await action.run(buildOpts());
              Alert.alert('Listo', finishPurgeMessage(action, n));
              if (expandedId === action.id) {
                setModuleSearch('');
                if (moduleSupportsSearch(action.id)) {
                  const rows = await listModuleItems(action.id, '');
                  setSearchResults(rows);
                } else {
                  setSearchResults([]);
                }
              }
            } catch (e) {
              Alert.alert(
                'Error',
                e?.message || 'No se pudo completar el borrado. Revisá dependencias (FK) o permisos RLS.',
              );
            } finally {
              setPurgingId(null);
            }
          },
        },
      ]);
    },
    [buildOpts, dateFrom, dateTo, expandedId, finishPurgeMessage, moduleSearch, rangeActive],
  );

  const confirmPurgeAll = useCallback(() => {
    let rangeNote = '';
    if (rangeActive) {
      try {
        normalizeDateRangeOpts({ dateFrom, dateTo });
        rangeNote = `\n\nSolo registros entre ${formatShortDate(dateFrom)} y ${formatShortDate(dateTo)} (donde cada módulo lo permita).`;
      } catch (err) {
        Alert.alert('Fechas inválidas', err?.message || 'Revisá el rango.');
        return;
      }
    } else {
      rangeNote = '\n\nSin rango de fechas: se vacía cada módulo por completo (donde aplique).';
    }
    const reportesNote = includeReportes
      ? '\n• Reportes guardados en este teléfono: SÍ se borrarán.'
      : '\n• Reportes guardados en este teléfono: NO se borrarán (activá la casilla si los querés incluir).';
    Alert.alert(
      'Borrar todos los módulos',
      `Se ejecutará el borrado masivo de ventas, caja, pedidos, citas, marketing, notificaciones, metas, incidentes, inventario, proveedores, clientes, empleados, auditoría y basurero local.${reportesNote}${rangeNote}\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            setPurgeAllBusy(true);
            try {
              const n = await purgeAllModules({ ...buildOpts(), includeReportes });
              Alert.alert('Listo', `Borrado global completado (${n} operaciones/registros afectados aprox.).`);
              setExpandedId(null);
              setModuleSearch('');
              setSearchResults([]);
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo completar el borrado global.');
            } finally {
              setPurgeAllBusy(false);
            }
          },
        },
      ],
    );
  }, [buildOpts, dateFrom, dateTo, includeReportes, rangeActive]);

  const confirmDeleteItem = useCallback(
    (action, item) => {
      Alert.alert('Borrar registro', `¿Eliminar «${item.label}»?\n\nSolo este registro. No se puede deshacer.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            setPurgingId(action.id);
            try {
              const err = await deleteModuleItem(action.id, item.id);
              if (err?.message) {
                Alert.alert('Error', err.message);
              } else {
                setSearchResults((prev) => prev.filter((r) => String(r.id) !== String(item.id)));
                Alert.alert('Listo', 'Registro eliminado.');
                if (expandedId === action.id) {
                  const rows = await listModuleItems(action.id, moduleSearch);
                  setSearchResults(rows);
                }
              }
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo borrar el registro.');
            } finally {
              setPurgingId(null);
            }
          },
        },
      ]);
    },
    [expandedId, moduleSearch],
  );

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      if (event?.type === 'dismissed') {
        setPickerTarget(null);
        return;
      }
      if (selectedDate && pickerTarget) {
        if (pickerTarget === 'from') setDateFrom(selectedDate);
        if (pickerTarget === 'to') setDateTo(selectedDate);
      }
      setPickerTarget(null);
      return;
    }
    if (event?.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }
    if (!selectedDate || !pickerTarget) return;
    if (pickerTarget === 'from') setDateFrom(selectedDate);
    if (pickerTarget === 'to') setDateTo(selectedDate);
  };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Panel de control"
        subtitle="Borrado masivo de datos. Irreversible."
        onBack={onBack}
      >
        <View style={[styles.filterCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
          <Text style={[styles.filterHead, { color: c.foreground }]}>Ordenar y filtrar</Text>
          <Text style={[styles.filterSub, { color: c.foregroundMuted }]}>
            Ordená la lista de acciones y, si querés, definí un rango de fechas para borrar solo la información en ese
            intervalo (según el campo de fecha de cada módulo).
          </Text>

          <Text style={[styles.fieldLbl, { color: c.foregroundMuted }]}>Orden de la lista</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: sortMode === 'default' ? c.primary : c.cardBorder, backgroundColor: sortMode === 'default' ? c.surfaceMuted : c.background },
              ]}
              onPress={() => setSortMode('default')}
            >
              <ListOrdered size={16} color={sortMode === 'default' ? c.primary : c.foregroundMuted} />
              <Text style={[styles.filterChipTxt, { color: sortMode === 'default' ? c.primary : c.foreground }]}>
                Original
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: sortMode === 'alpha' ? c.primary : c.cardBorder, backgroundColor: sortMode === 'alpha' ? c.surfaceMuted : c.background },
              ]}
              onPress={() => setSortMode('alpha')}
            >
              <ArrowUpDown size={16} color={sortMode === 'alpha' ? c.primary : c.foregroundMuted} />
              <Text style={[styles.filterChipTxt, { color: sortMode === 'alpha' ? c.primary : c.foreground }]}>
                A → Z
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLbl, { color: c.foregroundMuted, marginTop: spacing.sm }]}>Rango de fechas</Text>
          <View style={styles.dateRowWrap}>
            <TouchableOpacity
              style={[styles.dateTap, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}
              onPress={() => setPickerTarget('from')}
            >
              <Text style={[styles.dateLbl, { color: c.foregroundMuted }]}>Desde</Text>
              <View style={styles.dateTapInner}>
                <Text style={[styles.dateVal, { color: c.foreground }]}>{formatShortDate(dateFrom)}</Text>
                <Calendar size={18} color={c.primary} strokeWidth={2} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateTap, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}
              onPress={() => setPickerTarget('to')}
            >
              <Text style={[styles.dateLbl, { color: c.foregroundMuted }]}>Hasta</Text>
              <View style={styles.dateTapInner}>
                <Text style={[styles.dateVal, { color: c.foreground }]}>{formatShortDate(dateTo)}</Text>
                <Calendar size={18} color={c.primary} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </View>
          {rangeActive ? (
            <Text style={[styles.rangeOn, { color: c.primary }]}>Filtro por fechas activo</Text>
          ) : (
            <Text style={[styles.rangeOff, { color: c.foregroundSubtle }]}>
              Sin rango: cada acción borra todo lo que corresponda a ese módulo.
            </Text>
          )}
          {(dateFrom || dateTo) && !rangeActive ? (
            <Text style={[styles.rangeWarn, { color: c.error }]}>Elegí ambas fechas para aplicar el filtro.</Text>
          ) : null}
          {dateFrom || dateTo ? (
            <SalonButton
              title="Quitar fechas"
              variant="outlineGray"
              fullWidth
              onPress={() => {
                setDateFrom(null);
                setDateTo(null);
                setPickerTarget(null);
              }}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}

          {pickerTarget ? (
            <>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                value={pickerTarget === 'from' ? dateFrom || new Date() : dateTo || dateFrom || new Date()}
                maximumDate={pickerTarget === 'from' && dateTo ? dateTo : undefined}
                minimumDate={pickerTarget === 'to' && dateFrom ? dateFrom : undefined}
                onChange={onDateChange}
              />
              {Platform.OS === 'ios' ? (
                <SalonButton title="Listo" variant="outlineGold" fullWidth onPress={() => setPickerTarget(null)} style={{ marginTop: spacing.sm }} />
              ) : null}
            </>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: c.error }]}>Zona destructiva</Text>
        <Text style={[styles.sectionHint, { color: c.foregroundMuted }]}>
          «Borrar todos los módulos» vacía casi todo; los reportes del teléfono solo si marcás la casilla. Tocá una tarjeta
          para borrar todo ese módulo o buscar un registro puntual.
        </Text>

        <View style={[styles.purgeAllCard, { borderColor: c.error + '66', backgroundColor: c.card }]}>
          <Text style={[styles.purgeAllTitle, { color: c.foreground }]}>Borrar todos los módulos</Text>
          <Text style={[styles.purgeAllSub, { color: c.foregroundMuted }]}>
            Ventas, caja, pedidos, citas, marketing, notificaciones, metas, incidentes, inventario, proveedores, clientes,
            empleados, auditoría y basurero local. Los reportes son opcionales.
          </Text>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setIncludeReportes((v) => !v)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkBox,
                {
                  borderColor: includeReportes ? c.primary : c.cardBorder,
                  backgroundColor: includeReportes ? c.primary : 'transparent',
                },
              ]}
            />
            <Text style={[styles.checkLabel, { color: c.foreground }]}>Incluir reportes generados (teléfono)</Text>
          </TouchableOpacity>
          <SalonButton
            title={purgeAllBusy ? 'Borrando…' : 'Borrar todos los módulos'}
            variant="outlineGray"
            fullWidth
            disabled={!!purgingId || purgeAllBusy}
            onPress={confirmPurgeAll}
            style={{ marginTop: spacing.sm, borderColor: c.error }}
            textStyle={{ color: c.error }}
          />
          {purgeAllBusy ? <ActivityIndicator color={c.error} style={{ marginTop: spacing.sm }} /> : null}
        </View>

        {sortedActions.map((action) => {
          const busy = purgingId === action.id;
          const proveedorBlocked = action.id === 'proveedores' && rangeActive;
          const expanded = expandedId === action.id;
          const searchable = moduleSupportsSearch(action.id);
          return (
            <View
              key={action.id}
              style={[
                styles.purgeRowWrap,
                {
                  borderColor: proveedorBlocked ? c.cardBorder : c.error + '55',
                  backgroundColor: c.card,
                  opacity: proveedorBlocked ? 0.45 : 1,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.purgeRowHead}
                onPress={() => {
                  if (proveedorBlocked) {
                    Alert.alert(
                      'Proveedores',
                      'Este módulo no admite filtro por fechas. Quitá el rango o tocá «Quitar fechas» para borrar todo el listado de proveedores.',
                    );
                    return;
                  }
                  toggleExpanded(action.id);
                }}
                disabled={!!purgingId && !expanded}
                activeOpacity={0.85}
              >
                <Trash2 size={20} color={proveedorBlocked ? c.foregroundMuted : c.error} strokeWidth={2} />
                <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
                  <Text style={[styles.purgeTitle, { color: c.foreground }]}>{action.title}</Text>
                  <Text style={[styles.purgeDetail, { color: c.foregroundMuted }]}>{action.detail}</Text>
                </View>
                {expanded ? (
                  <ChevronUp size={20} color={c.foregroundMuted} />
                ) : (
                  <ChevronDown size={20} color={c.foregroundMuted} />
                )}
              </TouchableOpacity>

              {expanded ? (
                <View style={styles.purgeExpand}>
                  <SalonButton
                    title={busy ? 'Borrando…' : 'Borrar todo este módulo'}
                    variant="outlineGray"
                    fullWidth
                    disabled={!!purgingId || proveedorBlocked}
                    onPress={() => confirmPurge(action)}
                    style={{ borderColor: c.error }}
                    textStyle={{ color: c.error }}
                  />

                  {searchable ? (
                    <>
                      <View style={[styles.moduleSearchWrap, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                        <Search size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
                        <TextInput
                          style={[styles.moduleSearchInput, { color: c.foreground }]}
                          placeholder={
                            moduleListsOnExpand(action.id)
                              ? 'Filtrar listado local (opcional)…'
                              : 'Buscar un registro para borrar (mín. 2 letras)…'
                          }
                          placeholderTextColor={c.foregroundSubtle}
                          value={moduleSearch}
                          onChangeText={setModuleSearch}
                          autoCorrect={false}
                          editable={!busy}
                        />
                        {searchBusy ? <ActivityIndicator size="small" color={c.primary} /> : null}
                      </View>
                      {moduleListsOnExpand(action.id) && searchResults.length === 0 && !searchBusy ? (
                        <Text style={[styles.noHits, { color: c.foregroundSubtle }]}>
                          No hay entradas guardadas en este teléfono.
                        </Text>
                      ) : null}
                      {!moduleListsOnExpand(action.id) &&
                      moduleSearch.trim().length >= 2 &&
                      !searchBusy &&
                      searchResults.length === 0 ? (
                        <Text style={[styles.noHits, { color: c.foregroundSubtle }]}>Sin coincidencias.</Text>
                      ) : null}
                      {searchResults.map((item) => (
                        <TouchableOpacity
                          key={String(item.id)}
                          style={[styles.hitRow, { borderColor: c.cardBorder }]}
                          onPress={() => confirmDeleteItem(action, item)}
                          disabled={!!purgingId}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.hitTitle, { color: c.foreground }]} numberOfLines={1}>
                              {item.label}
                            </Text>
                            {item.sub ? (
                              <Text style={[styles.hitSub, { color: c.foregroundMuted }]} numberOfLines={1}>
                                {item.sub}
                              </Text>
                            ) : null}
                          </View>
                          <Trash2 size={16} color={c.error} />
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <Text style={[styles.noSearchHint, { color: c.foregroundSubtle }]}>
                      Este módulo solo admite «Borrar todo» (sin búsqueda puntual).
                    </Text>
                  )}
                </View>
              ) : null}

              {busy && !expanded ? <ActivityIndicator color={c.error} style={styles.rowBusy} /> : null}
            </View>
          );
        })}

        {Platform.OS === 'ios' ? <View style={{ height: spacing.lg }} /> : null}
      </SubScreenChrome>
    </>
  );
}

function createStyles() {
  return StyleSheet.create({
    filterCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    filterHead: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      marginBottom: spacing.xs,
    },
    filterSub: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    filterChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    dateRowWrap: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    dateTap: {
      flex: 1,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.sm,
    },
    dateLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      marginBottom: 4,
    },
    dateTapInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateVal: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    rangeOn: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginTop: spacing.sm,
    },
    rangeOff: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: spacing.sm,
    },
    rangeWarn: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      marginTop: spacing.xs,
    },
    sectionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    sectionHint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    purgeAllCard: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    purgeAllTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      marginBottom: spacing.xs,
    },
    purgeAllSub: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.sm,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: radii.sm,
      borderWidth: 2,
    },
    checkLabel: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 14,
    },
    purgeRowWrap: {
      borderWidth: 1,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    purgeRowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.sm,
    },
    purgeExpand: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    moduleSearchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    },
    moduleSearchInput: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      paddingVertical: spacing.sm,
    },
    noHits: {
      fontFamily: typography.fontSans,
      fontSize: 12,
    },
    noSearchHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    hitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    hitTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    hitSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 2,
    },
    rowBusy: {
      marginBottom: spacing.sm,
    },
    purgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    purgeTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    purgeDetail: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 4,
      lineHeight: 17,
    },
  });
}
