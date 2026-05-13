import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Trash2, Calendar, ArrowUpDown, ListOrdered } from 'lucide-react-native';
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
  normalizeDateRangeOpts,
} from '../services/controlPanelPurge';

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

  const confirmPurge = useCallback(
    (action) => {
      let rangeNote = '';
      if (rangeActive) {
        try {
          normalizeDateRangeOpts({ dateFrom, dateTo });
          rangeNote = `\n\nSolo se eliminarán registros entre ${formatShortDate(dateFrom)} y ${formatShortDate(
            dateTo,
          )} (según la fecha de cada tabla, donde aplique).`;
        } catch (err) {
          Alert.alert('Fechas inválidas', err?.message || 'Revisá el rango.');
          return;
        }
      }
      const msg = `${action.detail}${rangeNote}\n\nEsta acción no se puede deshacer.`;
      Alert.alert(`Borrar: ${action.title}`, msg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            setPurgingId(action.id);
            try {
              const n = await action.run(buildOpts());
              let msgOk = 'Operación completada.';
              if (action.id === 'basurero_local') {
                msgOk =
                  typeof n === 'number' && n > 0
                    ? `Se eliminaron ${n} entradas del basurero local.`
                    : rangeActive
                      ? 'No había entradas locales en ese rango.'
                      : 'Se vació la copia local del basurero en este dispositivo.';
              } else if (action.outcome === 'bulk' && !rangeActive) {
                msgOk =
                  'Borrado masivo enviado. Si RLS o FK lo impiden, verás error arriba; si no, las tablas quedaron vacías.';
              } else if (typeof n === 'number' && n > 0) {
                msgOk = `Se eliminaron ${n} registros.`;
              } else if (typeof n === 'number') {
                msgOk = 'No había registros que borrar en ese criterio.';
              }
              Alert.alert('Listo', msgOk);
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
    [buildOpts, dateFrom, dateTo, rangeActive],
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
          Cada acción borra datos reales. Si Supabase devuelve error de clave foránea, vaciá primero la tabla dependiente
          o ajustá el rango de fechas.
        </Text>

        {sortedActions.map((action) => {
          const busy = purgingId === action.id;
          const proveedorBlocked = action.id === 'proveedores' && rangeActive;
          return (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.purgeRow,
                {
                  borderColor: proveedorBlocked ? c.cardBorder : c.error + '55',
                  backgroundColor: c.card,
                  opacity: proveedorBlocked ? 0.45 : 1,
                },
              ]}
              onPress={() => {
                if (proveedorBlocked) {
                  Alert.alert(
                    'Proveedores',
                    'Este módulo no admite filtro por fechas. Quitá el rango o tocá «Quitar fechas» para borrar todo el listado de proveedores.',
                  );
                  return;
                }
                confirmPurge(action);
              }}
              disabled={!!purgingId}
              activeOpacity={0.85}
            >
              <Trash2 size={20} color={proveedorBlocked ? c.foregroundMuted : c.error} strokeWidth={2} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: spacing.sm }}>
                <Text style={[styles.purgeTitle, { color: c.foreground }]}>{action.title}</Text>
                <Text style={[styles.purgeDetail, { color: c.foregroundMuted }]}>{action.detail}</Text>
              </View>
              {busy ? <ActivityIndicator color={c.error} /> : null}
            </TouchableOpacity>
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
